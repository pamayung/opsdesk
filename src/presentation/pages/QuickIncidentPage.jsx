import React from 'react';
import { Paperclip, ArrowDown, Clock3, Moon, ChevronDown, MapPin } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import { PRIORITIES, REQUEST_TYPES, LOCATION_KINDS } from '../../domain/constants';
import { normalize } from '../../domain/Category';
import { chainOf, pathText } from '../../domain/Location';
import { readImage } from '../utils/image';
import { Card, Button, PriorityBadge } from '../components/ui';

const initial = {
  type: 'incident', priority: '', locationText: null, newLocParent: '', area: '', categoryText: '', subId: '', answers: {},
  title: '', description: '', onBehalf: false, reporter: '', reporterRole: '', photo: null, busy: false, error: '',
};
const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]';
const chip = (a) => `rounded-xl border px-3 py-3 text-left text-sm ${a ? 'border-[var(--brand)] bg-emerald-50 text-[var(--brand)]' : 'border-slate-200 hover:bg-slate-50'}`;

export default class QuickIncidentPage extends React.Component {
  static contextType = AppContext;
  state = { ...initial };
  componentDidMount() { this.mounted = true; }
  componentWillUnmount() { this.mounted = false; }
  set = (k) => (e) => this.setState({ [k]: e.target.value, error: '' });
  setAnswer = (id, v) => this.setState((s) => ({ answers: { ...s.answers, [id]: v }, error: '' }));
  onPhoto = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    this.setState({ busy: true, error: '' });
    try { const photo = await readImage(f); if (this.mounted) this.setState({ photo, busy: false }); }
    catch (err) { if (this.mounted) this.setState({ busy: false, error: err.message }); }
  };
  // Lokasi awal = lokasi pengguna (mis. karyawan Head Office), kecuali sudah diubah.
  locText() { return this.state.locationText === null ? (this.context.user.location || '') : this.state.locationText; }

  submit = () => {
    const { container, user, notify, goTo } = this.context;
    const s = this.state;
    // Pelapor otomatis pengguna yang login; isi manual hanya bila melapor atas nama orang lain.
    if (s.onBehalf && !s.reporter.trim()) { this.setState({ error: 'Isi nama reporter.' }); return; }
    try {
      const r = container.createTicket.execute({
        type: s.type, priority: s.priority, locationName: this.locText(), newLocationParentId: s.newLocParent, area: s.area,
        categoryName: s.categoryText, subId: s.subId, answers: s.answers, title: s.title, description: s.description, image: s.photo,
        reporter: s.onBehalf ? s.reporter : user.name, reporterRole: s.onBehalf ? s.reporterRole : user.title,
      });
      const extra = [r.isNewLocation && `lokasi baru "${r.location.name}"`, r.isNewCategory && `kategori baru "${r.category.name}"`].filter(Boolean);
      notify(`Tiket ${r.ticket.id} dibuat dan di-route ke ${r.ticket.routing.team}${extra.length ? `. Tersimpan: ${extra.join(', ')}.` : '.'}`);
      this.setState({ ...initial });
      goTo('detail', r.ticket.id);
    } catch (err) { this.setState({ error: err.message }); }
  };

  renderQuestion(q) {
    const v = this.state.answers[q.id] || '';
    const label = <label htmlFor={`q-${q.id}`} className="block text-sm font-medium">{q.label}{!q.required && <span className="font-normal text-slate-500"> (optional)</span>}</label>;
    if (q.type === 'yesno') {
      return (
        <div key={q.id}><p className="text-sm font-medium">{q.label}{!q.required && <span className="font-normal text-slate-500"> (optional)</span>}</p>
          <div className="mt-1 flex gap-2" role="group" aria-label={q.label}>
            {['Ya', 'Tidak'].map((o) => <button key={o} type="button" aria-pressed={v === o} onClick={() => this.setAnswer(q.id, v === o ? '' : o)} className={`min-h-[44px] min-w-[88px] rounded-xl border px-4 text-sm font-semibold ${v === o ? 'border-[var(--brand)] bg-emerald-50 text-[var(--brand)]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>{o}</button>)}
          </div></div>
      );
    }
    if (q.type === 'select') {
      return (
        <div key={q.id}>{label}
          <div className="relative">
            <select id={`q-${q.id}`} value={v} onChange={(e) => this.setAnswer(q.id, e.target.value)} className={`${input} appearance-none pr-9`}>
              <option value="">Pilih…</option>{q.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div></div>
      );
    }
    return <div key={q.id}>{label}<input id={`q-${q.id}`} type={q.type === 'number' ? 'number' : 'text'} min={q.type === 'number' ? 0 : undefined} inputMode={q.type === 'number' ? 'numeric' : undefined} value={v} onChange={(e) => this.setAnswer(q.id, e.target.value)} placeholder={q.placeholder || ''} className={input} /></div>;
  }

  render() {
    const { container, user } = this.context;
    const s = this.state;
    const categories = container.listCategories.execute();
    const nodes = container.listLocations.execute();
    const typedLoc = this.locText().trim();
    const typedCat = s.categoryText.trim();
    const existingLoc = typedLoc && nodes.find((l) => normalize(l.name) === normalize(typedLoc));
    const existingCat = typedCat && categories.find((c) => normalize(c.name) === normalize(typedCat));
    const newLoc = !!typedLoc && !existingLoc;
    // Jenis lokasi & cakupan area diturunkan dari posisi lokasi di pohon (lokasi baru: dari induk yang dipilih).
    const anchorId = existingLoc ? existingLoc.id : newLoc ? s.newLocParent : '';
    const chain = anchorId ? chainOf(nodes, anchorId) : [];
    const kind = (chain.find((n) => n.kind) || {}).kind || '';
    const subs = existingCat ? container.catalog.subsOf(existingCat.id) : [];
    const sub = subs.find((x) => x.id === s.subId) || null;
    const p = PRIORITIES[s.priority];
    const subMissing = subs.length > 0 && !sub;
    const route = subMissing ? null : container.previewRoute.execute({
      categoryId: existingCat ? existingCat.id : typedCat ? '__baru' : null, subId: sub ? sub.id : undefined,
      type: s.type, kind, priority: s.priority, locationIds: chain.map((n) => n.id),
    });
    const missing = [!s.priority && 'priority', !typedLoc ? 'lokasi' : (newLoc && !anchorId) && 'induk lokasi', !typedCat ? 'kategori' : subMissing && 'subkategori'].filter(Boolean);
    const unanswered = sub ? sub.questions.some((q) => q.required && !String(s.answers[q.id] || '').trim()) : false;
    const ready = s.priority && typedLoc && anchorId && typedCat && !subMissing && !unanswered && s.title.trim().length >= 5 && !s.busy;
    const roots = nodes.filter((n) => !n.parentId);
    const under = (root) => nodes.filter((n) => n.id !== root.id && chainOf(nodes, n.id).some((a) => a.id === root.id));
    const parentName = (n) => (nodes.find((x) => x.id === n.parentId) || {}).name;

    return <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Report Issue</h1>
        <p className="mt-1 text-sm text-slate-600">Isi yang penting dulu. Detail dan foto bisa ditambahkan nanti lewat catatan.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-semibold">1. Request type</h2><span className="text-xs text-slate-500">Required</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(REQUEST_TYPES).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={s.type === k} onClick={() => this.setState({ type: k, error: '' })} className={`rounded-xl border p-3 text-left ${s.type === k ? 'border-[var(--brand)] bg-emerald-50 ring-1 ring-[var(--brand)]' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="block text-sm font-semibold">{v.label}</span><span className="mt-0.5 block text-xs text-slate-500">{v.desc}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="font-semibold">2. Priority</h2><span className="text-xs text-slate-500">Required</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={s.priority === k} onClick={() => this.setState({ priority: k, error: '' })} className={`rounded-xl border p-3 text-left ${s.priority === k ? 'border-[var(--brand)] ring-1 ring-[var(--brand)]' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between"><PriorityBadge priority={k} /><span className="text-xs text-slate-500">SLA {v.slaText}</span></div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{v.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="font-semibold">3. Di mana?</h2><span className="text-xs text-slate-500">Required</span></div>
            <label htmlFor="location" className="mt-4 block text-sm font-medium">Lokasi</label>
            <input id="location" value={this.locText()} onChange={this.set('locationText')} placeholder="Ketik lokasi atau pilih di bawah" className={input} />
            <div className="mt-3 space-y-3">
              {roots.map((root) => {
                const kids = under(root);
                const items = kids.length ? kids : [root];
                return (
                  <div key={root.id}>
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">{root.name}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {items.map((l) => (
                        <button key={l.id} type="button" aria-pressed={!!existingLoc && existingLoc.id === l.id} onClick={() => this.setState({ locationText: l.name, newLocParent: '', error: '' })} className={chip(existingLoc && existingLoc.id === l.id)}>
                          <span className="block font-semibold">{l.name}</span>{l.parentId && <span className="mt-0.5 block text-xs text-slate-500">{parentName(l)}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {existingLoc && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{pathText(nodes, existingLoc.id)} · {LOCATION_KINDS[kind].label}</p>}
            {newLoc && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <label htmlFor="parent" className="block text-sm font-medium">Lokasi baru "{typedLoc}" berada di bawah mana?</label>
                <div className="relative">
                  <select id="parent" value={s.newLocParent} onChange={this.set('newLocParent')} className={`${input} appearance-none bg-white pr-9`}>
                    <option value="">Pilih induk…</option>
                    {nodes.map((n) => <option key={n.id} value={n.id}>{pathText(nodes, n.id)}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Lokasi akan disimpan dan mengikuti jenis serta area scope induknya.</p>
              </div>
            )}
            <label htmlFor="area" className="mt-4 block text-sm font-medium">Area / ruangan <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="area" list="areas" value={s.area} onChange={this.set('area')} placeholder="Contoh: area kasir depan, lantai 3" className={input} />
            <datalist id="areas">{container.listAreas.execute(typedLoc).map((a) => <option key={a} value={a} />)}</datalist>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="font-semibold">4. Apa masalahnya?</h2><span className="text-xs text-slate-500">Required</span></div>
            <label htmlFor="category" className="mt-4 block text-sm font-medium">Kategori</label>
            <input id="category" value={s.categoryText} onChange={(e) => this.setState({ categoryText: e.target.value, subId: '', answers: {}, error: '' })} placeholder="Ketik atau pilih di bawah" className={input} />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={!!existingCat && existingCat.id === c.id} onClick={() => this.setState({ categoryText: c.name, subId: '', answers: {}, error: '' })} className={chip(existingCat && existingCat.id === c.id)}>
                  <span className="block font-semibold">{c.name}</span>
                </button>
              ))}
            </div>
            {typedCat && !existingCat && <p className="mt-2 text-xs text-slate-500">Kategori baru "{typedCat}" akan disimpan otomatis dan diteruskan ke Service Desk.</p>}

            {subs.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Subkategori</p>
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {subs.map((x) => <button key={x.id} type="button" aria-pressed={s.subId === x.id} onClick={() => this.setState({ subId: x.id, answers: {}, error: '' })} className={chip(s.subId === x.id)}><span className="block font-semibold">{x.name}</span></button>)}
                </div>
              </div>
            )}
            {sub && sub.questions.length > 0 && (
              <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Additional questions for {sub.name}</p>
                {sub.questions.map((q) => this.renderQuestion(q))}
              </div>
            )}

            <label htmlFor="title" className="mt-5 block text-sm font-medium">Judul singkat</label>
            <input id="title" value={s.title} maxLength={80} onChange={this.set('title')} placeholder="Contoh: Mesin kasir mati total saat jam ramai" className={input} />
            <label htmlFor="description" className="mt-4 block text-sm font-medium">Detail <span className="font-normal text-slate-500">(optional)</span></label>
            <textarea id="description" rows={4} value={s.description} maxLength={500} onChange={this.set('description')} placeholder="Apa yang terjadi? Siapa atau apa yang terdampak? Sejak kapan?" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]" />
            <div className="text-right text-xs text-slate-500">{s.description.length}/500</div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              {!s.onBehalf ? (
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-600">Reporter: <span className="font-semibold text-slate-900">{user.name} ({user.title})</span>
                  <button type="button" onClick={() => this.setState({ onBehalf: true })} className="rounded font-semibold text-[var(--brand)] hover:underline">Report on behalf of someone else</button></p>
              ) : (
                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label htmlFor="reporter" className="block text-sm font-medium">Nama reporter</label><input id="reporter" value={s.reporter} onChange={this.set('reporter')} placeholder="Nama orang yang melapor" className={input} /></div>
                    <div><label htmlFor="role" className="block text-sm font-medium">Role <span className="font-normal text-slate-500">(optional)</span></label><input id="role" list="roles" value={s.reporterRole} onChange={this.set('reporterRole')} placeholder="Contoh: Kasir" className={input} /><datalist id="roles">{container.reporterRoles.map((r) => <option key={r} value={r} />)}</datalist></div>
                  </div>
                  <button type="button" onClick={() => this.setState({ onBehalf: false, reporter: '', reporterRole: '', error: '' })} className="mt-2 rounded text-sm font-semibold text-[var(--brand)] hover:underline">Back to me ({user.name})</button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">5. Photo / evidence</h2>
            <label className="mt-3 grid min-h-[120px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--brand)]">
              {s.photo
                ? <div><img src={s.photo} alt="Preview foto" className="mx-auto max-h-36 rounded-lg" /><p className="mt-2 text-xs text-slate-500">Klik untuk mengganti foto</p></div>
                : <div><Paperclip className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" /><p className="mt-1 text-sm font-medium">{s.busy ? 'Memproses foto…' : 'Ambil atau upload foto kondisi'}</p><p className="text-xs text-slate-500">Optional · JPG atau PNG</p></div>}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={this.onPhoto} />
            </label>
          </Card>

          {s.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{s.error}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!ready} onClick={this.submit}>Submit Ticket</Button>
            <Button variant="ghost" onClick={() => this.setState({ ...initial })}>Reset</Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="text-lg font-semibold">Routing preview</h2>
            <p className="mt-1 text-sm text-slate-600">Ke mana tiket ini akan pergi setelah dikirim.</p>
            {!route ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Pilih {missing.join(', ')} untuk melihat route-nya.</p>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Lokasi &amp; classification</p>
                  <p className="mt-1 font-semibold">{typedLoc}<span className="font-normal text-slate-500"> · {LOCATION_KINDS[kind].label}</span></p>
                  <p className="text-slate-700">{typedCat}{sub ? ` › ${sub.name}` : ''}</p>
                </div>
                <div className="flex justify-center text-slate-400"><ArrowDown className="h-4 w-4" aria-hidden="true" /></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Department</p><p className="mt-1 font-semibold text-emerald-900">{container.departments[route.department].name}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Team{route.external ? ' (vendor)' : ''}</p><p className="mt-1 font-semibold text-emerald-900">{route.team}</p>
                  {route.offHours && <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-800"><Moon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Di luar working hours main team, dialihkan ke on-call.</p>}
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{route.pic && route.pic.byArea ? 'PIC area' : 'Initial PIC'}</p>
                  {route.pic
                    ? <p className="mt-1 font-semibold">{route.pic.name}<span className="ml-1.5 text-xs font-normal text-slate-500">{route.pic.load} tiket aktif</span></p>
                    : <p className="mt-1 text-slate-700">Belum ada member yang available. Diteruskan ke team lead <span className="font-semibold">{route.escalation.l1}</span>.</p>}
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />SLA</p>
                  <p className="mt-1 font-semibold">Response &lt; {p.respondText} · Resolution &lt; {p.slaText}</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{route.escalation.l1 === route.escalation.l2 ? `Auto-escalation ke ${route.escalation.l1} bila belum di-respond atau saat sisa SLA di bawah 25%.` : `Auto-escalation: L1 ke ${route.escalation.l1} bila belum di-respond, L2 ke ${route.escalation.l2} saat sisa SLA di bawah 25%.`}</p>
                </div>
                <p className="px-1 text-xs text-slate-400">Rule: {route.ruleId}</p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>;
  }
}
