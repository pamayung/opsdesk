import React from 'react';
import { ArrowUp, ArrowDown, AlertTriangle, Plus, FlaskConical, Moon } from 'lucide-react';
import { REQUEST_TYPES, LOCATION_KINDS, PRIORITIES } from '../../../domain/constants';
import { findShadowed, DEFAULT_RULE_ID } from '../../../domain/Admin';
import { pathText } from '../../../domain/Location';
import { AdminTab, Field, ConfirmButton, ErrorNote, inputCls, btnPrimary, btnSecondary, btnSmall } from '../../components/admin/kit';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Waktu simulasi: hari tertentu (Senin = 28 Sep 2026) pada jam WIB.
const simTime = (dayIdx, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return Date.UTC(2026, 8, 28 + dayIdx, h - 7, m); };
const emptyRule = { category: '', sub: '', type: '', kind: '', team: '' };

export default class AdminRules extends AdminTab {
  // form: null | { id?, category, sub, type, kind, team }
  state = {
    error: '', form: null,
    test: { category: '', sub: '', type: 'incident', location: '', priority: 'P3', sim: false, day: 2, time: '10:00' },
  };
  set = (k) => (e) => {
    const v = e.target.value; const f = { ...this.state.form, [k]: v };
    if (k === 'category') f.sub = '';
    this.setState({ form: f, error: '' });
  };
  save = (e) => {
    e.preventDefault();
    const f = this.state.form;
    const ok = this.act(() => (f.id ? this.admin.updateRule(f.id, f) : this.admin.addRule(f)), f.id ? 'Rule diperbarui.' : 'Rule ditambahkan di atas default rule.');
    if (ok) this.setState({ form: null });
  };
  setTest = (k, v) => this.setState((s) => ({ test: { ...s.test, [k]: v, ...(k === 'category' ? { sub: '' } : {}) } }));

  conditions(r, nodes) {
    const { container } = this.context;
    const cats = container.listCategories.execute();
    const out = [];
    if (r.category) out.push(['Kategori', (cats.find((c) => c.id === r.category) || {}).name || `${r.category} (dihapus)`]);
    if (r.sub) out.push(['Sub', ((container.catalog.subsOf(r.category).find((s) => s.id === r.sub)) || {}).name || `${r.sub} (dihapus)`]);
    if (r.type) out.push(['Type', REQUEST_TYPES[r.type].label]);
    if (r.kind) out.push(['Lokasi', LOCATION_KINDS[r.kind].label]);
    return out;
  }
  teamOptions() {
    const { container } = this.context;
    return Object.entries(container.departments).map(([id, d]) => (
      <optgroup key={id} label={d.name}>{Object.entries(container.teams).filter(([, t]) => t.department === id).map(([tid, t]) => <option key={tid} value={tid}>{t.name}</option>)}</optgroup>
    ));
  }

