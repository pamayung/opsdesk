import { normalize } from '../domain/Category';

// Nama bawaan versi sebelumnya (Indonesia). Bila kategori tersimpan masih bernama persis begitu (belum diubah admin),
// namanya diperbarui ke nama bawaan sekarang. Nama yang sudah diubah admin tidak disentuh.
const LEGACY_NAMES = { stok: 'Stok & Persediaan', keamanan: 'Keamanan & Keselamatan', hr: 'HR & Kepegawaian', keuangan: 'Keuangan', pengadaan: 'Pengadaan' };

// DATA: daftar kategori. Kategori baru otomatis tersimpan saat membuat tiket; admin bisa mengubah dan menghapus.
export default class LocalCategoryRepository {
  constructor(defaults) { this.defaults = defaults; this.key = 'opsdesk:categories:v3'; this.legacyKey = 'opsdesk:categories:v2'; this.cache = this.load(); }
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.key));
      if (raw && Array.isArray(raw.items)) return this.renameLegacy(raw.items); // v3: apa adanya (penghapusan admin tidak dibatalkan)
      const old = JSON.parse(localStorage.getItem(this.legacyKey)); // v2: array; gabungkan kategori bawaan yang baru
      if (old && old.length) { const ids = new Set(old.map((c) => c.id)); return this.renameLegacy([...old, ...this.defaults.filter((d) => !ids.has(d.id))]); }
    } catch (e) { /* abaikan */ }
    return [...this.defaults];
  }
  renameLegacy(items) {
    return items.map((c) => {
      const d = this.defaults.find((x) => x.id === c.id);
      return d && LEGACY_NAMES[c.id] === c.name && d.name !== c.name ? { ...c, name: d.name } : c;
    });
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify({ items: this.cache })); } catch (e) { /* abaikan */ } }
  list() { return this.cache; }
  findByName(name) { return this.cache.find((c) => normalize(c.name) === normalize(name)) || null; }
  findById(id) { return this.cache.find((c) => c.id === id) || null; }
  add(cat) { this.cache.push(cat); this.persist(); return cat; }
  update(id, patch) { this.cache = this.cache.map((c) => (c.id === id ? { ...c, ...patch } : c)); this.persist(); }
  remove(id) { this.cache = this.cache.filter((c) => c.id !== id); this.persist(); }
}
