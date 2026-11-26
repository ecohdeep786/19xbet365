# ASTRA HANDOFF — 19xbet365 (24 November 2026)

> **Historical note (26 November 2026):** This handoff was written on 24 November 2026, before all 55 catalogue games were made playable. Use `README.md` and `GAME_CATALOGUE.md` for current game and status information.

This document hands the product to the final review/acceptance owner ("Astra"). It summarises what exists, what changed this session, what is known to be missing, and what must not be claimed.

## 1. What the product is

A sandbox-coin gaming platform ("19xbet365") with:

- **Public product**: home, sports, live, esports, virtuals, casino, live-casino, slots, instant games, promotions, tournaments, search, help/legal pages.
- **Player journey**: registration → verification (request-based) → login → dashboard → wallet → sports bets → games → bets/activity/notifications → support → account settings → logout. Sandbox economy: all coin values are non-redeemable (`docs/KNOWN_LIMITATIONS.md`).
- **Master Admin** + delegated Admin/Sub-admin/Agent hierarchies with scope isolation and hash-chained audit trail.
- **Realtime**: WebSocket at `/ws` for bet/game/admin broadcasts.
- **Tech**: React 18 + Vite SPA, Express backend, PostgreSQL 16 at `127.0.0.1:5433` (`astra_play`), self-hosted Roboto/Roboto Condensed fonts.

## 2. Verification evidence (24 Nov 2026)

- Build gate: `node tools/package/bin/npm-cli.js --prefix frontend run build` → **PASS** (tsc + vite, dist ~168 KB gzip JS).
- Existing reports in `docs/`: `SECURITY_TEST_REPORT.md`, `END_TO_END_TEST_REPORT.md`, `RESPONSIVE_TEST_REPORT.md`, `UI_UX_AUDIT.md`, `VISUAL_COMPARISON_REPORT.md`, `PRODUCT_PARITY_MATRIX.md` (see `docs/MASTER_EXECUTION_PLAN.md` for statuses).

## 3. Session changes (since last handoff)

1. **Bet slip save/load implemented** (`frontend/src/state/BetSlipContext.tsx`):
   - `19x:bet-slip` localStorage restore-on-mount (validated: malformed entries ignored).
   - Auto-save on selections/stake change.
   - Convenience only: server remains authoritative on bet placement (`api.placeBet`); the save does not move money.
2. **Docs**: `CURRENT_PRODUCT_ANALYSIS.md`, `PRODUCT_GAP_ANALYSIS.md`, `MASTER_EXECUTION_PLAN.md`, `KNOWN_BLOCKERS.md` added; `PRODUCT_PARITY_MATRIX.md` row updated.

## 4. Still missing / blocked (do not claim otherwise)

See `docs/KNOWN_BLOCKERS.md`:

1. Real-money/legal licensing (withdrawals, live deposits) — hard-locked.
2. Certified provider games/sessions (live casino, provider slots, some virtuals).
3. Authorized sports feed + multi-market sportsbook (double chance, totals, BTTS, team wins, live-market suspension, cash-out).
4. Email/SMS verification & password-reset delivery; 2FA provisioning; KYC uploads.
5. Backup/PITR automation, CSP + CSRF tokens, Redis rate limiting, external pen test, WCAG deep audit.
6. Additional reference titles (bingo, lotto, poker, TV games, hunting/fishing, scratch cards).

## 5. Resume instructions (if interrupted)

1. Read `docs/MASTER_EXECUTION_PLAN.md` — statuses reflect reality.
2. Continue with plan steps 4-20 (`docs/PRODUCT_GAP_ANALYSIS.md`, `docs/PRODUCTION_READINESS.md`).
3. Gate: run `node tools/package/bin/npm-cli.js --prefix frontend run build` after any `frontend/` changes.
4. Update `docs/ASTRA_HANDOFF.md` when new facts change the blockers list.

## 6. Suggested next questions for the product owner

1. "Do we pursue certified provider/live-dealer parity next, or keep expanding the 19X Originals catalogue?"
2. "Should we implement the 1X2 multi-market model with fabricated odds, or extend demo settlement only (as documented)?"
3. "Do we want the two-hour Lighthouse/E2E verification deep-dive, or accept existing reports?"
