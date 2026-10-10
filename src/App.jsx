import React from 'react';
import { AppContext } from './app/AppContext';
import { container } from './app/container';
import { client, SESSION_EXPIRED, isApiError } from './api/http';
import AppShell from './presentation/layout/AppShell';
import DashboardPage from './presentation/pages/DashboardPage';
import TicketListPage from './presentation/pages/TicketListPage';
import TicketDetailPage from './presentation/pages/TicketDetailPage';
import QuickIncidentPage from './presentation/pages/QuickIncidentPage';
import AdminPage from './presentation/pages/AdminPage';
import ReportsPage from './presentation/pages/ReportsPage';
import LoginPage from './presentation/pages/LoginPage';
import ResetPasswordPage from './presentation/pages/ResetPasswordPage';
import AccountPage from './presentation/pages/AccountPage';

// Routing berbasis hash: #/  #/tiket  #/tiket/TCK-1042  #/buat  #/laporan  #/admin/lokasi  #/akun  #/reset-password?token=...
const parseHash = () => {
  const [path, qs] = (window.location.hash || '#/').slice(1).split('?');
  const [, seg, id] = path.split('/');
  if (seg === 'reset-password') return { page: 'reset', ticketId: null, resetToken: new URLSearchParams(qs || '').get('token') || '' };
  if (seg === 'tiket') return id ? { page: 'detail', ticketId: decodeURIComponent(id) } : { page: 'tickets', ticketId: null };
  if (seg === 'buat') return { page: 'report', ticketId: null };
  if (seg === 'laporan') return { page: 'reports', ticketId: null };
  if (seg === 'akun') return { page: 'account', ticketId: null };
  if (seg === 'admin') return { page: 'admin', ticketId: id || 'lokasi' };
  return { page: 'dashboard', ticketId: null };
};
const toHash = (page, id) => (page === 'tickets' ? '#/tiket' : page === 'detail' ? `#/tiket/${encodeURIComponent(id)}` : page === 'report' ? '#/buat' : page === 'admin' ? `#/admin/${id || 'lokasi'}` : page === 'reports' ? '#/laporan' : page === 'account' ? '#/akun' : '#/');

const REFRESH_MS = 30000;

export default class App extends React.Component {
  // phase: loading (memeriksa sesi) | anon (belum login) | ready | error (server tidak terjangkau)
  state = { ...parseHash(), phase: 'loading', authMsg: '', dept: 'all', query: '', toast: '', rev: 0 };
  componentDidMount() {
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener(SESSION_EXPIRED, this.onExpired);
    this.poll = setInterval(() => { if (this.state.phase === 'ready' && !document.hidden) this.refresh(); }, REFRESH_MS);
    this.init();
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHash); window.removeEventListener(SESSION_EXPIRED, this.onExpired);
    clearTimeout(this.tt); clearInterval(this.poll);
  }
  onHash = () => { this.setState(parseHash()); window.scrollTo(0, 0); };
  // Sesi lama (token di localStorage) dipulihkan saat halaman dibuka.
  init = async () => {
    if (!client.session) { this.setState({ phase: 'anon' }); return; }
    try { await container.store.bootstrap(); this.setState({ phase: 'ready' }); }
    catch (e) {
      if (isApiError(e) && e.status === 401) { container.store.clear(); this.setState({ phase: 'anon' }); } else this.setState({ phase: 'error', authMsg: e.message });
    }
  };
  login = async (email, password) => {
    await client.login(email, password);
    await container.store.bootstrap();
    this.setState({ phase: 'ready', dept: 'all', query: '', authMsg: '' });
    if (this.state.page === 'reset') window.location.hash = '#/'; else this.goTo('dashboard');
  };
  logout = async (msg = '') => {
    await client.logout();
    container.store.clear();
    this.setState({ phase: 'anon', authMsg: msg, dept: 'all', query: '' });
    window.location.hash = '#/';
  };
  onExpired = () => { container.store.clear(); this.setState({ phase: 'anon', authMsg: 'Sesi Anda berakhir. Silakan login kembali.' }); };
  goTo = (page, id) => { const h = toHash(page, id); if (window.location.hash === h) return; window.location.hash = h; };
  // Data berubah -> muat ulang ringkasan (badge, statistik) lalu render ulang seluruh aplikasi.
  refresh = () => {
    this.setState((s) => ({ rev: s.rev + 1 }));
    return container.store.loadSummary().catch(() => {}).then(() => this.setState((s) => ({ rev: s.rev + 1 })));
  };
  setDept = (dept) => this.setState({ dept });
  setQuery = (query) => { this.setState({ query }); if (this.state.page !== 'tickets') this.goTo('tickets'); };
  notify = (toast) => { this.setState({ toast }); clearTimeout(this.tt); this.tt = setTimeout(() => this.setState({ toast: '' }), 4000); };
  renderPage() {
    const { page } = this.state;
    return page === 'dashboard' ? <DashboardPage /> : page === 'tickets' ? <TicketListPage />
      : page === 'detail' ? <TicketDetailPage key={this.state.ticketId} /> : page === 'admin' ? <AdminPage /> : page === 'reports' ? <ReportsPage />
        : page === 'account' ? <AccountPage /> : <QuickIncidentPage />;
  }
  render() {
    const { page, ticketId, phase, authMsg, dept, query, toast, resetToken, rev } = this.state;
    if (page === 'reset') return <ResetPasswordPage token={resetToken} />;
    if (phase === 'loading') return <div className="grid min-h-screen place-items-center bg-[#f5f7f9] text-sm text-slate-500" role="status">Memuat…</div>;
    if (phase === 'error') return <div className="grid min-h-screen place-items-center bg-[#f5f7f9] p-6"><div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center"><h1 className="font-bold">Server tidak terjangkau</h1><p className="mt-1 text-sm text-slate-600">{authMsg}</p><button type="button" onClick={() => { this.setState({ phase: 'loading' }); this.init(); }} className="mt-4 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">Coba lagi</button></div></div>;
    if (phase === 'anon') return <LoginPage onLogin={this.login} message={authMsg} />;
    const user = container.store.me;
    const value = {
      container, user, page, ticketId, dept, query, toast, rev,
      goTo: this.goTo, notify: this.notify, refresh: this.refresh, setDept: this.setDept, setQuery: this.setQuery, logout: this.logout,
    };
    return <AppContext.Provider value={value}><AppShell>{this.renderPage()}</AppShell></AppContext.Provider>;
  }
}
