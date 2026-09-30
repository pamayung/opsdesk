// DOMAIN: perhitungan laporan (murni). Semua hari dihitung dalam WIB (UTC+7, tanpa DST).
// Cakupan data mengikuti hak akses pengguna (canView), lalu filter atribut, lalu periode.
import { canView } from './Access';
import { PRIORITIES, REQUEST_TYPES, formatStamp } from './constants';

export const DAY = 86400000;
const WIB = 7 * 3600000;
export const startOfDay = (ts) => Math.floor((ts + WIB) / DAY) * DAY - WIB;

const parseDay = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null; // 31 Februari dll.
  return dt.getTime() - WIB;
};
// Periode [from, to). preset: 'today' | '7' | '30' | '90' | 'custom'. custom = { from, to } berformat YYYY-MM-DD (inklusif).
export const periodOf = (preset, now, custom = {}) => {
  if (preset === 'custom') {
    const f = parseDay(custom.from); const t = parseDay(custom.to);
    return f === null || t === null || t < f ? null : { from: f, to: t + DAY };
  }
  const days = preset === 'today' ? 1 : Number(preset);
  const today = startOfDay(now);
  return { from: today - (days - 1) * DAY, to: today + DAY };
};

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

// Ukuran ringkas untuk sekumpulan tiket.
export const kpis = (list, now) => {
  const done = list.filter((t) => t.status === 'done');
  const breached = list.filter((t) => t.wasBreached(now)).length;
  return {
    total: list.length,
    resolved: done.length,
    open: list.length - done.length,
    breached,
    slaRate: list.length ? pct(list.length - breached, list.length) : null,
    avgResponseMin: avg(list.map((t) => t.responseMin()).filter((m) => m !== null)),
    avgResolutionMin: avg(done.map((t) => t.resolutionMin()).filter((m) => m !== null)),
  };
};

const AGING = [['< 1 jam', 60], ['1–4 jam', 240], ['4–24 jam', 1440], ['1–3 hari', 4320], ['> 3 hari', Infinity]];

