import React from 'react';
import { Timer } from 'lucide-react';
import { PRIORITIES, STATUS, SLA_LEVELS, formatMinutes } from '../../domain/constants';

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
    if (ticket.status === 'done') return <span className="text-xs font-medium text-emerald-700">Resolved</span>;
    const level = ticket.slaLevel(now);
    return (
      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${SLA_LEVELS[level].chip}`}>
        <Timer className="h-3.5 w-3.5" aria-hidden="true" />{formatMinutes(ticket.remainingMin(now))}
      </span>
    );
  }
}
export class Button extends React.PureComponent {
  render() {
    const { variant = 'primary', className = '', children, ...rest } = this.props;
    const v = variant === 'primary'
      ? 'bg-[var(--brand)] text-white hover:brightness-110'
      : 'bg-slate-100 text-slate-800 hover:bg-slate-200';
    return (
      <button type="button" {...rest} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}>
        {children}
      </button>
    );
  }
}
export class Card extends React.PureComponent {
  render() { return <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${this.props.className || ''}`}>{this.props.children}</section>; }
}
