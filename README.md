# 19xbet365

19xbet365 is an independent gaming platform with a real-money-ready coin wallet and sandbox financial rails. It includes a sportsbook, casino lobby, live-casino tables, virtual sports, 44 playable 19X Originals, player accounts, deposit/QR review, support, legal pages, and a protected Master Admin control room.

**Important:** 19xbet365 currently runs a **sandbox coin economy**. The production deposit path is implemented: players can submit a QR payment reference, Master Admin can verify it, and a configurable deposit bonus is credited with ledger and audit records. Real cash collection remains hard-gated behind licensing, KYC/AML, payment onboarding and `PAYMENTS_LIVE_ENABLED=true`; withdrawals, cash redemption and real-money wagering are disabled. Every catalogue title is an original 19X server-RNG game; no certified third-party provider or live-dealer session is connected.

## Design system

The public product follows the visual language of a modern bookmaker: a deep-navy two-row header, a lighter blue navigation strip, bold uppercase navigation, flat 8px controls, white cards on a pale blue-grey canvas, light-grey odds cells and a restrained green conversion accent. Typography is self-hosted **Roboto** for body/UI and **Roboto Condensed** for display, with tabular numerals for odds and balances. The palette and type scale were matched from the public 1xBet reference; all artwork, glyphs, illustrations and wording remain original 19xbet365 assets. Accessible variants are used for text contrast, so the brand green is split into a bright decorative lime and a darker AA-compliant action green. Font licences are included in `frontend/public/fonts/`.

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

- **Frontend:** React 18, TypeScript, Vite, React Router (HashRouter), Lucide controls, self-hosted Roboto/Roboto Condensed, original sport glyphs, club/provider monograms and hand-built CSS/SVG artwork.
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

New registrations start with 10,500 sandbox coins (10,000 welcome allocation plus a 500-coin gameplay boost). A referral relationship rewards both accounts with 1,000 coins after the referred player completes their first qualifying game round.

Deposits run through **Account → Add coins**. Operators configure the QR image URL, instructions and bonus tiers in Master Admin → Configuration. The default flow is sandbox: no money is collected, but the request, review, bonus, ledger and audit path is fully exercised. Master Admin → Deposit review approves or rejects requests. See `docs/PAYMENTS_AND_BONUSES.md` for the production activation checklist.

Fantasy cricket runs through **Fantasy**. Players build an 11-player salary-cap lineup (100 credits, 1 WK / 4 BAT / 3 AR / 3 BOWL, maximum 7 from one team), choose a captain and vice-captain, and enter with coins. Entries lock five minutes before the match. Admins create, score, settle and refund contests from **Admin → Fantasy contests**. Current player pools and scores are seeded demonstration data; a licensed player-stat feed is required before paid contests.

Identity verification and withdrawals run through **Account → Verification** and **Account → Withdraw**. KYC is manually reviewed by Master Admin. A withdrawal request debits the wallet immediately; Master Admin can approve, reject/refund or mark it paid with an external payment reference. Live payout execution remains gated by licensing, KYC/AML, merchant onboarding and reconciliation.

## What is playable

All **44 catalogue titles** are playable 19X Originals. Outcomes are generated on the server from cryptographically secure random values; settled rounds are immutable and recorded in player activity. There are no provider-required placeholder titles in the lobby.

| Family | Titles | Engine |
| --- | --- | --- |
| Originals | Crash Orbit, Mines Vault, Plinko Drop, Dice Roll, Wheel of 19X, Coinflip, Hi-Lo, Lucky Ten | Dedicated server engines with 90-99% target RTP |
| Slots | Nova Fruits plus 17 catalogue slots | Shared three-reel, three-payline slot engine; 95.6% target RTP, 180x max |
| Virtuals | Velocity Derby, Speed Derby, Virtual Football, Virtual Basketball, Virtual Tennis, Greyhound Sprint | Simulated six- or eight-competitor events with calibrated odds and visual replay |
| Instant | Keno Blitz, Scratch Nova, Limbo Velocity, Tower Climb | Server-generated draw, scratch, target and step games |
| Tables | Roulette, Blackjack, Baccarat, Speed Baccarat, Sic Bo, Dream Wheel, Texas Hold'em Prime | RNG table engines; blackjack uses a six-deck shoe and multi-step hit/stand rounds |
| Crash | Crash Orbit, Airball | Multiplier curve with manual and auto cash-out |

The six live-casino titles are RNG tables built in-house, **not live-dealer feeds**. Blackjack currently offers hit and stand; doubling and splitting are not available at this table. Target RTP and max-win labels on each game page match the implemented engine maths.

## Admin capabilities

- Global/scoped analytics from `parent_id` hierarchy, with no client-supplied scope trusted.
- Account search, suspension/restoration, session revocation, coin adjustments, and Master-only role changes.
- **Master-only staff credential issuance** with a one-time email/password handoff. Admins can manage scoped accounts and the game catalogue, but cannot create staff logins, change roles, open settings, review deposits or access other Master-only controls.
- Game catalogue visibility/featured controls; outcomes and RTP are not editable.
- Fantasy contest creation, player scoring, settlement, cancellation/refunds and entry review.
- Revenue and risk dashboard: sports/games/fantasy GGR, open exposure, deposits, withdrawals, bonuses and active players.
- Master-only KYC and withdrawal review, including approve, reject/refund and mark-paid states.
- Content pages, promotions, support tickets, transfer approvals, security events, audit chain verification, settings, and system health.
- Master Admin account is protected from suspension, demotion, and deletion through the API.
- All privileged actions append to the hash-chained audit trail with before/after state.

