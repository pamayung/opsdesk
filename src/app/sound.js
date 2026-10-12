// APP: bunyi notifikasi lewat Web Audio (tanpa berkas audio). Browser menolak suara sebelum ada interaksi pengguna,
// jadi AudioContext dibuat/di-resume pada klik/ketukan/tombol pertama (`armSound`). Pilihan bisukan disimpan per browser.
const KEY = 'opsdesk.sound';
let ctx = null;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const isSoundOn = () => read() !== 'off';
export const setSoundOn = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* penyimpanan diblokir: preferensi tidak tersimpan */ } };

const AC = () => (typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null);
function ensure() {
  const C = AC(); if (!C) return null;
  if (!ctx) { try { ctx = new C(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// Pasang sekali: membuka kunci audio pada interaksi pertama pengguna.
export function armSound() {
  const unlock = () => { ensure(); ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, unlock)); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
}

const NOTES = { new: [[880, 0]], urgent: [[988, 0], [740, 0.17], [988, 0.34]] };
// Memainkan nada; mengembalikan true bila benar-benar dibunyikan (false: dibisukan / audio belum terbuka / tak didukung).
export function playAlert(kind = 'new') {
  if (!isSoundOn()) return false;
  const c = ensure(); if (!c || c.state !== 'running') return false;
  const t0 = c.currentTime + 0.01;
  for (const [freq, at] of NOTES[kind] || NOTES.new) {
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.28);
    o.connect(g).connect(c.destination); o.start(t0 + at); o.stop(t0 + at + 0.3);
  }
  return true;
}
