# Visual evidence

`capture/product/` contains **34 screenshots** of the 19xbet365 production build, captured by `scripts/capture-screenshots.mjs` in headless Edge at:

- **1440 × 900** desktop for public, fantasy, player, game, compliance and admin views;
- **390 × 844** mobile for home, sports, casino, fantasy, game, wallet, deposit, login and admin views.

The set includes fantasy cricket, identity verification, withdrawals, Master Admin revenue/risk, fantasy operations, KYC review and deposit review.

The script authenticates through the real API, uses a clean reseeded demo state, and captures live API data. Run it from the repository root while the Express server is running:

```bash
node scripts/capture-screenshots.mjs
```

The reference research captures used during the visual study are retained only in the local working environment and are excluded from this public repository because they contain third-party website artwork. See `docs/VISUAL_COMPARISON_REPORT.md` for the comparison notes.

Additional focused evidence:

- `capture/live-audit-2026-11-25/` — real-user audit, deposit review, revenue/risk and expected-bonus evidence.
- `capture/fantasy-audit/` — fantasy lobby, lineup builder, entry and admin operations.
- `capture/compliance-audit/` — KYC submission, approval, withdrawal and mark-paid evidence.
