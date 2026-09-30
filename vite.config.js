import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = semua aset memakai path relatif, jadi hasil build bisa dihosting di mana saja:
// https://<user>.github.io/<nama-repo>/, domain kustom, atau folder biasa. Routing memakai hash (#/...), tanpa rewrite server.
export default defineConfig({ base: './', plugins: [react()] });
