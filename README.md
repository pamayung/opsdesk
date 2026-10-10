# OpsDesk (multi-bisnis incident & ticket)

Frontend React yang tersambung ke **OpsDesk API** (backend Go + PostgreSQL, proyek terpisah `opsdesk-backend`). Login sungguhan, data di server,
routing, SLA, hak akses, dan laporan dihitung server. Browser tidak lagi menyimpan atau menghitung data bisnis apa pun.

## Menjalankan
Butuh backend yang berjalan (lihat README `opsdesk-backend`: `make seed`, `make devseed`, `make run`, dan `make worker` untuk email).

    npm install
    cp .env.example .env     # lihat bagian "Konfigurasi"
    npm run dev              # http://localhost:5173, /api diteruskan ke backend (proxy), tanpa CORS

    npm test                 # tes unit: mapper (dengan respons nyata server), terminologi UI, struktur tab admin
    npm run build            # hasil di dist/

Proyek memakai Vite + React 18 + Tailwind 3.4 terkunci + lucide-react. Jangan upgrade ke Tailwind v4 tanpa migrasi
(v4 tidak memakai `@tailwind base;` dan `tailwind.config.js` seperti di sini).

### Konfigurasi (`.env`, semuanya opsional)
| Variabel | Fungsi |
|---|---|
| `VITE_PROXY_TARGET` | Tujuan proxy `/api` saat `npm run dev`/`preview` (bawaan `http://localhost:8080`) |
| `VITE_API_URL` | URL API untuk build yang di-host terpisah dari API, mis. `https://api.contoh.id`. Kosong = origin yang sama. Backend harus mengizinkan origin frontend lewat `CORS_ORIGINS` |
| `VITE_DEMO_PASSWORD` | **Hanya development.** Bila diisi, halaman login menampilkan tombol isi-cepat untuk akun seed memakai kata sandi ini. Jangan diisi di production |

## Arsitektur
```
presentation (halaman React, kelas)  ->  app/container.js  ->  data/ApiStore + ApiAdminService  ->  src/api (klien bertipe)  ->  backend
                                              |                          |
                                       domain (Ticket, Rules,     mappers.js: API <-> bentuk data antarmuka
                                       Location, constants)       (murni, diuji dengan respons nyata)
```
- **Sumber kebenaran adalah server.** Tiket yang terlihat (RLS di database), routing, tenggat dan level SLA, izin aksi (`permissions`), laporan, dan
  statistik dashboard datang dari API. Klien hanya menghitung hitung-mundur dari tenggat server (`dueAt`) dan kebijakan SLA yang berlaku.
- **`data/ApiStore.js`** menyimpan data *konfigurasi* (lokasi, katalog, department, kebijakan SLA, dan untuk admin: tim, aturan, pengguna) agar render tetap
  sinkron. Data *tiket* tidak disimpan: tiap halaman memintanya ke server dengan filter dan paginasi.
- **ID**: antarmuka memakai slug (`it`, `it_area`, `pos`) dan nama; API memakai ID numerik. `mappers.js` menerjemahkannya (`catNum`, `deptNum`, dst.).
- **`src/api/`** adalah hasil build klien TypeScript dari `opsdesk-backend/client` (dibangkitkan dari OpenAPI). Setelah API berubah: di backend
  `make openapi` dan `make client`, lalu salin `client/dist/{index,client,generated}.js` ke `src/api/`.
- **Sesi**: access token berumur pendek + refresh token yang dirotasi, disimpan di `localStorage` (`opsdesk:session`). Perpanjangan otomatis, satu penerbangan
  per tab dan dikunci antar-tab (Web Locks). Bila tak bisa diperpanjang, aplikasi kembali ke login dengan pesan.
- **Teks sistem di riwayat tiket** dibuat database dalam bahasa Indonesia; `data/eventText.js` menerjemahkan polanya yang tetap ke English agar konsisten dengan istilah UI.

## Lima layer
Pengguna → **Jenis kebutuhan** → **Klasifikasi** → **Routing** → **Workflow**

