# Database Architecture

The full v2 domain model, ERD, invariants and scaling plan are in [`DATABASE_DESIGN_V2.md`](DATABASE_DESIGN_V2.md). This page is the operational summary.

## Engine and files

- PostgreSQL 16, database `astra_play`.
- Development default: `postgres://postgres@127.0.0.1:5433/astra_play`.
- Pool and transaction helpers: `backend/src/db.js`.
- Baseline schema: `backend/db/schema.sql`.
- Versioned migrations: `backend/db/migrations/` and `schema_migrations`.
- Seed: `backend/db/seed.js`.
- Migration runner: `backend/db/migrate.js` (`npm run db:migrate`).
- Invariant audit: `backend/db/audit.js` (`npm run db:audit`).

Never edit an applied migration. Add the next numbered migration and run `db:migrate`.

## Domain tables

```text
roles 1 ── * accounts
accounts.parent_id ── accounts (self-referencing hierarchy, cycle-protected)
accounts.referred_by ── accounts (referral ownership)
accounts 1 ── * sessions
accounts 1 ── * login_history (append-only)
accounts 1 ── * referrals (referrer/referee)
accounts 1 ── * account_transfers / account_invitations
accounts 1 ── * bets 1 ── * bet_selections ── matches
matches 1 ── * match_odds_history
accounts 1 ── * game_rounds ── games
accounts 1 ── * transactions (append-only wallet ledger)
accounts 1 ── * deposit_requests / withdrawal_requests
accounts 1 ── * bonus_grants
accounts 1 ── * notifications
accounts 1 ── * support_tickets 1 ── * support_messages
accounts 1 ── 1 responsible_limits 1 ── * responsible_limit_events
accounts 1 ── 1 account_verifications 1 ── * kyc_documents
accounts 1 ── * fantasy_entries ── fantasy_contests
fantasy_contests 1 ── * fantasy_prize_tiers
fantasy_contests 1 ── * fantasy_player_stats
fantasy_contests 1 ── 1 fantasy_settlements (append-only)
accounts * ── * games via favorites / recent_plays
audit_events.actor_id ── accounts (hash-chained, append-only)
```

## Integrity guarantees

1. **Wallet reconciliation:** `wallet_reconciliation` compares `accounts.balance` with the sum of append-only transactions. Latest run: 30/30 balanced.
2. **Ledger append-only:** `transactions_append_only` rejects UPDATE/DELETE. A unique `(account_id, reference_type, reference_id, type)` index prevents duplicate credits/debits.
3. **Immutable settlement:** settled/void game rounds, settled sports bets, settled selections, settled fantasy entries and fantasy settlement rows reject mutation.
4. **Review integrity:** deposit amount/reference and withdrawal amount/destination cannot change after submission; final states cannot transition again.
5. **Hierarchy safety:** a recursive trigger rejects account parent cycles.
6. **Fantasy integrity:** lineup trigger validates players, teams, salary cap, cricket role quotas, captain/vice-captain and team limits; prize tiers cannot overlap.
7. **KYC history:** every submission is stored in `kyc_documents`, with superseded/approved/rejected states.
8. **Responsible-play history:** every limit insert/update is captured in `responsible_limit_events`.
9. **Odds audit:** every inserted/updated fixture odds row is captured in `match_odds_history`.
10. **Audit chain:** `audit_events` is append-only and hash-chained; `appendAudit` serializes chain appends with an advisory lock.
11. **Money locks:** every wallet mutation uses `SELECT … FOR UPDATE` on the account row. Balance and ledger rows commit together.
12. **Versioned schema:** applied migrations are recorded in `schema_migrations`; the seed force-reapplies migrations after the v1 baseline so functions and triggers cannot drift.

## Verification

```bash
npm run db:migrate   # pending migrations only
npm run db:seed      # schema + migrations + clean demo data
npm run db:audit     # reconciliation and trigger/invariant tests
```

The audit checks required tables/triggers, ledger balance, duplicate references, and direct mutation rejection for wallet transactions, settled rounds, settled bets and deposit amounts.

## Backup and production controls

- PITR with encrypted WAL archives; tested restores.
- Daily logical backups plus retention for ledger, audit and settlement data.
- Restricted application DB role: no DDL, no trigger ownership, no superuser.
- Monthly partition strategy for `transactions`, `audit_events`, `login_history`, `game_rounds` and `match_odds_history` at scale.
- Scheduled `wallet_reconciliation` monitor with alerts on any mismatch.
- External penetration test and legal/compliance review before real-money activation.

The current wallet is a single-entry player ledger with reconciliation. A regulated real-money operator should add an operator-side double-entry journal, multi-currency wallets and PSP reconciliation tables as described in `DATABASE_DESIGN_V2.md`.
