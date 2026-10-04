"""Production-preview regression: failed lazy imports must remain recoverable.

Run after npm run build + npm run preview:
python tests/browser/load-recovery.py http://127.0.0.1:4173
Requires Python Playwright and Chromium. All backend requests are mocked.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173'
screenshots = Path('/tmp/cupping-load-recovery')
screenshots.mkdir(exist_ok=True)
copy = {
    'ru': ('Не удалось загрузить эту часть сайта', 'Обновить страницу', 'Закрыть', 'Меню'),
    'tj': ('Ин қисми сайт бор нашуд', 'Аз нав бор кардан', 'Пӯшидан', 'Меню'),
    'en': ('This part of the site could not load', 'Reload page', 'Close', 'Explore'),
}

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    checks = 0
    for language, (title, reload_label, close_label, menu_label) in copy.items():
        for feature, path, chunk, width in [('contact', '/contact', 'Contact-', 1440), ('menu', '/', 'MobileMenu-', 390)]:
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            context.add_init_script(f"try {{ localStorage.setItem('lang', '{language}'); localStorage.setItem('cookieConsent', 'declined') }} catch {{}}")
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.route('https://*.supabase.co/**', lambda r: r.fulfill(status=200, json=[]))
            page.route('https://yandex.uz/**', lambda r: r.abort())
            blocked = {'value': True}
            page.route('**/assets/' + chunk + '*.js', lambda r: r.abort('failed') if blocked['value'] else r.continue_())
            page.goto(base + path)
            if feature == 'menu':
                page.get_by_role('button', name=menu_label, exact=True).click()
            alert = page.get_by_role('alert')
            expect(alert).to_contain_text(title)
            assert not errors, errors
            if feature == 'menu':
                expect(page.locator('h1')).to_be_visible()
                alert.get_by_role('button', name=close_label, exact=True).click()
                trigger = page.get_by_role('button', name=menu_label, exact=True)
                expect(trigger).to_be_focused()
                expect(trigger).to_have_attribute('aria-expanded', 'false')
                trigger.click()
                expect(alert).to_be_visible()
            page.screenshot(path=str(screenshots / f'{language}-{feature}-failure.png'))
            print(f'PASS {language}: {feature} failure remains usable, no uncaught errors', flush=True)
            checks += 1
            blocked['value'] = False
            with page.expect_navigation():
                alert.get_by_role('button', name=reload_label, exact=True).click()
            if feature == 'menu':
                page.get_by_role('button', name=menu_label, exact=True).click()
                expect(page.get_by_role('dialog')).to_be_visible()
            else:
                expect(page.locator('#contact-name')).to_be_visible()
                assert page.url.endswith('/contact')
            expect(page.get_by_role('alert')).to_have_count(0)
            assert not errors, errors
            print(f'PASS {language}: {feature} recovers after connection is restored', flush=True)
            checks += 1
            context.close()
    browser.close()
    print(f'{checks} loading failure/recovery checks passed; all backend requests mocked.')
