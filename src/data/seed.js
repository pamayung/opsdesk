import Ticket from '../domain/Ticket';
import { makeNote, systemNote, routingNote } from '../domain/Note';
import { PRIORITIES } from '../domain/constants';

const min = 60000;
// Aset publik dirujuk relatif terhadap base aplikasi (bukan "/"), agar tetap termuat saat dihosting di subpath (mis. GitHub Pages).
const BASE = (import.meta.env && import.meta.env.BASE_URL) || './';
const POS_PHOTO = `${BASE}seed/pos-terminal.jpg`;
// Rute tiket contoh dievaluasi pada jam kerja tetap (Rabu 10:00 WIB) agar demo selalu sama, apa pun jam bukanya.
const OFFICE_TIME = Date.parse('2026-09-30T03:00:00Z');
const pairs = (list) => list.map(([q, a]) => ({ q, a }));

// PRNG deterministik: riwayat contoh selalu sama sehingga demo dan tes stabil.
const rng = (seed) => () => {
  let t = (seed += 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const PRI = ['P1', 'P2', 'P3', 'P4'];
const OUTLETS = ['Senopati', 'Kemang', 'PIM', 'BSD'];
const OFFICE = ['Head Office'];
const DC = ['DC Cikarang', 'Warehouse', 'Fleet', 'Maintenance'];
const NAMES = ['Andi', 'Bagus', 'Dian', 'Eka', 'Fitri', 'Gilang', 'Hana', 'Indra', 'Joko', 'Kiki', 'Lulu', 'Maman'];
const ROLE_AT = (places) => (places === OUTLETS ? ['Kasir', 'Barista', 'Chef', 'Floor Manager'] : places === DC ? ['Staf Gudang'] : ['Staf Kantor']);
// [judul, kategori, subkategori, lokasi yang wajar, prioritas dasar, jenis]
const TEMPLATES = [
  ['POS tidak bisa login', 'it', 'pos', OUTLETS, 'P2', 'incident'], ['Printer struk macet', 'it', 'pos', OUTLETS, 'P3', 'incident'],
  ['Internet outlet lambat', 'it', 'network', OUTLETS, 'P3', 'incident'], ['AC tidak dingin', 'utilitas', 'ac', OUTLETS, 'P3', 'incident'],
  ['Listrik sering turun', 'utilitas', 'listrik', OUTLETS, 'P2', 'incident'], ['Keran bocor', 'utilitas', 'air', OUTLETS, 'P3', 'incident'],
  ['Toilet mampet', 'fasilitas', 'toilet', OUTLETS, 'P3', 'incident'], ['Mesin espresso error', 'peralatan', 'mesin', OUTLETS, 'P2', 'incident'],
  ['Stok bahan hampir habis', 'stok', 'stok', OUTLETS, 'P3', 'request'], ['Kunci pintu rusak', 'keamanan', 'akses', OUTLETS, 'P2', 'incident'],
  ['CCTV tidak merekam', 'keamanan', 'akses', OUTLETS, 'P3', 'incident'], ['Lampu area makan mati', 'fasilitas', 'gedung', OUTLETS, 'P4', 'request'],
  ['Laptop rusak', 'it', 'enduser', OFFICE, 'P3', 'incident'], ['Printer kantor macet', 'it', 'enduser', OFFICE, 'P3', 'incident'],
  ['Minta akses aplikasi SAP', 'it', 'bizapp', OFFICE, 'P3', 'request'], ['Wi-Fi kantor lambat', 'it', 'network', OFFICE, 'P3', 'incident'],
  ['Request kartu nama', 'fasilitas', 'kantor', OFFICE, 'P4', 'request'], ['Request recruitment posisi baru', 'hr', 'recruitment', OFFICE, 'P3', 'request'],
  ['Pertanyaan slip gaji', 'hr', 'payroll', OFFICE, 'P3', 'question'], ['Minta surat keterangan kerja', 'hr', 'dokumen', OFFICE, 'P4', 'request'],
  ['Invoice vendor salah nominal', 'keuangan', 'ap', OFFICE, 'P3', 'incident'], ['Reimbursement belum cair', 'keuangan', 'expense', OFFICE, 'P3', 'complaint'],
  ['Request pembelian laptop', 'pengadaan', 'it', OFFICE, 'P3', 'request'], ['Review kontrak vendor', 'legal', 'kontrak', OFFICE, 'P3', 'request'],
  ['Forklift bermasalah', 'peralatan', 'forklift', DC, 'P2', 'incident'], ['WMS error saat scan', 'it', 'wms', DC, 'P2', 'incident'],
  ['Internet DC tidak stabil', 'it', 'network', DC, 'P3', 'incident'], ['Selisih stok gudang', 'stok', 'stok', DC, 'P3', 'incident'],
  ['Pintu dock rusak', 'keamanan', 'akses', DC, 'P3', 'incident'],
];
const RESOLUTIONS = ['Sudah diperbaiki dan dites.', 'Komponen diganti, berfungsi normal.', 'Pengaturan diperbaiki, sudah normal.', 'Permintaan sudah diproses.', 'Sudah dikonfirmasi selesai oleh pelapor.'];

// route(input, waktu) = mesin routing; locInfo(namaLokasi) = { kind, ids } dari pohon lokasi.
function makeSeed(route, locInfo, now) {
  const ago = (m) => now - m * min;
  const created = (at) => systemNote('Ticket created and added to the queue', at);
  const reporterNote = (author, role, text, at, image = null) => makeNote({ party: 'reporter', author, role, text, image, at });

  // Membuat tiket contoh: rute dihitung dengan mesin yang sama seperti tiket asli.
  // p: [prioritas, kategori, subkategori, lokasi, area, judul, detail, pelapor, peran pelapor, umur (menit)]
  const mk = (i, p, o = {}) => {
    const [priority, categoryId, subId, branch, location, title, description, reporter, reporterRole, age] = p;
    const info = locInfo(branch);
    const type = o.type || 'incident';
    const routing = route({ categoryId, subId, type, priority, kind: info.kind, locationIds: info.ids }, OFFICE_TIME);
    const createdAt = ago(age);
    const status = o.status || 'open';
    const assignee = o.assignee || null;
    const respondedAt = assignee ? createdAt + (o.respondAfter || 4) * min : null;
    const notes = o.notes || [created(createdAt), routingNote(routing, createdAt)];
    if (!o.notes) {
      if (description) notes.push(reporterNote(reporter, reporterRole, description, createdAt + min));
      if (assignee) notes.push(systemNote(`Ticket taken by ${assignee}`, respondedAt));
    }
    let resolution = null;
    if (status === 'done') {
      const closedAt = createdAt + o.closeAfter * min;
      resolution = { note: o.resolutionNote, closedBy: assignee, closedAt };
      if (!o.notes) notes.push(makeNote({ party: 'tech', author: assignee, role: 'PIC', text: `Resolution: ${o.resolutionNote}`, at: closedAt }), systemNote(`Ticket resolved by ${assignee}`, closedAt));
    }
    return new Ticket({
      id: o.id || `TCK-${1040 + i}`, type, priority, categoryId, subId, branch, location, title, description, reporter, reporterRole,
      createdAt, status, assignee, respondedAt, resolution, routing, answers: pairs(o.answers || []), notes,
    });
  };

  const recent = () => [
    // Tiket contoh lengkap dengan percakapan dan foto.
    mk(2, ['P1', 'it', 'pos', 'Senopati', 'Area kasir depan', 'Mesin POS 1 mati total pas peak dinner', 'Perangkat mati tiba-tiba saat cetak bill meja 14. Kabel adaptor panas, indikator lampu dock padam total.', 'Rina', 'Kasir', 16], {
      status: 'in_progress', assignee: 'Kevin Mahendra', answers: [['Nomor POS / terminal', 'POS 1'], ['Gejala', 'Mati total'], ['Transaksi masih bisa lewat POS lain?', 'Ya']],
      notes: [
        created(ago(16)), routingNote(route({ categoryId: 'it', subId: 'pos', type: 'incident', priority: 'P1', kind: 'outlet', locationIds: locInfo('Senopati').ids }, OFFICE_TIME), ago(16)),
        reporterNote('Rina', 'Kasir', 'Adaptor cadangan yang di lemari kasir sudah dicoba colok tetap tidak menyala lampu indikatornya. Sekarang orderan meja 14–18 dialihkan sementara ke POS 2 (Minuman).', ago(15), POS_PHOTO),
        systemNote('Ticket taken by Kevin Mahendra', ago(12)),
        makeNote({ party: 'helpdesk', author: 'Niko', role: 'IT Helpdesk', text: 'Log Cloud POS menunjukkan terminal disconnect mendadak tanpa error sinkronisasi. Bawa 1 unit PSU dock cadangan seri EPSON TM-T82 & mainboard touch kit.', at: ago(11) }),
        makeNote({ party: 'tech', author: 'Kevin Mahendra', role: 'IT Support Area', text: 'Sudah di jalan ke Senopati, estimasi tiba 4 menit. Masuk lewat pintu loading bay langsung ke meja kasir 1.', at: ago(7) }),
      ],
    }),
    mk(3, ['P1', 'utilitas', 'ac', 'Kemang', 'Chiller dapur belakang', 'Suhu chiller naik, bahan berisiko rusak', 'Display suhu menunjukkan 9°C dan terus naik sejak 30 menit lalu. Daging dan dairy masih di dalam.', 'Junaidi', 'Chef', 22], { answers: [['Jumlah unit', '1'], ['Masalah', 'Tidak dingin']] }),
    mk(4, ['P2', 'peralatan', 'mesin', 'PIM', 'Bar utama', 'Mesin espresso sering berhenti sendiri', 'Mati sendiri setiap 3–4 shot, lampu boiler berkedip.', 'Fajar', 'Barista', 48], { status: 'in_progress', assignee: 'Dewi Lestari', answers: [['Nama / nomor mesin', 'Espresso 2 group'], ['Masih bisa dipakai?', 'Ya']] }),
    mk(5, ['P2', 'keamanan', 'akses', 'BSD', 'Pintu belakang', 'Kunci pintu belakang rusak, tidak bisa dikunci', '', 'Dandi', 'Floor Manager', 35]),
    mk(6, ['P3', 'stok', 'stok', 'Senopati', 'Gudang belakang', 'Stok cup takeaway hampir habis', 'Sisa sekitar 2 sleeve, cukup untuk kira-kira dua jam.', 'Bayu', 'Barista', 70], { type: 'request', answers: [['Nama barang', 'Cup takeaway 12oz'], ['Sisa stok', '2 sleeve']] }),
    mk(7, ['P4', 'fasilitas', 'gedung', 'Kemang', 'Area lounge', 'Lampu hias area lounge perlu diganti', '', 'Hendra', 'Floor Manager', 300], { type: 'request' }),
    mk(8, ['P3', 'utilitas', 'air', 'PIM', 'Toilet pelanggan', 'Keran wastafel bocor', '', 'Tyo', 'Floor Manager', 200], { status: 'done', assignee: 'Dewi Lestari', closeAfter: 50, resolutionNote: 'Seal keran diganti dan sudah dites, tidak bocor lagi.', answers: [['Masalah', 'Bocor']] }),
    // Head Office
    mk(9, ['P3', 'it', 'network', 'Head Office', 'Lantai 3', 'Wi-Fi lantai 3 kantor pusat sangat lambat', 'Sejak pagi video call sering putus di area tim finance.', 'Citra Maharani', 'Staf Kantor', 130], { answers: [['Gejala', 'Lambat'], ['Yang terdampak', 'Satu area atau lantai']] }),
    mk(10, ['P4', 'hr', 'dokumen', 'Head Office', 'Lantai 2', 'Permintaan surat keterangan kerja', 'Untuk pengajuan KPR, dibutuhkan paling lambat minggu depan.', 'Dimas', 'Staf Kantor', 400], { type: 'request', answers: [['Jenis dokumen', 'Surat keterangan kerja']] }),
    mk(11, ['P3', 'keuangan', 'expense', 'Head Office', 'Lantai 2', 'Reimbursement dinas belum cair setelah 2 minggu', '', 'Rio', 'Staf Kantor', 180], { type: 'complaint', answers: [['Nominal (Rp)', '1850000']] }),
    mk(12, ['P2', 'peralatan', 'forklift', 'Maintenance', 'Area bongkar muat', 'Baterai forklift 2 cepat habis', 'Baru dipakai 2 jam sudah habis, bongkar muat jadi tertunda.', 'Joni', 'Staf Gudang', 60], { answers: [['Nomor unit', 'FL-02'], ['Unit masih bisa dipakai?', 'Ya']] }),
    // Contoh dari kebutuhan organisasi: satu jenis masalah, tujuan berbeda menurut lokasi & subkategori
    mk(13, ['P3', 'it', 'enduser', 'Head Office', 'Lantai 2', 'Laptop tidak bisa menyala', 'Sudah dicas semalaman, lampu indikator tidak menyala.', 'Citra Maharani', 'Staf Kantor', 90], { status: 'in_progress', assignee: 'Niko Pratama', answers: [['Jenis perangkat', 'Laptop'], ['Nomor aset', 'LT-0231'], ['Apa yang terjadi?', 'Tidak menyala sama sekali']] }),
    mk(14, ['P3', 'it', 'bizapp', 'Head Office', 'Lantai 4', 'Tidak bisa akses SAP modul MM', '', 'Rio', 'Staf Kantor', 75], { type: 'request', answers: [['Aplikasi', 'SAP'], ['Akses atau modul yang dibutuhkan', 'MM (Materials Management)']] }),
    mk(15, ['P4', 'fasilitas', 'kantor', 'Head Office', 'Lantai 2', 'Request kartu nama', '', 'Citra Maharani', 'Staf Kantor', 500], { type: 'request', status: 'done', assignee: 'Ratna Sari', closeAfter: 240, resolutionNote: 'Kartu nama sudah dicetak dan diantar ke meja.', answers: [['Barang yang diminta', 'Kartu nama 2 box'], ['Jumlah', '2']] }),
    mk(16, ['P3', 'hr', 'recruitment', 'Head Office', 'Lantai 2', 'Request recruitment Supervisor Gudang', '', 'Dimas', 'Staf Kantor', 260], { type: 'request', answers: [['Posisi', 'Supervisor Gudang'], ['Jumlah kebutuhan', '2']] }),
    mk(17, ['P3', 'keuangan', 'ap', 'Head Office', 'Lantai 2', 'Invoice vendor salah nominal', 'Nominal di invoice tidak sama dengan PO.', 'Rio', 'Staf Kantor', 210], { answers: [['Nama vendor', 'PT Sumber Makmur'], ['Nomor invoice', 'INV-88213']] }),
    mk(18, ['P3', 'pengadaan', 'it', 'Head Office', 'Lantai 3', 'Request pembelian laptop', '', 'Dimas', 'Staf Kantor', 330], { type: 'request', answers: [['Barang yang dibeli', 'Laptop karyawan baru'], ['Jumlah', '3']] }),
    mk(19, ['P3', 'legal', 'kontrak', 'Head Office', 'Lantai 5', 'Review kontrak sewa gudang', '', 'Rio', 'Staf Kantor', 420], { type: 'request', answers: [['Pihak lawan', 'PT Properti Nusantara'], ['Jenis dokumen', 'Sewa']] }),
    mk(20, ['P2', 'it', 'wms', 'Warehouse', 'Area scan barang', 'Sistem WMS error saat scan barang masuk', 'Scan berhasil tapi stok tidak bertambah.', 'Joni', 'Staf Gudang', 40], { answers: [['Operasional gudang berhenti?', 'Tidak'], ['Modul yang bermasalah', 'Inbound']] }),
    mk(21, ['P3', 'fasilitas', 'toilet', 'Kemang', 'Toilet pelanggan', 'Toilet pelanggan mampet', '', 'Junaidi', 'Chef', 55], { answers: [['Masalah', 'Mampet']] }),
    mk(22, ['P3', 'fasilitas', 'toilet', 'PIM', 'Toilet karyawan', 'Toilet karyawan bocor', '', 'Fajar', 'Barista', 65], { answers: [['Masalah', 'Bocor']] }),
    // "Internet bermasalah": masalah yang sama, PIC berbeda menurut lokasi
    mk(23, ['P3', 'it', 'network', 'Senopati', 'Area kasir', 'Internet outlet lambat', '', 'Rina', 'Kasir', 45], { answers: [['Gejala', 'Lambat'], ['Yang terdampak', 'Seluruh lokasi']] }),
    mk(24, ['P3', 'it', 'network', 'BSD', 'Area kasir', 'Internet outlet putus-putus', '', 'Dandi', 'Floor Manager', 50], { answers: [['Gejala', 'Putus-putus'], ['Yang terdampak', 'Seluruh lokasi']] }),
    mk(25, ['P3', 'it', 'network', 'DC Cikarang', 'Kantor DC', 'Internet DC tidak stabil', '', 'Joni', 'Staf Gudang', 85], { answers: [['Gejala', 'Putus-putus'], ['Yang terdampak', 'Satu area atau lantai']] }),
    mk(26, ['P2', 'it', 'enduser', 'Head Office', 'Lantai 2', 'Printer lantai 2 macet', 'Kertas macet berulang.', 'Citra Maharani', 'Staf Kantor', 600], { status: 'done', assignee: 'Rara Anjani', closeAfter: 200, resolutionNote: 'Roller printer dibersihkan dan diganti, sudah normal.', answers: [['Jenis perangkat', 'Printer'], ['Apa yang terjadi?', 'Kertas macet']] }),
  ];

  // Riwayat contoh 60 hari (semuanya selesai) supaya laporan punya tren dan perbandingan dengan periode sebelumnya.
  // ID TCK-0900..1029 (di bawah tiket contoh di atas, jadi nomor tiket baru tidak berubah).
  const history = (count = 130) => {
    const rand = rng(20260930);
    const pick = (a) => a[Math.floor(rand() * a.length)];
    return Array.from({ length: count }, (_, n) => {
      const [title, categoryId, subId, places, base, type] = pick(TEMPLATES);
      const branch = pick(places);
      const r = rand();
      const priority = PRI[Math.min(3, Math.max(0, PRI.indexOf(base) + (r < 0.1 ? -1 : r > 0.88 ? 1 : 0)))];
      const age = 600 + Math.floor(rand() * (86400 - 600)); // 10 jam sampai 60 hari lalu
      const info = locInfo(branch);
      const routing = route({ categoryId, subId, type, priority, kind: info.kind, locationIds: info.ids }, OFFICE_TIME);
      const P = PRIORITIES[priority];
      const respondAfter = Math.max(1, Math.round(P.respond * (0.1 + rand() * 0.8 * (rand() < 0.1 ? 2 : 1))));
      const f = rand() < 0.12 ? 1.1 + rand() * 1.2 : 0.12 + 0.95 * rand() ** 1.6; // ~15% melewati SLA
      const closeAfter = Math.max(respondAfter + 1, Math.min(Math.round(P.sla * f), age - 2));
      return mk(0, [priority, categoryId, subId, branch, '', title, '', pick(NAMES), pick(ROLE_AT(places)), age], {
        id: `TCK-${String(900 + n).padStart(4, '0')}`, type, status: 'done', respondAfter, closeAfter,
        assignee: routing.pic ? routing.pic.name : routing.escalation.l1, resolutionNote: pick(RESOLUTIONS),
      });
    });
  };
  return { recent, history };
}

export default function seed(route, locInfo, now = Date.now()) {
  const s = makeSeed(route, locInfo, now);
  return [...s.recent(), ...s.history()];
}
// Hanya riwayat contoh; dipakai tombol "Tambah data contoh" di halaman Admin.
export const sampleHistory = (route, locInfo, now = Date.now()) => makeSeed(route, locInfo, now).history();
