import Ticket from './Ticket';
import { cleanName, normalize } from './Category';

const rank = (t, now) => (t.status === 'done' ? 1e9 : t.remainingMin(now));

export class ListTickets {
  constructor(repo) { this.repo = repo; }
  execute({ query = '', category = 'all', status = 'active' } = {}, now = Date.now()) {
    const q = query.trim().toLowerCase();
    return this.repo.list()
      .filter((t) => (category === 'all' || t.categoryId === category)
        && (status === 'all' ? true : status === 'active' ? t.status !== 'done' : t.status === status)
        && (!q || `${t.id} ${t.title} ${t.location} ${t.reporter} ${t.assignee || ''}`.toLowerCase().includes(q)))
      .sort((a, b) => rank(a, now) - rank(b, now)); // SLA paling mendesak di atas
  }
}
export class ListCategories {
  constructor(repo) { this.repo = repo; }
  execute() { return this.repo.list(); }
}
export class ListLocations {
  constructor(repo) { this.repo = repo; }
  execute() { return [...new Set(this.repo.list().map((t) => t.location).filter(Boolean))]; }
}
export class CreateTicket {
  constructor(ticketRepo, categoryRepo) { this.tickets = ticketRepo; this.categories = categoryRepo; }
  execute(input) {
    const name = cleanName(input.categoryName);
    const location = cleanName(input.location);
    if (!input.priority) throw new Error('Pilih tingkat kedaruratan.');
    if (!location) throw new Error('Isi lokasi masalah.');
    if (!name) throw new Error('Isi atau pilih kategori masalah.');
    if (!input.description || input.description.trim().length < 5) throw new Error('Deskripsi minimal 5 karakter.');

    // Kategori belum ada -> otomatis dibuat & disimpan
    let category = this.categories.findByName(name);
    const isNewCategory = !category;
    if (!category) category = this.categories.add({ id: `cat_${Date.now().toString(36)}`, name });

    const ticket = this.tickets.add(Ticket.create({
      location, priority: input.priority, categoryId: category.id, reporter: input.reporter || 'Anonim',
      hasPhoto: input.hasPhoto, description: input.description.trim(), title: input.description.trim().slice(0, 80),
    }));
    return { ticket, category, isNewCategory };
  }
}
export class AdvanceTicket {
  constructor(repo) { this.repo = repo; }
  execute(id, actor) {
    const t = this.repo.list().find((x) => x.id === id);
    if (!t) return null;
    if (t.status === 'open') { t.status = 'in_progress'; t.assignee = actor; }
    else if (t.status === 'in_progress') t.status = 'done';
    return this.repo.save(t);
  }
}
export class GetStats {
  constructor(repo) { this.repo = repo; }
  execute(now = Date.now()) {
    const all = this.repo.list();
    const active = all.filter((t) => t.status !== 'done');
    return {
      active: active.length,
      critical: active.filter((t) => t.isCritical(now) || t.isBreached(now)).length,
      inProgress: active.filter((t) => t.status === 'in_progress').length,
      done: all.filter((t) => t.status === 'done').length,
      slaRate: all.length ? Math.round((all.filter((t) => !t.isBreached(now)).length / all.length) * 1000) / 10 : 100,
    };
  }
}
export { normalize };