  renderTester(nodes) {
    const { container } = this.context;
    const t = this.state.test;
    const cats = container.listCategories.execute();
    const subs = t.category ? container.catalog.subsOf(t.category) : [];
    const loc = t.location ? nodes.find((n) => n.id === t.location) : null;
    let res = null; let needSub = false;
    if (t.category && loc) {
      needSub = subs.length > 0 && !t.sub;
      if (!needSub) res = container.previewRoute.execute({ categoryId: t.category, subId: t.sub || undefined, type: t.type, kind: container.locationKind(loc.name), priority: t.priority, locationIds: container.locationIds(loc.name) }, t.sim ? simTime(t.day, t.time) : Date.now());
    }
    const ruleNo = res ? container.rules.findIndex((r) => r.id === res.ruleId) + 1 : 0;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24" aria-labelledby="test-title">
        <h2 id="test-title" className="flex items-center gap-2 font-semibold text-slate-950"><FlaskConical className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />Test routing</h2>
        <p className="mt-1 text-xs text-slate-500">Coba sebuah skenario tanpa membuat tiket. Memakai rule dan team yang tersimpan saat ini.</p>
        <div className="mt-4 space-y-3">
          <Field label="Kategori" htmlFor="t-cat"><select id="t-cat" className={`${inputCls} mt-1`} value={t.category} onChange={(e) => this.setTest('category', e.target.value)}>
            <option value="">Pilih kategori…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="__baru">(Kategori baru / tidak dikenal)</option></select></Field>
          {subs.length > 0 && <Field label="Subkategori" htmlFor="t-sub"><select id="t-sub" className={`${inputCls} mt-1`} value={t.sub} onChange={(e) => this.setTest('sub', e.target.value)}>
            <option value="">Pilih subkategori…</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="t-type"><select id="t-type" className={`${inputCls} mt-1`} value={t.type} onChange={(e) => this.setTest('type', e.target.value)}>{Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label="Priority" htmlFor="t-pri"><select id="t-pri" className={`${inputCls} mt-1`} value={t.priority} onChange={(e) => this.setTest('priority', e.target.value)}>{Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          </div>
          <Field label="Lokasi" htmlFor="t-loc"><select id="t-loc" className={`${inputCls} mt-1`} value={t.location} onChange={(e) => this.setTest('location', e.target.value)}>
            <option value="">Pilih lokasi…</option>{nodes.map((n) => <option key={n.id} value={n.id}>{pathText(nodes, n.id)}</option>)}</select></Field>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" checked={t.sim} onChange={(e) => this.setTest('sim', e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />Simulate a specific day &amp; time</label>
            {t.sim && <div className="mt-2 flex items-center gap-2"><label className="sr-only" htmlFor="t-day">Day</label><select id="t-day" className={`${inputCls} !w-auto`} value={t.day} onChange={(e) => this.setTest('day', Number(e.target.value))}>{DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
              <label className="sr-only" htmlFor="t-time">Time</label><input id="t-time" type="time" className={`${inputCls} !w-auto`} value={t.time} onChange={(e) => this.setTest('time', e.target.value)} /><span className="text-xs text-slate-500">WIB</span></div>}
          </div>
        </div>
        <div className="mt-4" aria-live="polite">
          {!res && <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">{needSub ? 'Pilih subkategori' : 'Pilih kategori dan lokasi'} untuk melihat hasilnya.</p>}
          {res && (
            <div className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm" data-testid="route-result">
              <p><span className="text-xs text-emerald-800">Department</span><br /><span className="font-semibold text-emerald-950">{container.departments[res.department].name}</span></p>
              <p><span className="text-xs text-emerald-800">Team{res.external ? ' (vendor)' : ''}</span><br /><span className="font-semibold text-emerald-950">{res.team}</span></p>
              {res.offHours && <p className="flex items-center gap-1.5 text-xs text-amber-800"><Moon className="h-3.5 w-3.5" aria-hidden="true" />Di luar working hours main team, dialihkan ke on-call.</p>}
              <p><span className="text-xs text-emerald-800">{res.pic && res.pic.byArea ? 'PIC area' : 'Initial PIC'}</span><br /><span className="font-semibold text-emerald-950">{res.pic ? res.pic.name : `Tidak ada yang available, ke team lead ${res.escalation.l1}`}</span></p>
              <p className="text-xs text-emerald-900">Rule #{ruleNo}: {res.ruleId}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  render() {
    const { container } = this.context;
    const nodes = container.listLocations.execute();
    const cats = container.listCategories.execute();
    const rules = container.rules;
    const shadow = findShadowed(rules);
    const { form, error } = this.state;
    const subs = form && form.category ? container.catalog.subsOf(form.category) : [];
    const isDefault = form && form.id === DEFAULT_RULE_ID;
    const movable = rules.filter((r) => r.id !== DEFAULT_RULE_ID);
    return (
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white" aria-labelledby="rules-title">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div><h2 id="rules-title" className="font-semibold text-slate-950">Routing rules</h2><p className="text-xs text-slate-500">Diperiksa dari atas ke bawah; rule pertama yang cocok dipakai. Urutkan dari yang paling spesifik.</p></div>
              <button type="button" onClick={() => this.setState({ form: { ...emptyRule }, error: '' })} className={`${btnSmall} bg-[var(--brand)] text-white hover:brightness-110`}><Plus className="h-3.5 w-3.5" aria-hidden="true" />Rule</button>
            </div>
            <ol className="divide-y divide-slate-100">
              {rules.map((r, i) => {
                const team = container.teams[r.team];
                const conds = this.conditions(r);
                const mi = movable.findIndex((x) => x.id === r.id);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3" data-rule={r.id}>
                    <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.id === DEFAULT_RULE_ID ? <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">All other tickets</span>
                          : conds.map(([k, v]) => <span key={k} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"><span className="text-slate-500">{k}:</span> {v}</span>)}
                        <span className="text-slate-400" aria-hidden="true">→</span>
                        <span className="text-sm font-semibold text-slate-900">{team ? team.name : `${r.team} (team dihapus)`}</span>
                        {team && <span className="text-xs text-slate-500">{container.departments[team.department].name}</span>}
                      </div>
                      {shadow[r.id] && <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-800"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Tidak akan pernah dipakai: sudah tercakup rule "{shadow[r.id]}" di atasnya.</p>}
                    </div>
                    <span className="flex items-center gap-0.5">
                      {r.id !== DEFAULT_RULE_ID && <>
                        <button type="button" disabled={mi === 0} onClick={() => this.act(() => this.admin.moveRule(r.id, -1))} aria-label={`Move up rule ${r.id}`} className={`${btnSmall} !px-2 text-slate-700 hover:bg-slate-100`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" disabled={mi === movable.length - 1} onClick={() => this.act(() => this.admin.moveRule(r.id, 1))} aria-label={`Move down rule ${r.id}`} className={`${btnSmall} !px-2 text-slate-700 hover:bg-slate-100`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                      </>}
                      <button type="button" onClick={() => this.setState({ form: { id: r.id, category: r.category || '', sub: r.sub || '', type: r.type || '', kind: r.kind || '', team: r.team }, error: '' })} aria-label={`Ubah rule ${r.id}`} className={`${btnSmall} text-slate-700 hover:bg-slate-100`}>Ubah</button>
                      {r.id !== DEFAULT_RULE_ID && <ConfirmButton onConfirm={() => this.act(() => this.admin.removeRule(r.id), 'Rule dihapus.')} />}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {form && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="rule-form">
              <h2 id="rule-form" className="font-semibold text-slate-950">{form.id ? (isDefault ? 'Edit default rule' : 'Ubah rule') : 'Rule baru'}</h2>
              <form onSubmit={this.save} className="mt-4 space-y-4">
                {isDefault ? <p className="text-sm text-slate-600">Rule ini berlaku untuk semua tiket yang tidak cocok dengan rule lain (mis. kategori baru). Hanya team tujuannya yang bisa diubah.</p> : <>
                  <p className="text-sm text-slate-600">Isi kondisi yang ingin dicocokkan. Kondisi yang dikosongkan berarti "apa saja".</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Kategori" htmlFor="r-cat"><select id="r-cat" className={`${inputCls} mt-1`} value={form.category} onChange={this.set('category')}><option value="">Semua kategori</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
                    <Field label="Subkategori" htmlFor="r-sub"><select id="r-sub" className={`${inputCls} mt-1`} value={form.sub} onChange={this.set('sub')} disabled={!form.category || subs.length === 0}><option value="">Semua subkategori</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                    <Field label="Request type" htmlFor="r-type"><select id="r-type" className={`${inputCls} mt-1`} value={form.type} onChange={this.set('type')}><option value="">All types</option>{Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
                    <Field label="Jenis lokasi" htmlFor="r-kind"><select id="r-kind" className={`${inputCls} mt-1`} value={form.kind} onChange={this.set('kind')}><option value="">Semua lokasi</option>{Object.entries(LOCATION_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
                  </div></>}
                <Field label="Target team" htmlFor="r-team"><select id="r-team" className={`${inputCls} mt-1`} value={form.team} onChange={this.set('team')}><option value="">Pilih team…</option>{this.teamOptions()}</select></Field>
                <ErrorNote error={error} />
                <div className="flex gap-2"><button type="submit" className={btnPrimary}>Simpan rule</button><button type="button" onClick={() => this.setState({ form: null, error: '' })} className={btnSecondary}>Batal</button></div>
              </form>
            </section>
          )}
          {!form && <ErrorNote error={error} />}
        </div>
        {this.renderTester(nodes)}
      </div>
    );
  }
}
