# ihona-agent-crm

B2B-кабинет для агентов/менеджеров продаж/застройщиков — отдельное Nuxt 3
приложение, не часть публичного сайта ihona.tj. Roadmap: 7 спринтов, от
read-only шахматки до CRM-воронки и Telegram-уведомлений.

## Архитектура

- **Backend — `ihona-crm`** (crm.ihona.tj), не основной ihona.tj: у него уже
  есть весь домен шахматки (`DeveloperProject → Building → Floor → Unit`,
  `UnitStatus`, `UnitStatusChanged implements ShouldBroadcast`, `reserved_by`/
  `reserved_until`, планировщик `ExpireStaleUnitReservations`) — построено в
  более ранней сессии, этот репозиторий только добавил недостающий REST/API
  слой (`Sanctum`, `AuthController`, `UnitController`) поверх готовой модели.
- Своя CSS с брендовыми токенами (`assets/css/main.css`), скопированными из
  `ihona-frontend`, а не через Nuxt `extends` — расширение layer'ом тащило
  публичные страницы витрины (`/properties`) прямо в роутинг этого кабинета,
  рабочего способа исключить только `pages/` у Nuxt нет.
- Auth: `POST /v1/auth/token` (Sanctum, Bearer, не stateful SPA cookie) —
  ihona-crm's `AuthController`, отвечает `{id, name, email, roles}`. Роли не
  team-scoped в этом приложении (`config('permission.teams') === false`),
  в отличие от основного ihona.tj.
- `GET /v1/auth/user` — восстановление `{user, roles}` по токену при
  перезагрузке страницы.
- `middleware/agent.ts`, `sales-manager.ts`, `developer-admin.ts` — три
  уровня доступа, роли `agent`/`sales-manager`/`developer-admin` созданы в
  ihona-crm отдельно от его "родных" ролей (там их не было вообще).
- Реальный API: `GET /api/projects/{id}/units`, `POST /api/units/{id}/reserve`
  (`{hours}`, 409 при конфликте с текстом «Не удалось: юнит X уже
  забронировал агент Y»), `POST /api/units/{id}/release` (`{reason}`),
  `GET /api/units/{id}/history` — все проверены живыми запросами на проде.

### Важный найденный и исправленный баг

`ihona-crm`'s `TransitionUnit` проверял `canTransitionTo()` на переданном
инстансе юнита ДО блокировки строки — два агента, бронирующие один юнит в
пределах ~200мс, оба видели `status=available` и оба проходили проверку.
Исправлено: `Unit::query()->lockForUpdate()->findOrFail(...)` внутри
транзакции, ПЕРЕД проверкой перехода — ровно тот сценарий, который
описывает Sprint 2 роадмапа ("два агента, один клик с разницей 200мс").

Второй баг, найденный тем же живым тестом: `config/broadcasting.php`
использовал публичный `REVERB_HOST`/`PORT`/`SCHEME` не только для клиента
(браузер), но и для серверных вызовов Laravel → Reverb — из-за этого запрос
на `/apps/{id}/events` уходил обратно через nginx, у которого нет маршрута
для этого пути (только `/app/` для самого вебсокета), и Pusher-клиент
получал 404-страницу приложения вместо JSON. Исправлено — серверные вызовы
идут напрямую на `127.0.0.1:8080`, в обход nginx/TLS.

## Sprint 0+1+2 — готово

- [x] Nuxt 3 проект, `composables/useApi.ts` (401 → `/login`),
      `composables/useEcho.ts` (Reverb, путь берётся из конфига)
- [x] `stores/useUnitsStore.ts`, `stores/auth.ts` (Pinia)
- [x] Брендовые токены, 3 middleware ролей
- [x] Реальный REST API на ihona-crm, проверен: список юнитов, бронь,
      конфликт 409, освобождение, история — все живыми запросами к проду
- [x] Защита от гонки (`lockForUpdate`) — реализована и логически
      проверена (последовательные запросы дают ожидаемый 409); настоящий
      двухбраузерный Playwright-тест на одновременный клик — ещё впереди

## Разработка

```bash
npm install
npm run dev
```

`.env` — см. `.env.example`. Нужен пользователь в ihona-crm с одной из
ролей `agent`/`sales-manager`/`developer-admin`.
