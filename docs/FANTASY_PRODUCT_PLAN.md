# Fantasy Product Build Plan

**Status:** sandbox v1 implemented; real-money entry and withdrawals remain gated
**Prepared:** 25 November 2026
**Baseline:** `docs/REAL_USER_AUDIT_2026-11-25.md`

The current product is a sandbox sportsbook/casino. This plan defines the smallest credible **salary-cap fantasy** build that fits the existing wallet, ledger, audit, support and admin architecture. Real-money entry remains gated until legal, KYC, payment and data-provider work is complete.

## 1. Product definition (recommended)

- **Format:** daily salary-cap fantasy.
- **First sport:** football (11 players) or cricket (11 players), using the sport already targeted by the operator.
- **Salary cap:** 100 credits.
- **Lineup:** position quotas, no duplicate players, one captain (2Ã—) and one vice-captain (1.5Ã—).
- **Contest states:** `draft â†’ open â†’ locked â†’ live â†’ settled`, plus `cancelled`.
- **Entry:** fixed coin entry; transactional debit; one entry per user per contest by default.
- **Prize pool:** fixed or guaranteed tiers for the top ranks; ties split equally.
- **Lock:** server rejects entries after the contest lock time.
- **Cancellation:** if a contest is cancelled before lock, every entry is refunded and audited.
- **Data:** demo player pool/stats initially; real player data requires a licensed feed.

### Deliberately out of scope for the first release
- Season-long leagues.
- Private leagues and invite codes.
- Multi-sport slates.
- Live fantasy scoring updates during matches.
- Automated prize withholding/tax reporting.
- Real-money entry and withdrawals until the compliance track is complete.

## 2. User journeys

### Player
1. Open **Fantasy** from the main navigation.
2. Browse open contests with entry fee, prize pool, spots left, lock time and sport.
3. Open a contest and view the player pool, salaries, positions and fixture.
4. Build a lineup within the salary cap.
5. Choose captain and vice-captain.
6. Enter the contest with coins.
7. See entry confirmation, wallet debit, and contest entry in **My Fantasy**.
8. At lock, lineup becomes read-only.
9. After settlement, see rank, points and prize; wallet receives the payout.
10. If the contest is cancelled, see the refund and notification.

### Master Admin
1. Create a contest from an upcoming fixture/slate.
2. Set entry fee, salary cap, max entries, prize tiers and lock time.
3. Review player pool and contest state.
4. Cancel and refund, or trigger settlement after results.
5. Review entries, lineups, scores, payouts and audit trail.

## 3. Data model

```text
fantasy_contests
  id, name, sport, fixture_id, status, salary_cap, entry_fee,
  max_entries, max_entries_per_user, lock_at, starts_at,
  prize_pool, rake, rules_json, created_by, settled_at, created_at

fantasy_prize_tiers
  id, contest_id, rank_from, rank_to, amount

fantasy_players
  id, sport, team, name, position, salary, external_ref, active

fantasy_player_stats
  id, contest_id, player_id, points, stats_json, updated_at

fantasy_entries
  id, contest_id, account_id, lineup_json, captain_id, vice_captain_id,
  entry_fee, status, score, rank, payout, created_at, settled_at

fantasy_settlements
  id, contest_id, settled_by, total_entries, total_paid,
  reconciliation_json, created_at
```

Key constraints:
- Unique `(contest_id, account_id)` when `max_entries_per_user = 1`.
- `entry_fee >= 0`; prize tiers cannot exceed the prize pool.
- Lineup validation is server-side and transactional.
- Wallet debit and entry insert happen in one transaction.
- Settlement and payouts are idempotent and audited.

## 4. API surface

```text
GET  /api/fantasy/contests
GET  /api/fantasy/contests/:id
GET  /api/fantasy/contests/:id/players
GET  /api/fantasy/contests/:id/leaderboard
GET  /api/fantasy/my-entries
POST /api/fantasy/contests/:id/entries
PATCH /api/fantasy/entries/:id/lineup   (before lock only)

Admin / Master:
POST   /api/admin/fantasy/contests
PATCH  /api/admin/fantasy/contests/:id
POST   /api/admin/fantasy/contests/:id/cancel
POST   /api/admin/fantasy/contests/:id/settle
GET    /api/admin/fantasy/contests/:id/entries
```

