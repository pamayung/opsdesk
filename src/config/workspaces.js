// CONFIG: satu aplikasi, banyak bisnis/divisi. Tambah objek baru = bisnis baru, tanpa ubah UI.
export const WORKSPACES = {
  resto: {
    id: 'resto', name: 'RestoOps', brand: '#065f46', unitLabel: 'Cabang',
    units: ['Senopati', 'Kemang', 'PIM', 'BSD'],
    reporterRoles: ['Kasir', 'Chef', 'Barista', 'Floor Manager'],
    categories: [
      { id: 'pos', label: 'Mesin POS / Kasir', team: 'IT Support', icon: '🖥️' },
      { id: 'kitchen', label: 'Dapur & Chiller', team: 'Teknisi MEP', icon: '🧊' },
      { id: 'bar', label: 'Mesin Kopi / Bar', team: 'Teknisi MEP', icon: '☕' },
      { id: 'stock', label: 'Bahan Baku Kurang', team: 'Inventory', icon: '📦' },
      { id: 'safety', label: 'Gas & Keselamatan', team: 'Teknisi MEP', icon: '🔥' },
    ],
    examples: { P1: 'Sistem mati total, bahaya, order berhenti', P2: 'Alat penting rusak, operasional lambat', P3: 'Gangguan kecil, masih bisa transaksi', P4: 'Permintaan rutin / perbaikan ringan' },
  },
  retail: {
    id: 'retail', name: 'RetailOps', brand: '#1d4ed8', unitLabel: 'Toko',
    units: ['Grand Indonesia', 'Kelapa Gading', 'Bandung Kota'],
    reporterRoles: ['Kasir', 'Store Manager', 'Staf Gudang'],
    categories: [
      { id: 'pos', label: 'Kasir & EDC', team: 'IT Support', icon: '💳' },
      { id: 'display', label: 'Display & Visual', team: 'Merchandising', icon: '🛍️' },
      { id: 'stock', label: 'Stok & Gudang', team: 'Inventory', icon: '📦' },
      { id: 'security', label: 'Keamanan / CCTV', team: 'Security', icon: '🎥' },
    ],
    examples: { P1: 'Semua kasir mati / ancaman keamanan', P2: 'Satu area transaksi terganggu', P3: 'Perangkat bermasalah, ada alternatif', P4: 'Permintaan rutin & perapihan' },
  },
  facility: {
    id: 'facility', name: 'FacilityOps', brand: '#7c3aed', unitLabel: 'Gedung',
    units: ['Tower A', 'Tower B', 'Podium'],
    reporterRoles: ['Resepsionis', 'Building Manager', 'Tenant'],
    categories: [
      { id: 'hvac', label: 'AC & Ventilasi', team: 'Teknisi MEP', icon: '❄️' },
      { id: 'elec', label: 'Listrik & Genset', team: 'Teknisi MEP', icon: '⚡' },
      { id: 'clean', label: 'Kebersihan', team: 'Housekeeping', icon: '🧹' },
      { id: 'lift', label: 'Lift & Eskalator', team: 'Vendor Lift', icon: '🛗' },
    ],
    examples: { P1: 'Lift terjebak / listrik padam / bahaya', P2: 'Sistem utama terganggu', P3: 'Gangguan lokal, ada alternatif', P4: 'Permintaan rutin' },
  },
};
export const DEFAULT_WORKSPACE = 'resto';
