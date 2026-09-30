import LocalTicketRepository from '../data/TicketRepository';
import LocalCategoryRepository from '../data/CategoryRepository';
import LocalLocationRepository from '../data/LocationRepository';
import LocalConfigRepository from '../data/ConfigRepository';
import seed, { sampleHistory } from '../data/seed';
import { DEFAULT_CATEGORIES, APP, REPORTER_ROLES } from '../config/defaults';
import { DEFAULT_LOCATIONS } from '../config/org';
import { USERS, ROLES, DEFAULT_USER_ID } from '../config/users';
import { SUBCATEGORIES } from '../config/catalog';
import { DEPARTMENTS, TEAMS, ROUTING_RULES } from '../config/routing';
import RoutingEngine from '../domain/Routing';
import AdminService from '../domain/Admin';
import { pathText } from '../domain/Location';
import {
  GetReport, ListTickets, GetTicket, ListCategories, ListLocations, ListAreas, PreviewRoute, CreateTicket, TakeTicket, AssignPic,
  AddNote, CloseTicket, EscalateTicket, GetStats, GetDepartmentQueues, GetTeamQueues,
} from '../domain/usecases';

// Composition root (dependency injection sederhana)
const locations = new LocalLocationRepository(DEFAULT_LOCATIONS);
// Konfigurasi organisasi: nilai awal dari src/config/*, selanjutnya diubah admin dan disimpan di browser.
const config = new LocalConfigRepository({ departments: DEPARTMENTS, teams: TEAMS, rules: ROUTING_RULES, catalog: SUBCATEGORIES, users: USERS });
// Getter (bukan salinan) supaya mesin routing dan antrean selalu memakai konfigurasi terbaru setelah admin menyimpan.
const live = { get rules() { return config.rules(); }, get teams() { return config.teams(); }, get departments() { return config.departments(); } };
const makeRouter = (loadOf) => new RoutingEngine({ loadOf, get rules() { return live.rules; }, get teams() { return live.teams; }, get departments() { return live.departments; } });
const seedRoute = (input, at) => makeRouter(() => 0).route(input, at); // seed dibuat sebelum repository ada
const locInfo = (name) => ({ kind: locations.kindOf(name), ids: locations.chainIds(name) });
const tickets = new LocalTicketRepository(
  () => seed(seedRoute, locInfo),
  // Migrasi data lama: hitung ulang routing dengan aturan & struktur organisasi saat ini.
  (t) => { const i = locInfo(t.branch); return t.with({ routing: seedRoute({ categoryId: t.categoryId, subId: t.subId || undefined, type: t.type, priority: t.priority, kind: i.kind, locationIds: i.ids }, t.createdAt) }); },
);
const categories = new LocalCategoryRepository(DEFAULT_CATEGORIES);
// Beban PIC = jumlah tiket aktif yang PIC awalnya orang tersebut.
const router = makeRouter((name) => tickets.list().filter((t) => t.status !== 'done' && t.routing && t.routing.pic && t.routing.pic.name === name).length);
const catalog = { subsOf: (c) => config.catalog()[c] || [], subOf: (c, sub) => (config.catalog()[c] || []).find((x) => x.id === sub) || null };
const admin = new AdminService({ config, locations, categories, tickets, roles: Object.keys(ROLES), sampleHistory: () => sampleHistory(seedRoute, locInfo) });
// Nama tampilan untuk laporan (dibaca langsung agar mengikuti perubahan admin).
const names = {
  department: (id) => (config.departments()[id] || {}).name || id,
  category: (id) => (categories.findById(id) || {}).name || id,
  sub: (c, s) => ((catalog.subOf(c, s) || {}).name) || s,
};

export const container = {
  app: APP,
  roles: ROLES,
  defaultUserId: DEFAULT_USER_ID,
  reporterRoles: REPORTER_ROLES,
  // Dibaca setiap kali diakses (getter) karena admin bisa mengubahnya kapan saja.
  get users() { return config.users(); },
  get departments() { return config.departments(); },
  get teams() { return config.teams(); },
  get rules() { return config.rules(); },
  catalog,
  admin,
  // Anggota tim hasil routing = pilihan PIC di halaman detail.
  membersOf: (teamId) => ((config.teams()[teamId] || {}).members || []).map((m) => m.name),
  locationPath: (name) => { const l = locations.findByName(name); return l ? pathText(locations.list(), l.id) : name; },
  locationKind: (name) => locations.kindOf(name),
  locationIds: (name) => locations.chainIds(name),
  listTickets: new ListTickets(tickets),
  getTicket: new GetTicket(tickets),
  listCategories: new ListCategories(categories),
  listLocations: new ListLocations(locations),
  listAreas: new ListAreas(tickets),
  previewRoute: new PreviewRoute(router),
  createTicket: new CreateTicket(tickets, categories, locations, router, catalog),
  takeTicket: new TakeTicket(tickets),
  assignPic: new AssignPic(tickets),
  addNote: new AddNote(tickets),
  closeTicket: new CloseTicket(tickets),
  escalateTicket: new EscalateTicket(tickets),
  getReport: new GetReport(tickets, { locationIds: (n) => locations.chainIds(n), names }),
  reportNames: names,
  getStats: new GetStats(tickets),
  getDepartmentQueues: new GetDepartmentQueues(tickets, live),
  getTeamQueues: new GetTeamQueues(tickets, live),
};
