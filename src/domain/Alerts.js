// DOMAIN: menentukan apakah hasil polling ringkasan membawa kabar baru yang perlu membunyikan notifikasi.
// Murni (tanpa DOM/audio) agar bisa diuji. `prev`/`next` berbentuk container.stats (lihat mappers.toStats).
// Aturan: hanya KENAIKAN yang dihitung; angka turun (tiket selesai, dsb.) tidak membunyikan apa pun.
//   urgent -> tiket baru yang berisiko SLA / melanggar SLA   (nada mendesak, dua ketukan)
//   new    -> tiket baru di antrean Anda                       (nada lembut, satu ketukan)
export function detectAlert(prev, next) {
  if (!prev || !next) return null; // pemuatan pertama = baseline, bukan kabar baru
  const risk = (next.atRisk || 0) - (prev.atRisk || 0);
  const breached = (next.breached || 0) - (prev.breached || 0);
  if (risk > 0 || breached > 0) {
    const n = Math.max(risk, 0) + Math.max(breached, 0);
    return { kind: 'urgent', message: `${n} ticket${n === 1 ? '' : 's'} now At risk / SLA breached` };
  }
  const added = (next.total || 0) - (prev.total || 0);
  const reopened = (next.active || 0) - (prev.active || 0);
  if (added > 0) return { kind: 'new', message: added === 1 ? '1 new ticket in your Queue' : `${added} new tickets in your Queue` };
  if (reopened > 0) return { kind: 'new', message: 'A ticket is active again (reopened)' };
  return null;
}
