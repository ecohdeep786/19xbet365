# Live audit evidence — 25 November 2026

Captured by `scripts/live-user-audit.mjs` during a real-user run of the production build.

- `report.json` — machine-readable checks, credentials used for the run, console/page errors.
- `01-home-visitor.jpeg` — public home.
- `02-new-player-dashboard.jpeg` — new player after registration (10,500 coins).
- `03-fantasy-attempt.jpeg` — `/#/fantasy` 404; fantasy is not implemented.
- `04-bet-slip.jpeg` — 1X2 selection and 100-coin stake.
- `05-after-bet.jpeg` — balance after placement.
- `06-dice-result.jpeg` — server-settled Dice Roll round.
- `07-wallet.jpeg` — wallet ledger and disabled withdrawal.
- `08-deposit-request.jpeg` — sandbox 500-coin deposit request.
- `09-responsible.jpeg` — responsible-play settings.
- `10-support.jpeg` — support ticket.
- `11-mobile-drawer.jpeg` — 390px drawer with player card.
- `12-admin-deposit-queue.jpeg` — Master Admin sees the request.
- `13-admin-deposit-approved.jpeg` — approval result and expected bonus.
- `14-player-wallet-after-deposit.jpeg` — deposit and bonus ledger entries.
- `15-revenue-risk.jpeg` — revenue/risk dashboard added after the audit.
- `16-admin-deposit-expected-bonus.jpeg` — expected bonus shown before approval.

The audit created a temporary player and deposit; the database was reseeded afterwards. Screenshots preserve the evidence.
