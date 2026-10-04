"""Check 320px layouts after building and starting the production preview.

python tests/browser/narrow-layout.py http://127.0.0.1:4173
Requires Python Playwright and Chromium; backend requests are mocked.
"""
import sys
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173'
paths = ['/', '/contact', '/login', '/register', '/forgot-password', '/reset-password', '/missing-page']
checks = 0
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for language in ['ru', 'tj', 'en']:
        context = browser.new_context(viewport={'width': 320, 'height': 740}, reduced_motion='reduce')
        context.add_init_script(f"try {{ localStorage.setItem('lang', '{language}'); localStorage.setItem('cookieConsent', 'declined') }} catch {{}}")
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('https://*.supabase.co/**', lambda r: r.fulfill(status=200, json=[]))
        page.route('https://yandex.uz/**', lambda r: r.abort())
        for path in paths:
            page.goto(base + path)
            expect(page.locator('h1')).to_be_visible()
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(1500)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (language, path)
            assert not errors, errors
            if path == '/':
                page.screenshot(path=f'/tmp/cupping-320px-{language}.png', full_page=True)
            checks += 1
        print(f'PASS 320px: {language}, all {len(paths)} routes without overflow or runtime errors', flush=True)
        context.close()
    browser.close()
print(f'{checks} narrow-screen checks passed; all backend requests mocked.')
