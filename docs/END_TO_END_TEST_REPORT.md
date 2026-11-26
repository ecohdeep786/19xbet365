# End-to-End Test Report

**Date:** 27 November 2026  
**Environment:** production Vite build served by Express at `http://127.0.0.1:4000`; PostgreSQL 16 `astra_play`; headless Edge 1440×900 and 390×844 for evidence capture; in-app browser for interactive checks.

## Automated smoke tests

| Script | Result | Evidence |
| --- | --- | --- |
| `scripts/api-smoke.mjs` | Passed: health, bootstrap, login, overview, transactions, activity, dice, Mines start, admin overview/network/accounts/audit/security/system | console output |
| `scripts/firebase-smoke.mjs` | Passed: real Firebase identity → server session, 10,500 welcome coins, idempotent re-login, unverified deposit gate, takeover protection, invalid-token rejection | console output |
| `scripts/firebase-ui-smoke.mjs` | Passed: Firebase sign-in, verification banner, deposit gate, session restoration after server logout, Firebase registration, seeded password login | `capture/firebase-audit/` |
| `scripts/all-games-smoke.mjs` | Passed: **55/55 catalogue games** played through the API and settled; zero failures; wallet reconciled | console output |
| `scripts/all-games-ui-smoke.mjs` | Passed: **55/55 game pages** loaded with no provider gate; representative sample played across every game family, including multi-step blackjack and video poker; zero console/page errors | console output |
| `scripts/special-games-smoke.mjs` | Passed: bingo tickets/draws, WheelBet colour consistency, elemental payouts, Toto results, Lotto draws, reef/hunt targets, scratch cards and video-poker hold/draw state | console output |
| `scripts/categories-ui-smoke.mjs` | Passed: every new category page, Results and Statistics loaded without overflow or console errors | `capture/categories/` |
| `scripts/nav-ui-smoke.mjs` | Passed: 1xGames mega-menu, More menu and mobile drawer expose Bingo, Poker, TV Games, Lotto, Toto, Scratch, Hunting & Fishing, Other Games, Quick Play, Results and Statistics | `capture/categories/nav-*.jpeg` |
| `scripts/blackjack-smoke.mjs` | Passed: deal, hit, stand, dealer draws to 17, settled-hand replay rejected, stale hand refunded | console output |
| `backend/db/audit.js` (`npm run db:audit`) | Passed: 30/30 accounts balanced, no duplicate ledger references, required tables/triggers present, direct mutation of transactions/settled rounds/settled bets/deposit amounts rejected, odds and responsible-play history populated | console output |
| `backend/db/migrate.js` (`npm run db:migrate`) | Passed: versioned migration applied and recorded in `schema_migrations` | console output |
| `scripts/responsive-game-audit.mjs` | Passed: 205 checks across all 55 game pages plus 19 public/lobby routes at 320, 390, 768, 1440 and 2560; zero horizontal overflow, zero console errors | console output |
| `scripts/game-smoke.mjs` | Passed: original 11 originals settled; Crash cash-out and Mines bust paths; final balance reconciled | console output |
| `scripts/security-smoke.mjs` | Passed: anonymous/player/agent/master auth and scope boundaries, unknown-game 404, invalid-stake 400, real-money lock | console output |
| `scripts/settlement-smoke.mjs` | Passed across both settlement branches: two singles and a two-fold accumulator settled from generated final scores; winning/losing payouts and wallet balance reconciled | console output |
| `scripts/deposit-smoke.mjs` | Passed: sandbox request, admin approval, 15% tier bonus, deposit/bonus ledger, cancellation, rejection and live-collection activation gate | console output |
| `scripts/risk-smoke.mjs` | Passed: Master/Admin revenue access, Player denial, sports stake cap and payout cap enforcement | console output |
| `scripts/fantasy-smoke.mjs` | Passed: salary-cap entry, score upload, settlement, rank and prize credit | console output |
| `scripts/fantasy-ui-audit.mjs` | Passed: fantasy lobby, lineup builder, captain/vice selection, entry and balance debit | `capture/fantasy-audit/` |
| `scripts/compliance-ui-audit.mjs` | Passed: KYC submission, Master approval, withdrawal request, approval and mark-paid | `capture/compliance-audit/` |
| `scripts/referral-smoke.mjs <code>` | Passed: referral registration starts 10,500; referred player's first dice round receives 1,000 coins; referee balance reflects reward | console output |
| `scripts/capture-screenshots.mjs` | Passed: product captures across 1440×900 and 390×844, player and Master Admin sessions | `capture/product/` |
| Frontend `tsc --noEmit && vite build` | Passed | Vite production build, 1,677 modules; ~196 KB gzip initial JS, Firebase split into lazy chunks |
| Playwright real-user journey | Passed | 27/27 checks across the logged-out game gate, registration, bet placement, Dice Roll, wallet, deposit, responsible play, support, mobile drawer, auth, admin deposit review, fantasy route and KYC/withdrawal endpoints |
| Playwright deposit journey | Passed | 11/11 checks: sandbox notice, QR placeholder, request, pending state, admin approval, bonus ledger and balance update |
| Lighthouse desktop audit | Passed | 100 accessibility / 100 best practices / 100 SEO on home, sports, fantasy, login, withdraw and deposit; earlier runs covered casino, account, wallet, support, promotions, tournaments, help, game detail, register and admin |
| Contrast pass | Passed | Muted ink `#52718a`, action green `#557d1d`, footer `#a9c4dd`; zero color-contrast failures on audited pages |

