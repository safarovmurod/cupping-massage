"""Local Chromium and axe-core audit. All Supabase requests are intercepted.
No real auth, admin records or customer data are used; real integration is BLOCKED
until owner supplies a disposable environment with its own test accounts.
Run: python tests/browser/accessibility-audit.py http://127.0.0.1:4173
"""
import base64
import datetime
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173").rstrip("/")
ROOT = Path(__file__).resolve().parents[2]
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"
SHOTS = Path("/tmp/mama-a11y-screenshots")
SHOTS.mkdir(exist_ok=True, parents=True)
LANGS = ("ru", "tj", "en")
WCAG_TAGS = ("wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa")
ADMIN_PAGES = ("/admin", "/admin/leads", "/admin/users", "/admin/content",
               "/admin/contacts", "/admin/password-resets", "/admin/analytics", "/admin/settings")
PUBLIC_PAGES = ("/", "/contact", "/login", "/register",
                "/forgot-password", "/reset-password", "/missing-page")
UID = "11111111-1111-4111-8111-111111111111"
now = int(time.time())

def b64(obj):
    return base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode()).decode().rstrip("=")

fake_user = {
    "id": UID, "aud": "authenticated", "role": "authenticated",
    "email": "ui-audit@example.invalid", "created_at": "2026-01-01T00:00:00Z",
    "app_metadata": {"provider": "email", "providers": ["email"]},
    "user_metadata": {"full_name": "Synthetic UI Admin"},
    "email_confirmed_at": "2026-01-01T00:00:00Z",
}
fake_session = {
    "access_token": b64({"alg": "HS256", "typ": "JWT"}) + "." +
        b64({"sub": UID, "role": "authenticated", "aud": "authenticated", "exp": now + 7200}) +
        ".ui-audit-not-valid-for-real-auth",
    "refresh_token": "local-audit-no-real-refresh", "token_type": "bearer",
    "expires_in": 7200, "expires_at": now + 7200, "user": fake_user,
}
PROFILE = {**fake_user, "role": "admin", "is_active": True, "full_name": "Synthetic UI Admin", "phone": None}
SAMPLE_LEAD = {
    "id": "22222222-2222-4222-8222-222222222222",
    "name": "Synthetic Test Lead", "phone": "000000000",
    "status": "new", "message": "Mocked row - no real customer",
    "preferred_time": None, "for_whom": "woman", "created_at": "2026-01-01T00:00:00Z",
}
ZERO_STATS = dict(
    uniqueVisitors=0, totalVisits=0, viewsToday=0, viewsWeek=0, instagramVisitors=0,
    whatsappVisitors=0, totalUsers=0, newToday=0, newMonth=0,
    formSubmits=0, onlineNow=0, whatsappClicks=0, days=[], sources=[],
)
violations = []
runtime_errors = []
checks = 0
mock_writes = []

def mock_api(route):
    request = route.request
    parsed = urlparse(request.url)
    path = parsed.path
    method = request.method
    if method in ("POST", "PATCH", "PUT", "DELETE"):
        mock_writes.append(f"{method} {path}")
    headers = {"Access-Control-Expose-Headers": "content-range",
               "content-range": "0-0/1"}
    if path.startswith("/auth/v1/user"):
        return route.fulfill(json=fake_user, headers=headers)
    if path.startswith("/rest/v1/profiles"):
        if "application/vnd.pgrst.object+json" in request.headers.get("accept", ""):
            return route.fulfill(json=PROFILE, headers=headers)
        return route.fulfill(json=[PROFILE], headers=headers)
    if path.startswith("/rest/v1/leads"):
        if method == "GET":
            return route.fulfill(json=[SAMPLE_LEAD], headers=headers)
        return route.fulfill(status=204, body="")
    if path.startswith("/rest/v1/rpc/admin_analytics_summary"):
        return route.fulfill(json=ZERO_STATS, headers=headers)
    if path.startswith("/rest/v1/"):
        return route.fulfill(json=[], headers=headers)
    if path.startswith("/auth/v1/"):
        return route.fulfill(json=fake_user, headers=headers)
    raise AssertionError("Unexpected Supabase API path: " + path)