1. **Jenis kebutuhan**: Incident, Request, Complaint, Question.
2. **Klasifikasi**: Kategori → Subkategori → pertanyaan dinamis (mis. POS: nomor terminal, gejala). Jawaban wajib divalidasi server dan tampil di detail tiket.
3. **Routing** (di server): Lokasi + Department + Aturan + Prioritas → Tim → PIC. Jenis lokasi (outlet / head_office / warehouse) diwarisi dari leluhur teratas,
   sehingga masalah yang sama bisa ke tim berbeda. Anggota tim punya **cakupan area**, sehingga PIC-nya pun berbeda (POS di Senopati ke Kevin, di BSD ke Budi).
   Di luar jam kerja tim dialihkan ke tim on-call; tim boleh eksternal (vendor). Pratinjau di form dan tiket asli memakai fungsi database yang sama.
4. **Workflow**: penugasan PIC → SLA (respons & penyelesaian) → eskalasi otomatis → penyelesaian. Eskalasi L1 bila belum direspons melewati target,
   L2 bila sisa SLA di bawah rasio kebijakan (bawaan 25%).

### Peran dan dashboard
| Peran | Melihat | Dashboard |
|---|---|---|
| Employee | tiket yang ia laporkan (boleh Reopen tiketnya) | Open / In progress / Resolved |
| PIC | tiket tim-nya atau yang ditugaskan | P1-P4 + antrean saya |
| Department Manager | semua tiket department-nya (boleh Reopen) | Open, SLA breached, Critical, rata-rata penyelesaian, antrean per tim |
| Management | seluruh organisasi (hanya lihat) | Total, Open, SLA breached, Resolved, tiket aktif per department |
| Administrator | seluruh organisasi (hanya lihat) + halaman Admin | Sama dengan Management |

Hak lihat ditegakkan database (Row Level Security): tiket di luar akses tidak bisa dibuka meski lewat tautan langsung. Hanya PIC dan manajer department
yang bisa menugaskan, menyelesaikan, dan mengeskalasi (tombol mengikuti `permissions` dari server).

## Halaman
| Rute | Halaman |
|---|---|
| `#/` | Dashboard sesuai peran |
| `#/tiket` | Daftar tiket: pencarian, status, kategori, SLA attention, PIC, department. Disaring dan diurutkan di server, 20 per halaman, diperbarui tiap 15 detik |
| `#/tiket/TCK-0042` | Detail: Assignment, catatan & riwayat (foto), resolve, eskalasi vendor, waktu respons, **Reopen** untuk tiket Resolved |
| `#/buat` | Report Issue dengan Routing Preview dari server |
| `#/laporan` | Laporan |
| `#/admin/...` | Admin (khusus Administrator) |
| `#/akun` | Ganti kata sandi |
| `#/reset-password?token=...` | Tujuan tautan di email "lupa kata sandi" |

Login memiliki tautan **Lupa kata sandi?** (email berisi tautan sekali pakai, berlaku 30 menit).

### Reopen
Tiket Resolved yang masalahnya muncul lagi bisa **dibuka kembali** dari halaman detail (tombol *Reopen ticket*, alasan wajib). Hanya **pelapor** dan **manajer department**,
maksimal **7 hari** sejak Resolved; PIC, management, dan admin tidak melihat tombolnya. **SLA mulai dari nol**: penghitung mundur, respons, dan resolusi dihitung dari saat
dibuka kembali. Tiket diberi lencana *Reopened ×N* di daftar dan detail, dan PIC terakhir mendapat email. Bila 7 hari sudah lewat, pelapor/manajer melihat penjelasannya
(bukan tombol yang mati). Semua keputusan (izin, batas waktu, status baru) ada di server; klien hanya menampilkan `permissions.can_reopen` dan `reopen_until`.
Laporan menambah KPI *Reopened* (persen tiket yang pernah Resolved lalu dibuka kembali) dan kolom Reopened pada tabel tim dan PIC.

### Foto
Foto dikompres di browser (maks. 960 px, JPEG; metadata EXIF ikut hilang) lalu diunggah ke server, yang memeriksa isinya. Tautan foto bertanda tangan berumur
15 menit; halaman detail memuat ulang tiap menit sehingga tautan selalu segar. Pada Report Issue, foto menyusul sebagai catatan pertama setelah tiket dibuat
(kegagalannya tidak membatalkan tiket; pengguna diberi tahu). Form memakai **Idempotency-Key**: mengirim ulang setelah jaringan putus tidak membuat tiket ganda.

