// Tes migrasi data lama di penyimpanan browser: teks bawaan versi Indonesia diperbarui ke istilah sekarang,
// tetapi nilai yang sudah diubah admin TIDAK boleh tertimpa.
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const { default: CategoryRepository } = await import('../src/data/CategoryRepository.js');
const { default: ConfigRepository } = await import('../src/data/ConfigRepository.js');
const { DEFAULT_CATEGORIES } = await import('../src/config/defaults.js');
const { DEPARTMENTS, TEAMS, ROUTING_RULES } = await import('../src/config/routing.js');
const { SUBCATEGORIES } = await import('../src/config/catalog.js');
const { USERS } = await import('../src/config/users.js');

let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`); };
const name = (repo, id) => repo.list().find((c) => c.id === id).name;

// ===== Kategori
store['opsdesk:categories:v3'] = JSON.stringify({ items: [
  { id: 'stok', name: 'Stok & Persediaan' }, { id: 'keamanan', name: 'Keamanan & Keselamatan' }, { id: 'hr', name: 'HR & Kepegawaian' },
  { id: 'pengadaan', name: 'Pengadaan' }, { id: 'keuangan', name: 'Keuangan Grup' }, { id: 'peralatan', name: 'Peralatan & Mesin' }, { id: 'cat_x', name: 'Stok & Persediaan' },
] });
let cats = new CategoryRepository(DEFAULT_CATEGORIES);
eq('kategori bawaan lama diperbarui: stok', name(cats, 'stok'), 'Stock & Inventory');
eq('kategori bawaan lama diperbarui: keamanan, hr, pengadaan', [name(cats, 'keamanan'), name(cats, 'hr'), name(cats, 'pengadaan')], ['Security & Safety', 'HR', 'Procurement']);
eq('nama yang sudah diubah admin TIDAK ditimpa (Keuangan Grup)', name(cats, 'keuangan'), 'Keuangan Grup');
eq('nama yang memang tidak berubah tetap', name(cats, 'peralatan'), 'Peralatan & Mesin');
eq('kategori buatan pengguna (id lain) dengan nama sama tidak disentuh', name(cats, 'cat_x'), 'Stok & Persediaan');
eq('urutan & jumlah kategori tidak berubah', cats.list().length, 7);
// v2 (array lama) juga diperbarui + kategori bawaan baru digabung
delete store['opsdesk:categories:v3'];
store['opsdesk:categories:v2'] = JSON.stringify([{ id: 'stok', name: 'Stok & Persediaan' }, { id: 'it', name: 'Komputer & Jaringan' }]);
cats = new CategoryRepository(DEFAULT_CATEGORIES);
eq('migrasi v2: nama diperbarui dan kategori bawaan baru ditambahkan', [name(cats, 'stok'), cats.list().some((c) => c.id === 'legal')], ['Stock & Inventory', true]);
// instalasi baru memakai nama bawaan sekarang
delete store['opsdesk:categories:v2'];
eq('instalasi baru: nama bawaan sekarang', name(new CategoryRepository(DEFAULT_CATEGORIES), 'stok'), 'Stock & Inventory');

// ===== Konfigurasi organisasi
const defaults = { departments: DEPARTMENTS, teams: TEAMS, rules: ROUTING_RULES, catalog: SUBCATEGORIES, users: USERS };
const legacy = JSON.parse(JSON.stringify(defaults));
legacy.teams.vendor_ac.name = 'Vendor AC & Pendingin';
legacy.teams.it_area.name = 'Vendor AC & Pendingin Khusus';       // dimodifikasi admin: mengandung teks lama tetapi tidak persis sama
legacy.users.find((u) => u.id === 'andri').title = 'Kepala IT';
legacy.users.find((u) => u.id === 'sari').title = 'Admin Sistem';
legacy.users.find((u) => u.id === 'kevin').title = 'Kepala IT Senior';   // diubah admin
legacy.catalog.stok[0].name = 'Stok & persediaan';
legacy.catalog.utilitas[0].name = 'AC & pendingin';
legacy.catalog.keamanan[1].name = 'Insiden keamanan';
legacy.catalog.it[2].questions[1].placeholder = 'Opsional';
legacy.rules.find((r) => r.id === 'it-pos').team = 'it_area';    // nilai non-teks tidak berubah
store['opsdesk:config:v1'] = JSON.stringify(legacy);
const doc = new ConfigRepository(defaults).doc();
eq('konfigurasi: nama tim bawaan lama diperbarui', doc.teams.vendor_ac.name, 'Vendor AC & Cooling');
eq('konfigurasi: judul pengguna diperbarui', [doc.users.find((u) => u.id === 'andri').title, doc.users.find((u) => u.id === 'sari').title], ['Head of IT', 'System Admin']);
eq('konfigurasi: nama subkategori & placeholder diperbarui', [doc.catalog.stok[0].name, doc.catalog.utilitas[0].name, doc.catalog.keamanan[1].name, doc.catalog.it[2].questions[1].placeholder], ['Stock & inventory', 'AC & cooling', 'Security incident', 'Optional']);
eq('konfigurasi: nilai yang diubah admin TIDAK ditimpa', [doc.teams.it_area.name, doc.users.find((u) => u.id === 'kevin').title], ['Vendor AC & Pendingin Khusus', 'Kepala IT Senior']);
eq('konfigurasi: struktur & nilai non-teks utuh (aturan, jam kerja, ketersediaan, cakupan)', [doc.rules.length, doc.rules.find((r) => r.id === 'it-pos').team, doc.teams.it_area.hours.days.length, doc.teams.ga_engineering.members[1].available, doc.teams.it_area.members[0].scope], [ROUTING_RULES.length, 'it_area', 7, false, ['area-1']]);
delete store['opsdesk:config:v1']; // instalasi baru: belum ada apa pun di penyimpanan
eq('konfigurasi: dokumen bawaan (instalasi baru) tanpa teks Indonesia lama', JSON.stringify(new ConfigRepository(defaults).load()).includes('Pendingin'), false);
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
