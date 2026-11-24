# 19xbet365 — Architecture

## Runtime topology

```text
Browser (React SPA)
  │  fetch("/api/*") + WebSocket("/ws")
  ▼
Express API (backend/src/index.js)
  ├── session middleware (cookie → PostgreSQL sessions)
  ├── rate limits + error handling
  ├── REST route groups
  ├── server-authoritative game engine
  ├── demo sports settlement worker (60s interval)
  └── static serving of frontend/dist
  ▼
PostgreSQL 16 (astra_play)
  ├── transactional wallet + game-round ledger
  ├── hierarchy via accounts.parent_id
  ├── hash-chained append-only audit_events
  └── immutability trigger on settled game_rounds
```

The frontend build is served by the same Express process in production, so API calls are same-origin and cookies require no CORS exceptions. During development Vite proxies `/api` and `/ws` to port 4000.

## Applications

### `frontend/`

- **Routing:** HashRouter keeps deep links usable from static hosting and the built preview.
- **State:** `AuthProvider` (session), `DataProvider` (bootstrap catalogue, favourites, notifications), `BetSlipProvider` (sports selections), `ToastProvider` (transient feedback).
- **API client:** `src/lib/api.ts` wraps every REST endpoint, maps API errors, and emits `19x:unauthorized` when a session expires. The WebSocket channel emits `bet.settled`; `DataContext` filters it by account and raises a settlement toast.
- **Offline preview:** if the API is unreachable, the catalogue falls back to the bundled demo catalogue and the UI clearly marks browser-preview mode. The API remains the authoritative source when online.
- **Artwork:** all hero, card, and game art is CSS/SVG built in `GameArt.tsx` and the stylesheets; no third-party image assets are used.

### `backend/`

| Area | Files | Responsibility |
| --- | --- | --- |
| Entry | `src/index.js` | middleware, route mounting, static serving, WebSocket attach, shutdown |
| Database | `src/db.js`, `db/schema.sql` | pool, transactions, health, full schema |
| Auth | `src/routes/auth.js`, `src/middleware/auth.js` | cookie sessions, RBAC, registration/login |
| Public | `src/routes/public.js` | bootstrap, catalogue, content, health |
| Player | `src/routes/player.js` | overview, wallet, bets, rounds, notifications, favourites, referrals, support |
| Sports | `src/routes/bets.js` | transactional slip placement, fixture locking and wallet debit |
| Sports settlement | `src/services/sportsbook.js` | demo fixture progression, generated final scores, 1X2 single/acca settlement, audit and WS events |
| Games | `src/routes/games.js`, `src/services/gameEngine.js` | all playable originals, settlement, stale-round cleanup |
| Wallet | `src/services/wallet.js` | locked balance updates, daily limits, stake/win/refund ledger |
| Admin | `src/routes/admin.js` | scoped operations, roles, content, support, transfers, audit, settings, health |
| Integrity | `src/lib/audit.js` | hash-chain append + verification |
| Hierarchy | `src/lib/scope.js` | recursive descendant scope |

## Database model (selected)

- `roles` — role code, rank, permission JSON array.
- `accounts` — users, role, `parent_id`, balance, status, referral code, security flags.
- `sessions` — token hashes, IP/UA metadata, expiry, revocation.
- `login_history` — successful and failed authentication events.
- `games`, `sports`, `matches` — catalogue, demo fixtures, generated final scores (`result_home`, `result_away`) and fixture settlement time.
- `bets`, `bet_selections` — sports slips, per-selection results and settled payouts.
- `game_rounds` — every playable round, bet, payout, outcome, state, seed hash.
- `transactions` — append-only wallet ledger with balance-after and reference IDs.
- `favorites`, `recent_plays`, `notifications`, `responsible_limits`.
- `promotions`, `tournaments`, `content_pages`.
- `support_tickets`, `support_messages`, `account_transfers`, `account_invitations`.
- `audit_events` — hash-chained immutable events.
- `platform_settings` — JSONB configuration.

### Integrity rules

1. `settled_rounds_immutable` rejects any UPDATE that changes payout, outcome, or status on a settled `game_rounds` row.
2. `audit_no_update` rejects all UPDATE and DELETE on `audit_events`.
3. Wallet changes always run under `SELECT … FOR UPDATE` on the account row.
4. Game settlements are transactional: stake debit, round insert, payout credit, ledger records, and round outcome commit together.
5. Sports bet placement locks its fixtures in a stable order before debit; the settlement worker locks due fixtures with `SKIP LOCKED`, so a market cannot finish between validation and insertion.
6. Demo fixture results, selection results, bet settlement, wallet credit and audit events commit in one transaction. The worker is idempotent because it only selects open bets and unfinished fixtures.
7. Audit events chain the previous event hash; verification checks the retained window and reports broken links.

