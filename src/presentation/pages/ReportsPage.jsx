import React from 'react';
import { Download, Printer, RotateCcw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import { PRIORITIES, REQUEST_TYPES, formatDuration, formatCompact } from '../../domain/constants';
import { periodOf, exportRows, toCsv, DAY } from '../../domain/Report';
import { pathText } from '../../domain/Location';
import { Card, PriorityBadge } from '../components/ui';
import { TrendChart, BarList, dayLabel } from '../components/charts';
import { downloadText } from '../utils/download';

const PRESETS = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['custom', 'Custom']];
const DEFAULTS = { preset: '30', from: '', to: '', department: 'all', locationId: 'all', categoryId: 'all', priority: 'all', type: 'all' };
const SCOPE = { employee: 'Tiket yang Anda laporkan', pic: 'Tiket team Anda dan yang di-assign kepada Anda', manager: 'Seluruh tiket department Anda', management: 'Seluruh organisasi', admin: 'Seluruh organisasi' };
const sel = 'min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]';
const fmtFull = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const ymd = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(ts);
const dur = (m) => (m === null ? '-' : formatCompact(m));
// Perbandingan dengan periode sebelumnya hanya bermakna bila datanya cukup.
const MIN_PREV = 5;

// Selisih terhadap periode sebelumnya. good: null = netral, true = membaik, false = memburuk.
const delta = (cur, prev, { lowerBetter = false, points = false, neutral = false } = {}) => {
  if (cur === null || prev === null) return null;
  if (points) { const d = Math.round((cur - prev) * 10) / 10; return { text: `${d > 0 ? '+' : ''}${d} poin`, good: d === 0 ? null : d > 0 }; }
  if (prev === 0) return { text: cur === 0 ? 'same' : 'new', good: null };
  const p = Math.round(((cur - prev) / prev) * 100);
  return { text: `${p > 0 ? '+' : ''}${p}%`, good: neutral || p === 0 ? null : lowerBetter ? p < 0 : p > 0 };
};

export default class ReportsPage extends React.Component {
  static contextType = AppContext;
  state = { ...DEFAULTS };
  set = (k) => (e) => this.setState({ [k]: e.target.value });

  period(now) {
    const s = this.state;
    return periodOf(s.preset, now, { from: s.from, to: s.to });
  }
  exportCsv = (report, now) => {
    const { container } = this.context;
    const rows = exportRows(report.tickets, { now, names: container.reportNames });
    downloadText(`report-opsdesk-${ymd(report.period.from)}-sd-${ymd(report.period.to - DAY)}.csv`, toCsv(rows));
  };

  kpiCard(label, value, hint, d, key) {
    const tone = !d || d.good === null ? 'text-slate-500' : d.good ? 'text-emerald-700' : 'text-red-600';
    const Icon = !d || d.good === null ? Minus : d.good ? ArrowUpRight : ArrowDownRight;
    return (
      <Card key={key} className="break-inside-avoid">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
        {d && <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${tone}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{d.text}<span className="font-normal text-slate-500"> vs previous period</span></p>}
      </Card>
    );
  }

