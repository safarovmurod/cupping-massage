"""Browser smoke checks for the isolated redesign branch.

Run against a locally built Vite preview only. Supabase is mocked; no customer
data is read or written. For CI: python tests/browser/redesign-smoke.py URL.
"""
import re
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173").rstrip("/")
BASE_URL = urlparse(BASE)
assert (BASE_URL.scheme == "http" and BASE_URL.hostname in ("127.0.0.1", "localhost")
        and not BASE_URL.username and not BASE_URL.password
        and not BASE_URL.query and not BASE_URL.fragment and not BASE_URL.path), \
    "Browser smoke requires a loopback HTTP preview origin, never a deployed website."
WIDTHS = [320, 375, 390, 430, 768, 1024, 1440]
LANGUAGES = {"ru": "Язык сайта", "tj": "Забони сомона", "en": "Website language"}
PATHS = ["/", "/services", "/about", "/faq", "/booking", "/contact", "/login", "/register",
         "/forgot-password", "/reset-password", "/not-found-smoke"]
checks = 0
mock_calls = []


def guard_local_network(context):
    # Page-level fixture handlers run first. All other requests must stay on the
    # local preview, including frames/assets; external services are never visited.
    def local_only(route):
        url = urlparse(route.request.url)
        if (url.scheme, url.netloc) == (BASE_URL.scheme, BASE_URL.netloc):
            route.continue_()
        else:
            route.abort("blockedbyclient")
    context.route("**/*", local_only)


def attach_mocks(page):
    # No contact with the production database or Auth services.
    def mock_api(route):
        mock_calls.append((route.request.method, urlparse(route.request.url).path))
        route.fulfill(status=200, content_type="application/json", body="[]")
    page.route("https://ci-supabase.invalid/**", mock_api)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--no-sandbox"])

    # Real browser rendering for each requested width and public language.
    for width in WIDTHS:
        for language in LANGUAGES:
            context = browser.new_context(
                viewport={"width": width, "height": 850},
                reduced_motion="reduce",
                locale="en-US",
                service_workers="block",
            )
            guard_local_network(context)
            context.add_init_script(
                "try { localStorage.setItem('lang', '" + language +
                "'); localStorage.setItem('cookieConsent', 'declined') } catch {}"
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            attach_mocks(page)
            for path in ["/", "/contact", "/booking"]:
                response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
                assert response and response.status == 200, (width, language, path)
                expect(page.locator("h1").first).to_be_visible(timeout=15000)
                expect(page.locator(".mm-logo").first).to_contain_text("Мама и малыш")
                page.evaluate("document.fonts.ready")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
                    "horizontal-overflow", width, language, path,
                    page.evaluate("({ document: document.documentElement.scrollWidth, viewport: innerWidth })")
                )
                assert not errors, ("browser-runtime-error", width, language, path, errors)
                checks += 1
            page.goto(BASE + "/contact", wait_until="domcontentloaded")
            expect(page.locator("#contact-name")).to_be_visible()
            context.close()
        print(f"PASS responsive homepage/contact: {width}px × RU/TJ/EN", flush=True)

    # Route handling and access boundary as a guest; this does NOT replace a
    # signed-in admin RLS/CRUD integration test.
    context = browser.new_context(viewport={"width": 390, "height": 850}, service_workers="block")
    guard_local_network(context)
    context.add_init_script("localStorage.setItem('cookieConsent','declined')")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    attach_mocks(page)
    for path in PATHS:
        response = page.goto(BASE + path, wait_until="domcontentloaded")
        assert response and response.status == 200, path
        expect(page.locator("h1").first).to_be_visible(timeout=15000)
        assert not errors, (path, errors)
        checks += 1
    page.goto(BASE + "/admin")
    expect(page).to_have_url(re.compile(r"/login/?$"), timeout=15000)
    checks += 1
    print("PASS public routes; anonymous /admin redirects to /login", flush=True)

    # The language Select must work by mouse and keyboard, and persist.
    page.goto(BASE)
    select = page.get_by_role("combobox", name="Язык сайта")
    expect(select).to_be_visible()
    select.click()
    page.get_by_role("option", name=re.compile("Тоҷикӣ")).click()
    expect(page.locator("html")).to_have_attribute("lang", "tg")
    assert page.evaluate("localStorage.getItem('lang')") == "tj"
    page.reload()
    expect(page.locator("html")).to_have_attribute("lang", "tg")
    select = page.get_by_role("combobox", name="Забони сомона")
    select.focus()
    select.press(" ")
    page.get_by_role("option", name=re.compile("English")).click()
    expect(page.locator("html")).to_have_attribute("lang", "en")
    assert page.evaluate("localStorage.getItem('lang')") == "en"
    checks += 1
    print("PASS language Select RU → TJ → EN, reload and keyboard activation", flush=True)

    # Invalid form must display validation and must never call Supabase insert.
    page.goto(BASE + "/contact")
    expect(page.locator("#contact-name")).to_be_visible()
    mock_calls.clear()
    page.get_by_role("button", name="Submit").click()
    expect(page.locator("#contact-name")).to_have_attribute("aria-invalid", "true")
    expect(page.locator("#contact-phone")).to_have_attribute("aria-invalid", "true")
    assert not any(method == "POST" and path == "/rest/v1/leads"
                   for method, path in mock_calls), mock_calls
    checks += 1
    print("PASS client-side form validation with no database insert", flush=True)
    # Real booking wizard, including one-zone 70 somoni service and required data.
    page.evaluate("localStorage.setItem('lang','ru')")
    page.goto(BASE + "/booking")
    expect(page.get_by_role("heading", name="Выберите удобную запись")).to_be_visible()
    page.get_by_role("button", name="Для себя").click()
    page.get_by_role("button", name="Далее").click()
    page.get_by_role("button", name=re.compile("Одна зона массажа")).click()
    page.get_by_label("Какая одна зона тела?").select_option("legs")
    page.get_by_role("button", name="Далее").click()
    page.get_by_label("Ваше имя").fill("Саида")
    expect(page.get_by_text("Одна зона массажа — 70 сомони")).to_be_visible()
    expect(page.get_by_role("button", name="Продолжить в WhatsApp")).to_be_visible()
    assert not errors, ("booking-browser-runtime-error", errors)
    checks += 1
    print("PASS real three-step WhatsApp booking wizard", flush=True)
    context.close()

    browser.close()
print(f"Browser smoke complete: {checks} checks (Supabase requests mocked).", flush=True)
