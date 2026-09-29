# OpsDesk (multi-bisnis incident & ticket)

## Menjalankan
    npm install
    npm run dev

Proyek sudah lengkap (Vite + React 18 + Tailwind 3.4 terkunci). Jangan upgrade ke Tailwind v4 tanpa migrasi
(v4 tidak memakai `@tailwind base;` dan `tailwind.config.js` seperti di sini).

## Arsitektur
domain (entity + usecase, JS murni) <- data (repository) <- app (DI + context) <- presentation (React class)

- Kategori awal ada di `src/config/defaults.js`; kategori baru otomatis tersimpan saat melapor.
- Ganti backend: buat `ApiTicketRepository` (list/add/save), ganti di `src/app/container.js`.
