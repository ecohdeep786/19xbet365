# 19xbet365

19xbet365 is an independent, virtual-credit gaming platform built as a complete foundation for a future licensed operation. It includes a sportsbook, casino lobby, live-casino preview, virtual sports, playable 19X Originals, player accounts, support, legal pages, and a protected Master Admin control room.

**Important:** 19xbet365 uses non-redeemable virtual credits only. Real-money wagering, deposits, withdrawals, cash redemption, and financial affiliate commissions are disabled. Provider-required game pages are clearly labelled and cannot be played without a certified integration.

## Repository layout

```text
19xbet365/
├── backend/                 # Express API, PostgreSQL schema + seed, game engine, WebSocket
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.js
│   └── src/
│       ├── lib/             # crypto, audit chain, hierarchy scope, serializers
│       ├── middleware/      # sessions, RBAC, rate limits, error handling
│       ├── routes/          # auth, public, player, bets, games, admin
│       ├── services/        # server-authoritative game engine, wallet ledger
│       ├── db.js
│       ├── ws.js
│       └── index.js
├── frontend/                # React 18 + TypeScript + Vite SPA
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/           # public, account, game, and admin workspaces
│       ├── state/           # auth, bootstrap/data, bet slip, toasts
│       ├── lib/             # API client, demo fallback, formatting
│       └── styles/          # tokens, pages, game surfaces, control room
├── shared/catalog.json      # sports, fixtures, game catalogue, promos, tournaments, help
├── scripts/                 # capture tooling, catalogue generator and smoke tests
├── capture/                 # reference research and product screenshots
└── docs/                    # architecture, design, parity, test and readiness handoff
```

The two applications are connected through the `/api` surface. In development Vite proxies `/api` and `/ws` to the backend. In production the Express server serves `frontend/dist` and the API from the same origin.

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router (HashRouter), Lucide controls, original sport glyphs, club/provider monograms and hand-built CSS/SVG artwork.
- **Backend:** Node.js ESM, Express, `pg`, `ws`, `helmet`, `compression`, `cookie-parser`.
- **Database:** PostgreSQL 16. Default local database `astra_play`, port `5433`.
- **Auth:** server sessions in PostgreSQL, HttpOnly `xbet_session` cookie, scrypt password hashes, rate-limited login.
- **Realtime:** WebSocket channel at `/ws` broadcasting bet/game/admin activity.
- **Audit:** append-only, hash-chained `audit_events`; database trigger rejects UPDATE/DELETE.
- **Game integrity:** server-generated outcomes; settled rounds protected by an immutability trigger.

## Quick start

### 1. PostgreSQL

The foundation was developed against PostgreSQL 16 on `127.0.0.1:5433`. Create the database if it does not exist:

```sql
CREATE DATABASE astra_play;
```

The default connection string is:

```text
postgres://postgres@127.0.0.1:5433/astra_play
```

Override it with `DATABASE_URL` in `backend/.env` (use `.env.example` as a template). The backend scripts load `.env` automatically when it is present. Optional demo settlement controls are `DEMO_MATCH_MINUTES` (default `90`), `DEMO_SETTLEMENT_INTERVAL_MS` (default `60000`) and `DEMO_SETTLEMENT=off`.

### 2. Backend

```bash
cd backend
npm install
npm run seed
npm start
```

The API starts on `http://127.0.0.1:4000` and serves the built frontend from `frontend/dist` when present.

### 3. Frontend

```bash
cd frontend
npm install
npm run build
```

For live development:

```bash
npm run dev
```

Then open `http://localhost:5173`. Vite proxies API and WebSocket traffic to port 4000.

### 4. Root convenience scripts

```bash
npm run install:all
npm run db:seed
npm run dev:api
npm run dev:web
npm run build
npm start
```

## Demo access

All seeded accounts use the password **`19X#2026`**.

| Role | Email | Notes |
| --- | --- | --- |
| Player | `player@19xbet365.test` | Alex Rowan, populated history |
| Master Admin | `admin@19xbet365.test` | Nadia Voss, entire network |
| Admin | `admin.mercer@19xbet365.test` | Kai Mercer branch |
| Admin | `admin.chen@19xbet365.test` | Ivy Chen branch |
| Sub-admin | `owen.blake@19xbet365.test` | Mercer delegated branch |
| Sub-admin | `priya.nair@19xbet365.test` | Chen delegated branch |
| Agent | `luca.moretti@19xbet365.test` | Moretti player network |
| Agent | `mira.haddad@19xbet365.test` | Haddad player network |
| Agent | `jonas.weber@19xbet365.test` | Weber player network |

