// DOMAIN: siapa boleh melihat dan menangani tiket, berdasarkan peran.
// employee: tiket yang ia laporkan. pic: tiket tim-nya / yang ditugaskan kepadanya.
// manager: semua tiket department-nya. management & admin: semua tiket (hanya baca).
export const canView = (u, t) => {
  if (!u) return true;
  switch (u.role) {
    case 'management':
    case 'admin': return true;
    case 'manager': return t.department === u.department;
    case 'pic': return t.assignee === u.name || (!!t.routing && ((u.teamIds || []).includes(t.routing.teamId) || (!!t.routing.pic && t.routing.pic.name === u.name)));
    default: return t.reporter === u.name;
  }
};
export const canHandle = (u, t) => !!u && (u.role === 'pic' || u.role === 'manager') && canView(u, t);
