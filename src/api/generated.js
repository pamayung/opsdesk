// BERKAS HASIL GENERATOR: jangan diedit. Sumber: docs/openapi.json (versi 1.0.0). Perbarui dengan `npm run generate`.
/* eslint-disable */
export function createOperations(call) {
    const enc = (v) => encodeURIComponent(String(v));
    return {
        /** POST /api/v1/admin/categories: Buat kategori */
        adminCreateCategory: (body) => call({ method: "POST", path: `/api/v1/admin/categories`, auth: true, kind: "data", body }),
        /** PATCH /api/v1/admin/categories/{id}: Ubah atau nonaktifkan kategori */
        adminUpdateCategory: (id, body) => call({ method: "PATCH", path: `/api/v1/admin/categories/${enc(id)}`, auth: true, kind: "data", body }),
        /** POST /api/v1/admin/categories/{id}/subcategories: Buat subkategori */
        adminCreateSubcategory: (id, body) => call({ method: "POST", path: `/api/v1/admin/categories/${enc(id)}/subcategories`, auth: true, kind: "data", body }),
        /** POST /api/v1/admin/departments: Buat department */
        adminCreateDepartment: (body) => call({ method: "POST", path: `/api/v1/admin/departments`, auth: true, kind: "data", body }),
        /** PATCH /api/v1/admin/departments/{id}: Ubah department */
        adminUpdateDepartment: (id, body) => call({ method: "PATCH", path: `/api/v1/admin/departments/${enc(id)}`, auth: true, kind: "data", body }),
        /** POST /api/v1/admin/locations: Buat lokasi */
        adminCreateLocation: (body) => call({ method: "POST", path: `/api/v1/admin/locations`, auth: true, kind: "data", body }),
        /** DELETE /api/v1/admin/locations/{id}: Hapus lokasi */
        adminDeleteLocation: (id) => call({ method: "DELETE", path: `/api/v1/admin/locations/${enc(id)}`, auth: true, kind: "none" }),
        /** PATCH /api/v1/admin/locations/{id}: Ubah atau pindahkan lokasi */
        adminUpdateLocation: (id, body) => call({ method: "PATCH", path: `/api/v1/admin/locations/${enc(id)}`, auth: true, kind: "data", body }),
        /** DELETE /api/v1/admin/questions/{id}: Hapus pertanyaan */
        adminDeleteQuestion: (id) => call({ method: "DELETE", path: `/api/v1/admin/questions/${enc(id)}`, auth: true, kind: "none" }),
        /** PUT /api/v1/admin/questions/{id}: Ubah pertanyaan */
        adminUpdateQuestion: (id, body) => call({ method: "PUT", path: `/api/v1/admin/questions/${enc(id)}`, auth: true, kind: "data", body }),
        /** GET /api/v1/admin/routing-rules: Daftar aturan routing berurutan */
        adminListRoutingRules: () => call({ method: "GET", path: `/api/v1/admin/routing-rules`, auth: true, kind: "data" }),
        /** POST /api/v1/admin/routing-rules: Buat aturan routing */
        adminCreateRoutingRule: (body) => call({ method: "POST", path: `/api/v1/admin/routing-rules`, auth: true, kind: "data", body }),
        /** PUT /api/v1/admin/routing-rules/order: Urutkan ulang aturan non-default */
        adminReorderRoutingRules: (body) => call({ method: "PUT", path: `/api/v1/admin/routing-rules/order`, auth: true, kind: "data", body }),
        /** DELETE /api/v1/admin/routing-rules/{id}: Hapus aturan routing */
        adminDeleteRoutingRule: (id) => call({ method: "DELETE", path: `/api/v1/admin/routing-rules/${enc(id)}`, auth: true, kind: "none" }),
        /** PUT /api/v1/admin/routing-rules/{id}: Ubah aturan routing */
        adminUpdateRoutingRule: (id, body) => call({ method: "PUT", path: `/api/v1/admin/routing-rules/${enc(id)}`, auth: true, kind: "data", body }),
        /** PUT /api/v1/admin/sla-policies/{priority}: Ubah kebijakan SLA */
        adminUpdateSLAPolicy: (priority, body) => call({ method: "PUT", path: `/api/v1/admin/sla-policies/${enc(priority)}`, auth: true, kind: "data", body }),
        /** PATCH /api/v1/admin/subcategories/{id}: Ubah atau nonaktifkan subkategori */
        adminUpdateSubcategory: (id, body) => call({ method: "PATCH", path: `/api/v1/admin/subcategories/${enc(id)}`, auth: true, kind: "data", body }),
        /** POST /api/v1/admin/subcategories/{id}/questions: Buat pertanyaan dinamis */
        adminCreateQuestion: (id, body) => call({ method: "POST", path: `/api/v1/admin/subcategories/${enc(id)}/questions`, auth: true, kind: "data", body }),
        /** PUT /api/v1/admin/subcategories/{id}/questions/order: Urutkan ulang pertanyaan */
        adminReorderQuestions: (id, body) => call({ method: "PUT", path: `/api/v1/admin/subcategories/${enc(id)}/questions/order`, auth: true, kind: "none", body }),
        /** GET /api/v1/admin/teams: Daftar tim beserta jam kerja dan anggota */
        adminListTeams: () => call({ method: "GET", path: `/api/v1/admin/teams`, auth: true, kind: "data" }),
        /** POST /api/v1/admin/teams: Buat tim */
        adminCreateTeam: (body) => call({ method: "POST", path: `/api/v1/admin/teams`, auth: true, kind: "data", body }),
        /** GET /api/v1/admin/teams/{id}: Detail tim */
        adminGetTeam: (id) => call({ method: "GET", path: `/api/v1/admin/teams/${enc(id)}`, auth: true, kind: "data" }),
        /** PATCH /api/v1/admin/teams/{id}: Ubah tim */
        adminUpdateTeam: (id, body) => call({ method: "PATCH", path: `/api/v1/admin/teams/${enc(id)}`, auth: true, kind: "data", body }),
        /** POST /api/v1/admin/teams/{id}/members: Tambah anggota */
        adminAddTeamMember: (id, body) => call({ method: "POST", path: `/api/v1/admin/teams/${enc(id)}/members`, auth: true, kind: "data", body }),
        /** DELETE /api/v1/admin/teams/{id}/members/{userId}: Keluarkan anggota */
        adminRemoveTeamMember: (id, userId) => call({ method: "DELETE", path: `/api/v1/admin/teams/${enc(id)}/members/${enc(userId)}`, auth: true, kind: "data" }),
        /** PATCH /api/v1/admin/teams/{id}/members/{userId}: Ubah ketersediaan anggota */
        adminSetMemberAvailability: (id, userId, body) => call({ method: "PATCH", path: `/api/v1/admin/teams/${enc(id)}/members/${enc(userId)}`, auth: true, kind: "data", body }),
        /** PUT /api/v1/admin/teams/{id}/members/{userId}/scopes: Ganti area scope anggota */
        adminSetMemberScopes: (id, userId, body) => call({ method: "PUT", path: `/api/v1/admin/teams/${enc(id)}/members/${enc(userId)}/scopes`, auth: true, kind: "data", body }),
        /** PUT /api/v1/admin/teams/{id}/working-hours: Ganti seluruh jam kerja tim */
        adminSetWorkingHours: (id, body) => call({ method: "PUT", path: `/api/v1/admin/teams/${enc(id)}/working-hours`, auth: true, kind: "data", body }),
        /** GET /api/v1/admin/users: Daftar pengguna */
        adminListUsers: () => call({ method: "GET", path: `/api/v1/admin/users`, auth: true, kind: "data" }),
        /** POST /api/v1/admin/users: Buat pengguna */
        adminCreateUser: (body) => call({ method: "POST", path: `/api/v1/admin/users`, auth: true, kind: "data", body }),
        /** PATCH /api/v1/admin/users/{id}: Ubah pengguna */
        adminUpdateUser: (id, body) => call({ method: "PATCH", path: `/api/v1/admin/users/${enc(id)}`, auth: true, kind: "data", body }),
        /** PUT /api/v1/admin/users/{id}/password: Reset kata sandi */
        adminSetUserPassword: (id, body) => call({ method: "PUT", path: `/api/v1/admin/users/${enc(id)}/password`, auth: true, kind: "none", body }),
        /** GET /api/v1/attachments/{id}: Ambil berkas lampiran */
        getAttachment: (id, query) => call({ method: "GET", path: `/api/v1/attachments/${enc(id)}`, auth: true, kind: "blob", query }),
        /** POST /api/v1/auth/forgot-password (publik): Lupa kata sandi */
        forgotPassword: (body) => call({ method: "POST", path: `/api/v1/auth/forgot-password`, auth: false, kind: "data", body }),
        /** POST /api/v1/auth/login (publik): Login */
        login: (body) => call({ method: "POST", path: `/api/v1/auth/login`, auth: false, kind: "data", body }),
        /** POST /api/v1/auth/logout (publik): Logout (cabut refresh token) */
        logout: (body) => call({ method: "POST", path: `/api/v1/auth/logout`, auth: false, kind: "none", body }),
        /** GET /api/v1/auth/me: Profil pengguna yang login */
        me: () => call({ method: "GET", path: `/api/v1/auth/me`, auth: true, kind: "data" }),
        /** POST /api/v1/auth/password: Ganti kata sandi sendiri */
        changePassword: (body) => call({ method: "POST", path: `/api/v1/auth/password`, auth: true, kind: "none", body }),
        /** POST /api/v1/auth/refresh (publik): Tukar refresh token */
        refresh: (body) => call({ method: "POST", path: `/api/v1/auth/refresh`, auth: false, kind: "data", body }),
        /** POST /api/v1/auth/reset-password (publik): Atur ulang kata sandi dengan token dari email */
        resetPassword: (body) => call({ method: "POST", path: `/api/v1/auth/reset-password`, auth: false, kind: "none", body }),
        /** GET /api/v1/dashboard: Ringkasan dashboard */
        getDashboard: () => call({ method: "GET", path: `/api/v1/dashboard`, auth: true, kind: "data" }),
        /** GET /api/v1/reference: Data referensi untuk form dan filter */
        getReference: () => call({ method: "GET", path: `/api/v1/reference`, auth: true, kind: "data" }),
        /** GET /api/v1/reports/aging: Umur tiket terbuka */
        reportAging: (query) => call({ method: "GET", path: `/api/v1/reports/aging`, auth: true, kind: "data", query }),
        /** GET /api/v1/reports/breakdown: Rincian jumlah tiket */
        reportBreakdown: (query) => call({ method: "GET", path: `/api/v1/reports/breakdown`, auth: true, kind: "data", query }),
        /** GET /api/v1/reports/export.csv: Unduh CSV */
        reportExportCSV: (query) => call({ method: "GET", path: `/api/v1/reports/export.csv`, auth: true, kind: "blob", query }),
        /** GET /api/v1/reports/kpis: KPI periode */
        reportKPIs: (query) => call({ method: "GET", path: `/api/v1/reports/kpis`, auth: true, kind: "data", query }),
        /** GET /api/v1/reports/late: Tiket yang melewati SLA */
        reportLate: (query) => call({ method: "GET", path: `/api/v1/reports/late`, auth: true, kind: "data", query }),
        /** GET /api/v1/reports/overview: Ringkasan laporan lengkap */
        reportOverview: (query) => call({ method: "GET", path: `/api/v1/reports/overview`, auth: true, kind: "data", query }),
        /** GET /api/v1/reports/performance: Kinerja per tim, PIC, atau department */
        reportPerformance: (query) => call({ method: "GET", path: `/api/v1/reports/performance`, auth: true, kind: "data", query }),
        /** GET /api/v1/reports/trend: Tren tiket masuk dan selesai */
        reportTrend: (query) => call({ method: "GET", path: `/api/v1/reports/trend`, auth: true, kind: "data", query }),
        /** POST /api/v1/routing/preview: Routing Preview */
        previewRouting: (body) => call({ method: "POST", path: `/api/v1/routing/preview`, auth: true, kind: "data", body }),
        /** GET /api/v1/tickets: Daftar tiket (antrean) */
        listTickets: (query) => call({ method: "GET", path: `/api/v1/tickets`, auth: true, kind: "paged", query }),
        /** POST /api/v1/tickets: Buat tiket (Report Issue) */
        createTicket: (body, opts) => call({ method: "POST", path: `/api/v1/tickets`, auth: true, kind: "data", body, headers: Object.fromEntries([["Idempotency-Key", opts?.idempotencyKey]].filter(([, v]) => v !== undefined)) }),
        /** GET /api/v1/tickets/{id}: Detail tiket */
        getTicket: (id) => call({ method: "GET", path: `/api/v1/tickets/${enc(id)}`, auth: true, kind: "data" }),
        /** POST /api/v1/tickets/{id}/assign: Assign PIC */
        assignTicket: (id, body) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/assign`, auth: true, kind: "data", body }),
        /** POST /api/v1/tickets/{id}/attachments: Unggah foto (langkah 1 melampirkan foto) */
        uploadTicketAttachment: (id, file, filename) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/attachments`, auth: true, kind: "data", form: (() => { const f = new FormData(); f.append("file", file, filename ?? "foto"); return f; })() }),
        /** POST /api/v1/tickets/{id}/escalate-vendor: Escalate to vendor */
        escalateTicketToVendor: (id, body) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/escalate-vendor`, auth: true, kind: "data", body }),
        /** POST /api/v1/tickets/{id}/notes: Tambah catatan */
        addTicketNote: (id, body) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/notes`, auth: true, kind: "data", body }),
        /** POST /api/v1/tickets/{id}/reopen: Buka kembali tiket Resolved */
        reopenTicket: (id, body) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/reopen`, auth: true, kind: "data", body }),
        /** POST /api/v1/tickets/{id}/resolve: Resolve Ticket */
        resolveTicket: (id, body) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/resolve`, auth: true, kind: "data", body }),
        /** POST /api/v1/tickets/{id}/take: Take Ticket */
        takeTicket: (id) => call({ method: "POST", path: `/api/v1/tickets/${enc(id)}/take`, auth: true, kind: "data" }),
        /** GET /healthz (publik): Liveness */
        healthz: () => call({ method: "GET", path: `/healthz`, auth: false, kind: "raw-json" }),
        /** GET /readyz (publik): Readiness */
        readyz: () => call({ method: "GET", path: `/readyz`, auth: false, kind: "raw-json" }),
    };
}
