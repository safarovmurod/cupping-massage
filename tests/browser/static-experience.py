"""Exercise the catalogue, mobile navigation and native scroll animation locally."""
import sys
import json
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173").rstrip("/")
ORIGIN = urlparse(BASE)
assert ORIGIN.scheme == "http" and ORIGIN.hostname in ("127.0.0.1", "localhost")
assert not ORIGIN.username and not ORIGIN.password and not ORIGIN.path and not ORIGIN.query and not ORIGIN.fragment
checks = 0

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    for width in (320, 390, 1440):
        context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
        errors = []

        def intercept(route):
            parsed = urlparse(route.request.url)
            if (parsed.scheme, parsed.netloc) == (ORIGIN.scheme, ORIGIN.netloc):
                route.continue_()
            elif parsed.hostname == "yandex.ru" and route.request.resource_type == "document":
                route.fulfill(status=200, content_type="text/html", body="<title>Local map</title>")
            else:
                errors.append("Unexpected network request: " + route.request.url)
                route.abort("blockedbyclient")

        context.route("**/*", intercept)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(BASE, wait_until="networkidle")
        expect(page.locator("html")).to_have_attribute("data-app-ready", "true")
        assert page.locator("html").get_attribute("lang") == "ru"
        expect(page.locator(".mm-hero .mm-direction a")).to_have_count(14)
        expect(page.locator(".mm-hero .mm-highlights")).to_have_count(0)
        expect(page.locator("#care .mm-highlights > span")).to_have_count(3)
        expect(page.locator(".mm-header a[href$='#contact']")).to_have_count(0)
        expect(page.locator(".mm-map-card iframe")).to_have_count(1)
        expect(page.locator(".mm-map-placeholder")).to_have_count(0)
        assert page.locator(".mm-depth").first.evaluate("el => getComputedStyle(el).animationName") == "none"
        for group_index, group in enumerate(page.locator("#services .mm-direction").all()):
            for link in group.locator("a").all():
                title = link.inner_text().strip()
                link.click()
                expect(page.locator("#booking-service")).to_have_text(title)
                expect(page.locator("input[name='forWhom']")).to_have_value("woman" if group_index == 0 else "child")
                checks += 1
        for link in page.locator("a[href*='wa.me'], a[href*='instagram.com']").all():
            assert link.locator("svg").count(), "A messenger contact must have its icon."
        if width < 700:
            expect(page.locator(".mm-bottom-nav")).to_be_visible()
            page.locator(".mm-bottom-nav a[href='#location']").click()
            expect(page.locator(".mm-bottom-nav a[aria-current='location']")).to_have_attribute("href", "#location")
            assert 0 <= page.locator("#location").bounding_box()["y"] < 900
        else:
            expect(page.locator(".mm-bottom-nav")).to_be_hidden()
        assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
        assert not errors, errors
        checks += 1
        context.close()
        print(f"PASS {width}px: 14 exact selections, recipient, icons, navigation, automatic map and reduced motion", flush=True)

    context = browser.new_context(java_script_enabled=False, reduced_motion="reduce")
    context.route("https://yandex.ru/**", lambda route: route.fulfill(status=200, content_type="text/html", body="<title>Local map</title>"))
    page = context.new_page()
    response = page.goto(BASE)
    assert response.status == 200
    expect(page.locator("h1")).to_be_visible()
    expect(page.locator(".mm-hero .mm-direction a")).to_have_count(14)
    expect(page.locator("link[rel=canonical]")).to_have_attribute("href", "https://mama-i-malish-tj.pages.dev/")
    schema = json.loads(page.locator("#site-schema").text_content())
    assert schema["telephone"] == "+992007336264"
    assert schema["geo"]["latitude"] == 38.585812
    assert page.locator("#site-schema").count() == 1
    response = page.goto(BASE + "/missing-static-page")
    assert response.status == 404
    expect(page.locator("meta[name=robots]")).to_have_attribute("content", "noindex, nofollow")
    expect(page.locator("#site-schema, link[rel=canonical]")).to_have_count(0)
    expect(page.get_by_text("404", exact=True)).to_be_visible()
    context.close()
    checks += 1
    print("PASS SEO without JavaScript: visible content, canonical, business schema and true 404", flush=True)

    page = browser.new_page(viewport={"width": 390, "height": 900}, reduced_motion="no-preference")
    page.route("https://yandex.ru/**", lambda route: route.fulfill(status=200, content_type="text/html", body="<title>Local map</title>"))
    page.goto(BASE, wait_until="networkidle")
    assert page.evaluate("CSS.supports('animation-timeline', 'view()')")
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
    card = page.locator(".mm-service-card").first
    top = card.evaluate("el => el.getBoundingClientRect().top + scrollY")
    page.evaluate("y => scrollTo(0, y)", top - 800)
    page.wait_for_timeout(200)
    entering = card.evaluate("el => getComputedStyle(el).transform")
    page.evaluate("y => scrollTo(0, y)", top - 100)
    page.wait_for_timeout(200)
    settled = card.evaluate("el => getComputedStyle(el).transform")
    assert entering != settled, (entering, settled)
    assert "matrix3d" in entering
    checks += 1
    browser.close()
print(f"Static experience complete: {checks} checks.", flush=True)
