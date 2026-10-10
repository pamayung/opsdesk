// Riwayat tiket dari database memakai teks sistem berbahasa Indonesia (dibuat fungsi database). Istilah di antarmuka memakai English,
// jadi teks sistem yang polanya tetap diterjemahkan di sini; teks yang tidak dikenal ditampilkan apa adanya.
// Berkas ini dikecualikan dari penjaga terminologi karena memang memuat pola teks Indonesian dari database.
const RULES = {
  created: [[/^Tiket dibuat dan masuk antrean$/, () => 'Ticket created and added to the queue']],
  routed: [[/^Dirutekan ke (.+?)(?:, PIC awal (.+?))?( \(di luar jam kerja, dialihkan ke on-call\))?$/,
    (_, team, pic, off) => `Routed to ${team}${pic ? `, initial PIC ${pic}` : ''}${off ? ' (outside working hours, redirected to on-call)' : ''}`]],
  assigned: [
    [/^Tiket diambil oleh (.+)$/, (_, who) => `Ticket taken by ${who}`],
    [/^(.+) ditugaskan sebagai PIC oleh (.+)$/, (_, who, by) => `${who} assigned as PIC by ${by}`],
  ],
  resolved: [[/^Tiket diselesaikan oleh (.+)$/, (_, who) => `Ticket resolved by ${who}`]],
  vendor_escalated: [[/^Dieskalasi ke (.+) oleh (.+)$/, (_, to, by) => `Escalated to ${to} by ${by}`]],
  resolution: [[/^Penyelesaian: ([\s\S]*)$/, (_, note) => `Resolution: ${note}`]],
  // kode yang sama dipakai catatan pelapor/manajer (alasan) dan event sistem
  reopened: [
    [/^Tiket dibuka kembali oleh (.+)$/, (_, who) => `Ticket reopened by ${who}`],
    [/^Dibuka kembali: ([\s\S]*)$/, (_, reason) => `Reopened: ${reason}`],
  ],
};

export function eventText(ev) {
  const body = ev.body || '';
  for (const [re, fn] of RULES[ev.code] || []) {
    const m = body.match(re);
    if (m) return fn(...m);
  }
  return body;
}
