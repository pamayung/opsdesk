import { PRIORITIES, ESCALATION_RATIO } from './constants';

// Catatan penamaan: `branch` = nama lokasi (mis. Senopati), `location` = area di dalam lokasi itu (mis. Area kasir).
export default class Ticket {
  constructor(p) {
    Object.assign(this, {
      type: 'incident', routing: null, subId: null, answers: [], branch: '', description: '', reporterRole: '', notes: [],
      escalation: null, resolution: null, respondedAt: null, assignee: null, dueAt: null, respondDueAt: null, policy: null,
      permissions: null, assignable: [],
      slaStartAt: null, reopenCount: 0, reopenedAt: null, reopenUntil: null,
    }, p);
  }
  // Entitas diperlakukan immutable: setiap perubahan menghasilkan salinan baru.
  with(patch) { return new Ticket({ ...this, ...patch }); }

  // SLA mengikuti tenggat dari server (dueAt/respondDueAt) dan kebijakan SLA yang berlaku (policy); tanpa itu, jatuh ke konstanta bawaan.
  // Awal siklus SLA: saat dibuat, atau saat dibuka kembali terakhir (SLA mulai dari nol). createdAt tetap untuk tampilan "Created".
  get cycleStart() { return this.slaStartAt || this.createdAt; }
  get slaMinutes() { return this.dueAt ? (this.dueAt - this.cycleStart) / 60000 : PRIORITIES[this.priority].sla; }
  get respondTarget() { return this.respondDueAt ? (this.respondDueAt - this.cycleStart) / 60000 : PRIORITIES[this.priority].respond; }
  remainingMin(now = Date.now()) { return this.dueAt ? (this.dueAt - now) / 60000 : this.slaMinutes - (now - this.cycleStart) / 60000; }
  ageMin(now = Date.now()) { return (now - this.cycleStart) / 60000; }
  slaLevel(now = Date.now()) {
    if (this.status === 'done') return 'done';
    const m = this.remainingMin(now);
    const crit = this.policy ? this.policy.critical : 30; const warn = this.policy ? this.policy.warning : 60;
    return m < 0 ? 'breached' : m < crit ? 'critical' : m < warn ? 'warning' : 'ok';
  }
  // Eskalasi SLA otomatis: 0 = tidak ada, 1 = belum direspons melewati target, 2 = sisa SLA < 25% / terlewat.
  escalationLevel(now = Date.now()) {
    if (this.status === 'done') return 0;
    const ratio = this.policy ? this.policy.ratio : ESCALATION_RATIO;
    if (this.remainingMin(now) < (this.policy ? this.policy.resolveMin : this.slaMinutes) * ratio) return 2;
    return this.respondedAt === null && this.ageMin(now) > this.respondTarget ? 1 : 0;
  }
  // Perlu perhatian: SLA mendekati/kritis/terlewat atau sudah naik eskalasi.
  atRisk(now = Date.now()) { return this.status !== 'done' && (this.slaLevel(now) !== 'ok' || this.escalationLevel(now) > 0); }
  get department() { return this.routing ? this.routing.department : 'ops'; }
  // PIC yang paling relevan saat ini: yang memegang tiket > PIC awal dari routing.
  picLabel() {
    if (this.assignee) return `PIC · ${this.assignee}`;
    if (this.routing && this.routing.pic) return `Initial PIC · ${this.routing.pic.name}`;
    return 'No PIC yet';
  }
  isMine(name) { return this.assignee === name || (!!this.routing && !!this.routing.pic && this.routing.pic.name === name); }
  // Menit dari tiket dibuat sampai selesai. null bila belum selesai.
  resolutionMin() { return this.status === 'done' && this.resolution ? (this.resolution.closedAt - this.cycleStart) / 60000 : null; }
  // Pernah melewati batas SLA: tiket aktif yang sudah lewat, atau tiket selesai yang ditutup setelah batas.
  wasBreached(now = Date.now()) {
    if (this.status === 'done') { const m = this.resolutionMin(); return m !== null && m > this.slaMinutes; }
    return this.remainingMin(now) < 0;
  }
  isCritical(now) { return this.slaLevel(now) === 'critical'; }
  isBreached(now) { return this.slaLevel(now) === 'breached'; }
  // Menit dari tiket dibuat sampai direspons (diambil / teknisi ditugaskan). null = belum direspons.
  responseMin() { return this.respondedAt ? (this.respondedAt - this.cycleStart) / 60000 : null; }
  isReopened() { return this.reopenCount > 0; }
  hasImage() { return this.notes.some((n) => n.image); }
}
