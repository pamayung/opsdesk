// DOMAIN: pengelolaan konfigurasi oleh admin (lokasi, kategori & pertanyaan, department, tim, aturan routing, pengguna).
// Semua perubahan divalidasi di sini (bukan di UI) agar data tidak rusak: nama unik, referensi harus ada, dan
// sesuatu yang masih dipakai tidak boleh dihapus. Setiap pelanggaran melempar Error berbahasa Indonesia.
import { cleanName, normalize } from './Category';
import { REQUEST_TYPES, LOCATION_KINDS } from './constants';
import { chainOf } from './Location';

export const QUESTION_TYPES = { text: 'Teks', number: 'Angka', select: 'Pilihan', yesno: 'Ya / Tidak' };
export const DEFAULT_RULE_ID = 'default';

const clone = (x) => JSON.parse(JSON.stringify(x));
const slug = (s) => cleanName(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const uniqueId = (base, taken) => { const b = base || 'item'; let id = b; let n = 2; while (taken.has(id)) id = `${b}-${n++}`; return id; };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const list = (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

// Aturan `later` tidak akan pernah dipakai bila aturan `earlier` (lebih atas) sudah mencakup semua tiket yang cocok dengan `later`.
export const covers = (earlier, later) => ['category', 'sub', 'type', 'kind', 'priority'].every((k) => {
  const e = list(earlier[k]); if (e === undefined) return true; // aturan atas tidak membatasi kondisi ini
  const l = list(later[k]); if (l === undefined) return false; // aturan bawah lebih luas pada kondisi ini
  return l.every((x) => e.includes(x));
});
// { idAturan: idAturanYangMenutupi } untuk aturan yang tak akan pernah kena.
export const findShadowed = (rules) => {
  const out = {};
  rules.forEach((r, i) => { const by = rules.slice(0, i).find((e) => covers(e, r)); if (by) out[r.id] = by.id; });
  return out;
};

export default class AdminService {
  // Ports: config (doc/save/reset), locations, categories, tickets (repository). roles = daftar id peran yang valid.
  constructor({ config, locations, categories, tickets, roles, sampleHistory = () => [] }) {
    Object.assign(this, { config, locations, categories, tickets, roles, sampleHistory });
  }
  // Ubah dokumen konfigurasi lewat salinan; validasi dilakukan di dalam fn (lempar Error untuk membatalkan).
  edit(fn) { const d = clone(this.config.doc()); const out = fn(d); this.config.save(d); return out; }
  get doc() { return this.config.doc(); }

  // Ringkasan pemakaian untuk UI (mis. jumlah tiket per lokasi).
  usage() {
    const ts = this.tickets.list();
    const count = (key) => ts.reduce((m, t) => { const k = t[key]; if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
    return { byLocation: count('branch'), byCategory: count('categoryId') };
  }

  // ================= LOKASI =================
  addLocation({ name, parentId = null, kind = '' }) {
    const n = cleanName(name);
    if (!n) throw new Error('Nama lokasi wajib diisi.');
    if (this.locations.findByName(n)) throw new Error(`Lokasi "${n}" sudah ada.`);
    const parent = parentId ? this.locations.findById(parentId) : null;
    if (parentId && !parent) throw new Error('Induk lokasi tidak ditemukan.');
    if (!parent && !LOCATION_KINDS[kind]) throw new Error('Pilih jenis untuk lokasi utama.');
    const taken = new Set(this.locations.list().map((l) => l.id));
    return this.locations.add({ id: uniqueId(slug(n), taken), name: n, parentId: parent ? parent.id : null, ...(parent ? {} : { kind }) });
  }
  updateLocation(id, { name, parentId = null, kind = '' }) {
    const cur = this.locations.findById(id);
    if (!cur) throw new Error('Lokasi tidak ditemukan.');
    const n = cleanName(name);
    if (!n) throw new Error('Nama lokasi wajib diisi.');
    const same = this.locations.findByName(n);
    if (same && same.id !== id) throw new Error(`Lokasi "${n}" sudah ada.`);
    if (parentId) {
      if (!this.locations.findById(parentId)) throw new Error('Induk lokasi tidak ditemukan.');
      if (chainOf(this.locations.list(), parentId).some((x) => x.id === id)) throw new Error('Induk tidak boleh lokasi itu sendiri atau turunannya.');
    } else if (!LOCATION_KINDS[kind]) throw new Error('Pilih jenis untuk lokasi utama.');
    this.locations.update(id, { name: n, parentId: parentId || null, kind: parentId ? undefined : kind });
    if (n !== cur.name) { // riwayat tiket dan pengguna ikut terkait ke nama baru
      this.tickets.renameBranch(cur.name, n);
      this.edit((d) => d.users.forEach((u) => { if (u.location === cur.name) u.location = n; }));
    }
  }
  removeLocation(id) {
    const cur = this.locations.findById(id);
    if (!cur) throw new Error('Lokasi tidak ditemukan.');
    const kids = this.locations.list().filter((l) => l.parentId === id).length;
    if (kids) throw new Error(`"${cur.name}" masih punya ${kids} lokasi di bawahnya. Pindahkan atau hapus dulu.`);
    const used = this.tickets.list().filter((t) => t.branch === cur.name).length;
    if (used) throw new Error(`"${cur.name}" dipakai ${used} tiket, jadi tidak bisa dihapus.`);
    const teams = Object.values(this.doc.teams).filter((t) => t.members.some((m) => (m.scope || []).includes(id))).map((t) => t.name);
    if (teams.length) throw new Error(`"${cur.name}" dipakai sebagai cakupan area di tim: ${teams.join(', ')}.`);
    if (this.doc.users.some((u) => u.location === cur.name)) throw new Error(`"${cur.name}" dipakai sebagai lokasi pengguna.`);
    this.locations.remove(id);
  }

  // ================= KATEGORI, SUBKATEGORI, PERTANYAAN =================
  addCategory(name) {
    const n = cleanName(name);
    if (!n) throw new Error('Nama kategori wajib diisi.');
    if (this.categories.findByName(n)) throw new Error(`Kategori "${n}" sudah ada.`);
    const taken = new Set(this.categories.list().map((c) => c.id));
    return this.categories.add({ id: uniqueId(slug(n), taken), name: n });
  }
  updateCategory(id, name) {
    if (!this.categories.findById(id)) throw new Error('Kategori tidak ditemukan.');
    const n = cleanName(name);
    if (!n) throw new Error('Nama kategori wajib diisi.');
    const same = this.categories.findByName(n);
    if (same && same.id !== id) throw new Error(`Kategori "${n}" sudah ada.`);
    this.categories.update(id, { name: n });
  }
  removeCategory(id) {
    const cat = this.categories.findById(id);
    if (!cat) throw new Error('Kategori tidak ditemukan.');
    const used = this.usage().byCategory[id] || 0;
    if (used) throw new Error(`"${cat.name}" dipakai ${used} tiket, jadi tidak bisa dihapus.`);
    if (this.doc.rules.some((r) => r.category === id)) throw new Error(`"${cat.name}" dipakai aturan routing. Hapus atau ubah aturannya dulu.`);
    this.categories.remove(id);
    this.edit((d) => { delete d.catalog[id]; });
  }
  addSub(categoryId, name) {
    if (!this.categories.findById(categoryId)) throw new Error('Kategori tidak ditemukan.');
    const n = cleanName(name);
    if (!n) throw new Error('Nama subkategori wajib diisi.');
    return this.edit((d) => {
      const subs = d.catalog[categoryId] || (d.catalog[categoryId] = []);
      if (subs.some((s) => normalize(s.name) === normalize(n))) throw new Error(`Subkategori "${n}" sudah ada di kategori ini.`);
      const sub = { id: uniqueId(slug(n), new Set(subs.map((s) => s.id))), name: n, questions: [] };
      subs.push(sub);
      return sub;
    });
  }
  renameSub(categoryId, subId, name) {
    const n = cleanName(name);
    if (!n) throw new Error('Nama subkategori wajib diisi.');
    this.edit((d) => {
      const subs = d.catalog[categoryId] || [];
      const sub = subs.find((s) => s.id === subId);
      if (!sub) throw new Error('Subkategori tidak ditemukan.');
      if (subs.some((s) => s.id !== subId && normalize(s.name) === normalize(n))) throw new Error(`Subkategori "${n}" sudah ada di kategori ini.`);
      sub.name = n;
    });
  }
  removeSub(categoryId, subId) {
    this.edit((d) => {
      const subs = d.catalog[categoryId] || [];
      const sub = subs.find((s) => s.id === subId);
      if (!sub) throw new Error('Subkategori tidak ditemukan.');
      if (d.rules.some((r) => r.category === categoryId && r.sub === subId)) throw new Error(`"${sub.name}" dipakai aturan routing. Hapus atau ubah aturannya dulu.`);
      d.catalog[categoryId] = subs.filter((s) => s.id !== subId);
    });
  }
  // Menyimpan seluruh daftar pertanyaan sebuah subkategori. Pertanyaan lama mempertahankan id-nya.
  saveQuestions(categoryId, subId, questions) {
    this.edit((d) => {
      const sub = (d.catalog[categoryId] || []).find((s) => s.id === subId);
      if (!sub) throw new Error('Subkategori tidak ditemukan.');
      const taken = new Set();
      sub.questions = questions.map((q, i) => {
        const label = cleanName(q.label);
        if (!label) throw new Error(`Pertanyaan ${i + 1}: label wajib diisi.`);
        if (!QUESTION_TYPES[q.type]) throw new Error(`Pertanyaan "${label}": jenis tidak dikenal.`);
        const out = { id: uniqueId(q.id || slug(label), taken), label, type: q.type };
        taken.add(out.id);
        if (q.type === 'select') {
          const opts = [...new Set((q.options || []).map((o) => cleanName(o)).filter(Boolean))];
          if (opts.length < 2) throw new Error(`Pertanyaan "${label}": isi minimal 2 pilihan.`);
          out.options = opts;
        }
        if (q.required) out.required = true;
        if (q.placeholder) out.placeholder = q.placeholder;
        return out;
      });
    });
  }

  // ================= DEPARTMENT & TIM =================
  addDepartment({ name, head }) {
    const n = cleanName(name); const h = cleanName(head);
    if (!n) throw new Error('Nama department wajib diisi.');
    if (!h) throw new Error('Isi nama kepala department.');
    return this.edit((d) => {
      if (Object.values(d.departments).some((x) => normalize(x.name) === normalize(n))) throw new Error(`Department "${n}" sudah ada.`);
      const id = uniqueId(slug(n), new Set(Object.keys(d.departments)));
      d.departments[id] = { name: n, head: h };
      return id;
    });
  }
  updateDepartment(id, { name, head }) {
    const n = cleanName(name); const h = cleanName(head);
    if (!n) throw new Error('Nama department wajib diisi.');
    if (!h) throw new Error('Isi nama kepala department.');
    this.edit((d) => {
      if (!d.departments[id]) throw new Error('Department tidak ditemukan.');
      if (Object.entries(d.departments).some(([k, x]) => k !== id && normalize(x.name) === normalize(n))) throw new Error(`Department "${n}" sudah ada.`);
      d.departments[id] = { name: n, head: h };
    });
  }
  removeDepartment(id) {
    this.edit((d) => {
      if (!d.departments[id]) throw new Error('Department tidak ditemukan.');
      const teams = Object.values(d.teams).filter((t) => t.department === id).length;
      if (teams) throw new Error(`Department ini masih punya ${teams} tim. Pindahkan atau hapus timnya dulu.`);
      if (d.users.some((u) => u.department === id)) throw new Error('Department ini dipakai sebagai department manajer.');
      delete d.departments[id];
    });
  }
  // Validasi bagian pengaturan tim (tanpa anggota). Mengembalikan objek tim yang bersih.
  _team(input, d, selfId) {
    const name = cleanName(input.name); const lead = cleanName(input.lead);
    if (!name) throw new Error('Nama tim wajib diisi.');
    if (Object.entries(d.teams).some(([k, t]) => k !== selfId && normalize(t.name) === normalize(name))) throw new Error(`Tim "${name}" sudah ada.`);
    if (!d.departments[input.department]) throw new Error('Pilih department tim.');
    if (!lead) throw new Error('Isi nama ketua tim.');
    if (input.onCall) {
      if (input.onCall === selfId) throw new Error('Tim on-call tidak boleh tim itu sendiri.');
      if (!d.teams[input.onCall]) throw new Error('Tim on-call tidak ditemukan.');
    }
    let hours = null;
    if (input.hours) {
      const h = input.hours;
      const days = [...new Set((h.days || []).map(Number))].filter((x) => x >= 1 && x <= 7).sort();
      if (!days.length) throw new Error('Pilih minimal satu hari kerja.');
      if (!HHMM.test(h.from) || !HHMM.test(h.to)) throw new Error('Jam kerja harus berformat JJ:MM.');
      if (h.from >= h.to) throw new Error('Jam mulai harus lebih awal dari jam selesai.');
      hours = { days, from: h.from, to: h.to };
    }
    const out = { name, department: input.department, hours, lead };
    if (input.onCall) out.onCall = input.onCall;
    if (input.external) out.external = true;
    return out;
  }
  addTeam(input) {
    return this.edit((d) => {
      const team = this._team(input, d, null);
      const id = uniqueId(slug(team.name).replace(/-/g, '_'), new Set(Object.keys(d.teams)));
      d.teams[id] = { ...team, members: [] };
      return id;
    });
  }
  updateTeam(id, input) {
    this.edit((d) => {
      if (!d.teams[id]) throw new Error('Tim tidak ditemukan.');
      const team = this._team(input, d, id);
      d.teams[id] = { ...team, members: d.teams[id].members };
    });
  }
  removeTeam(id) {
    this.edit((d) => {
      const t = d.teams[id];
      if (!t) throw new Error('Tim tidak ditemukan.');
      const rules = d.rules.filter((r) => r.team === id).length;
      if (rules) throw new Error(`"${t.name}" dipakai ${rules} aturan routing. Ubah tujuan aturannya dulu.`);
      const cover = Object.values(d.teams).filter((x) => x.onCall === id).map((x) => x.name);
      if (cover.length) throw new Error(`"${t.name}" menjadi tim on-call untuk: ${cover.join(', ')}.`);
      if (d.users.some((u) => (u.teamIds || []).includes(id))) throw new Error(`"${t.name}" masih dipakai pengguna (PIC).`);
      delete d.teams[id];
    });
  }
  _scope(scope) {
    const ids = [...new Set(scope || [])];
    const bad = ids.find((s) => !this.locations.findById(s));
    if (bad) throw new Error('Cakupan area berisi lokasi yang tidak ada.');
    return ids;
  }
  addMember(teamId, { name, available = true, scope = [] }) {
    const n = cleanName(name);
    if (!n) throw new Error('Nama anggota wajib diisi.');
    const ids = this._scope(scope);
    this.edit((d) => {
      const t = d.teams[teamId];
      if (!t) throw new Error('Tim tidak ditemukan.');
      if (t.members.some((m) => normalize(m.name) === normalize(n))) throw new Error(`"${n}" sudah menjadi anggota tim ini.`);
      t.members.push({ id: uniqueId(slug(n), new Set(t.members.map((m) => m.id))), name: n, available: !!available, ...(ids.length ? { scope: ids } : {}) });
    });
  }
  // Nama anggota tidak diubah agar PIC di riwayat tiket tetap konsisten (hapus lalu tambah bila perlu).
  updateMember(teamId, memberId, { available, scope }) {
    const ids = this._scope(scope);
    this.edit((d) => {
      const m = ((d.teams[teamId] || {}).members || []).find((x) => x.id === memberId);
      if (!m) throw new Error('Anggota tidak ditemukan.');
      m.available = !!available;
      if (ids.length) m.scope = ids; else delete m.scope;
    });
  }
  removeMember(teamId, memberId) {
    this.edit((d) => {
      const t = d.teams[teamId];
      if (!t) throw new Error('Tim tidak ditemukan.');
      if (!t.members.some((m) => m.id === memberId)) throw new Error('Anggota tidak ditemukan.');
      t.members = t.members.filter((m) => m.id !== memberId);
    });
  }

  // ================= ATURAN ROUTING =================
  // Aturan bawaan (catch-all, id "default") selalu paling bawah: hanya tujuan timnya yang boleh diubah.
  _rule(input, d) {
    const r = {};
    if (input.category) {
      if (!this.categories.findById(input.category)) throw new Error('Kategori aturan tidak ditemukan.');
      r.category = input.category;
    }
    if (input.sub) {
      if (!r.category) throw new Error('Pilih kategori sebelum subkategori.');
      if (!(d.catalog[r.category] || []).some((s) => s.id === input.sub)) throw new Error('Subkategori tidak ada di kategori itu.');
      r.sub = input.sub;
    }
    if (input.type) { if (!REQUEST_TYPES[input.type]) throw new Error('Jenis kebutuhan tidak dikenal.'); r.type = input.type; }
    if (input.kind) { if (!LOCATION_KINDS[input.kind]) throw new Error('Jenis lokasi tidak dikenal.'); r.kind = input.kind; }
    if (!Object.keys(r).length) throw new Error('Aturan harus punya minimal satu kondisi.');
    if (!d.teams[input.team]) throw new Error('Pilih tim tujuan.');
    r.team = input.team;
    return r;
  }
  _defaultLast(d) {
    const i = d.rules.findIndex((r) => r.id === DEFAULT_RULE_ID);
    if (i >= 0 && i !== d.rules.length - 1) d.rules.push(d.rules.splice(i, 1)[0]);
  }
  addRule(input) {
    return this.edit((d) => {
      const r = this._rule(input, d);
      r.id = uniqueId([r.category, r.sub, r.type, r.kind].filter(Boolean).join('-'), new Set(d.rules.map((x) => x.id)));
      d.rules.push(r);
      this._defaultLast(d);
      return r.id;
    });
  }
  updateRule(id, input) {
    this.edit((d) => {
      const i = d.rules.findIndex((r) => r.id === id);
      if (i < 0) throw new Error('Aturan tidak ditemukan.');
      if (id === DEFAULT_RULE_ID) {
        if (!d.teams[input.team]) throw new Error('Pilih tim tujuan.');
        d.rules[i] = { id, team: input.team };
        return;
      }
      d.rules[i] = { id, ...this._rule(input, d) };
    });
  }
  removeRule(id) {
    if (id === DEFAULT_RULE_ID) throw new Error('Aturan bawaan (semua lainnya) tidak bisa dihapus.');
    this.edit((d) => {
      if (!d.rules.some((r) => r.id === id)) throw new Error('Aturan tidak ditemukan.');
      d.rules = d.rules.filter((r) => r.id !== id);
    });
  }
  // dir: -1 naik (diperiksa lebih dulu), +1 turun. Aturan bawaan tidak ikut bergeser.
  moveRule(id, dir) {
    this.edit((d) => {
      const movable = d.rules.filter((r) => r.id !== DEFAULT_RULE_ID);
      const i = movable.findIndex((r) => r.id === id);
      if (i < 0) throw new Error('Aturan tidak ditemukan.');
      const j = i + dir;
      if (j < 0 || j >= movable.length) return;
      [movable[i], movable[j]] = [movable[j], movable[i]];
      d.rules = [...movable, ...d.rules.filter((r) => r.id === DEFAULT_RULE_ID)];
    });
  }

  // ================= PENGGUNA =================
  _user(input, d) {
    if (!this.roles.includes(input.role)) throw new Error('Pilih peran pengguna.');
    const u = { role: input.role, title: cleanName(input.title) };
    if (input.role === 'manager') {
      if (!d.departments[input.department]) throw new Error('Manajer department harus memilih department.');
      u.department = input.department;
    }
    if (input.role === 'pic') {
      const ids = [...new Set(input.teamIds || [])];
      if (!ids.length) throw new Error('PIC harus tergabung di minimal satu tim.');
      if (ids.some((t) => !d.teams[t])) throw new Error('Tim PIC tidak ditemukan.');
      u.teamIds = ids;
    }
    if (input.role === 'employee' && input.location) {
      if (!this.locations.findByName(input.location)) throw new Error('Lokasi pengguna tidak ditemukan.');
      u.location = input.location;
    }
    return u;
  }
  addUser(input) {
    const name = cleanName(input.name);
    if (!name) throw new Error('Nama pengguna wajib diisi.');
    return this.edit((d) => {
      if (d.users.some((x) => normalize(x.name) === normalize(name))) throw new Error(`Pengguna "${name}" sudah ada.`);
      const u = { id: uniqueId(slug(name), new Set(d.users.map((x) => x.id))), name, ...this._user(input, d) };
      d.users.push(u);
      return u.id;
    });
  }
  // Nama tidak diubah karena tiket terhubung ke pengguna lewat nama (pelapor / PIC).
  updateUser(id, input) {
    this.edit((d) => {
      const i = d.users.findIndex((u) => u.id === id);
      if (i < 0) throw new Error('Pengguna tidak ditemukan.');
      const cur = d.users[i];
      if (cur.role === 'admin' && input.role !== 'admin' && d.users.filter((u) => u.role === 'admin').length === 1) throw new Error('Harus ada minimal satu administrator.');
      d.users[i] = { id, name: cur.name, ...this._user(input, d) };
    });
  }
  removeUser(id, actorId) {
    this.edit((d) => {
      const u = d.users.find((x) => x.id === id);
      if (!u) throw new Error('Pengguna tidak ditemukan.');
      if (id === actorId) throw new Error('Anda tidak bisa menghapus akun yang sedang dipakai.');
      if (u.role === 'admin' && d.users.filter((x) => x.role === 'admin').length === 1) throw new Error('Harus ada minimal satu administrator.');
      d.users = d.users.filter((x) => x.id !== id);
    });
  }

  // Menambahkan riwayat contoh 60 hari (tiket selesai) untuk demo laporan. Aman dipanggil berulang: yang sudah ada dilewati.
  loadSampleHistory() {
    const have = new Set(this.tickets.list().map((t) => t.id));
    const add = this.sampleHistory().filter((t) => !have.has(t.id));
    if (add.length) this.tickets.addMany(add);
    return add.length;
  }

  // Kembalikan department, tim, aturan, katalog, dan pengguna ke bawaan. Lokasi dan kategori tidak berubah.
  resetConfig() { this.config.reset(); }
}
