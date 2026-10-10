// Menangkap respons NYATA dari backend sebagai fixture tes mapper (jalankan terhadap server yang berjalan dan database ber-seed).
//   BASE_URL=http://127.0.0.1:8080 node tests/capture-fixtures.mjs
import { writeFileSync } from 'node:fs';
import { OpsDeskClient } from '../src/api/index.js';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080';
const PW = process.env.PASSWORD || 'Rahasia123!';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const out = (name, data) => writeFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), JSON.stringify(data, null, 1));
const mk = async (email) => { const c = new OpsDeskClient({ baseUrl: BASE }); await c.login(email, PW); return c; };
const email = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '@opsdesk.example';

const sari = await mk(email('Sari Administrator')), rina = await mk(email('Rina')), kevin = await mk(email('Kevin Mahendra'));
const andri = await mk(email('Andri Wijaya')), hendra = await mk(email('Hendra Gunawan'));

const ref = await sari.api.getReference();
out('reference', ref);
out('admin-teams', await sari.api.adminListTeams());
out('admin-rules', await sari.api.adminListRoutingRules());
out('admin-users', await sari.api.adminListUsers());
out('me-kevin', await kevin.api.me());
out('me-andri', await andri.api.me());
out('me-rina', await rina.api.me());

const cat = ref.categories.find((c) => c.slug === 'it'), sub = cat.subcategories.find((s) => s.slug === 'pos');
const loc = ref.locations.find((l) => l.name === 'Senopati');
const answers = sub.questions.map((q) => ({ question_id: q.id, answer: q.type === 'select' ? q.options[0] : q.type === 'yesno' ? 'Ya' : 'POS 1' }));
const body = (title, priority = 'P1') => ({ type: 'incident', priority, category_id: cat.id, subcategory_id: sub.id, location_id: loc.id, area: 'Area kasir', title, description: 'Mesin POS mati total saat jam makan siang.', answers });

const open = await rina.createTicket(body('Tiket terbuka untuk fixture', 'P3'));
const work = await rina.createTicket(body('Tiket dengan foto dan catatan'));
await kevin.api.takeTicket(work.code);
const budi = (await kevin.api.getTicket(work.code)).assignable_users.find((u) => u.name === 'Budi Santoso');
await kevin.api.assignTicket(work.code, { pic_id: budi.id });
await rina.addNoteWithPhoto(work.code, 'Foto kondisi terlampir', new Blob([PNG], { type: 'image/png' }), 'foto.png');
out('ticket-detail-inprogress', await kevin.api.getTicket(work.code));

const done = await rina.createTicket(body('Tiket selesai dengan eskalasi vendor', 'P2'));
await kevin.api.takeTicket(done.code);
await kevin.api.escalateTicketToVendor(done.code, { to: 'PT Kasir Jaya' });
await kevin.api.resolveTicket(done.code, { note: 'Adaptor diganti baru, POS menyala.' });
out('ticket-detail-resolved', await rina.api.getTicket(done.code));
out('ticket-detail-open', await rina.api.getTicket(open.code));
// tiket yang dibuka kembali: simpan detail sebelum (can_reopen true + reopen_until) dan sesudah reopen
const again = await rina.createTicket(body('Tiket yang dibuka kembali', 'P3'));
await kevin.api.takeTicket(again.code);
await kevin.api.resolveTicket(again.code, { note: 'Kabel dirapikan, sudah normal.' });
out('ticket-detail-resolved-reopenable', await rina.api.getTicket(again.code));
await rina.api.reopenTicket(again.code, { reason: 'Masih terjadi lagi sore ini.' });
out('ticket-detail-reopened', await rina.api.getTicket(again.code));
out('tickets-list', await kevin.api.listTickets({ status: 'all', page_size: 20 }));
out('dashboard-kevin', await kevin.api.getDashboard());
out('dashboard-andri', await andri.api.getDashboard());
out('dashboard-hendra', await hendra.api.getDashboard());
out('kpis-hendra', await hendra.api.reportKPIs({ preset: '90d' }));
out('report-overview', await hendra.api.reportOverview({ preset: '7d' }));
out('routing-preview', await rina.api.previewRouting({ category_id: cat.id, subcategory_id: sub.id, type: 'incident', location_id: loc.id, priority: 'P3' }));
console.log('fixture ditulis:', open.code, work.code, done.code, again.code);
