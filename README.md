# Sell is Life — лендинг и админка аналитики

Одностраничный лендинг на **Next.js 14 (App Router)** с тёмным UI, анимациями (**Framer Motion**) и админ-панелью (**/admin**) с графиками (**Recharts**). События и заявки (форма Starter Pack, клики и просмотры) пишутся в **файл на диске** приложения: **`data/site-events.jsonl`** — отдельная PostgreSQL/SQLite **не нужна**.

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и задайте переменные:

   - `ADMIN_PASSWORD` — пароль для входа в `/admin`.
   - `NEXT_PUBLIC_SITE_URL` — URL сайта (локально порт как в `npm run dev`, по умолчанию 3030).

2. Установите зависимости:

   ```bash
   npm install
   ```

3. Запуск в режиме разработки:

   ```bash
   npm run dev
   ```

   Откройте тот порт, который покажет Next (в скрипте указан **3030**). Админка: **`/admin`**.

## Сборка для продакшена

```bash
npm run build
npm start
```

На сервере нужен **Node.js** и возможность **писать** в каталог приложения (создаётся папка **`data/`**).

## Шрифты

Заголовки: **Oswald** (display), текст: **Manrope** — через `next/font`, с поддержкой кириллицы. Bebas Neue в Google Fonts не отдаёт subset `cyrillic`, поэтому для русскоязычного контента выбран близкий по характеру Oswald.

## Где менять контент и ссылки

- **Тексты** — `config/content.ts` (все блоки лендинга, FAQ, тарифы, отзывы).
- **Внешние ссылки** (Google Forms, Telegram, оплата, YouTube) — `config/links.ts`.
- **Картинки** — положите свои файлы в `public/images/` с теми же именами (`hero-photo.jpg`, `review-1.jpg`, …) или обновите пути в `config/content.ts`.

## Аналитика

- Клиент шлёт события на `POST /api/track` (см. `lib/track.ts`).
- События: `page_view`, `click_starter_pack`, `click_product`, `click_pricing`, `scroll_depth` (25/50/75/100).
- UTM с текущего URL добавляются в `data` событий.
- Заявки формы: `POST /api/starter-pack`.
- Админка читает агрегаты через `GET /api/analytics` (после логина).

## Структура (основное)

- `app/(site)/` — лендинг (навбар, футер, трекинг).
- `app/admin/` — дашборд и логин.
- `app/api/track`, `app/api/starter-pack`, `app/api/analytics`, `app/api/admin/login`, `app/api/admin/logout`.
- `lib/site-event-store.ts` — запись/чтение событий из `data/site-events.jsonl`.
- Доступ к `/admin`: проверка cookie в серверном `app/admin/page.tsx` и в `GET /api/analytics`.
