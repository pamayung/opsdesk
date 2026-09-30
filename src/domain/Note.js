// DOMAIN: satu entri di catatan penanganan (timeline tiket).
// kind: 'note' = ditulis manusia, 'action' = aksi cepat, 'system' = log otomatis.
let counter = 0;
export const makeNote = ({ party, author, role = '', text = '', image = null, kind = 'note', at = Date.now() }) => ({
  id: `n${at.toString(36)}${(counter++).toString(36)}`, at, party, author, role, kind, text, image,
});
export const systemNote = (text, at = Date.now()) => makeNote({ party: 'system', author: 'System', kind: 'system', text, at });
export const routingNote = (r, at) => systemNote(
  `Routed to ${r.team}${r.pic ? `, initial PIC ${r.pic.name}` : ''}${r.offHours ? ' (outside working hours, redirected to on-call)' : ''}`, at);
