// DOMAIN: mesin routing murni. Input: kategori, subkategori, jenis kebutuhan, LOKASI, prioritas.
// Output: department, tim, PIC. Dipakai untuk pratinjau di form DAN saat tiket dibuat, sehingga keduanya pasti sama.
const TZ = 'Asia/Jakarta';
const partsFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });
const DAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Apakah tim sedang jam kerja pada waktu ts (WIB)?
export const isOpenAt = (hours, ts) => {
  if (!hours) return true;
  const p = Object.fromEntries(partsFmt.formatToParts(ts).map((x) => [x.type, x.value]));
  const hm = `${p.hour}:${p.minute}`;
  return hours.days.includes(DAYS[p.weekday]) && hm >= hours.from && hm < hours.to;
};

const matches = (cond, value) => cond === undefined || (Array.isArray(cond) ? cond.includes(value) : cond === value);

export default class RoutingEngine {
  // cfg = { rules, teams, departments }; boleh berupa objek dengan getter agar selalu membaca konfigurasi terbaru.
  // loadOf(nama) = jumlah tiket aktif yang sedang dipegang PIC tersebut (untuk pemerataan beban).
  constructor(cfg) { this.cfg = cfg; this.loadOf = cfg.loadOf || (() => 0); } // objek disimpan apa adanya: jangan di-spread/disalin agar getter tetap live
  get rules() { return this.cfg.rules; }
  get teams() { return this.cfg.teams; }
  get departments() { return this.cfg.departments; }
  // kind = jenis lokasi (outlet / head_office / warehouse). locationIds = id lokasi dari yang paling spesifik sampai akar,
  // dipakai untuk mencocokkan cakupan area PIC. Keduanya boleh kosong bila lokasi tidak diketahui.
  route({ categoryId, subId, type, kind, priority, locationIds = [] }, now = Date.now()) {
    const rule = this.rules.find((r) => matches(r.category, categoryId) && matches(r.sub, subId) && matches(r.type, type)
      && matches(r.kind, kind) && matches(r.priority, priority));
    let teamId = rule.team;
    let team = this.teams[teamId];
    // Department pemilik tiket ditentukan aturan, bukan tim pengganti; jadi tidak berpindah saat dialihkan ke on-call.
    const owner = team.department;
    const dept = this.departments[owner];
    // Di luar jam kerja -> dialihkan ke tim on-call bila ada.
    const offHours = !isOpenAt(team.hours, now) && !!team.onCall;
    if (offHours) { teamId = team.onCall; team = this.teams[teamId]; }
    const pic = this.pickPic(team, locationIds);
    return {
      ruleId: rule.id, department: owner, team: team.name, teamId, offHours, external: !!team.external,
      pic, noneAvailable: !pic, escalation: { l1: team.lead, l2: dept.head },
    };
  }
  // PIC: (1) anggota yang tersedia dan mencakup lokasi tiket, (2) anggota tanpa batas cakupan, (3) siapa pun yang tersedia.
  // Di antara kandidat dipilih yang beban tiket aktifnya paling sedikit.
  pickPic(team, locationIds) {
    const free = team.members.filter((m) => m.available);
    const scoped = free.filter((m) => m.scope && m.scope.some((s) => locationIds.includes(s)));
    const global = free.filter((m) => !m.scope);
    const pool = scoped.length ? scoped : global.length ? global : free;
    const best = [...pool].sort((a, b) => this.loadOf(a.name) - this.loadOf(b.name))[0];
    return best ? { id: best.id, name: best.name, load: this.loadOf(best.name), byArea: scoped.length > 0 } : null;
  }
}
