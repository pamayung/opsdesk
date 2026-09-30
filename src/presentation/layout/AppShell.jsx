import React from 'react';
import { LayoutDashboard, Inbox, PlusCircle, Search, Bell, Plus, ChevronDown, Check, Settings, BarChart3 } from 'lucide-react';
import { AppContext } from '../../app/AppContext';

// Nama menu antrean menyesuaikan peran: karyawan melihat tiketnya, PIC antreannya, dst.
const QUEUE_LABEL = { employee: 'My Tickets', pic: 'My Queue', manager: 'Department Queue', management: 'All Tickets', admin: 'All Tickets' };
const navFor = (role) => [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['tickets', QUEUE_LABEL[role] || 'Ticket Queue', Inbox],
  ['reports', 'Reports', BarChart3],
  ['report', 'Report Issue', PlusCircle],
  ...(role === 'admin' ? [['admin', 'Admin', Settings]] : []), // hanya administrator
];

export default class AppShell extends React.Component {
  static contextType = AppContext;
  state = { menu: false };
  render() {
    const { page, goTo, toast, container, user, query, setQuery, setUser } = this.context;
    const NAV = navFor(user.role);
    const app = container.app;
    const stats = container.getStats.execute(user, Date.now());
    const isActive = (k) => page === k || (k === 'tickets' && page === 'detail');
    const badge = stats.atRisk;
    return <div className="min-h-screen bg-[#f5f7f9] text-slate-900 print:bg-white" style={{ '--brand': app.brand }}>
      <header className="sticky top-0 z-30 print:hidden flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => goTo('dashboard')} className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" aria-label={`${app.name}, ke Dashboard`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-sm font-extrabold text-white">{app.name[0]}</span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">{app.name}</span>
        </button>
        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" aria-label="Cari tiket" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari tiket, area, reporter…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]" />
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button type="button" onClick={() => goTo('report')} className="hidden h-10 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3.5 text-sm font-semibold text-white hover:brightness-110 sm:inline-flex"><Plus className="h-4 w-4" aria-hidden="true" />Report Issue</button>
          <button type="button" onClick={() => goTo('tickets')} aria-label={badge ? `${badge} ticket${badge === 1 ? '' : 's'} at SLA risk, open queue` : 'Open ticket queue'} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
            {badge > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{badge}</span>}
          </button>
          <div className="relative">
            <button type="button" onClick={() => this.setState({ menu: !this.state.menu })} aria-haspopup="menu" aria-expanded={this.state.menu} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-slate-50">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand)] text-sm font-bold text-white" aria-hidden="true">{user.name[0]}</span>
              <span className="hidden text-left leading-tight lg:block"><span className="block text-sm font-semibold">{user.name}</span><span className="block text-xs text-slate-500">{container.roles[user.role].label} · {user.title}</span></span>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 lg:block" aria-hidden="true" />
            </button>
            {this.state.menu && (
              <div role="menu" className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-3 py-2 text-xs text-slate-500">Demo role: pilih user untuk melihat dashboard dan akses tiap role.</p>
                {container.users.map((u) => (
                  <button key={u.id} type="button" role="menuitemradio" aria-checked={u.id === user.id} onClick={() => { this.setState({ menu: false }); setUser(u.id); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{u.name}</span><span className="block text-xs text-slate-500">{container.roles[u.role].label} · {u.title}</span></span>
                    {u.id === user.id && <Check className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden print:hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <nav className="flex-1 space-y-1 p-3" aria-label="Menu utama">
          {NAV.map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => goTo(k)} aria-current={isActive(k) ? 'page' : undefined} className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium ${isActive(k) ? 'bg-emerald-50 text-[var(--brand)]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />{label}
              {k === 'tickets' && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{stats.active}</span>}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-baseline justify-between text-xs font-semibold text-slate-600"><span>SLA compliance</span><span className="tabular-nums text-[var(--brand)]">{stats.slaRate}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={stats.slaRate} aria-valuemin={0} aria-valuemax={100} aria-label="SLA compliance"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${stats.slaRate}%` }} /></div>
        </div>
      </aside>

      <div className="lg:pl-60 print:pl-0"><main className="min-w-0 p-4 pb-24 sm:p-6 lg:p-8 print:p-0">{this.props.children}</main></div>

      <nav aria-label="Menu utama" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }} className="fixed inset-x-0 bottom-0 z-30 grid print:hidden border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        {NAV.map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => goTo(k)} aria-current={isActive(k) ? 'page' : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive(k) ? 'text-[var(--brand)]' : 'text-slate-500'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
      {toast && <div role="status" className="print:hidden fixed bottom-20 left-1/2 z-40 w-[90%] max-w-md -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-xl lg:bottom-6">{toast}</div>}
    </div>;
  }
}