## Explicit limitations

- **Sandbox financial rails.** Deposit requests, QR configuration, Master Admin verification and percentage bonuses are implemented and tested. Live collection is rejected unless `PAYMENTS_LIVE_ENABLED=true` and the operator has completed licensing, KYC/AML and payment onboarding. Withdrawals are manual-review only: a Master Admin approves the request and records an external payment reference; automated payout execution is not implemented and `realMoneyEnabled` remains hard-locked.
- **Manual KYC.** Identity verification is a manual review workflow. A production launch requires an approved KYC provider, encrypted document handling, sanctions/PEP screening and geo eligibility.
- **Demo fantasy data.** Player pools, salaries and scoring lines are seeded demonstration data. Paid contests require an authorized player-stat feed and jurisdiction-specific fantasy rules.
- **No certified third-party provider games.** All 44 catalogue titles are original 19X RNG games. Certified 1xBet/provider parity, live-dealer feeds and independently tested game maths require provider contracts and certification; none are connected.
- **Simplified table rules.** Blackjack offers hit/stand only (no double or split). Baccarat uses standard third-card rules with no commission on the banker bet. Hold'em is a player-vs-dealer RNG table, not a multiplayer poker room.
- **Demo fixtures and demo settlement.** Sports fixtures and odds are seeded demonstration data. A server-side worker starts upcoming fixtures, finishes live fixtures after a simulated period, and settles 1X2 singles/accumulators with generated final scores. There is no real sports feed, live-market suspension, cash-out, or multi-market settlement.
- **Sandbox coins.** All balances and prizes are non-redeemable and have no cash value.
- **Demonstration security controls.** Two-factor preference is stored, but no authenticator is provisioned.
- **No image assets from third parties.** All artwork is CSS/SVG built for this project.

## Verification

Smoke tests live in `scripts/`:

```bash
node scripts/api-smoke.mjs
node scripts/all-games-smoke.mjs
node scripts/all-games-ui-smoke.mjs
node scripts/blackjack-smoke.mjs
node scripts/responsive-game-audit.mjs
node scripts/game-smoke.mjs
node scripts/security-smoke.mjs
node scripts/settlement-smoke.mjs
node scripts/deposit-smoke.mjs
node scripts/fantasy-smoke.mjs
```

`api-smoke.mjs` exercises public bootstrap, login, player overview, wallet, game activity, dice, Mines start/cash-out, admin overview, network, accounts, audit, security, and system health. `all-games-smoke.mjs` plays all 44 catalogue games through the API and verifies settlement for each; `all-games-ui-smoke.mjs` loads every game page and plays a representative sample, including multi-step blackjack; `blackjack-smoke.mjs` checks deal, hit, stand, stale-hand refunds and double-settle rejection; `responsive-game-audit.mjs` checks all 44 game pages and the main lobby routes at five widths for horizontal overflow and console errors. `game-smoke.mjs` covers the original 11 titles; `security-smoke.mjs` verifies anonymous/player/agent/master boundaries, the real-money lock, invalid-game/stake responses, and suspended login. `settlement-smoke.mjs` places singles and a two-fold accumulator, forces demo fixtures to completion, and verifies selection results, payouts and wallet balances. `deposit-smoke.mjs` submits a sandbox QR request, approves it as Master Admin, verifies the tiered deposit bonus and both ledger entries, then tests player cancellation, admin rejection and the live-collection activation gate. `fantasy-smoke.mjs` covers lineup entry, scoring and settlement. `referral-smoke.mjs <referral-code>` registers a referred player, completes a first round, and verifies the coin reward flow.

The demo settlement worker runs every 60 seconds by default and is controlled by `DEMO_MATCH_MINUTES` (default 90), `DEMO_SETTLEMENT_INTERVAL_MS` (default 60000) and `DEMO_SETTLEMENT=off` in `backend/.env`.

Final desktop Lighthouse audits returned **100 accessibility / 100 best practices / 100 SEO** on the public, player and control-room pages listed in `docs/UI_UX_AUDIT.md`. A Playwright/Edge real-user journey passed registration, bet placement, Dice Roll, wallet, bet history, support, mobile dialog keyboard behaviour, player login and Master Admin access.

## Documentation

The complete handoff set is indexed in [`docs/README.md`](docs/README.md), including:

- reference analysis and product parity matrix;
- design system, component and route inventories;
- game catalogue and admin/database architecture;
- API specification;
- UI/UX audit, responsive, visual, end-to-end and security test reports;
- known limitations, production readiness and the 19xbet365 handoff.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model, API map, hierarchy rules, and integrity model. See [`docs/REFERENCE_PRODUCT_ANALYSIS.md`](docs/REFERENCE_PRODUCT_ANALYSIS.md) for the full reference research notes. Screenshots can be regenerated with `node scripts/capture-screenshots.mjs` while the production server is running.
