// DOMAIN: pohon lokasi bertingkat (murni). Node: { id, name, parentId, kind? }. kind diwarisi dari leluhur teratas.
const MAX_DEPTH = 12;
export const nodeById = (nodes, id) => nodes.find((n) => n.id === id) || null;
// Dari node itu sendiri naik sampai akar.
export const chainOf = (nodes, id) => {
  const out = [];
  let n = nodeById(nodes, id);
  while (n && out.length < MAX_DEPTH) { out.push(n); n = n.parentId ? nodeById(nodes, n.parentId) : null; }
  return out;
};
export const kindOfNode = (nodes, id) => (chainOf(nodes, id).find((n) => n.kind) || {}).kind;
export const pathText = (nodes, id) => chainOf(nodes, id).map((n) => n.name).join(' › ');
