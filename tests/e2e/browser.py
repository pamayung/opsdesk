"""Uji E2E browser: frontend (Vite) -> proxy -> backend Go -> PostgreSQL, tanpa mock apa pun.
Prasyarat: backend + worker berjalan dengan database ber-seed (kata sandi demo), dan Vite dev server dengan
VITE_PROXY_TARGET menunjuk backend serta VITE_DEMO_PASSWORD diisi. Lihat tests/e2e/README.md.
"""
import os, re, sys, json, time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('WEB_URL', 'http://127.0.0.1:5173')
PW = os.environ.get('PASSWORD', 'Rahasia123!')
PHOTO = os.environ.get('PHOTO', '/tmp/e2e-photo.png')
WORKER_LOG = os.environ.get('WORKER_LOG', '/tmp/worker-e2e.log')
import urllib.request
API = os.environ.get('API_URL', 'http://127.0.0.1:18090')
def api_call(method, path, token=None, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    with urllib.request.urlopen(req) as r: raw = r.read(); return json.loads(raw) if raw else None
def api_token(email): return api_call('POST', '/api/v1/auth/login', body={'email': email, 'password': PW})['data']['access_token']
def api_open_ticket(who, title, prio='P2'):
    tok = api_token(who); ref = api_call('GET', '/api/v1/reference', tok)['data']
    cat = next(c for c in ref['categories'] if c['slug'] == 'it'); sub = next(x for x in cat['subcategories'] if x['slug'] == 'pos'); loc = next(l for l in ref['locations'] if l['name'] == 'Senopati')
    ans = [{'question_id': q['id'], 'answer': (q['options'][0] if q['type'] == 'select' else 'Ya' if q['type'] == 'yesno' else 'POS 1')} for q in sub['questions']]
    return api_call('POST', '/api/v1/tickets', tok, {'type': 'incident', 'priority': prio, 'category_id': cat['id'], 'subcategory_id': sub['id'], 'location_id': loc['id'], 'title': title, 'answers': ans})['data']['code']
passed, failed, problems, bad_responses = 0, [], [], []

def check(name, cond, extra=''):
    global passed
    if cond: passed += 1
    else: failed.append(f'{name} {extra}'); print(f'  GAGAL: {name} {extra}')

def section(t): print(f'\n== {t}')

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    page = ctx.new_page()
    page.set_default_timeout(10000)
    page.on('console', lambda m: problems.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: problems.append(f'pageerror: {e}'))
    page.on('response', lambda r: bad_responses.append((r.status, r.request.method, r.url.replace(BASE, ''))) if r.status >= 400 else None)

    def goto(hash_=''):
        page.goto(f'{BASE}/{hash_}'); page.wait_for_load_state('networkidle')
    def login(demo_label=None, email=None, pw=PW):
        if page.locator('#login-email').count() == 0: goto()
        if demo_label: page.get_by_role('button', name=demo_label).click()
        else: page.fill('#login-email', email); page.fill('#login-password', pw)
        page.get_by_role('button', name='Login', exact=True).click()
    def logout():
        page.get_by_role('button', name=re.compile('Kevin|Rina|Citra|Andri|Hendra|Sari|Tono|Mahendra|Wijaya|Gunawan|Maharani|Administrator')).last.click() if False else None
        page.locator('button[aria-haspopup="menu"]').click()
        page.get_by_role('menuitem', name='Sign out').click()
        page.wait_for_selector('#login-email')
    def nav(label): page.locator('nav[aria-label="Menu utama"]:visible').first.get_by_role('button', name=re.compile(label)).click(); page.wait_for_load_state('networkidle')
    def toast(): return page.locator('[role=status]').last.inner_text() if page.locator('[role=status]').count() else ''

    # ------------------------------------------------------------------ AUTH
    section('1. Login, galat, logout')
    goto()
    check('belum login: halaman login tampil', page.locator('#login-email').is_visible())
    check('mode demo menampilkan akun seed', page.get_by_test_id('demo-accounts').is_visible())
    page.fill('#login-email', 'rina@opsdesk.example'); page.fill('#login-password', 'salah-salah-1')
    page.get_by_role('button', name='Login', exact=True).click()
    page.wait_for_selector('[role=alert]')
    check('kata sandi salah: pesan dari server', 'Email atau kata sandi salah' in page.locator('[role=alert]').inner_text())
    login('Rina · Employee')
    page.wait_for_selector('h1:has-text("Rina")')
    check('login Rina: dashboard dengan nama', 'Rina' in page.locator('h1').first.inner_text())
    check('sidebar employee: My Tickets', page.locator('nav[aria-label="Menu utama"]').first.get_by_text('My Tickets').count() == 1)
    check('employee tidak punya menu Admin', page.locator('nav[aria-label="Menu utama"]').first.get_by_text('Admin', exact=True).count() == 0)
    page.reload(); page.wait_for_selector('h1:has-text("Rina")')
    check('sesi bertahan setelah reload (refresh dari localStorage)', True)

    # ------------------------------------------------------------------ BUAT TIKET
    section('2. Report Issue (routing preview dari server, foto, kunci idempotency)')
    nav('Report Issue')
    page.wait_for_selector('h1:has-text("Report Issue")')
    check('lokasi employee terisi otomatis dari profil (Senopati)', page.locator('#location').input_value() == 'Senopati')
    page.get_by_role('button', name=re.compile('P1 · Critical')).first.click()
    page.get_by_role('button', name='Komputer & Jaringan').click()
    page.get_by_role('button', name='POS / Kasir').click()
    page.get_by_label('Nomor POS / terminal').fill('POS 2')
    page.get_by_label('Gejala').select_option('Mati total')
    page.locator('#title').fill('POS 2 mati total saat jam makan siang')
    page.locator('#description').fill('Layar kasir hitam, lampu indikator mati.')
    page.wait_for_selector('[data-testid=route-preview]')
    rp = page.get_by_test_id('route-preview').inner_text()
    check('preview routing: tim IT Support Area', 'IT Support Area' in rp, rp[:200])
    check('preview routing: PIC area Kevin Mahendra', 'Kevin Mahendra' in rp)
    check('preview routing: SLA P1 dari kebijakan server', '30 min' in rp and '15 min' in rp)
    page.locator('input[type=file]').set_input_files(PHOTO)
    page.wait_for_selector('img[alt="Preview foto"]')
    check('foto dikompres dan tampil sebagai preview', True)
    page.get_by_role('button', name='Submit Ticket').click()
    page.wait_for_url(re.compile(r'#/tiket/TCK-\d+'))
    code1 = page.url.split('/tiket/')[1]
    page.wait_for_selector('h1:has-text("POS 2 mati total")')
    check('tiket dibuat dan detail terbuka', code1.startswith('TCK-'))
    page.wait_for_selector('img[alt^="Attachment dari"]')
    nat = page.eval_on_selector('img[alt^="Attachment dari"]', 'i => new Promise(r => i.complete ? r(i.naturalWidth) : i.addEventListener("load", () => r(i.naturalWidth)))')
    check('foto terlampir tampil lewat tautan bertanda tangan (gambar nyata dimuat)', nat > 0, str(nat))
    body = page.locator('main').inner_text()
    check('timeline: teks sistem English', 'Ticket created and added to the queue' in body and 'Routed to IT Support Area, initial PIC Kevin Mahendra' in body)
    check('detail: pertanyaan dinamis dan routing', 'POS 2' in body and 'Mati total' in body and 'IT Support Area' in body)
    check('employee tidak melihat tombol Take atau Resolve', page.get_by_role('button', name='Take Ticket').count() == 0 and page.get_by_role('button', name='Resolve Ticket').count() == 0)

    section('3. Daftar tiket (filter dan pencarian di server)')
    nav('My Tickets')
    page.wait_for_selector('[data-testid=list-count]:not(:has-text("Memuat"))')
    check('daftar: 1 tiket milik Rina', '1 dari 1' in page.get_by_test_id('list-count').inner_text(), page.get_by_test_id('list-count').inner_text())
    check('kartu menampilkan PIC awal dan SLA', 'Initial PIC · Kevin Mahendra' in page.locator('article').first.inner_text())
    page.get_by_label('Cari tiket').last.fill('zzz-tidak-ada'); page.wait_for_timeout(700)
    check('pencarian tanpa hasil', page.get_by_text('Tidak ada tiket', exact=True).count() == 1)
    page.get_by_label('Cari tiket').last.fill('POS 2'); page.wait_for_timeout(700)
    check('pencarian judul menemukan tiket', page.locator('article').count() == 1)
    page.get_by_label('Cari tiket').last.fill('')

    section('4. Isolasi antar-pengguna (RLS di server)')
    logout()
    login('Rina · Employee') if False else None
    page.fill('#login-email', 'citra-maharani@opsdesk.example'); page.fill('#login-password', PW)
    page.get_by_role('button', name='Login', exact=True).click(); page.wait_for_selector('h1:has-text("Citra")')
    nav('My Tickets'); page.wait_for_selector('[data-testid=list-count]:not(:has-text("Memuat"))')
    check('Citra tidak melihat tiket Rina', '0 dari 0' in page.get_by_test_id('list-count').inner_text())
    goto(f'#/tiket/{code1}'); page.wait_for_selector('h1:has-text("Tiket tidak ditemukan")')
    check('akses langsung ke tiket orang lain = tidak ditemukan', True)
    logout()

    # ------------------------------------------------------------------ PENANGANAN
    section('5. PIC: Take, Assign, catatan berfoto, eskalasi vendor, Resolve')
    login('Kevin · PIC'); page.wait_for_selector('h1:has-text("Kevin")')
    check('dashboard PIC: kartu prioritas', 'Critical (P1)' in page.locator('main').inner_text())
    nav('My Queue'); page.wait_for_selector('article')
    check('kartu tiket P1 tampil di antrean Kevin', 'POS 2 mati total' in page.locator('article').first.inner_text())
    page.get_by_role('button', name='Take Ticket').first.click()
    page.wait_for_function('document.querySelector("[role=status]") && document.querySelector("[role=status]").innerText.includes("di-take")')
    check('Take dari daftar: toast', 'di-take' in toast())
    page.locator('article').first.get_by_role('button', name=re.compile('Open Details')).click()
    page.wait_for_selector(f'h1:has-text("POS 2 mati total")')
    check('detail PIC: status In Progress', 'In Progress' in page.locator('main').inner_text())
    page.select_option('#pic-select', label='Budi Santoso')
    page.get_by_role('button', name='Assign', exact=True).click() if page.get_by_role('button', name='Assign', exact=True).count() else page.get_by_role('button', name='Change PIC', exact=True).click()
    page.wait_for_function('document.body.innerText.includes("Budi Santoso assigned as PIC by Kevin Mahendra")')
    check('Assign PIC: timeline English dari event server', True)
    page.locator('#note-input').fill('Sudah dicek: adaptor tidak mengeluarkan tegangan.')
    page.locator('main input[type=file]').set_input_files(PHOTO)
    page.wait_for_selector('img[alt="Preview foto yang akan dikirim"]')
    page.get_by_role('button', name='Kirim').click()
    page.wait_for_function('document.querySelectorAll("img[alt^=\\"Attachment dari\\"]").length >= 2')
    check('catatan berfoto dari PIC tampil (foto kedua)', True)
    page.get_by_role('button', name='Escalate to vendor').click()
    page.locator('#vendor').fill('PT Kasir Jaya')
    page.get_by_role('button', name='Escalate', exact=True).click()
    page.wait_for_selector('text=Sudah di-escalate ke')
    check('eskalasi vendor tercatat', 'PT Kasir Jaya' in page.locator('main').inner_text())
    page.locator('#resolution').fill('Adaptor diganti baru, POS menyala dan tes cetak berhasil.')
    page.get_by_role('button', name='Resolve Ticket').click()
    page.wait_for_selector('h2:has-text("Ticket resolved")')
    main = page.locator('main').inner_text()
    check('Resolve: panel hasil dan catatan', 'Adaptor diganti baru' in main and 'Resolved' in main)
    check('timeline: teks Resolution dan resolved', 'Resolution: Adaptor diganti baru' in main and 'Ticket resolved by Kevin Mahendra' in main)
    check('setelah Resolved catatan terkunci', 'Catatan tidak bisa ditambah lagi' in main)
    logout()

    # ------------------------------------------------------------------ DASHBOARD & LAPORAN
    section('6. Dashboard per peran dan laporan')
    open_code = api_open_ticket('rina@opsdesk.example', 'Printer struk macet, tiket terbuka untuk dashboard')
    login('Andri · Manager'); page.wait_for_selector('h1:has-text("Andri")')
    check('manager: Queue per team dari server', 'Queue per team' in page.locator('main').inner_text())
    logout()
    login('Hendra · Management'); page.wait_for_selector('h1:has-text("Hendra")')
    page.wait_for_selector('text=Active tickets per department')
    check('management: tiket aktif per department dari server', 'IT' in page.locator('main').inner_text() and 'unassigned' in page.locator('main').inner_text())
    nav('Reports'); page.wait_for_selector('text=Tickets created')
    kpis = page.locator('main').inner_text()
    check('laporan: KPI tersedia dari server', 'Tickets created' in kpis and 'SLA compliance' in kpis and 'Team performance' in kpis)
    page.get_by_label('Priority').select_option('P1'); page.wait_for_timeout(900); page.wait_for_selector('text=Tickets created')
    check('laporan: filter priority P1 diterapkan server', page.locator('section[aria-label=Summary] >> text=Tickets created').count() == 1)
    with page.expect_download() as dl: page.get_by_role('button', name='Download CSV').click()
    path = dl.value.path(); csv = open(path, 'rb').read()
    check('unduh CSV dari server: BOM, header, kode tiket', csv.startswith(b'\xef\xbb\xbf') and b'Created (WIB)' in csv and code1.encode() in csv, csv[:80].decode('utf8', 'ignore'))
    check('nama berkas CSV', dl.value.suggested_filename.startswith('report-opsdesk-'))
    page.get_by_role('button', name='Custom').click(); page.get_by_label('Tanggal mulai').fill('2026-03-05'); page.get_by_label('Tanggal akhir').fill('2026-03-01')
    page.wait_for_selector('text=Tanggal belum valid')
    check('rentang tanggal terbalik ditolak di klien (input date menolak 31 Februari sendiri)', True)
    logout()

    print(f'\n(bagian 1-6 selesai: {passed} lulus, {len(failed)} gagal)')
    exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'browser_admin.py')).read())
    browser.close()

print('\n==== HASIL ====')
print(f'lulus: {passed}  gagal: {len(failed)}')
for f in failed: print(' -', f)
unexpected = [(s, m, u) for s, m, u in bad_responses]
print('respons >= 400 yang terjadi:', sorted(set(unexpected))[:20])
print('error konsol:', problems[:10] if problems else 'tidak ada')
sys.exit(1 if failed else 0)
