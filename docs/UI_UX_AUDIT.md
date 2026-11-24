# UI/UX Audit — reference study to production QA

**Date:** 24 November 2026  
**Reference:** public 1xBet live page (`1xlite-12669.pro/en/live`)  
**Product:** 19xbet365 production build served by Express at `http://127.0.0.1:4000`

This audit records the interface principles studied, the translation into 19xbet365, the defects found in real-user QA, and the final verification.

## 1. What makes the reference feel clear

The public live page was inspected at desktop width. Measurements were taken from computed styles and visible layout only; no reference code, CSS or assets were copied.

| Pattern | Observed reference behaviour | Action in 19xbet365 |
| --- | --- | --- |
| Typography | Roboto, body 16px; most interface copy 12–14px; bold odds and team names; very tight line heights | Sora/Manrope retained; 15px body; 11–16px interface copy; tabular numerals for odds and balances |
| Chrome | 96px dark-blue header (`#1d4268`), separate nav row, 32px nav targets, 8px radius | 99px deep-blue public header; 32px nav rhythm; 8px controls; mobile drawer below 1180px |
| Information density | Two-column match group grid at wide desktop; 32px odds cells; icons on nearly every row | One clear league column plus a persistent bet-slip rail; 42–44px odds targets on mobile; no fake markets |
| Icon language | ~849 SVG nodes and ~142 images on the inspected live page; flat sport glyphs, flags, team marks, TV/stats/favourite cues | Original 17-mark `SportIcon`, deterministic `TeamBadge`, `ProviderMark`, category icons; no copied or third-party artwork |
| Colour | White cards on blue-grey canvas; one blue action family; green and coral used sparingly for live/price states | White cards on pale-blue canvas; blue navigational family; green CTA/win; dark coral live labels with accessible contrast |
| Hierarchy | League heading → fixture teams → score/time → three odds cells; the eye never has to hunt | Same sequence, plus larger team badges, sport glyphs and a visible selected/disabled state |
| Density vs clarity | Very dense, but users understand it because repeated patterns never change | Kept repeated patterns, increased spacing and removed decorative competition between items |

The reference is attractive because it is **predictable**, not because it is large. The Apple-inspired response is therefore not to copy its 12px density, but to preserve predictable rows, strong hierarchy, legible controls and unmistakable state.

## 2. Interface changes made

### Game cover imagery
- Replaced single-glyph card art with 12 families of full-bleed, original SVG cover illustrations: rocket orbit, vault, plinko, dice, wheel, coins, cards, lottery, reels, racing, live table and instant ticket.
- Every playable and provider card now carries a picture-led cover, varied by game theme and selected per live-casino game where appropriate.
- Covers use layered gradients, perspective, rim light, particles and a title-safe darkening gradient so the card title and provider remain readable.
- Added a subtle hover scale for pointer users, disabled under `prefers-reduced-motion`.

### Action hierarchy and colour
- Primary actions now use a deep blue gradient rather than repeating a saturated green everywhere.
- The header conversion action is a crisp white pill with deep-blue text.
- Emerald is reserved for success, winning amounts, selected odds and settled/live cues.
- All-blue/white buttons were rechecked for AA contrast, and the 42px mobile odds targets remain.

### Typography and readability
- Kept supplied Sora display / Manrope body fonts only.
- Raised the public interface's microtype floor: former 7.7–9.3px labels now render at **11.2–12.5px**, with 12–12.8px metadata, 13px odds, 16px body copy and 16px form controls (also preventing mobile input zoom). This is deliberately more readable than the reference's 12px dense minimum while preserving its compact rhythm.
- Added tabular and lining numerals for odds, balances and timestamps.
- Added font smoothing, optical sizing, `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.
- Darkened secondary ink from `#71869b`/`#7c90a4` to `#526a82`; positive amounts use `#14773a` instead of the lower-contrast lime text.
- Increased mobile odds targets to 42px and kept all controls labelled in full words rather than unexplained abbreviations.

