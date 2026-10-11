"""Local static-site smoke checks; no account, backend or external message.

Run: python tests/browser/static-booking-smoke.py http://127.0.0.1:4173
Every external request is intercepted before it reaches the network.
"""
import json
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173").rstrip("/")
ORIGIN = urlparse(BASE)
assert (ORIGIN.scheme == "http" and ORIGIN.hostname in ("127.0.0.1", "localhost")
        and not ORIGIN.username and not ORIGIN.password and not ORIGIN.path
        and not ORIGIN.query and not ORIGIN.fragment), "Use a local HTTP preview origin only."
SHOTS = Path(os.environ.get("MAMA_SCREENSHOT_DIR", "/tmp/mama-static-screenshots"))
SHOTS.mkdir(parents=True, exist_ok=True)
WIDTHS = (320, 375, 390, 430, 768, 1024, 1440)
LANGUAGES = {
    "ru": {"select": "Язык сайта", "open": "Открыть меню", "close": "Закрыть меню", "html": "ru"},
    "tj": {"select": "Забони сомона", "open": "Менюро кушоед", "close": "Менюро пӯшед", "html": "tg"},
    "en": {"select": "Website language", "open": "Open menu", "close": "Close menu", "html": "en"},
}
REMOVED_ROUTES = ("/login", "/register", "/admin", "/admin/users", "/forgot-password", "/reset-password")
BOOKING_UI = {
    "ru": {"child": "Для ребёнка", "age": "6 месяцев", "select": "Выделить сообщение", "openInstagram": "Открыть Instagram"},
    "tj": {"child": "Барои кӯдак", "age": "6 моҳ", "select": "Матни паёмро интихоб кунед", "openInstagram": "Instagram-ро кушоед"},
    "en": {"child": "For a child", "age": "6 months", "select": "Select message", "openInstagram": "Open Instagram"},
}
SERVICE_IDS = ("child", "adult", "cupping", "partial", "electro", "light")
TEST_NAME = "Synthetic booking test"
TEST_PHONE = "+992 000 000 000"
TEST_NOTE = "Synthetic smoke & тест\nNo external message sent"
TEST_DAY = (date.today() + timedelta(days=7)).isoformat()
checks = 0


def new_page(browser, width=390, language="ru"):
    context = browser.new_context(viewport={"width": width, "height": 900},
                                  reduced_motion="reduce", service_workers="block")
    evidence = {"backend": [], "unexpected": [], "links": [], "errors": [], "clipboard": [], "maps": []}
    try:
        context.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    except Exception:
        # Clipboard is still mocked on browser versions without these permissions.
        pass
    context.expose_function("__recordBookingCopy", lambda text: evidence["clipboard"].append(text))

    def intercept(route):
        request = route.request
        parsed = urlparse(request.url)
        host = parsed.hostname or ""
        if "supabase" in host or parsed.path.startswith(("/auth/v1/", "/rest/v1/")):
            evidence["backend"].append(request.url)
            route.abort("blockedbyclient")
        elif (parsed.scheme, parsed.netloc) == (ORIGIN.scheme, ORIGIN.netloc):
            route.continue_()
        elif host in ("wa.me", "api.whatsapp.com", "www.instagram.com", "instagram.com", "ig.me"):
            # Observe navigation intent without loading WhatsApp/Instagram.
            evidence["links"].append(request.url)
            # HTTP 204 leaves the current form visible. No external page is loaded.
            route.fulfill(status=204, body="")
        elif request.resource_type == "document" and host in ("yandex.ru", "yandex.com", "maps.yandex.ru"):
            evidence["maps"].append(request.url)
            route.fulfill(status=200, content_type="text/html", body="<title>Local map placeholder</title>")
        else:
            evidence["unexpected"].append(request.url)
            route.abort("blockedbyclient")

    context.route("**/*", intercept)
    context.add_init_script("""language => {
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', language);
      window.__bookingOpenedLinks = [];
      window.__bookingClipboard = [];
      window.open = (url) => { window.__bookingOpenedLinks.push(String(url)); return null; };
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async text => {
          if (window.__bookingClipboardFailure) throw new Error('Synthetic clipboard failure');
          await window.__recordBookingCopy(String(text));
          window.__bookingClipboard.push(String(text));
        },
        readText: async () => window.__bookingClipboard.at(-1) || '',
      }});
    }""".replace("language => {", "(() => { const language = " + json.dumps(language) + ";") + ")();")
    page = context.new_page()
    page.on("pageerror", lambda error: evidence["errors"].append(str(error)))
    page.on("console", lambda message: evidence["errors"].append(message.text) if message.type == "error" else None)
    return context, page, evidence


