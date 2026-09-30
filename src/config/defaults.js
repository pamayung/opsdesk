// Kategori awal yang umum untuk semua jenis usaha. Kategori baru ditambahkan pengguna saat melapor.
// Subkategori dan pertanyaan tambahan tiap kategori ada di catalog.js.
export const DEFAULT_CATEGORIES = [
  { id: 'peralatan', name: 'Peralatan & Mesin' },
  { id: 'it', name: 'Komputer & Jaringan' },
  { id: 'utilitas', name: 'Listrik, Air & AC' },
  { id: 'fasilitas', name: 'Kebersihan & Fasilitas' },
  { id: 'stok', name: 'Stock & Inventory' },
  { id: 'keamanan', name: 'Security & Safety' },
  { id: 'hr', name: 'HR' },
  { id: 'keuangan', name: 'Finance' },
  { id: 'pengadaan', name: 'Procurement' },
  { id: 'legal', name: 'Legal' },
];

// Nama aplikasi & warna utama.
export const APP = { name: 'OpsDesk', brand: '#065f46' };

// Saran peran pelapor saat melapor atas nama orang lain (boleh diisi bebas).
export const REPORTER_ROLES = ['Staf', 'Supervisor', 'Manager', 'Kasir', 'Staf Gudang'];
