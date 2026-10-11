# Cloudflare Pages

Git-проект: `mama-i-malish-tj`, репозиторий `safarovmurod/cupping-massage`.
Основной адрес: `https://mama-i-malish-tj.pages.dev`.
Наличие проекта и адреса не подтверждает успешную публикацию: проверьте конкретную сборку в Deployments.

## Автоматическая публикация

| Настройка | Значение |
| --- | --- |
| Production branch | `main` |
| Automatic production deployments | Enabled |
| Preview branches | None |
| Build image | Version 3 |
| Node | `NODE_VERSION=24` |
| Build command | `npm run build` |
| Build output | `dist` |
| Root directory | Корень репозитория |

После push в `main` Cloudflare собирает и публикует новую версию. GitHub App должна иметь доступ только к этому репозиторию.
Preview отключены до настройки отдельного облачного Supabase staging.
Для Preview нужны `VITE_DEPLOY_STAGE=preview` и отдельные URL/публичный ключ staging; production, localhost и CI mock запрещены.
Cloudflare guard дополнительно проверяет соответствие ветки и stage при сборке.

Документация: [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [Branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).

## Переменные Production

Задавайте переменные только в **Settings → Production → Variables and secrets**:

| Переменная | Значение |
| --- | --- |
| `VITE_DEPLOY_STAGE` | `production` |
| `VITE_PRODUCTION_ORIGIN` | `https://mama-i-malish-tj.pages.dev` |
| `VITE_SUPABASE_URL` | `https://alafwzjqxwjanoqrirwi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Существующий публичный anon key прежнего backend |

Не помещайте значение ключа в Git, отчёты или логи. `service_role` и secret API keys запрещены в `VITE_*`.
SQL, RLS, реальные записи и ключи Supabase при переносе frontend не меняются.
`VITE_PRODUCTION_ORIGIN` содержит стабильный адрес, а не `CF_PAGES_URL` конкретной сборки.
Runtime разрешает production backend только на указанном origin.
После изменения переменных нужна новая сборка.

Postbuild обновляет canonical, Open Graph, robots и sitemap в `dist` из `VITE_PRODUCTION_ORIGIN`.
`public/_headers` переносит существующие security headers и закрывает страницы аккаунта от индексации.
Pages обслуживает route HTML и SPA fallback без catch-all `_redirects`, который мог бы перехватывать assets.

Документация: [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Headers](https://developers.cloudflare.com/pages/configuration/headers/).

## OAuth и recovery: отдельное действие владельца

В прежнем Supabase открыть **Authentication → URL Configuration → Redirect URLs**.
Проверить точные разрешённые адреса и, после согласования изменения настроек, добавить отсутствующие:

```text
https://mama-i-malish-tj.pages.dev/
https://mama-i-malish-tj.pages.dev/reset-password
```

Старые разрешённые адреса сохранить. Широкий wildcard для всех `pages.dev` не добавлять.
Код передаёт OAuth redirect на корень текущего сайта, recovery — на `/reset-password`.
Supabase callback остаётся `https://alafwzjqxwjanoqrirwi.supabase.co/auth/v1/callback`.
Google OAuth Client ID/Secret, provider и Supabase Site URL не заменять при переносе хостинга.
Изменения OAuth-настроек выполняются отдельно; реальный вход и recovery требуют самостоятельной проверки.

Документация: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Проверка и откат

После успешной production-сборки сверить commit SHA и Build Logs.
Проверить HTTPS, прямое открытие и обновление `/`, `/contact`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/admin` и `/admin/users`;
загрузку assets, headers, canonical, robots, sitemap, консоль и сеть.
Не отправлять тестовые заявки в production. Auth/CRUD с синтетическими данными проверять на отдельном staging.

Если есть предыдущая успешная production-сборка Pages, открыть **Deployments → All deployments → меню нужной сборки → Rollback to this deployment**, сверить SHA и проверить основной адрес.
Preview не подходит для rollback. До появления предыдущей успешной production-сборки цели для отката нет.
Rollback переключает опубликованные файлы и не откатывает Supabase.
Старый Vercel-проект и опубликованная версия сохраняются. После подтверждения безопасной Cloudflare конфигурации в `vercel.json` задано `git.deploymentEnabled.main=false`, чтобы новые push в main не запускали Vercel Hobby production. Git-интеграция не удаляется; для возобновления сборок нужно отдельное решение с подходящим тарифом.

Документация: [Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
