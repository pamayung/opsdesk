// Penjaga struktur halaman Admin: setiap tab harus punya komponen dan slug lama tetap dikenali.
// (Sebelumnya mengganti id tab tanpa mengganti peta komponen membuat empat tab menjadi halaman kosong.)
import { TABS, BODIES, ALIAS, resolveTab } from '../src/presentation/pages/AdminPage.jsx';

let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`); };

eq('semua id tab punya komponen (bukan undefined)', TABS.filter(([id]) => typeof BODIES[id] !== 'function').map(([id]) => id), []);
eq('tidak ada komponen yatim tanpa tab', Object.keys(BODIES).filter((id) => !TABS.some((t) => t[0] === id)), []);
eq('id tab unik', new Set(TABS.map((t) => t[0])).size, TABS.length);
eq('slug lama (Indonesia) diarahkan ke tab yang benar', Object.entries(ALIAS).map(([old, now]) => [old, resolveTab(old), now]).filter(([, got, want]) => got !== want), []);
eq('alias menunjuk ke tab yang ada', Object.values(ALIAS).filter((id) => !BODIES[id]), []);
eq('slug tidak dikenal / kosong jatuh ke tab pertama (lokasi)', [resolveTab('xyz'), resolveTab(undefined), resolveTab('')], ['lokasi', 'lokasi', 'lokasi']);
eq('setiap tab punya label dan deskripsi', TABS.filter(([, label, desc]) => !label || !desc).length, 0);
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
