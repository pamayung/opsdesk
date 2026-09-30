import React from 'react';
import { ShieldAlert, RotateCcw, DatabaseZap } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import { ConfirmButton } from '../components/admin/kit';
import AdminLocations from './admin/AdminLocations';
import AdminTeams from './admin/AdminTeams';
import AdminRules from './admin/AdminRules';
import AdminCatalog from './admin/AdminCatalog';
import AdminUsers from './admin/AdminUsers';

const TABS = [
  ['lokasi', 'Lokasi', 'Struktur organisasi bertingkat'],
  ['tim', 'Department & Tim', 'Tim, anggota, jam kerja, cakupan area'],
  ['aturan', 'Aturan Routing', 'Ke mana tiket diarahkan'],
  ['katalog', 'Kategori & Pertanyaan', 'Klasifikasi dan formulir dinamis'],
  ['pengguna', 'Pengguna & Peran', 'Siapa boleh apa'],
];

export default class AdminPage extends React.Component {
  static contextType = AppContext;
  reset = () => { this.context.container.admin.resetConfig(); this.context.refresh(); this.context.notify('Konfigurasi dikembalikan ke bawaan.'); };
  sample = () => {
    const n = this.context.container.admin.loadSampleHistory();
    this.context.refresh();
    this.context.notify(n ? `${n} tiket contoh (riwayat 60 hari) ditambahkan. Lihat di menu Laporan.` : 'Data contoh sudah ada.');
  };
  render() {
    const { user, ticketId: tab, goTo } = this.context;
    if (user.role !== 'admin') {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold">Khusus administrator</h1>
          <p className="mt-1 text-sm text-slate-600">Halaman ini hanya bisa dibuka oleh pengguna dengan peran Administrator.</p>
        </div>
      );
    }
    const cur = TABS.find((t) => t[0] === tab) ? tab : 'lokasi';
    const Body = { lokasi: AdminLocations, tim: AdminTeams, aturan: AdminRules, katalog: AdminCatalog, pengguna: AdminUsers }[cur];
    return <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Administrasi</h1>
          <p className="mt-1 text-sm text-slate-600">Perubahan langsung berlaku untuk tiket baru. Tiket yang sudah ada tidak dirutekan ulang.</p>
        </div>
        <div className="text-sm text-slate-600 sm:text-right">
          <button type="button" onClick={this.sample} className="mb-1 mr-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[var(--brand)] hover:bg-emerald-50"><DatabaseZap className="h-4 w-4" aria-hidden="true" />Tambah data contoh (riwayat 60 hari)</button>
          <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" aria-hidden="true" /><ConfirmButton label="Kembalikan ke bawaan" onConfirm={this.reset} /></span>
          <p className="text-xs text-slate-500">Department, tim, aturan, katalog, dan pengguna. Lokasi dan kategori tidak berubah.</p>
        </div>
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
