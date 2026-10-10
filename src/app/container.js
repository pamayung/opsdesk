import ApiStore from '../data/ApiStore';
import ApiAdminService from '../data/ApiAdminService';
import { api, client, isApiError, dataUrlToBlob } from '../api/http';
import * as M from '../data/mappers';
import { APP, REPORTER_ROLES } from '../config/defaults';
import { ROLES } from '../config/users';

// Composition root. Semua data berasal dari API; tidak ada lagi penyimpanan atau perhitungan routing/SLA/izin di browser.
const store = new ApiStore();
const admin = new ApiAdminService(store);
const srcOf = (a) => client.attachmentSrc(a);
const ref = () => store.ref;

const PRESET = { today: 'today', 7: '7d', 30: '30d', 90: '90d', custom: 'custom' };
// Filter laporan (nilai 'all' atau kosong = tanpa filter; ID antarmuka -> ID API).
const reportQuery = (f) => {
  const all = (v) => v === undefined || v === '' || v === 'all';
  return {
    preset: PRESET[f.preset] || '30d', ...(f.preset === 'custom' ? { from: f.from, to: f.to } : {}),
    department_id: all(f.department) ? undefined : ref().deptNum[f.department], location_id: all(f.locationId) ? undefined : Number(f.locationId),
    category_id: all(f.categoryId) ? undefined : ref().catNum[f.categoryId], priority: all(f.priority) ? undefined : f.priority, type: all(f.type) ? undefined : f.type,
  };
};

export const container = {
  app: APP,
  roles: ROLES,
  reporterRoles: REPORTER_ROLES,
  store, admin, isApiError,

  // ---- konfigurasi (sinkron, dari ApiStore) ----
  get users() { return store.users; },
  get departments() { return store.departments; },
  get teams() { return store.teams; },
  get rules() { return store.rules; },
  get stats() { return store.stats; },
  get slaTexts() { return (p) => M.slaTexts(store.ref, p); },
  catalog: { subsOf: (c) => store.subsOf(c), subOf: (c, s) => store.subOf(c, s) },
  listCategories: { execute: () => store.categories },
  listLocations: { execute: () => store.locations },
  locationPath: (n) => store.locationPath(n),
  locationKind: (n) => store.locationKind(n),
  locationIds: (n) => store.locationIds(n),

  // ---- tiket (async, dari server) ----
  tickets: {
    // filter: { status, category, department, assignment, attention, query, page, pageSize }. Hasil: { items, meta }.
    async list(f = {}) {
      const r = ref();
      const res = await api.listTickets({
        status: f.status === 'done' ? 'resolved' : f.status, category_id: f.category && f.category !== 'all' ? r.catNum[f.category] : undefined,
        department_id: f.department && f.department !== 'all' ? r.deptNum[f.department] : undefined, assignment: f.assignment && f.assignment !== 'all' ? f.assignment : undefined,
        at_risk: f.attention ? true : undefined, q: f.query ? f.query.trim() : undefined, sort: 'sla', page: f.page || 1, page_size: f.pageSize || 20,
      });
      return { items: res.data.map((t) => M.toTicketSummary(t, r)), meta: res.meta };
    },
    async get(code) {
      try { return M.toTicketDetail(await api.getTicket(code), ref(), srcOf); } catch (e) { if (isApiError(e, 'not_found')) return null; throw e; }
    },
    async take(code) { return M.toTicketDetail(await api.takeTicket(code), ref(), srcOf); },
    async assign(ticket, name) {
      const u = ticket.assignable.find((x) => x.name === name);
      if (!u) throw new Error('Pilih PIC terlebih dahulu.');
      return M.toTicketDetail(await api.assignTicket(ticket.id, { pic_id: u.id }), ref(), srcOf);
    },
    // image: data URL hasil readImage (opsional)
    async addNote(code, { text = '', image = null }) {
      if (image) return M.toTicketDetail(await client.addNoteWithPhoto(code, text.trim(), await dataUrlToBlob(image), 'foto.jpg'), ref(), srcOf);
      return M.toTicketDetail(await api.addTicketNote(code, { body: text.trim() }), ref(), srcOf);
    },
    // Hanya pelapor atau manajer department, maks. 7 hari sejak Resolved; SLA mulai dari nol (diputuskan server)
    async reopen(code, { reason }) { return M.toTicketDetail(await api.reopenTicket(code, { reason: (reason || '').trim() }), ref(), srcOf); },
    async close(code, { note }) { return M.toTicketDetail(await api.resolveTicket(code, { note: (note || '').trim() }), ref(), srcOf); },
    async escalate(code, { to }) { return M.toTicketDetail(await api.escalateTicketToVendor(code, { to: (to || '').trim() }), ref(), srcOf); },
    // Membuat tiket. idempotencyKey: dibuat sekali per form agar ketukan ganda/retry tidak membuat tiket ganda.
    async create(i) {
      const r = ref();
      const answers = Object.entries(i.answers || {}).filter(([, v]) => String(v).trim()).map(([id, v]) => ({ question_id: Number(id), answer: String(v).trim() }));
      const loc = r.locations.find((n) => n.id === i.locationId);
      const body = {
        type: i.type, priority: i.priority, category_id: r.catNum[i.categoryId], subcategory_id: i.subId ? r.subNum[`${i.categoryId}/${i.subId}`] : undefined,
        location_id: Number(loc.id), area: (i.area || '').trim(), title: i.title.trim(), description: (i.description || '').trim(), answers,
        reported_for: i.reporter ? `${i.reporter.trim()}${i.reporterRole ? ` (${i.reporterRole.trim()})` : ''}` : undefined,
      };
      const created = await client.createTicket(body, { idempotencyKey: i.idempotencyKey });
      let photoError = null;
      if (i.image) { // foto menyusul sebagai catatan pertama; kegagalannya tidak membatalkan tiket yang sudah dibuat
        try { await client.addNoteWithPhoto(created.code, '', await dataUrlToBlob(i.image), 'foto.jpg'); } catch (e) { photoError = e.message; }
      }
      return { ticket: created.code, team: created.team.name, photoError };
    },
  },
  // Routing Preview di form dan tester admin. at: ms (simulasi waktu, hanya admin).
  async previewRoute({ categoryId, subId, type, locationId, priority, at }) {
    const r = ref();
    const body = { category_id: r.catNum[categoryId], subcategory_id: subId ? r.subNum[`${categoryId}/${subId}`] : undefined, type, location_id: Number(locationId), priority,
      ...(at ? { at: new Date(at).toISOString() } : {}) };
    return M.toRoutePreview(await api.previewRouting(body), r);
  },

  // ---- dashboard dan laporan ----
  dashboard: {
    deptQueues: () => M.toDeptQueues(store.summary, ref()),
    teamQueues: () => M.toTeamQueues(store.summary),
    attention: () => (store.summary.needs_attention || []).map((t) => M.toTicketSummary(t, ref())),
  },
  reports: {
    async overview(f) { return M.toReport(await api.reportOverview(reportQuery(f))); },
    exportCsv: (f) => api.reportExportCSV(reportQuery(f)),
  },
};
