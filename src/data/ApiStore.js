// DATA: read model aplikasi, diisi dari API. Menyajikan data konfigurasi (lokasi, katalog, department, tim, aturan, pengguna) secara
// sinkron untuk dipakai render, dan dimuat ulang secara async setelah login dan setiap perubahan. Data tiket TIDAK disimpan di sini:
// halaman memintanya ke server (dengan filter dan paginasi) setiap kali dibutuhkan, karena yang boleh dilihat ditentukan server.
import { api } from '../api/http';
import * as M from './mappers';
import { pathText, chainOf, kindOfNode } from '../domain/Location';

export default class ApiStore {
  ref = null; me = null; stats = null; summary = null; cfg = null;

  get ready() { return !!(this.ref && this.me); }
  clear() { this.ref = null; this.me = null; this.stats = null; this.summary = null; this.cfg = null; }

  async bootstrap() {
    const [profile, rawRef] = await Promise.all([api.me(), api.getReference()]);
    this.ref = M.buildRef(rawRef);
    this.me = M.toUser(profile, this.ref);
    await Promise.all([this.loadSummary(), this.me.role === 'admin' ? this.loadAdmin() : null]);
  }
  // Setelah admin mengubah lokasi/katalog/department: ID slug di referensi berubah, jadi konfigurasi admin ikut dibangun ulang.
  async reloadReference() {
    this.ref = M.buildRef(await api.getReference());
    if (this.cfg) await this.loadAdmin();
  }
  async loadSummary() {
    const [summary, k] = await Promise.all([api.getDashboard(), api.reportKPIs({ preset: '90d' })]);
    this.summary = summary;
    this.stats = M.toStats(summary, k.kpis);
  }
  async loadAdmin() {
    const [teams, rules, users] = await Promise.all([api.adminListTeams(), api.adminListRoutingRules(), api.adminListUsers()]);
    this.cfg = M.buildAdmin(teams, rules, users, this.ref);
  }

  // ---- pembacaan sinkron (bentuk sama dengan konfigurasi prototype) ----
  // Hanya kategori yang punya tiket di daftar pengguna ini; katalog lengkap tetap di `categories` (form lapor).
  get categoriesInUse() { return this.summary ? M.toCategoriesInUse(this.summary, this.ref) : []; }
  get departments() { return this.cfg ? this.cfg.departments : this.ref.departments; }
  get teams() { return this.cfg ? this.cfg.teams : {}; }
  get rules() { return this.cfg ? this.cfg.rules : []; }
  get users() { return this.cfg ? this.cfg.users : []; }
  get locations() { return this.ref.locations; }
  get categories() { return this.ref.categories; }
  subsOf = (cat) => (this.ref.catalog[cat] || []);
  subOf = (cat, sub) => this.subsOf(cat).find((s) => s.id === sub) || null;
  nodeByName = (name) => this.ref.locByName[String(name || '').toLowerCase()] || null;
  locationPath = (name) => { const n = this.nodeByName(name); return n ? pathText(this.ref.locations, n.id) : name; };
  locationKind = (name) => { const n = this.nodeByName(name); return n ? kindOfNode(this.ref.locations, n.id) : undefined; };
  locationIds = (name) => { const n = this.nodeByName(name); return n ? chainOf(this.ref.locations, n.id).map((x) => x.id) : []; };
}
