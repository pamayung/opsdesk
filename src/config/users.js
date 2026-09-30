// CONFIG: peran & pengguna demo. Ganti dengan hasil login saat backend tersedia.
// employee   : melaporkan dan memantau tiketnya sendiri
// pic        : menangani tiket yang masuk ke tim-nya (teamIds) atau yang ditugaskan kepadanya
// manager    : mengelola seluruh tiket di department-nya
// management : melihat seluruh organisasi (hanya baca)
// admin      : mengelola konfigurasi (organisasi, tim, aturan routing, katalog, pengguna); melihat seluruh tiket
export const ROLES = {
  employee: { label: 'Employee' },
  pic: { label: 'PIC' },
  manager: { label: 'Department Manager' },
  management: { label: 'Management' },
  admin: { label: 'Administrator' },
};
export const USERS = [
  { id: 'kevin', name: 'Kevin Mahendra', role: 'pic', title: 'IT Support Area', teamIds: ['it_area', 'it_oncall'] },
  { id: 'citra', name: 'Citra Maharani', role: 'employee', title: 'Staf Kantor', location: 'Head Office' },
  { id: 'rina', name: 'Rina', role: 'employee', title: 'Kasir', location: 'Senopati' },
  { id: 'andri', name: 'Andri Wijaya', role: 'manager', title: 'Head of IT', department: 'it' },
  { id: 'hendra', name: 'Hendra Gunawan', role: 'management', title: 'Direktur Operasional' },
  { id: 'sari', name: 'Sari Administrator', role: 'admin', title: 'System Admin' },
];
export const DEFAULT_USER_ID = 'kevin';
