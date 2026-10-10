// DATA: pengelolaan konfigurasi lewat API admin. Nama dan bentuk method sama dengan AdminService lama (yang bekerja di localStorage),
// tetapi semuanya async dan validasi utama dilakukan SERVER (galatnya, berbahasa Indonesia, diteruskan apa adanya ke form).
// Di klien hanya pemeriksaan yang butuh data lintas-entitas sebelum memanggil API (mis. tim yang masih dipakai aturan).
import { api } from '../api/http';
import { rowsFromHours } from './mappers';
import { DEFAULT_RULE_ID } from '../domain/Rules';
import { cleanName } from '../domain/Category';

const n = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
const fail = (msg) => { throw new Error(msg); };

export default class ApiAdminService {
  constructor(store) { this.store = store; }
  get cfg() { return this.store.cfg || fail('Data admin belum dimuat.'); }
  get ref() { return this.store.ref; }
  // Setelah perubahan: muat ulang referensi (lokasi, katalog, department) atau hanya konfigurasi admin (tim, aturan, pengguna).
  reloadRef = () => this.store.reloadReference();
  reloadCfg = () => this.store.loadAdmin();
  userId = (name, what) => {
    const nm = cleanName(name);
    if (!nm) return null;
    return this.cfg.userIdByName[nm] || fail(`${what} harus salah satu pengguna yang terdaftar.`);
  };
  teamNum = (slug) => (slug ? this.cfg.teamNum[slug] || fail('Team tidak ditemukan.') : null);
  // Pemakaian tidak diketahui klien; halaman tidak lagi menampilkan jumlah tiket per lokasi/kategori.
  usage() { return { byLocation: {}, byCategory: {} }; }

  // ================= LOKASI =================
  async addLocation({ name, parentId = null, kind = '' }) {
    const l = await api.adminCreateLocation({ name, ...(parentId ? { parent_id: n(parentId) } : { kind: kind || undefined }) });
    await this.reloadRef();
    return String(l.id);
  }
  async updateLocation(id, { name, parentId = null }) {
    const cur = this.ref.locations.find((x) => x.id === id) || fail('Lokasi tidak ditemukan.');
    const body = { name };
    if ((cur.parentId || null) !== (parentId || null)) body.parent_id = parentId ? n(parentId) : null;
    await api.adminUpdateLocation(n(id), body);
    await this.reloadRef();
  }
  async removeLocation(id) { await api.adminDeleteLocation(n(id)); await this.reloadRef(); }

  // ================= KATEGORI, SUBKATEGORI, PERTANYAAN =================
  async addCategory(name) { const c = await api.adminCreateCategory({ name }); await this.reloadRef(); return c.slug; }
  async updateCategory(slug, name) { await api.adminUpdateCategory(this.ref.catNum[slug] || fail('Kategori tidak ditemukan.'), { name }); await this.reloadRef(); }
  // API tidak menghapus kategori/subkategori (tiket lama tetap merujuknya): "hapus" = nonaktifkan, sehingga hilang dari form dan filter.
  async removeCategory(slug) { await api.adminUpdateCategory(this.ref.catNum[slug] || fail('Kategori tidak ditemukan.'), { is_active: false }); await this.reloadRef(); }
  async addSub(cat, name) { const s = await api.adminCreateSubcategory(this.ref.catNum[cat] || fail('Kategori tidak ditemukan.'), { name }); await this.reloadRef(); return s.slug; }
  async renameSub(cat, sub, name) { await api.adminUpdateSubcategory(this.ref.subNum[`${cat}/${sub}`] || fail('Subkategori tidak ditemukan.'), { name }); await this.reloadRef(); }
  async removeSub(cat, sub) { await api.adminUpdateSubcategory(this.ref.subNum[`${cat}/${sub}`] || fail('Subkategori tidak ditemukan.'), { is_active: false }); await this.reloadRef(); }