def assert_health(page, evidence, label):
    assert not evidence["backend"], ("Unexpected backend request", label, evidence["backend"])
    assert not evidence["unexpected"], ("Unexpected external request", label, evidence["unexpected"])
    assert not evidence["errors"], ("Browser errors", label, evidence["errors"])
    expect(page.locator("vite-error-overlay")).to_have_count(0)
    dimensions = page.evaluate("({width:innerWidth, scrollWidth:document.documentElement.scrollWidth})")
    if dimensions["scrollWidth"] > dimensions["width"]:
        safe_label = re.sub(r"[^A-Za-z0-9_-]", "_", label)
        page.screenshot(path=str(SHOTS / ("failure-" + safe_label + ".png")), full_page=True, animations="disabled")
    assert dimensions["scrollWidth"] <= dimensions["width"], (
        "Horizontal overflow", label,
        dimensions,
    )
    expect(page.locator("a[href^='/login'], a[href^='/register'], a[href^='/admin']")).to_have_count(0)


def load(page, path="/"):
    response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
    assert response and response.status in (200, 404), (path, response.status if response else None)
    expect(page.locator("h1").first).to_be_visible(timeout=15000)
    page.evaluate("document.fonts.ready")


def check_photos(page):
    photos = page.locator("main img")
    assert page.locator("main img[alt]:not([alt=''])").count() >= 2, "The landing must retain informative massage photos."
    for photo in photos.all():
        photo.scroll_into_view_if_needed()
        expect(photo).to_be_visible()
        expect(photo).to_have_js_property("complete", True)
        assert photo.evaluate("image => image.naturalWidth > 0"), photo.get_attribute("src")
        assert photo.get_attribute("alt") is not None, "Images must declare alt text, empty for decorations."


def check_mobile_menu(page, language):
    labels = LANGUAGES[language]
    # MUI correctly hides the background header from the accessibility tree while
    # its modal Drawer is open. Keep locating the same toggle in the DOM.
    toggle = page.get_by_role("button", name=labels["open"], exact=True, include_hidden=True)
    if not toggle.is_visible():
        return False
    toggle.click()
    expect(toggle).to_have_attribute("aria-expanded", "true")
    expect(page.locator("#mm-mobile-menu")).to_be_visible()
    page.get_by_role("button", name=labels["close"], exact=True).click()
    expect(toggle).to_have_attribute("aria-expanded", "false")
    expect(page.locator("#mm-mobile-menu")).to_be_hidden()
    return True


def check_message_url(url, expected_name, expected_phone, expected_comment):
    parsed = urlparse(url)
    assert parsed.scheme == "https" and parsed.hostname == "wa.me", url
    assert parsed.path == "/992007336264", "Booking must use the verified WhatsApp number."
    message = parse_qs(parsed.query).get("text", [""])[0]
    assert expected_name in message and expected_phone in message and expected_comment in message, message
    assert "\n\n" in message, "Booking text must preserve readable blank lines."
    assert "%0A" not in message and "%20" not in message, "WhatsApp text was encoded twice."
    return message


