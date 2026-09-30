import React from 'react';
import { AppContext } from '../../../app/AppContext';

export const inputCls = 'min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:bg-slate-50 disabled:text-slate-500';
export const btnPrimary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50';
export const btnSecondary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50';
export const btnSmall = 'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40';

// Label + kontrol + petunjuk.
export class Field extends React.Component {
  render() {
    const { label, hint, htmlFor, children, className = '' } = this.props;
    return <div className={className}><label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">{label}</label>{children}{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</div>;
  }
}

// Tombol hapus dua langkah: klik pertama meminta konfirmasi.
export class ConfirmButton extends React.Component {
  state = { ask: false };
  render() {
    const { label = 'Hapus', onConfirm, disabled, small = true } = this.props;
    const base = small ? btnSmall : 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold';
    if (!this.state.ask) return <button type="button" disabled={disabled} onClick={() => this.setState({ ask: true })} className={`${base} text-red-700 hover:bg-red-50`}>{label}</button>;
    return (
      <span className="inline-flex items-center gap-1.5" role="group" aria-label="Konfirmasi">
        <span className="text-xs font-medium text-red-800">Yakin?</span>
        <button type="button" onClick={() => { this.setState({ ask: false }); onConfirm(); }} className={`${base} bg-red-600 text-white hover:bg-red-700`}>Ya, {label.toLowerCase()}</button>
        <button type="button" onClick={() => this.setState({ ask: false })} className={`${base} bg-slate-100 text-slate-700 hover:bg-slate-200`}>Batal</button>
      </span>
    );
  }
}

export class ErrorNote extends React.Component {
  render() { return this.props.error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{this.props.error}</p> : null; }
}

// Dasar untuk tab admin: menjalankan operasi service, menampilkan error, lalu memuat ulang aplikasi.
export class AdminTab extends React.Component {
  static contextType = AppContext;
  state = { error: '' };
  get admin() { return this.context.container.admin; }
  // Sukses -> render ulang + toast (opsional) dan mengembalikan true. Gagal -> tampilkan pesan dan mengembalikan false.
  act = (fn, okMessage) => {
    try { fn(); this.setState({ error: '' }); this.context.refresh(); if (okMessage) this.context.notify(okMessage); return true; }
    catch (err) { this.setState({ error: err.message }); return false; }
  };
}
