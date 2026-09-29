import React from 'react';
import { AppContext } from '../../app/AppContext';
import TicketCard from '../components/TicketCard';
import { Card } from '../components/ui';

const STATUS_TABS = [['active', 'Aktif'], ['in_progress', 'Dikerjakan'], ['done', 'Selesai'], ['all', 'Semua']];

export default class TicketListPage extends React.Component {
  static contextType = AppContext;
  state = { query: '', category: 'all', status: 'active', now: Date.now() };

  componentDidMount() { this.timer = setInterval(() => this.setState({ now: Date.now() }), 15000); }
  componentWillUnmount() { clearInterval(this.timer); }

  advance = (id) => {
    this.context.container.advanceTicket.execute(id, this.context.actor);
    this.setState({ now: Date.now() });
  };

  renderStat(label, value, hint, tone = 'text-slate-900') {
    return (
      <Card className="!p-3 sm:!p-4">
        <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${tone}`}>{value}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </Card>
    );
  }

  render() {
    const { container } = this.context;
    const { query, category, status, now } = this.state;
    const categories = container.listCategories.execute();
    const nameOf = (id) => (categories.find((c) => c.id === id) || {}).name;
    const tickets = container.listTickets.execute({ query, category, status }, now);
    const s = container.getStats.execute(now);
    const chip = (active) => `shrink-0 rounded-full px-3 py-2 text-sm font-medium transition ${active ? 'bg-[var(--brand)] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`;

    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Daftar tiket</h1>
          <p className="text-sm text-slate-600">Diurutkan dari batas waktu (SLA) yang paling mendesak. Diperbarui tiap 15 detik.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {this.renderStat('Tiket aktif', s.active, 'perlu penyelesaian')}
          {this.renderStat('Kritis / lewat SLA', s.critical, 'tindak segera', s.critical ? 'text-red-600' : 'text-slate-900')}
          {this.renderStat('Sedang dikerjakan', s.inProgress, 'sedang ditangani')}
          {this.renderStat('Selesai', s.done, `SLA terjaga ${s.slaRate}%`, 'text-emerald-700')}
        </div>

        <div className="space-y-3">
          <input type="search" value={query} onChange={(e) => this.setState({ query: e.target.value })}
            placeholder="Cari ID, masalah, lokasi, pelapor, atau PIC" aria-label="Cari tiket"
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Status">
            {STATUS_TABS.map(([k, l]) => <button key={k} className={chip(status === k)} onClick={() => this.setState({ status: k })}>{l}</button>)}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Kategori">
            <button className={chip(category === 'all')} onClick={() => this.setState({ category: 'all' })}>Semua kategori</button>
            {categories.map((c) => <button key={c.id} className={chip(category === c.id)} onClick={() => this.setState({ category: c.id })}>{c.name}</button>)}
          </div>
        </div>

        <div className="space-y-3">
          {tickets.map((t) => <TicketCard key={t.id} ticket={t} now={now} categoryName={nameOf(t.categoryId)} onAdvance={this.advance} />)}
          {!tickets.length && (
            <Card className="py-10 text-center">
              <p className="font-semibold text-slate-800">Tidak ada tiket yang cocok</p>
              <p className="mt-1 text-sm text-slate-600">Ubah filter, atau laporkan masalah baru lewat menu Lapor.</p>
            </Card>
          )}
        </div>
      </div>
    );
  }
}
