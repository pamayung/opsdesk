# Catatan perubahan UI/UX

## Struktur organisasi & routing berbasis lokasi
- Lokasi bertingkat (Head Office / Operations → Area → Outlet / Distribution Center → Warehouse, Fleet, Maintenance), bisa ditambah dari form.
- Routing memakai lokasi, kategori, subkategori, jenis, dan prioritas. Masalah yang sama dapat ke tim dan PIC berbeda menurut lokasi dan area.
- 8 department dengan tim di bawahnya (IT: Support Area, Helpdesk, Infrastructure, SAP, WMS; HR; GA & Facility termasuk vendor; Finance; Procurement; Legal; Security; Operations).

## Buat tiket
- Jenis: Insiden, Permintaan, Keluhan, Pertanyaan.
- Kategori → Subkategori → pertanyaan dinamis dengan validasi; jawaban tampil di detail tiket.
- Pemilih lokasi berkelompok per struktur organisasi; lokasi baru dipilih di bawah induk yang mana.
- Lokasi karyawan terisi otomatis; pelapor otomatis dari pengguna yang login.
- Routing Preview: lokasi & klasifikasi, department, tim (atau vendor), PIC area, jam kerja / on-call, SLA, dan eskalasi.

## Dashboard per peran
Karyawan, PIC, Manajer Department, dan Manajemen memiliki dashboard, menu, dan cakupan tiket masing-masing.
Tombol aksi (ambil, tugaskan, selesaikan, eskalasi) hanya untuk PIC dan manajer department.

## Detail tiket
Klasifikasi dan jawaban pertanyaan, jalur lokasi, Penanganan (department, tim, PIC), catatan & riwayat dengan foto, selesaikan tiket, eskalasi vendor, waktu respons.

## Laporan
Halaman `#/laporan` untuk semua peran (data mengikuti hak akses): periode + filter, enam KPI dengan perbandingan periode sebelumnya, tren, rincian per department/kategori/lokasi/prioritas/jenis,
umur tiket terbuka, kinerja tim dan PIC, tiket terlewat SLA, unduh CSV yang aman untuk Excel, dan tata letak cetak/PDF. Riwayat contoh 60 hari tersedia untuk demo.

## Halaman Admin
Khusus peran Administrator (menu Admin; URL langsung ditolak untuk peran lain). Lima tab: Lokasi, Department & Tim, Aturan Routing, Kategori & Pertanyaan, Pengguna & Peran.
- Perubahan langsung berlaku di routing, form, dan dashboard. Validasi mencegah data rusak (mis. tim yang masih dipakai aturan tidak bisa dihapus, pesannya menjelaskan alasannya).
- Aturan routing: urutkan naik/turun, peringatan aturan yang tak akan pernah dipakai, dan panel **Uji routing** (termasuk simulasi hari & jam).
- Hapus memakai konfirmasi dua langkah. "Kembalikan ke bawaan" tersedia untuk konfigurasi organisasi.

## Sebelumnya
- Service Catalog dan dropdown lokasi di header dihapus.
- Nama aplikasi OpsDesk; Bahasa Indonesia; ikon lucide.
