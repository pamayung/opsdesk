// Menguji mapper dengan respons NYATA dari backend (tests/fixtures, dibuat tests/capture-fixtures.mjs).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { buildRef, toUser, toTicketSummary, toTicketDetail, toStats, toDeptQueues, toTeamQueues, toReport, toRoutePreview, buildAdmin, hoursFromRows, rowsFromHours, slaTexts } from '../src/data/mappers.js';
import { eventText } from '../src/data/eventText.js';
const DAY = 86400000;

// dijalankan dari akar proyek (scripts/run-tests.mjs); import.meta.url menunjuk bundel sementara, jadi pakai cwd
const fx = (n) => JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures', `${n}.json`), 'utf8'));
const ref = buildRef(fx('reference'));
let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`GAGAL: ${name}\n${e.message}`); process.exitCode = 1; } };

test('referensi: lokasi aktif, kind hanya di akar, ID string', () => {
  const root = ref.locations.find((l) => l.name === 'Operations'); const leaf = ref.locations.find((l) => l.name === 'Senopati');
  assert.equal(typeof root.id, 'string'); assert.equal(root.parentId, null); assert.equal(root.kind, 'outlet');
  assert.ok(leaf.parentId && leaf.kind === undefined);
});
test('referensi: katalog memakai slug dan pertanyaan berID string', () => {
  const pos = ref.catalog.it.find((s) => s.id === 'pos');
  assert.equal(pos.name, 'POS / Kasir'); assert.equal(pos.questions.length, 3);
  assert.equal(typeof pos.questions[0].id, 'string'); assert.deepEqual(Object.keys(pos.questions[1]).sort(), ['id', 'label', 'options', 'required', 'type']);
  assert.equal(ref.catNum.it, ref.raw.categories.find((c) => c.slug === 'it').id);
  assert.ok(ref.subNum['it/pos']);
});
test('referensi: department slug dan kebijakan SLA', () => {
  assert.equal(ref.departments.it.name, 'IT'); assert.equal(ref.deptSlug[ref.deptNum.it], 'it');
  assert.deepEqual(ref.policies.P1, { respondMin: 15, resolveMin: 30, ratio: 0.25, warning: 60, critical: 30 });
  assert.deepEqual(slaTexts(ref, 'P2'), { respondText: '30 min', slaText: '2 hr' });
});
test('pengguna login', () => {
  const k = toUser(fx('me-kevin'), ref); assert.equal(k.name, 'Kevin Mahendra'); assert.equal(k.role, 'pic'); assert.ok(k.teamIds.length >= 1);
  const a = toUser(fx('me-andri'), ref); assert.equal(a.role, 'manager'); assert.equal(a.department, 'it');
  assert.equal(toUser(fx('me-rina'), ref).role, 'employee');
});
test('ringkasan tiket: ID kode, status done, kategori slug, PIC awal, SLA dari server', () => {
  const list = fx('tickets-list'); const ts = list.data.map((t) => toTicketSummary(t, ref));
  const done = ts.find((t) => t.title.includes('selesai')); const open = ts.find((t) => t.title.includes('terbuka'));
  assert.match(open.id, /^TCK-\d+$/); assert.equal(open.status, 'open'); assert.equal(done.status, 'done');
  assert.equal(open.categoryId, 'it'); assert.equal(open.subId, 'pos'); assert.equal(open.branch, 'Senopati'); assert.equal(open.location, 'Area kasir');
  assert.equal(open.routing.team, 'IT Support Area'); assert.equal(open.routing.department, 'it'); assert.equal(open.routing.pic.name, 'Kevin Mahendra');
  assert.ok(open.dueAt > open.createdAt); assert.equal(Math.round(open.slaMinutes), 720); // P3 = 12 jam
  assert.ok(done.resolution.closedAt > 0);
});
test('SLA di klien sama dengan yang dihitung server pada saat yang sama', () => {
  const list = fx('tickets-list'); let compared = 0;
  for (const raw of list.data) {
    const t = toTicketSummary(raw, ref); const rem = raw.sla.remaining_min;
    const now = Date.parse(raw.sla.resolve_due_at) - rem * 60000; // saat server menghitung (dari nilai yang dibulatkan 2 desimal)
    assert.ok(Math.abs(t.remainingMin(now) - rem) < 0.02, raw.code);
    // remaining_min dibulatkan 2 desimal untuk tampilan, sedangkan level server dihitung dari nilai tak terbulat:
    // tepat di ambang (mis. 29,998 -> 30,00) perbandingan level tidak bermakna, jadi dilewati.
    const p = ref.policies[raw.priority]; const edges = [0, p.critical, p.warning, p.resolveMin * p.ratio];
    if (edges.some((e) => Math.abs(rem - e) < 0.011)) continue;
    assert.equal(t.slaLevel(now), raw.sla.level, raw.code); assert.equal(t.escalationLevel(now), raw.sla.escalation_level, raw.code); assert.equal(t.atRisk(now), raw.sla.at_risk, raw.code);
    compared++;
  }
  assert.ok(compared >= 1);
  // dan pada waktu-waktu lain: tiket P3 yang masih terbuka (SLA 720 menit) bergerak melewati semua level seperti definisi server
  const p2 = toTicketSummary(list.data.find((x) => x.priority === 'P3' && x.status === 'open'), ref);
  const at = (minAfterCreate) => p2.createdAt + minAfterCreate * 60000;
  const R = p2.policy.resolveMin; const seq = [at(1), at(R - 59), at(R - 29), at(R + 1)].map((n) => p2.slaLevel(n));
  assert.deepEqual(seq, ['ok', 'warning', 'critical', 'breached']);
});
test('detail: catatan, terjemahan event sistem, foto, izin', () => {
  const d = toTicketDetail(fx('ticket-detail-inprogress'), ref, (a) => `http://x${a.url}`);
  assert.equal(d.status, 'in_progress'); assert.equal(d.assignee, 'Budi Santoso');
  const texts = d.notes.map((x) => x.text);
  assert.ok(texts.includes('Ticket created and added to the queue'));
  assert.ok(texts.some((x) => x.startsWith('Routed to IT Support Area, initial PIC ')));
  assert.ok(texts.includes('Ticket taken by Kevin Mahendra')); assert.ok(texts.includes('Budi Santoso assigned as PIC by Kevin Mahendra'));
  const photo = d.notes.find((x) => x.image); assert.ok(photo.image.startsWith('http://x/api/v1/attachments/')); assert.equal(photo.kind, 'note'); assert.equal(photo.party, 'reporter');
  assert.equal(d.notes.filter((x) => x.kind === 'system').every((x) => x.party === 'system' && x.author === 'System'), true);
  assert.equal(d.permissions.can_resolve, true); assert.ok(d.assignable.some((u) => u.name === 'Budi Santoso'));
  assert.equal(d.answers.length, 3); assert.equal(d.answers[0].q, 'Nomor POS / terminal'); assert.equal(d.hasImage(), true);
  assert.equal(d.routing.ruleId, 'it-pos');
});
test('detail selesai: resolusi, eskalasi vendor, teks Resolution', () => {
  const d = toTicketDetail(fx('ticket-detail-resolved'), ref);
  assert.equal(d.status, 'done'); assert.equal(d.resolution.closedBy, 'Kevin Mahendra'); assert.match(d.resolution.note, /Adaptor diganti/);
  assert.equal(d.escalation.to, 'PT Kasir Jaya'); assert.equal(d.escalation.by, 'Kevin Mahendra');
  const texts = d.notes.map((x) => x.text);
  assert.ok(texts.includes('Escalated to PT Kasir Jaya by Kevin Mahendra')); assert.ok(texts.includes('Ticket resolved by Kevin Mahendra'));
  assert.ok(texts.some((x) => x.startsWith('Resolution: Adaptor diganti')));
  assert.equal(d.slaLevel(Date.now()), 'done'); assert.equal(d.permissions.can_add_note, false);
});
test('reopen: izin dan batas 7 hari dari server pada tiket Resolved', () => {
  const d = toTicketDetail(fx('ticket-detail-resolved-reopenable'), ref);
  assert.equal(d.status, 'done'); assert.equal(d.permissions.can_reopen, true); assert.equal(d.reopenCount, 0); assert.equal(d.isReopened(), false);
  assert.equal(d.reopenUntil - d.resolution.closedAt, 7 * DAY);
  assert.equal(d.permissions.can_resolve, false); assert.equal(d.permissions.can_add_note, false);
});
test('reopen: SLA mulai dari nol, riwayat diterjemahkan, izin reopen hilang', () => {
  const raw = fx('ticket-detail-reopened'); const d = toTicketDetail(raw, ref);
  assert.equal(d.status, 'in_progress'); assert.equal(d.reopenCount, 1); assert.equal(d.isReopened(), true); assert.equal(d.resolution, null);
  assert.ok(d.reopenedAt > 0 && d.slaStartAt === d.reopenedAt && d.cycleStart === d.reopenedAt);
  assert.equal(Math.round(d.slaMinutes), 720); assert.equal(Math.round(d.remainingMin(d.reopenedAt)), 720);
  assert.equal(d.permissions.can_reopen, false); assert.equal(d.reopenUntil, null); assert.equal(d.assignee, 'Kevin Mahendra');
  const texts = d.notes.map((x) => x.text);
  assert.ok(texts.includes('Ticket reopened by Rina')); assert.ok(texts.includes('Reopened: Masih terjadi lagi sore ini.'));
  const note = d.notes.find((x) => x.text.startsWith('Reopened: ')); assert.equal(note.kind, 'note'); assert.equal(note.party, 'reporter'); assert.equal(note.author, 'Rina');
  assert.equal(d.notes.find((x) => x.text === 'Ticket reopened by Rina').kind, 'system');
  // tiket sudah lama dibuat: SLA, umur, respons, dan resolusi tetap dihitung dari reopen, bukan dari tanggal dibuat
  const old = d.with({ createdAt: d.createdAt - 3 * DAY });
  assert.equal(Math.round(old.slaMinutes), 720); assert.equal(Math.round(old.ageMin(d.reopenedAt + 5 * 60000)), 5);
  assert.equal(old.slaLevel(d.reopenedAt + 5 * 60000), 'ok'); assert.equal(Math.round(old.responseMin()), 0);
  const resolved = old.with({ status: 'done', resolution: { note: 'x', closedBy: 'k', closedAt: d.reopenedAt + 90 * 60000 } });
  assert.equal(Math.round(resolved.resolutionMin()), 90); assert.equal(resolved.wasBreached(Date.now()), false);
  // tanpa awal siklus (tiket yang tak pernah dibuka kembali), perilakunya sama seperti sebelumnya
  const plain = toTicketDetail(fx('ticket-detail-open'), ref); assert.equal(plain.cycleStart, plain.createdAt); assert.equal(plain.reopenCount, 0);
});
test('terjemahan event: pola tak dikenal ditampilkan apa adanya', () => {
  assert.equal(eventText({ code: 'routed', body: 'Dirutekan ke Service Desk (di luar jam kerja, dialihkan ke on-call)' }), 'Routed to Service Desk (outside working hours, redirected to on-call)');
  assert.equal(eventText({ code: 'vendor_escalated', body: 'Dieskalasi ke PT Oleh oleh Siti' }), 'Escalated to PT Oleh by Siti');
  assert.equal(eventText({ code: 'reopened', body: 'Tiket dibuka kembali oleh Andri Wijaya' }), 'Ticket reopened by Andri Wijaya');
  assert.equal(eventText({ code: 'reopened', body: 'Dibuka kembali: Kambuh,\nlagi.' }), 'Reopened: Kambuh,\nlagi.');
  assert.equal(eventText({ code: 'apa-saja', body: 'Teks baru' }), 'Teks baru'); assert.equal(eventText({ code: 'created' }), '');
});
test('dashboard: statistik, antrean department dan tim', () => {
  const s = toStats(fx('dashboard-hendra'), fx('kpis-hendra').kpis);
  assert.equal(s.total, 4); assert.equal(s.active, s.open + s.inProgress); assert.deepEqual(Object.keys(s.byPriority), ['P1', 'P2', 'P3', 'P4']);
  assert.equal(s.slaRate, Math.round(((4 - s.breached) / 4) * 1000) / 10);
  const dq = toDeptQueues(fx('dashboard-hendra'), ref); assert.equal(dq[0].id, 'it'); assert.ok('count' in dq[0] && 'risk' in dq[0] && 'waiting' in dq[0]);
  const tq = toTeamQueues(fx('dashboard-andri')); assert.equal(tq[0].name, 'IT Support Area');
});
test('laporan: bentuk setara model lama', () => {
  const r = toReport(fx('report-overview'));
  assert.equal(r.period.days, 7); assert.equal(r.trend.step, 1); assert.equal(r.trend.buckets.length, 7); assert.ok(r.trend.buckets[0].start < r.trend.buckets[0].end);
  assert.equal(r.kpi.total, 4); assert.ok('slaRate' in r.kpi && 'avgResponseMin' in r.kpi);
  assert.equal(r.aging.length, 5); assert.equal(r.aging[0].label, '< 1 hr'); assert.equal(r.openNow, r.aging.reduce((a, b) => a + b.count, 0));
  assert.deepEqual(r.by.priority.map((x) => x.label), ['P1 · Critical', 'P2 · High', 'P3 · Medium']);
  assert.ok(r.by.type.every((x) => ['Incident', 'Request', 'Complaint', 'Question'].includes(x.label)));
  assert.ok(r.teams.length >= 1 && r.pics.some((p) => p.label === 'Unassigned' || p.label.length > 0));
  assert.equal(r.kpi.reopened, 1); assert.equal(r.kpi.reopenRate, 50); assert.equal(typeof r.prev.reopened, 'number');
  assert.ok(r.teams.every((x) => typeof x.reopened === 'number') && r.teams.reduce((a, x) => a + x.reopened, 0) === 1);
});
test('Routing Preview', () => {
  const p = toRoutePreview(fx('routing-preview'), ref);
  assert.equal(p.department, 'it'); assert.equal(p.team, 'IT Support Area'); assert.equal(p.pic.name, 'Kevin Mahendra'); assert.equal(p.pic.byArea, true); assert.equal(p.ruleId, 'it-pos');
});
test('admin: tim, aturan, pengguna dengan ID slug dan nama', () => {
  const a = buildAdmin(fx('admin-teams'), fx('admin-rules'), fx('admin-users'), ref);
  const area = a.teams.it_area; assert.equal(area.name, 'IT Support Area'); assert.equal(area.department, 'it'); assert.equal(area.lead, 'Kevin Mahendra');
  assert.ok(area.members.some((m) => m.name === 'Kevin Mahendra' && Array.isArray(m.scope))); assert.equal(a.teamNum.it_area, area.id);
  const rules = a.rules; assert.equal(rules.length, 31); assert.equal(rules[rules.length - 1].id, 'default'); assert.equal(rules[rules.length - 1].team, 'service_desk');
  const pos = rules.find((r) => r.id === 'it-pos'); assert.deepEqual([pos.category, pos.sub, pos.team], ['it', 'pos', 'it_area']); assert.equal('type' in pos, false);
  const kev = a.users.find((u) => u.name === 'Kevin Mahendra'); assert.equal(kev.role, 'pic'); assert.ok(kev.teamIds.includes('it_area')); assert.match(kev.email, /@/);
  assert.equal(a.departments.it.head, 'Andri Wijaya');
});
test('jam kerja: kelompok terbanyak dan kebalikannya', () => {
  const office = [1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, starts_at: '08:00', ends_at: '17:00' }));
  assert.deepEqual(hoursFromRows(office, false), { days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00' });
  assert.equal(hoursFromRows(office, true), null);
  assert.deepEqual(hoursFromRows([...office, { day_of_week: 6, starts_at: '09:00', ends_at: '12:00' }], false).days, [1, 2, 3, 4, 5]);
  assert.deepEqual(rowsFromHours({ days: [6, 7], from: '07:00', to: '22:00' }), [{ day_of_week: 6, starts_at: '07:00', ends_at: '22:00' }, { day_of_week: 7, starts_at: '07:00', ends_at: '22:00' }]);
  assert.deepEqual(rowsFromHours(null), []);
});
console.log(`mappers: ${n} tes selesai${process.exitCode ? ' (ADA YANG GAGAL)' : ' semuanya lulus'}`);
