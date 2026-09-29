// DOMAIN: aturan bisnis murni, tanpa dependensi React/Browser
export const PRIORITIES = {
  P1: { label: 'P1 · Urgent', sla: 30, slaText: '30 menit', desc: 'Pekerjaan berhenti total atau ada bahaya bagi orang. Perlu ditangani sekarang.', tone: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-600' },
  P2: { label: 'P2 · High', sla: 120, slaText: '2 jam', desc: 'Fungsi penting terganggu dan pekerjaan jadi lambat.', tone: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  P3: { label: 'P3 · Medium', sla: 720, slaText: '12 jam', desc: 'Ada gangguan, tetapi pekerjaan masih bisa berjalan.', tone: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-600' },
  P4: { label: 'P4 · Low', sla: 2880, slaText: '1–2 hari', desc: 'Permintaan biasa atau perbaikan yang bisa dijadwalkan.', tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};
export const STATUS = {
  open: { label: 'Baru', tone: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'Dikerjakan', tone: 'bg-amber-100 text-amber-800' },
  done: { label: 'Selesai', tone: 'bg-emerald-100 text-emerald-800' },
};
export const formatMinutes = (m) => {
  const a = Math.abs(Math.round(m));
  const t = a >= 60 ? `${Math.floor(a / 60)} jam${a % 60 ? ` ${a % 60} mnt` : ''}` : `${a} mnt`;
  return m < 0 ? `Lewat ${t}` : `Sisa ${t}`;
};
