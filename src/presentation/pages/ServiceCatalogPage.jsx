import React from 'react';
import { AppContext } from '../../app/AppContext';
import { Card } from '../components/ui';

const groups = [
  { title:'IT & Digital', icon:'🖥️', items:[['POS / KDS','Incident'],['Account & Access','Request'],['Network / Wi-Fi','Incident'],['Hardware','Request / Repair'],['Business Application','Support']] },
  { title:'HR & People', icon:'👥', items:[['Attendance','Request'],['Payroll','Question'],['Recruitment','Request'],['Employee Letter','Request'],['People Issue','Case']] },
  { title:'GA & Facility', icon:'🏢', items:[['AC & Ventilation','Maintenance'],['Electricity','Incident'],['Toilet & Plumbing','Maintenance'],['Cleaning','Request'],['Office / Building','Maintenance']] },
  { title:'Finance & Procurement', icon:'💰', items:[['Reimbursement','Request'],['Invoice / AP','Question'],['Purchase Request','Request'],['Vendor','Request'],['Asset','Request']] },
  { title:'Security & Safety', icon:'🛡️', items:[['CCTV','Incident'],['Access / Door','Incident'],['Safety','Critical incident'],['Security Event','Incident']] },
  { title:'Operations', icon:'⚙️', items:[['Outlet / Store Issue','Incident'],['Warehouse / DC','Incident'],['Inventory','Request'],['Delivery / Fleet','Incident']] },
];

export default class ServiceCatalogPage extends React.Component {
  static contextType = AppContext;
  state = { query:'' };
  render() {
    const { goTo } = this.context;
    const q = this.state.query.toLowerCase();
    const filtered = groups.map(g => ({...g, items:g.items.filter(i => !q || `${g.title} ${i[0]} ${i[1]}`.toLowerCase().includes(q))})).filter(g => g.items.length);
    return <div className="space-y-6">
      <header><p className="text-sm font-medium text-[var(--brand)]">Self service</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Service Catalog</h1><p className="mt-1 text-sm text-slate-600">Pilih layanan. Sistem akan menentukan form, department, PIC, SLA, dan approval secara otomatis.</p></header>
      <div className="relative"><span className="pointer-events-none absolute left-4 top-3.5">⌕</span><input value={this.state.query} onChange={e=>this.setState({query:e.target.value})} placeholder="Cari layanan, misalnya laptop, toilet, payroll..." className="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]"/></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(g => <Card key={g.title}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl">{g.icon}</span><div><h2 className="font-semibold text-slate-950">{g.title}</h2><p className="text-xs text-slate-500">{g.items.length} services</p></div></div><div className="mt-4 space-y-2">{g.items.map(([name,type])=><button key={name} onClick={()=>goTo('report')} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-left hover:border-slate-200 hover:bg-slate-50"><span><span className="block text-sm font-medium text-slate-900">{name}</span><span className="text-xs text-slate-500">{type}</span></span><span className="text-slate-400">→</span></button>)}</div></Card>)}</div>
      {!filtered.length && <Card className="py-12 text-center"><p className="font-semibold">Service tidak ditemukan</p><p className="mt-1 text-sm text-slate-500">Coba kata kunci lain.</p></Card>}
    </div>;
  }
}