## Hierarchy and RBAC

```text
master_admin (rank 0)
└── admin (1)
    └── sub_admin (2)
        └── agent (3)
            └── player (4)
```

- `getScopedAccountIds` returns `null` for global Master scope; every other staff account receives the recursive descendants of its own `parent_id`.
- Every admin query uses the scope server-side. Query parameters can filter within scope but cannot expand it.
- Staff rank checks prevent suspending or acting on an account at or above the actor's rank.
- The Master Admin account is protected from suspension, demotion, and role changes through the API.
- Invitations can only grant roles below the inviter's authority; the server checks `allowedInviteRoles`.
- Referrals create player relationships only. They never grant admin access.

## API map

### Public

`GET /api/health`, `GET /api/bootstrap`, `GET /api/matches`, `GET /api/games`, `GET /api/games/:id`, `GET /api/promotions`, `GET /api/tournaments`, `GET /api/content/:slug`, `GET /api/settings/public`, `GET /api/responsible`.

### Auth

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/change-password`, `POST /api/auth/2fa`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `PATCH /api/auth/profile`.

### Player

`GET /api/player/overview`, `GET /api/player/transactions`, `GET /api/player/bets`, `GET /api/player/rounds`, `GET /api/player/notifications`, `POST /api/player/notifications/:id/read`, `POST /api/player/notifications/read-all`, `GET/POST/DELETE /api/player/favorites`, `GET /api/player/recent`, `GET/PATCH /api/player/responsible`, `GET /api/player/referrals`, support ticket routes.

### Sports

`POST /api/bets` — transactional single/accumulator placement.

### Games

`GET /api/games/:gameId/activity`.

Instant games: `POST /api/games/:gameId/play`.

Crash: `POST /api/games/crash-orbit/start`, `GET /api/games/crash-orbit/:roundId/status`, `POST /api/games/crash-orbit/:roundId/cashout`.

Mines: `POST /api/games/mines-vault/start`, `POST /api/games/mines-vault/:roundId/reveal`, `POST /api/games/mines-vault/:roundId/cashout`, `GET /api/games/mines-vault/:roundId/state`.

### Admin

`GET /api/admin/overview`, `GET /api/admin/network`, `GET /api/admin/accounts`, `POST /api/admin/accounts/:id/suspend`, `POST /api/admin/accounts/:id/restore`, `POST /api/admin/accounts/:id/credits`, `POST /api/admin/accounts/:id/role`, `POST /api/admin/accounts/:id/revoke-sessions`, `POST /api/admin/staff`, `GET /api/admin/invitations`, `POST /api/admin/invitations/:id/revoke`, `GET /api/admin/roles`, `PATCH /api/admin/roles/:code/permissions`, `GET/PATCH /api/admin/games`, `GET/PATCH /api/admin/content`, `GET /api/admin/credits`, support routes, transfer routes, `GET /api/admin/security`, `GET /api/admin/audit`, `GET/PATCH /api/admin/settings`, `GET /api/admin/system`, `POST /api/admin/notifications`.

## Game engine

All playable outcomes are produced server-side. Instant outcomes use cryptographic randomness; crash points use a bounded exponential distribution; Mines uses a 5×5 layout with a fixed mine count; Plinko uses server-generated left/right paths. The frontend only animates the returned result.

- `crashMultiplier(startedAt)` derives the live multiplier from elapsed time for polling; settlement uses the stored crash point.
- `minesMultiplier` computes a 97% target return with a combinatorial payout.
- The `voidStaleRounds` helper returns a stake and voids an abandoned open Crash/Mines round before a new round starts, preventing stuck escrow.
- The frontend polls Crash status; the server settles on bust, manual cash-out, or auto cash-out.

## Security posture

- Scrypt password hashes, salts per account.
- Session tokens are random 32-byte values; only SHA-256 hashes are stored.
- HttpOnly, SameSite=Lax cookie; `Secure` in production.
- Per-IP/email login rate limiting plus a general API rate limiter.
- Parameterized SQL throughout.
- Helmet, compression, request-size limit.
- No client-provided actor, role, or scope is trusted.
- Audit before/after state for privileged changes; the Master Admin cannot erase records.
- Real-money settings hard-locked server-side.

## Known boundaries

- No payment processor, KYC provider, live dealer provider, or certified RNG integration.
- Sports fixtures are demo data. A worker auto-settles 1X2 singles/accumulators after a simulated match duration; there is no real feed or multi-market settlement.
- Two-factor preference is stored but no authenticator challenge is provisioned.
- The offline demo fallback is intentionally limited to browsing/login simulation; live API data is authoritative.