The demo database was reseeded after this verification pass, so the handoff starts from a clean **22,500.00 coins** player balance with seeded history. Smoke-run balances above are historical test output; final screenshots show the clean reseeded state.

## Real-browser journeys

### 1. Unauthenticated visitor

- Opened home; hero, sports quick strip, live feed, originals, casino split, promos, tournaments, trust band and footer render.
- Navigated Sports via the header mega-menu; filters/search visible.
- Added a 1X2 selection; bet slip drawer opened with selection, stake, total odds and potential return.
- Attempted placement while unauthenticated: sign-in prompt, no fake success.
- Opened casino, instant, game, promotions, tournaments, help and legal pages. No console errors.
- Verified the 404 fallback exists.

### 2. New registration

- Opened `/register`, filled display name, email, password and confirm, accepted age consent.
- Server created a player with **10,500 coins** welcome allocation; session cookie set.
- Redirected to the account dashboard with 10,500 balance, one welcome transaction, Level 1, 0 rounds.
- Firebase registration was separately tested through the real UI: Firebase identity creation, backend player creation, verification banner and cleanup.
- Password validation rejects short/weak/mismatched input in both UI and server.

### 3. Existing player

- Logged in as `player@19xbet365.test` / `19X#2026` (seeded password path).
- Firebase email/password sign-in verified separately: account creation, welcome allocation, verification banner, deposit gate and session restoration after the server session ended.
- Dashboard stats, wallet ledger, bets, game activity, notifications, security, referrals and responsible-play pages loaded.
- Placed a cricket 1X2 bet at 1.28 odds; balance deducted; bet appeared in My Bets with correct stake/odds/return; toast confirmed server response.
- Tested Dice Roll: server returned a valid roll, balance deducted, round recorded.
- Tested Crash Orbit: launch, live multiplier, cash-out and bust paths, balance and history updated.
- Tested Mines grid, Wheel of 19X, Plinko and all engines through the smoke script.
- Played a multi-step Blackjack Azure hand: deal, hit, stand, dealer draw and settlement; confirmed the hole card stays hidden while the hand is open.
- Confirmed all 55 catalogue games load and play with no provider-required gate; RNG tables are labelled as 19X Originals, not live dealer feeds.
- Confirmed settled rounds and wallet ledger entries remain immutable.
- Placed two opposing singles and a two-fold accumulator, forced demo fixtures to their simulated finish, and verified selection results, bet statuses, payouts, wallet credits and audit events.
- Confirmed the settlement-event handler filters by account and raises a settlement toast in an open player session; the worker emits `bet.settled` on the same WebSocket channel.

### 4. Wallet/account states

- Wallet balance renders on one line at desktop and mobile; Add coins opens the sandbox deposit flow, while live withdrawal remains disabled with explanation.
- Empty states shown for new accounts (rounds/bets/notifications).
- Activity page has round filters and expandable record details.
- Responsive QA found and fixed 320px wallet filter overflow and the mobile support-card ordering defect.

### 5. Support and help

- Support page lists seeded tickets and thread; message order keeps the player question before the staff reply.
- Help centre displays 10 articles, category chips, search, article detail and related links.
- Static legal pages load server content via `/api/content/:slug`.

### 6. Referral flow

- Registered a referred test player with a real referral code.
- Player received 10,500; first dice round awarded 1,000 to both accounts and set the referral to `rewarded`.
- Wallet response returned the final referee balance including the reward.

### 7. Master Admin

