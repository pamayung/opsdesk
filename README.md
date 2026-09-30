# OpsDesk (multi-bisnis incident & ticket)

## Menjalankan
    npm install
    npm run dev

    npm test          # tes domain: routing, admin, laporan
    npm run build     # hasil di dist/

Proyek sudah lengkap (Vite + React 18 + Tailwind 3.4 terkunci + lucide-react untuk ikon). Jangan upgrade ke Tailwind v4
tanpa migrasi (v4 tidak memakai `@tailwind base;` dan `tailwind.config.js` seperti di sini).

## Deploy ke GitHub Pages
Sudah disiapkan: `.github/workflows/deploy.yml` menjalankan `npm ci`, `npm test`, `npm run build`, lalu mempublikasikan `dist/` ke GitHub Pages.
Pull request hanya menjalankan tes dan build (tanpa deploy).

1. Buat repository di GitHub (kosong, tanpa README), lalu dari folder proyek:

       git add -A
       git commit -m "OpsDesk"
       git branch -M main
       git remote add origin https://github.com/<user>/<repo>.git
       git push -u origin main

2. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (satu kali saja).
3. Buka tab **Actions**; setelah workflow "CI & Deploy" hijau, situs ada di `https://<user>.github.io/<repo>/`.
   Push berikutnya ke `main` otomatis memperbarui situs.

Catatan:
- `vite.config.js` memakai `base: './'` (path relatif), jadi tidak perlu mengubah apa pun untuk nama repo berbeda atau domain kustom
  (Settings → Pages → Custom domain). Routing memakai hash (`#/tiket/...`), jadi tautan langsung dan reload tetap bekerja tanpa konfigurasi server.
- GitHub Pages gratis untuk repository publik; untuk repository privat perlu paket berbayar GitHub.
- **Ini aplikasi demo sisi klien.** Data (tiket, konfigurasi admin, pengguna aktif) tersimpan di `localStorage` browser masing-masing pengunjung dan
  pemilih pengguna di menu profil memungkinkan siapa pun berganti ke peran Administrator. Jangan memasukkan data sungguhan di situs publik;
  untuk pemakaian nyata perlu backend dengan login (lihat "Yang belum ada").
- `localStorage` dibagi per *origin* (`<user>.github.io`), bukan per repo. Dua proyek dari akun yang sama di `github.io` akan berbagi kunci `opsdesk:*`.
  Pakai domain kustom atau bersihkan data situs bila bertabrakan.
- Font dimuat dari Google Fonts; tanpa koneksi ke sana tampilan memakai font sistem.

## Lima layer
Pengguna → **Jenis kebutuhan** → **Klasifikasi** → **Routing** → **Workflow**

1. **Jenis kebutuhan**: Insiden, Permintaan, Keluhan, Pertanyaan.
2. **Klasifikasi**: Kategori → Subkategori → pertanyaan dinamis (mis. POS: nomor terminal, gejala; Reimbursement: nominal).
   Jawaban wajib divalidasi dan tampil di detail tiket. Definisi ada di `src/config/catalog.js`.
3. **Routing**: Lokasi + Department + Aturan + Prioritas → Tim → PIC (`src/domain/Routing.js`, aturan di `src/config/routing.js`).
4. **Workflow**: penugasan PIC → SLA (respons & penyelesaian) → eskalasi otomatis → penyelesaian.

### Lokasi adalah parameter routing
Struktur lokasi bertingkat (`src/config/org.js`): Head Office, Operations → Area → Outlet, Distribution Center → Warehouse / Fleet / Maintenance.
Jenis lokasi (outlet / head_office / warehouse) diwarisi dari leluhur teratas, sehingga masalah yang sama bisa ke tim berbeda:

| Masalah | Outlet | Head Office | DC |
|---|---|---|---|
| Internet bermasalah | IT Support Area | IT Helpdesk | IT Infrastructure |

