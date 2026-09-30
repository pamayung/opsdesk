import React from 'react';

const fmtDay = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
export const dayLabel = (ts) => fmtDay.format(ts);

// Tren tiket: batang = masuk, garis = selesai. SVG responsif (skala mengikuti lebar).
export class TrendChart extends React.PureComponent {
  render() {
    const { buckets, weekly } = this.props;
    const W = 720; const H = 240; const pad = { l: 34, r: 10, t: 12, b: 30 };
    const iw = W - pad.l - pad.r; const ih = H - pad.t - pad.b;
    const rawMax = Math.max(1, ...buckets.flatMap((b) => [b.created, b.resolved]));
    const step = rawMax <= 5 ? 1 : rawMax <= 10 ? 2 : rawMax <= 25 ? 5 : rawMax <= 50 ? 10 : 20;
    const max = Math.ceil(rawMax / step) * step;
    const band = iw / buckets.length; const bw = Math.max(2, Math.min(28, band * 0.62));
    const y = (v) => pad.t + ih - (v / max) * ih;
    const every = Math.ceil(buckets.length / 8);
    const line = buckets.map((b, i) => `${pad.l + i * band + band / 2},${y(b.resolved)}`).join(' ');
    const totals = buckets.reduce((a, b) => ({ c: a.c + b.created, r: a.r + b.resolved }), { c: 0, r: 0 });
    return (
      <figure>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Ticket trend: ${totals.c} created and ${totals.r} resolved`}>
          {[0, max / 2, max].map((v) => (
            <g key={v}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" /><text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">{Math.round(v)}</text></g>
          ))}
          {buckets.map((b, i) => (
            <g key={b.start}>
              <rect x={pad.l + i * band + (band - bw) / 2} y={y(b.created)} width={bw} height={Math.max(0, pad.t + ih - y(b.created))} rx="2" style={{ fill: 'var(--brand)' }} opacity="0.85">
                <title>{`${dayLabel(b.start)}${weekly ? ' (week)' : ''}: ${b.created} created, ${b.resolved} resolved`}</title>
              </rect>
              {i % every === 0 && <text x={pad.l + i * band + band / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#64748b">{dayLabel(b.start)}</text>}
            </g>
          ))}
          <polyline points={line} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {buckets.map((b, i) => <circle key={b.start} cx={pad.l + i * band + band / 2} cy={y(b.resolved)} r={buckets.length > 45 ? 0 : 3} fill="#d97706"><title>{`${dayLabel(b.start)}: ${b.resolved} resolved`}</title></circle>)}
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand)] opacity-85" aria-hidden="true" />Tickets created ({totals.c})</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-amber-600" aria-hidden="true" />Tickets resolved ({totals.r})</span>
          <span>{weekly ? 'Weekly' : 'Daily'}</span>
        </figcaption>
        <details className="mt-3 print:hidden">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--brand)]">Lihat sebagai tabel</summary>
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 font-semibold">{weekly ? 'Week starting' : 'Date'}</th><th className="px-3 py-2 text-right font-semibold">Created</th><th className="px-3 py-2 text-right font-semibold">Resolved</th></tr></thead>
              <tbody>{buckets.map((b) => <tr key={b.start} className="border-t border-slate-100"><td className="px-3 py-1.5">{dayLabel(b.start)}</td><td className="px-3 py-1.5 text-right tabular-nums">{b.created}</td><td className="px-3 py-1.5 text-right tabular-nums">{b.resolved}</td></tr>)}</tbody></table>
          </div>
        </details>
      </figure>
    );
  }
}

// Daftar batang horizontal: label, jumlah, dan penanda tiket terlewat SLA.
export class BarList extends React.PureComponent {
  render() {
    const { rows, limit = 8, empty = 'Tidak ada data.' } = this.props;
    if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
    const shown = rows.slice(0, limit);
    const max = Math.max(1, ...shown.map((r) => r.total));
    const rest = rows.length - shown.length;
    return (
      <ul className="space-y-3">
        {shown.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-slate-800">{r.label}</span>
              <span className="shrink-0 tabular-nums"><span className="font-bold text-slate-900">{r.total}</span>{r.breached > 0 && <span className="ml-2 text-xs font-medium text-red-600">{r.breached} breached</span>}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(r.total / max) * 100}%` }} /></div>
          </li>
        ))}
        {rest > 0 && <li className="text-xs text-slate-500">+ {rest} lainnya (lihat di ekspor CSV)</li>}
      </ul>
    );
  }
}
