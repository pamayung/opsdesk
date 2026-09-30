// DATA: konfigurasi organisasi yang bisa diubah admin: department, tim (anggota, jam kerja, cakupan area),
// aturan routing, katalog (subkategori & pertanyaan), dan pengguna. Nilai awal berasal dari src/config/*.
// Dokumen diperlakukan immutable: ubah lewat salinan, lalu save().
const clone = (x) => JSON.parse(JSON.stringify(x));

// Teks bawaan versi sebelumnya (Indonesia) -> sekarang. Hanya nilai yang PERSIS sama yang diganti,
// jadi teks yang sudah diubah admin tidak tersentuh.
const LEGACY_TEXT = {
  'Vendor AC & Pendingin': 'Vendor AC & Cooling', 'Kepala IT': 'Head of IT', 'Admin Sistem': 'System Admin',
  'Stok & persediaan': 'Stock & inventory', 'AC & pendingin': 'AC & cooling', 'Insiden keamanan': 'Security incident', Opsional: 'Optional',
};
const migrate = (v) => {
  if (typeof v === 'string') return LEGACY_TEXT[v] || v;
  if (Array.isArray(v)) return v.map(migrate);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, migrate(x)]));
  return v;
};

export default class LocalConfigRepository {
  constructor(defaults) { this.defaults = defaults; this.key = 'opsdesk:config:v1'; this.cache = this.load(); }
  load() {
    try { const raw = JSON.parse(localStorage.getItem(this.key)); if (raw && raw.teams && raw.rules) return migrate(raw); } catch (e) { /* abaikan */ }
    return clone(this.defaults);
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.cache)); } catch (e) { /* abaikan */ } }
  doc() { return this.cache; }
  save(doc) { this.cache = doc; this.persist(); return doc; }
  reset() { this.cache = clone(this.defaults); this.persist(); return this.cache; }
  // Pembaca praktis untuk mesin routing & UI.
  departments() { return this.cache.departments; }
  teams() { return this.cache.teams; }
  rules() { return this.cache.rules; }
  catalog() { return this.cache.catalog; }
  users() { return this.cache.users; }
}
