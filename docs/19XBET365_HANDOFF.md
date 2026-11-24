# 19xbet365 — Final Handoff

## What was delivered

A complete, independently branded virtual-credit gaming foundation with:

- original **19X / 19xbet365** branding and hand-built CSS/SVG artwork;
- public sportsbook, live, esports, virtuals, casino, live-casino preview, slots and instant games;
- 11 server-authoritative playable 19X Originals;
- registration/login/account lifecycle, virtual wallet, bet history, game activity, notifications, security, referrals, responsible-play tools, support, help and legal content;
- Master Admin and delegated staff control room with scoped hierarchy, RBAC, credits, support, transfers, catalogue, content, audit, settings and health;
- Master-only staff credential issuance with one-time login ID/password handoff; administrators can manage scoped users and games but cannot create staff logins or access Master-only settings, roles, deposits and credential controls;
- PostgreSQL schema/seed, transactional wallet, immutable audit chain, settled-round immutability, session auth, rate limiting and a WebSocket activity channel;
- server demo-settlement worker for 1X2 singles/accumulators, with generated final scores, notifications, wallet credits and audit events;
- sandbox deposit/QR-request flow with Master Admin verification, configurable percentage bonuses, wallet ledger entries, notifications and audit events; live collection is hard-gated;
- a light bookmaker interface for players and a deliberately distinct dark control room for staff;
- responsive layouts tested from 320px to 2560px with no horizontal overflow;
- a 20-document handoff set, automated smoke/security/referral/game/deposit tests, Playwright user journeys and reproducible screenshot capture.

## Repository map

```text
backend/       Express + PostgreSQL + WebSocket + game engine + admin API
frontend/      React 18 + TypeScript + Vite + Router + design system
shared/        catalogue of sports, fixtures, games, promotions, help
scripts/       capture, catalogue generation, API/game/security/referral smoke tests
docs/          architecture, parity, design, tests, limitations, readiness
capture/       reference research and product screenshots
```

## Run instructions

```bash
# PostgreSQL 16, database astra_play on port 5433
cd backend
npm install
npm run seed
npm start            # http://127.0.0.1:4000

# second terminal, only for Vite development
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
cd frontend
npm run build
cd ../backend
npm start            # serves frontend/dist + API
```

In this environment npm is not on PATH; use:

```bash
node tools/package/bin/npm-cli.js ...
```

from the relevant `backend/` or `frontend/` directory.

## Demo accounts

Password for all seeded accounts: **`19X#2026`**

- Master Admin: `admin@19xbet365.test`
- Player: `player@19xbet365.test`
- Branch Admin: `admin.mercer@19xbet365.test`
- Branch Admin: `admin.chen@19xbet365.test`
- Sub-admin: `owen.blake@19xbet365.test`
- Agent: `luca.moretti@19xbet365.test`
- Agent: `mira.haddad@19xbet365.test`

New registrations receive 10,500 VC. The seeded player starts at 22,500 VC with a populated wallet, game, bet and notification history after the final reseed.

## Review order

1. `README.md` — architecture and run commands.
2. `docs/REFERENCE_PRODUCT_ANALYSIS.md` — what was studied and why.
3. `docs/PRODUCT_PARITY_MATRIX.md` — gap status.
4. `docs/DESIGN_SYSTEM.md` — brand tokens and component rules.
5. `docs/UI_UX_AUDIT.md` — reference-to-product design study, real-user QA and Lighthouse results.
6. `docs/PAYMENTS_AND_BONUSES.md` — sandbox deposit, QR configuration, bonus tiers and live activation gate.
7. `docs/RESPONSIVE_TEST_REPORT.md` — viewport evidence.
8. `docs/VISUAL_COMPARISON_REPORT.md` — reference/product screenshot table.
9. `docs/END_TO_END_TEST_REPORT.md` — verified journeys.
10. `docs/SECURITY_TEST_REPORT.md` — auth/scope/immutability evidence.
11. `docs/KNOWN_LIMITATIONS.md` and `docs/PRODUCTION_READINESS.md` — what is blocked.
12. Source: `frontend/src/App.tsx`, `backend/src/routes/`, `backend/db/schema.sql`.

## Evidence inventory

- Reference research screenshots are retained locally and excluded from the public repository; the comparison notes live in `docs/VISUAL_COMPARISON_REPORT.md`.
- Product desktop captures: `capture/product/home-1440.jpeg`, `sports-1440.jpeg`, `live-1440.jpeg`, `casino-1440.jpeg`, `instant-1440.jpeg`, `dice-1440.jpeg`, `account-1440.jpeg`, `wallet-1440.jpeg`, `deposit-1440.jpeg`, `bets-1440.jpeg`, `promotions-1440.jpeg`, `tournaments-1440.jpeg`, `help-1440.jpeg`, `support-1440.jpeg`, `login-1440.jpeg`, `register-1440.jpeg`, `admin-dashboard-1440.jpeg`, `admin-accounts-1440.jpeg`, `admin-deposits-1440.jpeg`.
- Product mobile captures: `capture/product/home-390.jpeg`, `sports-390.jpeg`, `casino-390.jpeg`, `dice-390.jpeg`, `wallet-390.jpeg`, `deposit-390.jpeg`, `login-390.jpeg`, `admin-dashboard-390.jpeg`.
- Reproducible capture: `scripts/capture-screenshots.mjs` (headless Edge, real API login, 1440×900 and 390×844).
- Automated tests: `scripts/api-smoke.mjs`, `scripts/game-smoke.mjs`, `scripts/security-smoke.mjs`, `scripts/settlement-smoke.mjs`, `scripts/referral-smoke.mjs`.
- Responsive method and results: `docs/RESPONSIVE_TEST_REPORT.md`.

## Known blockers / not approved

- Deposit requests, QR configuration, admin verification and deposit bonuses are implemented in **sandbox**; live collection requires `PAYMENTS_LIVE_ENABLED=true`, a verified merchant QR, licensing, KYC/AML and payment onboarding. Withdrawals and cash redemption remain disabled; `realMoneyEnabled` is still hard-locked.
- No provider/live-dealer session; provider titles return `provider_required`.
- Sportsbook is a 1X2 foundation only. Demo settlement is server-generated on a timer with generated scores and audit records; there is no real sports feed, live-market suspension, cash-out, or multi-market settlement.
- No automated promo/tournament payout or qualification engine.
- No email/SMS delivery, email/phone verification, KYC upload, or MFA challenge.
- No multi-language translations.
- No external penetration test, legal sign-off, or production monitoring/backup implementation in-repo.

These must remain visible in the 19xbet365 acceptance review; they are not claimed complete.

## Final status

**Virtual-credit public/player/admin foundation:** ready for interactive review.  
**Real-money or provider-integrated production launch:** blocked by legal, licensing, integration and operational work documented in `PRODUCTION_READINESS.md`.
