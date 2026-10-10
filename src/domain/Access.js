// DOMAIN: siapa boleh MENANGANI tiket (Take, Assign, Resolve, Escalate).
// Siapa boleh MELIHAT tiket tidak dihitung di klien: server hanya mengirim tiket yang boleh dilihat pengguna (Row Level Security).
// Fungsi ini hanya petunjuk tampilan (menampilkan tombol); penegakan sebenarnya di server.
export const canHandle = (u) => !!u && (u.role === 'pic' || u.role === 'manager');
