// Tes domain: perhitungan laporan dengan skenario yang angkanya dihitung tangan, batas hari WIB, filter, akses, dan CSV.
import Ticket from '../src/domain/Ticket.js';
import { buildReport, periodOf, startOfDay, toCsv, exportRows, kpis, DAY } from '../src/domain/Report.js';
import { USERS } from '../src/config/users.js';

let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`); };
const near = (name, got, want) => eq(name, got === null ? null : Math.round(got * 100) / 100, want);

const NOW = Date.parse('2026-09-30T10:00:00Z');                       // Rabu 17:00 WIB
const D0 = Date.parse('2026-09-29T17:00:00Z');                        // Rabu 30 Sep 00:00 WIB
const at = (dayOffset, hh, mm = 0) => D0 + dayOffset * DAY + (hh * 60 + mm) * 60000;
const M = 60000;
const rt = (team, dept, id) => ({ team, teamId: id || team, department: dept, pic: null, escalation: { l1: 'x', l2: 'y' } });
const T = (o) => new Ticket({ title: o.id, reporter: 'Rina', location: '', type: 'incident', status: 'open', assignee: null, ...o });
const tickets = [
  T({ id: 'A', priority: 'P3', categoryId: 'it', branch: 'Senopati', createdAt: at(0, 9), respondedAt: at(0, 9, 10), status: 'done', assignee: 'Kevin', resolution: { closedAt: at(0, 10), closedBy: 'K' }, routing: rt('IT Support Area', 'it', 'it_area') }),
  T({ id: 'B', priority: 'P1', categoryId: 'it', branch: 'Senopati', createdAt: at(0, 8), respondedAt: at(0, 8, 20), status: 'done', assignee: 'Kevin', resolution: { closedAt: at(0, 8, 45), closedBy: 'K' }, routing: rt('IT Support Area', 'it', 'it_area') }),
  T({ id: 'C', priority: 'P2', categoryId: 'hr', branch: 'Head Office', createdAt: at(0, 10), reporter: 'Citra Maharani', routing: rt('HR Service', 'hr') }),
  T({ id: 'D', priority: 'P3', categoryId: 'utilitas', branch: 'PIM', createdAt: at(-1, 12), respondedAt: at(-1, 12, 30), status: 'done', assignee: 'Dewi', resolution: { closedAt: at(-1, 13, 40), closedBy: 'D' }, routing: rt('Engineering', 'ga') }),
  T({ id: 'E', priority: 'P4', categoryId: 'keuangan', type: 'complaint', branch: 'Head Office', createdAt: at(-10, 10), respondedAt: at(-10, 10, 5), status: 'done', assignee: 'Tania', resolution: { closedAt: at(-10, 13, 20), closedBy: 'T' }, routing: rt('Employee Expense', 'finance') }),
  T({ id: 'F', priority: 'P3', categoryId: 'it', branch: 'DC Cikarang', createdAt: at(-10, 9), respondedAt: at(-10, 9, 5), status: 'in_progress', assignee: 'Budi', routing: rt('IT Infrastructure', 'it') }),
];
const chain = { Senopati: ['senopati', 'area-1', 'operations'], PIM: ['pim', 'area-2', 'operations'], 'Head Office': ['head-office'], 'DC Cikarang': ['dc-cikarang', 'distribution-center'] };
const names = { department: (id) => id.toUpperCase(), category: (id) => id, sub: (c, s) => s };
const ctx = { now: NOW, locationIds: (n) => chain[n] || [], names };
const U = Object.fromEntries(USERS.map((u) => [u.id, u]));
const P7 = periodOf('7', NOW);
const run = (o = {}) => buildReport(tickets, { user: U.hendra, ...P7, ...o }, ctx);

// ===== Periode & batas hari WIB
eq('startOfDay: 23:59:59 WIB tetap hari itu', startOfDay(Date.parse('2026-09-29T16:59:59Z')), Date.parse('2026-09-28T17:00:00Z'));
eq('startOfDay: 00:00:00 WIB = awal hari baru', startOfDay(Date.parse('2026-09-29T17:00:00Z')), Date.parse('2026-09-29T17:00:00Z'));
eq('periode hari ini = 1 hari penuh WIB', periodOf('today', NOW), { from: D0, to: D0 + DAY });
eq('periode 7 hari = 6 hari lalu s.d. akhir hari ini', periodOf('7', NOW), { from: D0 - 6 * DAY, to: D0 + DAY });
eq('periode 30 hari = 30 hari', (periodOf('30', NOW).to - periodOf('30', NOW).from) / DAY, 30);
eq('periode kustom inklusif tanggal akhir', periodOf('custom', NOW, { from: '2026-09-29', to: '2026-09-30' }), { from: D0 - DAY, to: D0 + DAY });
eq('kustom: tanggal tidak valid (31 Feb) ditolak', periodOf('custom', NOW, { from: '2026-02-31', to: '2026-03-01' }), null);
eq('kustom: akhir < awal ditolak', periodOf('custom', NOW, { from: '2026-09-30', to: '2026-09-01' }), null);
eq('kustom: format salah / kosong ditolak', [periodOf('custom', NOW, { from: '30-09-2026', to: '2026-09-30' }), periodOf('custom', NOW, {})], [null, null]);

// ===== KPI periode 7 hari: cohort A,B,C,D
const r = run();
eq('KPI: total, selesai, terbuka', [r.kpi.total, r.kpi.resolved, r.kpi.open], [4, 3, 1]);
eq('KPI: SLA terlewat = B (selesai telat) + C (aktif lewat) = 2', r.kpi.breached, 2);
eq('KPI: kepatuhan SLA 50.0%', r.kpi.slaRate, 50);
near('KPI: rata-rata respons (10+20+30)/3 = 20 mnt', r.kpi.avgResponseMin, 20);
near('KPI: rata-rata penyelesaian (60+45+100)/3 = 68.33 mnt', r.kpi.avgResolutionMin, 68.33);
eq('periode sebelumnya (E,F): total 2, selesai 1, terlewat 1 (F aktif lewat)', [r.prev.total, r.prev.resolved, r.prev.breached], [2, 1, 1]);
eq('tiket masuk periode sebelumnya tidak ikut cohort', r.tickets.map((t) => t.id), ['C', 'A', 'B', 'D']);

// ===== Tren
eq('tren: 7 bucket harian', [r.trend.step, r.trend.buckets.length], [1, 7]);
eq('tren: masuk per hari (hari ini 3, kemarin 1)', r.trend.buckets.map((b) => b.created), [0, 0, 0, 0, 0, 1, 3]);
eq('tren: selesai menurut tanggal penyelesaian (A,B hari ini; D kemarin)', r.trend.buckets.map((b) => b.resolved), [0, 0, 0, 0, 0, 1, 2]);
const r90 = run({ ...periodOf('90', NOW) });
eq('tren 90 hari: mingguan, 13 bucket, bucket terakhir dipotong', [r90.trend.step, r90.trend.buckets.length, (r90.trend.buckets[12].end - r90.trend.buckets[12].start) / DAY], [7, 13, 6]);
eq('tren 90 hari: total masuk dari seluruh bucket = seluruh tiket', r90.trend.buckets.reduce((a, b) => a + b.created, 0), 6);

// ===== Rincian
eq('rincian department (masuk + terlewat)', r.by.department.map((g) => [g.label, g.total, g.breached]), [['IT', 2, 1], ['GA', 1, 0], ['HR', 1, 1]]);
eq('rincian prioritas urut P1..P3', r.by.priority.map((g) => [g.key, g.total]), [['P1', 1], ['P2', 1], ['P3', 2]]);
eq('rincian lokasi', r.by.location.map((g) => [g.label, g.total]), [['Senopati', 2], ['Head Office', 1], ['PIM', 1]]);
eq('kinerja tim', r.teams.map((g) => [g.label, g.total, g.resolved]), [['IT Support Area', 2, 2], ['Engineering', 1, 1], ['HR Service', 1, 0]]);
eq('beban PIC (tanpa PIC = "Belum diambil")', r.pics.map((g) => [g.label, g.total]), [['Kevin', 2], ['Unassigned', 1], ['Dewi', 1]].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

// ===== Umur tiket terbuka (tidak dibatasi periode) & tiket terlambat
eq('umur tiket terbuka: C 7 jam, F 10 hari', r.aging.filter((a) => a.count).map((a) => [a.label, a.count, a.atRisk]), [['4–24 hr', 1, 1], ['> 3 days', 1, 1]]);
eq('tiket terbuka saat ini', r.openNow, 2);
eq('tiket terlambat diurut dari yang paling lewat (C 300 mnt, B 15 mnt)', r.late.map((l) => [l.id, Math.round(l.overshootMin)]), [['C', 300], ['B', 15]]);

// ===== Filter
eq('filter department it', run({ department: 'it' }).kpi.total, 2);
eq('filter lokasi induk (Area 1 mencakup Senopati)', run({ locationId: 'area-1' }).tickets.map((t) => t.id).sort(), ['A', 'B']);
eq('filter lokasi induk (Operations mencakup Senopati + PIM)', run({ locationId: 'operations' }).kpi.total, 3);
eq('filter lokasi Head Office', run({ locationId: 'head-office' }).tickets.map((t) => t.id), ['C']);
eq('filter prioritas P1', run({ priority: 'P1' }).tickets.map((t) => t.id), ['B']);
eq('filter kategori', run({ categoryId: 'utilitas' }).tickets.map((t) => t.id), ['D']);
eq('filter jenis keluhan: kosong di 7 hari, ada di 30 hari', [run({ type: 'complaint' }).kpi.total, run({ type: 'complaint', ...periodOf('30', NOW) }).kpi.total], [0, 1]);
eq('filter "all" = tanpa filter', run({ department: 'all', priority: 'all' }).kpi.total, 4);
eq('kombinasi filter', run({ department: 'it', priority: 'P3' }).tickets.map((t) => t.id), ['A']);
eq('hasil kosong: KPI aman (null, bukan NaN)', (({ kpi }) => [kpi.total, kpi.slaRate, kpi.avgResponseMin, kpi.avgResolutionMin])(run({ priority: 'P4' })), [0, null, null, null]);

// ===== Akses per peran
eq('karyawan Rina hanya tiket miliknya (A,B,D,E,F -> 7 hari: A,B,D)', buildReport(tickets, { user: U.rina, ...P7 }, ctx).tickets.map((t) => t.id).sort(), ['A', 'B', 'D']);
eq('karyawan Citra hanya C', buildReport(tickets, { user: U.citra, ...P7 }, ctx).tickets.map((t) => t.id), ['C']);
eq('manajer IT hanya department IT', buildReport(tickets, { user: U.andri, ...P7 }, ctx).tickets.map((t) => t.id).sort(), ['A', 'B']);
eq('PIC Kevin: tiket tim IT Support Area', buildReport(tickets, { user: U.kevin, ...P7 }, ctx).tickets.map((t) => t.id).sort(), ['A', 'B']);
eq('admin melihat semua', buildReport(tickets, { user: U.sari, ...P7 }, ctx).kpi.total, 4);
eq('umur tiket terbuka juga dibatasi hak akses (karyawan Citra: hanya C)', buildReport(tickets, { user: U.citra, ...P7 }, ctx).openNow, 1);

// ===== Ekspor CSV
const rows = exportRows(r.tickets, { ...ctx, names });
eq('ekspor: header + 4 baris', [rows.length, rows[0][0], rows[0].length], [5, 'ID', 17]);
const rowB = rows.find((x) => x[0] === 'B');
eq('ekspor: baris B (WIB, menit, SLA terlewat)', [rowB[1], rowB[2], rowB[3], rowB[12], rowB[13], rowB[14], rowB[15]], ['2026-09-30 08:00', 'Incident', 'P1', 20, 45, 30, 'Ya']);
eq('ekspor: tiket terbuka: respons/penyelesaian kosong, status Open', (({ 11: st, 12: rs, 13: rl }) => [st, rs, rl])(rows.find((x) => x[0] === 'C')), ['Open', '', '']);
eq('CSV: kutip koma, tanda kutip, baris baru', toCsv([['a', 'b,c', 'd"e', 'x\ny']]), 'a,"b,c","d""e","x\ny"');
eq('CSV: rumus Excel dinetralkan (teks berawalan = + - @)', toCsv([['=SUM(A1)', '+1', '-2x', '@cmd']]), "'=SUM(A1),'+1,'-2x,'@cmd");
eq('CSV: angka negatif & null tidak diubah', toCsv([[-5, null, 0]]), '-5,,0');
eq('CSV: pemisah baris CRLF', toCsv([['a'], ['b']]), 'a\r\nb');
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
