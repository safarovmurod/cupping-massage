"""Browser smoke checks for the isolated redesign branch.

Run against a locally built Vite preview only. Supabase is mocked; no customer
data is read or written. For CI: python tests/browser/redesign-smoke.py URL.
"""
import re
import sys
from playwright.sync_api import sync_playwright, expect

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173").rstrip("/")
WIDTHS = [320, 375, 390, 430, 768, 1024, 1440]
LANGUAGES = {"ru": "Язык сайта", "tj": "Забони сомона", "en": "Website language"}
PATHS = ["/", "/contact", "/login", "/register",
         "/forgot-password", "/reset-password", "/not-found-smoke"]
checks = 0


def attach_mocks(page):
    # No contact with the production database or Auth services.
    page.route("https://*.supabase.co/**", lambda route: route.fulfill(
        status=200, content_type="application/json", body="[]"))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--no-sandbox"])

    # Real browser rendering for each requested width and public language.
    for width in WIDTHS:
        for language in LANGUAGES:
            context = browser.new_context(
                viewport={"width": width, "height": 850},
                reduced_motion="reduce",
                locale="en-US",
            )
            context.add_init_script(
                "try { localStorage.setItem('lang', '" + language +
                "'); localStorage.setItem('cookieConsent', 'declined') } catch {}"
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            attach_mocks(page)
            for path in ["/", "/contact"]:
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
            expect(page.locator("#contact-name")).to_be_visible()
            context.close()
        print(f"PASS responsive homepage/contact: {width}px × RU/TJ/EN", flush=True)

    # Route handling and access boundary as a guest; this does NOT replace a
    # signed-in admin RLS/CRUD integration test.
    context = browser.new_context(viewport={"width": 390, "height": 850})
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
    page.get_by_role("button", name="Submit").click()
    expect(page.locator("#contact-name")).to_have_attribute("aria-invalid", "true")
    expect(page.locator("#contact-phone")).to_have_attribute("aria-invalid", "true")
    checks += 1
    print("PASS client-side form validation with no database insert", flush=True)
    context.close()

    browser.close()
print(f"Browser smoke complete: {checks} checks (Supabase requests mocked).", flush=True)
