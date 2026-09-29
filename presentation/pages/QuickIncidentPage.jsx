import React from 'react';
import { AppContext } from '../../app/AppContext';
import { PRIORITIES } from '../../domain/constants';
import { normalize } from '../../domain/Category';
import { Card, Button, PriorityBadge } from '../components/ui';

const initial = { priority: '', location: '', categoryText: '', description: '', reporter: '', photo: null, error: '' };
const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]';

export default class QuickIncidentPage extends React.Component {
  static contextType = AppContext;
  state = { ...initial };

  componentWillUnmount() { if (this.state.photo) URL.revokeObjectURL(this.state.photo.url); }

  set = (k) => (e) => this.setState({ [k]: e.target.value, error: '' });

  onPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (this.state.photo) URL.revokeObjectURL(this.state.photo.url);
    this.setState({ photo: { name: f.name, url: URL.createObjectURL(f) } });
  };

  submit = () => {
    const { container, notify, goTo } = this.context;
    const { priority, location, categoryText, description, reporter, photo } = this.state;
    try {
      const r = container.createTicket.execute({ priority, location, categoryName: categoryText, description, reporter, hasPhoto: !!photo });
      notify(`Tiket ${r.ticket.id} terkirim${r.isNewCategory ? ` · kategori "${r.category.name}" ditambahkan` : ''}`);
      this.setState({ ...initial });
      goTo('tickets');
    } catch (err) { this.setState({ error: err.message }); }
  };

  step(n, title, hint) {
    return (
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--brand)] text-sm text-white">{n}</span>{title}
        </h2>
        <span className="text-xs text-slate-500">{hint}</span>
      </div>
    );
  }

  render() {
    const { container } = this.context;
    const { priority, location, categoryText, description, reporter, photo, error } = this.state;
    const categories = container.listCategories.execute();
    const locations = container.listLocations.execute();
    const typed = categoryText.trim();
    const existing = typed && categories.find((c) => normalize(c.name) === normalize(typed));
    const isNew = typed && !existing;
    const p = PRIORITIES[priority];
    const row = (k, v) => <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-900">{v || '—'}</dd></div>;

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Laporkan masalah</h1>
            <p className="text-sm text-slate-600">Tiga langkah, selesai kurang dari 30 detik.</p>
          </header>

          <Card>
            {this.step(1, 'Seberapa darurat?', 'Wajib dipilih')}
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={priority === k} onClick={() => this.setState({ priority: k, error: '' })}
                  className={`rounded-xl border p-3 text-left transition ${priority === k ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between gap-2"><PriorityBadge priority={k} /><span className="text-xs text-slate-500">Target {v.slaText}</span></div>
                  <p className="mt-2 text-sm text-slate-700">{v.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            {this.step(2, 'Di mana dan apa masalahnya?', 'Wajib diisi')}
            <label className="block text-sm font-medium text-slate-800" htmlFor="loc">Lokasi</label>
            <input id="loc" list="locs" value={location} onChange={this.set('location')} maxLength={80} autoComplete="off"
              placeholder="Contoh: Lantai 2, ruang rapat B" className={input} />
            <datalist id="locs">{locations.map((l) => <option key={l} value={l} />)}</datalist>

            <label className="mt-4 block text-sm font-medium text-slate-800" htmlFor="cat">Kategori</label>
            <input id="cat" value={categoryText} onChange={this.set('categoryText')} maxLength={40} autoComplete="off"
              placeholder="Pilih di bawah atau ketik kategori baru" className={input} />
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={!!existing && existing.id === c.id} onClick={() => this.setState({ categoryText: c.name, error: '' })}
                  className={`min-h-[40px] rounded-xl px-3 text-sm font-medium ${existing && existing.id === c.id ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                  {c.name}
                </button>
              ))}
            </div>
            {isNew && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Kategori "{typed}" belum ada dan akan ditambahkan otomatis saat tiket dikirim.</p>}

            <label className="mt-4 block text-sm font-medium text-slate-800" htmlFor="desc">Deskripsi singkat</label>
            <textarea id="desc" rows={3} value={description} maxLength={300} onChange={this.set('description')}
              placeholder="Jelaskan singkat apa yang terjadi dan dampaknya"
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]" />
            <div className="text-right text-xs text-slate-500">{description.length}/300</div>

            <label className="block text-sm font-medium text-slate-800" htmlFor="rep">Nama pelapor (opsional)</label>
            <input id="rep" value={reporter} onChange={this.set('reporter')} maxLength={40} placeholder="Nama atau peran Anda" className={input} />
          </Card>

          <Card>
            {this.step(3, 'Foto bukti', 'Opsional')}
            <label className="grid min-h-[140px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:bg-slate-100">
              {photo
                ? <div><img src={photo.url} alt="Pratinjau bukti" className="mx-auto max-h-40 rounded-lg" /><p className="mt-2 text-xs text-slate-600">{photo.name} · ketuk untuk mengganti</p></div>
                : <div><p className="text-2xl">📷</p><p className="text-sm font-medium text-slate-800">Ambil foto atau unggah dari galeri</p><p className="text-xs text-slate-500">JPG, PNG, atau HEIC</p></div>}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={this.onPhoto} />
            </label>
          </Card>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="sticky bottom-16 z-10 flex gap-3 bg-slate-50/90 py-2 backdrop-blur lg:static lg:bg-transparent">
            <Button className="flex-1" onClick={this.submit}>Kirim tiket sekarang</Button>
            <Button variant="ghost" onClick={() => this.setState({ ...initial })}>Reset</Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Pratinjau tiket</h2>
            <dl className="mt-2 divide-y divide-slate-100">
              {row('Lokasi', location.trim())}
              {row('Prioritas', priority && p.label)}
              {row('Kategori', typed && `${typed}${isNew ? ' (baru)' : ''}`)}
              {row('Target respon', priority && p.slaText)}
            </dl>
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Tiket masuk ke daftar dan diurutkan otomatis berdasarkan batas waktu penanganan.</p>
          </Card>
        </aside>
      </div>
    );
  }
}
