import React from 'react';
import { Plus, MapPin } from 'lucide-react';
import { LOCATION_KINDS } from '../../../domain/constants';
import { chainOf, pathText } from '../../../domain/Location';
import { AdminTab, Field, ConfirmButton, ErrorNote, inputCls, btnPrimary, btnSecondary, btnSmall } from '../../components/admin/kit';

// Urutan pohon (induk lalu turunannya) beserta kedalamannya.
const walk = (nodes, pid = null, depth = 0) => nodes.filter((n) => (n.parentId || null) === pid).flatMap((n) => [{ n, depth }, ...walk(nodes, n.id, depth + 1)]);

export default class AdminLocations extends AdminTab {
  // form: null | { id?: string, name, parentId, kind }
  state = { error: '', form: null };
  add = (parentId) => this.setState({ error: '', form: { name: '', parentId: parentId || '', kind: 'outlet' } });
  edit = (n) => this.setState({ error: '', form: { id: n.id, name: n.name, parentId: n.parentId || '', kind: n.kind || 'outlet' } });
  set = (k) => (e) => this.setState({ form: { ...this.state.form, [k]: e.target.value }, error: '' });
  save = (e) => {
    e.preventDefault();
    const f = this.state.form;
    const ok = this.act(() => (f.id ? this.admin.updateLocation(f.id, f) : this.admin.addLocation(f)), f.id ? 'Lokasi diperbarui.' : 'Lokasi ditambahkan.');
    if (ok) this.setState({ form: null });
  };

  render() {
    const { container } = this.context;
    const nodes = container.listLocations.execute();
    const usage = this.admin.usage().byLocation;
    const { form, error } = this.state;
    // Induk yang boleh dipilih: bukan dirinya sendiri dan bukan turunannya.
    const parents = form ? nodes.filter((n) => !form.id || !chainOf(nodes, n.id).some((x) => x.id === form.id)) : [];
    const rows = walk(nodes);
    return (
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white" aria-labelledby="loc-title">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 id="loc-title" className="font-semibold text-slate-950">Struktur lokasi</h2><p className="text-xs text-slate-500">{nodes.length} lokasi. Jenis (outlet, head office, warehouse) diwarisi turunannya dan dipakai routing rules.</p></div>
            <button type="button" onClick={() => this.add('')} className={`${btnSmall} bg-[var(--brand)] text-white hover:brightness-110`}><Plus className="h-3.5 w-3.5" aria-hidden="true" />Lokasi utama</button>
          </div>
          <ul className="divide-y divide-slate-100">
            {rows.map(({ n, depth }) => (
              <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5" style={{ paddingLeft: 20 + depth * 22 }}>
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0 flex-1"><span className="text-sm font-medium text-slate-900">{n.name}</span>
                  {n.kind && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{LOCATION_KINDS[n.kind].label}</span>}
                  {usage[n.name] > 0 && <span className="ml-2 text-xs text-slate-500">{usage[n.name]} tiket</span>}</span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => this.add(n.id)} className={`${btnSmall} text-[var(--brand)] hover:bg-emerald-50`} aria-label={`Tambah lokasi di bawah ${n.name}`}>+ Anak</button>
                  <button type="button" onClick={() => this.edit(n)} className={`${btnSmall} text-slate-700 hover:bg-slate-100`} aria-label={`Ubah ${n.name}`}>Ubah</button>
                  <ConfirmButton onConfirm={() => this.act(() => this.admin.removeLocation(n.id), `${n.name} dihapus.`)} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24" aria-labelledby="loc-form">
          <h2 id="loc-form" className="font-semibold text-slate-950">{form ? (form.id ? 'Ubah lokasi' : 'Tambah lokasi') : 'Editor lokasi'}</h2>
          {!form && <p className="mt-2 text-sm text-slate-500">Pilih <span className="font-medium">Ubah</span> pada sebuah lokasi, atau tambahkan lokasi baru. Mengganti nama lokasi ikut memperbarui semua tiketnya.</p>}
          {form && (
            <form onSubmit={this.save} className="mt-4 space-y-4">
              <Field label="Nama lokasi" htmlFor="loc-name"><input id="loc-name" className={`${inputCls} mt-1`} value={form.name} onChange={this.set('name')} placeholder="Contoh: Outlet Tebet" autoFocus /></Field>
              <Field label="Berada di bawah" htmlFor="loc-parent" hint="Kosongkan untuk lokasi utama (setingkat Head Office).">
                <select id="loc-parent" className={`${inputCls} mt-1`} value={form.parentId} onChange={this.set('parentId')}>
                  <option value="">Tidak ada (lokasi utama)</option>
                  {parents.map((n) => <option key={n.id} value={n.id}>{pathText(nodes, n.id)}</option>)}
                </select>
              </Field>
              {!form.parentId && (
                <Field label="Jenis lokasi" htmlFor="loc-kind" hint="Diwarisi seluruh turunan dan dipakai routing rules.">
                  <select id="loc-kind" className={`${inputCls} mt-1`} value={form.kind} onChange={this.set('kind')}>
                    {Object.entries(LOCATION_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              )}
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
