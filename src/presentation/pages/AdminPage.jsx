import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import AdminLocations from './admin/AdminLocations';
import AdminTeams from './admin/AdminTeams';
import AdminRules from './admin/AdminRules';
import AdminCatalog from './admin/AdminCatalog';
import AdminUsers from './admin/AdminUsers';

// Slug lama (Indonesia) tetap dikenali agar tautan yang sudah dibagikan tidak mendarat di tab yang salah.
export const ALIAS = { tim: 'team', aturan: 'rule', katalog: 'catalog', pengguna: 'user' };
export const TABS = [
  ['lokasi', 'Lokasi', 'Struktur organisasi bertingkat'],
  ['team', 'Departments & Teams', 'Team, member, working hours, area scope'],
  ['rule', 'Routing Rules', 'Ke mana tiket di-route'],
  ['catalog', 'Kategori & Pertanyaan', 'Classification dan formulir dinamis'],
  ['user', 'Users & Roles', 'Siapa boleh apa'],
];

// Setiap id tab HARUS punya komponen (dijaga oleh tests/admin-tabs.test.js).
export const BODIES = { lokasi: AdminLocations, team: AdminTeams, rule: AdminRules, catalog: AdminCatalog, user: AdminUsers };
export const resolveTab = (slug) => { const id = ALIAS[slug] || slug; return TABS.some((t) => t[0] === id) ? id : 'lokasi'; };

export default class AdminPage extends React.Component {
  static contextType = AppContext;
  render() {
    const { user, ticketId: tab, goTo } = this.context;
    if (user.role !== 'admin') {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold">Admin only</h1>
          <p className="mt-1 text-sm text-slate-600">Halaman ini hanya bisa dibuka oleh user dengan role Administrator.</p>
        </div>
      );
    }
    const cur = resolveTab(tab);
    const Body = BODIES[cur];
    return <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Admin</h1>
          <p className="mt-1 text-sm text-slate-600">Perubahan langsung berlaku untuk tiket baru. Tiket yang sudah ada tidak di-route ulang.</p>
        </div>
        <p className="max-w-xs text-xs text-slate-500 sm:text-right">Tersimpan di server. Kategori, subkategori, pengguna, dan team yang "dihapus" dinonaktifkan agar riwayat tiket tetap utuh.</p>
      </header>
      <nav aria-label="Bagian admin" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => goTo('admin', k)} aria-current={cur === k ? 'page' : undefined} className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${cur === k ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>{label}</button>
        ))}
      </nav>
      <p className="text-sm text-slate-600">{TABS.find((t) => t[0] === cur)[2]}.</p>
      <Body key={cur} />
    </div>;
  }
}