def fill_booking(page, language):
    page.locator("#booking-name").fill(TEST_NAME)
    page.locator("#booking-phone").fill(TEST_PHONE)
    page.locator("#booking-service").click()
    page.get_by_role("option").first.click()
    page.locator("#booking-recipient").click()
    page.get_by_role("option", name=BOOKING_UI[language]["child"], exact=True).click()
    page.locator("#booking-child-age").fill(BOOKING_UI[language]["age"])
    page.locator("#booking-day").fill(TEST_DAY)
    page.locator("#booking-time").fill("14:30")
    page.locator("#booking-note").fill(TEST_NOTE)
    expect(page.locator("#booking-preview")).to_be_visible()
    message = page.locator("#booking-preview").input_value()
    for part in (TEST_NAME, TEST_PHONE, BOOKING_UI[language]["age"], TEST_DAY, "14:30", TEST_NOTE):
        assert part in message, ("Missing booking field", language, part)
    assert "\n\n" in message, "The preview must preserve blank lines."
    return message


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--no-sandbox"])
    for width in WIDTHS:
        for language, labels in LANGUAGES.items():
            context, page, evidence = new_page(browser, width, language)
            load(page)
            expect(page.locator("html")).to_have_attribute("lang", labels["html"])
            expect(page.get_by_role("combobox", name=labels["select"], exact=True)).to_be_visible()
            expect(page.locator("iframe")).to_have_count(0)
            expect(page.locator(".mm-service-card")).to_have_count(6)
            expect(page.locator(".mm-service-card h3").filter(has_text=re.compile("Электрофорез|Electrophoresis", re.I))).to_have_count(1)
            check_photos(page)
            page.locator("h1").first.scroll_into_view_if_needed()
            menu_checked = check_mobile_menu(page, language)
            assert width != 320 or menu_checked, "A usable mobile menu is required at 320px."
            assert_health(page, evidence, f"home-{width}-{language}")
            if width in (390, 1440):
                page.screenshot(path=str(SHOTS / f"home-{width}-{language}.png"), full_page=True, animations="disabled")
            checks += 1
            context.close()
        print(f"PASS static homepage/photos/services/menu: {width}px × RU/TJ/EN", flush=True)

    for language in LANGUAGES:
        context, page, evidence = new_page(browser, language=language)
        load(page, "/contact")
        expect(page).to_have_url(re.compile(r"/#contact$"))
        expect(page.locator("#contact")).to_be_visible()
        assert_health(page, evidence, f"contact-alias-{language}")
        for path in REMOVED_ROUTES:
            load(page, path)
            expect(page.get_by_text("404", exact=True)).to_be_visible()
            expect(page).to_have_url(BASE + path)
            expect(page.locator("input[type='password'], input[type='email']")).to_have_count(0)
            assert_health(page, evidence, f"removed-route-{path}-{language}")
            checks += 1
        checks += 1
        context.close()
    print("PASS /contact → /#contact; removed Auth/admin routes render 404 in RU/TJ/EN", flush=True)

    context, page, evidence = new_page(browser)
    load(page)
    select = page.get_by_role("combobox", name=LANGUAGES["ru"]["select"], exact=True)
    select.click()
    page.get_by_role("option", name=re.compile("Тоҷикӣ")).click()
    expect(page.locator("html")).to_have_attribute("lang", "tg")
    assert page.evaluate("localStorage.getItem('lang')") == "tj"
    page.reload(wait_until="domcontentloaded")
    expect(page.locator("html")).to_have_attribute("lang", "tg")
    select = page.get_by_role("combobox", name=LANGUAGES["tj"]["select"], exact=True)
    select.focus()
    select.press(" ")
    page.get_by_role("option", name=re.compile("English")).click()
    expect(page.locator("html")).to_have_attribute("lang", "en")
    assert page.evaluate("localStorage.getItem('lang')") == "en"
    assert_health(page, evidence, "language-mouse-keyboard-reload")
    checks += 1
    context.close()
    print("PASS language switch by mouse/keyboard and persistence after reload", flush=True)

    for language in LANGUAGES:
        context, page, evidence = new_page(browser, language=language)
        load(page)
        page.locator(".mm-hero a[href='#contact']").click()
        expect(page).to_have_url(BASE + "/#contact")
        expect(page.locator("#contact")).to_be_in_viewport()
        contact_box = page.locator("#contact").bounding_box()
        assert contact_box and contact_box["y"] < 900 and contact_box["y"] + contact_box["height"] > 0, "Hero booking must scroll to contact."
        for index, service_id in enumerate(SERVICE_IDS):
            card = page.locator(".mm-service-card").nth(index)
            card.locator("a[href$='#contact'], button").first.click()
            expect(page.locator("input[name='service']")).to_have_value(service_id)
        checks += 2

        assert not evidence["maps"], "Map requests must wait for the user's Show map action."
        page.locator(".mm-map-placeholder button").click()
        expect(page.locator(".mm-map-card iframe")).to_be_visible()
        frame_url = urlparse(page.locator(".mm-map-card iframe").get_attribute("src"))
        assert frame_url.scheme == "https" and frame_url.hostname == "yandex.ru", frame_url.geturl()
        assert page.locator(".mm-map-card iframe").get_attribute("title"), "The map iframe needs a translated accessible title."
        checks += 1

        submit = page.locator("form").filter(has=page.locator("#booking-name")).locator("button[type='submit']")
        submit.click()
        assert page.locator("#booking-name:invalid, #booking-name[aria-invalid='true']").count()
        expect(page.locator("#booking-preview")).to_have_count(0)
        assert not evidence["links"], "An empty form must never open a messenger."

        message = fill_booking(page, language)
        # Re-selecting a card after a manual Select change must apply again,
        # preserving the customer's already typed fields.
        page.locator(".mm-service-card").first.locator("a[href='#contact']").click()
        expect(page.locator("input[name='service']")).to_have_value("child")
        page.locator("#booking-service").click()
        page.get_by_role("option").nth(1).click()
        expect(page.locator("input[name='service']")).to_have_value("adult")
        page.locator(".mm-service-card").first.locator("a[href='#contact']").click()
        expect(page.locator("input[name='service']")).to_have_value("child")
        expect(page.locator("#booking-name")).to_have_value(TEST_NAME)
        expect(page.locator("#booking-phone")).to_have_value(TEST_PHONE)
        expect(page.locator("#booking-day")).to_have_value(TEST_DAY)
        expect(page.locator("#booking-preview")).to_have_value(message)
        checks += 1
        page.locator("#booking-phone").fill("invalid12345")
        submit.click()
        expect(page.locator("#booking-phone")).to_have_attribute("aria-invalid", "true")
        expect(page.locator("#booking-preview")).to_have_count(0)
        assert not evidence["links"]
        page.locator("#booking-phone").fill(TEST_PHONE)
        page.locator("#booking-child-age").fill("")
        submit.click()
        assert page.locator("#booking-child-age:invalid, #booking-child-age[aria-invalid='true']").count()
        assert not evidence["links"]
        page.locator("#booking-child-age").fill(BOOKING_UI[language]["age"])
        expect(page.locator("#booking-preview")).to_have_value(message)
        page.screenshot(path=str(SHOTS / f"booking-valid-390-{language}.png"), animations="disabled")
        checks += 1

        with page.expect_request(re.compile(r"https://wa\.me/992007336264\?text=")) as whatsapp:
            submit.click()
        url = whatsapp.value.url
        assert check_message_url(url, TEST_NAME, TEST_PHONE, TEST_NOTE) == message
        assert not evidence["clipboard"], "WhatsApp must not require copying the message."
        assert_health(page, evidence, f"whatsapp-draft-{language}")
        checks += 1
        context.close()

        context, page, evidence = new_page(browser, language=language)
        load(page)
        message = fill_booking(page, language)
        page.get_by_role("radio", name="Instagram", exact=True).check()
        submit = page.locator("form").filter(has=page.locator("#booking-name")).locator("button[type='submit']")
        with page.expect_request("https://ig.me/m/mama_i_malish_tj") as instagram:
            submit.click()
        assert instagram.value.url == "https://ig.me/m/mama_i_malish_tj"
        assert evidence["clipboard"] == [message], "Instagram must copy the complete preview before navigation."
        assert evidence["links"] == ["https://ig.me/m/mama_i_malish_tj"], evidence["links"]
        assert_health(page, evidence, f"instagram-copy-and-open-{language}")
        checks += 1
        context.close()

        context, page, evidence = new_page(browser, language=language)
        load(page)
        message = fill_booking(page, language)
        page.get_by_role("radio", name="Instagram", exact=True).check()
        page.evaluate("window.__bookingClipboardFailure = true")
        page.locator("form").filter(has=page.locator("#booking-name")).locator("button[type='submit']").click()
        expect(page.get_by_role("alert")).to_be_visible()
        assert not evidence["links"] and not evidence["clipboard"], "Clipboard failure must not navigate or claim a copy."
        expect(page.locator("#booking-preview")).not_to_be_editable()
        page.get_by_role("button", name=BOOKING_UI[language]["select"], exact=True).click()
        expect(page.locator("#booking-preview")).to_be_focused()
        assert page.locator("#booking-preview").evaluate("input => input.selectionStart === 0 && input.selectionEnd === input.value.length")
        expect(page.locator("#booking-preview")).to_have_value(message)
        assert_health(page, evidence, f"clipboard-failure-manual-selection-{language}")
        page.screenshot(path=str(SHOTS / f"clipboard-failure-390-{language}.png"), animations="disabled")
        with page.expect_request("https://ig.me/m/mama_i_malish_tj") as fallback:
            page.get_by_role("link", name=BOOKING_UI[language]["openInstagram"], exact=True).click()
        assert fallback.value.url == "https://ig.me/m/mama_i_malish_tj"
        assert evidence["links"] == ["https://ig.me/m/mama_i_malish_tj"] and not evidence["clipboard"]
        assert_health(page, evidence, f"clipboard-failure-instagram-fallback-{language}")
        checks += 1
        context.close()
        print(f"PASS {language}: hero/service prefill, native/custom validation, WhatsApp draft, Instagram copy/open and copy failure", flush=True)

    browser.close()

print(f"Static browser smoke complete: {checks} checks; no backend or external messages.", flush=True)