  perfTable(title, rows, firstCol) {
    return (
      <Card className="break-inside-avoid !p-0">
        <h2 className="px-5 pt-4 font-semibold text-slate-950">{title}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-600"><tr>
              <th className="px-5 py-2 font-semibold">{firstCol}</th><th className="px-3 py-2 text-right font-semibold">Created</th><th className="px-3 py-2 text-right font-semibold">Resolved</th><th className="px-3 py-2 text-right font-semibold">Breached</th><th className="px-3 py-2 text-right font-semibold">Compliance</th><th className="px-3 py-2 text-right font-semibold">Response</th><th className="px-5 py-2 text-right font-semibold">Resolution</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key || '-'} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-slate-900">{r.label}</td><td className="px-3 py-2.5 text-right tabular-nums">{r.total}</td><td className="px-3 py-2.5 text-right tabular-nums">{r.resolved}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r.breached ? 'font-semibold text-red-600' : ''}`}>{r.breached}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.slaRate === null ? '-' : `${r.slaRate}%`}</td><td className="px-3 py-2.5 text-right tabular-nums">{dur(r.avgResponseMin)}</td><td className="px-5 py-2.5 text-right tabular-nums">{dur(r.avgResolutionMin)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  render() {
    const { container, user, goTo } = this.context;
    const now = Date.now();
    const s = this.state;
    const nodes = container.listLocations.execute();
    const cats = container.listCategories.execute();
    const p = this.period(now);
    const report = p ? container.getReport.execute(user, { ...p, department: s.department, locationId: s.locationId, categoryId: s.categoryId, priority: s.priority, type: s.type }, now) : null;
    const canDept = user.role === 'management' || user.role === 'admin';
    const filtered = ['department', 'locationId', 'categoryId', 'priority', 'type'].some((k) => s[k] !== 'all');
    const k = report && report.kpi;
    const pv = report && report.prev;
    const hasPrev = !!report && pv.total >= MIN_PREV;
    const D = (d) => (hasPrev ? d : null);
    const periodText = p ? `${fmtFull.format(p.from)} – ${fmtFull.format(p.to - DAY)}` : '';
    const chip = (a) => `min-h-[40px] rounded-full px-4 text-sm font-semibold ${a ? 'bg-[var(--brand)] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`;

    return <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">{SCOPE[user.role]}.{periodText && <> Periode <span className="font-medium text-slate-800">{periodText}</span>.</>}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" disabled={!report || !report.tickets.length} onClick={() => this.exportCsv(report, now)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" aria-hidden="true" />Download CSV</button>
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200"><Printer className="h-4 w-4" aria-hidden="true" />Print / PDF</button>
        </div>
      </header>

      <Card className="print:hidden">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Periode">
          {PRESETS.map(([id, label]) => <button key={id} type="button" aria-pressed={s.preset === id} onClick={() => this.setState({ preset: id })} className={chip(s.preset === id)}>{label}</button>)}
          {s.preset === 'custom' && (
            <span className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <label className="flex items-center gap-2">Dari<input type="date" aria-label="Tanggal mulai" className={`${sel} !w-auto`} value={s.from} onChange={this.set('from')} /></label>
              <label className="flex items-center gap-2">sampai<input type="date" aria-label="Tanggal akhir" className={`${sel} !w-auto`} value={s.to} onChange={this.set('to')} /></label>
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {canDept && <label className="text-xs font-medium text-slate-600">Department<select className={`${sel} mt-1`} value={s.department} onChange={this.set('department')}><option value="all">Semua</option>{Object.entries(container.departments).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}</select></label>}
          <label className="text-xs font-medium text-slate-600">Lokasi (termasuk turunannya)<select className={`${sel} mt-1`} value={s.locationId} onChange={this.set('locationId')}><option value="all">Semua lokasi</option>{nodes.map((n) => <option key={n.id} value={n.id}>{pathText(nodes, n.id)}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">Kategori<select className={`${sel} mt-1`} value={s.categoryId} onChange={this.set('categoryId')}><option value="all">Semua</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">Priority<select className={`${sel} mt-1`} value={s.priority} onChange={this.set('priority')}><option value="all">Semua</option>{Object.entries(PRIORITIES).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">Type<select className={`${sel} mt-1`} value={s.type} onChange={this.set('type')}><option value="all">Semua</option>{Object.entries(REQUEST_TYPES).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}</select></label>
        </div>
        {(filtered || s.preset !== '30') && <button type="button" onClick={() => this.setState({ ...DEFAULTS })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-[var(--brand)] hover:underline"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Reset filter</button>}
      </Card>
      {filtered && <p className="hidden text-sm text-slate-600 print:block">Filter aktif diterapkan pada report ini.</p>}

      {!report && <Card className="py-10 text-center"><p className="font-semibold text-slate-900">Tanggal belum valid</p><p className="mt-1 text-sm text-slate-500">Isi tanggal mulai dan akhir. Tanggal akhir tidak boleh sebelum tanggal mulai.</p></Card>}

      {report && k.total === 0 && (
        <Card className="py-10 text-center"><p className="font-semibold text-slate-900">Tidak ada tiket pada periode dan filter ini</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Coba periode yang lebih panjang atau kurangi filter. Untuk demo, sample history 60 days bisa dimuat dari halaman Admin.</p></Card>
      )}

      {report && k.total > 0 && <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-label="Summary">
          {this.kpiCard('Tickets created', k.total, `${report.period.days} days`, D(delta(k.total, pv.total, { neutral: true })), 'a')}
          {this.kpiCard('Resolved', k.resolved, `${Math.round((k.resolved / k.total) * 100)}% of created tickets`, D(delta(k.resolved, pv.resolved)), 'b')}
          {this.kpiCard('Still open', k.open, `${report.openNow} open now (all periods)`, null, 'c')}
          {this.kpiCard('SLA compliance', k.slaRate === null ? '-' : `${k.slaRate}%`, `${k.breached} breached tickets`, D(delta(k.slaRate, pv.slaRate, { points: true })), 'd')}
          {this.kpiCard('Average response', dur(k.avgResponseMin), 'until taken by PIC', D(delta(k.avgResponseMin, pv.avgResponseMin, { lowerBetter: true })), 'e')}
          {this.kpiCard('Average resolution', dur(k.avgResolutionMin), `dari ${k.resolved} resolved tickets`, D(delta(k.avgResolutionMin, pv.avgResolutionMin, { lowerBetter: true })), 'f')}
        </section>
        {!hasPrev && <p className="-mt-2 text-xs text-slate-500">Perbandingan dengan periode sebelumnya disembunyikan karena periode itu hanya punya {pv.total} tiket (minimal {MIN_PREV}).</p>}

        <Card className="break-inside-avoid">
          <h2 className="font-semibold text-slate-950">Ticket trend</h2>
          <p className="mb-3 text-xs text-slate-500">Created menurut tanggal dibuat; Resolved menurut tanggal di-resolve.</p>
          <TrendChart buckets={report.trend.buckets} weekly={report.trend.step === 7} />
        </Card>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Breakdown">
          <Card className="break-inside-avoid"><h2 className="mb-3 font-semibold text-slate-950">Per department</h2><BarList rows={report.by.department} limit={15} /></Card>
          <Card className="break-inside-avoid"><h2 className="mb-3 font-semibold text-slate-950">Per kategori</h2><BarList rows={report.by.category} limit={15} /></Card>
          <Card className="break-inside-avoid"><h2 className="mb-3 font-semibold text-slate-950">Per lokasi</h2><BarList rows={report.by.location} /></Card>
          <Card className="break-inside-avoid"><h2 className="mb-3 font-semibold text-slate-950">Per priority</h2><BarList rows={report.by.priority} /></Card>
          <Card className="break-inside-avoid"><h2 className="mb-3 font-semibold text-slate-950">Per request type</h2><BarList rows={report.by.type} /></Card>
          <Card className="break-inside-avoid">
            <h2 className="font-semibold text-slate-950">Open ticket aging</h2><p className="mb-3 text-xs text-slate-500">Kondisi saat ini, {report.openNow} tiket</p>
            <ul className="space-y-3">{report.aging.map((a) => (
              <li key={a.label}><div className="flex items-baseline justify-between text-sm"><span className="font-medium text-slate-800">{a.label}</span><span className="tabular-nums"><span className="font-bold text-slate-900">{a.count}</span>{a.atRisk > 0 && <span className="ml-2 text-xs font-medium text-red-600">{a.atRisk} at SLA risk</span>}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-amber-500" style={{ width: `${report.openNow ? (a.count / report.openNow) * 100 : 0}%` }} /></div></li>
            ))}</ul>
          </Card>
        </section>

        {this.perfTable('Team performance', report.teams, 'Team')}
        {this.perfTable('PIC workload & performance', report.pics, 'PIC')}

        <Card className="break-inside-avoid !p-0">
          <div className="px-5 pt-4"><h2 className="font-semibold text-slate-950">SLA breached tickets</h2><p className="text-xs text-slate-500">Diurutkan dari yang paling lama melewati batas ({report.late.length} teratas).</p></div>
          <ul className="mt-3 divide-y divide-slate-100">
            {report.late.map((t) => (
              <li key={t.id}><button type="button" onClick={() => goTo('detail', t.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 print:hover:bg-transparent">
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><PriorityBadge priority={t.priority} /><span className="text-xs text-slate-400">#{t.id}</span></span><span className="mt-1 block truncate text-sm font-semibold text-slate-900">{t.title}</span><span className="block text-xs text-slate-500">{t.branch}</span></span>
                <span className="shrink-0 text-right text-xs font-semibold text-red-600">Overdue {formatDuration(t.overshootMin)}<span className="block font-normal text-slate-500">{t.status === 'done' ? 'sudah resolved' : 'belum resolved'}</span></span>
              </button></li>
            ))}
            {!report.late.length && <li className="px-5 py-8 text-center text-sm text-slate-500">Tidak ada tiket yang melewati SLA pada periode ini.</li>}
          </ul>
        </Card>
      </>}
    </div>;
  }
}
