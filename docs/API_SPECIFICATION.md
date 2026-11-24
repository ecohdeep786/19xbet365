# API Specification

Base URL: `http://127.0.0.1:4000/api`  
Authentication: HttpOnly cookie `xbet_session`, established by login/register.  
Content type: `application/json` except static assets.  
Errors: `{ "error": "code", "message": "human-readable" }`.

## Public

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | none | DB latency, server time, version |
| GET | `/bootstrap` | optional | sports, matches, games, promotions, tournaments, settings, help articles, announcements |
| GET | `/matches?sport=&live=&search=` | none | fixture catalogue |
| GET | `/games?category=&search=` | none | game catalogue |
| GET | `/games/:id` | none | one game |
| GET | `/promotions` | none | active promotions |
| GET | `/tournaments` | none | tournament list |
| GET | `/content/:slug` | none | published legal/help content |
| GET | `/settings/public` | none | non-secret settings |
| GET | `/responsible` | none | responsible-play statement |

## Auth

| Method | Path | Auth | Body / effect |
| --- | --- | --- | --- |
| POST | `/auth/register` | none | `{email,password,displayName,username?,referralCode?,marketingOptIn}`; creates player + 10,500 coins welcome allocation + session |
| POST | `/auth/login` | none | `{email,password}`; session cookie |
| POST | `/auth/logout` | session | revokes current session |
| GET | `/auth/me` | optional | current user or null |
| POST | `/auth/forgot-password` | none | `{email}`; records notification request (no mail provider) |
| POST | `/auth/change-password` | session | `{currentPassword,newPassword}`; revokes other sessions |
| POST | `/auth/2fa` | session | `{enabled}` preference |
| GET | `/auth/sessions` | session | active sessions |
| DELETE | `/auth/sessions/:id` | session | revoke own session |
| PATCH | `/auth/profile` | session | `{displayName,country,phone?,marketingOptIn?}` |

## Player

| Method | Path | Description |
| --- | --- | --- |
| GET | `/player/overview` | balance, stats, recent transactions/rounds, limits |
| GET | `/player/transactions?limit=&offset=&type=` | wallet ledger |
| GET | `/player/bets?status=` | sports bets with selections |
| GET | `/player/rounds?limit=&game=` | game rounds |
| GET | `/player/notifications` | notifications |
| POST | `/player/notifications/:id/read` | mark one read |
| POST | `/player/notifications/read-all` | mark all read |
| GET/POST/DELETE | `/player/favorites...` | saved games |
| GET | `/player/recent` | recently played, camel-cased |
| GET/PATCH | `/player/responsible` | limits and self-exclusion |
| GET | `/player/referrals` | code and referred players |
| GET | `/player/support` | own tickets |
| POST | `/player/support` | `{subject,category,body}` |
| GET | `/player/support/:id` | ticket + public messages |
| POST | `/player/support/:id/messages` | reply |

