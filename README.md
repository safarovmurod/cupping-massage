# Мама и малыш
Статический сайт услуг и записи: **https://mama-i-malish-tj.pages.dev/**.

React + TypeScript + Vite + MUI + React Router. Русский, тоҷикӣ и English; выбор языка сохраняется локально.

## Что делает сайт
- Шесть услуг с фотографиями, проверенными ценами и правилами приёма. Электрофорез объединён: детям 15, взрослым 20 сомони в день.
- «Записаться» прокручивает к форме; выбор услуги в карточке переносится в форму.
- WhatsApp открывает подготовленный черновик для **+992 00 733 6264**. Сообщение отправляет сам клиент в WhatsApp.
- Instagram: сайт копирует сообщение, открывает Direct **@mama_i_malish_tj**; клиент вставляет текст и отправляет его. При запрете clipboard остаются текст, ручное копирование и ссылка.
- Яндекс Карты: точка **38.585812, 68.716695**, Зарафшон 22/1, Душанбе. Маршрут открывается в Картах, старт/геолокацию выбирает посетитель там.
- Отсутствуют аккаунты, регистрация, Google OAuth, админка, backend-запросы, tracking и сохранение заявок. Форма не сообщает об отправке до действий клиента в мессенджере.

## Запуск
Node.js 24:
```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run preview
npm audit --audit-level=moderate
```
Backend и ключи не нужны. Единственная необязательная переменная — `VITE_PRODUCTION_ORIGIN` для SEO; по умолчанию используется установленный Pages адрес.

## Публикация
Cloudflare Pages Git project `mama-i-malish-tj`: branch `main`, `npm run build`, output `dist`, `NODE_VERSION=24`.
Push в main автоматически обновляет сайт. Verify и browser/axe запускаются на main и PR. Подробности: [Cloudflare setup](docs/cloudflare-pages.md).

Старый Vercel проект сохранён; новые main deployments отключены в `vercel.json`. Платный тариф не подключался.

## Код и картинки
- `src/pages/Home.tsx` — информационные секции и локация.
- `src/components/home/BookingForm.tsx` — запись через выбранный мессенджер.
- `src/lib/brand.ts`, `site-copy.ts`, `booking-copy.ts` — тексты RU/TJ/EN.
- `src/lib/booking.ts` — validation, сообщение с пустыми строками, encoding WhatsApp.
- `src/lib/location.ts` — координаты и ссылки.
- `public/images/` — лёгкие WebP. Новые изображения сгенерированы как иллюстрации, не являются фотографиями реальных клиентов или сотрудников. [Происхождение](public/licenses/generated-images.md).

## История безопасности
Удалено только подключение приложения к прежнему backend. Облачная база, записи, RLS, OAuth и ключи не изменялись.
`supabase/`, `testing/isolated/`, SQL tests и `security/` — сохранённые исторические схемы/проверки; они не входят в сайт и не запускаются при обычном build/test.
Исторический isolated Supabase workflow оставлен только для ручного запуска. Ранее успешные GitHub runs остаются в истории; текущие проверки относятся к статическому сайту.
