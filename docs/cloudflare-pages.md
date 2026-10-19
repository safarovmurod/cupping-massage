# Cloudflare Pages

Рабочий адрес: **https://mama-i-malish-tj.pages.dev/**. Целевое название GitHub-репозитория: `safarovmurod/mama-i-malish-tj`; до подтверждения переименования используется `safarovmurod/cupping-massage`.

| Настройка | Значение |
| --- | --- |
| Pages project | mama-i-malish-tj |
| Production branch | main |
| Build command | npm run build |
| Output directory | dist |
| Root directory | Корень репозитория |
| Node.js | 24 |
| Production origin | https://mama-i-malish-tj.pages.dev |

После переименования репозитория проверить, что GitHub App **Cloudflare Workers and Pages** продолжает иметь доступ именно к нему, а Pages показывает новый репозиторий. Проверить успешную production-сборку с SHA нового коммита, загрузку главной страницы, CSS/JS и изображений. Настройка Git integration в аккаунте не подтверждается изменением файлов репозитория.

Сайт статический: Google OAuth, Supabase, Vercel и секреты для сборки не нужны. Удалить неиспользуемые build variables прежнего backend из обеих сред Pages, сохранив `NODE_VERSION=24` и при необходимости `VITE_PRODUCTION_ORIGIN`.

`public/_headers` задаёт CSP, защитные заголовки, noindex для старых адресов и кеш hashed assets. Yandex-карта загружается автоматически. `/contact` переносит на `/#contact`; отсутствующие и прежние account/admin адреса показывают 404 с noindex.

## Внешняя очистка

- GitHub About website: https://mama-i-malish-tj.pages.dev/.
- Vercel: отключить Git integration и удалить старый проект этого сайта. Пользователь подтвердил удаление Vercel-проекта; `vercel.json` также удалён.
- GitHub Deployments: определить старые Vercel deployments, пометить их inactive и удалить; сохранить актуальную запись Cloudflare. Количество старых записей не является ошибкой приложения.
- Прежний Supabase reference из истории: `alafwzjqxwjanoqrirwi`. Проверить владельца, состав данных и отсутствие других использующих его приложений перед удалением старых облачных данных и Google OAuth. Файлы старой схемы не входят в текущую версию.
- Рабочий Google/Cloudflare/GitHub аккаунт пользователя не удалять. Очищать только интеграции и ресурсы прежнего сайта.

Cloudflare Pages и публичный сайт проверены после обновления: production check успешен, HTML и bundle содержат новый каталог и мобильную навигацию. Дополнительный Cloudflare API token для автоматической публикации не нужен.

Для оставшейся очистки нужны права соответствующих аккаунтов. Текущий GitHub integration token получает HTTP 403 при изменении репозитория и deployments. Нужен `REPO_ADMIN_TOKEN` с Administration/Deployments/Secrets write, а также `SUPABASE_ACCESS_TOKEN` для прежней базы. Vercel-проект удалён пользователем, токен Vercel больше не требуется. Без успешного ответа API и проверки результата их нельзя считать выполненными. Токены вводятся только в защищённые настройки среды.

## Проверки перед публикацией

`npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=moderate`, browser smoke и axe. Проверить главную и контактный alias, новый каталог, WhatsApp/Instagram, автоматическую карту, desktop/mobile и reduced motion.
