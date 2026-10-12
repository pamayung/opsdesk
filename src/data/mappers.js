// DATA: pemetaan murni antara model API (ID numerik, snake_case) dan model yang dipakai antarmuka (ID slug, objek konfigurasi).
// Tidak ada akses jaringan atau DOM di sini, jadi mudah diuji dengan respons nyata server (tests/fixtures).
import Ticket from '../domain/Ticket';
import { PARTY_OF_ROLE, PRIORITIES, REQUEST_TYPES } from '../domain/constants';
import { eventText } from './eventText';

export const DAY = 86400000;
export const ms = (iso) => (iso ? Date.parse(iso) : null);
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
const STATUS = { open: 'open', in_progress: 'in_progress', resolved: 'done' };
export const STATUS_TO_API = { done: 'resolved' };

// ---------------- referensi (lokasi, katalog, department, kebijakan SLA) ----------------
export function buildRef(raw) {
  const locs = raw.locations.filter((l) => l.is_active);
  const locations = locs.map((l) => ({ id: String(l.id), name: l.name, parentId: l.parent_id == null ? null : String(l.parent_id), ...(l.parent_id == null ? { kind: l.kind } : {}) }));
  const cats = raw.categories.filter((c) => c.is_active);
  const ref = { locations, locByName: {}, catNum: {}, catSlug: {}, subNum: {}, subSlug: {}, deptNum: {}, deptSlug: {}, policies: {}, raw };
  locations.forEach((n) => { ref.locByName[n.name.toLowerCase()] = n; });
  ref.categories = cats.map((c) => ({ id: c.slug, name: c.name }));
  ref.catalog = {};
  cats.forEach((c) => {
    ref.catNum[c.slug] = c.id; ref.catSlug[c.id] = c.slug;
    ref.catalog[c.slug] = c.subcategories.filter((s) => s.is_active).map((s) => {
      ref.subNum[`${c.slug}/${s.slug}`] = s.id;
      return {
        id: s.slug, name: s.name,
        questions: s.questions.map((q) => compact({ id: String(q.id), label: q.label, type: q.type, options: q.type === 'select' ? q.options : undefined, required: q.required, placeholder: q.placeholder || undefined })),
      };
    });
    c.subcategories.forEach((s) => { ref.subSlug[s.id] = s.slug; });
  });
  ref.departments = {};
  raw.departments.filter((d) => d.is_active).forEach((d) => { ref.departments[d.slug] = { name: d.name, head: '', id: d.id, headUserId: d.head_user_id }; ref.deptNum[d.slug] = d.id; });
  raw.departments.forEach((d) => { ref.deptSlug[d.id] = d.slug; });
  raw.sla_policies.forEach((p) => {
    ref.policies[p.priority] = { respondMin: p.respond_minutes, resolveMin: p.resolve_minutes, ratio: p.escalate_ratio, warning: p.warning_minutes, critical: p.critical_minutes };
  });
  return ref;
}

export const slaText = (min) => (min < 60 ? `${min} min` : min < 1440 ? `${Math.round((min / 60) * 10) / 10} hr` : `${Math.round((min / 1440) * 10) / 10} days`);
// Teks target SLA untuk form: dari kebijakan server bila ada, jika tidak dari konstanta.
export const slaTexts = (ref, priority) => {
  const p = ref && ref.policies[priority];
  return p ? { respondText: slaText(p.respondMin), slaText: slaText(p.resolveMin) } : { respondText: PRIORITIES[priority].respondText, slaText: PRIORITIES[priority].slaText };
};

// ---------------- pengguna yang login ----------------
export function toUser(p, ref) {
  const loc = p.default_location_id == null ? null : ref.locations.find((n) => n.id === String(p.default_location_id));
  return compact({
    id: String(p.id), name: p.name, email: p.email, role: p.role, title: p.title || '',
    department: p.department_id == null ? undefined : ref.deptSlug[p.department_id],
    teamIds: (p.teams || []).map((t) => String(t.id)), location: loc ? loc.name : undefined,
  });
}

// ---------------- tiket ----------------
const routingOf = (t, ref) => ({
  team: t.team.name, teamId: String(t.team.id), department: ref.deptSlug[t.department.id] || String(t.department.id),
  pic: t.initial_pic ? { name: t.initial_pic.name } : null, offHours: false, ruleId: null, escalation: { l1: '', l2: '' },
});

function fromSummary(t, ref) {
  return {
    id: t.code, key: t.id, type: t.type, priority: t.priority, status: STATUS[t.status], title: t.title,
    branch: t.location.name, location: t.area || '', reporter: t.reporter.name, categoryId: ref.catSlug[t.category.id] || String(t.category.id),
    subId: t.subcategory ? ref.subSlug[t.subcategory.id] || null : null, assignee: t.assignee ? t.assignee.name : null,
    routing: routingOf(t, ref), createdAt: ms(t.created_at), respondedAt: ms(t.responded_at),
    dueAt: ms(t.sla.resolve_due_at), respondDueAt: ms(t.sla.respond_due_at), policy: ref.policies[t.priority] || null,
    resolution: t.resolved_at ? { note: '', closedBy: '', closedAt: ms(t.resolved_at) } : null,
    reopenCount: t.reopen_count || 0, reopenedAt: ms(t.reopened_at), slaStartAt: ms(t.reopened_at) || ms(t.created_at),
  };
}
export const toTicketSummary = (t, ref) => new Ticket(fromSummary(t, ref));

