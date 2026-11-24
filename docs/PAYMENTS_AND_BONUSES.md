# Payments, Deposits and Bonuses

**Status:** sandbox-ready deposit and review flow; **live cash collection is not activated** in this environment.

## Why this exists

The product is no longer structured as a play-only wallet. The account now has a real deposit-request flow that can be connected to an operator payment QR, reviewed by Master Admin, and credited to the coin balance with a transparent deposit bonus.

The code deliberately separates:

1. **sandbox** — the shipped default. Requests and approvals exercise the full workflow, but no real money is collected and balances are sandbox coins.
2. **manual_review** — intended for an operator with a verified QR and compliant payment process. The server still rejects collection unless `PAYMENTS_LIVE_ENABLED=true`.
3. **disabled** — no new deposit requests.

`realMoneyEnabled` remains hard-locked. A QR image alone does not make a real-money launch legal or operationally complete.

## Player flow

1. Player opens **Account → Add coins**.
2. The page shows the configured payment QR (or a clearly labelled placeholder if operations has not uploaded one), instructions, minimum/maximum and bonus tiers.
3. Player enters the amount, payment reference/UTR and optional note.
4. A pending deposit request is created and a notification is recorded.
5. Master Admin opens **Control room → Deposit review**, verifies the reference, and approves or rejects.
6. Approval atomically:
   - credits the deposit to the wallet;
   - calculates the bonus from the server-side tier table;
   - writes a separate `deposit_bonus` ledger entry;
   - updates the request with reviewer, note and timestamp;
   - sends a player notification;
   - appends a hash-chained audit event.

Players can cancel their own pending requests. Pending requests are capped at three per account to prevent queue flooding.

## Bonus tiers

Default, configurable in `platform_settings.depositBonusTiers`:

| Deposit | Bonus |
| --- | --- |
| 100+ coins | 5% |
| 500+ coins | 10% |
| 1,000+ coins | 15% |
| 5,000+ coins | 20% |

The highest matching tier applies. Bonuses are calculated on the server at approval time, not trusted from the client. The client previews the same tier for transparency.

For a real-money launch these tiers need jurisdiction-specific terms, wagering/playthrough rules, max-bonus caps, expiry, forfeiture and responsible-gaming review. Those rules are **not** implemented in this sandbox.

## Operator configuration

Master Admin → Configuration exposes:

- `depositMode`: `sandbox`, `manual_review`, `disabled`
- `depositQrImageUrl`: payment QR image URL
- `depositInstructions`: instructions shown to the player
- `depositBonusTiers`: comma-separated `minimum:percent` tiers
- `depositMin`, `depositMax`

The QR image can be an uploaded asset path or an HTTPS URL controlled by the operator. The application never generates or modifies payment QR content.

## Hard activation gate

`manual_review` alone is not enough. The server checks:

```text
PAYMENTS_LIVE_ENABLED=true
```

If this is absent or false, a live-mode deposit request is rejected with `payments_not_activated`. This prevents an accidental QR plus setting change from silently turning on cash collection.

## Required before real-money launch

These are external dependencies, not UI tasks:

1. Gaming licence for the operating jurisdiction and legal sign-off.
2. Merchant/payment-provider contract, settlement account and reconciliation process.
3. KYC/AML identity verification, sanctions screening, source-of-funds checks and transaction monitoring.
4. Verified QR owned by the legal entity; never a personal QR.
5. Deposit limits, withdrawal policy, chargeback/fraud handling and refund rules.
6. Bonus terms with wagering, expiry, max cap and prohibited-play rules.
7. Responsible-gaming limits, self-exclusion, age verification and support escalation.
8. Tax reporting and record retention.
9. External penetration test, infrastructure monitoring and PITR backups.
10. Customer support SOP for unmatched transfers, duplicate references and rejected payments.

## Verification

```bash
node scripts/deposit-smoke.mjs
```

The smoke test verifies:

- sandbox config and QR/instructions response;
- request creation and pending status;
- admin queue visibility;
- approval, 15% tier bonus on a 1,000-coin request;
- deposit + bonus ledger entries;
- balance reconciliation;
- player cancellation;
- Master Admin rejection;
- the `manual_review` activation gate rejects collection while live payments are disabled.
