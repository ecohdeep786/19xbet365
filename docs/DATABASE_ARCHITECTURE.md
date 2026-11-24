# Database Architecture

## Engine and connection

- PostgreSQL 16, database `astra_play`.
- Development default: `postgres://postgres@127.0.0.1:5433/astra_play`.
- Pool and transaction helpers: `backend/src/db.js`.
- Schema: `backend/db/schema.sql`.
- Seed: `backend/db/seed.js`.
- `DATABASE_URL` can override the connection string.

## Tables and relationships

```text
roles 1 ── * accounts
accounts.parent_id ── accounts (self-referencing hierarchy)
accounts.referred_by ── accounts (referral ownership)
accounts 1 ── * sessions
accounts 1 ── * login_history
accounts 1 ── * referrals (referrer/referee)
accounts 1 ── * account_transfers
accounts 1 ── * account_invitations
accounts 1 ── * bets 1 ── * bet_selections ── matches
accounts 1 ── * game_rounds ── games
accounts 1 ── * transactions
accounts * ── * games via favorites
accounts * ── * games via recent_plays
accounts 1 ── * notifications
accounts 1 ── * support_tickets 1 ── * support_messages
accounts 1 ── 1 responsible_limits
games * ── * promotions/tournaments (catalogue references)
audit_events.actor_id ── accounts
platform_settings.updated_by ── accounts
content_pages.updated_by ── accounts
```

## Key column groups

- **accounts:** username/email unique lower-case indexes, scrypt password hash, role code, parent tree, referral code, status (`active|suspended|pending|closed`), balance `NUMERIC(14,2)`, XP/level, country/phone, avatar seed, 2FA/marketing flags, suspension reason, timestamps.
- **sessions:** SHA-256 token hash, IP/UA, created/last-seen/expiry, revocation.
- **matches:** sport/league/teams, start time, status, live/final score text, 1X2 odds, demo flag, generated `result_home`/`result_away` integers and `settled_at` for the demo worker.
- **bets:** single/acca, stake, total odds, potential return, status (`open|won|lost|void|cashed_out`), payout, placement/settlement.
- **deposit_requests:** player, amount, method, payment reference, note, pending/approved/rejected/cancelled status, bonus amount, reviewer and review timestamps.
- **bet_selections:** fixture, home/draw/away selection, locked odds, per-selection result (`pending|won|lost|void`).
- **game_rounds:** game, stake, payout, status (`open|settled|void`), outcome/state JSONB, seed hash/client seed/nonce, timestamps.
- **transactions:** type-constrained wallet ledger including `deposit` and `deposit_bonus`, amount, balance-after (non-negative), reference type/id, created-by, timestamp.
- **audit_events:** actor, action, entity, summary, before/after, IP, previous hash, event hash, created.
- **platform_settings:** JSONB values and descriptions.
- **responsible_limits:** daily bet limit, session/reality-check minutes, cool-off and self-exclusion timestamps.

## Integrity and security

1. **Append-only audit:** `prevent_audit_mutation()` raises on UPDATE/DELETE of `audit_events`.
2. **Immutable settled rounds:** `protect_settled_rounds()` raises if payout, outcome, or status changes after settlement.
3. **Wallet row lock:** every stake/win/refund uses `SELECT … FOR UPDATE` on the account.
4. **Transactional settlement:** debit, round insert, payout, ledger rows, and settlement commit atomically. Demo sports settlement follows the same rule across fixture result, selection results, bet status, wallet credit and audit event.
5. **Fixture locking:** bet placement locks selected fixtures `FOR UPDATE` in ID order; the worker processes due fixtures `FOR UPDATE SKIP LOCKED`, preventing a closed market from accepting a concurrent bet.
6. **Audit chain serialization:** `appendAudit` takes `pg_advisory_xact_lock(824001)` before reading the chain tip.
7. **Non-negative balances:** database check on balance and transaction balance-after.
8. **Unique identities:** lower-case unique indexes for email and username; unique referral code; unique session token hash.
9. **Scope relationships:** recursive `parent_id` walk is done in SQL and never trusted from the client.

## Seed model

`backend/db/seed.js` recreates:

- 5 roles and 26 permissions.
- 1 Master Admin, 2 Admins, 2 Sub-admins, 3 Agents, 22 Players (30 accounts).
- 12 sports, 38 demo fixtures, 44 game catalogue entries.
- Welcome/history transactions, historical rounds and 5 bets for the demo player.
- Favorites, recent plays, notifications, responsible limits.
- 3 support tickets with staggered message timestamps.
- 2 pending transfers and 1 pending invitation.
- 6 promotions, 4 tournaments, 8 content pages, 10 help articles, 13 settings.
- 10 initial hash-chained audit events.

## Immutability test evidence

Direct SQL tests were rejected as expected:

```text
UPDATE audit_events ...   -> ERROR: audit_events is append-only
DELETE FROM audit_events  -> ERROR: audit_events is append-only
UPDATE game_rounds ...    -> ERROR: settled rounds are immutable
```

## Backup/recovery recommendation

Before a production launch:

- run PostgreSQL with PITR/continuous archiving;
- take encrypted daily logical backups plus WAL archives;
- test restore in an isolated environment;
- retain audit/settlement backups according to policy;
- grant the application a restricted role (no DDL, no trigger/schema privileges);
- rotate the database credential and restrict network access to the API host.