New registrations start with 10,500 virtual credits (10,000 welcome allocation plus a 500-credit gameplay boost). A referral relationship rewards both accounts with 1,000 virtual credits after the referred player completes their first qualifying game round.

## What is playable

The server-authoritative game engine currently supports 11 19X Originals:

`crash-orbit`, `mines-vault`, `plinko-drop`, `dice-roll`, `wheel-of-astra`, `coin-flip`, `hi-lo`, `lucky-ten`, `nova-fruits`, `velocity-derby`, and `speed-derby`.

Provider-required catalogue titles (live casino, provider slots, some virtuals) return `provider_required` from the play API. Their pages explain what is missing rather than simulating a fake live feed.

## Admin capabilities

- Global/scoped analytics from `parent_id` hierarchy, with no client-supplied scope trusted.
- Account search, suspension/restoration, session revocation, virtual-credit adjustments, and Master-only role changes.
- Invitations with temporary credentials; role escalation blocked by the server.
- Game catalogue visibility/featured controls; outcomes and RTP are not editable.
- Content pages, promotions, support tickets, transfer approvals, security events, audit chain verification, settings, and system health.
- Master Admin account is protected from suspension, demotion, and deletion through the API.
- All privileged actions append to the hash-chained audit trail with before/after state.

## Explicit limitations

- **No real-money rails.** No deposits, withdrawals, cash redemption, or wagering with money. The `realMoneyEnabled` setting is hard-locked.
- **No certified provider integrations.** Provider titles are integration-ready catalogue pages only.
- **Demo fixtures and demo settlement.** Sports fixtures and odds are seeded demonstration data. A server-side worker starts upcoming fixtures, finishes live fixtures after a simulated period, and settles 1X2 singles/accumulators with generated final scores. There is no real sports feed, live-market suspension, cash-out, or multi-market settlement.
- **Virtual credits.** All balances and prizes are non-redeemable and have no cash value.
- **Demonstration security controls.** Two-factor preference is stored, but no authenticator is provisioned.
- **No image assets from third parties.** All artwork is CSS/SVG built for this project.

## Verification

Smoke tests live in `scripts/`:

```bash
node scripts/api-smoke.mjs
node scripts/game-smoke.mjs
node scripts/security-smoke.mjs
node scripts/settlement-smoke.mjs
```

`api-smoke.mjs` exercises public bootstrap, login, player overview, wallet, game activity, dice, Mines start/cash-out, admin overview, network, accounts, audit, security, and system health. `game-smoke.mjs` plays every supported original and checks settlement. `security-smoke.mjs` verifies anonymous/player/agent/master boundaries, the real-money lock, provider-required responses, and suspended login. `settlement-smoke.mjs` places singles and a two-fold accumulator, forces demo fixtures to completion, and verifies selection results, payouts and wallet balances. `referral-smoke.mjs <referral-code>` registers a referred player, completes a first round, and verifies the virtual-credit reward flow.

The demo settlement worker runs every 60 seconds by default and is controlled by `DEMO_MATCH_MINUTES` (default 90), `DEMO_SETTLEMENT_INTERVAL_MS` (default 60000) and `DEMO_SETTLEMENT=off` in `backend/.env`.

## Documentation

The complete handoff set is indexed in [`docs/README.md`](docs/README.md), including:

- reference analysis and product parity matrix;
- design system, component and route inventories;
- game catalogue and admin/database architecture;
- API specification;
- responsive, visual, end-to-end and security test reports;
- known limitations, production readiness and the 19xbet365 handoff.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model, API map, hierarchy rules, and integrity model. See [`docs/REFERENCE_PRODUCT_ANALYSIS.md`](docs/REFERENCE_PRODUCT_ANALYSIS.md) for the full reference research notes. Screenshots can be regenerated with `node scripts/capture-screenshots.mjs` while the production server is running.
