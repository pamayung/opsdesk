import React from 'react';
import { AppContext } from '../../app/AppContext';
import { api } from '../../api/http';
import { Card } from '../components/ui';

const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]';

export default class AccountPage extends React.Component {
  static contextType = AppContext;
  state = { current: '', next: '', confirm: '', busy: false, error: '' };
  submit = async (e) => {
    e.preventDefault();
    const { current, next, confirm } = this.state;
    if (next !== confirm) { this.setState({ error: 'Konfirmasi kata sandi tidak sama.' }); return; }
    this.setState({ busy: true, error: '' });
    try {
      await api.changePassword({ current_password: current, new_password: next });
      await this.context.logout('Kata sandi diubah. Silakan login dengan kata sandi baru.'); // semua sesi lama dicabut server
    } catch (err) { this.setState({ busy: false, error: err.message }); }
  };
  render() {
    const { user, container } = this.context; const { current, next, confirm, busy, error } = this.state;
    return <div className="mx-auto max-w-lg space-y-5">
      <header><h1 className="text-2xl font-bold tracking-tight text-slate-950">My account</h1>
        <p className="mt-1 text-sm text-slate-600">{user.name} · {user.email} · {container.roles[user.role].label}</p></header>
      <Card>
        <form onSubmit={this.submit} aria-labelledby="pw-title">
          <h2 id="pw-title" className="font-semibold text-slate-950">Ganti kata sandi</h2>
          <label htmlFor="pw-cur" className="mt-4 block text-sm font-medium">Kata sandi saat ini</label>
          <input id="pw-cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => this.setState({ current: e.target.value, error: '' })} className={input} />
          <label htmlFor="pw-new" className="mt-3 block text-sm font-medium">Kata sandi baru <span className="font-normal text-slate-500">(minimal 8 karakter)</span></label>
          <input id="pw-new" type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => this.setState({ next: e.target.value, error: '' })} className={input} />
          <label htmlFor="pw-conf" className="mt-3 block text-sm font-medium">Ulangi kata sandi baru</label>
          <input id="pw-conf" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => this.setState({ confirm: e.target.value, error: '' })} className={input} />
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || next.length < 8 || !current} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Memproses…' : 'Simpan kata sandi'}</button>
          <p className="mt-2 text-center text-xs text-slate-500">Setelah diganti, semua sesi (termasuk yang ini) keluar dan Anda login ulang.</p>
        </form>
      </Card>
    </div>;
  }
}