Anggota tim punya **cakupan area** (`scope`), sehingga PIC-nya pun berbeda: POS error di Senopati (Area 1) ke Kevin, di BSD (Area 2) ke Budi.
Lokasi baru bisa ditambahkan saat membuat tiket (dipilih di bawah induk mana) dan mewarisi jenis serta cakupan area induknya.

Aturan routing dicek dari atas ke bawah, yang pertama cocok menang. Kategori baru otomatis ke Service Desk (aturan `default`).
Di luar jam kerja tim dialihkan ke tim on-call (department pemilik tiket tidak berubah). Tim boleh eksternal (vendor).
Pratinjau di form dan tiket asli memakai mesin yang sama.

### Peran dan dashboard
Pengguna dan peran dikelola di halaman Admin (nilai awal di `src/config/users.js`). Pilih pengguna dari menu profil (demo) untuk melihat tiap peran.

| Peran | Melihat | Dashboard |
|---|---|---|
| Karyawan | tiket yang ia laporkan | Terbuka / Sedang ditangani / Selesai |
| PIC | tiket tim-nya atau yang ditugaskan | Kritis / Tinggi / Sedang / Rendah + antrean saya |
| Manajer Department | semua tiket department-nya | Terbuka, SLA terlewat, Kritis, rata-rata penyelesaian, antrean per tim |
| Manajemen | seluruh organisasi (hanya lihat) | Total, Terbuka, SLA terlewat, Selesai, tiket per department |
| Administrator | seluruh organisasi (hanya lihat) + halaman Admin | Sama dengan Manajemen |

Aturan akses ada di `src/domain/Access.js`. Hanya PIC dan manajer department yang bisa menugaskan, menyelesaikan, dan mengeskalasi tiket.
Tiket di luar akses tidak bisa dibuka meski lewat tautan langsung.

## Halaman
| Rute | Halaman |
|---|---|
| `#/` | Dashboard sesuai peran |
| `#/tiket` | Antrean (pencarian, status, kategori, perlu perhatian SLA, PIC, dan department untuk manajemen) |
| `#/laporan` | Laporan (lihat bagian di bawah) |
| `#/tiket/TCK-1042` | Detail: Assignment (department, tim, PIC), catatan & riwayat, selesaikan tiket, waktu respons |
| `#/buat` | Buat tiket dengan Routing Preview |

Eskalasi SLA otomatis (dihitung dan ditandai): L1 bila belum direspons melewati target, L2 bila sisa SLA di bawah 25%.
Pelapor otomatis memakai pengguna yang login; isi manual hanya lewat "Lapor atas nama orang lain".

## Laporan (`#/laporan`)
Tersedia untuk semua peran, isinya otomatis dibatasi hak akses (karyawan: tiketnya sendiri, PIC: tim-nya, manajer: department-nya, manajemen dan admin: semuanya).

- **Periode** (hari ini, 7, 30, 90 hari, atau kustom; hari dihitung dalam WIB) dan **filter**: department (manajemen/admin), lokasi (memilih lokasi induk mencakup turunannya), kategori, prioritas, jenis.
- **KPI**: tiket masuk, selesai, masih terbuka, kepatuhan SLA, rata-rata respons, rata-rata penyelesaian, masing-masing dibandingkan dengan periode sebelumnya
  (perbandingan disembunyikan bila periode sebelumnya punya kurang dari 5 tiket agar tidak menyesatkan).
- **Tren** masuk vs selesai (harian, atau mingguan untuk periode di atas 31 hari), rincian per department / kategori / lokasi / prioritas / jenis,
  **umur tiket terbuka**, **kinerja tim**, **beban dan kinerja PIC**, dan daftar **tiket terlewat SLA** yang paling lama.
- **Download CSV** (17 kolom, UTF-8 dengan BOM agar terbaca benar di Excel; teks berawalan `=`, `+`, `-`, `@` dinetralkan agar tidak dieksekusi sebagai rumus) dan **Print / PDF** (tata letak cetak menyembunyikan menu dan filter).
- Definisi: "masuk" = tiket dibuat pada periode; "selesai" pada KPI = dari tiket masuk itu; pada grafik tren, selesai dihitung menurut tanggal penyelesaian.
  "Terlewat SLA" = tiket aktif yang sudah lewat batas, atau tiket selesai yang ditutup setelah batas.
