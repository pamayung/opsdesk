import { PRIORITIES, ESCALATION_RATIO } from './constants';
import { makeNote, systemNote, routingNote } from './Note';

// Catatan penamaan: `branch` = nama lokasi (mis. Senopati), `location` = area di dalam lokasi itu (mis. Area kasir).
export default class Ticket {
  constructor(p) {
    Object.assign(this, {
      type: 'incident', routing: null, subId: null, answers: [], branch: '', description: '', reporterRole: '', notes: [],
      escalation: null, resolution: null, respondedAt: null, assignee: null,
    }, p);
  }
  static create({ id, type, routing, subId, answers, branch, location, priority, categoryId, title, description, reporter, reporterRole, image }, now = Date.now()) {
    const notes = [systemNote('Ticket created and added to the queue', now)];
    if (routing) notes.push(routingNote(routing, now));
    if (description || image) {
      notes.push(makeNote({ party: 'reporter', author: reporter, role: reporterRole, text: description, image, at: now }));
    }
    return new Ticket({ id, type, routing, subId, answers: answers || [], branch, location, priority, categoryId, title, description, reporter, reporterRole, notes, status: 'open', createdAt: now });
  }
  // Entitas diperlakukan immutable: setiap perubahan menghasilkan salinan baru.
  with(patch) { return new Ticket({ ...this, ...patch }); }

  get slaMinutes() { return PRIORITIES[this.priority].sla; }
  get respondTarget() { return PRIORITIES[this.priority].respond; }
  remainingMin(now = Date.now()) { return this.slaMinutes - (now - this.createdAt) / 60000; }
  ageMin(now = Date.now()) { return (now - this.createdAt) / 60000; }
  slaLevel(now = Date.now()) {
    if (this.status === 'done') return 'done';
    const m = this.remainingMin(now);
    return m < 0 ? 'breached' : m < 30 ? 'critical' : m < 60 ? 'warning' : 'ok';
  }
  // Eskalasi SLA otomatis: 0 = tidak ada, 1 = belum direspons melewati target, 2 = sisa SLA < 25% / terlewat.
  escalationLevel(now = Date.now()) {
    if (this.status === 'done') return 0;
    if (this.remainingMin(now) < this.slaMinutes * ESCALATION_RATIO) return 2;
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
  resolutionMin() { return this.status === 'done' && this.resolution ? (this.resolution.closedAt - this.createdAt) / 60000 : null; }
  // Pernah melewati batas SLA: tiket aktif yang sudah lewat, atau tiket selesai yang ditutup setelah batas.
  wasBreached(now = Date.now()) {
    if (this.status === 'done') { const m = this.resolutionMin(); return m !== null && m > this.slaMinutes; }
    return this.remainingMin(now) < 0;
  }
  isCritical(now) { return this.slaLevel(now) === 'critical'; }
  isBreached(now) { return this.slaLevel(now) === 'breached'; }
  // Menit dari tiket dibuat sampai direspons (diambil / teknisi ditugaskan). null = belum direspons.
  responseMin() { return this.respondedAt ? (this.respondedAt - this.createdAt) / 60000 : null; }
  hasImage() { return this.notes.some((n) => n.image); }
}
