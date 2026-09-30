import React from 'react';
import { Phone, Navigation, UserPlus, Zap, ArrowRight } from 'lucide-react';
import { DISPATCH, formatTime } from '../../../domain/constants';

const ETA_OPTIONS = [5, 10, 15, 30];
const card = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6';
const secondary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50';
const primary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50';
const initials = (name) => { const w = name.trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase(); };

export default class DispatchPanel extends React.Component {
  state = { techId: '', eta: '10', error: '' };
  assign = () => {
    const tech = this.props.technicians.find((t) => t.id === this.state.techId);
    this.setState({ error: this.props.onAssign(tech) || '' });
  };
  advance = () => this.setState({ error: this.props.onAdvance({ etaMin: Number(this.state.eta) }) || '' });

  statusText(d, now) {
    if (d.status === 'en_route') {
      if (!d.etaAt) return 'Menuju lokasi';
      const left = Math.ceil((d.etaAt - now) / 60000);
      return left > 0 ? `Menuju lokasi · Estimasi tiba ${left} menit` : 'Menuju lokasi · Melewati estimasi tiba';
    }
    if (d.status === 'on_site') return `Di lokasi sejak ${formatTime(d.updatedAt)}`;
    return 'Ditugaskan · Belum berangkat';
  }

  render() {
    const { ticket: t, now, technicians, actions, onAction } = this.props;
    const { techId, eta, error } = this.state;
    const d = t.dispatch;
    const done = t.status === 'done';
    if (done && !d) return null;
    const step = d && DISPATCH[d.status];
    return (
      <section className={card} aria-labelledby="dispatch-title">
        <h2 id="dispatch-title" className="flex items-center gap-2 text-lg font-bold text-slate-950"><Navigation className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />Status Dispatch Teknisi</h2>

        {!d && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">Belum ada teknisi yang ditugaskan.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="tech-select">Pilih teknisi</label>
              <select id="tech-select" value={techId} onChange={(e) => this.setState({ techId: e.target.value, error: '' })} className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]">
                <option value="">Pilih teknisi…</option>
                {technicians.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.role}</option>)}
              </select>
              <button type="button" onClick={this.assign} disabled={!techId} className={primary}><UserPlus className="h-4 w-4" aria-hidden="true" />Tugaskan</button>
            </div>
          </div>
        )}

        {d && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-700 text-sm font-bold text-white" aria-hidden="true">{initials(d.name)}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-950">{d.name}<span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600">{d.role}</span></p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--brand)]">{done ? 'Penugasan selesai' : this.statusText(d, now)}</p>
                </div>
              </div>
              <a href={`tel:${d.phone}`} className={primary}><Phone className="h-4 w-4" aria-hidden="true" />Hubungi</a>
            </div>
            {!done && step.next && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center">
                {d.status === 'assigned' && (
                  <label className="flex items-center gap-2 text-sm text-slate-600">Estimasi tiba
                    <select value={eta} onChange={(e) => this.setState({ eta: e.target.value })} className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]">
                      {ETA_OPTIONS.map((m) => <option key={m} value={m}>{m} menit</option>)}
                    </select>
                  </label>
                )}
                <button type="button" onClick={this.advance} className={`${secondary} sm:ml-auto`}>{step.action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!done && actions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Aksi cepat</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {actions.map((a) => <button key={a} type="button" onClick={() => onAction(a)} className={`${secondary} justify-start text-left`}><Zap className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />{a}</button>)}
            </div>
            <p className="mt-2 text-xs text-slate-500">Aksi yang dijalankan otomatis tercatat di catatan penanganan.</p>
          </div>
        )}
      </section>
    );
  }
}