- Perhitungan ada di `src/domain/Report.js` (murni dan diuji dengan angka hitungan tangan).
- **Data contoh**: seed berisi 130 tiket riwayat 60 hari (deterministik) agar tren dan perbandingan periode terlihat. Di browser yang sudah punya data lama,
  administrator bisa memuatnya dari halaman Admin lewat "Add sample data" (aman diklik berulang).

## Halaman Admin (`#/admin/...`, khusus Administrator)
Konfigurasi dikelola dari UI, disimpan di browser, dan langsung dipakai mesin routing, form, dan dashboard.

| Tab | Isi |
|---|---|
| Lokasi | pohon lokasi: tambah, ubah nama, pindah induk, hapus. Mengganti nama ikut memperbarui tiketnya |
| Departments & Teams | department (kepala), tim (ketua, tim on-call, eksternal, jam kerja per hari), anggota (ketersediaan, cakupan area) |
| Routing Rules | tambah, ubah, urutkan, hapus aturan; peringatan aturan yang tak akan pernah dipakai; **Test routing** (bisa simulasi hari & jam) |
| Kategori & Pertanyaan | kategori, subkategori, dan editor pertanyaan dinamis (teks, angka, pilihan, ya/tidak, wajib) |
| Users & Roles | tambah, ubah peran, hapus pengguna |

Validasi ada di `src/domain/Admin.js` (bukan di UI): nama unik, referensi harus ada, dan sesuatu yang masih dipakai tidak boleh dihapus
(lokasi yang punya turunan / tiket, tim yang dipakai aturan atau tim on-call atau PIC, kategori yang punya tiket, dst.).
Aturan bawaan (`default`, semua tiket lainnya) selalu paling bawah dan tidak bisa dihapus. Administrator terakhir tidak bisa dihapus atau diturunkan.
Perubahan hanya berlaku untuk tiket baru; tiket yang sudah ada tidak dirutekan ulang.
"Reset to default" mengembalikan department, tim, aturan, katalog, dan pengguna ke nilai di `src/config/*` (lokasi dan kategori tidak berubah).

## Yang belum ada
- Notifikasi (push / email / WhatsApp) dan login sungguhan: butuh backend. Peran dan seluruh konfigurasi admin saat ini tersimpan di sisi browser,
  jadi hanya berlaku di browser itu. Untuk dipakai bersama, konfigurasi perlu dipindah ke server (`ConfigRepository` sudah dipisahkan untuk itu)
  dan halaman Admin perlu autentikasi sungguhan.
- Laporan dihitung di browser dari data lokal; untuk data besar (ribuan tiket) agregasi perlu pindah ke server. Grafik dibuat dengan SVG sendiri (tanpa pustaka).
- Pengaturan target SLA per prioritas belum bisa diubah dari Admin (masih di `src/domain/constants.js`).
- Nama pengguna dan anggota tim tidak bisa diubah setelah dibuat (riwayat tiket menautkan lewat nama).
- Status tiket: Baru → Sedang Ditangani → Selesai.

## Istilah di UI (glosarium)
Aturannya: **istilah domain memakai English** (yang lazim di ITSM dan sudah dipahami pengguna), sedangkan **kata sehari-hari tetap Indonesian**
(tiket, lokasi, kategori, nama, judul, foto, catatan, dst.). Kalimat penjelas tetap berbahasa Indonesia.

