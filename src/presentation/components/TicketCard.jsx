import React from 'react';
import { PriorityBadge, StatusBadge, SlaTimer, Button } from './ui';

export default class TicketCard extends React.PureComponent {
  render() {
    const { ticket: t, now, categoryName, onAdvance } = this.props;
    const cta = t.status === 'open' ? 'Tangani' : t.status === 'in_progress' ? 'Selesaikan' : null;
    const border = t.isBreached(now) || t.isCritical(now) ? 'border-l-red-600' : 'border-l-transparent';
    return (
      <article className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-4 ${border} lg:grid lg:grid-cols-[1fr_auto_auto] lg:items-center lg:gap-6`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={t.priority} />
            <StatusBadge status={t.status} />
            <span className="text-xs text-slate-500">#{t.id}</span>
          </div>
          <h3 className="mt-2 break-words text-base font-semibold text-slate-900 sm:text-lg">{t.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {categoryName || 'Tanpa kategori'} · 📍 {t.location} · {Math.round(t.ageMin(now))} mnt lalu · Pelapor: {t.reporter}{t.hasPhoto ? ' · 📷' : ''}
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 lg:mt-0 lg:flex-col lg:items-end">
          <SlaTimer ticket={t} now={now} />
          <span className="text-xs text-slate-600">{t.assignee ? `PIC: ${t.assignee}` : 'Belum ada PIC'}</span>
        </div>
        <div className="mt-3 lg:mt-0">
          {cta && <Button className="w-full lg:w-32" onClick={() => onAdvance(t.id)}>{cta}</Button>}
        </div>
      </article>
    );
  }
}