function eventToNote(ev, attachments, srcOf) {
  const system = ev.kind === 'system';
  const att = attachments.find((a) => a.event_id === ev.id);
  return {
    id: `e${ev.id}`, at: ms(ev.at), kind: system ? 'system' : 'note', party: system ? 'system' : PARTY_OF_ROLE[ev.author_role] || 'supervisor',
    author: system ? 'System' : ev.author_name, role: system ? '' : ev.author_label || '', text: eventText(ev), image: att ? srcOf(att) : null,
  };
}

export function toTicketDetail(d, ref, srcOf = (a) => a.url) {
  const base = fromSummary(d, ref);
  const r = d.routing;
  return new Ticket({
    ...base,
    description: d.description || '', reporter: d.reported_for || base.reporter,
    answers: d.answers.map((a) => ({ q: a.label, a: a.answer })),
    routing: { ...base.routing, pic: r.initial_pic ? { name: r.initial_pic.name } : null, offHours: !!r.off_hours, ruleId: r.rule_code,
      escalation: { l1: r.escalation_l1 ? r.escalation_l1.name : '', l2: r.escalation_l2 ? r.escalation_l2.name : '' } },
    resolution: d.resolution ? { note: d.resolution.note, closedBy: d.resolution.by.name, closedAt: ms(d.resolution.at) } : null,
    escalation: d.vendor_escalation ? { to: d.vendor_escalation.to, at: ms(d.vendor_escalation.at), by: d.vendor_escalation.by ? d.vendor_escalation.by.name : '' } : null,
    notes: d.events.map((ev) => eventToNote(ev, d.attachments, srcOf)),
    permissions: d.permissions, assignable: d.assignable_users, reopenUntil: ms(d.reopen_until),
  });
}

// ---------------- dashboard ----------------
export function toStats(s, kpis) {
  const active = s.open + s.in_progress;
  return {
    total: s.total, active, open: s.open, inProgress: s.in_progress, resolved: s.resolved, breached: s.breached, atRisk: s.at_risk,
    byPriority: Object.fromEntries(['P1', 'P2', 'P3', 'P4'].map((p) => [p, s.active_by_priority[p] || 0])),
    avgResolutionHours: kpis && kpis.avg_resolution_min != null ? kpis.avg_resolution_min / 60 : null,
    slaRate: s.total ? Math.round(((s.total - s.breached) / s.total) * 1000) / 10 : 100,
  };
}
// Kategori yang ada pada tiket yang terlihat oleh pengguna (dari server, mengikuti hak lihat), urut sama dengan katalog. Untuk filter daftar.
export const toCategoriesInUse = (s, ref) => {
  const present = new Set((s.by_category || []).map((c) => ref.catSlug[c.id]).filter(Boolean));
  return ref.categories.filter((c) => present.has(c.id));
};
export const toDeptQueues = (s, ref) => s.by_department.map((d) => ({ id: ref.deptSlug[d.id] || String(d.id), name: d.name, count: d.total, risk: d.at_risk, waiting: d.open, total: d.total }));
export const toTeamQueues = (s) => s.by_team.map((t) => ({ id: String(t.id), name: t.name, count: t.total, risk: t.at_risk, waiting: t.open }));

// ---------------- laporan ----------------
const kpi = (k) => ({ total: k.total, resolved: k.resolved, open: k.open, breached: k.breached, slaRate: k.sla_rate, avgResponseMin: k.avg_response_min, avgResolutionMin: k.avg_resolution_min, reopened: k.reopened, reopenRate: k.reopen_rate });
const perf = (rows) => rows.map((r) => ({ key: r.key_id == null ? r.label : String(r.key_id), label: r.label === '(belum diambil)' ? 'Unassigned' : r.label, total: r.total, resolved: r.resolved,
  breached: r.breached, slaRate: r.sla_rate, avgResponseMin: r.avg_response_min, avgResolutionMin: r.avg_resolution_min, reopened: r.reopened }));
const rows = (list, label = (l) => l) => list.map((r) => ({ key: r.label, label: label(r.label), total: r.count }));
const AGING = { lt_1h: '< 1 hr', '1_4h': '1–4 hr', '4_24h': '4–24 hr', '1_3d': '1–3 days', gt_3d: '> 3 days' };

