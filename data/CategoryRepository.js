import { normalize } from '../domain/Category';

export default class LocalCategoryRepository {
  constructor(defaults) { this.defaults = defaults; this.key = 'opsdesk:categories:v2'; this.cache = this.load(); }
  load() {
    try { const raw = JSON.parse(localStorage.getItem(this.key)); if (raw && raw.length) return raw; } catch (e) { /* abaikan */ }
    return [...this.defaults];
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.cache)); } catch (e) { /* abaikan */ } }
  list() { return this.cache; }
  findByName(name) { return this.cache.find((c) => normalize(c.name) === normalize(name)) || null; }
  add(cat) { this.cache.push(cat); this.persist(); return cat; }
}
