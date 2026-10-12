// Menguji kapan notifikasi berbunyi (detectAlert) dan perilaku modul suara (dibisukan, kunci audio, dua jenis nada).
import assert from 'node:assert/strict';
import { detectAlert } from '../src/domain/Alerts.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`GAGAL: ${name}\n${e.message}`); process.exitCode = 1; } };
const S = (o = {}) => ({ total: 10, active: 5, atRisk: 1, breached: 0, ...o });

test('pemuatan pertama (tanpa baseline) tidak berbunyi', () => assert.equal(detectAlert(null, S()), null));
test('tidak ada perubahan -> hening', () => assert.equal(detectAlert(S(), S()), null));
test('tiket baru -> nada lembut', () => assert.equal(detectAlert(S(), S({ total: 11, active: 6 })).kind, 'new'));
test('banyak tiket baru -> jumlah disebut', () => assert.match(detectAlert(S(), S({ total: 13 })).message, /^3 new tickets/));
test('at-risk naik -> nada mendesak', () => assert.equal(detectAlert(S(), S({ atRisk: 2 })).kind, 'urgent'));
test('melanggar SLA naik -> nada mendesak', () => assert.equal(detectAlert(S(), S({ breached: 1 })).kind, 'urgent'));
test('mendesak mengalahkan tiket baru bila terjadi bersamaan', () => assert.equal(detectAlert(S(), S({ total: 12, atRisk: 2 })).kind, 'urgent'));
test('angka turun (tiket selesai) tidak berbunyi', () => assert.equal(detectAlert(S(), S({ total: 9, active: 3, atRisk: 0 })), null));
test('at-risk turun sementara breached naik tetap mendesak', () => assert.equal(detectAlert(S({ atRisk: 2 }), S({ atRisk: 1, breached: 1 })).kind, 'urgent'));
test('tiket dibuka kembali (aktif naik, total sama) -> berbunyi', () => assert.equal(detectAlert(S({ active: 5 }), S({ active: 6 })).kind, 'new'));

// ---- modul suara dengan AudioContext palsu ----
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
const made = { osc: 0, state: 'running' };
class FakeCtx {
  constructor() { this.state = made.state; this.currentTime = 0; this.destination = {}; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createOscillator() { made.osc++; return { frequency: {}, connect: (x) => x, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (x) => x }; }
}
globalThis.window = { AudioContext: FakeCtx, addEventListener() {}, removeEventListener() {} };
const snd = await import('../src/app/sound.js');

test('suara aktif secara bawaan', () => assert.equal(snd.isSoundOn(), true));
test('nada lembut = 1 ketukan, mendesak = 3 ketukan', () => {
  made.osc = 0; assert.equal(snd.playAlert('new'), true); assert.equal(made.osc, 1);
  made.osc = 0; assert.equal(snd.playAlert('urgent'), true); assert.equal(made.osc, 3);
});
test('dibisukan -> tidak berbunyi dan pilihan tersimpan', () => {
  snd.setSoundOn(false); made.osc = 0;
  assert.equal(snd.isSoundOn(), false); assert.equal(snd.playAlert('urgent'), false); assert.equal(made.osc, 0);
  snd.setSoundOn(true); assert.equal(snd.isSoundOn(), true);
});
test('penyimpanan diblokir tidak membuat error', () => {
  const keep = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(snd.isSoundOn(), true); snd.setSoundOn(false); // tidak melempar
  globalThis.localStorage = keep;
});
console.log(`alerts.test.js: ${n} tes lulus`);
