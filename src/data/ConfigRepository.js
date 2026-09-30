// DATA: konfigurasi organisasi yang bisa diubah admin: department, tim (anggota, jam kerja, cakupan area),
// aturan routing, katalog (subkategori & pertanyaan), dan pengguna. Nilai awal berasal dari src/config/*.
// Dokumen diperlakukan immutable: ubah lewat salinan, lalu save().
const clone = (x) => JSON.parse(JSON.stringify(x));

export default class LocalConfigRepository {
  constructor(defaults) { this.defaults = defaults; this.key = 'opsdesk:config:v1'; this.cache = this.load(); }
  load() {
    try { const raw = JSON.parse(localStorage.getItem(this.key)); if (raw && raw.teams && raw.rules) return raw; } catch (e) { /* abaikan */ }
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
