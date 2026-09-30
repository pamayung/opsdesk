import React from 'react';
import { Gauge } from 'lucide-react';
import { PRIORITIES, formatDuration } from '../../../domain/constants';

export default class ResponseCard extends React.Component {
  render() {
    const { ticket: t, now } = this.props;
    const target = PRIORITIES[t.priority];
    const resp = t.responseMin();
    let value, badge, tone;
    if (resp !== null) {
      const ok = resp <= t.respondTarget;
      value = formatDuration(resp); badge = ok ? 'Optimal' : 'Melewati target'; tone = ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
    } else {
      const late = t.ageMin(now) > t.respondTarget;
      value = `Menunggu respons · ${formatDuration(t.ageMin(now))}`; badge = late ? 'Terlambat' : 'Menunggu'; tone = late ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800';
    }
    return (
      <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Waktu respons">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Gauge className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">Waktu Respons</p>
          <p className="text-sm text-slate-600">{value} <span className="text-slate-400">(target: &lt; {target.respondText})</span></p>
        </div>
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${tone}`}>{badge}</span>
      </section>
    );
  }
}
