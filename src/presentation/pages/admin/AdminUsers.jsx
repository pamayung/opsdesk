import React from 'react';
import { Plus, Check } from 'lucide-react';
import { AdminTab, Field, ConfirmButton, ErrorNote, inputCls, btnPrimary, btnSecondary, btnSmall } from '../../components/admin/kit';

const blank = { name: '', title: '', role: 'employee', department: '', teamIds: [], location: '' };

export default class AdminUsers extends AdminTab {
  // form: null | { id?, name, title, role, department, teamIds, location }
  state = { error: '', form: null };
  set = (k) => (e) => this.setState({ form: { ...this.state.form, [k]: e.target.value }, error: '' });
  toggleTeam = (id) => { const f = this.state.form; this.setState({ form: { ...f, teamIds: f.teamIds.includes(id) ? f.teamIds.filter((x) => x !== id) : [...f.teamIds, id] }, error: '' }); };
  edit = (u) => this.setState({ error: '', form: { id: u.id, name: u.name, title: u.title || '', role: u.role, department: u.department || '', teamIds: u.teamIds || [], location: u.location || '' } });
  save = (e) => {
    e.preventDefault();
    const f = this.state.form;
    const ok = this.act(() => (f.id ? this.admin.updateUser(f.id, f) : this.admin.addUser(f)), f.id ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.');
    if (ok) this.setState({ form: null });
  };
  scopeText(u) {
    const { container } = this.context;
    if (u.role === 'manager') return `Department ${(container.departments[u.department] || {}).name || u.department}`;
    if (u.role === 'pic') return (u.teamIds || []).map((t) => (container.teams[t] || {}).name || t).join(', ');
    if (u.role === 'employee') return u.location ? `Lokasi ${u.location}` : 'Tiket yang ia laporkan';
    return u.role === 'admin' ? 'Konfigurasi + semua tiket (hanya lihat)' : 'Semua tiket (hanya lihat)';
  }
  render() {
    const { container, user: me } = this.context;
    const { form, error } = this.state;
    const nodes = container.listLocations.execute();
    return (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white" aria-labelledby="usr-title">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 id="usr-title" className="font-semibold text-slate-950">Pengguna</h2><p className="text-xs text-slate-500">{container.users.length} pengguna. Peran menentukan dashboard, tiket yang terlihat, dan aksi yang boleh dilakukan.</p></div>
            <button type="button" onClick={() => this.setState({ form: { ...blank }, error: '' })} className={`${btnSmall} bg-[var(--brand)] text-white hover:brightness-110`}><Plus className="h-3.5 w-3.5" aria-hidden="true" />Pengguna</button>
          </div>
          <ul className="divide-y divide-slate-100">
            {container.users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3" data-user={u.id}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700" aria-hidden="true">{u.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">{u.name}<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{container.roles[u.role].label}</span>{u.id === me.id && <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Check className="h-3 w-3" aria-hidden="true" />Anda</span>}</span>
                  <span className="block truncate text-xs text-slate-500">{[u.title, this.scopeText(u)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => this.edit(u)} className={`${btnSmall} text-slate-700 hover:bg-slate-100`} aria-label={`Ubah ${u.name}`}>Ubah</button>
                  <ConfirmButton disabled={u.id === me.id} onConfirm={() => this.act(() => this.admin.removeUser(u.id, me.id), `${u.name} dihapus.`)} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24" aria-labelledby="usr-form">
          <h2 id="usr-form" className="font-semibold text-slate-950">{form ? (form.id ? 'Ubah pengguna' : 'Pengguna baru') : 'Editor pengguna'}</h2>
          {!form && <p className="mt-2 text-sm text-slate-500">Pilih <span className="font-medium">Ubah</span> pada sebuah pengguna, atau tambahkan pengguna baru.</p>}
          {form && (
            <form onSubmit={this.save} className="mt-4 space-y-4">
              <Field label="Nama" htmlFor="u-name" hint={form.id ? 'Nama tidak bisa diubah agar riwayat tiket tetap terkait.' : undefined}><input id="u-name" className={`${inputCls} mt-1`} value={form.name} onChange={this.set('name')} disabled={!!form.id} /></Field>
              <Field label="Jabatan" htmlFor="u-title"><input id="u-title" className={`${inputCls} mt-1`} value={form.title} onChange={this.set('title')} placeholder="Contoh: IT Support Area" /></Field>
              <Field label="Peran" htmlFor="u-role"><select id="u-role" className={`${inputCls} mt-1`} value={form.role} onChange={this.set('role')}>{Object.entries(container.roles).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
              {form.role === 'manager' && <Field label="Department yang dikelola" htmlFor="u-dept"><select id="u-dept" className={`${inputCls} mt-1`} value={form.department} onChange={this.set('department')}><option value="">Pilih department…</option>{Object.entries(container.departments).map(([k, d]) => <option key={k} value={k}>{d.name}</option>)}</select></Field>}
              {form.role === 'pic' && (
                <fieldset><legend className="text-sm font-medium text-slate-800">Tim</legend>
                  <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                    {Object.entries(container.teams).map(([id, t]) => <label key={id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-50"><input type="checkbox" checked={form.teamIds.includes(id)} onChange={() => this.toggleTeam(id)} className="h-4 w-4 accent-[var(--brand)]" />{t.name}<span className="text-xs text-slate-500">{container.departments[t.department].name}</span></label>)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">PIC melihat tiket yang masuk ke tim-tim ini.</p></fieldset>
              )}
              {form.role === 'employee' && <Field label="Lokasi (opsional)" htmlFor="u-loc" hint="Terisi otomatis saat pengguna ini membuat tiket."><select id="u-loc" className={`${inputCls} mt-1`} value={form.location} onChange={this.set('location')}><option value="">Tidak ditentukan</option>{nodes.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}</select></Field>}
              <ErrorNote error={error} />
              <div className="flex gap-2"><button type="submit" className={`${btnPrimary} flex-1`}>Simpan</button><button type="button" onClick={() => this.setState({ form: null, error: '' })} className={btnSecondary}>Batal</button></div>
            </form>
          )}
          {!form && <ErrorNote error={error} />}
        </section>
      </div>
    );
  }
}