## Laporan (`#/laporan`)
Dihitung server dan otomatis dibatasi hak akses. **Periode** (hari ini, 7, 30, 90 hari, atau kustom; hari dihitung WIB) dan **filter** department
(management/admin), lokasi (induk mencakup turunannya), kategori, priority, type. **KPI** dibandingkan dengan periode sebelumnya (disembunyikan bila periode
sebelumnya kurang dari 5 tiket), **tren**, rincian, **umur tiket terbuka**, **kinerja tim** dan **PIC**, dan **10 tiket yang paling lama melewati SLA**.
**Download CSV** diunduh dari server (UTF-8 BOM; teks berawalan `=`, `+`, `-`, `@` dinetralkan agar tidak dieksekusi sebagai rumus).

## Halaman Admin (`#/admin/...`)
Semua perubahan disimpan di server dan langsung dipakai routing, form, dan dashboard (hanya untuk tiket baru).

| Tab | Isi |
|---|---|
| Lokasi | pohon lokasi: tambah, ubah nama, pindah induk, hapus (ditolak server bila masih dipakai tiket) |
| Departments & Teams | department (kepala), tim (lead, on-call, eksternal, jam kerja), member (ketersediaan, cakupan area). Kepala, lead, dan member dipilih dari pengguna terdaftar |
| Routing Rules | tambah, ubah, urutkan, hapus; peringatan aturan yang tak akan pernah dipakai; **Test routing** (server; bisa simulasi hari & jam) |
| Kategori & Pertanyaan | kategori, subkategori, dan editor pertanyaan dinamis |
| Users & Roles | tambah (email, kata sandi awal), ubah peran/jabatan/tim, set kata sandi, nonaktifkan |

"Hapus" pada kategori, subkategori, department, tim, dan pengguna berarti **nonaktifkan** (riwayat tiket tetap utuh). Aturan `default` selalu paling bawah.

## Perbedaan dari prototype lama (yang berjalan di localStorage)
- Lokasi dan kategori baru **tidak bisa dibuat saat membuat tiket**; hanya Administrator yang menambahkannya (Report Issue memberi tahu bila nama tidak terdaftar).
- Pengguna dipilih lewat **login**, bukan menu pengalih peran. Nama member tim tidak lagi diketik bebas: dipilih dari akun yang ada.
- Jenis lokasi utama tidak bisa diubah setelah dibuat. Jumlah tiket per lokasi/kategori di Admin, "Reset to default", dan "Add sample data" dihapus.
- Peran pelapor ("on behalf of") digabung ke nama pelapor, mis. `Budi (Kasir)`.
- Daftar tiket di dashboard manager/management menampilkan tiket yang butuh perhatian SLA (bukan semua tiket aktif); antrean per tim hanya memuat tim yang punya tiket aktif.

## Pengujian
- `npm test`: **mapper** diuji dengan respons nyata server (`tests/fixtures`, dibuat ulang dengan `node tests/capture-fixtures.mjs` terhadap server berjalan), termasuk
  kesetaraan perhitungan SLA klien vs server; **terminologi** (istilah domain yang sudah English tidak boleh muncul lagi di teks UI); **struktur tab admin**.
- E2E browser (Playwright, 81 pemeriksaan) terhadap backend sungguhan: lihat [`tests/e2e/README.md`](tests/e2e/README.md).
- Logika bisnis (routing, SLA, laporan, izin, konkurensi) diuji di backend (`opsdesk-backend`), bukan diduplikasi di sini.

## Deploy
Build statis (`npm run build` -> `dist/`) bisa dihosting di mana saja. Karena aplikasi memerlukan API:
- **Satu domain** (reverse proxy meneruskan `/api` ke backend): tak perlu konfigurasi tambahan.
- **Domain terpisah** (mis. GitHub Pages + API di server lain): isi `VITE_API_URL` saat build dan tambahkan origin frontend ke `CORS_ORIGINS` di backend.
  `.github/workflows/deploy.yml` membaca repository *variable* `VITE_API_URL` (Settings > Secrets and variables > Actions > Variables).
- Hash routing (`#/...`): tanpa rewrite server. Font dimuat dari Google Fonts; tanpa koneksi ke sana tampilan memakai font sistem.

## Yang belum ada
- Notifikasi di dalam aplikasi (hanya email lewat worker backend), WhatsApp, SSO/MFA.
- Mengubah judul/prioritas, pembatalan, status Waiting/Closed, jeda SLA.
- Unduh lampiran non-foto; hapus atau ganti lampiran.
- Daftar pengguna admin belum berpaginasi/pencarian (cukup untuk ratusan pengguna).
- Mode offline/PWA.