  // Menyimpan seluruh daftar pertanyaan satu subkategori: hapus yang dibuang, perbarui yang ada, buat yang baru, lalu urutkan.
  async saveQuestions(cat, sub, rows) {
    const subNum = this.ref.subNum[`${cat}/${sub}`] || fail('Subkategori tidak ditemukan.');
    const body = (r) => ({ label: cleanName(r.label), type: r.type, options: r.type === 'select' ? (r.options || []).map(cleanName).filter(Boolean) : [], required: !!r.required, placeholder: cleanName(r.placeholder || '') });
    const existing = (this.store.subOf(cat, sub) || fail('Subkategori tidak ditemukan.')).questions.map((q) => q.id);
    const keep = new Set(rows.filter((r) => r.id).map((r) => r.id));
    for (const id of existing.filter((x) => !keep.has(x))) await api.adminDeleteQuestion(n(id));
    const order = [];
    for (const r of rows) {
      if (r.id) { await api.adminUpdateQuestion(n(r.id), body(r)); order.push(n(r.id)); } else { const q = await api.adminCreateQuestion(subNum, body(r)); order.push(q.id); }
    }
    if (order.length > 1) await api.adminReorderQuestions(subNum, { ids: order });
    await this.reloadRef();
  }

  // ================= DEPARTMENT =================
  async addDepartment({ name, head }) { const d = await api.adminCreateDepartment({ name, head_user_id: this.userId(head, 'Department head') }); await this.reloadRef(); return d.slug; }
  async updateDepartment(slug, { name, head }) {
    await api.adminUpdateDepartment(this.ref.deptNum[slug] || fail('Department tidak ditemukan.'), { name, head_user_id: this.userId(head, 'Department head') });
    await this.reloadRef();
  }
  async removeDepartment(slug) {
    const teams = Object.values(this.cfg.teams).filter((t) => t.department === slug).length;
    if (teams) fail(`Department ini masih punya ${teams} team. Pindahkan atau hapus team-nya dulu.`);
    await api.adminUpdateDepartment(this.ref.deptNum[slug] || fail('Department tidak ditemukan.'), { is_active: false });
    await this.reloadRef();
  }

  // ================= TEAM =================
  _teamBody(i) {
    const dept = this.ref.deptNum[i.department] || fail('Pilih department team ini.');
    return { name: i.name, department_id: dept, lead_user_id: this.userId(i.lead, 'Team lead'), on_call_team_id: this.teamNum(i.onCall), is_external: !!i.external, is_always_on: !i.hours };
  }
  async addTeam(i) {
    const b = this._teamBody(i);
    const t = await api.adminCreateTeam({ ...b, lead_user_id: b.lead_user_id || undefined, on_call_team_id: b.on_call_team_id || undefined });
    if (i.hours) await api.adminSetWorkingHours(t.id, { working_hours: rowsFromHours(i.hours) });
    await this.reloadCfg();
    return t.slug;
  }
  async updateTeam(slug, i) {
    const num = this.teamNum(slug);
    await api.adminUpdateTeam(num, this._teamBody(i));
    await api.adminSetWorkingHours(num, { working_hours: rowsFromHours(i.hours) });
    await this.reloadCfg();
  }
  async removeTeam(slug) {
    const t = this.cfg.teams[slug] || fail('Team tidak ditemukan.');
    const rules = this.cfg.rules.filter((r) => r.team === slug).length;
    if (rules) fail(`"${t.name}" dipakai ${rules} routing rules. Ubah tujuan rule-nya dulu.`);
    const cover = Object.values(this.cfg.teams).filter((x) => x.onCall === slug).map((x) => x.name);
    if (cover.length) fail(`"${t.name}" menjadi on-call team untuk: ${cover.join(', ')}.`);
    if (t.members.length) fail(`"${t.name}" masih punya ${t.members.length} member. Keluarkan member-nya dulu.`);
    await api.adminUpdateTeam(this.teamNum(slug), { is_active: false });
    await this.reloadCfg();
  }
  // Member dipilih dari pengguna yang sudah terdaftar (akun login), bukan nama bebas.
  async addMember(teamSlug, { name }) {
    const uid = this.cfg.userIdByName[cleanName(name)] || fail('Pilih pengguna yang akan menjadi member.');
    await api.adminAddTeamMember(this.teamNum(teamSlug), { user_id: uid });
    await this.reloadCfg();
  }
  async updateMember(teamSlug, memberId, { available, scope }) {
    const num = this.teamNum(teamSlug);
    await api.adminSetMemberAvailability(num, n(memberId), { is_available: !!available });
    await api.adminSetMemberScopes(num, n(memberId), { location_ids: (scope || []).map(n) });
    await this.reloadCfg();
  }
  async removeMember(teamSlug, memberId) { await api.adminRemoveTeamMember(this.teamNum(teamSlug), n(memberId)); await this.reloadCfg(); }

