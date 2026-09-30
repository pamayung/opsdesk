// Menjalankan semua tes di tests/*.test.js. Tiap berkas di-bundle dengan esbuild (agar import tanpa ekstensi
// dan kode domain apa adanya bisa dijalankan di Node), lalu dieksekusi. Keluar dengan kode 1 bila ada yang gagal.
import { build } from 'esbuild';
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dir = resolve('tests');
const out = mkdtempSync(join(tmpdir(), 'opsdesk-tests-'));
const files = readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort();
let failed = 0;
for (const f of files) {
  const outfile = join(out, f.replace(/\.js$/, '.mjs'));
  await build({ entryPoints: [join(dir, f)], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
  console.log(`\n=== ${f}`);
  const r = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.error(`>>> GAGAL: ${f}`); }
}
rmSync(out, { recursive: true, force: true });
console.log(failed ? `\n${failed} berkas tes gagal.` : `\nSemua ${files.length} berkas tes lulus.`);
process.exit(failed ? 1 : 0);
