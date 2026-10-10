// Satu klien API untuk seluruh aplikasi. Sesi (access + refresh token) disimpan di localStorage dan dibagi antar-tab.
// VITE_API_URL kosong = origin yang sama (dev: proxy Vite meneruskan /api ke backend); isi untuk hosting terpisah, mis. https://api.contoh.id
import { OpsDeskClient, webStorageTokenStorage, isApiError } from './index.js';

export const SESSION_EXPIRED = 'opsdesk:session-expired';
export const client = new OpsDeskClient({
  baseUrl: import.meta.env.VITE_API_URL || '',
  storage: webStorageTokenStorage(window.localStorage, 'opsdesk:session'),
  onSessionExpired: () => window.dispatchEvent(new Event(SESSION_EXPIRED)),
});
export const api = client.api;
export { isApiError };

// Foto dari readImage berupa data URL; API menerima berkas multipart.
export const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();