| Konteks | Sebelumnya | Sekarang |
|---|---|---|
| Status | Baru / Sedang Ditangani / Selesai | Open / In Progress / Resolved |
| Prioritas | Kritis / Tinggi / Sedang / Rendah | Critical / High / Medium / Low |
| Jenis kebutuhan | Insiden / Permintaan / Keluhan / Pertanyaan | Incident / Request / Complaint / Question |
| Peran | Karyawan / Manajer Department / Manajemen | Employee / Department Manager / Management |
| Menu | Ringkasan / Antrean Saya / Tiket Saya / Antrean Department / Semua Tiket / Laporan / Buat Tiket | Dashboard / My Queue / My Tickets / Department Queue / All Tickets / Reports / Report Issue |
| Dashboard | Perlu perhatian / Kepatuhan SLA / SLA terlewat / Rata-rata penyelesaian / Antrean per tim | Needs attention / SLA compliance / SLA breached / Average resolution / Queue per team |
| Aksi | Ambil Tiket / Tugaskan / Ganti PIC / Selesaikan Tiket / Eskalasi ke vendor | Take Ticket / Assign / Change PIC / Resolve Ticket / Escalate to vendor |
| Antrean | Aktif / Semua PIC / Milik saya / Belum diambil / Perlu perhatian SLA | Active / All PIC / Mine / Unassigned / SLA attention |
| Detail tiket | Penanganan / Waktu Respons | Assignment / Response time |
| Admin | Aturan Routing / Department & Tim / Pengguna & Peran / Kembalikan ke bawaan | Routing Rules / Departments & Teams / Users & Roles / Reset to default |
| Umum | tim, anggota, ketua tim, jam kerja, cakupan area, pengguna, aturan | team, member, team lead, working hours, area scope, user, rule |

Di mana mengubahnya: status, prioritas, jenis kebutuhan, dan label SLA ada di `src/domain/constants.js`; peran di `src/config/users.js`;
menu di `src/presentation/layout/AppShell.jsx`; nama kategori bawaan di `src/config/defaults.js`.
`tests/terminology.test.js` (bagian dari `npm test` dan CI) gagal bila istilah Indonesian di atas muncul lagi di teks UI; tambahkan atau
hapus kata di daftar `BANNED` bila kamus Anda berbeda.

Data yang sudah tersimpan di browser: teks bawaan versi lama diperbarui otomatis saat dibuka, **hanya bila persis sama** dengan nilai bawaan lama
(yang sudah Anda ubah lewat Admin tidak ditimpa). Slug URL lama (`#/admin/aturan`, `#/admin/tim`, dst.) tetap dikenali.

## Tes
`npm test` menjalankan tes domain di `tests/` (routing dan akses per peran, validasi admin, perhitungan laporan, migrasi data lama, struktur tab admin, dan konsistensi istilah UI). Tes ini juga dijalankan di CI sebelum deploy.

## Arsitektur
domain (entity + usecase, JS murni) <- data (repository) <- app (DI + context) <- presentation (React class)

- Konfigurasi bawaan (nilai awal): `defaults.js` (nama, kategori), `org.js` (lokasi), `catalog.js` (subkategori & pertanyaan), `routing.js` (department, tim, aturan), `users.js` (pengguna). Setelah admin mengubahnya, yang dipakai adalah salinan di penyimpanan browser.
- Kategori dan lokasi baru otomatis tersimpan saat membuat tiket.
- `src/config/workspaces.js` adalah konfigurasi multi-bisnis awal yang belum dipakai UI.
- Entitas `Ticket` immutable: setiap use case menyimpan salinan baru lewat `ticket.with({...})`.
- Penamaan lama dipertahankan demi kompatibilitas data: `ticket.branch` = nama lokasi, `ticket.location` = area di dalam lokasi.
- Ganti backend: buat `ApiTicketRepository` (list/find/nextId/add/save), ganti di `src/app/container.js`.
- Data di `localStorage` (`opsdesk:tickets:v5`, `opsdesk:locations:v3`, `opsdesk:categories:v3`, `opsdesk:config:v1`, `opsdesk:user`). Data lama (tiket v2–v4, lokasi v1) dimigrasikan otomatis,
  dan routing tiket lama dihitung ulang. Foto diperkecil (maks. 960 px) sebelum disimpan.
