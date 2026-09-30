import React from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { QUESTION_TYPES } from '../../../domain/Admin';
import { AdminTab, Field, ConfirmButton, ErrorNote, inputCls, btnPrimary, btnSecondary, btnSmall } from '../../components/admin/kit';

let uidSeq = 0;
const toRow = (q) => ({ uid: ++uidSeq, id: q.id, label: q.label, type: q.type, optionsText: (q.options || []).join(', '), required: !!q.required, placeholder: q.placeholder || '' });

// ---------- Editor pertanyaan dinamis satu subkategori ----------
class QuestionEditor extends AdminTab {
  constructor(props, ctx) { super(props, ctx); this.state = { error: '', rows: props.sub.questions.map(toRow), dirty: false }; }
  patch = (uid, p) => this.setState((s) => ({ rows: s.rows.map((r) => (r.uid === uid ? { ...r, ...p } : r)), dirty: true, error: '' }));
  add = () => this.setState((s) => ({ rows: [...s.rows, toRow({ label: '', type: 'text' })], dirty: true }));
  remove = (uid) => this.setState((s) => ({ rows: s.rows.filter((r) => r.uid !== uid), dirty: true }));
  move = (i, d) => this.setState((s) => { const rows = [...s.rows]; const j = i + d; if (j < 0 || j >= rows.length) return null; [rows[i], rows[j]] = [rows[j], rows[i]]; return { rows, dirty: true }; });
  save = () => {
    const { catId, sub } = this.props;
    const input = this.state.rows.map((r) => ({ id: r.id, label: r.label, type: r.type, options: r.optionsText.split(','), required: r.required, placeholder: r.placeholder }));
    if (this.act(() => this.admin.saveQuestions(catId, sub.id, input), 'Pertanyaan disimpan.')) this.setState((s) => ({ rows: this.context.container.catalog.subOf(catId, sub.id).questions.map(toRow), dirty: false }));
  };
  render() {
    const { rows, dirty, error } = this.state;
    return (
      <div>
        <p className="text-sm text-slate-600">Pertanyaan ini muncul di formulir setelah pengguna memilih subkategori ini. Jawaban tampil di detail tiket.</p>
        <ul className="mt-4 space-y-3">
          {rows.map((r, i) => (
            <li key={r.uid} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                <Field label={`Pertanyaan ${i + 1}`} htmlFor={`ql-${r.uid}`}><input id={`ql-${r.uid}`} className={`${inputCls} mt-1`} value={r.label} onChange={(e) => this.patch(r.uid, { label: e.target.value })} placeholder="Contoh: Nomor unit" /></Field>
                <Field label="Jenis jawaban" htmlFor={`qt-${r.uid}`}><select id={`qt-${r.uid}`} className={`${inputCls} mt-1`} value={r.type} onChange={(e) => this.patch(r.uid, { type: e.target.value })}>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              </div>
              {r.type === 'select' && <Field className="mt-3" label="Pilihan jawaban" htmlFor={`qo-${r.uid}`} hint="Pisahkan dengan koma. Minimal 2 pilihan."><input id={`qo-${r.uid}`} className={`${inputCls} mt-1`} value={r.optionsText} onChange={(e) => this.patch(r.uid, { optionsText: e.target.value })} placeholder="Ringan, Berat, Darurat" /></Field>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" checked={r.required} onChange={(e) => this.patch(r.uid, { required: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />Wajib dijawab</label>
                <span className="flex items-center gap-0.5">
                  <button type="button" disabled={i === 0} onClick={() => this.move(i, -1)} aria-label={`Naikkan pertanyaan ${i + 1}`} className={`${btnSmall} !px-2 text-slate-700 hover:bg-slate-100`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" disabled={i === rows.length - 1} onClick={() => this.move(i, 1)} aria-label={`Turunkan pertanyaan ${i + 1}`} className={`${btnSmall} !px-2 text-slate-700 hover:bg-slate-100`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => this.remove(r.uid)} aria-label={`Hapus pertanyaan ${i + 1}`} className={`${btnSmall} !px-2 text-red-700 hover:bg-red-50`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </span>
              </div>
            </li>
          ))}
          {!rows.length && <li className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Belum ada pertanyaan tambahan untuk subkategori ini.</li>}
        </ul>
        <ErrorNote error={error} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={this.add} className={btnSecondary}><Plus className="h-4 w-4" aria-hidden="true" />Tambah pertanyaan</button>
          <button type="button" onClick={this.save} disabled={!dirty} className={btnPrimary}>Simpan pertanyaan</button>
          {dirty && <span className="text-xs text-amber-800">Ada perubahan yang belum disimpan.</span>}
        </div>
      </div>
    );
  }
}

// ---------- Halaman tab ----------
export default class AdminCatalog extends AdminTab {
  state = { error: '', catId: '', subId: '', newCat: '', newSub: '', renameCat: '', renameSub: '' };
  pickCat = (id) => this.setState({ catId: id, subId: '', renameCat: '', renameSub: '', error: '' });
  pickSub = (id) => this.setState({ subId: id, renameSub: '', error: '' });

  render() {
    const { container } = this.context;
    const cats = container.listCategories.execute();
    const usage = this.admin.usage().byCategory;
    const { catId, subId, newCat, newSub, renameCat, renameSub, error } = this.state;
    const cat = cats.find((c) => c.id === catId) || null;
    const subs = cat ? container.catalog.subsOf(cat.id) : [];
    const sub = subs.find((s) => s.id === subId) || null;
    const item = (active) => `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${active ? 'bg-emerald-50 font-semibold text-[var(--brand)]' : 'text-slate-700 hover:bg-slate-50'}`;
    return (
      <div className="grid items-start gap-5 lg:grid-cols-[250px_270px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-3" aria-label="Kategori">
          <h2 className="px-3 pb-2 pt-1 text-sm font-semibold text-slate-950">Kategori</h2>
          <ul>{cats.map((c) => <li key={c.id}><button type="button" onClick={() => this.pickCat(c.id)} className={item(catId === c.id)}><span className="min-w-0 truncate">{c.name}</span><span className="text-xs font-normal text-slate-500">{usage[c.id] || 0} tiket</span></button></li>)}</ul>
          <form onSubmit={(e) => { e.preventDefault(); if (this.act(() => this.admin.addCategory(newCat), 'Kategori ditambahkan.')) this.setState({ newCat: '' }); }} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <label className="sr-only" htmlFor="new-cat">Kategori baru</label>
            <input id="new-cat" className={`${inputCls} !min-h-[40px]`} value={newCat} onChange={(e) => this.setState({ newCat: e.target.value, error: '' })} placeholder="Kategori baru" />
            <button type="submit" className={`${btnSmall} shrink-0 bg-[var(--brand)] !min-h-[40px] text-white`} aria-label="Tambah kategori"><Plus className="h-4 w-4" aria-hidden="true" /></button>
          </form>
          {cat && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <label className="text-xs font-medium text-slate-600" htmlFor="ren-cat">Ubah nama "{cat.name}"</label>
              <div className="mt-1 flex gap-2"><input id="ren-cat" className={`${inputCls} !min-h-[40px]`} value={renameCat || cat.name} onChange={(e) => this.setState({ renameCat: e.target.value, error: '' })} /><button type="button" onClick={() => this.act(() => this.admin.updateCategory(cat.id, renameCat || cat.name), 'Kategori diperbarui.') && this.setState({ renameCat: '' })} className={`${btnSmall} shrink-0 bg-slate-100 !min-h-[40px]`}>Simpan</button></div>
              <div className="mt-2"><ConfirmButton onConfirm={() => this.act(() => this.admin.removeCategory(cat.id), 'Kategori dihapus.') && this.pickCat('')} label="Hapus kategori" /></div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3" aria-label="Subkategori">
          <h2 className="px-3 pb-2 pt-1 text-sm font-semibold text-slate-950">Subkategori{cat ? ` · ${cat.name}` : ''}</h2>
          {!cat && <p className="px-3 pb-3 text-sm text-slate-500">Pilih kategori lebih dulu.</p>}
          {cat && <>
            <ul>{subs.map((s) => <li key={s.id}><button type="button" onClick={() => this.pickSub(s.id)} className={item(subId === s.id)}><span className="min-w-0 truncate">{s.name}</span><span className="text-xs font-normal text-slate-500">{s.questions.length} pertanyaan</span></button></li>)}
              {!subs.length && <li className="px-3 py-2 text-sm text-slate-500">Belum ada subkategori. Tiket kategori ini langsung dirutekan tanpa subkategori.</li>}</ul>
            <form onSubmit={(e) => { e.preventDefault(); if (this.act(() => this.admin.addSub(cat.id, newSub), 'Subkategori ditambahkan.')) this.setState({ newSub: '' }); }} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <label className="sr-only" htmlFor="new-sub">Subkategori baru</label>
              <input id="new-sub" className={`${inputCls} !min-h-[40px]`} value={newSub} onChange={(e) => this.setState({ newSub: e.target.value, error: '' })} placeholder="Subkategori baru" />
              <button type="submit" className={`${btnSmall} shrink-0 bg-[var(--brand)] !min-h-[40px] text-white`} aria-label="Tambah subkategori"><Plus className="h-4 w-4" aria-hidden="true" /></button>
            </form>
            {sub && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label className="text-xs font-medium text-slate-600" htmlFor="ren-sub">Ubah nama "{sub.name}"</label>
                <div className="mt-1 flex gap-2"><input id="ren-sub" className={`${inputCls} !min-h-[40px]`} value={renameSub || sub.name} onChange={(e) => this.setState({ renameSub: e.target.value, error: '' })} /><button type="button" onClick={() => this.act(() => this.admin.renameSub(cat.id, sub.id, renameSub || sub.name), 'Subkategori diperbarui.') && this.setState({ renameSub: '' })} className={`${btnSmall} shrink-0 bg-slate-100 !min-h-[40px]`}>Simpan</button></div>
                <div className="mt-2"><ConfirmButton onConfirm={() => this.act(() => this.admin.removeSub(cat.id, sub.id), 'Subkategori dihapus.') && this.pickSub('')} label="Hapus subkategori" /></div>
              </div>
            )}
          </>}
          <ErrorNote error={error} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Pertanyaan dinamis">
          <h2 className="font-semibold text-slate-950">Pertanyaan{sub ? ` · ${sub.name}` : ''}</h2>
          {!sub && <p className="mt-2 text-sm text-slate-500">Pilih subkategori untuk mengatur pertanyaan tambahannya.</p>}
          {sub && <QuestionEditor key={`${cat.id}/${sub.id}`} catId={cat.id} sub={sub} />}
        </section>
      </div>
    );
  }
}
