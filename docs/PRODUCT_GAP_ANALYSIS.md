# PRODUCT GAP ANALYSIS — 19xbet365 vs 1xBet reference

> **Historical note (26 November 2026):** This gap analysis was prepared on 24 November 2026. The game-coverage gap is closed: all 55 catalogue titles are playable 19X Originals, including RNG tables, virtuals, instant games and slots. See `README.md` and `GAME_CATALOGUE.md`.

Date: 24 November 2026. Reference: https://1xbet.com/ (public, lawful sections studied via `webfetch`). Baseline: `docs/CURRENT_PRODUCT_ANALYSIS.md`. Statuses per `docs/PRODUCT_PARITY_MATRIX.md` conventions.

Method: product+feature completeness, visual/design quality, user interaction & navigation, backend/database functionality, real-time functionality, production engineering & security.

## Level 1 — Product and feature completeness

### 1.1 Implemented (complete or improved)
- Public pages: home, sports, live, esports, virtuals, casino, live-casino, slots, instant, promotions, tournaments, search, help/legal static pages, 404, NotFound.
- Player journey: registration (email), login, forgot password (notification request), dashboard, wallet, deposits (sandbox QR), bets, activity, notifications, security, referrals, responsible.
- Games: 19X Originals (55 playable, including slots, virtuals, instant games, RNG tables, bingo, video poker, TV games, Toto, Lotto, scratch cards and fishing).
- Admin hierarchy: Master/Admin/Sub-admin/Agent networks, roles, transfers, support, audit.

### 1.2 Missing or functionally incomplete (top findings)
- **Multi-market odds model** — only 1X2 core market (`bet_selections` has one selection set). Double chance, totals, BTTS, team wins absent. Reference has them. (High impact; needs new schema + settlement model.)
- **Save/load bet slip** — header trigger + drawer exists; save/load feature not implemented (`docs/PRODUCT_PARITY_MATRIX.md` row 19).
- **Language selection** — not implemented; English only. Translation catalogue + locale persistence required.
- **Live-market suspension engine, cash-out, multi-market settlement** — no engines; must not be fabricated without a real-feed provider.
- **Email/phone verification flows, transactional email for password reset** — request recorded, delivery not implemented.
- **2FA authenticator provisioning** — stored preference only.
- **KYC document upload** — policy text only; upload flow missing.
- **Automated promo/tournament engines** — promos communicate terms but do not pay; qualification workers absent.
- **Provider adapter contract** — needs provider contracts + session adapter (currently labelled, not playable).
- **Languages, locales, RTL layout** — absent.
- **Additional game titles** — reference includes bingo, lotto, poker, TV games, hunting/fishing, scratch cards; some absent from lobby/catalogue.

## Level 2 — Visual and design quality

- Self-hosted Roboto + Roboto Condensed matches reference palette; bookmaker look (navy header, blue nav strip, bold uppercase nav, white cards, pale grey-blue canvas, green accent) matches README claim.
- Gaps: homepage uses static hero (reference has carousel) — improvement target; reference's dense live tables and bigger information density; no certified provider/live-dealer parity; marketing surfaces (promotions) are simpler than reference.
- **Fix plan:** `DESIGN_SYSTEM.md` refresh; homepage hero improvements; provider-game page upgrades (neutral gradients instead of text-only); Lighthouse audits where feasible.

## Level 3 — User interaction and navigation

- Sports: sticky sidebar, live/upcoming filter, search — improved. Reference has more granular structure (top-events, country/league navigation, advanced filters). Gaps: league/country deep navigation, live-event indicators with counts, full match cards (stats, timelines, refresh), match sorting by provider status.
- Account/legal pages are functional; password reset is request-based.
- **Fix plan:** `Sports.tsx` enhancement — country/league trees, live event status rows, match detail pages, refresh polling with "stale" indicator (demo only, flagged as such).

## Level 4 — Backend and database functionality

- `POST /api/bets`, wallet, sessions, RBAC, audit chain: solid.
- Gaps:
  - Sports schema: single 1X2 selection set per bet; no multi-market columns.
  - No sports provider integration tables (events sync, rate limits, webhooks) — boundary not built.
  - Provider games: no sessions, no round states for provider products, no play endpoints.
  - No language/locale persistence.
  - Backup/PITR automation absent.
- **Fix plan:** `BACKEND_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SPORTS_AND_LIVE_DATA_ARCHITECTURE.md`, `GAME_ENGINE_ARCHITECTURE.md` updates; incremental schema additions (multi-market, provider sync tables, locales) as features, not rewrites.

## Level 5 — Real-time functionality

- Existing: `/ws` broadcast channel (bets, games, admin), ping/pong keepalive, stale socket termination.
- Frontend: no automatic refresh for live matches (seeded matches are static; client polls only where coded).
- Gaps:
  - **Server-authoritative real-time for live matches** — not possible without provider; documented as provider-blocked (do not fabricate).
  - Game round state broadcast exists for originals — verify frontend round-state updates via WS.
  - Duplicate/out-of-order event handling in frontend — add dedup by event id (verify, `REALTIME_ARCHITECTURE.md`).
  - Session expiry/close on server shutdown: not handled (verify, document).

## Level 6 — Production engineering and security

Implemented: scrypt, HttpOnly cookie, rate-limited login, helmet, input validation, audit chain (hash-chained, trigger-protected), Master-only issuance of staff logins.
Gaps (from `docs/PRODUCTION_READINESS.md` + `docs/KNOWN_LIMITATIONS.md`):
- No CSRF tokens (documented mitigation: SameSite=Lax + JSON; plan: add origin checks/tokens in phase 19).
- CSP disabled (production hardening).
- Single-process rate limiting (Redis plan).
- No backup/PITR, no penetration test, no full WCAG audit, no mobile-gesture QA.
- Secrets management — review `backend/.env.example` handling.
- Multi-instance WS: single `wss` map — plan distributed broadcast (phase 15).

## 7. Execution plan summary

Ordered per `docs/MASTER_EXECUTION_PLAN.md` (19 steps). Highlights:
1. Gap docs (this file).
2. Design-system corrections (`DESIGN_SYSTEM.md`).
3. Global nav + homepage upgrades (Phase 5).
4. Sports/live-match enhancements (Phase 6) — democlasses, flags, stale indicators; provider path stubbed + documented.
5. Game catalogue centralization + discovery improvements (Phase 8).
6. Individual game work: implement 1-2 concrete upgrades (Crash, Mines) for originality; document provider path.
7. Onboarding completion: save/load bet slip (Phase 4), language skeleton (Phase 10) — real implementation deferred until provider/locale contracts exist.
8. Backend/DB: schema additions (multi-market 1X2 extension optional), provider sync boundary, languages.
9. Security: CSRF, CSP, Redis rate limit, backups — phase 19.
10. Verification: builds, smoke, responsive, E2E (phases 15-18).
11. Documentation sync: parity matrix, handoff (`docs/ASTRA_HANDOFF.md`).
12. Blockers: `docs/KNOWN_BLOCKERS.md`.

Blockers that cannot be resolved without external authority (record here): legal/licensing for real money; provider certifications; email/SMS providers; real sports feeds; KYC providers.
