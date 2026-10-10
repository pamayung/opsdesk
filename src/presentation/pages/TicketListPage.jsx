import React from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import { canHandle } from '../../domain/Access';
import TicketCard from '../components/TicketCard';
import { Card } from '../components/ui';

const STATUS_TABS = [['active', 'Active'], ['in_progress', 'In Progress'], ['done', 'Resolved'], ['all', 'All']];
const TITLE = { employee: 'My Tickets', pic: 'My Queue', manager: 'Department Queue', management: 'All Tickets', admin: 'All Tickets' };
const SUBTITLE = { employee: 'Tiket yang Anda laporkan.', pic: 'Tiket yang masuk ke team Anda atau di-assign kepada Anda.', manager: 'Semua tiket di department Anda.', management: 'Seluruh organisasi (hanya lihat).', admin: 'Seluruh organisasi (hanya lihat).' };
const ASSIGN_TABS = [['all', 'All PIC'], ['mine', 'Mine'], ['unassigned', 'Unassigned']];
const PAGE = 20;
const POLL_MS = 15000;

// Daftar tiket diambil dari server per halaman, dengan filter, pencarian, dan urutan SLA dihitung server.
export default class TicketListPage extends React.Component {
  static contextType = AppContext;
  state = { category: 'all', status: 'active', assignment: 'all', attention: false, now: Date.now(), items: [], meta: null, loading: true, loadingMore: false, error: '' };
  componentDidMount() {
    this.mounted = true; this.last = this.filterKey();
    this.timer = setInterval(() => { this.setState({ now: Date.now() }); }, 15000);
    this.poll = setInterval(() => this.load({ keep: true }), POLL_MS);
    this.load();
  }
  componentDidUpdate() {
    const k = this.filterKey();
    if (k !== this.last) { this.last = k; clearTimeout(this.debounce); this.debounce = setTimeout(() => this.load(), 250); } // pencarian diketik: tunda sebentar
  }
  componentWillUnmount() { this.mounted = false; clearInterval(this.timer); clearInterval(this.poll); clearTimeout(this.debounce); }
  filterKey() { const { query, dept } = this.context; const { category, status, assignment, attention } = this.state; return JSON.stringify([query, dept, category, status, assignment, attention]); }
  filters(page = 1, pageSize = PAGE) {
    const { query, dept, user } = this.context; const { category, status, assignment, attention } = this.state;
    return { query, status, category, assignment, attention, department: user.role === 'management' || user.role === 'admin' ? dept : 'all', page, pageSize };
  }
  // keep: segarkan otomatis (muat ulang sebanyak yang sudah tampil, tanpa mengembalikan scroll/halaman)
  load = async ({ keep = false } = {}) => {
    const req = (this.req = (this.req || 0) + 1);
    const size = keep ? Math.min(100, Math.max(PAGE, this.state.items.length)) : PAGE;
    try {
      const { items, meta } = await this.context.container.tickets.list(this.filters(1, size));
      if (this.mounted && req === this.req) this.setState({ items, meta, loading: false, error: '' });
    } catch (err) { if (this.mounted && req === this.req) this.setState({ loading: false, error: err.message }); }
  };
  loadMore = async () => {
    const meta = this.state.meta; if (!meta) return;
    this.setState({ loadingMore: true });
    try {
      const { items, meta: m } = await this.context.container.tickets.list(this.filters(meta.page + 1));
      if (this.mounted) this.setState((s) => ({ items: [...s.items, ...items.filter((t) => !s.items.some((x) => x.id === t.id))], meta: m, loadingMore: false }));
    } catch (err) { if (this.mounted) this.setState({ loadingMore: false, error: err.message }); }
  };
  open = (id) => this.context.goTo('detail', id);
  take = async (id) => {
    const { container, notify, refresh } = this.context;
    try { await container.tickets.take(id); notify(`Tiket ${id} di-take. Assign PIC dari halaman detail.`); refresh(); this.load({ keep: true }); }
    catch (err) { notify(err.message); }
  };
  render() {
    const { container, query, setQuery, dept, setDept, user } = this.context;
    const role = user.role;
    const { category, status, assignment, attention, now, items, meta, loading, loadingMore, error } = this.state;
    const categories = container.listCategories.execute();
    const nameOf = (id) => (categories.find((c) => c.id === id) || {}).name;
    const s = container.stats;
    const chip = (a) => `rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap ${a ? 'bg-[var(--brand)] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`;
    return <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{TITLE[role]}</h1>
        <p className="mt-1 text-sm text-slate-600">{SUBTITLE[role]} Diurutkan dari SLA deadline yang paling dekat.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><p className="text-xs text-slate-500">Open tickets</p><p className="mt-1 text-2xl font-bold">{s.active}</p></Card>
        <Card><p className="text-xs text-slate-500">Critical / SLA risk</p><p className="mt-1 text-2xl font-bold text-red-600">{s.atRisk}</p></Card>
        <Card><p className="text-xs text-slate-500">In progress</p><p className="mt-1 text-2xl font-bold text-amber-600">{s.inProgress}</p></Card>
        <Card><p className="text-xs text-slate-500">SLA compliance</p><p className="mt-1 text-2xl font-bold text-emerald-700">{s.slaRate}%</p></Card>
      </div>
      <Card className="!p-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" aria-label="Cari tiket" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nomor tiket, judul, area, reporter, PIC…" className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto">{STATUS_TABS.map(([k, l]) => <button key={k} type="button" aria-pressed={status === k} className={chip(status === k)} onClick={() => this.setState({ status: k })}>{l}</button>)}</div>
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          <button type="button" aria-pressed={attention} className={`inline-flex items-center gap-1.5 ${attention ? 'rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white' : 'rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200'}`} onClick={() => this.setState({ attention: !attention })}><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />SLA attention</button>
          {(role === 'pic' || role === 'manager') && <><span className="mx-1 h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
          {ASSIGN_TABS.map(([k, l]) => <button key={k} type="button" aria-pressed={assignment === k} className={chip(assignment === k)} onClick={() => this.setState({ assignment: k })}>{l}</button>)}</>}
        </div>
        {(role === 'management' || role === 'admin') && <div className="mt-3 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          <button type="button" aria-pressed={dept === 'all'} className={chip(dept === 'all')} onClick={() => setDept('all')}>Semua department</button>
          {Object.entries(container.departments).map(([id, d]) => <button key={id} type="button" aria-pressed={dept === id} className={chip(dept === id)} onClick={() => setDept(id)}>{d.name}</button>)}
        </div>}
        <div className="mt-3 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          <button type="button" aria-pressed={category === 'all'} className={chip(category === 'all')} onClick={() => this.setState({ category: 'all' })}>Semua kategori</button>
          {categories.map((c) => <button key={c.id} type="button" aria-pressed={category === c.id} className={chip(category === c.id)} onClick={() => this.setState({ category: c.id })}>{c.name}</button>)}
        </div>
      </Card>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="text-xs text-slate-500" data-testid="list-count">{loading ? 'Memuat tiket…' : `${items.length} dari ${meta ? meta.total : 0} tiket ditampilkan · diperbarui otomatis tiap 15 detik`}</p>
      <div className="space-y-3">
        {items.map((t) => <TicketCard key={t.id} ticket={t} now={now} categoryName={nameOf(t.categoryId)} departmentName={(container.departments[t.department] || {}).name} canTake={canHandle(user)} onOpen={this.open} onTake={this.take} />)}
        {!loading && !items.length && <Card className="py-12 text-center"><p className="font-semibold">Tidak ada tiket</p><p className="mt-1 text-sm text-slate-500">Tidak ada tiket yang cocok dengan filter atau pencarian ini.</p></Card>}
        {meta && items.length < meta.total && <button type="button" onClick={this.loadMore} disabled={loadingMore} className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-[var(--brand)] ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">{loadingMore ? 'Memuat…' : `Muat ${Math.min(PAGE, meta.total - items.length)} tiket lagi`}</button>}
      </div>
    </div>;
  }
}
