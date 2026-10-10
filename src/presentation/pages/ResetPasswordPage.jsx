import React from 'react';
import { container } from '../../app/container';
import { api } from '../../api/http';

const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]';

// Tujuan tautan di email reset kata sandi: #/reset-password?token=...
export default class ResetPasswordPage extends React.Component {
  state = { password: '', confirm: '', busy: false, error: '', done: false };
  submit = async (e) => {
    e.preventDefault();
    const { password, confirm } = this.state;
    if (password !== confirm) { this.setState({ error: 'Konfirmasi kata sandi tidak sama.' }); return; }
    this.setState({ busy: true, error: '' });
    try { await api.resetPassword({ token: this.props.token, new_password: password }); this.setState({ busy: false, done: true }); }
    catch (err) { this.setState({ busy: false, error: err.message }); }
  };
  render() {
    const app = container.app; const { password, confirm, busy, error, done } = this.state;
    return <div className="grid min-h-screen place-items-center bg-[#f5f7f9] p-4" style={{ '--brand': app.brand }}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-950">Atur ulang kata sandi</h1>
        {!this.props.token && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">Tautan tidak lengkap. Buka tautan dari email Anda, atau minta tautan baru di halaman login.</p>}
        {done ? <>
          <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Kata sandi berhasil diubah. Semua sesi lama telah keluar.</p>
          <a href="#/" className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">Ke halaman login</a>
        </> : <form onSubmit={this.submit}>
          <label htmlFor="rp-pass" className="mt-4 block text-sm font-medium">Kata sandi baru <span className="font-normal text-slate-500">(minimal 8 karakter)</span></label>
          <input id="rp-pass" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => this.setState({ password: e.target.value, error: '' })} className={input} />
          <label htmlFor="rp-confirm" className="mt-3 block text-sm font-medium">Ulangi kata sandi baru</label>
          <input id="rp-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => this.setState({ confirm: e.target.value, error: '' })} className={input} />
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !this.props.token || password.length < 8} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Memproses…' : 'Simpan kata sandi'}</button>
        </form>}
      </div>
    </div>;
  }
}
