// Tes domain: mesin routing (lokasi, area, jam kerja, on-call), akses per peran, statistik, dan data contoh.
// Dijalankan lewat `npm test` (di-bundle dengan esbuild lalu dijalankan Node).
import RoutingEngine from '../src/domain/Routing.js';
import { DEPARTMENTS, TEAMS, ROUTING_RULES } from '../src/config/routing.js';
import { DEFAULT_LOCATIONS } from '../src/config/org.js';
import { USERS } from '../src/config/users.js';
import { chainOf, kindOfNode, pathText } from '../src/domain/Location.js';
import { canView, canHandle } from '../src/domain/Access.js';
import seed, { sampleHistory } from '../src/data/seed.js';
import { GetStats, GetDepartmentQueues, GetTeamQueues, ListTickets, GetTicket } from '../src/domain/usecases.js';

const byName = (n) => DEFAULT_LOCATIONS.find((l) => l.name === n);
const info = (n) => ({ kind: kindOfNode(DEFAULT_LOCATIONS, byName(n).id), ids: chainOf(DEFAULT_LOCATIONS, byName(n).id).map((x) => x.id) });
let load = {};
const r = new RoutingEngine({ rules: ROUTING_RULES, teams: TEAMS, departments: DEPARTMENTS, loadOf: (n) => load[n] || 0 });
const WED_10 = Date.parse('2026-09-30T03:00:00Z'), WED_2230 = Date.parse('2026-09-30T15:30:00Z'), SUN_10 = Date.parse('2026-10-04T03:00:00Z');
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`); };
const go = (cat, sub, loc, o = {}, t = WED_10) => { const i = info(loc); const x = r.route({ categoryId: cat, subId: sub, type: 'incident', priority: 'P3', kind: i.kind, locationIds: i.ids, ...o }, t); return { dept: DEPARTMENTS[x.department].name, team: x.team, pic: x.pic && x.pic.name, ext: x.external, x }; };
const route3 = (c, s, l, o, t) => { const x = go(c, s, l, o, t); return [x.dept, x.team, x.pic]; };

// === 1. Outlet
eq('Outlet: POS error di Senopati (Area 1) -> IT / IT Support Area / Kevin', route3('it', 'pos', 'Senopati'), ['IT', 'IT Support Area', 'Kevin Mahendra']);
eq('Outlet: POS error di BSD (Area 2) -> PIC area lain (Budi)', route3('it', 'pos', 'BSD'), ['IT', 'IT Support Area', 'Budi Santoso']);
eq('Outlet: Toilet rusak di Kemang -> GA / Facility / PIC area 1', route3('fasilitas', 'toilet', 'Kemang'), ['GA & Facility', 'Facility', 'Sri Wahyuni']);
eq('Outlet: Toilet rusak di PIM -> Facility / PIC area 2', route3('fasilitas', 'toilet', 'PIM'), ['GA & Facility', 'Facility', 'Wawan Setiawan']);
eq('Outlet: AC tidak dingin -> GA / Vendor (eksternal)', [go('utilitas', 'ac', 'Kemang').dept, go('utilitas', 'ac', 'Kemang').team, go('utilitas', 'ac', 'Kemang').ext], ['GA & Facility', 'Vendor AC & Pendingin', true]);
// === 2. Head Office
eq('HO: Laptop rusak -> IT / IT Helpdesk', route3('it', 'enduser', 'Head Office').slice(0, 2), ['IT', 'IT Helpdesk']);
eq('HO: Tidak bisa akses SAP -> IT / SAP Support', route3('it', 'bizapp', 'Head Office').slice(0, 2), ['IT', 'SAP Support']);
eq('HO: Request kartu nama -> GA / General Affair', route3('fasilitas', 'kantor', 'Head Office').slice(0, 2), ['GA & Facility', 'General Affair']);
eq('HO: Request recruitment -> HR / HR Recruitment', route3('hr', 'recruitment', 'Head Office').slice(0, 2), ['HR', 'HR Recruitment']);
// === 3-5
eq('Finance: Invoice vendor -> Account Payable', route3('keuangan', 'ap', 'Head Office').slice(0, 2), ['Finance', 'Account Payable']);
eq('Finance: Reimbursement -> Employee Expense', route3('keuangan', 'expense', 'Head Office').slice(0, 2), ['Finance', 'Employee Expense']);
eq('Procurement: pembelian laptop -> IT Procurement', route3('pengadaan', 'it', 'Head Office').slice(0, 2), ['Procurement', 'IT Procurement']);
eq('Legal: review kontrak -> Contract Management', route3('legal', 'kontrak', 'Head Office').slice(0, 2), ['Legal', 'Contract Management']);
// === 6. Warehouse / DC
eq('DC: Forklift bermasalah -> GA / DC Maintenance', route3('peralatan', 'forklift', 'DC Cikarang').slice(0, 2), ['GA & Facility', 'DC Maintenance']);
eq('DC: WMS error di Warehouse -> IT / WMS Support', route3('it', 'wms', 'Warehouse').slice(0, 2), ['IT', 'WMS Support']);
// === Lokasi = parameter routing: "Internet bermasalah"
eq('Internet di Outlet -> IT Support Area', go('it', 'network', 'Senopati').team, 'IT Support Area');
eq('Internet di HO -> IT Helpdesk', go('it', 'network', 'Head Office').team, 'IT Helpdesk');
eq('Internet di DC -> IT Infrastructure', go('it', 'network', 'DC Cikarang').team, 'IT Infrastructure');
eq('Internet di sub-lokasi DC (Fleet) juga -> IT Infrastructure (warisan)', go('it', 'network', 'Fleet').team, 'IT Infrastructure');
// === Struktur bertingkat
eq('Pohon: jalur Senopati', pathText(DEFAULT_LOCATIONS, 'senopati'), 'Senopati › Area 1 › Operations');
eq('Pohon: jenis diwarisi (Maintenance = warehouse)', kindOfNode(DEFAULT_LOCATIONS, 'dc-maintenance'), 'warehouse');
eq('Pohon: jenis Area 2 = outlet', kindOfNode(DEFAULT_LOCATIONS, 'area-2'), 'outlet');
// === Aturan lain
eq('Kategori baru -> Service Desk (default)', go('cat_baru', undefined, 'Kemang').team, 'Service Desk');
eq('Keluhan -> Service Desk apa pun kategorinya', go('it', 'pos', 'Senopati', { type: 'complaint' }).team, 'Service Desk');
eq('Pertanyaan mengikuti klasifikasi (payroll)', go('hr', 'payroll', 'Head Office', { type: 'question' }).team, 'HR Payroll');
eq('Malam 22:30: POS -> IT On-Call, department tetap IT', [go('it', 'pos', 'Senopati', {}, WED_2230).team, go('it', 'pos', 'Senopati', {}, WED_2230).dept, go('it', 'pos', 'Senopati', {}, WED_2230).x.offHours], ['IT On-Call', 'IT', true]);
eq('Minggu: vendor AC tutup -> Engineering On-Call', go('utilitas', 'ac', 'Kemang', {}, SUN_10).team, 'Engineering On-Call');
eq('HR malam: department tetap HR', go('hr', 'recruitment', 'Head Office', {}, WED_2230).dept, 'HR');
load = { 'Sri Wahyuni': 5 };
eq('Beban tidak melampaui cakupan area (satu-satunya PIC area 1)', go('fasilitas', 'toilet', 'Kemang').pic, 'Sri Wahyuni');
load = { 'Niko Pratama': 3, 'Rara Anjani': 1 };
eq('Di antara kandidat: beban terendah', go('it', 'enduser', 'Head Office').pic, 'Rara Anjani');
load = {};
eq('Anggota tidak tersedia dilewati (Agus off)', go('peralatan', 'mesin', 'PIM').pic, 'Dewi Lestari');
eq('Lokasi tak dikenal: PIC tetap ada (fallback)', route3('fasilitas', 'toilet', 'Head Office')[2], 'Sri Wahyuni');

// === Akses per peran + statistik (memakai data seed)
const nodes = DEFAULT_LOCATIONS;
const seedRoute = (i, at) => r.route(i, at);
const tickets = seed(seedRoute, info, Date.parse('2026-09-30T10:00:00Z'));
const repo = { list: () => tickets, find: (id) => tickets.find((t) => t.id === id) };
const U = Object.fromEntries(USERS.map((u) => [u.id, u]));
const NOW = Date.parse('2026-09-30T10:00:00Z');
const count = (u, o = {}) => new ListTickets(repo).execute({ user: u, status: 'all', ...o }, NOW).length;
eq('Seed: 25 tiket contoh + 130 riwayat = 155', tickets.length, 155);
eq('Management melihat semua', count(U.hendra), 155);
eq('Karyawan hanya tiket yang ia laporkan (Citra)', new ListTickets(repo).execute({ user: U.citra, status: 'all' }, NOW).every((t) => t.reporter === 'Citra Maharani') && count(U.citra) === 4, true);
eq('Karyawan Rina hanya tiketnya', new ListTickets(repo).execute({ user: U.rina, status: 'all' }, NOW).every((t) => t.reporter === 'Rina'), true);
eq('Manajer IT hanya department IT', new ListTickets(repo).execute({ user: U.andri, status: 'all' }, NOW).every((t) => t.department === 'it') && count(U.andri) > 5, true);
const kevinList = new ListTickets(repo).execute({ user: U.kevin, status: 'all' }, NOW);
eq('PIC Kevin melihat tiket tim IT Support Area & miliknya', kevinList.every((t) => t.assignee === 'Kevin Mahendra' || (t.routing && ['it_area', 'it_oncall'].includes(t.routing.teamId))) && kevinList.some((t) => t.id === 'TCK-1042'), true);
eq('PIC tidak melihat tiket tim lain (HR)', kevinList.some((t) => t.department === 'hr'), false);
const t1042 = tickets.find((t) => t.id === 'TCK-1042');
eq('canHandle: PIC ya, karyawan tidak, management tidak', [canHandle(U.kevin, t1042), canHandle(U.rina, t1042), canHandle(U.hendra, t1042)], [true, false, false]);
eq('GetTicket menolak tiket di luar akses', new GetTicket(repo).execute('TCK-1042', U.citra), null);
eq('GetTicket mengizinkan pelapor (Rina)', new GetTicket(repo).execute('TCK-1042', U.rina) !== null, true);
const S = (u) => new GetStats(repo).execute(u, NOW);
const sm = S(U.hendra);
eq('Management: total = terbuka + selesai', sm.total, sm.active + sm.resolved);
eq('Management: SLA breached mencakup tiket selesai terlambat (printer 200 mnt > P2 120)', tickets.find((t) => t.id === 'TCK-1066').wasBreached(NOW), true);
const sc = S(U.citra);
eq('Karyawan: Open + Dalam proses + Selesai = total', sc.open + sc.inProgress + sc.resolved, sc.total);
eq('PIC: hitungan per prioritas = aktif', Object.values(S(U.kevin).byPriority).reduce((a, b) => a + b, 0), S(U.kevin).active);
eq('Manajer: rata-rata penyelesaian (jam) terhitung', typeof S(U.andri).avgResolutionHours, 'number');
const dq = new GetDepartmentQueues(repo, { departments: DEPARTMENTS }).execute(U.hendra, NOW);
eq('Antrean per department: jumlah aktif = total aktif', dq.reduce((a, d) => a + d.count, 0), sm.active);
eq('Manajer IT: antrean per tim hanya tim IT', new GetTeamQueues(repo, { teams: TEAMS }).execute(U.andri, NOW).every((q) => TEAMS[q.id].department === 'it'), true);
// ===== Riwayat contoh
const hist = tickets.filter((t) => parseInt(t.id.replace(/\D/g, ''), 10) < 1040);
const num = (t) => parseInt(t.id.replace(/\D/g, ''), 10);
eq('riwayat: 130 tiket, ID di bawah 1040 (nomor tiket baru tak berubah)', [hist.length, Math.max(...tickets.map(num))], [130, 1066]);
eq('riwayat: semua selesai, ber-PIC, ber-routing', hist.every((t) => t.status === 'done' && t.assignee && t.routing && t.resolution.closedAt > t.createdAt), true);
eq('riwayat: tersebar 60 hari (paling lama > 55 hari, paling baru < 3 hari)', [Math.max(...hist.map((t) => t.ageMin(NOW))) / 1440 > 55, Math.min(...hist.map((t) => t.ageMin(NOW))) / 1440 < 3], [true, true]);
eq('riwayat: tidak pernah selesai di masa depan', hist.every((t) => t.resolution.closedAt <= Date.parse('2026-09-30T10:00:00Z') + 1), true);
const late = hist.filter((t) => t.wasBreached(NOW)).length / hist.length;
eq('riwayat: ~5-30% melewati SLA (realistis)', late > 0.05 && late < 0.3, true);
eq('riwayat: mencakup semua department', new Set(hist.map((t) => t.department)).size >= 7, true);

eq('riwayat: mencakup 4 jenis kebutuhan', new Set(hist.map((t) => t.type)).size, 4);
eq('riwayat: pelapor bukan pengguna login (tes akses karyawan tetap stabil)', hist.some((t) => ['Rina', 'Citra Maharani'].includes(t.reporter)), false);
const h1 = sampleHistory(seedRoute, info, NOW), h2 = sampleHistory(seedRoute, info, NOW);
eq('riwayat: deterministik (dua kali hasil sama)', JSON.stringify(h1.map((t) => [t.id, t.title, t.priority, t.branch, t.createdAt, t.resolution.closedAt])) === JSON.stringify(h2.map((t) => [t.id, t.title, t.priority, t.branch, t.createdAt, t.resolution.closedAt])), true);
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