### Navigation and icons
- Original sport glyphs replace reused generic Lucide marks.
- Category icons added to desktop nav, mega-menus, mobile drawer and casino filter chips.
- Team badges and provider marks give dense rows a stable visual anchor.
- Header density was rebalanced at 1181–1400px: tighter nav padding, hidden duplicate balance chip, locale hidden below 1440px.

### Interaction and accessibility
- Bet slip, mobile drawer and generic modals now use a shared dialog helper:
  - Escape closes.
  - Background scroll locks with a multi-dialog counter.
  - Initial focus enters the panel.
  - Tab cycles inside the panel.
  - Focus returns to the trigger.
- Notification, account and search popovers close with Escape.
- Notification count is included in the accessible name.
- Odds buttons use content-derived accessible names with full team context.
- Auth pages now expose a single `<main>` landmark.
- `robots.txt` added for valid crawler policy.
- Contrast failures on home, sports, login, account, game and tournaments corrected.
- Static “Next round in 03s” urgency removed; virtual-sports clock replaced with “Instant / server-recorded”.
- Playable-original metric now uses the real count instead of a hard-coded `+3`.

## 3. Real-user QA performed

A Playwright/Edge end-to-end run exercised the production build as a new player and then as Master Admin. The final run passed **32/32 checks**.

Passed checks included:

- Home renders brand, navigation icons, sport glyphs, team badges and illustrated game covers.
- Logged-out playable game routes show an account-required panel instead of a misleading 0 VC play surface.
- Deposit page loads the QR/instructions configuration, bonus preview, request form and request history.
- Registration creates a player, navigates to the account and shows 10,500 coins.
- Sports selection opens the bet-slip dialog, receives focus, debits 50 VC and closes after placement.
- Dice Roll plays and settles with a server result.
- Wallet ledger and My Bets show the new records.
- Support composer opens a ticket.
- Mobile drawer opens as a modal, traps focus, closes on Escape and restores focus.
- Bet slip locks page scroll on mobile, closes on Escape and unlocks.
- Demo player login, account security, Master Admin dashboard and audit route all render.
- No console or page errors during the run.

## 4. Lighthouse verification

| Page | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| Home | 100 | 100 | 100 |
| Sports | 100 | 100 | 100 |
| Casino | 100 | 100 | 100 |
| Login | 100 | 100 | 100 |
| Account overview | 100 | 100 | 100 |
| Account wallet | 100 | 100 | 100 |
| Deposit page | 100 | 100 | 100 |
| Support | 100 | 100 | 100 |
| Promotions | 100 | 100 | 100 |
| Help | 100 | 100 | 100 |
| Game detail | 100 | 100 | 100 |
| Master Admin | 100 | 100 | 100 |
| Tournaments | 100 | 100 | 100 |
| Register | 100 | 100 | 100 |

The tournament leaderboard green was darkened to `#14773a` during the audit; the final run is clean on every audited page.

## 5. Deposit and bonus flow

A second Playwright run exercised the deposit path as a player and Master Admin: **11/11 checks passed**:

1. Deposit page loads with sandbox notice and QR placeholder.
2. Player submits amount and UTR reference.
3. Pending request appears in player history.
4. Master Admin sees the same request in the review queue.
5. Admin approves and the wallet receives the deposit + 15% bonus.
6. Player sees both ledger entries and the increased balance.

The API smoke also covers cancellation, rejection and the live-payment activation gate. See `PAYMENTS_AND_BONUSES.md`.

## 6. Remaining boundaries

These are product-scope boundaries, not UI defects:

- Provider/live-dealer titles remain integration-ready and intentionally cannot be played.
- Real-money deposits/withdrawals are disabled.
- Promotions/tournaments have no automated payout engine.
- There is no real sports feed, multi-market settlement, cash-out or live-stream service.
- Email/SMS verification and transactional password reset are not provisioned.
- Multi-language and KYC flows are not implemented.
- External penetration testing, legal sign-off and production monitoring remain outside this build.
