// CONFIG: label peran. Pengguna dan peran sebenarnya datang dari server (login); di sini hanya teks tampilan.
// employee   : melaporkan dan memantau tiketnya sendiri
// pic        : menangani tiket yang masuk ke tim-nya atau yang ditugaskan kepadanya
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
