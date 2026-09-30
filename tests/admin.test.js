// Tes domain: AdminService (validasi integritas data) dan bukti bahwa perubahan admin langsung memengaruhi routing.
import { container as c } from '../src/app/container.js';
import { findShadowed, covers } from '../src/domain/Admin.js';
import { canView } from '../src/domain/Access.js';

const A = c.admin;
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`); };
const throws = (name, fn, re) => { let msg = null; try { fn(); } catch (e) { msg = e.message; } const ok = msg !== null && re.test(msg); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : `\n   pesan: ${msg}`); };
const route = (categoryId, subId, loc, o = {}, when = Date.parse('2026-09-30T03:00:00Z')) => c.previewRoute.execute({ categoryId, subId, type: 'incident', priority: 'P3', kind: c.locationKind(loc), locationIds: c.locationIds(loc), ...o }, when);

// ===== Lokasi
A.addLocation({ name: 'Area 3', parentId: 'operations' });
const a3 = c.listLocations.execute().find((l) => l.name === 'Area 3');
eq('lokasi anak dibuat di bawah induk', a3.parentId, 'operations');
A.addLocation({ name: 'Outlet Tebet', parentId: a3.id });
eq('jenis lokasi diwarisi dari leluhur (outlet)', c.locationKind('Outlet Tebet'), 'outlet');
throws('nama lokasi unik (tak peduli huruf besar)', () => A.addLocation({ name: 'outlet tebet', parentId: a3.id }), /sudah ada/);
throws('lokasi utama wajib punya jenis', () => A.addLocation({ name: 'Cabang Luar' }), /jenis/);
throws('induk harus ada', () => A.addLocation({ name: 'X1', parentId: 'nope' }), /Induk lokasi tidak ditemukan/);
A.addLocation({ name: 'Regional Bandung', kind: 'outlet' });
eq('lokasi utama tersimpan dengan jenis', c.listLocations.execute().find((l) => l.name === 'Regional Bandung').kind, 'outlet');
throws('induk tidak boleh turunan sendiri', () => A.updateLocation(a3.id, { name: 'Area 3', parentId: c.listLocations.execute().find((l) => l.name === 'Outlet Tebet').id }), /turunannya/);
// pindah ke Distribution Center -> jenis berubah menjadi warehouse
A.updateLocation(a3.id, { name: 'Area 3', parentId: 'distribution-center' });
eq('memindahkan lokasi mengubah jenis turunan (warehouse)', c.locationKind('Outlet Tebet'), 'warehouse');
A.updateLocation(a3.id, { name: 'Area 3', parentId: 'operations' });
// rename + cascade tiket & pengguna
const beforeCitra = c.users.find((u) => u.id === 'citra').location;
A.updateLocation('head-office', { name: 'Kantor Pusat', parentId: null, kind: 'head_office' });
eq('rename lokasi merambat ke tiket', c.listTickets.execute({ status: 'all' }).filter((t) => t.branch === 'Kantor Pusat').length > 5 && c.listTickets.execute({ status: 'all' }).filter((t) => t.branch === 'Head Office').length === 0, true);
eq('rename lokasi merambat ke lokasi pengguna', [beforeCitra, c.users.find((u) => u.id === 'citra').location], ['Head Office', 'Kantor Pusat']);
A.updateLocation('head-office', { name: 'Head Office', parentId: null, kind: 'head_office' });
throws('hapus lokasi: masih punya turunan', () => A.removeLocation('operations'), /lokasi di bawahnya/);
throws('hapus lokasi: dipakai tiket', () => A.removeLocation('senopati'), /dipakai \d+ tiket/);
throws('hapus lokasi: dipakai cakupan area tim', () => A.removeLocation('area-1'), /di bawahnya|area scope/);
A.removeLocation(c.listLocations.execute().find((l) => l.name === 'Outlet Tebet').id);
A.removeLocation(a3.id);
eq('lokasi yang tak dipakai bisa dihapus', c.listLocations.execute().some((l) => l.name === 'Area 3'), false);

// ===== Kategori, subkategori, pertanyaan
A.addCategory('Kendaraan');
const kend = c.listCategories.execute().find((x) => x.name === 'Kendaraan');
throws('kategori unik', () => A.addCategory('kendaraan'), /sudah ada/);
A.updateCategory(kend.id, 'Kendaraan Operasional');
eq('rename kategori', c.listCategories.execute().find((x) => x.id === kend.id).name, 'Kendaraan Operasional');
throws('hapus kategori: dipakai tiket', () => A.removeCategory('it'), /dipakai \d+ tiket/);
A.addSub(kend.id, 'Servis berkala');
const sv = c.catalog.subsOf(kend.id)[0];
throws('subkategori unik', () => A.addSub(kend.id, 'servis BERKALA'), /sudah ada/);
A.saveQuestions(kend.id, sv.id, [{ label: 'Nomor polisi', type: 'text', required: true }, { label: 'Jenis servis', type: 'select', options: ['Ringan', 'Berat', 'Ringan'], required: true }]);
eq('pertanyaan tersimpan (opsi duplikat dibuang, id dibuat)', c.catalog.subsOf(kend.id)[0].questions.map((q) => [q.id, q.type, q.options || null, !!q.required]), [['nomor-polisi', 'text', null, true], ['jenis-servis', 'select', ['Ringan', 'Berat'], true]]);
throws('pilihan minimal 2', () => A.saveQuestions(kend.id, sv.id, [{ label: 'X', type: 'select', options: ['a'] }]), /minimal 2 pilihan/);
throws('label pertanyaan wajib', () => A.saveQuestions(kend.id, sv.id, [{ label: ' ', type: 'text' }]), /label wajib/);
throws('jenis pertanyaan valid', () => A.saveQuestions(kend.id, sv.id, [{ label: 'X', type: 'aneh' }]), /tidak dikenal/);
throws('hapus subkategori: dipakai aturan', () => A.removeSub('it', 'pos'), /dipakai routing rules/);

// ===== Department & tim
const deptId = A.addDepartment({ name: 'Logistik', head: 'Bima Sakti' });
throws('department unik', () => A.addDepartment({ name: 'logistik', head: 'X' }), /sudah ada/);
const tid = A.addTeam({ name: 'Armada', department: deptId, lead: 'Bima Sakti', hours: { days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00' }, onCall: 'service_desk' });
eq('tim baru tersimpan', [c.teams[tid].name, c.teams[tid].members.length, c.teams[tid].onCall], ['Armada', 0, 'service_desk']);
throws('jam kerja: mulai < selesai', () => A.updateTeam(tid, { name: 'Armada', department: deptId, lead: 'B', hours: { days: [1], from: '17:00', to: '08:00' } }), /lebih awal/);
throws('jam kerja: minimal satu hari', () => A.updateTeam(tid, { name: 'Armada', department: deptId, lead: 'B', hours: { days: [], from: '08:00', to: '17:00' } }), /minimal satu hari/);
throws('on-call bukan diri sendiri', () => A.updateTeam(tid, { name: 'Armada', department: deptId, lead: 'B', onCall: tid }), /sendiri/);
throws('ketua tim wajib', () => A.updateTeam(tid, { name: 'Armada', department: deptId, lead: '' }), /team lead/);
throws('nama tim unik', () => A.addTeam({ name: 'IT Helpdesk', department: 'it', lead: 'X' }), /sudah ada/);
A.addMember(tid, { name: 'Sopir Andi', scope: ['dc-cikarang'] });
throws('anggota unik dalam tim', () => A.addMember(tid, { name: 'sopir andi' }), /sudah menjadi member/);
throws('cakupan area harus lokasi yang ada', () => A.addMember(tid, { name: 'Sopir Budi', scope: ['nowhere'] }), /tidak ada/);
A.updateTeam(tid, { name: 'Armada Logistik', department: deptId, lead: 'Bima Sakti', hours: null });
eq('update tim mempertahankan anggota & jam 24 jam', [c.teams[tid].name, c.teams[tid].members.length, c.teams[tid].hours], ['Armada Logistik', 1, null]);
A.updateMember(tid, 'sopir-andi', { available: false, scope: [] });
eq('anggota: ketersediaan & cakupan diubah', [c.teams[tid].members[0].available, c.teams[tid].members[0].scope], [false, undefined]);
throws('hapus department: masih punya tim', () => A.removeDepartment(deptId), /masih punya 1 team/);
throws('hapus tim: dipakai aturan', () => A.removeTeam('it_area'), /dipakai \d+ routing rules/);
throws('hapus tim: jadi on-call tim lain', () => A.removeTeam('it_oncall'), /on-call team untuk/);
throws('hapus tim: dipakai PIC', () => A.removeTeam('ga_engineering') || A.removeTeam('it_helpdesk'), /dipakai|on-call|PIC/);

// ===== Aturan routing (dan efeknya langsung ke hasil routing)
eq('sebelum: POS di DC -> IT Support Area', route('it', 'pos', 'DC Cikarang').team, 'IT Support Area');
const rid = A.addRule({ category: 'it', sub: 'pos', kind: 'warehouse', team: 'it_infra' });
eq('aturan baru disisipkan sebelum aturan bawaan', c.rules[c.rules.length - 1].id, 'default');
eq('aturan baru di bawah aturan umum: tertutup (shadowed)', findShadowed(c.rules)[rid], 'it-pos');
eq('aturan yang tertutup belum berefek', route('it', 'pos', 'DC Cikarang').team, 'IT Support Area');
for (let i = 0; i < 30; i++) A.moveRule(rid, -1);
eq('setelah dinaikkan: tidak tertutup lagi', findShadowed(c.rules)[rid], undefined);
eq('perubahan aturan langsung memengaruhi routing (POS di DC -> IT Infrastructure)', route('it', 'pos', 'DC Cikarang').team, 'IT Infrastructure');
eq('lokasi lain tidak terpengaruh', route('it', 'pos', 'Senopati').team, 'IT Support Area');
eq('aturan bawaan tetap paling bawah setelah banyak pergeseran', c.rules[c.rules.length - 1].id, 'default');
throws('aturan wajib punya kondisi', () => A.addRule({ team: 'it_area' }), /minimal satu kondisi/);
throws('subkategori butuh kategori', () => A.addRule({ sub: 'pos', team: 'it_area' }), /kategori sebelum subkategori/);
throws('subkategori harus milik kategori', () => A.addRule({ category: 'hr', sub: 'pos', team: 'it_area' }), /tidak ada di kategori/);
throws('tim tujuan harus ada', () => A.addRule({ category: 'it', team: 'nope' }), /team tujuan/);
throws('aturan bawaan tidak bisa dihapus', () => A.removeRule('default'), /tidak bisa dihapus/);
A.updateRule('default', { team: 'hr_service' });
eq('aturan bawaan hanya ganti tim tujuan', [c.rules.at(-1).id, c.rules.at(-1).team, Object.keys(c.rules.at(-1)).length], ['default', 'hr_service', 2]);
eq('kategori baru mengikuti aturan bawaan yang baru', route('cat_x', undefined, 'Kemang').team, 'HR Service');
A.updateRule('default', { team: 'service_desk' });
A.removeRule(rid);
eq('hapus aturan mengembalikan perilaku semula', route('it', 'pos', 'DC Cikarang').team, 'IT Support Area');
// tim & anggota baru ikut dipakai routing
A.addMember('it_area', { name: 'Tono Baru', scope: ['area-1'] });
A.updateMember('it_area', 'kevin', { available: false, scope: ['area-1'] });
eq('PIC area 1: Kevin tidak tersedia -> anggota baru Tono', route('it', 'pos', 'Senopati').pic.name, 'Tono Baru');
A.updateMember('it_area', 'kevin', { available: true, scope: ['area-1'] });
// jam kerja tim mengikuti pengaturan
A.updateTeam('it_helpdesk', { name: 'IT Helpdesk', department: 'it', lead: 'Niko Pratama', onCall: 'it_oncall', hours: { days: [1, 2, 3, 4, 5], from: '13:00', to: '17:00' } });
eq('jam kerja diubah admin: 10:00 WIB sekarang di luar jam -> on-call', route('it', 'enduser', 'Head Office').team, 'IT On-Call');
A.updateTeam('it_helpdesk', { name: 'IT Helpdesk', department: 'it', lead: 'Niko Pratama', onCall: 'it_oncall', hours: { days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00' } });

// ===== Pengguna
throws('PIC wajib punya tim', () => A.addUser({ name: 'Tim Kosong', role: 'pic' }), /minimal satu team/);
throws('manajer wajib department', () => A.addUser({ name: 'Mgr Kosong', role: 'manager' }), /memilih department/);
throws('peran valid', () => A.addUser({ name: 'Aneh', role: 'dewa' }), /Pilih role/);
throws('nama pengguna unik', () => A.addUser({ name: 'kevin mahendra', role: 'employee' }), /sudah ada/);
const uid = A.addUser({ name: 'Rara Baru', role: 'pic', title: 'IT Helpdesk', teamIds: ['it_helpdesk'] });
const rara = c.users.find((u) => u.id === uid);
eq('PIC baru melihat tiket tim-nya', c.listTickets.execute({ user: rara, status: 'all' }).length > 0 && c.listTickets.execute({ user: rara, status: 'all' }).every((t) => canView(rara, t)), true);
A.updateUser(uid, { role: 'manager', department: 'it', title: 'Kepala Helpdesk' });
eq('ubah peran: field peran lama dibersihkan', [c.users.find((u) => u.id === uid).role, c.users.find((u) => u.id === uid).teamIds, c.users.find((u) => u.id === uid).department], ['manager', undefined, 'it']);
eq('nama pengguna tidak berubah saat diedit', c.users.find((u) => u.id === uid).name, 'Rara Baru');
throws('tidak bisa hapus akun yang sedang dipakai', () => A.removeUser('sari', 'sari'), /sedang dipakai/);
throws('harus ada minimal satu admin (hapus)', () => A.removeUser('sari', 'kevin'), /minimal satu administrator/);
throws('harus ada minimal satu admin (ubah peran)', () => A.updateUser('sari', { role: 'employee' }), /minimal satu administrator/);
A.removeUser(uid, 'sari');
eq('pengguna dihapus', c.users.some((u) => u.id === uid), false);
throws('hapus tim: dipakai pengguna PIC (Kevin)', () => { A.addTeam({ name: 'Tim Uji', department: 'it', lead: 'X' }); const t = Object.keys(c.teams).find((k) => c.teams[k].name === 'Tim Uji'); A.addUser({ name: 'Pic Uji', role: 'pic', teamIds: [t] }); A.removeTeam(t); }, /dipakai user/);

// ===== Shadow detection unit
eq('covers: aturan umum menutupi yang lebih spesifik', covers({ category: 'it' }, { category: 'it', sub: 'pos' }), true);
eq('covers: yang spesifik tidak menutupi yang umum', covers({ category: 'it', sub: 'pos' }, { category: 'it' }), false);
eq('covers: kondisi berbeda tidak saling menutupi', covers({ category: 'it', kind: 'outlet' }, { category: 'it', kind: 'warehouse' }), false);
eq('aturan seed tidak ada yang tertutup', findShadowed(JSON.parse(JSON.stringify(c.rules.filter((r) => !['keluhan'].includes(r.id))))) && Object.keys(findShadowed(c.rules)).length, 0);

// ===== Reset
A.resetConfig();
eq('reset: aturan, tim, pengguna kembali ke bawaan', [c.rules.length, Object.keys(c.teams).includes(tid), c.users.some((u) => u.name === 'Pic Uji'), c.teams.it_area.members.some((m) => m.name === 'Tono Baru')], [31, false, false, false]);
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