All admin actions use `requireMaster` or an explicitly granted fantasy permission, and write audit events.

## 5. Server rules

### Lineup validation
- Exactly the required number of players.
- Valid position quotas.
- No duplicate player IDs.
- Total salary â‰¤ salary cap.
- Captain and vice-captain must be in the lineup and distinct.
- Contest must be `open` and before `lock_at`.
- User must have enough coins.
- User must not exceed entry limits.

### Scoring
- Sum selected player points.
- Captain receives 2Ã— points; vice-captain 1.5Ã—.
- Ties share the combined prize for occupied ranks.
- Payouts credit the wallet ledger with reference `fantasy_contest` and the contest ID.
- Settlement is idempotent: re-running must not pay twice.

### Cancellation
- Only before lock by default.
- Refund every confirmed entry to the original account.
- Mark entries `cancelled`, write audit events and notifications.

## 6. UI surfaces

- `/fantasy` â€” lobby with filters (sport, entry fee, status), contest cards and a â€œHow it worksâ€ strip.
- `/fantasy/:id` â€” contest summary, prize table, player pool, salary-cap meter, position slots, captain/vice selection, entry CTA.
- `/fantasy/my-entries` â€” upcoming, live and settled entries with scores and payouts.
- `/fantasy/:id/leaderboard` â€” rank, entry name, points and prize.
- Admin â†’ **Fantasy contests** â€” create/edit/cancel/settle, entry table, payout preview.
- Navigation: add **Fantasy** to the desktop nav, mobile drawer and footer.

Design must follow `docs/DESIGN_SYSTEM.md`: navy header, blue nav strip, 8px cards, Roboto, green conversion actions, accessible states. No fabricated live scores; demo data is labelled.

## 7. Compliance and real-money gates

Before enabling real-money entry:
- Licensed jurisdiction and legal opinion for paid fantasy contests.
- Age and geo eligibility checks.
- KYC and sanctions screening.
- Deposit limits, entry limits, self-exclusion and responsible-play controls.
- Payment merchant account, live QR/webhook confirmation and reconciliation.
- Withdrawal policy and payment execution.
- Prize/tax reporting rules.
- Published contest rules, cancellation/refund policy and terms.
- Fraud controls: multi-account, collusion, bot and chargeback detection.
- External penetration test and security review.

Until then, all contests are **sandbox coin contests** and must say so in the UI.

## 8. Delivery phases

### Phase 1 â€” Domain and demo data (sandbox)
- Schema, seed players/contest, wallet entry transaction, lineup validation.
- API list/detail/players/entry.
- Fantasy lobby and lineup builder.
- Admin contest list/create.
- Transactional tests and ledger/audit evidence.

### Phase 2 â€” Settlement and operations
- Lock job, demo scoring, leaderboard, payout tiers, ties.
- Cancellation/refund, idempotent settlement, admin settle UI.
- Notifications and audit.
- End-to-end Playwright tests and responsive QA.

### Phase 3 â€” Real-money compliance
- KYC page/provider adapter, geo/age checks, limits, terms.
- Deposit/withdrawal rails and reconciliation.
- Fraud controls and reporting.
- Legal review and external test.

### Phase 4 â€” Real data
- Authorized fixtures/player-stat provider.
- Scoring normalization, postponement/void rules.
- Live scoring only if the provider supports it.

## 9. Acceptance criteria for the sandbox release

- A new player can open Fantasy, build a valid lineup and enter with coins.
- Invalid lineup, salary-cap breach, duplicate player, late entry and insufficient balance are rejected server-side with clear errors.
- Wallet debit and entry creation are atomic; audit and notification records exist.
- Admin can create, cancel/refund and settle a contest.
- Settlement pays the correct ranks, splits ties, is idempotent and writes ledger/audit entries.
- Desktop and mobile layouts pass the existing responsive/overflow and Lighthouse gates.
- All paid-entry UI remains labelled sandbox until the compliance track is approved.

## 10. Open decisions

1. Football or cricket first?
2. 11-player salary cap or a simpler prediction format?
3. One entry per user or multi-entry?
4. Fixed prize pool or guaranteed?
5. Entry fee range and rake?
6. Which market/jurisdiction and payment/KYC providers?
7. Does the first release need real-money entry, or is a coin-sandbox release acceptable to validate mechanics?
