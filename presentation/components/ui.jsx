import React from 'react';
import { PRIORITIES, STATUS, formatMinutes } from '../../domain/constants';

export class PriorityBadge extends React.PureComponent {
  render() {
    const p = PRIORITIES[this.props.priority];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${p.tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />{p.label}
      </span>
    );
  }
}
export class StatusBadge extends React.PureComponent {
  render() {
    const s = STATUS[this.props.status];
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.tone}`}>{s.label}</span>;
  }
}
export class SlaTimer extends React.PureComponent {
  render() {
    const { ticket, now } = this.props;
    if (ticket.status === 'done') return <span className="text-xs text-slate-500">Selesai</span>;
    const m = ticket.remainingMin(now);
    const tone = m < 0 ? 'bg-red-600 text-white' : m < 30 ? 'bg-red-50 text-red-700' : m < 60 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700';
    return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${tone}`}>⏱ {formatMinutes(m)}</span>;
  }
}
export class Button extends React.PureComponent {
  render() {
    const { variant = 'primary', className = '', children, ...rest } = this.props;
    const v = variant === 'primary'
      ? 'bg-[var(--brand)] text-white hover:brightness-110'
      : 'bg-slate-100 text-slate-800 hover:bg-slate-200';
    return (
      <button {...rest} className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-50 ${v} ${className}`}>
        {children}
      </button>
    );
  }
}
export class Card extends React.PureComponent {
  render() { return <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${this.props.className || ''}`}>{this.props.children}</section>; }
}
