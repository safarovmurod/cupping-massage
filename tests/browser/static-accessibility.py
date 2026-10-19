"""Local Chromium/axe audit of the static landing in RU/TJ/EN.

No login fixtures or backend. External requests, including map frames, are
intercepted before they reach the network. Evidence stays outside the repo.
"""
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173").rstrip("/")
ORIGIN = urlparse(BASE)
assert (ORIGIN.scheme == "http" and ORIGIN.hostname in ("127.0.0.1", "localhost")
        and not ORIGIN.username and not ORIGIN.password and not ORIGIN.path
        and not ORIGIN.query and not ORIGIN.fragment), "Use a local HTTP preview origin only."
ROOT = Path(__file__).resolve().parents[2]
AXE = Path(os.environ.get("AXE_SCRIPT_PATH", str(ROOT / "node_modules" / "axe-core" / "axe.min.js")))
SHOTS = Path(os.environ.get("MAMA_SCREENSHOT_DIR", "/tmp/mama-static-screenshots"))
SHOTS.mkdir(parents=True, exist_ok=True)
assert AXE.is_file(), "Install axe-core@4.10.3 with --no-save --package-lock=false."
LANGS = {
    "ru": {"open": "Открыть меню", "close": "Закрыть меню", "woman": "Для женщины"},
    "tj": {"open": "Менюро кушоед", "close": "Менюро пӯшед", "woman": "Барои зан"},
    "en": {"open": "Open menu", "close": "Close menu", "woman": "For a woman"},
}
TAGS = ("wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa")
findings = []
scans = 0


def new_page(browser, width, language):
    context = browser.new_context(viewport={"width": width, "height": 900},
                                  reduced_motion="reduce", service_workers="block")
    errors = []

    def intercept(route):
        parsed = urlparse(route.request.url)
        host = parsed.hostname or ""
        if "supabase" in host or parsed.path.startswith(("/auth/v1/", "/rest/v1/")):
            errors.append("Unexpected backend request: " + route.request.url)
            route.abort("blockedbyclient")
        elif (parsed.scheme, parsed.netloc) == (ORIGIN.scheme, ORIGIN.netloc):
            route.continue_()
        elif route.request.resource_type == "document" and host in ("yandex.ru", "yandex.com", "maps.yandex.ru"):
            route.fulfill(status=200, content_type="text/html", body="<title>Local map placeholder</title>")
        else:
            errors.append("Unexpected external request: " + route.request.url)
            route.abort("blockedbyclient")

    context.route("**/*", intercept)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    missing_documents = set()
    page.on("response", lambda response: missing_documents.add(response.url) if response.status == 404 and response.request.is_navigation_request() else None)
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" and not (
        message.location.get("url") in missing_documents and "status of 404" in message.text
    ) else None)
    return context, page, errors


def choose_language(page, language):
    if language != "ru":
        page.locator(".mm-language-select [role=combobox]").click()
        page.locator("[role=option][data-value='" + language + "']").click()


def scan(page, label, errors, full_page=False):
    global scans
    page.evaluate("document.fonts.ready")
    if not page.evaluate("Boolean(window.axe)"):
        page.add_script_tag(path=str(AXE))
    violations = page.evaluate("""async tags => {
      const results = await window.axe.run(document, {runOnly: {type: 'tag', values: tags}});
      return results.violations.map(item => ({id:item.id, impact:item.impact, help:item.help,
        nodes:item.nodes.map(node => ({target:node.target, summary:node.failureSummary}))}));
    }""", list(TAGS))
    if page.evaluate("document.documentElement.scrollWidth > innerWidth"):
        violations.append({"id": "horizontal-overflow", "impact": "serious"})
    if errors:
        violations.append({"id": "browser-or-network-error", "errors": list(errors)})
    if violations:
        findings.append({"state": label, "violations": violations})
        print("FAIL", label, json.dumps(violations, ensure_ascii=False), flush=True)
    else:
        print("PASS axe WCAG-tagged", label, flush=True)
    page.screenshot(path=str(SHOTS / ("axe-" + label + ".png")),
                    full_page=full_page, animations="disabled")
    scans += 1


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--no-sandbox"])
    for width in (390, 1440):
        for language, labels in LANGS.items():
            context, page, errors = new_page(browser, width, language)
            for path, route_label in (("/", "home"), ("/contact", "contact"), ("/missing-static-page", "404")):
                page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
                expect(page.locator("h1").first).to_be_visible(timeout=15000)
                expect(page.locator("html")).to_have_attribute("data-app-ready", "true")
                choose_language(page, language)
                if path == "/contact":
                    expect(page).to_have_url(BASE + "/#contact")
                    page.locator("#contact").scroll_into_view_if_needed()
                scan(page, f"{route_label}-{width}-{language}", errors, full_page=path == "/")

            page.goto(BASE, wait_until="domcontentloaded")
            expect(page.locator("html")).to_have_attribute("data-app-ready", "true")
            choose_language(page, language)
            if width == 390:
                page.get_by_role("button", name=labels["open"], exact=True).click()
                expect(page.locator("#mm-mobile-menu")).to_be_visible()
                scan(page, f"mobile-menu-{language}", errors)
                page.get_by_role("button", name=labels["close"], exact=True).click()
                expect(page.locator("#mm-mobile-menu")).to_be_hidden()

            # Reach real custom validation, rather than only the browser's native
            # required-field bubble. Audit the rendered error text and associations.
            page.locator("#booking-name").fill("Synthetic accessibility check")
            page.locator("#booking-phone").fill("invalid12345")
            page.locator("#booking-service").click()
            page.get_by_role("option").nth(1).click()
            page.locator("#booking-recipient").click()
            page.get_by_role("option", name=labels["woman"], exact=True).click()
            page.locator("#booking-day").fill((date.today() + timedelta(days=7)).isoformat())
            page.locator("form").filter(has=page.locator("#booking-name")).locator("button[type='submit']").first.click()
            expect(page.locator("#booking-phone")).to_have_attribute("aria-invalid", "true")
            scan(page, f"booking-validation-{width}-{language}", errors)
            context.close()
    browser.close()

report = {"axeVersion": "4.10.3", "scans": scans, "widths": [390, 1440],
          "languages": list(LANGS), "tags": list(TAGS), "findings": findings,
          "scope": "Local static UI only; no backend, account or external message."}
(SHOTS / "static-accessibility-results.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
assert not findings, f"{len(findings)} state(s) have accessibility/runtime/network findings."
print(f"Static accessibility complete: {scans} scans, zero WCAG-tagged violations.", flush=True)
