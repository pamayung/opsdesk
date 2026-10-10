import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = semua aset memakai path relatif, jadi hasil build bisa dihosting di mana saja. Routing memakai hash (#/...), tanpa rewrite server.
// API: di dev dan preview, /api diteruskan ke backend (VITE_PROXY_TARGET, bawaan http://localhost:8080) sehingga tanpa CORS.
// Untuk hosting terpisah dari API, isi VITE_API_URL saat build (mis. https://api.contoh.id) dan atur CORS_ORIGINS di backend.
const proxy = { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true } };
export default defineConfig({ base: './', plugins: [react()], server: { proxy }, preview: { proxy } });
