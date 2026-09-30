// DOMAIN: satu entri di catatan penanganan (timeline tiket).
// kind: 'note' = ditulis manusia, 'action' = aksi cepat, 'system' = log otomatis.
let counter = 0;
export const makeNote = ({ party, author, role = '', text = '', image = null, kind = 'note', at = Date.now() }) => ({
  id: `n${at.toString(36)}${(counter++).toString(36)}`, at, party, author, role, kind, text, image,
});
export const systemNote = (text, at = Date.now()) => makeNote({ party: 'system', author: 'Sistem', kind: 'system', text, at });
export const routingNote = (r, at) => systemNote(
  `Dirutekan ke ${r.team}${r.pic ? `, PIC awal ${r.pic.name}` : ''}${r.offHours ? ' (di luar jam kerja, dialihkan ke on-call)' : ''}`, at);
