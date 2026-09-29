import Ticket from '../domain/Ticket';

const ago = (m) => Date.now() - m * 60000;
export default function seed() {
  const mk = (i, priority, categoryId, location, title, min, reporter, status = 'open', assignee = null) =>
    new Ticket({ id: `INC-${8800 + i}`, priority, categoryId, location, title, description: title, reporter, hasPhoto: i % 2 === 0, status, assignee, createdAt: ago(min) });
  return [
    mk(1, 'P1', 'it', 'Area kasir depan', 'Komputer kasir mati total, transaksi berhenti', 12, 'Rina', 'in_progress', 'Petugas'),
    mk(2, 'P1', 'utilitas', 'Ruang pendingin belakang', 'Suhu ruang pendingin naik, barang berisiko rusak', 22, 'Junaidi'),
    mk(3, 'P2', 'peralatan', 'Lantai 2 - Ruang produksi', 'Mesin utama sering berhenti sendiri', 48, 'Fajar', 'in_progress', 'Petugas'),
    mk(4, 'P2', 'keamanan', 'Pintu samping', 'Kunci pintu samping rusak, tidak bisa dikunci', 35, 'Dandi'),
    mk(5, 'P3', 'stok', 'Gudang belakang', 'Persediaan kemasan hampir habis', 70, 'Bayu'),
    mk(6, 'P4', 'fasilitas', 'Lobi utama', 'Lampu hias lobi perlu diganti', 300, 'Hendra'),
    mk(7, 'P3', 'utilitas', 'Toilet lantai 1', 'Keran bocor, sudah diperbaiki', 200, 'Tyo', 'done', 'Petugas'),
  ];
}
