# KNOWN BLOCKERS — 19xbet365

> **Historical note (26 November 2026):** The provider-certified-integration blocker below remains valid, but the statement that provider-labelled titles return `provider_required` is superseded. All 55 catalogue titles are now playable 19X Originals. See `README.md`.

Date: 24 November 2026. External or regulatory dependencies that the current engineering cannot resolve; each is recorded with evidence and what would unblock it.

## 1. Legal / licensing (hard blocks — do not guess)

1. **Real-money deposits/withdrawals/wagering** — requires jurisdiction-specific licensing, merchant account/payment rails, KYC/AML, transaction monitoring, responsible-gaming approvals, withdrawal policy and external testing. Currently hard-locked (`realMoneyEnabled` false, `PAYMENTS_LIVE_ENABLED` default false).
2. **Provider-certified game integrations** — requires provider contracts/session adapters/certification. All 55 current titles are in-house 19X Originals; no certified provider or live-dealer session is connected. Evidence: `docs/PRODUCTION_READINESS.md` "NO-GO until contracts/certification/session adapter".
3. **Legal pages** — demonstration only; jurisdiction review required.

## 2. Providers / external feeds

4. **Authorized sports data feed + provider integration** — needed for live-match real-time. No credentials/agreement available. Mitigation: documented integration boundary (see `SPORTS_AND_LIVE_DATA_ARCHITECTURE.md`); demo settlement worker is the current state.
5. **Email/SMS provider** — registration verification, password-reset delivery, account-lockout notifications. Request recording exists; delivery does not.
6. **2FA provisioning (authenticator/SMS)** — stored preference exists; provisioning requires providers/keys.
7. **KYC document upload / verification** — policy text exists; upload flow not built.

## 3. Infrastructure / operational

8. **Backup / PITR automation** — not in repo; restore-drill recommendations only.
9. **Distributed rate limiting (Redis)** — current in-memory per-process limit; scaling note in `docs/KNOWN_LIMITATIONS.md` (item 21).
10. **Production CSP + CSRF tokens** — disabled/absent; documented hardening plan in `docs/PRODUCTION_READINESS.md` (Required before production exposure #1, #2).
11. **External penetration test / security review** — recommended before exposure.

## 4. Scope decisions (not blockers, documented trade-offs)

12. **Multi-market sportsbook model** (double chance, totals, BTTS, team wins, live-market suspension, cash-out) — no real feeds; building fabricated markets would be misleading. Alternative considered: extend demo 1X2 model only, document multi-market as future work.
13. **More game titles** (bingo, lotto, poker, TV games, hunting/fishing, scratch cards) — catalogue gaps vs reference; decision pending provider/art licensing.

## 5. Session-specific limits (this session)

14. No real-device gesture/touch QA (width-based responsive harness only).
15. Documented via `docs/PRODUCT_PARITY_MATRIX.md` statuses — `Not verified` for some items.

## How to resolve

Each item needs a person-signed decision (see `docs/ASTRA_HANDOFF.md` for delegation guidance) plus the evidence chain above. Do not enable gated features as placeholders.
