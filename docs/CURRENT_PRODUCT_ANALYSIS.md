# CURRENT PRODUCT ANALYSIS — 19xbet365 (as of 24 November 2026)

> **Historical note (26 November 2026):** This analysis was produced on 24 November 2026. The "11 playable / 33 provider-required" coverage statements are superseded: all 44 catalogue titles are now playable 19X Originals. See `README.md` and `GAME_CATALOGUE.md` for current status.

This document records the existing state of the product, what works, what is incomplete, and where it uses placeholder or hardcoded data. It is the baseline for the gap analysis and execution plan that follow.

## 1. Repository and system overview

- **Monorepo layout**
  - `frontend/` — React 18 + TypeScript + Vite SPA (HashRouter), Lucide icons, self-hosted **Roboto / Roboto Condensed**, CSS tokens + hand-built SVG artwork. Build verified: `tsc --noEmit && vite build` passes; dist ≈ 168 KB gzip JS.
  - `backend/` — Node.js ESM + Express + `pg` + `ws`. Serves `frontend/dist` in production on the same origin.
  - `shared/catalog.json` — source of truth for sports, seeded matches, games, promotions, tournaments, help articles.
  - `scripts/` — smoke tests (`api-smoke`, `game-smoke`, `security-smoke`, `settlement-smoke`, `deposit-smoke`, `referral-smoke`, `capture-screenshots`).
  - `capture/` — reference research and product screenshots.
- **Database:** PostgreSQL 16, default `postgres://postgres@127.0.0.1:5433/astra_play` (override via `DATABASE_URL` in `backend/.env`). Listener visible on 5433 in this environment.
- **Auth:** server sessions in PostgreSQL, HttpOnly `xbet_session` cookie, scrypt password hashing, rate-limited login.
- **Realtime:** WebSocket at `/ws` (`backend/src/ws.js`) broadcasting bet/game/admin activity with ping/pong keepalive and stale-socket termination.

## 2. Public product state

- **Pages implemented** (`frontend/src/App.tsx`): home, `/sports`, `/live`, `/esports`, `/virtuals`, `/casino`, `/live-casino`, `/slots`, `/instant`, `/promotions`, `/tournaments`, `/search`, `/game/:id`, `/help`, `/help/:slug`, `/about`, `/terms`, `/privacy`, `/responsible-gaming`, `/bonus-terms`, `/cookies`, `/aml`, `/affiliates`, NotFound.
- **Auth/onboarding:** `/register`, `/login`, `/forgot-password`, account layout with overview, profile, wallet, deposit, bets, activity, notifications, security, referrals, responsible.
- **Master Admin:** `/admin` with dashboard, network, accounts, roles (Master-only), games, content, credits (Master-only), deposits (Master-only), support, transfers, security, audit, settings (Master-only), system.
- **Header:** brand header, mega menus (Sports / More), search, notifications, balance, account menu, bet slip. Footer with legal + help + coin-play notice (see `docs/VISUAL_COMPARISON_REPORT.md`).
- **Home:** Orbit hero, quick sports, live feed, originals, casino split, promos, tournament, trust (`frontend/src/pages/Home.tsx`).

## 3. Sports / live-match state

- `shared/catalog.json` contains 12 sports with seeded match fixtures (`status: live|upcoming|completed`, scores, odds, featured, demo flags). Public API: `/api/matches`, `/api/publicMatches` (used by `SportsPage`).
- Live sports page: sticky sports filter sidebar, live/upcoming status filter, search, grouped by league, live-first sorting, player-side live clocks for seeded demo matches.
- **Demo settlement worker** (`backend/src/services/sportsbook.js`): starts upcoming fixtures, finishes live ones after `DEMO_MATCH_MINUTES` (default 90), settles 1X2 singles/accumulators with generated final scores, credits wins, records audit events, broadcasts via WebSocket.
- **Gap:** no authorized sports data provider integration; no multi-market model (double chance, totals, BTTS, team wins); no live-market suspension engine; no cash-out. Documented in `docs/KNOWN_LIMITATIONS.md` (item 7) and `docs/PRODUCT_PARITY_MATRIX.md`.

## 4. Games

- **19X Originals (44 playable, server-authoritative):** crash, Mines, Plinko, Dice, Wheel, Coinflip, Hi-Lo, Lucky Ten, 18 slots, six virtuals, four instant games and seven RNG tables (README).
- Game catalogue: `shared/catalog.json` `games` array (lobby, filters, favorites) + `GamePage` discovery + playable server engines for every title.
- **Gap:** certified third-party provider/live-dealer parity; some 1xBet categories (bingo, lotto, TV games, hunting/fishing) are not in the current 44-title catalogue; gaps documented in `docs/PRODUCT_PARITY_MATRIX.md`.

## 5. Money/payments (sandbox)

- Coin ledger + wallet transactions; sandbox deposit flow (QR request → Master review → percentage bonus → ledger/audit/notification).
- Real cash rails hard-locked (`realMoneyEnabled`), withdrawals disabled. See `docs/PAYMENTS_AND_BONUSES.md`, `docs/KNOWN_LIMITATIONS.md`.

## 6. Admin hierarchy

- Master Admin → Admin → Sub-admin → Agent → Player, all defined in `docs/ADMIN_ARCHITECTURE.md` + `backend/src/lib/scope.js`. Hierarchical scope, RBAC, session revocation, network visualization, transfers, support, audit chain all implemented. Smoke tests in `scripts/security-smoke.mjs`.

## 7. Known limits (recorded in existing docs)

See `docs/KNOWN_LIMITATIONS.md` and `docs/PRODUCTION_READINESS.md` — legal/licensing, provider integrations, multi-market, email/SMS, 2FA provisioning, backups/PITR, CSP/CSRF, Redis rate limits, etc.

## 8. Evidence of verification

- Production build passes: `tsc --noEmit && vite build` (verified 24 November 2026).
- Existing reports: `docs/SECURITY_TEST_REPORT.md`, `docs/END_TO_END_TEST_REPORT.md`, `docs/RESPONSIVE_TEST_REPORT.md`, `docs/UI_UX_AUDIT.md`, `docs/VISUAL_COMPARISON_REPORT.md`.

## 9. Outstanding work tracked by this baseline

1. Write gap analysis and parity matrix updates (see `docs/PRODUCT_GAP_ANALYSIS.md`).
2. Execute priority engineering steps per `docs/MASTER_EXECUTION_PLAN.md`.
3. Record blockers in `docs/KNOWN_BLOCKERS.md`; hand off in `docs/ASTRA_HANDOFF.md`.
