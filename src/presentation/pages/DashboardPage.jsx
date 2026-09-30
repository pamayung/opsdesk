import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import { Card, PriorityBadge, StatusBadge, SlaTimer } from '../components/ui';

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date()));
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
};
const TITLE = { employee: 'Tiket saya', pic: 'Antrean saya', manager: 'Department', management: 'Seluruh organisasi', admin: 'Seluruh organisasi' };
const hours = (h) => (h === null ? '-' : `${h.toFixed(1)} jam`);

export default class DashboardPage extends React.Component {
  static contextType = AppContext;

  stat(label, value, hint, tone = '') {
    return <Card key={label}><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></Card>;
  }

  // Daftar tiket ringkas; klik membuka detail.
  ticketList(title, subtitle, tickets, now, empty) {
    const { container, goTo } = this.context;
    const categories = container.listCategories.execute();
    const cat = (id) => (categories.find((c) => c.id === id) || {}).name || 'Umum';
    return (
      <Card className="overflow-hidden !p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-semibold text-slate-950">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div>
          <button type="button" onClick={() => goTo('tickets')} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">Lihat semua<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </div>
        <div className="divide-y divide-slate-100">
          {tickets.map((t) => (
            <button key={t.id} type="button" onClick={() => goTo('detail', t.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /><span className="text-xs text-slate-400">#{t.id}</span></div>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{t.title}</p>
                <p className="truncate text-xs text-slate-500">{t.routing ? `${t.routing.team} · ` : ''}{cat(t.categoryId)} · {t.branch}</p>
              </div>
              <SlaTimer ticket={t} now={now} />
            </button>
          ))}
          {!tickets.length && <p className="px-5 py-10 text-center text-sm text-slate-500">{empty}</p>}
        </div>
      </Card>
    );
  }

  renderEmployee(s, now) {
    const { container, user } = this.context;
    const all = container.listTickets.execute({ user, status: 'all' }, now);
    return <>
      <section className="grid grid-cols-3 gap-3">
        {this.stat('Terbuka', s.open, 'menunggu diambil PIC')}
        {this.stat('Sedang ditangani', s.inProgress, 'sudah ada PIC', 'text-amber-600')}
        {this.stat('Selesai', s.resolved, 'sudah ditutup', 'text-emerald-700')}
      </section>
      {this.ticketList('Tiket saya', 'Yang masih berjalan tampil lebih dulu', all.slice(0, 6), now, 'Anda belum membuat tiket. Ada kendala atau butuh bantuan? Buat tiket dari tombol di atas.')}
    </>;
  }

  renderPic(s, now) {
    const { container, user } = this.context;
    const attention = container.listTickets.execute({ user, status: 'active' }, now);
    const ordered = [...attention.filter((t) => t.atRisk(now)), ...attention.filter((t) => !t.atRisk(now))].slice(0, 6);
    const P = s.byPriority;
    return <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {this.stat('Kritis (P1)', P.P1, 'ditangani sekarang', 'text-red-600')}
        {this.stat('Tinggi (P2)', P.P2, 'hari ini', 'text-orange-600')}
        {this.stat('Sedang (P3)', P.P3, 'antrean berjalan', 'text-blue-700')}
        {this.stat('Rendah (P4)', P.P4, 'bisa dijadwalkan', 'text-slate-700')}
      </section>
      {this.ticketList('Antrean saya', `${s.open} belum diambil · ${s.atRisk} berisiko SLA`, ordered, now, 'Tidak ada tiket aktif di antrean Anda.')}
    </>;
  }

  renderManager(s, now) {
    const { container, user, goTo } = this.context;
    const teams = container.getTeamQueues.execute(user, now);
    const active = container.listTickets.execute({ user, status: 'active' }, now);
    const ordered = [...active.filter((t) => t.atRisk(now)), ...active.filter((t) => !t.atRisk(now))].slice(0, 5);
    return <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {this.stat('Tiket terbuka', s.active, `${s.open} belum diambil`)}
        {this.stat('SLA terlewat', s.breached, 'termasuk yang sudah selesai', 'text-red-600')}
        {this.stat('Kritis (P1)', s.byPriority.P1, 'masih aktif', 'text-orange-600')}
        {this.stat('Rata-rata penyelesaian', hours(s.avgResolutionHours), `dari ${s.resolved} tiket selesai`)}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {this.ticketList('Perlu perhatian', 'Diurutkan dari batas SLA paling dekat', ordered, now, 'Tidak ada tiket aktif di department Anda.')}
        <Card>
          <h2 className="font-semibold text-slate-950">Antrean per tim</h2><p className="text-xs text-slate-500">Tim di department Anda</p>
          <ul className="mt-4 space-y-1">
            {teams.map((q) => (
              <li key={q.id}><button type="button" onClick={() => goTo('tickets')} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50">
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900">{q.name}</span>
                  <span className="block text-xs text-slate-500">{q.count === 0 ? 'Tidak ada antrean' : <><span className={q.risk ? 'font-medium text-red-600' : ''}>{q.risk} berisiko SLA</span>{q.waiting > 0 && ` · ${q.waiting} belum diambil`}</>}</span></span>
                <span className="text-sm font-bold tabular-nums text-slate-900">{q.count}</span>
              </button></li>
            ))}
          </ul>
        </Card>
      </section>
    </>;
  }

  renderManagement(s, now) {
    const { container, user, goTo, setDept } = this.context;
    const depts = container.getDepartmentQueues.execute(user, now);
    const max = Math.max(1, ...depts.map((d) => d.total));
    const active = container.listTickets.execute({ user, status: 'active' }, now);
    const ordered = [...active.filter((t) => t.atRisk(now)), ...active.filter((t) => !t.atRisk(now))].slice(0, 5);
    return <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {this.stat('Total tiket', s.total.toLocaleString('id-ID'), 'seluruh organisasi')}
        {this.stat('Terbuka', s.active.toLocaleString('id-ID'), `${s.inProgress} sedang ditangani`, 'text-amber-600')}
        {this.stat('SLA terlewat', s.breached.toLocaleString('id-ID'), `kepatuhan ${s.slaRate}%`, 'text-red-600')}
        {this.stat('Selesai', s.resolved.toLocaleString('id-ID'), `rata-rata ${hours(s.avgResolutionHours)}`, 'text-emerald-700')}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {this.ticketList('Perlu perhatian', 'Diurutkan dari batas SLA paling dekat', ordered, now, 'Tidak ada tiket aktif.')}
        <Card>
          <h2 className="font-semibold text-slate-950">Tiket per department</h2><p className="text-xs text-slate-500">Total tiket dan yang masih terbuka</p>
          <ul className="mt-4 space-y-1">
            {depts.map((d) => (
              <li key={d.id}><button type="button" onClick={() => { setDept(d.id); goTo('tickets'); }} className="w-full rounded-xl p-2.5 text-left hover:bg-slate-50">
                <span className="flex items-baseline justify-between gap-3"><span className="text-sm font-medium text-slate-900">{d.name}</span><span className="text-sm font-bold tabular-nums text-slate-900">{d.total}</span></span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${(d.total / max) * 100}%` }} /></span>
                <span className="mt-1 block text-xs text-slate-500">{d.count} terbuka{d.risk > 0 && <span className="font-medium text-red-600"> · {d.risk} berisiko SLA</span>}</span>
              </button></li>
            ))}
          </ul>
        </Card>
      </section>
    </>;
  }

  render() {
    const { container, goTo, user } = this.context;
    const now = Date.now();
    const s = container.getStats.execute(user, now);
    const body = { employee: this.renderEmployee, pic: this.renderPic, manager: this.renderManager, management: this.renderManagement, admin: this.renderManagement }[user.role] || this.renderEmployee;
    const dept = user.role === 'manager' ? container.departments[user.department].name : '';
    return <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{greeting()}, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-slate-600">{TITLE[user.role]}{dept ? ` ${dept}` : ''} · {container.roles[user.role].label}</p>
        </div>
        <button type="button" onClick={() => goTo('report')} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110"><Plus className="h-4 w-4" aria-hidden="true" />Buat Tiket</button>
      </header>
      {body.call(this, s, now)}
    </div>;
  }
}
