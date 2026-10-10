// DOMAIN: helper murni untuk aturan routing dan pertanyaan dinamis (dipakai halaman Admin).
import { REQUEST_TYPES } from './constants';

export const QUESTION_TYPES = { text: 'Teks', number: 'Angka', select: 'Pilihan', yesno: 'Ya / Tidak' };
export const DEFAULT_RULE_ID = 'default';
const list = (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

// Aturan `later` tidak akan pernah dipakai bila aturan `earlier` (lebih atas) sudah mencakup semua tiket yang cocok dengan `later`.
export const covers = (earlier, later) => ['category', 'sub', 'type', 'kind', 'priority'].every((k) => {
  const e = list(earlier[k]); if (e === undefined) return true; // aturan atas tidak membatasi kondisi ini
  const l = list(later[k]); if (l === undefined) return false; // aturan bawah lebih luas pada kondisi ini
  return l.every((x) => e.includes(x));
});
// { idAturan: idAturanYangMenutupi } untuk aturan yang tak akan pernah kena.
export const findShadowed = (rules) => {
  const out = {};
  rules.forEach((r, i) => { const by = rules.slice(0, i).find((e) => covers(e, r)); if (by) out[r.id] = by.id; });
  return out;
};
export const isRequestType = (t) => !!REQUEST_TYPES[t];
