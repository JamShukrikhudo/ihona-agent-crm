# ihona-agent-crm

B2B-кабинет для агентов/менеджеров продаж/застройщиков — отдельное Nuxt 3
приложение, **не** часть публичного сайта ihona.tj и **не** ihona-crm
(отдельное Laravel/Filament-приложение на crm.ihona.tj). Roadmap: 7 спринтов,
от read-only шахматки до CRM-воронки и Telegram-уведомлений.

## Архитектура

- Расширяет `../ihona-frontend` как Nuxt layer (`extends` в `nuxt.config.ts`)
  — наследует брендовые токены/шрифты из его `assets/css/main.css`, но
  деплоится отдельно, со своим доменом и auth-моделью.
- Backend — та же Laravel-инсталляция `ihona` (REST API +
  Reverb/WebSocket). Reverb основного приложения слушает на порту `8081`
  и проксируется nginx-ом через **`/reverb`** (не `/app` — тот путь уже
  занят Filament-панелью основного сайта; см. комментарий в
  `app/composables/useEcho.ts`).
- Auth: тот же `POST /v1/auth/token` (Sanctum), что и у публичного сайта,
  но с полем `roles` в ответе (добавлено в `AuthTokenController`) — на нём
  завязаны `middleware/agent.ts`, `sales-manager.ts`, `developer-admin.ts`.
- `GET /v1/auth/user` — новый эндпоинт, восстанавливает `{user, roles}`
  по токену при перезагрузке страницы.

## Sprint 0 — Фундамент (готово)

- [x] Nuxt 3 проект, расширяющий `ihona-frontend`
- [x] `composables/useApi.ts` — Bearer-токен, 401 → редирект на `/login`
- [x] `composables/useEcho.ts` — подключение к Reverb через `/reverb`
- [x] `stores/useUnitsStore.ts` — каркас под шахматку (наполняется в Sprint 1)
- [x] Брендовые токены в `assets/css/main.css` (`brand`, `brand-dark`,
      `status-free/reserved/deposit/sold`)
- [x] `middleware/agent.ts`, `sales-manager.ts`, `developer-admin.ts`
- [x] Готово когда: пустой кабинет разворачивается, логин работает, Echo
      подключается (видно в devtools websocket-фрейм) — проверено на
      `/` (защищена `agent` middleware), статус сокета показан на странице

## Разработка

```bash
npm install
npm run dev
```

Нужен `.env` (см. `.env.example`) и реальный пользователь на бэкенде с
одной из ролей `agent`/`sales-manager`/`developer-admin`, назначенной через
Spatie Permission на его текущей команде.
