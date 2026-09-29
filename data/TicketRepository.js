import Ticket from '../domain/Ticket';

// DATA: ganti dengan ApiTicketRepository (REST/GraphQL) tanpa mengubah domain/UI.
export default class LocalTicketRepository {
  constructor(seeder) { this.seeder = seeder; this.key = 'opsdesk:tickets:v2'; this.cache = this.load(); }
  load() {
    try { const raw = JSON.parse(localStorage.getItem(this.key)); if (raw) return raw.map((r) => new Ticket(r)); } catch (e) { /* abaikan */ }
    return this.seeder();
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.cache)); } catch (e) { /* abaikan */ } }
  list() { return this.cache; }
  add(t) { this.cache.unshift(t); this.persist(); return t; }
  save(t) { this.cache = this.cache.map((x) => (x.id === t.id ? t : x)); this.persist(); return t; }
}
