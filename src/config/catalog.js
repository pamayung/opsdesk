// CONFIG: klasifikasi Kategori -> Subkategori -> Pertanyaan dinamis.
// Kategori sendiri ada di defaults.js (dan bisa ditambah pengguna). Kategori tanpa subkategori tetap valid.
// Pertanyaan: { id, label, type: text | number | select | yesno, options?, required?, placeholder? }
const Q = {
  gejala: (options) => ({ id: 'gejala', label: 'Gejala', type: 'select', options, required: true }),
  dampak: { id: 'dampak', label: 'Yang terdampak', type: 'select', options: ['1 orang / 1 perangkat', 'Beberapa orang', 'Satu area atau lantai', 'Seluruh lokasi'], required: true },
};
export const SUBCATEGORIES = {
  it: [
    { id: 'pos', name: 'POS / Kasir', questions: [
      { id: 'terminal', label: 'Nomor POS / terminal', type: 'text', placeholder: 'Contoh: POS 1' },
      Q.gejala(['Mati total', 'Lambat / hang', 'Printer struk bermasalah', 'Tidak bisa login']),
      { id: 'alt', label: 'Transaksi masih bisa lewat POS lain?', type: 'yesno' },
    ] },
    { id: 'network', name: 'Jaringan / Internet', questions: [
      Q.gejala(['Tidak ada koneksi', 'Lambat', 'Putus-putus']), Q.dampak,
    ] },
    { id: 'enduser', name: 'Perangkat pengguna (laptop, printer)', questions: [
      { id: 'device', label: 'Jenis perangkat', type: 'select', options: ['Laptop', 'Desktop', 'Printer', 'Lainnya'], required: true },
      { id: 'asset', label: 'Nomor aset', type: 'text', placeholder: 'Optional' },
      { id: 'symptom', label: 'Apa yang terjadi?', type: 'text', required: true },
    ] },
    { id: 'bizapp', name: 'Aplikasi bisnis (SAP dll.)', questions: [
      { id: 'app', label: 'Aplikasi', type: 'select', options: ['SAP', 'Aplikasi HR', 'Aplikasi Finance', 'Lainnya'], required: true },
      { id: 'need', label: 'Akses atau modul yang dibutuhkan', type: 'text', required: true },
      { id: 'error', label: 'Pesan error', type: 'text', placeholder: 'Optional' },
    ] },
    { id: 'wms', name: 'Sistem gudang (WMS)', questions: [
      { id: 'halt', label: 'Operasional gudang berhenti?', type: 'yesno', required: true },
      { id: 'module', label: 'Modul yang bermasalah', type: 'text' },
    ] },
  ],
  peralatan: [
    { id: 'mesin', name: 'Mesin & peralatan operasional', questions: [
      { id: 'unit', label: 'Nama / nomor mesin', type: 'text' },
      { id: 'usable', label: 'Masih bisa dipakai?', type: 'yesno', required: true },
    ] },
    { id: 'forklift', name: 'Forklift & alat berat', questions: [
      { id: 'unit', label: 'Nomor unit', type: 'text', required: true },
      { id: 'usable', label: 'Unit masih bisa dipakai?', type: 'yesno', required: true },
    ] },
  ],
  utilitas: [
    { id: 'ac', name: 'AC & cooling', questions: [
      { id: 'units', label: 'Jumlah unit', type: 'number' },
      { id: 'issue', label: 'Masalah', type: 'select', options: ['Tidak dingin', 'Bocor', 'Bunyi berisik', 'Mati total'], required: true },
    ] },
    { id: 'listrik', name: 'Listrik', questions: [
      { id: 'issue', label: 'Masalah', type: 'select', options: ['Padam', 'Sering turun (MCB)', 'Kabel / stop kontak rusak'], required: true },
    ] },
    { id: 'air', name: 'Air & plumbing', questions: [
      { id: 'issue', label: 'Masalah', type: 'select', options: ['Bocor', 'Mampet', 'Air tidak mengalir'], required: true },
    ] },
  ],
  fasilitas: [
    { id: 'toilet', name: 'Toilet & kebersihan', questions: [
      { id: 'issue', label: 'Masalah', type: 'select', options: ['Bocor', 'Mampet', 'Fasilitas rusak', 'Perlu dibersihkan'], required: true },
    ] },
    { id: 'gedung', name: 'Bangunan & interior', questions: [] },
    { id: 'kantor', name: 'Kebutuhan kantor (kartu nama, ATK)', questions: [
      { id: 'item', label: 'Barang yang diminta', type: 'text', required: true },
      { id: 'qty', label: 'Jumlah', type: 'number' },
    ] },
  ],
  stok: [
    { id: 'stok', name: 'Stock & inventory', questions: [
      { id: 'item', label: 'Nama barang', type: 'text', required: true },
      { id: 'left', label: 'Sisa stok', type: 'text', placeholder: 'Contoh: 2 sleeve' },
    ] },
  ],
  keamanan: [
    { id: 'akses', name: 'CCTV, kunci & akses', questions: [] },
    { id: 'insiden', name: 'Security incident', questions: [
      { id: 'danger', label: 'Ada bahaya bagi orang?', type: 'yesno', required: true },
    ] },
  ],
  hr: [
    { id: 'recruitment', name: 'Recruitment', questions: [
      { id: 'position', label: 'Posisi', type: 'text', required: true },
      { id: 'count', label: 'Jumlah kebutuhan', type: 'number', required: true },
    ] },
    { id: 'payroll', name: 'Payroll', questions: [
      { id: 'period', label: 'Periode gaji', type: 'text', placeholder: 'Contoh: September 2026' },
    ] },
    { id: 'relations', name: 'Employee relations', questions: [] },
    { id: 'dokumen', name: 'Surat & dokumen', questions: [
      { id: 'doc', label: 'Jenis dokumen', type: 'text', required: true },
    ] },
  ],
  keuangan: [
    { id: 'ap', name: 'Invoice vendor (Account Payable)', questions: [
      { id: 'vendor', label: 'Nama vendor', type: 'text', required: true },
      { id: 'invoice', label: 'Nomor invoice', type: 'text' },
    ] },
    { id: 'expense', name: 'Reimbursement (Employee Expense)', questions: [
      { id: 'amount', label: 'Nominal (Rp)', type: 'number', required: true },
    ] },
  ],
  pengadaan: [
    { id: 'it', name: 'Pembelian perangkat IT', questions: [
      { id: 'item', label: 'Barang yang dibeli', type: 'text', required: true },
      { id: 'qty', label: 'Jumlah', type: 'number' },
    ] },
    { id: 'umum', name: 'Pembelian umum', questions: [
      { id: 'item', label: 'Barang yang dibeli', type: 'text', required: true },
      { id: 'qty', label: 'Jumlah', type: 'number' },
    ] },
  ],
  legal: [
    { id: 'kontrak', name: 'Review kontrak', questions: [
      { id: 'party', label: 'Pihak lawan', type: 'text', required: true },
      { id: 'doc', label: 'Jenis dokumen', type: 'select', options: ['Kontrak vendor', 'Sewa', 'Kerja sama', 'Lainnya'] },
    ] },
  ],
};
export const subsOf = (categoryId) => SUBCATEGORIES[categoryId] || [];
export const subOf = (categoryId, subId) => subsOf(categoryId).find((s) => s.id === subId) || null;