export function toReport(o) {
  const from = ms(o.period.from); const to = ms(o.period.to);
  const aging = o.aging.map((b) => ({ label: AGING[b.band] || b.band, count: b.count, atRisk: b.at_risk }));
  const orderBy = (keys) => (a, b) => keys.indexOf(a.key) - keys.indexOf(b.key);
  return {
    period: { from, to, days: Math.round((to - from) / DAY) },
    kpi: kpi(o.kpis), prev: kpi(o.previous), comparisonAvailable: o.comparison_available,
    trend: { step: o.period.step === 'day' ? 1 : 7, buckets: o.trend.map((p) => ({ start: ms(p.start), end: ms(p.end), created: p.created, resolved: p.resolved })) },
    by: {
      department: rows(o.breakdown.department), category: rows(o.breakdown.category), location: rows(o.breakdown.location),
      priority: rows(o.breakdown.priority, (k) => (PRIORITIES[k] ? PRIORITIES[k].label : k)).sort(orderBy(Object.keys(PRIORITIES))),
      type: rows(o.breakdown.type, (k) => (REQUEST_TYPES[k] ? REQUEST_TYPES[k].label : k)).sort(orderBy(Object.keys(REQUEST_TYPES))),
    },
    teams: perf(o.by_team), pics: perf(o.by_pic), aging, openNow: aging.reduce((a, b) => a + b.count, 0),
    late: o.late.map((l) => ({ id: l.code, title: l.title, priority: l.priority, branch: l.location, status: STATUS[l.status], overshootMin: l.overshoot_min })),
  };
}

// ---------------- Routing Preview ----------------
export const toRoutePreview = (p, ref) => ({
  department: ref.deptSlug[p.department.id] || String(p.department.id), team: p.team.name, teamId: String(p.team.id), external: p.is_external, offHours: p.off_hours,
  pic: p.pic ? { name: p.pic.name, load: p.pic_load == null ? 0 : p.pic_load, byArea: p.pic_by_area } : null,
  escalation: { l1: p.escalation_l1 ? p.escalation_l1.name : '', l2: p.escalation_l2 ? p.escalation_l2.name : '' }, ruleId: p.rule_code,
});

// ---------------- konfigurasi admin (tim, aturan, pengguna) ----------------
// Jam kerja API per hari; prototype satu rentang untuk beberapa hari. Bila hari-harinya berbeda rentang, dipakai rentang yang paling banyak.
export function hoursFromRows(rows, alwaysOn) {
  if (alwaysOn) return null;
  const groups = new Map();
  rows.forEach((r) => { const k = `${r.starts_at}|${r.ends_at}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.day_of_week); });
  let best = null;
  groups.forEach((days, k) => { if (!best || days.length > best.days.length) best = { k, days }; });
  if (!best) return { days: [], from: '08:00', to: '17:00' };
  const [from, to] = best.k.split('|');
  return { days: best.days.sort((a, b) => a - b), from, to };
}
export const rowsFromHours = (h) => (h ? h.days.map((d) => ({ day_of_week: d, starts_at: h.from, ends_at: h.to })) : []);

export function buildAdmin(rawTeams, rawRules, rawUsers, ref) {
  const userName = Object.fromEntries(rawUsers.map((u) => [u.id, u.name]));
  const teamSlug = Object.fromEntries(rawTeams.map((t) => [t.id, t.slug]));
  const teams = {}; const teamNum = {};
  const usersByTeam = {};
  rawTeams.filter((t) => t.is_active).forEach((t) => {
    teamNum[t.slug] = t.id;
    teams[t.slug] = compact({
      id: t.id, name: t.name, department: ref.deptSlug[t.department_id], lead: t.lead_user_id == null ? '' : userName[t.lead_user_id] || '',
      onCall: t.on_call_team_id == null ? undefined : teamSlug[t.on_call_team_id], external: t.is_external, hours: hoursFromRows(t.working_hours, t.is_always_on),
      members: t.members.map((m) => compact({ id: String(m.user_id), name: m.name, available: m.is_available, scope: m.scope_location_ids.length ? m.scope_location_ids.map(String) : undefined })),
    });
    t.members.forEach((m) => { (usersByTeam[m.user_id] = usersByTeam[m.user_id] || []).push(t.slug); });
  });
  const rules = rawRules.map((r) => compact({
    id: r.code, num: r.id, category: r.category_id == null ? undefined : ref.catSlug[r.category_id], sub: r.subcategory_id == null ? undefined : ref.subSlug[r.subcategory_id],
    type: r.request_type || undefined, kind: r.location_kind || undefined, priority: r.priority || undefined, team: teamSlug[r.team_id], isDefault: r.is_default,
  }));
  const locById = Object.fromEntries(ref.raw.locations.map((l) => [l.id, l.name]));
  const users = rawUsers.map((u) => compact({
    id: String(u.id), name: u.name, email: u.email || '', role: u.role, title: u.title || '', department: u.department_id == null ? undefined : ref.deptSlug[u.department_id],
    teamIds: u.role === 'pic' ? usersByTeam[u.id] || [] : undefined, location: u.default_location_id == null ? undefined : locById[u.default_location_id], inactive: !u.is_active,
  }));
  const departments = {};
  Object.entries(ref.departments).forEach(([slug, d]) => { departments[slug] = { ...d, head: d.headUserId == null ? '' : userName[d.headUserId] || '' }; });
  return { teams, teamNum, rules, users, departments, userIdByName: Object.fromEntries(rawUsers.map((u) => [u.name, u.id])) };
}
