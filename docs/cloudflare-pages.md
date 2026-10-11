# Cloudflare Pages
Проект `mama-i-malish-tj`, repo `safarovmurod/cupping-massage`.
Публичный адрес: **https://mama-i-malish-tj.pages.dev/**.

| Настройка | Значение |
| --- | --- |
| Production branch | main |
| Automatic deployments | Enabled |
| Preview branches | None |
| Build image | Version 3 |
| NODE_VERSION | 24 |
| Build command | npm run build |
| Output | dist |
| Root | Корень репозитория |

GitHub App `Cloudflare Workers and Pages` имеет доступ только к этому репозиторию.
`VITE_PRODUCTION_ORIGIN=https://mama-i-malish-tj.pages.dev` — необязательная явная настройка SEO.
Сайт не использует Supabase, OAuth или API keys. Неиспользуемые `VITE_DEPLOY_STAGE`, `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` удалены из Production build settings Pages. Облачная база и её настройки сохранены.

Preview оставлены выключенными согласно текущей конфигурации. Для этого статического приложения отдельный staging backend уже не требуется.
После push проверьте success именно новой сборки, её SHA и основной HTTPS URL.

`_headers` задаёт security headers и immutable cache для hashed assets.
CSP connect-src разрешает только свой origin; Yandex widget загружается по запросу пользователя в iframe.
`/contact` переносит на `/#contact`; старые account/admin адреса показывают 404 с noindex.
`404.html` позволяет Pages возвращать HTTP 404 для отсутствующих страниц.

Vercel: `git.deploymentEnabled.main=false` сохраняет прежний deployment и отключает будущие main builds. Коммерческий сайт опубликован на Cloudflare, не на Vercel Hobby.

## Запись
WhatsApp — официальный click-to-chat с подготовленным текстом: [документация](https://faq.whatsapp.com/5913398998672934).
Instagram — копирование → Direct → вставка и отправка клиентом; недокументированный text parameter не используется.
Сайт не отправляет сообщения через API и не хранит форму.
Yandex destination проверен по owner coordinates. Геолокация определяется только после выбора пользователя в открытых Картах.

## Проверка и откат
`npm run lint`, `npm test`, `npm run build`, `npm audit`; GitHub browser smoke + axe.
Проверить мобильный layout, маршруты, сообщения, clipboard fallback, HTTPS, headers, photos и отсутствие Supabase requests.
Rollback в Pages переключает файлы на предыдущую успешную Production сборку; SQL/данные не откатываются.
Предыдущая версия содержит legacy Auth/backend и не является текущим статическим приложением.