- Logged in as `admin@19xbet365.test`.
- Dashboard metrics, role composition, live chart, alerts, audit events and chain tip render.
- Accounts search returned the demo player; credit adjustment `+250` with reason completed, ledger updated, toast confirmed.
- Roles page permission matrix and fixed Master Admin role render.
- Content page lists 8 pages and 6 promotions; settings shows the real-money control hard-locked.
- Support desk, transfers, security, audit and system health render with real API data.
- Audit tamper attempts via SQL were rejected.
- Delegated agent test: 9-account scope, only agent/player roles, no master or other admin; roles/transfers denied.

### 8. Evidence capture

- `scripts/capture-screenshots.mjs` logs in through the real API, sets viewport metrics through DevTools, captures desktop player pages, mobile pages, signed-out auth pages and the Master Admin control room.
- All 42 captures loaded real API data; interactive spot checks of the captured routes showed no console errors. New captures cover slots, virtuals, keno, blackjack, roulette and Airball on desktop, plus blackjack and roulette on mobile.
- Demo identity and support addresses were cleaned from the legacy `astraplay.io` domain to `19xbet365.test` in seed, UI shortcuts, existing rows and documentation.

## Defects found and fixed

| Defect | Fix | Verification |
| --- | --- | --- |
| Tournament page crash for `gameId: null` | Null-safe qualifying game label and CTA route | Page loads; no console errors |
| Recent-game rail rendered full-width | Renamed game-page side rail class | Rail returns to horizontal 180px cards |
| Bet placement `potential_return` mismatch | Typed API response and fallback field | Bet placed; toast correct |
| 401 stale UI after session/DB reset | Global unauthorized event clears auth state | Session expiry path |
| Long coin balance wrapping | Nowrap + flex constraints | Desktop screenshot |
| Header overflow at 320/390 | Hide search at `≤480` and avatar at `≤380` | QA harness no overflow |
| Live spotlight 2-up at 320 | 1 column at `≤520` | QA harness no overflow |
| Wallet filters overflow | Internal segmented scroll | QA harness no overflow |
| Support email capitalization | Removed broad title-case rule | Admin support screenshot |
| Duplicate legal kicker | Category de-duplication | Terms page |
| Audit chain race risk | Advisory xact lock around append | Code + trigger evidence |
| Referral reward server response stale | Return referee balance from reward service | Referral smoke test |
| Mobile account support card appeared before content | Corrected the responsive selector | `capture/product/wallet-390.jpeg` |
| Search result quotes contained replacement characters | Replaced with proper closing quotes | Search empty and summary states |
| Legacy “A” boot splash and dark browser chrome colour | 19 brand mark and deep-blue `theme-color` | `frontend/index.html`, rebuilt output |
| Demo emails exposed the old Astra domain | Changed seed and existing rows to `19xbet365.test` | Login demo shortcuts + docs |
| Reused generic sport icons (swords for cricket/MMA, dots for tennis/baseball) | Added a 17-mark original `SportIcon` set with a neutral fallback | Sports rail, league headers and live spotlight visual pass |
| Fixtures lacked team or provider identity marks | Added deterministic `TeamBadge` club initials and `ProviderMark` catalogue monograms | Sports list and casino card visual pass |
| Category nav and casino filters were text-only | Added 13–17px category chips/icons to desktop nav, mega menus, mobile drawer and casino filters | Header and casino screenshots |
| Settlement wrote match outcomes into the selection-result check constraint | Mapped fixture outcome to per-selection `won`/`lost` | `settlement-smoke.mjs` all checks pass |
| Bet placement could race a fixture finishing between validation and insert | Lock fixtures `FOR UPDATE` in stable order before account debit | Transactional code review + settlement test |
| No client feedback when a bet settled in the open session | WebSocket `bet.settled` event filtered by account, settlement toast and notification refresh | Player session event-handler check |

## Not covered end-to-end

- Real certified provider game session or live-dealer feed (no contract/certification). All current catalogue games are original 19X RNG products.
- Blackjack double/split decisions and multiplayer poker (current blackjack is hit/stand; Hold'em is player-vs-dealer).
- Live real-money collection and withdrawals (sandbox deposit/review is covered; live activation remains gated).
- Email/SMS delivery or verification (no provider).
- Native app / real touch-device gestures.
- Full WCAG screen-reader audit.
- Multi-market sports settlement, live-market suspension and cash-out. The 1X2 demo settlement worker is covered by `settlement-smoke.mjs`.

These are recorded in `KNOWN_LIMITATIONS.md` and `PRODUCTION_READINESS.md`.
