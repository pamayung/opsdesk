// CONFIG: mesin routing. Ubah aturan di sini tanpa menyentuh UI atau domain.
// Alur: kategori + subkategori + jenis + LOKASI + prioritas -> aturan pertama yang cocok -> tim -> (jam kerja) -> PIC.
// Lokasi ikut menentukan tim (jenis lokasi) DAN PIC (cakupan area anggota tim).
export const DEPARTMENTS = {
  it: { name: 'IT', head: 'Andri Wijaya' },
  hr: { name: 'HR', head: 'Maya Kusuma' },
  ga: { name: 'GA & Facility', head: 'Hasan Basri' },
  finance: { name: 'Finance', head: 'Tania Lestari' },
  procurement: { name: 'Procurement', head: 'Yusuf Rahman' },
  legal: { name: 'Legal', head: 'Adrian Kusumo' },
  security: { name: 'Security', head: 'Anto Susilo' },
  ops: { name: 'Operations', head: 'Lina Hartati' },
};

// hours: null = 24 jam. Selain itu { days: [1..7 (Sen..Min)], from: 'HH:mm', to: 'HH:mm' } dalam WIB.
// onCall: tim pengganti bila di luar jam kerja.
// members[].available = ketersediaan saat ini. members[].scope = id lokasi yang dicakup (termasuk turunannya);
// tanpa scope = mencakup semua lokasi. external = vendor / pihak luar.
const OFFICE = { days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00' };
const OUTLET = { days: [1, 2, 3, 4, 5, 6, 7], from: '07:00', to: '22:00' };
const DC = { days: [1, 2, 3, 4, 5, 6, 7], from: '06:00', to: '22:00' };
const m = (id, name, extra = {}) => ({ id, name, available: true, ...extra });
export const TEAMS = {
  // --- IT
  it_area: { name: 'IT Support Area', department: 'it', hours: OUTLET, onCall: 'it_oncall', lead: 'Kevin Mahendra', members: [m('kevin', 'Kevin Mahendra', { scope: ['area-1'] }), m('budi', 'Budi Santoso', { scope: ['area-2'] })] },
  it_helpdesk: { name: 'IT Helpdesk', department: 'it', hours: OFFICE, onCall: 'it_oncall', lead: 'Niko Pratama', members: [m('niko', 'Niko Pratama'), m('rara', 'Rara Anjani')] },
  it_infra: { name: 'IT Infrastructure', department: 'it', hours: DC, onCall: 'it_oncall', lead: 'Gilang Saputra', members: [m('gilang', 'Gilang Saputra'), m('wulan', 'Wulan Sari')] },
  it_bizapp: { name: 'SAP Support', department: 'it', hours: OFFICE, onCall: 'it_oncall', lead: 'Dimas Wibowo', members: [m('dimas', 'Dimas Wibowo'), m('lia', 'Lia Anggraini')] },
  it_wms: { name: 'WMS Support', department: 'it', hours: DC, onCall: 'it_oncall', lead: 'Yudi Hartono', members: [m('yudi', 'Yudi Hartono')] },
  it_oncall: { name: 'IT On-Call', department: 'it', hours: null, lead: 'Fajri Ramadhan', members: [m('fajri', 'Fajri Ramadhan')] },
  // --- HR
  hr_recruit: { name: 'HR Recruitment', department: 'hr', hours: OFFICE, onCall: 'service_desk', lead: 'Rani Oktaviani', members: [m('rani', 'Rani Oktaviani')] },
  hr_payroll: { name: 'HR Payroll', department: 'hr', hours: OFFICE, onCall: 'service_desk', lead: 'Bagas Pratama', members: [m('bagas', 'Bagas Pratama')] },
  hr_relations: { name: 'Employee Relations', department: 'hr', hours: OFFICE, onCall: 'service_desk', lead: 'Sinta Dewi', members: [m('sinta', 'Sinta Dewi')] },
  hr_service: { name: 'HR Service', department: 'hr', hours: OFFICE, onCall: 'service_desk', lead: 'Maya Kusuma', members: [m('maya', 'Maya Kusuma')] },
  // --- GA & Facility
  ga_facility: { name: 'Facility', department: 'ga', hours: { days: [1, 2, 3, 4, 5, 6], from: '07:00', to: '18:00' }, onCall: 'ga_engineering', lead: 'Sri Wahyuni', members: [m('sri', 'Sri Wahyuni', { scope: ['area-1', 'head-office'] }), m('wawan', 'Wawan Setiawan', { scope: ['area-2', 'distribution-center'] })] },
  ga_general: { name: 'General Affair', department: 'ga', hours: OFFICE, onCall: 'service_desk', lead: 'Ratna Sari', members: [m('ratna', 'Ratna Sari'), m('iwan', 'Iwan Kurnia')] },
  ga_engineering: { name: 'Engineering', department: 'ga', hours: OUTLET, onCall: 'ga_oncall', lead: 'Hasan Basri', members: [m('dewi', 'Dewi Lestari'), m('agus', 'Agus Pratama', { available: false })] },
  ga_oncall: { name: 'Engineering On-Call', department: 'ga', hours: null, lead: 'Hasan Basri', members: [m('joko', 'Joko Widodo')] },
  vendor_ac: { name: 'Vendor AC & Cooling', department: 'ga', external: true, hours: { days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '18:00' }, onCall: 'ga_oncall', lead: 'Hasan Basri', members: [m('anton', 'CV Dingin Jaya (Pak Anton)')] },
  dc_maintenance: { name: 'DC Maintenance', department: 'ga', hours: DC, onCall: 'ga_oncall', lead: 'Rudi Hermawan', members: [m('bambang', 'Bambang Susilo'), m('joko2', 'Joko Sutrisno')] },
  // --- Finance, Procurement, Legal
  fin_ap: { name: 'Account Payable', department: 'finance', hours: OFFICE, onCall: 'service_desk', lead: 'Ayu Lestari', members: [m('ayu', 'Ayu Lestari')] },
  fin_expense: { name: 'Employee Expense', department: 'finance', hours: OFFICE, onCall: 'service_desk', lead: 'Tania Lestari', members: [m('tania', 'Tania Lestari')] },
  proc_it: { name: 'IT Procurement', department: 'procurement', hours: OFFICE, onCall: 'service_desk', lead: 'Farhan Aziz', members: [m('farhan', 'Farhan Aziz')] },
  proc_general: { name: 'Purchasing', department: 'procurement', hours: OFFICE, onCall: 'service_desk', lead: 'Yusuf Rahman', members: [m('yusuf', 'Yusuf Rahman'), m('lala', 'Lala Kurnia')] },
  legal_contract: { name: 'Contract Management', department: 'legal', hours: OFFICE, onCall: 'service_desk', lead: 'Adrian Kusumo', members: [m('melinda', 'Melinda Putri')] },
  // --- Security & Operations
  security: { name: 'Security Desk', department: 'security', hours: null, lead: 'Anto Susilo', members: [m('anto', 'Anto Susilo'), m('wahyu', 'Wahyu Hidayat')] },
  inventory: { name: 'Inventory Outlet', department: 'ops', hours: OUTLET, onCall: 'service_desk', lead: 'Bayu Nugroho', members: [m('bayu', 'Bayu Nugroho')] },
  warehouse: { name: 'Warehouse Control', department: 'ops', hours: DC, onCall: 'service_desk', lead: 'Rudi Hermawan', members: [m('eko', 'Eko Saputra'), m('dimas2', 'Dimas Aditya')] },
  service_desk: { name: 'Service Desk', department: 'ops', hours: null, lead: 'Lina Hartati', members: [m('lina', 'Lina Hartati'), m('dodi', 'Dodi Firmansyah')] },
};

// Aturan dicek dari atas ke bawah, yang pertama cocok menang. Kondisi yang tidak diisi = cocok semua.
// Kondisi boleh berupa nilai tunggal atau daftar. kind = jenis lokasi, sub = subkategori, type = jenis kebutuhan.
export const ROUTING_RULES = [
  { id: 'complaint', type: 'complaint', team: 'service_desk' },
  // IT: masalah yang sama, PIC berbeda menurut lokasi
  { id: 'it-pos', category: 'it', sub: 'pos', team: 'it_area' },
  { id: 'it-network-outlet', category: 'it', sub: 'network', kind: 'outlet', team: 'it_area' },
  { id: 'it-network-ho', category: 'it', sub: 'network', kind: 'head_office', team: 'it_helpdesk' },
  { id: 'it-network-dc', category: 'it', sub: 'network', kind: 'warehouse', team: 'it_infra' },
  { id: 'it-enduser', category: 'it', sub: 'enduser', team: 'it_helpdesk' },
  { id: 'it-application', category: 'it', sub: 'bizapp', team: 'it_bizapp' },
  { id: 'it-wms', category: 'it', sub: 'wms', team: 'it_wms' },
  { id: 'it-outlet', category: 'it', kind: 'outlet', team: 'it_area' },
  { id: 'it-ho', category: 'it', kind: 'head_office', team: 'it_helpdesk' },
  { id: 'it-dc', category: 'it', kind: 'warehouse', team: 'it_infra' },
  // GA & Facility
  { id: 'ac-vendor', category: 'utilitas', sub: 'ac', team: 'vendor_ac' },
  { id: 'utilities', category: 'utilitas', team: 'ga_engineering' },
  { id: 'forklift', category: 'peralatan', sub: 'forklift', team: 'dc_maintenance' },
  { id: 'equipment-dc', category: 'peralatan', kind: 'warehouse', team: 'dc_maintenance' },
  { id: 'equipment', category: 'peralatan', team: 'ga_engineering' },
  { id: 'office-supplies', category: 'fasilitas', sub: 'kantor', team: 'ga_general' },
  { id: 'facility', category: 'fasilitas', team: 'ga_facility' },
  { id: 'security', category: 'keamanan', team: 'security' },
  // Operations
  { id: 'stock-dc', category: 'stok', kind: 'warehouse', team: 'warehouse' },
  { id: 'stock-outlet', category: 'stok', team: 'inventory' },
  // HR, Finance, Procurement, Legal
  { id: 'hr-recruitment', category: 'hr', sub: 'recruitment', team: 'hr_recruit' },
  { id: 'hr-payroll', category: 'hr', sub: 'payroll', team: 'hr_payroll' },
  { id: 'hr-relations', category: 'hr', sub: 'relations', team: 'hr_relations' },
  { id: 'hr', category: 'hr', team: 'hr_service' },
  { id: 'finance-ap', category: 'keuangan', sub: 'ap', team: 'fin_ap' },
  { id: 'finance', category: 'keuangan', team: 'fin_expense' },
  { id: 'procurement-it', category: 'pengadaan', sub: 'it', team: 'proc_it' },
  { id: 'procurement', category: 'pengadaan', team: 'proc_general' },
  { id: 'legal', category: 'legal', team: 'legal_contract' },
  { id: 'default', team: 'service_desk' }, // kategori baru / tidak dikenal
];
