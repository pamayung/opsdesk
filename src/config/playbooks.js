// CONFIG: panduan penanganan per kategori. Dipakai halaman detail tiket untuk
// checklist penutupan, aksi cepat, daftar penyebab, dan tujuan eskalasi vendor.
// Kategori buatan pengguna (tidak terdaftar di sini) memakai DEFAULT_PLAYBOOK.
export const DEFAULT_PLAYBOOK = {
  team: 'Tim Operasional',
  vendor: 'Vendor terkait',
  actions: [],
  checklist: [
    { id: 'selesai', title: 'Masalah sudah teratasi', hint: 'Kondisi sudah dicek langsung di lokasi.' },
    { id: 'aman', title: 'Area dan peralatan aman digunakan', hint: 'Tidak ada bahaya bagi staf maupun tamu.' },
    { id: 'konfirmasi', title: 'Pelapor sudah dikonfirmasi', hint: 'Pelapor menyatakan pekerjaan sudah bisa berjalan normal.' },
  ],
  causes: ['Komponen rusak (diganti)', 'Aus karena pemakaian', 'Salah penggunaan (sudah diedukasi)', 'Perlu perawatan rutin', 'Lainnya'],
};

export const PLAYBOOKS = {
  it: {
    team: 'IT Support', vendor: 'Vendor IT / Hardware (Garansi)',
    actions: ['Reset port & power switch POE', 'Buka jalur remote IT (AnyDesk)'],
    checklist: [
      { id: 'menyala', title: 'Perangkat sudah menyala normal', hint: 'Layar responsif, aplikasi bisa dibuka dan login berhasil.' },
      { id: 'uji', title: 'Fungsi utama berhasil diuji', hint: 'Coba satu transaksi atau cetak uji (struk, printer, jaringan) sampai berhasil.' },
      { id: 'sinkron', title: 'Data tertunda sudah tersinkronisasi', hint: 'Data yang tertahan saat gangguan sudah terkirim ke pusat.' },
    ],
    causes: ['Kabel power / adaptor rusak (diganti baru)', 'Perangkat rusak (diganti unit cadangan)', 'Gangguan jaringan / switch', 'Error aplikasi / konfigurasi', 'Salah penggunaan (sudah diedukasi)', 'Lainnya'],
  },
  utilitas: {
    team: 'Teknisi MEP', vendor: 'Kontraktor MEP',
    actions: ['Cek MCB & panel utama', 'Ukur suhu ruang / chiller'],
    checklist: [
      { id: 'normal', title: 'Listrik, air, atau AC sudah normal', hint: 'Suhu, tekanan, atau arus sudah sesuai standar.' },
      { id: 'bocor', title: 'Tidak ada kebocoran atau bau terbakar', hint: 'Periksa sambungan, kabel, dan area sekitar unit.' },
      { id: 'kering', title: 'Area kering dan aman dilewati', hint: 'Tidak ada genangan atau kabel terbuka.' },
    ],
    causes: ['Komponen aus (diganti)', 'Kabel / instalasi bermasalah', 'Filter atau saluran kotor (dibersihkan)', 'Beban melebihi kapasitas', 'Lainnya'],
  },
  peralatan: {
    team: 'Teknisi MEP', vendor: 'Vendor Mesin (Garansi)',
    actions: ['Matikan & cabut daya mesin', 'Catat nomor seri mesin'],
    checklist: [
      { id: 'jalan', title: 'Mesin menyala dan berjalan normal', hint: 'Tidak ada bunyi, getaran, atau bau tidak wajar.' },
      { id: 'uji', title: 'Uji coba satu siklus sesuai standar', hint: 'Hasil uji sesuai standar operasional.' },
      { id: 'pengaman', title: 'Pengaman dan bagian bergerak berfungsi', hint: 'Penutup, sensor, dan tombol darurat sudah dicek.' },
    ],
    causes: ['Komponen aus (diganti)', 'Perlu kalibrasi / setelan ulang', 'Belum perawatan rutin', 'Salah penggunaan (sudah diedukasi)', 'Lainnya'],
  },
  fasilitas: {
    team: 'Fasilitas', vendor: 'Vendor Fasilitas',
    actions: ['Pasang tanda peringatan area'],
    checklist: [
      { id: 'fungsi', title: 'Perbaikan selesai dan berfungsi', hint: 'Sudah dicoba langsung setelah perbaikan.' },
      { id: 'bersih', title: 'Area sudah dibersihkan', hint: 'Sisa material dan sampah pekerjaan sudah dibuang.' },
      { id: 'konfirmasi', title: 'Pelapor sudah dikonfirmasi', hint: 'Pelapor menyatakan masalah sudah selesai.' },
    ],
    causes: ['Komponen rusak (diganti)', 'Aus karena pemakaian', 'Perlu pembersihan / perawatan', 'Lainnya'],
  },
  stok: {
    team: 'Inventory', vendor: 'Supplier',
    actions: ['Cek stok cabang terdekat', 'Buat permintaan ke gudang pusat'],
    checklist: [
      { id: 'diterima', title: 'Stok sudah diterima atau dipenuhi', hint: 'Barang sudah ada di lokasi penyimpanan.' },
      { id: 'cocok', title: 'Jumlah fisik cocok dengan catatan', hint: 'Hitung ulang dan samakan dengan data stok.' },
      { id: 'simpan', title: 'Bahan disimpan sesuai standar', hint: 'Suhu dan penempatan sudah benar.' },
    ],
    causes: ['Pemakaian lebih tinggi dari perkiraan', 'Pengiriman terlambat', 'Salah hitung stok', 'Lainnya'],
  },
  keamanan: {
    team: 'Keamanan', vendor: 'Vendor Keamanan',
    actions: ['Hubungi petugas keamanan', 'Amankan area'],
    checklist: [
      { id: 'terkunci', title: 'Pintu atau area sudah aman dan terkunci', hint: 'Sudah dicoba dikunci dan dibuka ulang.' },
      { id: 'bahaya', title: 'Tidak ada bahaya bagi orang di area', hint: 'Staf dan tamu sudah dipastikan aman.' },
      { id: 'jaga', title: 'Petugas jaga sudah diberi tahu', hint: 'Petugas shift berjalan tahu kondisi terbaru.' },
    ],
    causes: ['Kunci / perangkat keamanan rusak', 'Prosedur tidak diikuti', 'Gangguan pihak luar', 'Lainnya'],
  },
  hr: {
    team: 'HR Service', vendor: 'Vendor Payroll / BPJS',
    actions: ['Minta dokumen pendukung dari karyawan'],
    checklist: [
      { id: 'diproses', title: 'Permintaan sudah diproses', hint: 'Data atau dokumen sudah diperbarui di sistem HR.' },
      { id: 'dikonfirmasi', title: 'Karyawan sudah dikonfirmasi', hint: 'Karyawan menyatakan permintaannya sudah terpenuhi.' },
      { id: 'arsip', title: 'Dokumen sudah diarsipkan', hint: 'Salinan tersimpan di arsip HR.' },
    ],
    causes: ['Data belum lengkap (dilengkapi)', 'Kesalahan input (dikoreksi)', 'Menunggu dokumen karyawan', 'Kebijakan dijelaskan ke karyawan', 'Lainnya'],
  },
  keuangan: {
    team: 'Finance Desk', vendor: 'Vendor / Supplier terkait',
    actions: ['Minta bukti transaksi atau invoice'],
    checklist: [
      { id: 'diproses', title: 'Transaksi sudah diproses', hint: 'Pembayaran, klaim, atau pengadaan sudah dieksekusi.' },
      { id: 'cocok', title: 'Nominal dan dokumen sudah cocok', hint: 'Invoice, PO, dan bukti bayar konsisten.' },
      { id: 'dikonfirmasi', title: 'Pemohon sudah dikonfirmasi', hint: 'Pemohon menyatakan urusannya selesai.' },
    ],
    causes: ['Dokumen belum lengkap (dilengkapi)', 'Kesalahan input (dikoreksi)', 'Menunggu approval', 'Keterlambatan vendor', 'Lainnya'],
  },
};
export const getPlaybook = (categoryId) => PLAYBOOKS[categoryId] || DEFAULT_PLAYBOOK;
