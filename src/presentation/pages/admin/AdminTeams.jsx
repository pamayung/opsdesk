import React from 'react';
import { Plus, Users, X } from 'lucide-react';
import { pathText } from '../../../domain/Location';
import { AdminTab, Field, ConfirmButton, ErrorNote, inputCls, btnPrimary, btnSecondary, btnSmall } from '../../components/admin/kit';

const DAYS = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [7, 'Min']];
const hoursText = (h) => (h ? `${h.days.length === 7 ? 'Setiap hari' : h.days.map((d) => DAYS[d - 1][1]).join(', ')} ${h.from}–${h.to}` : '24 jam');

// ---------- Editor department ----------
class DepartmentEditor extends AdminTab {
  constructor(props, ctx) {
    super(props, ctx);
    const d = props.deptId ? ctx.container.departments[props.deptId] : { name: '', head: '' };
    this.state = { error: '', name: d.name, head: d.head };
  }
  save = (e) => {
    e.preventDefault();
    const { deptId, onSaved } = this.props; const f = this.state;
    if (deptId) { this.act(() => this.admin.updateDepartment(deptId, f), 'Department diperbarui.'); return; }
    let id = null;
    if (this.act(() => { id = this.admin.addDepartment(f); }, 'Department ditambahkan.')) onSaved(id);
  };
  render() {
    const { deptId, onDeleted } = this.props;
    return (
      <form onSubmit={this.save} className="space-y-4">
        <h2 className="font-semibold text-slate-950">{deptId ? 'Ubah department' : 'Department baru'}</h2>
        <Field label="Nama department" htmlFor="dept-name"><input id="dept-name" className={`${inputCls} mt-1`} value={this.state.name} onChange={(e) => this.setState({ name: e.target.value, error: '' })} /></Field>
        <Field label="Kepala department" htmlFor="dept-head" hint="Menerima eskalasi SLA level 2."><input id="dept-head" className={`${inputCls} mt-1`} value={this.state.head} onChange={(e) => this.setState({ head: e.target.value, error: '' })} /></Field>
        <ErrorNote error={this.state.error} />
        <div className="flex items-center gap-2"><button type="submit" className={btnPrimary}>Simpan</button>{deptId && <ConfirmButton onConfirm={() => this.act(() => this.admin.removeDepartment(deptId), 'Department dihapus.') && onDeleted()} />}</div>
      </form>
    );
  }
}

