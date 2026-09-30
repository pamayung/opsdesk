// DOMAIN: aturan bisnis murni, tanpa dependensi React/Browser
// sla = batas resolution (menit), respond = batas first response (menit)
export const PRIORITIES = {
  P1: { label: 'P1 · Critical', sla: 30, slaText: '30 min', respond: 15, respondText: '15 min', desc: 'Pekerjaan berhenti total atau ada bahaya bagi orang. Perlu di-handle sekarang.', tone: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-600' },
  P2: { label: 'P2 · High', sla: 120, slaText: '2 hr', respond: 30, respondText: '30 min', desc: 'Fungsi penting terganggu dan pekerjaan jadi lambat.', tone: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  P3: { label: 'P3 · Medium', sla: 720, slaText: '12 hr', respond: 120, respondText: '2 hr', desc: 'Ada gangguan, tetapi pekerjaan masih bisa berjalan.', tone: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-600' },
  P4: { label: 'P4 · Low', sla: 2880, slaText: '1–2 days', respond: 480, respondText: '8 hr', desc: 'Permintaan biasa atau perbaikan yang bisa dijadwalkan.', tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};
// Jenis kebutuhan yang dilaporkan. Ikut menentukan routing (mis. keluhan -> Service Desk).
export const REQUEST_TYPES = {
  incident: { label: 'Incident', desc: 'Ada yang rusak atau berhenti', tone: 'bg-red-50 text-red-700' },
  request: { label: 'Request', desc: 'Minta layanan atau bantuan', tone: 'bg-blue-50 text-blue-700' },
  complaint: { label: 'Complaint', desc: 'Sampaikan ketidakpuasan', tone: 'bg-violet-50 text-violet-700' },
  question: { label: 'Question', desc: 'Tanya informasi atau prosedur', tone: 'bg-slate-100 text-slate-700' },
};
// Eskalasi SLA otomatis: L1 bila belum direspons melewati target, L2 bila sisa waktu SLA di bawah 25%.
export const ESCALATION_RATIO = 0.25;
// Jenis lokasi. Menentukan aturan routing (mis. IT di Head Office ditangani IT Helpdesk HO).
export const LOCATION_KINDS = {
  outlet: { label: 'Outlet' },
  head_office: { label: 'Head Office' },
  warehouse: { label: 'Warehouse / DC' },
};
// Warna avatar catatan menurut peran penulis.
export const PARTY_OF_ROLE = { employee: 'reporter', pic: 'tech', manager: 'supervisor', management: 'supervisor' };
export const STATUS = {
  open: { label: 'Open', tone: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', tone: 'bg-emerald-800 text-white' },
  done: { label: 'Resolved', tone: 'bg-emerald-100 text-emerald-800' },
};
// Pihak yang menulis catatan; menentukan warna avatar di timeline.
export const PARTIES = {
  reporter: { label: 'Reporter', tone: 'bg-emerald-800' },
  helpdesk: { label: 'Helpdesk', tone: 'bg-blue-600' },
  tech: { label: 'Technician', tone: 'bg-amber-700' },
  supervisor: { label: 'Supervisor', tone: 'bg-slate-700' },
  system: { label: 'System', tone: 'bg-slate-400' },
};
// Status SLA -> dipakai badge/timer agar konsisten di semua halaman.
export const SLA_LEVELS = {
  done: { label: 'RESOLVED', text: 'text-emerald-700', dot: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  ok: { label: 'SLA ON TRACK', text: 'text-emerald-700', dot: 'bg-emerald-600', chip: 'bg-slate-100 text-slate-700' },
  warning: { label: 'SLA AT RISK', text: 'text-amber-700', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800' },
  critical: { label: 'SLA CRITICAL', text: 'text-red-700', dot: 'bg-red-600', chip: 'bg-red-50 text-red-700' },
  breached: { label: 'SLA BREACHED', text: 'text-red-700', dot: 'bg-red-600', chip: 'bg-red-600 text-white' },
};

// Format waktu berbahasa Inggris: "14 min left", "1 hr 5 min overdue".
export const formatMinutes = (m) => {
  const a = Math.abs(Math.round(m));
  const t = a >= 60 ? `${Math.floor(a / 60)} hr${a % 60 ? ` ${a % 60} min` : ''}` : `${a} min`;
  return m < 0 ? `${t} overdue` : `${t} left`;
};
// Hitung mundur presisi detik: "13:42 left". Di atas 1 jam: "2 hr 5 min left".
export const formatClock = (m) => {
  const s = Math.abs(Math.round(m * 60));
  const h = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const t = h ? `${h} hr ${mm} min` : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return m < 0 ? `${t} overdue` : `${t} left`;
};
// Ringkas untuk kartu/tabel sempit: "45 min", "1h 34m", "2d 3h".
export const formatCompact = (m) => {
  const a = Math.round(m);
  if (a < 60) return `${a} min`;
  if (a < 1440) { const h = Math.floor(a / 60); const r = a % 60; return r ? `${h}h ${r}m` : `${h}h`; }
  const d = Math.floor(a / 1440); const h = Math.round((a % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
};
export const formatDuration = (m) => {
  const a = Math.max(0, Math.round(m));
  if (a < 60) return `${a} min`;
  const h = Math.floor(a / 60), r = a % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
};

// Semua waktu ditampilkan dalam WIB agar sama di semua perangkat.
const TZ = 'Asia/Jakarta';
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: TZ });
export const formatTime = (ts) => `${timeFmt.format(ts)} WIB`;
// "2026-09-30 10:15" (WIB), untuk ekspor.
export const formatStamp = (ts) => `${dayFmt.format(ts)} ${timeFmt.format(ts)}`;
export const formatDateTime = (ts, now = Date.now()) =>
  dayFmt.format(ts) === dayFmt.format(now) ? formatTime(ts) : `${dateFmt.format(ts)}, ${formatTime(ts)}`;