## Deposits

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/deposits/config` | session | deposit mode, QR URL, instructions, min/max, bonus tiers |
| GET | `/deposits` | session | own deposit requests |
| POST | `/deposits` | session | `{amount,reference,note?}`; creates a pending request |
| POST | `/deposits/:id/cancel` | session | cancel an own pending request |
| GET | `/admin/deposits?status=` | Master Admin | review queue with player identity |
| POST | `/admin/deposits/:id/approve` | Master Admin | verify, credit deposit + bonus, notify, audit |
| POST | `/admin/deposits/:id/reject` | Master Admin | reject with reason, notify, audit |

`depositMode=manual_review` is not sufficient for live collection: the server also requires `PAYMENTS_LIVE_ENABLED=true`. Sandbox mode is the default.

## Sports

| Method | Path | Description |
| --- | --- | --- |
| POST | `/bets` | `{selections:[{matchId,selection}],stake,mode}`; single/accumulator, transactional wallet debit, locks and validates fixtures/odds, records notification |

### Demo settlement

There is no public settlement endpoint. A background worker in `backend/src/services/sportsbook.js` runs at startup and every `DEMO_SETTLEMENT_INTERVAL_MS` (default 60s):

1. Starts upcoming demo fixtures whose start time has passed.
2. Finishes live demo fixtures after `DEMO_MATCH_MINUTES` (default 90) with server-generated final scores.
3. Writes `result_home` / `result_away`, settles 1X2 selections, and settles singles/accumulators once every selection is decided.
4. Credits winning or voided bets through the locked wallet ledger, inserts a notification and appends audit events.
5. Emits `bet.settled` over `/ws` for the owning account.

Set `DEMO_SETTLEMENT=off` to disable the worker. Live-market suspension, cash-out and multi-market settlement are not implemented.

## Games

| Method | Path | Description |
| --- | --- | --- |
| GET | `/games/:gameId/activity` | top wins/stats |
| POST | `/games/:gameId/play` | instant play `{stake,params,clientSeed?}` |
| POST | `/games/crash-orbit/start` | `{stake,autoCashout?}`; returns round ID/hash/start |
| GET | `/games/crash-orbit/:roundId/status` | current multiplier/settlement |
| POST | `/games/crash-orbit/:roundId/cashout` | manual cash-out |
| POST | `/games/mines-vault/start` | `{stake,mines}` |
| POST | `/games/mines-vault/:roundId/reveal` | `{tile}` 0–24 |
| POST | `/games/mines-vault/:roundId/cashout` | cash out revealed safe tiles |
| GET | `/games/mines-vault/:roundId/state` | resume/review state |

Provider-required IDs return `409 provider_required` with explanation. Validation rejects invalid stakes, insufficient balance, restricted accounts, and responsible limits.

## Admin

All admin routes pass `requireStaff`; most also require a named permission.

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/admin/overview` | reports.view.scope | scoped dashboard |
| GET | `/admin/network` | reports.view.scope | recursive tree |
| GET | `/admin/accounts` | network.view.scope | filter/search/paginate |
| POST | `/admin/accounts/:id/suspend` | accounts.suspend | reason required; sessions revoked |
| POST | `/admin/accounts/:id/restore` | accounts.restore | restore account |
| POST | `/admin/accounts/:id/credits` | credits.adjust | player-only adjustment with reason |
| POST | `/admin/accounts/:id/role` | Master | role change |
| POST | `/admin/accounts/:id/revoke-sessions` | security.view | revoke sessions |
| POST | `/admin/staff` | network.manage | invite/create staff or player, temporary credentials |
| GET | `/admin/invitations` | network.manage | invitations in scope |
| POST | `/admin/invitations/:id/revoke` | network.manage | revoke pending invitation |
| GET | `/admin/roles` | roles.manage | role list + permission catalogue |
| PATCH | `/admin/roles/:code/permissions` | Master | update role permissions |
| GET/PATCH | `/admin/games` | games.view/manage | catalogue metadata |
| GET/PATCH | `/admin/content` | content/promotions | pages/promotions |
| GET | `/admin/credits` | credits.adjust | adjustment summary/ledger/series |
| GET | `/admin/support` | support.view | scoped tickets |
| GET | `/admin/support/:id` | support.view | ticket + messages |
| PATCH | `/admin/support/:id` | support.manage | status/priority/assign |
| POST | `/admin/support/:id/messages` | support.manage | reply/internal note |
| GET/POST | `/admin/transfers` | transfers.approve | list/request |
| POST | `/admin/transfers/:id/approve` | transfers.approve | apply parent move |
| POST | `/admin/transfers/:id/reject` | transfers.approve | close request |
| GET | `/admin/security` | security.view | failed logins, sessions, suspensions, chain |
| GET | `/admin/audit` | audit.view.scope | paginated immutable events |
| GET | `/admin/settings` | settings.manage | settings |
| PATCH | `/admin/settings/:key` | Master | update; realMoneyEnabled locked false |
| GET | `/admin/system` | system.view | health/integrations/rails |
| POST | `/admin/notifications` | notifications.broadcast | scoped broadcast |

## Status codes

- `200` OK, `201` created.
- `400` validation / invalid stake / closed market.
- `401` authentication required.
- `403` account restricted / permission denied / out of scope / self action / rank violation.
- `404` not found.
- `409` already settled/resolved or provider required.
- `429` rate limited.
- `500` server error (logs private detail server-side only).
