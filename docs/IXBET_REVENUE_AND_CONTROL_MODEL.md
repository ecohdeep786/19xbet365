# 1xBet Revenue, Money Flow and Control Model — Applied to 19xbet365

**Prepared:** 25 November 2026
**Purpose:** Document how a bookmaker/casino platform earns revenue and how the player money flow is controlled, then map that to the 19xbet365 build. Public 1xBet pages were studied; their internal admin panel is not public, so the control model below is derived from public rules, payment pages and standard regulated-operator practice.

## 1. Public evidence reviewed

- 1xBet general rules: https://1xbet.com/en/information/rules
- Accounts, payouts and bonuses: section 6
- Casino and RNG: sections 24 and 27
- AML and KYC: sections 29 and 30
- Responsible gaming: section 31
- Payment methods: https://1xbet.com/en/information/payment

Public rules state, among other things:

- Bets are server-registered and cannot be changed after acceptance.
- Stakes cannot exceed the customer's balance.
- The operator sets minimum/maximum stakes per selection and reserves the right to restrict stakes or odds for individual customers.
- Maximum return is limited (the reviewed page states €50,000 per bet).
- Outcomes are determined by an RNG for casino games; RTP is disclosed and independently tested.
- KYC/AML is mandatory; identity verification, source-of-funds checks, sanctions screening and transaction monitoring apply.
- Large casino wins are manually reviewed and approved before withdrawal.
- India payment methods shown include UPI, PhonePe, Google Pay, NEFT, IMPS and bank transfer, generally with minimums of ₹300–₹1,000, no displayed fee and 5–15 minute processing.

## 2. How the platform earns revenue

### Sportsbook margin
- Every market has odds that imply a combined probability above 100%. The excess is the **overround** or bookmaker margin.
- Example: odds 2.05 / 3.10 / 3.90 imply 48.78% + 32.26% + 25.64% = **106.68%**, a 6.68% theoretical margin.
- The operator keeps the margin over a large volume of bets. Individual results are random and can produce short-term losses.
- Additional levers: maximum stake/payout limits, market suspension, odds limits per customer, cash-out/trade-out margin, void/refund rules.

### Casino house edge
- Each game has an RTP below 100%; the difference is the house edge.
- Example originals: Dice ~99% RTP, Coinflip ~98%, Mines ~97%; provider games have their own certified RTP.
- The operator does not need to manipulate a specific round. Revenue comes from the mathematical edge over many rounds.
- Provider games may pay a revenue share to the provider and platform.

### Bonuses and breakage
- Bonuses are marketing cost and carry wagering/expiry terms.
- Unused/expired bonus value may be removed under published terms; this is not a substitute for a licensed bonus policy.
- Deposit bonuses, free bets and cashback must be budgeted and monitored separately from GGR.

### Payments and limits
- Deposits are not revenue; they are player liabilities until wagered/lost or withdrawn.
- Payment fees, currency conversion and withdrawal processing costs affect net revenue.
- Segregated player funds, reconciliation and responsible-gaming limits are part of the operating cost.

## 3. Player money flow

```text
Register → age/geo/KYC → deposit (payment method) → wallet balance
   → sports bet or casino round → settlement (win/loss/void)
   → wallet balance → withdrawal request → KYC/AML review
   → payment execution → reconciliation → audit
```

Controls required at each step:
- Registration: age, country, duplicate-account checks.
- Deposit: method limits, ownership checks, AML thresholds, chargeback risk.
- Play: stake/payout limits, market suspension, exposure, RTP-certified games.
- Settlement: server-authoritative, immutable, auditable, correct void rules.
- Withdrawal: KYC, source-of-funds, bonus wagering completion, payment method match, approval.
- Reporting: GGR/NGR, deposits, withdrawals, bonus cost, open liability, tax.

## 4. Control model for 19xbet365

### Master Admin — global authority
- Roles and permissions, staff credential issuance.
- Global financial settings: deposit/withdrawal configuration, payment/KYC providers, real-money gate.
- Global risk caps: maximum sports stake, maximum sports payout, maximum game stake.
- Global revenue, liability, audit and system health.
- Manual balance adjustments with mandatory reason and immutable audit.
- Deposit/withdrawal review and high-risk account decisions.

### Admin — scoped operations
- Manage scoped users, restrictions, sessions.
- Manage game catalogue availability/featured status within the Master's global policy.
- Support, scoped reports and operational monitoring.
- Cannot issue staff credentials, change roles, open global settings, review deposits or enable real money.

### What must never be editable
- A settled game outcome or sports result.
- A player's historical wallet transaction.
- The audit chain.
- An individual user's RNG result.
- Odds after a bet is accepted (except documented void/refund rules).

“Control” means configuration, limits, monitoring and settlement rules — not choosing winners after the fact. That distinction is required for licensing and player trust.

## 5. Current 19xbet365 position

Implemented:
- Server-authoritative originals with fixed math in `gameEngine.js`.
- Seeded sportsbook odds with overround.
- Transactional wallet and immutable settled rounds.
- Hash-chained audit trail.
- RBAC with Master/Admin/Sub-admin/Agent scopes.
- Game catalogue publish/hide/feature controls.
- Deposit QR request and Master review with bonus tiers.
- Manual credit adjustments with reason and audit.
- Basic revenue metrics on the command centre.

Added in this pass:
- **Revenue & risk** admin page: sports/games GGR, open exposure, deposits, bonus cost, net revenue, active players and product mix.
- **Sports risk caps**: `maxSportsStake` and `maxSportsPayout` settings, enforced server-side.
- Settings grouped into risk controls; every change audited.

Still missing:
- Withdrawal request/approval/payment execution.
- KYC document upload/verification and geo/age gating.
- Live payment QR/merchant webhook and reconciliation.
- Per-game min/max stake controls.
- Sports odds/margin configuration, market suspension and manual result/settlement controls.
- Exposure/liability caps by sport/market/customer.
- Fraud/AML transaction monitoring.
- Real sports/player data feed and certified RNG/game math audit.
- Provider game sessions.

## 6. Recommended build order

1. **Master Control Center** (current slice): revenue/risk dashboard, sports stake/payout caps, per-game stake limits, audited settings.
2. **Withdrawal + KYC**: request intake, document upload, Master review, payment status, ledger, audit; no live payout until merchant rails exist.
3. **Sportsbook control**: margin/odds config, market suspension, event result entry, void/refund, exposure caps.
4. **Real-money payments**: business-owned QR/merchant, webhook confirmation, reconciliation, chargeback handling.
5. **Fraud/AML**: duplicate checks, velocity rules, sanctions/PEP screening, source-of-funds, reporting.
6. **Certification/ops**: RNG/RTP audit, penetration test, backups/PITR, monitoring, legal sign-off.
7. **Fantasy product**: only after the format, market and data provider are decided; use the existing wallet/audit/admin foundation.

## 7. Operating rules to preserve

- No fabricated live data or provider sessions.
- No outcome editing or player-specific RNG changes.
- No real-money enablement while `PAYMENTS_LIVE_ENABLED` / licensing / KYC gates are absent.
- Every financial or configuration change has an actor, reason, before/after state and audit event.
- Revenue reporting separates GGR, bonus cost, deposits (liability) and player balances.
