// CONFIG: struktur lokasi bertingkat. Tiap node punya induk (parentId). `kind` hanya diisi di node teratas dan
// diwarisi seluruh turunannya. Kind dipakai mesin routing (outlet | head_office | warehouse).
// Lokasi baru ditambahkan pengguna saat membuat tiket (dipilih di bawah induk yang mana).
export const DEFAULT_LOCATIONS = [
  { id: 'head-office', name: 'Head Office', parentId: null, kind: 'head_office' },
  { id: 'operations', name: 'Operations', parentId: null, kind: 'outlet' },
  { id: 'area-1', name: 'Area 1', parentId: 'operations' },
  { id: 'senopati', name: 'Senopati', parentId: 'area-1' },
  { id: 'kemang', name: 'Kemang', parentId: 'area-1' },
  { id: 'area-2', name: 'Area 2', parentId: 'operations' },
  { id: 'pim', name: 'PIM', parentId: 'area-2' },
  { id: 'bsd', name: 'BSD', parentId: 'area-2' },
  { id: 'distribution-center', name: 'Distribution Center', parentId: null, kind: 'warehouse' },
  { id: 'dc-cikarang', name: 'DC Cikarang', parentId: 'distribution-center' },
  { id: 'dc-warehouse', name: 'Warehouse', parentId: 'dc-cikarang' },
  { id: 'dc-fleet', name: 'Fleet', parentId: 'dc-cikarang' },
  { id: 'dc-maintenance', name: 'Maintenance', parentId: 'dc-cikarang' },
];