def new_context(browser, width=390, lang="ru", role=None):
    context = browser.new_context(viewport={"width": width, "height": 900},
                                  reduced_motion="reduce", device_scale_factor=1)
    storage = json.dumps(fake_session)
    initial = """try {localStorage.setItem('cookieConsent','declined');
        localStorage.setItem('lang', %s); %s} catch(e) {}""" % (
        json.dumps(lang),
        "localStorage.setItem('sb-alafwzjqxwjanoqrirwi-auth-token', %s);" % json.dumps(storage)
        if role else "")
    context.add_init_script(initial)
    page = context.new_page()
    page.route("https://*.supabase.co/**", mock_api)
    page.on("pageerror", lambda error: runtime_errors.append(str(error)))
    return context, page

def axe_scan(page, label):
    global checks
    # Audit the settled interface. Framer Motion entrance fades briefly blend
    # button text and backgrounds, yielding false contrast failures mid-transition.
    page.wait_for_timeout(950)
    page.add_script_tag(path=str(AXE))
    results = page.evaluate("""async tags => {
      const result = await window.axe.run(document, {runOnly: {type:'tag', values: tags}});
      return result.violations.map(v => ({
        id:v.id, impact:v.impact, help:v.help,
        nodes:v.nodes.slice(0,6).map(n => ({target:n.target, summary:n.failureSummary?.slice(0,200)}))
      }));
    }""", list(WCAG_TAGS))
    if results:
        violations.append({"page": label, "violations": results})
        for item in results:
            print("VIOLATION", label, item["id"], item["impact"],
                  "targets=", json.dumps(item["nodes"], ensure_ascii=False)[:650], flush=True)
    else:
        print("PASS axe WCAG-tagged", label, flush=True)
    checks += 1

