// Penjaga terminologi UI: istilah domain yang sudah dijadikan English tidak boleh muncul lagi dalam teks yang tampil di layar.
// Yang sengaja tetap Indonesian: kata sehari-hari (tiket, lokasi, kategori, nama, judul, foto, catatan, ...).
// Berkas yang memang memuat teks Indonesian lama (untuk migrasi data tersimpan) dikecualikan.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = {
  antrean: 'Queue', ringkasan: 'Dashboard / Summary', penanganan: 'Assignment', ditangani: 'In Progress / handle', ditugaskan: 'Assigned', tugaskan: 'Assign',
  eskalasi: 'Escalation', dieskalasi: 'escalated', kritis: 'Critical', terlewat: 'Breached', berisiko: 'At risk', kepatuhan: 'Compliance',
  rincian: 'Breakdown', cakupan: 'Scope', kinerja: 'Performance', bawaan: 'Default', dirutekan: 'Routed', manajer: 'Manager', manajemen: 'Management',
  unduh: 'Download', unggah: 'Upload', pratinjau: 'Preview', lampiran: 'Attachment', lampirkan: 'Attach', naikkan: 'Move up', turunkan: 'Move down',
  anggota: 'Member', ketua: 'Lead', tersedia: 'Available', ketersediaan: 'Availability', keluhan: 'Complaint', insiden: 'Incident',
};
// seed.js = isi tiket demo (kalimat Indonesian yang wajar), bukan label UI.
const ALLOW = ['src/data/ConfigRepository.js', 'src/data/CategoryRepository.js', 'src/config/workspaces.js', 'src/data/seed.js'];

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.jsx?$/.test(p) ? [p] : []; });
const lit = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const jsx = />([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g;

let fail = 0; const hits = [];
for (const file of walk('src')) {
  if (ALLOW.includes(file.replace(/\\/g, '/'))) continue;
  const text = readFileSync(file, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const strings = [];
  for (const m of text.matchAll(lit)) strings.push(m[1] ?? m[2] ?? m[3]);
  for (const m of text.matchAll(jsx)) strings.push(m[1]);
  // literal berupa id/identifier (mis. 'insiden') dilewati: itu bukan teks tampil
  for (const s of strings.filter((x) => !/^[a-z0-9_\-]+$/.test(x))) for (const w of Object.keys(BANNED)) if (new RegExp(`(^|[^A-Za-z])${w}([^A-Za-z]|$)`, 'i').test(s)) hits.push(`${file}: "${s.trim().slice(0, 70)}"  -> pakai "${BANNED[w]}" (bukan "${w}")`);
}
if (hits.length) { fail = hits.length; hits.slice(0, 25).forEach((h) => console.log('FAIL ' + h)); } else console.log('PASS tidak ada istilah Indonesian terlarang di teks UI (' + Object.keys(BANNED).length + ' istilah dipindai)');
// Istilah English kunci harus ada (memastikan pemindaian benar-benar membaca sumbernya).
const all = walk('src').map((f) => readFileSync(f, 'utf8')).join('\n');
for (const t of ['In Progress', 'Resolved', 'Critical', 'SLA breached', 'My Queue', 'Needs attention', 'Routing Rules', 'Take Ticket', 'Escalate to vendor', 'Incident']) {
  const ok = all.includes(t); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + `istilah English "${t}" ada`);
}
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
