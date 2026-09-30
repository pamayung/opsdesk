import Ticket from './Ticket';
import { makeNote, systemNote } from './Note';
import { REQUEST_TYPES, PARTY_OF_ROLE } from './constants';
import { canView, canHandle } from './Access';
import { buildReport } from './Report';
import { cleanName, normalize } from './Category';

const rank = (t, now) => (t.status === 'done' ? 1e9 : t.remainingMin(now));

// Helper bersama: ambil tiket, pastikan pengguna boleh mengaksesnya, dan (untuk perubahan) masih boleh diubah.
const need = (repo, id, user) => {
  const t = repo.find(id);
  if (!t || (user && !canView(user, t))) throw new Error('Tiket tidak ditemukan.');
  return t;
};
const editable = (t) => {
  if (t.status === 'done') throw new Error('Tiket sudah resolved dan tidak bisa diubah.');
  return t;
};
const handler = (t, user) => {
  if (!canHandle(user, t)) throw new Error('Hanya PIC atau department manager yang bisa menangani tiket ini.');
  return t;
};

export class ListTickets {
  constructor(repo) { this.repo = repo; }
  // department: id | 'all'. attention: hanya tiket berisiko SLA. assignment: 'all' | 'mine' | 'unassigned'.
  // user membatasi tiket yang boleh dilihat sesuai perannya.
  execute({ user = null, query = '', category = 'all', status = 'active', department = 'all', attention = false, assignment = 'all' } = {}, now = Date.now()) {
    const q = query.trim().toLowerCase();
    return this.repo.list()
      .filter((t) => canView(user, t)
        && (category === 'all' || t.categoryId === category)
        && (department === 'all' || t.department === department)
        && (!attention || t.atRisk(now))
        && (assignment === 'all' || (assignment === 'mine' ? t.isMine(user ? user.name : '') : t.status === 'open'))
        && (status === 'all' ? true : status === 'active' ? t.status !== 'done' : t.status === status)
        && (!q || `${t.id} ${t.title} ${t.branch} ${t.location} ${t.reporter} ${t.assignee || ''} ${t.routing ? t.routing.team : ''}`.toLowerCase().includes(q)))
      .sort((a, b) => rank(a, now) - rank(b, now)); // SLA paling mendesak di atas
  }
}
export class GetTicket {
  constructor(repo) { this.repo = repo; }
  execute(id, user) { const t = this.repo.find(id); return t && canView(user, t) ? t : null; }
}
export class ListCategories {
  constructor(repo) { this.repo = repo; }
  execute() { return this.repo.list(); }
}
// Pohon lokasi (datar, urut sesuai daftar) beserta jalur dan jenisnya.
export class ListLocations {
  constructor(repo) { this.repo = repo; }
  execute() { return this.repo.list(); }
}
// Saran area (mis. "Area kasir") yang pernah dipakai di sebuah lokasi.
export class ListAreas {
  constructor(repo) { this.repo = repo; }
  execute(locationName) {
    const n = normalize(locationName || '');
    return [...new Set(this.repo.list().filter((t) => !n || normalize(t.branch) === n).map((t) => t.location).filter(Boolean))];
  }
}
// Preview routing untuk form: memakai mesin yang sama dengan saat tiket dibuat.
export class PreviewRoute {
  constructor(router) { this.router = router; }
  execute({ categoryId, subId, type, kind, priority, locationIds }, now = Date.now()) {
    if (!categoryId || !kind || !priority) return null;
    return this.router.route({ categoryId, subId, type, kind, priority, locationIds }, now);
  }
}
export class CreateTicket {
  // catalog = { subsOf(kategori), subOf(kategori, sub) } untuk klasifikasi & pertanyaan dinamis.
  constructor(ticketRepo, categoryRepo, locationRepo, router, catalog) {
    this.tickets = ticketRepo; this.categories = categoryRepo; this.locations = locationRepo; this.router = router; this.catalog = catalog;
  }
  execute(input, now = Date.now()) {
    const catName = cleanName(input.categoryName);
    const locName = cleanName(input.locationName);
    const area = cleanName(input.area);
    const title = cleanName(input.title);
    const type = input.type || 'incident';
    if (!REQUEST_TYPES[type]) throw new Error('Request type tidak dikenal.');
    if (!input.priority) throw new Error('Pilih priority.');
    if (!locName) throw new Error('Isi atau pilih lokasi.');
    if (!catName) throw new Error('Isi atau pilih kategori.');
    if (title.length < 5) throw new Error('Judul minimal 5 karakter.');

    // Lokasi baru harus ditempatkan di bawah induk yang sudah ada, agar jenis & cakupan areanya jelas.
    let location = this.locations.findByName(locName);
    const isNewLocation = !location;
    if (!location && !this.locations.findById(input.newLocationParentId)) throw new Error('Pilih lokasi baru ini berada di bawah mana.');

    let category = this.categories.findByName(catName);
    const isNewCategory = !category;

    // Klasifikasi: subkategori wajib bila kategorinya punya subkategori; pertanyaan wajib harus terisi.
    const subs = category ? this.catalog.subsOf(category.id) : [];
    const sub = category && input.subId ? this.catalog.subOf(category.id, input.subId) : null;
    if (subs.length && !sub) throw new Error('Pilih subkategori.');
    const raw = input.answers || {};
    const answers = [];
    for (const q of sub ? sub.questions : []) {
      const a = raw[q.id] === undefined || raw[q.id] === null ? '' : String(raw[q.id]).trim();
      if (q.required && !a) throw new Error(`Jawab pertanyaan: ${q.label}.`);
      if (a) answers.push({ q: q.label, a });
    }

    // Semua validasi lolos: baru simpan lokasi & kategori baru.
    if (!location) location = this.locations.add({ id: `loc_${Date.now().toString(36)}`, name: locName, parentId: input.newLocationParentId });
    if (!category) category = this.categories.add({ id: `cat_${Date.now().toString(36)}`, name: catName });

    const routing = this.router.route({
      categoryId: category.id, subId: sub ? sub.id : undefined, type, priority: input.priority,
      kind: this.locations.kindOf(location.name), locationIds: this.locations.chainIds(location.name),
    }, now);
    const ticket = this.tickets.add(Ticket.create({
      id: this.tickets.nextId(), type, routing, subId: sub ? sub.id : null, answers, branch: location.name, location: area,
      priority: input.priority, categoryId: category.id, title, description: (input.description || '').trim(),
      reporter: cleanName(input.reporter) || 'Anonim', reporterRole: cleanName(input.reporterRole), image: input.image || null,
    }, now));
    return { ticket, category, location, isNewCategory, isNewLocation };
  }
}
// Menetapkan PIC. Tiket baru otomatis berstatus "Sedang Ditangani" dan dihitung sebagai respons pertama.
export class AssignPic {
  constructor(repo) { this.repo = repo; }
  execute(id, name, actor, now = Date.now()) {
    const t = handler(editable(need(this.repo, id, actor)), actor);
    const who = cleanName(name);
    if (!who) throw new Error('Pilih PIC terlebih dahulu.');
    if (t.assignee === who) return t;
    const text = who === actor.name ? `Ticket taken by ${who}` : `${who} assigned as PIC by ${actor.name}`;
    return this.repo.save(t.with({
      status: 'in_progress', assignee: who, respondedAt: t.respondedAt || now, notes: [...t.notes, systemNote(text, now)],
    }));
  }
}
export class TakeTicket {
  constructor(repo) { this.assign = new AssignPic(repo); }
  execute(id, actor, now) { return this.assign.execute(id, actor.name, actor, now); }
}
export class AddNote {
  constructor(repo) { this.repo = repo; }
  execute(id, { actor, text = '', image = null }, now = Date.now()) {
    const t = editable(need(this.repo, id, actor));
    const body = text.trim();
    if (!body && !image) throw new Error('Tulis catatan atau attach foto.');
    if (body.length > 500) throw new Error('Catatan maksimal 500 karakter.');
    const note = makeNote({ party: PARTY_OF_ROLE[actor.role] || 'supervisor', author: actor.name, role: actor.title || '', text: body, image, at: now });
    return this.repo.save(t.with({ notes: [...t.notes, note] }));
  }
}
export class CloseTicket {
  constructor(repo) { this.repo = repo; }
  // Menutup tiket dengan catatan penyelesaian (apa yang sudah dilakukan).
  execute(id, { actor, note }, now = Date.now()) {
    const t = handler(editable(need(this.repo, id, actor)), actor);
    if (t.status !== 'in_progress') throw new Error('Assign PIC terlebih dahulu sebelum resolve tiket.');
    const text = (note || '').trim();
    if (text.length < 5) throw new Error('Tulis apa yang sudah dilakukan (minimal 5 karakter).');
    if (text.length > 500) throw new Error('Resolution note maksimal 500 karakter.');
    return this.repo.save(t.with({
      status: 'done', resolution: { note: text, closedBy: actor.name, closedAt: now },
      notes: [...t.notes,
        makeNote({ party: PARTY_OF_ROLE[actor.role] || 'supervisor', author: actor.name, role: actor.title || '', text: `Resolution: ${text}`, at: now }),
        systemNote(`Ticket resolved by ${actor.name}`, now)],
    }));
  }
}
export class EscalateTicket {
  constructor(repo) { this.repo = repo; }
  // Eskalasi manual ke pihak luar (vendor / kontraktor). Dicatat di timeline.
  execute(id, actor, { to }, now = Date.now()) {
    const t = handler(editable(need(this.repo, id, actor)), actor);
    if (t.escalation) throw new Error('Tiket ini sudah di-escalate.');
    const target = cleanName(to);
    if (target.length < 2) throw new Error('Isi nama vendor atau pihak yang dituju.');
    return this.repo.save(t.with({
      escalation: { to: target, at: now, by: actor.name },
      notes: [...t.notes, systemNote(`Escalated to ${target} by ${actor.name}`, now)],
    }));
  }
}
const PRIORITY_KEYS = ['P1', 'P2', 'P3', 'P4'];
// Statistik untuk dashboard, otomatis dibatasi sesuai peran pengguna.
export class GetStats {
  constructor(repo) { this.repo = repo; }
  execute(user, now = Date.now()) {
    const all = this.repo.list().filter((t) => canView(user, t));
    const active = all.filter((t) => t.status !== 'done');
    const done = all.filter((t) => t.status === 'done');
    const breached = all.filter((t) => t.wasBreached(now)).length;
    const times = done.map((t) => t.resolutionMin()).filter((m) => m !== null);
    return {
      total: all.length,
      active: active.length,
      open: active.filter((t) => t.status === 'open').length,
      inProgress: active.filter((t) => t.status === 'in_progress').length,
      resolved: done.length,
      breached,
      atRisk: active.filter((t) => t.atRisk(now)).length,
      byPriority: Object.fromEntries(PRIORITY_KEYS.map((p) => [p, active.filter((t) => t.priority === p).length])),
      avgResolutionHours: times.length ? times.reduce((a, b) => a + b, 0) / times.length / 60 : null,
      slaRate: all.length ? Math.round(((all.length - breached) / all.length) * 1000) / 10 : 100,
    };
  }
}
const queueRow = (list, now) => ({
  count: list.length, risk: list.filter((t) => t.atRisk(now)).length, waiting: list.filter((t) => t.status === 'open').length,
});
// Antrean per department (untuk manajemen), termasuk total tiket sepanjang waktu.
export class GetDepartmentQueues {
  // source = { departments } (boleh getter agar selalu terbaru)
  constructor(repo, source) { this.repo = repo; this.source = source; }
  execute(user, now = Date.now()) {
    const all = this.repo.list().filter((t) => canView(user, t));
    return Object.entries(this.source.departments).map(([id, d]) => {
      const mine = all.filter((t) => t.department === id);
      return { id, name: d.name, ...queueRow(mine.filter((t) => t.status !== 'done'), now), total: mine.length };
    });
  }
}
// Antrean per tim di dalam department (untuk manajer department).
export class GetTeamQueues {
  // source = { teams } (boleh getter agar selalu terbaru)
  constructor(repo, source) { this.repo = repo; this.source = source; }
  execute(user, now = Date.now()) {
    const active = this.repo.list().filter((t) => canView(user, t) && t.status !== 'done');
    return Object.entries(this.source.teams).filter(([, tm]) => tm.department === user.department).map(([id, tm]) => ({
      id, name: tm.name, ...queueRow(active.filter((t) => t.routing && t.routing.teamId === id), now),
    }));
  }
}
// Laporan: agregasi tiket sesuai peran, periode, dan filter.
export class GetReport {
  // ctx = { locationIds(nama), names: { department, category, sub } }
  constructor(repo, ctx) { this.repo = repo; this.ctx = ctx; }
  execute(user, filters, now = Date.now()) { return buildReport(this.repo.list(), { user, ...filters }, { now, ...this.ctx }); }
}
export { normalize };
