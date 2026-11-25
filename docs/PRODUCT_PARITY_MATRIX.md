# Product Parity Matrix

**Last updated:** 24 November 2026  
**Reference:** 1xBet public product (`1xlite-12669.pro/en`)  
**Product:** 19xbet365 (`frontend/`, `backend/`, `shared/`)

Statuses: **Complete**, **Improved**, **Functionally incomplete**, **Integration required**, **Legal/restricted**, **Not verified**.

| Area | Reference behaviour | 19X implementation | Status | Evidence / next action |
| --- | --- | --- | --- | --- |
| Global header | Utility row, sport/casino tabs, auth actions, language/currency | Brand header, mega menus, search, notifications, balance, account menu, bet slip | Complete | `Layout.tsx`, screenshots in `capture/product/home-1440.jpeg` |
| Language selection | Country/currency/language selector | Not implemented; all content is English | Functionally incomplete | Needs translation catalogue and locale persistence |
| Global footer | Legal, help, partners, payment marks | Brand, play/account/platform/legal columns, coin-play notice | Complete | `Layout.tsx` |
| Homepage | Carousel, shortcuts, sports table, promotions, right rail | Orbit hero, quick sports, live feed, originals, casino split, promos, tournament, trust | Improved | Static hero instead of carousel; original brand direction |
| Sports sidebar | Dense sports list, counts, A–Z categories | Sticky sports filter, icons, counts, mobile drawer | Complete | `Sports.tsx`, `.sports-sidebar` |
| Sports filters | League/sport/market chips, search, status | Search, all/live/upcoming, sport filters, mobile drawer | Improved | Additional markets not fabricated |
| Odds markets | 1X2, double chance, totals, BTTS, team wins | 1X2 core market only | Functionally incomplete | Backend schema supports one selection set; add market model before claiming parity |
| Live sports | Top live tiles, live table, stream flags | Live spotlight cards, live league table, score/minute, odds | Improved | `LiveSpotlight` added; no fake streams |
| Persistent bet slip | Right rail with save/load, favourite tip | Header trigger + drawer + sports rail + auto-save/restore (24 Nov 2026) | Implemented | `BetSlipContext.tsx`; restore is a convenience only — placement remains server-authoritative |
| Bet placement | Transactional stake/selection handling | Transactional server placement, wallet debit, potential return | Complete | `bets.js`; browser tested |
| Casino lobby | 5-column tiles, categories, search/sort, provider badges | 44 titles, filter chips, search, sort, favourites, playable/provider badges | Complete | `Casino.tsx` |
| Slots lobby | Provider slot catalogue | 19X slot originals + provider-required slot pages | Complete | No provider sessions |
| 1xGames / instant | Demo games, category tabs, max win labels | 11 playable originals, filters, max win, server rounds | Complete | `GAME_CATALOGUE.md` |
| Live casino | Hero carousel, filter chips, dealer cards | Preview lobby, provider notice, table cards | Integration required | Certified live provider needed |
| Virtual sports | Simulated sport products | 19X Derby + provider-required virtual pages | Complete | No fabricated live feed |
| Registration | Phone/email/social, bonus choice, SMS | Email registration, referral, welcome allocation, age consent | Improved | No SMS/social/email verification |
| Login | Login form, recovery | Session login, rate limiting, demo access, recovery request | Complete | Email delivery absent; request goes to notifications |
| Password recovery | Email reset link | Account notification request; manual support verification | Functionally incomplete | Requires mail provider/token page |
| 2FA | Authenticator/SMS | Preference stored + notification | Functionally incomplete | No authenticator provisioning |
| Player dashboard | Wallet, bets, bonuses, history | Overview, balance, open bets, rounds, notifications, limits | Complete | `Overview.tsx` |
| Profile | Personal details, verification | Editable display/country/phone/marketing; protected email/username | Complete | No KYC document upload |
| Wallet | Deposit/withdraw/history | Coin ledger, filters, active Add coins entry point, no live cash-out | Improved | Deposit review and bonuses sandbox-ready; withdrawals disabled |
| Deposit / QR review | Payment QR, amount, bonus tier, review | QR configuration, player request/UTR, Master review, percentage bonus, ledger/audit notifications | Complete (sandbox) | Live collection gated by `PAYMENTS_LIVE_ENABLED` and compliance |
| Withdrawal | Cash-out to player | No endpoint; messaging only | Legal/restricted | Requires licensing, KYC/AML and merchant payout rails |
| Bet history | Open/settled tickets | Open/won/lost/void cards with selections, settlement time and payout | Complete | No cash-out; 1X2 demo settlement is automatic |
| Game activity | Round history | Server rounds, outcomes, references, details | Complete | `Activity.tsx` |
| Notifications | All/unread/security | Notification centre, read/all, security tags | Complete | Global read updates currently affect global records |
| Security | Sessions, password, 2FA | Sessions, revoke, password, 2FA preference | Improved | Auth challenge not yet provisioned |
| Referrals | Referral links, rewards | Code, share, pending/rewarded, 1,000 coins each after first round | Complete | `referrals.js`; tested with smoke script |
| Support | Chat/tickets/FAQ | Ticket list, create, thread, reply; help centre | Complete | No live chat provider |
| Responsible gaming | Limits, self-exclusion, help | Daily/session limits, reality check, cool-off, self-exclusion | Complete | Limits apply to virtual credits |
| Help centre | Category/search/articles | 10 seeded articles, search, category filter, detail | Complete | Content from `shared/catalog.json` |
| Legal pages | Terms, privacy, AML, etc. | Terms, privacy, cookies, AML, bonus, affiliates, responsible | Complete | Not legal advice |
| Promotions | Deposit/cashback/free bet campaigns | Coin campaigns with terms, no cash value | Improved | Automated promo payout engine absent |
| Tournaments | Live leaderboards | Seeded tournament cards/standings, qualifiers linked | Complete | Automated qualification worker absent |
| Master Admin dashboard | Global analytics/network | Metrics, series, alerts, audit chain, export | Complete | `admin/Dashboard.tsx` |
| Revenue & risk | GGR/NGR, exposure, product mix | Sports/game GGR, open exposure, deposits, bonus cost, active players | Complete | `admin/Revenue.tsx`; scoped; `risk-smoke.mjs` |
| Risk limits | Stake/payout caps | Master-only `maxSportsStake` / `maxSportsPayout`, server-enforced and audited | Complete | Settings group + API enforcement |
| Delegated admin | Scoped admin dashboard | Same dashboard with server-derived scope | Complete | `getScopedAccountIds` |
| Admin account management | Restrictions, credits, roles | Search, suspend/restore, credit, role, revoke sessions | Complete | Tested 200 response and ledger update |
| Staff credentials | Invite/admin accounts | Master-only issuance, one-time login ID/password, copy handoff, revoke | Complete | Password shown once; admins cannot create staff logins |
| Network visualization | Hierarchy tree | Recursive tree with role and balance | Complete | Scope verified via API |
| Transfers | Request/approve network moves | Request/approve/reject workflow | Complete | Tested UI; server scope checks |
| Game catalogue admin | Visibility/featured | Status, featured, copy controls | Complete | Outcomes/RTP not editable |
| Content admin | CMS/promotions | Page and promotion editing, audit | Complete | Promotions are coin-funded only |
| Credit admin | Manual adjustments | Player-only adjustment, reason, audit event | Complete | Browser test recorded 250 coins |
| Support admin | Assign/status/reply/internal | Status, priority, assignment, public/internal replies | Complete | Browser tested |
| Security centre | Sessions, failed logins, suspension | Events, chain status, revoke sessions | Complete | No forced password reset |
| Audit trail | Immutable history | Hash chain, paginated view, export, trigger | Complete | SQL tamper tests rejected |
| Configuration | Platform settings | Master-only settings, real-money lock | Complete | Real-money enable rejected |
| System health | API/DB/engine/status | Live health, memory, DB size, services, counts | Complete | No external provider health |
| Responsive | Desktop/tablet/mobile | Tested 320–2560 for overflow; mobile layouts | Complete | `RESPONSIVE_TEST_REPORT.md` |
| Accessibility | Keyboard, focus, labels | Skip link, focus rings, aria labels, reduced motion | Improved | Full WCAG audit still recommended |
| Real-money operation | Licensed wagering | Disabled and hard-locked | Legal/restricted | Requires licence/KYC/payments |
| Provider games | Certified integrations | Labelled integration-ready pages | Integration required | Requires provider contracts/session adapter |
| Sports settlement | Live results/settlement | Server demo worker finishes fixtures and settles 1X2 singles/accas with notifications and audit events | Improved | `backend/src/services/sportsbook.js`, `scripts/settlement-smoke.mjs`; no real feed or multi-market engine |

## Priority work remaining

1. Multi-market sportsbook model (double chance, totals, BTTS, team wins).
2. Email/phone verification and password-reset delivery.
3. Automated promotion/tournament settlement engine.
4. Provider adapter contract and certified game sessions.
5. Translation catalogues and locale selector.
6. WCAG automation and screen-reader pass.
7. Real-money rails only after licensing and legal approval.
