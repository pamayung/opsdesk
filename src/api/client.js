import { createOperations } from "./generated.js";
/** Galat dari API: bentuk seragam {error:{code,message,details,request_id}} diubah menjadi satu kelas. */
export class ApiError extends Error {
    status;
    code;
    details;
    requestId;
    constructor(status, code, message, details = [], requestId) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.requestId = requestId;
        this.name = "ApiError";
    }
    /** Pesan per kolom, siap dipasang di form: { title: "minimal 5 karakter" }. */
    get fields() {
        return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
    }
}
export const isApiError = (e, code) => e instanceof ApiError && (code === undefined || e.code === code);
export class MemoryTokenStorage {
    s = null;
    get() { return this.s; }
    set(s) { this.s = s; }
}
/** Menyimpan sesi di localStorage/sessionStorage (dipakai bersama antar-tab). */
export function webStorageTokenStorage(storage, key = "opsdesk:session") {
    return {
        get() { try {
            const v = storage.getItem(key);
            return v ? JSON.parse(v) : null;
        }
        catch {
            return null;
        } },
        set(s) { try {
            s ? storage.setItem(key, JSON.stringify(s)) : storage.removeItem(key);
        }
        catch { /* penyimpanan penuh/dinonaktifkan */ } },
    };
}
const RETRYABLE = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** crypto.randomUUID hanya ada di secure context (HTTPS/localhost); akses lewat http://IP-LAN tidak punya, jadi ada cadangan. */
function newKey() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
export class OpsDeskClient {
    opts;
    /** Seluruh operasi API bertipe (dibangkitkan dari OpenAPI); autentikasi dan refresh token ditangani otomatis. */
    api;
    raw; // tanpa logika refresh: dipakai untuk login/refresh itu sendiri
    base;
    doFetch;
    store;
    refreshing = null;
    constructor(opts) {
        this.opts = opts;
        this.base = opts.baseUrl.replace(/\/+$/, "");
        this.doFetch = opts.fetch ?? ((...a) => fetch(...a));
        this.store = opts.storage ?? new MemoryTokenStorage();
        this.api = createOperations(this.call);
        this.raw = createOperations(this.rawCall);
    }
    get session() { return this.store.get(); }
    async login(email, password) {
        const s = await this.raw.login({ email, password });
        this.store.set(s);
        return s.user;
    }
    async logout() {
        const s = this.store.get();
        this.store.set(null);
        if (s) {
            try {
                await this.raw.logout({ refresh_token: s.refresh_token });
            }
            catch { /* sesi lokal sudah dihapus */ }
        }
    }
    /**
     * Membuat tiket dengan Idempotency-Key otomatis. Bila jaringan putus setelah server memproses (respons hilang), permintaan diulang dengan
     * kunci yang sama sehingga tiket yang sama dikembalikan, bukan tiket ganda. Berikan idempotencyKey sendiri (mis. disimpan di draf form)
     * agar ketukan ulang dari layar yang sama juga aman.
     */
    async createTicket(body, opts = {}) {
        const key = opts.idempotencyKey ?? newKey();
        const retries = opts.retries ?? 2;
        for (let attempt = 0;; attempt++) {
            try {
                return await this.api.createTicket(body, { idempotencyKey: key });
            }
            catch (e) {
                const transient = e instanceof TypeError || (e instanceof ApiError && RETRYABLE.has(e.status));
                if (!transient || attempt >= retries)
                    throw e;
                await sleep(300 * (attempt + 1));
            }
        }
    }
    /** Unggah foto lalu lampirkan pada catatan (dua langkah API dalam satu panggilan). */
    async addNoteWithPhoto(ticketId, body, photo, filename) {
        const up = await this.api.uploadTicketAttachment(ticketId, photo, filename);
        return this.api.addTicketNote(ticketId, { body, attachment: { storage_key: up.storage_key } });
    }
    /** URL absolut lampiran untuk <img src>: bertanda tangan dan berumur pendek, jadi tidak butuh header Authorization. */
    attachmentSrc(a) { return this.base + a.url; }
    // ---------------- inti ----------------
    call = async (spec) => {
        if (spec.auth)
            await this.ensureFresh();
        try {
            return await this.send(spec);
        }
        catch (e) {
            // token kedaluwarsa: perpanjang sekali (bersama untuk semua permintaan yang gagal bersamaan) lalu ulangi
            if (spec.auth && isApiError(e, "token_expired") && this.store.get()) {
                await this.refresh();
                return this.send(spec);
            }
            throw e;
        }
    };
    rawCall = (spec) => this.send(spec);
    /** Memperpanjang lebih awal bila token akan habis dalam 10 detik (menghindari satu permintaan gagal). */
    async ensureFresh() {
        const s = this.store.get();
        if (s && (this.opts.refreshSkewMs ?? 10_000) > 0 && new Date(s.expires_at).getTime() - Date.now() < (this.opts.refreshSkewMs ?? 10_000))
            await this.refresh();
    }
    /**
     * Refresh token DIROTASI server: memakai token lama dua kali dianggap pencurian dan mencabut seluruh sesi. Karena itu perpanjangan
     * dilakukan satu per satu: (1) satu penerbangan per klien, (2) di antara tab dikunci lewat Web Locks bila tersedia, dan sesi
     * dibaca ulang di dalam kunci (tab lain mungkin sudah memperpanjang).
     */
    refresh() {
        if (this.refreshing)
            return this.refreshing;
        const used = this.store.get()?.refresh_token;
        const run = async () => {
            const current = this.store.get();
            if (!current)
                throw new ApiError(401, "missing_token", "Belum login.");
            if (current.refresh_token !== used)
                return; // tab lain sudah memperpanjang
            try {
                this.store.set(await this.raw.refresh({ refresh_token: current.refresh_token }));
            }
            catch (e) {
                if (isApiError(e) && e.status === 401) {
                    this.store.set(null);
                    this.opts.onSessionExpired?.();
                }
                throw e;
            }
        };
        const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
        const p = (locks ? locks.request("opsdesk-refresh", run) : run()).finally(() => { this.refreshing = null; });
        this.refreshing = p;
        return p;
    }
    async send(spec) {
        let url = this.base + spec.path;
        if (spec.query) {
            const q = new URLSearchParams();
            for (const [k, v] of Object.entries(spec.query))
                if (v !== undefined && v !== null && v !== "")
                    q.set(k, String(v));
            if (q.size)
                url += "?" + q.toString();
        }
        const headers = { Accept: "application/json", ...spec.headers };
        const init = { method: spec.method, headers };
        if (spec.body !== undefined) {
            headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(spec.body);
        }
        if (spec.form)
            init.body = spec.form; // Content-Type multipart diisi fetch (beserta boundary)
        const token = this.store.get()?.access_token;
        if (spec.auth && token)
            headers["Authorization"] = "Bearer " + token;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 30_000);
        let res;
        try {
            res = await this.doFetch(url, { ...init, signal: ctrl.signal });
        }
        finally {
            clearTimeout(timer);
        }
        if (!res.ok) {
            let body = {};
            try {
                body = await res.json();
            }
            catch { /* bukan JSON (mis. gateway) */ }
            const e = body.error;
            throw new ApiError(res.status, e?.code ?? `http_${res.status}`, e?.message ?? res.statusText, e?.details, e?.request_id ?? res.headers.get("X-Request-ID") ?? undefined);
        }
        if (res.status === 204 || spec.kind === "none")
            return undefined;
        if (spec.kind === "blob")
            return (await res.blob());
        const json = await res.json();
        if (spec.kind === "data")
            return json.data;
        if (spec.kind === "paged")
            return { data: json.data, meta: json.meta };
        return json;
    }
}