// tickets: seluruh tiket. f: { user, from, to, department, locationId, categoryId, priority, type } (nilai 'all' = tanpa filter).
// ctx: { now, locationIds(namaLokasi) -> id lokasi dari spesifik ke akar, names: { department(id), category(id), sub(kategori, sub) } }
export function buildReport(tickets, f, ctx) {
  const { now, locationIds, names } = ctx;
  const all = (v) => v === undefined || v === 'all' || v === '';
  const base = tickets.filter((t) => canView(f.user, t)
    && (all(f.department) || t.department === f.department)
    && (all(f.categoryId) || t.categoryId === f.categoryId)
    && (all(f.priority) || t.priority === f.priority)
    && (all(f.type) || t.type === f.type)
    && (all(f.locationId) || locationIds(t.branch).includes(f.locationId))); // lokasi induk mencakup turunannya
  const within = (ts, from, to) => ts >= from && ts < to;
  const len = f.to - f.from;
  const cohort = base.filter((t) => within(t.createdAt, f.from, f.to)); // tiket yang MASUK pada periode
  const prevCohort = base.filter((t) => within(t.createdAt, f.from - len, f.from));

  // Tren: harian (<= 31 hari) atau mingguan. "Selesai" dihitung menurut tanggal penyelesaian.
  const step = Math.round(len / DAY) <= 31 ? 1 : 7;
  const buckets = [];
  for (let s = f.from; s < f.to; s += step * DAY) {
    const e = Math.min(s + step * DAY, f.to);
    buckets.push({
      start: s, end: e,
      created: cohort.filter((t) => within(t.createdAt, s, e)).length,
      resolved: base.filter((t) => t.status === 'done' && t.resolution && within(t.resolution.closedAt, s, e)).length,
    });
  }

  const group = (list, keyFn, labelFn) => {
    const m = new Map();
    list.forEach((t) => { const k = keyFn(t); if (!m.has(k)) m.set(k, { key: k, list: [] }); m.get(k).list.push(t); });
    return [...m.values()].map((g) => ({ key: g.key, label: labelFn(g.key), ...kpis(g.list, now) }));
  };
  const byCount = (a, b) => b.total - a.total || String(a.label).localeCompare(String(b.label));
  const order = (keys) => (a, b) => keys.indexOf(a.key) - keys.indexOf(b.key);

  const open = base.filter((t) => t.status !== 'done'); // umur tiket terbuka saat ini (tidak dibatasi periode)
  const overshoot = (t) => (t.status === 'done' ? t.resolutionMin() - t.slaMinutes : -t.remainingMin(now));
  return {
    period: { from: f.from, to: f.to, days: Math.round(len / DAY) },
    kpi: kpis(cohort, now),
    prev: kpis(prevCohort, now),
    trend: { step, buckets },
    by: {
      department: group(cohort, (t) => t.department, names.department).sort(byCount),
      category: group(cohort, (t) => t.categoryId, names.category).sort(byCount),
      priority: group(cohort, (t) => t.priority, (k) => PRIORITIES[k].label).sort(order(Object.keys(PRIORITIES))),
      type: group(cohort, (t) => t.type, (k) => REQUEST_TYPES[k].label).sort(order(Object.keys(REQUEST_TYPES))),
      location: group(cohort, (t) => t.branch, (k) => k || '-').sort(byCount),
    },
    teams: group(cohort, (t) => (t.routing ? t.routing.team : ''), (k) => k || 'Tanpa rute').sort(byCount),
    pics: group(cohort, (t) => t.assignee || '', (k) => k || 'Belum diambil').sort(byCount),
    aging: AGING.map(([label, max], i) => {
      const min = i ? AGING[i - 1][1] : 0;
      const l = open.filter((t) => t.ageMin(now) >= min && t.ageMin(now) < max);
      return { label, count: l.length, atRisk: l.filter((t) => t.atRisk(now)).length };
    }),
    openNow: open.length,
    late: cohort.filter((t) => t.wasBreached(now)).sort((a, b) => overshoot(b) - overshoot(a)).slice(0, 10)
      .map((t) => ({ id: t.id, title: t.title, priority: t.priority, branch: t.branch, status: t.status, overshootMin: overshoot(t) })),
    tickets: [...cohort].sort((a, b) => b.createdAt - a.createdAt),
  };
}

// ---- Ekspor ----
export const EXPORT_HEADER = ['ID', 'Dibuat (WIB)', 'Jenis', 'Prioritas', 'Kategori', 'Subkategori', 'Lokasi', 'Area', 'Department', 'Tim', 'PIC', 'Status', 'Respons (menit)', 'Penyelesaian (menit)', 'Target SLA (menit)', 'SLA terlewat', 'Pelapor'];
const STATUS_TEXT = { open: 'Baru', in_progress: 'Sedang ditangani', done: 'Selesai' };
const round1 = (m) => (m === null ? '' : Math.round(m * 10) / 10);
export const exportRows = (tickets, ctx) => [EXPORT_HEADER, ...tickets.map((t) => [
  t.id, formatStamp(t.createdAt), REQUEST_TYPES[t.type].label, t.priority, ctx.names.category(t.categoryId), t.subId ? ctx.names.sub(t.categoryId, t.subId) : '',
  t.branch, t.location, ctx.names.department(t.department), t.routing ? t.routing.team : '', t.assignee || '', STATUS_TEXT[t.status],
  round1(t.responseMin()), round1(t.resolutionMin()), t.slaMinutes, t.wasBreached(ctx.now) ? 'Ya' : 'Tidak', t.reporter,
])];

// CSV aman: kutip bila perlu, dan awalan = + - @ pada TEKS diberi tanda petik agar tidak dieksekusi sebagai rumus di Excel.
export const toCsv = (rows) => {
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
};
