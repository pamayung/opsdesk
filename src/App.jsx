import React from 'react';
import { AppContext } from './app/AppContext';
import { container } from './app/container';
import AppShell from './presentation/layout/AppShell';
import DashboardPage from './presentation/pages/DashboardPage';
import TicketListPage from './presentation/pages/TicketListPage';
import TicketDetailPage from './presentation/pages/TicketDetailPage';
import QuickIncidentPage from './presentation/pages/QuickIncidentPage';
import AdminPage from './presentation/pages/AdminPage';
import ReportsPage from './presentation/pages/ReportsPage';

// Routing berbasis hash: #/  #/tiket  #/tiket/TCK-1042  #/buat  #/laporan  #/admin/lokasi
const parseHash = () => {
  const [, seg, id] = (window.location.hash || '#/').slice(1).split('/');
  if (seg === 'tiket') return id ? { page: 'detail', ticketId: decodeURIComponent(id) } : { page: 'tickets', ticketId: null };
  if (seg === 'buat') return { page: 'report', ticketId: null };
  if (seg === 'laporan') return { page: 'reports', ticketId: null };
  if (seg === 'admin') return { page: 'admin', ticketId: id || 'lokasi' };
  return { page: 'dashboard', ticketId: null };
};
const toHash = (page, id) => (page === 'tickets' ? '#/tiket' : page === 'detail' ? `#/tiket/${encodeURIComponent(id)}` : page === 'report' ? '#/buat' : page === 'admin' ? `#/admin/${id || 'lokasi'}` : page === 'reports' ? '#/laporan' : '#/');

// Pengguna aktif disimpan agar tetap sama setelah reload (demo peran; ganti dengan login saat backend tersedia).
const USER_KEY = 'opsdesk:user';
const loadUserId = () => { try { const id = localStorage.getItem(USER_KEY); if (container.users.some((u) => u.id === id)) return id; } catch (e) { /* abaikan */ } return container.defaultUserId; };

export default class App extends React.Component {
  state = { ...parseHash(), userId: loadUserId(), dept: 'all', query: '', toast: '', rev: 0 };
  componentDidMount() { window.addEventListener('hashchange', this.onHash); }
  componentWillUnmount() { window.removeEventListener('hashchange', this.onHash); clearTimeout(this.tt); }
  onHash = () => { this.setState(parseHash()); window.scrollTo(0, 0); };
  goTo = (page, id) => { const h = toHash(page, id); if (window.location.hash === h) return; window.location.hash = h; };
  // Data berubah di repository -> render ulang seluruh aplikasi (sidebar, badge, halaman).
  refresh = () => this.setState((s) => ({ rev: s.rev + 1 }));
  setDept = (dept) => this.setState({ dept });
  // Ganti pengguna = ganti peran. Kembali ke dashboard karena isi dan akses tiap peran berbeda.
  setUser = (userId) => {
    try { localStorage.setItem(USER_KEY, userId); } catch (e) { /* abaikan */ }
    this.setState({ userId, dept: 'all', query: '' });
    this.goTo('dashboard');
  };
  setQuery = (query) => { this.setState({ query }); if (this.state.page !== 'tickets') this.goTo('tickets'); };
  notify = (toast) => { this.setState({ toast }); clearTimeout(this.tt); this.tt = setTimeout(() => this.setState({ toast: '' }), 4000); };
  renderPage() {
    const { page } = this.state;
    return page === 'dashboard' ? <DashboardPage /> : page === 'tickets' ? <TicketListPage />
      : page === 'detail' ? <TicketDetailPage key={this.state.ticketId} /> : page === 'admin' ? <AdminPage /> : page === 'reports' ? <ReportsPage /> : <QuickIncidentPage />;
  }
  render() {
    const { page, ticketId, userId, dept, query, toast } = this.state;
    const user = container.users.find((u) => u.id === userId) || container.users.find((u) => u.id === container.defaultUserId) || container.users[0];
    const value = {
      container, user,
      page, ticketId, dept, query, toast,
      goTo: this.goTo, notify: this.notify, refresh: this.refresh, setDept: this.setDept, setUser: this.setUser, setQuery: this.setQuery,
    };
    return <AppContext.Provider value={value}><AppShell>{this.renderPage()}</AppShell></AppContext.Provider>;
  }
}
