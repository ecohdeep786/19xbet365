# Visual evidence

`capture/product/` contains 27 screenshots of the 19xbet365 production build, captured by `scripts/capture-screenshots.mjs` in headless Edge at:

- **1440 × 900** desktop for public, player, game and admin views;
- **390 × 844** mobile for home, sports, casino, game, wallet, deposit, login and admin views.
- Deposit and Master Admin deposit-review screens are included in the desktop set.

The script authenticates through the real API, captures live API data, and uses a clean reseeded demo state. Run it from the repository root while the Express server is running:

```bash
node scripts/capture-screenshots.mjs
```

The reference research captures used during the visual study are retained only in the local working environment and are excluded from this public repository because they contain third-party website artwork. See `docs/VISUAL_COMPARISON_REPORT.md` for the comparison notes.
