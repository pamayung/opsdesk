import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatDuration } from '../../../domain/constants';

// Menyelesaikan tiket: cukup catatan "apa yang sudah dilakukan". Eskalasi ke pihak luar bersifat opsional.
export default class ClosurePanel extends React.Component {
  state = { note: '', error: '', askVendor: false, vendor: '' };
  close = () => { const error = this.props.onClose({ note: this.state.note }); this.setState({ error: error || '' }); };
  escalate = () => {
    const error = this.props.onEscalate({ to: this.state.vendor });
    this.setState(error ? { error } : { error: '', askVendor: false, vendor: '' });
  };

  renderDone() {
    const { ticket: t, now } = this.props;
    const r = t.resolution;
    return (
      <>
        <h2 id="closure-title" className="flex items-center gap-2 text-lg font-bold text-slate-950"><CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />Ticket resolved</h2>
        <dl className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div><dt className="text-xs text-slate-500">Yang sudah dilakukan</dt><dd className="mt-1 whitespace-pre-line break-words font-medium text-slate-900">{r.note || r.cause || '-'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Resolved</dt><dd className="text-right font-medium text-slate-900">{formatDateTime(r.closedAt, now)} oleh {r.closedBy}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Total duration</dt><dd className="text-right font-medium text-slate-900">{formatDuration((r.closedAt - t.createdAt) / 60000)}</dd></div>
        </dl>
        {t.escalation && <p className="mt-3 text-xs text-slate-500">Sempat di-escalate ke {t.escalation.to}.</p>}
      </>
    );
  }

  renderForm() {
    const { ticket: t, now } = this.props;
    const { note, error, askVendor, vendor } = this.state;
    const working = t.status === 'in_progress';
    const blocker = !working ? 'Assign PIC terlebih dahulu.' : note.trim().length < 5 ? 'Tulis apa yang sudah dilakukan.' : '';
    return (
      <>
        <h2 id="closure-title" className="flex items-center gap-2 text-lg font-bold text-slate-950"><CheckCircle2 className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />Resolve ticket</h2>
        <label htmlFor="resolution" className="mt-4 block text-sm font-semibold text-slate-700">Apa yang sudah dilakukan?</label>
        <textarea id="resolution" rows={3} value={note} maxLength={500} disabled={!working} onChange={(e) => this.setState({ note: e.target.value, error: '' })} placeholder="Contoh: Adaptor diganti, POS sudah menyala dan tes cetak berhasil." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60" />
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={this.close} disabled={!!blocker} className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />Resolve Ticket</button>
        {blocker && <p className="mt-2 text-center text-xs text-slate-500">{blocker}</p>}

        <div className="mt-4 border-t border-slate-100 pt-4 text-center">
          {t.escalation ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Sudah di-escalate ke <span className="font-semibold">{t.escalation.to}</span> pada {formatDateTime(t.escalation.at, now)} oleh {t.escalation.by}.</p>
          ) : askVendor ? (
            <div className="rounded-xl bg-red-50 p-3 text-left">
              <label htmlFor="vendor" className="block text-sm font-semibold text-red-900">Escalate to whom?</label>
              <input id="vendor" value={vendor} onChange={(e) => this.setState({ vendor: e.target.value, error: '' })} placeholder="Nama vendor atau pihak luar" className="mt-1.5 min-h-[44px] w-full rounded-lg border border-red-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-red-500" />
              <p className="mt-1.5 text-xs text-red-900">Tindakan ini tercatat di catatan tiket dan tidak bisa dibatalkan.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={this.escalate} disabled={vendor.trim().length < 2} className="min-h-[40px] rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Escalate</button>
                <button type="button" onClick={() => this.setState({ askVendor: false, vendor: '' })} className="min-h-[40px] rounded-lg bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Batal</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => this.setState({ askVendor: true })} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Escalate to vendor</button>
          )}
        </div>
      </>
    );
  }

  render() {
    // Hanya PIC / manajer yang bisa menyelesaikan atau mengeskalasi; pihak lain hanya melihat hasil akhirnya.
    if (this.props.readOnly && this.props.ticket.status !== 'done') return null;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="closure-title">
        {this.props.ticket.status === 'done' ? this.renderDone() : this.renderForm()}
      </section>
    );
  }
}