assert AXE.is_file(), f"Missing {AXE}: npm install --no-save --package-lock=false axe-core@4.10.3"
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--no-sandbox"])
    for width in (390, 1440):
        context, page = new_context(browser, width=width)
        for path in PUBLIC_PAGES:
            page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
            expect(page.locator("h1").first).to_be_visible(timeout=15000)
            page.evaluate("document.fonts.ready")
            label = f"public-{path.replace('/', '-') or 'home'}-{width}"
            axe_scan(page, label)
            if path in ("/", "/contact", "/login", "/register"):
                page.screenshot(path=str(SHOTS / (label + ".png")), full_page=True, animations="disabled")
            if page.evaluate("document.documentElement.scrollWidth > innerWidth"):
                violations.append({"page":label, "violations":[{"id":"horizontal-overflow", "impact":"serious"}]})
        if width == 390:
            page.goto(BASE)
            toggle = page.get_by_role("button", name=re.compile("Открыть меню|Open menu"))
            toggle.click()
            expect(page.get_by_role("presentation").filter(has=page.get_by_role("navigation"))).to_be_visible()
            axe_scan(page, "public-mobile-menu-expanded")
            page.screenshot(path=str(SHOTS/"public-mobile-menu.png"), animations="disabled")
            page.get_by_role("button", name=re.compile("Закрыть меню|Close menu")).click()
            checks += 1
        context.close()

    for lang in LANGS:
        if lang == "ru":
            continue
        context, page = new_context(browser, width=390, lang=lang)
        page.goto(BASE)
        axe_scan(page, "public-home-" + lang)
        page.goto(BASE + "/contact")
        axe_scan(page, "public-contact-" + lang)
        context.close()

    # Synthetic session never reaches actual Supabase servers; this checks only UI
    # visibility and mocked read operations, NOT backend authentication or RLS.
    for width in (390, 1440):
        context, page = new_context(browser, width=width, role="admin")
        for path in ADMIN_PAGES:
            page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
            expect(page.locator("main")).to_be_visible(timeout=15000)
            expect(page.get_by_text("Мама и малыш · Админ").first).to_be_visible(timeout=15000) if width == 1440 else None
            page.wait_for_timeout(400)
            label = f"admin-{path.replace('/', '-')}-{width}"
            axe_scan(page, label)
            if path in ("/admin", "/admin/leads", "/admin/content"):
                page.screenshot(path=str(SHOTS / (label + ".png")), full_page=True, animations="disabled")
            if page.evaluate("document.documentElement.scrollWidth > innerWidth"):
                violations.append({"page":label, "violations":[{"id":"horizontal-overflow", "impact":"serious"}]})
        context.close()

    # Non-admin synthetic session must not render the admin interface.
    context, page = new_context(browser, width=390, role="user")
    PROFILE["role"] = "user"
    page.goto(BASE + "/admin", wait_until="domcontentloaded")
    expect(page.get_by_text("Мама и малыш · Админ")).to_have_count(0)
    print("PASS mocked ordinary user cannot see admin navigation", flush=True)
    checks += 1
    context.close()
    PROFILE["role"] = "admin"

    # Mocked mutation of a synthetic row only; verifies frontend UI interaction.
    context, page = new_context(browser, width=1440, role="admin")
    page.goto(BASE + "/admin/leads", wait_until="domcontentloaded")
    expect(page.get_by_text("Synthetic Test Lead")).to_be_visible(timeout=15000)
    table_row = page.get_by_role("row").filter(has_text="Synthetic Test Lead")
    table_row.get_by_role("combobox").click()
    page.get_by_role("option", name="Завершённые").click()
    assert any(w.startswith("PATCH /rest/v1/leads") for w in mock_writes), mock_writes
    print("PASS mocked admin leads status UI (NO production write)", flush=True)
    checks += 1
    context.close()

    # Local simulated backend errors and recoveries. Supabase remains intercepted.
    context, page = new_context(browser, width=390)
    failures = {"count": 0}
    def flaky_booking(route):
        if route.request.method == "POST":
            failures["count"] += 1
            if failures["count"] == 1:
                return route.fulfill(status=503, json={"message":"Synthetic outage", "code":"PGRST503"})
            return route.fulfill(status=201, body="")
        return mock_api(route)
    page.route("https://*.supabase.co/rest/v1/leads*", flaky_booking)
    page.goto(BASE + "/contact", wait_until="domcontentloaded")
    page.locator("#contact-name").fill("Synthetic Form Test")
    page.locator("#contact-phone").fill("+992900123456")
    page.locator("#contact-for-whom").click()
    page.get_by_role("option", name="Женщине").click()
    page.get_by_role("button", name="Отправить заявку").click()
    expect(page.get_by_role("alert")).to_contain_text("Не удалось отправить заявку", timeout=15000)
    expect(page.locator("#contact-name")).to_have_value("Synthetic Form Test")
    expect(page.locator("#contact-phone")).to_have_value("+992900123456")
    page.get_by_role("button", name="Отправить заявку").click()
    expect(page.get_by_role("status")).to_contain_text("Заявка отправлена", timeout=15000)
    assert failures["count"] == 2, failures
    print("PASS mocked contact request: 503, input retention, retry, success (NO production write)", flush=True)
    checks += 1
    context.close()

    # Empty/error admin states are checked with synthetic sessions and data.
    for mode in ("empty", "error"):
        context, page = new_context(browser, width=390, role="admin")
        def mock_leads_read(route):
            if route.request.method == "GET":
                if mode == "error":
                    return route.fulfill(status=503, json={"message":"Synthetic outage", "code":"PGRST503"})
                return route.fulfill(status=200, json=[])
            return mock_api(route)
        page.route("https://*.supabase.co/rest/v1/leads*", mock_leads_read)
        page.goto(BASE + "/admin/leads", wait_until="domcontentloaded")
        if mode == "empty":
            expect(page.get_by_text("Заявок пока нет")).to_be_visible(timeout=15000)
        else:
            expect(page.get_by_role("alert")).to_contain_text("Не удалось загрузить заявки", timeout=15000)
        print("PASS mocked admin leads", mode, "state (NO production queries)", flush=True)
        checks += 1
        context.close()

    browser.close()

print(json.dumps({"axe_scans":checks,"violations":len(violations),
    "uncaught_browser_errors":len(runtime_errors),"mock_api_writes":len(mock_writes)},
    ensure_ascii=False),flush=True)
if runtime_errors:
    print("BROWSER ERRORS:", runtime_errors[:10], flush=True)
if violations or runtime_errors:
    raise SystemExit(1)
