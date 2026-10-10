# E2E browser (Playwright)

`browser.py` (+ `browser_admin.py`) menjalankan 81 pemeriksaan di Chromium: **frontend -> proxy Vite -> backend Go -> PostgreSQL**, tanpa mock.
Mencakup login/logout, Report Issue (routing preview, foto), daftar dengan filter/pencarian, isolasi antar-pengguna, alur PIC lengkap (take, assign,
catatan berfoto, eskalasi vendor, resolve), dashboard tiap peran, laporan + unduh CSV, seluruh tab admin (dan dampaknya ke routing tiket nyata),
**Reopen** (pelapor, manajer, PIC, management; SLA dari nol; batas 7 hari lewat tanggal mundur di database), lupa kata sandi lewat email worker, ganti kata sandi, sesi kedaluwarsa, dan layar mobile 390 px tanpa scroll horizontal.

## Prasyarat
1. Database ber-seed dengan akun demo (`make seed` lalu `DEV_PASSWORD='Rahasia123!' make devseed` di backend). **Database akan diubah**: pakai database uji.
2. Backend: `make run` (API, mis. `:8080`) dan `make worker` dengan `LOG_LEVEL=debug` dan `WORKER_OUTBOX_INTERVAL=1s` tanpa `SMTP_HOST`
   (email dicatat di log, dari situ tautan reset dibaca). Semua tim sebaiknya "always on" agar routing tidak bergantung jam uji.
3. Frontend: `VITE_PROXY_TARGET=http://localhost:8080 VITE_DEMO_PASSWORD='Rahasia123!' npm run dev`.
4. `psql` (untuk menggeser tanggal tiket pada uji batas 7 hari; `ADMIN_DB=postgres://...` bila bukan bawaan).
5. `pip install playwright && playwright install chromium`, dan sebuah foto PNG uji (bawaan `/tmp/e2e-photo.png`, atau `PHOTO=...`).

## Menjalankan
    WEB_URL=http://127.0.0.1:5173 API_URL=http://127.0.0.1:8080 WORKER_LOG=/path/worker.log PASSWORD='Rahasia123!' python3 tests/e2e/browser.py

Setiap putaran membuat data (tiket, kategori, tim, pengguna), jadi **reset database sebelum mengulang**.