// ---------- Editor tim + anggota ----------
class TeamEditor extends AdminTab {
  constructor(props, ctx) {
    super(props, ctx);
    const t = props.teamId ? ctx.container.teams[props.teamId] : null;
    this.state = {
      error: '', name: t ? t.name : '', department: t ? t.department : (props.defaultDept || ''), lead: t ? t.lead : '',
      onCall: t ? t.onCall || '' : '', external: !!(t && t.external), sched: !!(t && t.hours),
      days: t && t.hours ? t.hours.days : [1, 2, 3, 4, 5], from: t && t.hours ? t.hours.from : '08:00', to: t && t.hours ? t.hours.to : '17:00',
      newMember: '',
    };
  }
  set = (k) => (e) => this.setState({ [k]: e.target.value, error: '' });
  toggleDay = (d) => this.setState((s) => ({ days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d], error: '' }));
  input() { const s = this.state; return { name: s.name, department: s.department, lead: s.lead, onCall: s.onCall, external: s.external, hours: s.sched ? { days: s.days, from: s.from, to: s.to } : null }; }
  save = (e) => {
    e.preventDefault();
    const { teamId, onSaved } = this.props;
    if (teamId) { this.act(() => this.admin.updateTeam(teamId, this.input()), 'Tim diperbarui.'); return; }
    let id = null;
    if (this.act(() => { id = this.admin.addTeam(this.input()); }, 'Tim ditambahkan. Tambahkan anggotanya di bawah.')) onSaved(id);
  };
  addMember = (e) => {
    e.preventDefault();
    if (this.act(() => this.admin.addMember(this.props.teamId, { name: this.state.newMember }), 'Anggota ditambahkan.')) this.setState({ newMember: '' });
  };
  patchMember = (m, patch) => this.act(() => this.admin.updateMember(this.props.teamId, m.id, { available: m.available, scope: m.scope || [], ...patch }));

  renderMembers(team) {
    const nodes = this.context.container.listLocations.execute();
    const nameOf = (id) => (nodes.find((n) => n.id === id) || {}).name || id;
    return (
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-950"><Users className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />Anggota ({team.members.length})</h3>
        <p className="mt-1 text-xs text-slate-500">PIC dipilih dari anggota yang tersedia dan mencakup lokasi tiket. Tanpa cakupan area = mencakup semua lokasi. Nama anggota tidak bisa diubah; hapus lalu tambah ulang bila perlu.</p>
        <ul className="mt-3 space-y-2">
          {team.members.map((m) => {
            const scope = m.scope || [];
            return (
              <li key={m.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{m.name}</span>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={m.available} onChange={(e) => this.patchMember(m, { available: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />Tersedia</label>
                  <ConfirmButton onConfirm={() => this.act(() => this.admin.removeMember(this.props.teamId, m.id), `${m.name} dihapus dari tim.`)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500">Cakupan area:</span>
                  {scope.length === 0 && <span className="text-xs font-medium text-slate-700">Semua lokasi</span>}
                  {scope.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-emerald-800">{nameOf(id)}
                      <button type="button" onClick={() => this.patchMember(m, { scope: scope.filter((x) => x !== id) })} aria-label={`Hapus cakupan ${nameOf(id)} dari ${m.name}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-emerald-100"><X className="h-3 w-3" aria-hidden="true" /></button></span>
                  ))}
                  <select aria-label={`Tambah cakupan area untuk ${m.name}`} value="" onChange={(e) => e.target.value && this.patchMember(m, { scope: [...scope, e.target.value] })} className="min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 text-xs">
                    <option value="">+ Tambah area…</option>
                    {nodes.filter((n) => !scope.includes(n.id)).map((n) => <option key={n.id} value={n.id}>{pathText(nodes, n.id)}</option>)}
                  </select>
                </div>
              </li>
            );
          })}
          {!team.members.length && <li className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Belum ada anggota. Tiket akan diteruskan ke ketua tim.</li>}
        </ul>
        <form onSubmit={this.addMember} className="mt-3 flex gap-2">
          <label htmlFor="member-name" className="sr-only">Nama anggota baru</label>
          <input id="member-name" className={inputCls} value={this.state.newMember} onChange={this.set('newMember')} placeholder="Nama anggota baru" />
          <button type="submit" className={btnSecondary}><Plus className="h-4 w-4" aria-hidden="true" />Tambah</button>
        </form>
      </div>
    );
  }

  render() {
    const { container } = this.context;
    const { teamId, onDeleted } = this.props;
    const s = this.state;
    const team = teamId ? container.teams[teamId] : null;
    const others = Object.entries(container.teams).filter(([k]) => k !== teamId);
    return (
      <div>
        <form onSubmit={this.save} className="space-y-4">
          <h2 className="font-semibold text-slate-950">{teamId ? 'Ubah tim' : 'Tim baru'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama tim" htmlFor="team-name"><input id="team-name" className={`${inputCls} mt-1`} value={s.name} onChange={this.set('name')} /></Field>
            <Field label="Department" htmlFor="team-dept">
              <select id="team-dept" className={`${inputCls} mt-1`} value={s.department} onChange={this.set('department')}>
                <option value="">Pilih department…</option>{Object.entries(container.departments).map(([k, d]) => <option key={k} value={k}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Ketua tim" htmlFor="team-lead" hint="Menerima eskalasi SLA level 1."><input id="team-lead" className={`${inputCls} mt-1`} value={s.lead} onChange={this.set('lead')} /></Field>
            <Field label="Tim on-call" htmlFor="team-oncall" hint="Menerima tiket di luar jam kerja.">
              <select id="team-oncall" className={`${inputCls} mt-1`} value={s.onCall} onChange={this.set('onCall')}>
                <option value="">Tidak ada</option>{others.map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" checked={s.external} onChange={(e) => this.setState({ external: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />Tim eksternal (vendor / pihak luar)</label>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-800">Jam kerja (WIB)</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="hours" checked={!s.sched} onChange={() => this.setState({ sched: false })} className="accent-[var(--brand)]" />24 jam</label>
              <label className="flex items-center gap-2"><input type="radio" name="hours" checked={s.sched} onChange={() => this.setState({ sched: true })} className="accent-[var(--brand)]" />Terjadwal</label>
            </div>
            {s.sched && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Hari kerja">
                  {DAYS.map(([d, l]) => <button key={d} type="button" aria-pressed={s.days.includes(d)} onClick={() => this.toggleDay(d)} className={`min-h-[40px] min-w-[48px] rounded-lg border px-3 text-sm font-semibold ${s.days.includes(d) ? 'border-[var(--brand)] bg-emerald-50 text-[var(--brand)]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{l}</button>)}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">Dari<input type="time" className={`${inputCls} !w-auto`} value={s.from} onChange={this.set('from')} /></label>
                  <label className="flex items-center gap-2">Sampai<input type="time" className={`${inputCls} !w-auto`} value={s.to} onChange={this.set('to')} /></label>
                </div>
              </div>
            )}
          </fieldset>
          <ErrorNote error={s.error} />
          <div className="flex items-center gap-2">
            <button type="submit" className={btnPrimary}>Simpan</button>
            {teamId && <ConfirmButton onConfirm={() => this.act(() => this.admin.removeTeam(teamId), 'Tim dihapus.') && onDeleted()} />}
          </div>
        </form>
        {team ? this.renderMembers(team) : <p className="mt-5 text-sm text-slate-500">Simpan tim ini dulu, lalu tambahkan anggotanya.</p>}
      </div>
    );
  }
}

// ---------- Halaman tab ----------
export default class AdminTeams extends AdminTab {
  // sel: null | { kind: 'team' | 'dept' | 'newTeam' | 'newDept', id?, dept? }
  state = { error: '', sel: null };
  select = (sel) => this.setState({ sel });
  render() {
    const { container } = this.context;
    const { sel } = this.state;
    const depts = Object.entries(container.departments);
    const teams = Object.entries(container.teams);
    const item = (active) => `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${active ? 'bg-emerald-50 font-semibold text-[var(--brand)]' : 'text-slate-700 hover:bg-slate-50'}`;
    return (
      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-3" aria-label="Daftar department dan tim">
          {depts.map(([id, d]) => (
            <div key={id} className="mb-3 last:mb-0">
              <button type="button" onClick={() => this.select({ kind: 'dept', id })} className={`${item(sel && sel.kind === 'dept' && sel.id === id)} !font-semibold`} aria-label={`Department ${d.name}`}>
                <span>{d.name}</span><span className="text-xs font-normal text-slate-500">Kepala: {d.head}</span>
              </button>
              <ul className="ml-3 border-l border-slate-100 pl-2">
                {teams.filter(([, t]) => t.department === id).map(([tid, t]) => (
                  <li key={tid}><button type="button" onClick={() => this.select({ kind: 'team', id: tid })} className={item(sel && sel.kind === 'team' && sel.id === tid)}>
                    <span className="min-w-0"><span className="block truncate">{t.name}{t.external ? ' (vendor)' : ''}</span><span className="block text-xs font-normal text-slate-500">{t.members.length} anggota · {hoursText(t.hours)}</span></span>
                  </button></li>
                ))}
                <li><button type="button" onClick={() => this.select({ kind: 'newTeam', dept: id })} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-emerald-50"><Plus className="h-3.5 w-3.5" aria-hidden="true" />Tim di {d.name}</button></li>
              </ul>
            </div>
          ))}
          <button type="button" onClick={() => this.select({ kind: 'newDept' })} className={`${btnSmall} mt-2 w-full border border-dashed border-slate-300 text-slate-700 hover:bg-slate-50`}><Plus className="h-3.5 w-3.5" aria-hidden="true" />Department baru</button>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Editor">
          {!sel && <p className="text-sm text-slate-500">Pilih department atau tim di sebelah kiri untuk mengubahnya, atau tambahkan yang baru.</p>}
          {sel && sel.kind === 'dept' && <DepartmentEditor key={`d-${sel.id}`} deptId={sel.id} onSaved={() => {}} onDeleted={() => this.select(null)} />}
          {sel && sel.kind === 'newDept' && <DepartmentEditor key="d-new" deptId={null} onSaved={(id) => this.select({ kind: 'dept', id })} onDeleted={() => {}} />}
          {sel && sel.kind === 'team' && container.teams[sel.id] && <TeamEditor key={`t-${sel.id}`} teamId={sel.id} onSaved={() => {}} onDeleted={() => this.select(null)} />}
          {sel && sel.kind === 'newTeam' && <TeamEditor key={`t-new-${sel.dept}`} teamId={null} defaultDept={sel.dept} onSaved={(id) => this.select({ kind: 'team', id })} onDeleted={() => {}} />}
        </section>
      </div>
    );
  }
}
