import React from 'react';
import { container } from '../../app/container';
import { api } from '../../api/http';

const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]';
const btn = 'inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50';
// Mode demo (hanya bila VITE_DEMO_PASSWORD diisi saat build/dev): tombol isi-cepat untuk akun seed. Jangan diisi di production.
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || '';
const DEMO = [['kevin-mahendra', 'Kevin · PIC'], ['rina', 'Rina · Employee'], ['andri-wijaya', 'Andri · Manager'], ['hendra-gunawan', 'Hendra · Management'], ['sari-administrator', 'Sari · Admin']];

export default class LoginPage extends React.Component {
  state = { mode: 'login', email: '', password: '', busy: false, error: '', info: '' };
  set = (k) => (e) => this.setState({ [k]: e.target.value, error: '' });
  submit = async (e) => {
    e.preventDefault();
    this.setState({ busy: true, error: '', info: '' });
    try {
      if (this.state.mode === 'forgot') {
        const r = await api.forgotPassword({ email: this.state.email });
        this.setState({ busy: false, info: r.message });
      } else await this.props.onLogin(this.state.email.trim(), this.state.password);
    } catch (err) { this.setState({ busy: false, error: err.message }); }
  };
  render() {
    const { mode, email, password, busy, error, info } = this.state;
    const app = container.app;
    const forgot = mode === 'forgot';
    return <div className="grid min-h-screen place-items-center bg-[#f5f7f9] p-4" style={{ '--brand': app.brand }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-base font-extrabold text-white">{app.name[0]}</span><span className="text-2xl font-bold tracking-tight">{app.name}</span></div>
        <form onSubmit={this.submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="login-title">
          <h1 id="login-title" className="text-lg font-bold text-slate-950">{forgot ? 'Lupa kata sandi' : 'Login'}</h1>
          <p className="mt-1 text-sm text-slate-600">{forgot ? 'Masukkan email akun Anda. Kami kirim tautan untuk mengatur ulang kata sandi.' : 'Masuk dengan email dan kata sandi akun Anda.'}</p>
          {this.props.message && !error && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{this.props.message}</p>}
          <label htmlFor="login-email" className="mt-4 block text-sm font-medium">Email</label>
          <input id="login-email" type="email" autoComplete="username" required value={email} onChange={this.set('email')} className={input} />
          {!forgot && <>
            <label htmlFor="login-password" className="mt-3 block text-sm font-medium">Kata sandi</label>
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={this.set('password')} className={input} />
          </>}
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {info && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{info}</p>}
          <button type="submit" disabled={busy || !email || (!forgot && !password)} className={`${btn} mt-4`}>{busy ? 'Memproses…' : forgot ? 'Kirim tautan reset' : 'Login'}</button>
          <button type="button" onClick={() => this.setState({ mode: forgot ? 'login' : 'forgot', error: '', info: '' })} className="mt-3 w-full rounded text-center text-sm font-semibold text-[var(--brand)] hover:underline">{forgot ? 'Kembali ke login' : 'Lupa kata sandi?'}</button>
        </form>
        {DEMO_PASSWORD && !forgot && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-3" data-testid="demo-accounts">
            <p className="text-xs text-slate-500">Demo: klik untuk mengisi akun seed.</p>
            <div className="mt-2 flex flex-wrap gap-2">{DEMO.map(([slug, label]) => <button key={slug} type="button" onClick={() => this.setState({ email: `${slug}@opsdesk.example`, password: DEMO_PASSWORD, error: '' })} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">{label}</button>)}</div>
          </div>
        )}
      </div>
    </div>;
  }
}