  // ================= ATURAN ROUTING =================
  _rule(i, cur) {
    const catNum = i.category ? this.ref.catNum[i.category] || fail('Kategori rule tidak ditemukan.') : undefined;
    const subNum = i.sub ? this.ref.subNum[`${i.category}/${i.sub}`] || fail('Subkategori tidak ada di kategori itu.') : undefined;
    return { category_id: catNum, subcategory_id: subNum, request_type: i.type || undefined, location_kind: i.kind || undefined, priority: cur ? cur.priority : undefined, team_id: this.teamNum(i.team) || fail('Pilih team tujuan.') };
  }
  async addRule(i) { await api.adminCreateRoutingRule(this._rule(i)); await this.reloadCfg(); }
  async updateRule(id, i) {
    const cur = this.cfg.rules.find((r) => r.id === id) || fail('Rule tidak ditemukan.');
    await api.adminUpdateRoutingRule(cur.num, cur.id === DEFAULT_RULE_ID ? { team_id: this.teamNum(i.team) || fail('Pilih team tujuan.') } : this._rule(i, cur));
    await this.reloadCfg();
  }
  async removeRule(id) { await api.adminDeleteRoutingRule((this.cfg.rules.find((r) => r.id === id) || fail('Rule tidak ditemukan.')).num); await this.reloadCfg(); }
  async moveRule(id, dir) {
    const movable = this.cfg.rules.filter((r) => r.id !== DEFAULT_RULE_ID);
    const i = movable.findIndex((r) => r.id === id);
    if (i < 0) fail('Rule tidak ditemukan.');
    const j = i + dir;
    if (j < 0 || j >= movable.length) return;
    [movable[i], movable[j]] = [movable[j], movable[i]];
    await api.adminReorderRoutingRules({ ids: movable.map((r) => r.num) });
    await this.reloadCfg();
  }

  // ================= PENGGUNA =================
  _teamIds(input) { return [...new Set(input.teamIds || [])]; }
  async addUser(i) {
    if (i.role === 'pic' && !this._teamIds(i).length) fail('PIC harus tergabung di minimal satu team.');
    if (i.role === 'manager' && !i.department) fail('Department Manager harus memilih department.');
    const u = await api.adminCreateUser({ name: i.name, email: i.email || undefined, title: i.title, role: i.role, department_id: n(this.ref.deptNum[i.department]) || undefined,
      default_location_id: i.role === 'employee' && i.location ? n((this.store.nodeByName(i.location) || {}).id) || undefined : undefined, password: i.password || undefined });
    for (const t of i.role === 'pic' ? this._teamIds(i) : []) await api.adminAddTeamMember(this.teamNum(t), { user_id: u.id });
    await this.reloadCfg();
  }
  async updateUser(id, i) {
    const cur = this.cfg.users.find((u) => u.id === id) || fail('Pengguna tidak ditemukan.');
    if (i.role === 'pic' && !this._teamIds(i).length) fail('PIC harus tergabung di minimal satu team.');
    await api.adminUpdateUser(n(id), { title: i.title, role: i.role, email: i.email || null, department_id: i.role === 'manager' ? n(this.ref.deptNum[i.department]) : null,
      default_location_id: i.role === 'employee' && i.location ? n((this.store.nodeByName(i.location) || {}).id) : null });
    if (i.role === 'pic') { // samakan keanggotaan tim dengan pilihan di form
      const want = new Set(this._teamIds(i)); const have = new Set(cur.teamIds || []);
      for (const t of want) if (!have.has(t)) await api.adminAddTeamMember(this.teamNum(t), { user_id: n(id) });
      for (const t of have) if (!want.has(t)) await api.adminRemoveTeamMember(this.teamNum(t), n(id));
    }
    if (i.password) await api.adminSetUserPassword(n(id), { password: i.password });
    await this.reloadCfg();
  }
  // Pengguna tidak dihapus (riwayat tiket tetap merujuknya): "hapus" = nonaktifkan, sehingga tidak bisa login lagi.
  async removeUser(id) { await api.adminUpdateUser(n(id), { is_active: false }); await this.reloadCfg(); }
}
