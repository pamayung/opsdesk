import React from 'react';
import { Tag, MapPin, User, Paperclip, AlertTriangle, Building2 } from 'lucide-react';
import { REQUEST_TYPES } from '../../domain/constants';
import { PriorityBadge, StatusBadge, SlaTimer, Button } from './ui';

export default class TicketCard extends React.PureComponent {
  render() {
    const { ticket: t, now, categoryName, departmentName, canTake, onOpen, onTake } = this.props;
    const esc = t.escalationLevel(now);
    const level = t.slaLevel(now);
    const urgent = level === 'critical' || level === 'breached';
    return (
      <article className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${urgent ? 'border-red-200 border-l-4 border-l-red-500' : 'border-slate-200'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={t.priority} /><StatusBadge status={t.status} />
              <span className="text-xs text-slate-400">#{t.id}</span>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${REQUEST_TYPES[t.type].tone}`}>{REQUEST_TYPES[t.type].label}</span>
              {esc > 0 && <span className="rounded-full bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-700">Eskalasi L{esc}</span>}
              {urgent && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"><AlertTriangle className="h-3 w-3" aria-hidden="true" />Perlu perhatian</span>}
              {t.escalation && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Eskalasi vendor</span>}
            </div>
            <h3 className="mt-2 break-words text-base font-semibold text-slate-950">
              <button type="button" onClick={() => onOpen(t.id)} className="text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">{t.title}</button>
            </h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" aria-hidden="true" />{categoryName || 'Umum'}</span>
              {departmentName && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" aria-hidden="true" />{departmentName}{t.routing ? ` · ${t.routing.team}` : ''}</span>}
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{t.branch ? `${t.branch} · ` : ''}{t.location}</span>
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" aria-hidden="true" />{t.reporter}</span>
              {t.hasImage() && <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" aria-hidden="true" />Ada foto</span>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-5 lg:min-w-[190px] lg:flex-col lg:items-end">
            <div><p className="mb-1 text-xs text-slate-400">Batas SLA</p><SlaTimer ticket={t} now={now} /></div>
            <p className="text-xs text-slate-500">{t.picLabel()}</p>
          </div>
          <div className="lg:w-32">
            {t.status === 'open' && canTake
              ? <Button className="w-full" onClick={() => onTake(t.id)}>Ambil Tiket</Button>
              : <Button variant="ghost" className="w-full" onClick={() => onOpen(t.id)}>{t.status === 'done' ? 'Lihat Detail' : 'Buka Detail'}</Button>}
          </div>
        </div>
      </article>
    );
  }
}
