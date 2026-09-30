// DATA: verifikasi PIN penanggung jawab lokasi (Store Manager / Kepala Kantor / Kepala Gudang) untuk menutup tiket.
// PERINGATAN: ini hanya untuk demo lokal. PIN dicek di browser sehingga TIDAK aman.
// Untuk produksi, ganti dengan ApiAuthorizer yang memverifikasi ke server
// (PIN di-hash, dibatasi percobaan, dan tercatat di audit log).
export const DEMO_PIN = '123456';

export default class LocalAuthorizer {
  constructor(workspace) { this.ws = workspace; }
  unitOf(branch) { return this.ws.units.find((u) => u.name === branch) || null; }
  kindOf(branch) { const u = this.unitOf(branch); return u ? u.kind : null; }
  // Penanggung jawab dan perannya bergantung pada jenis lokasi.
  approverOf(branch) {
    const u = this.unitOf(branch);
    const role = (u && this.ws.kinds[u.kind] ? this.ws.kinds[u.kind].approver : null) || 'Penanggung jawab';
    return { manager: u ? u.manager : role, role };
  }
  verify(branch, pin) { return { ok: pin === DEMO_PIN, ...this.approverOf(branch) }; }
}
