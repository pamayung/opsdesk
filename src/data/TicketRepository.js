import Ticket from '../domain/Ticket';

// DATA: ganti dengan ApiTicketRepository (REST/GraphQL) tanpa mengubah domain/UI.
export default class LocalTicketRepository {
  // backfill(ticket) dipakai saat migrasi data lama: mengisi field yang belum ada (mis. routing).
  constructor(seeder, backfill = (t) => t) {
    this.seeder = seeder; this.backfill = backfill;
    this.key = 'opsdesk:tickets:v5'; this.legacyKeys = ['opsdesk:tickets:v4', 'opsdesk:tickets:v3', 'opsdesk:tickets:v2'];
    this.cache = this.load();
  }
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.key));
      if (raw) return raw.map((r) => new Ticket(r));
      for (const k of this.legacyKeys) {
        const old = JSON.parse(localStorage.getItem(k));
        if (old) return old.map(({ hasPhoto, ...rest }) => this.backfill(new Ticket(rest)));
      }
    } catch (e) { /* abaikan */ }
    return this.seeder();
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.cache)); } catch (e) { /* abaikan: penyimpanan penuh / dinonaktifkan */ } }
  list() { return this.cache; }
  find(id) { return this.cache.find((t) => t.id === id) || null; }
  nextId() {
    const max = this.cache.reduce((m, t) => Math.max(m, parseInt(String(t.id).replace(/\D/g, ''), 10) || 0), 1000);
    return `TCK-${max + 1}`;
  }
  // Dipakai saat admin mengganti nama lokasi, agar riwayat tiket tetap terkait.
  renameBranch(from, to) {
    this.cache = this.cache.map((t) => (t.branch === from ? t.with({ branch: to }) : t));
    this.persist();
  }
  addMany(list) { this.cache.push(...list); this.persist(); return list.length; }
  add(t) { this.cache.unshift(t); this.persist(); return t; }
  save(t) { this.cache = this.cache.map((x) => (x.id === t.id ? t : x)); this.persist(); return t; }
}
