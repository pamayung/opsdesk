import { normalize } from '../domain/Category';
import { chainOf, kindOfNode } from '../domain/Location';

// Jenis lokasi versi lama (datar) -> induk di pohon baru, untuk migrasi lokasi buatan pengguna.
const LEGACY_PARENT = { outlet: 'operations', head_office: 'head-office', warehouse: 'distribution-center' };

// DATA: pohon lokasi. Lokasi baru otomatis tersimpan saat membuat tiket (dipilih di bawah induk mana).
export default class LocalLocationRepository {
  constructor(defaults) { this.defaults = defaults; this.key = 'opsdesk:locations:v3'; this.v2Key = 'opsdesk:locations:v2'; this.legacyKey = 'opsdesk:locations:v1'; this.cache = this.load(); }
  load() {
    try {
      const cur = JSON.parse(localStorage.getItem(this.key));
      if (cur && Array.isArray(cur.items)) return cur.items; // v3: apa adanya (penghapusan admin tidak dibatalkan)
      const raw = JSON.parse(localStorage.getItem(this.v2Key)); // v2: gabungkan lokasi bawaan yang baru
      if (raw && raw.length) {
        const ids = new Set(raw.map((l) => l.id));
        return [...raw, ...this.defaults.filter((d) => !ids.has(d.id))];
      }
      const old = JSON.parse(localStorage.getItem(this.legacyKey)); // v1: [{ id, name, kind }] datar
      if (old && old.length) {
        const ids = new Set(this.defaults.map((d) => d.id));
        const names = new Set(this.defaults.map((d) => normalize(d.name)));
        const custom = old.filter((l) => !ids.has(l.id) && !names.has(normalize(l.name)))
          .map((l) => ({ id: l.id, name: l.name, parentId: LEGACY_PARENT[l.kind] || 'operations' }));
        return [...this.defaults, ...custom];
      }
    } catch (e) { /* abaikan */ }
    return [...this.defaults];
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify({ items: this.cache })); } catch (e) { /* abaikan */ } }
  list() { return this.cache; }
  findByName(name) { return this.cache.find((l) => normalize(l.name) === normalize(name)) || null; }
  findById(id) { return this.cache.find((l) => l.id === id) || null; }
  // Jenis lokasi (outlet / head_office / warehouse), diwarisi dari leluhur teratas.
  kindOf(name) { const l = this.findByName(name); return l ? kindOfNode(this.cache, l.id) : undefined; }
  // Id lokasi dari yang paling spesifik sampai akar, dipakai mencocokkan cakupan area PIC.
  chainIds(name) { const l = this.findByName(name); return l ? chainOf(this.cache, l.id).map((n) => n.id) : []; }
  add(node) { this.cache.push(node); this.persist(); return node; }
  // kind hanya berlaku untuk lokasi utama; patch dengan kind undefined menghapusnya.
  update(id, patch) {
    this.cache = this.cache.map((l) => {
      if (l.id !== id) return l;
      const next = { ...l, ...patch };
      if (next.kind === undefined) delete next.kind;
      return next;
    });
    this.persist();
  }
  remove(id) { this.cache = this.cache.filter((l) => l.id !== id); this.persist(); }
}
