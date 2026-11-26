# UI/UX Audit — reference study to production QA

**Date:** 24 November 2026  
**Reference:** public 1xBet live page (`1xlite-12669.pro/en/live`)  
**Product:** 19xbet365 production build served by Express at `http://127.0.0.1:4000`

This audit records the interface principles studied, the translation into 19xbet365, the defects found in real-user QA, and the final verification. No 1xBet code, artwork or font files were copied.

## 1. Reference language

The public live page and its computed styles were inspected at desktop width. The measured design language was then rebuilt with original 19xbet365 content and assets.

| Pattern | Reference measurement | 19xbet365 implementation |
| --- | --- | --- |
| Typeface | Roboto; body 16px; interface 12–14px; bold team names and odds | Self-hosted **Roboto** for body and controls; **Roboto Condensed** for display; 16px body, 14px navigation, 13px odds, 11.2px microtype floor |
| Chrome | 96px header in `#1d4268`; separate navigation row in `#205583`; 8px radius | Two-row 94px header plus promo ticker; navy `#1d4268`; navigation strip `#205583`; 8px radii |
| Navigation | 14px Roboto Bold, uppercase, muted blue `#a1bcd4`; active item becomes a blue pill | 14px/700 uppercase; contrast-corrected `#b0c8dc`; active `#276aa5` pill with white text and icon |
| Actions | Flat 8px-radius buttons, uppercase labels; blue primary; green conversion action | Flat 8px buttons; blue `#276aa5` primary; accessible green `#557d1d` for Join, Add coins, Place bet and other conversion actions |
| Canvas | White cards on a light blue-grey page; thin separators; minimal shadow | `#eef1f5` canvas; white cards; `#e3e9ef` borders; 8px radii; no decorative drop shadows |
| Odds | Small light-grey cells, navy numerals, clear selected state | Light-grey odds cells; 13px tabular numerals; pale lime selected state; 42px mobile targets |
| Hierarchy | League → fixture → score/time → three odds cells | Identical sequence, with original sport glyphs, team badges and provider marks for scanning |
| Density | Compact rows, repeated patterns, no competing decoration | Compact rows, consistent 8px rhythm, one blue action family and restrained green/coral state colour |
| Contrast | Reference uses very low-contrast muted labels in places | Deliberately corrected: muted `#52718a`, green buttons `#557d1d`, footer text `#a9c4dd`; all audited pages pass AA |

The goal is the reference's **predictability**, not a pixel copy: familiar sportsbook wording, a stable row grammar, a visible bet slip and an unmistakable active state.

## 2. Interface changes

### Typography
- Replaced the former Sora/Manrope pair with self-hosted **Roboto 400/500/700/900** and **Roboto Condensed 400/700**. License files are included in `frontend/public/fonts/`.
- Display headings use Roboto Condensed 700 with tighter tracking; body, forms, tables and buttons use Roboto.
- 16px body and inputs; 14px navigation and buttons; 13px odds; 11.2px minimum micro-label. Tabular lining numerals for balances, odds and timestamps.
- Fonts are preloaded and served locally rather than requested from a third party at runtime.

### Header and navigation
- Rebuilt the header into the reference's two-row structure: logo and account controls on top, a full-width navigation strip below.
- Navigation uses bold uppercase labels, original sport/category glyphs, a blue active pill and an accessible muted-blue resting colour.
- Signed-out state shows a person icon for Sign in, a green Join 19X action and a compact bet-slip trigger. Signed-in state adds the coin balance, notifications and account menu without crowding the bar.
- At small widths the navigation collapses into the drawer; the logo wordmark collapses below 380px so the header stays inside a 320px viewport.
- A slim promo ticker below the header carries live, responsible-play and coin context; edge masking keeps the marquee from looking clipped.

### Layout and rhythm
- Public spacing follows 8px increments: 22px home shell top, 36px section separation, 18px section-heading gap, 14px card grid gaps, 20px sports/account shell spacing and 16px mobile gutters.
- The home hero is now a compact white banner: 44px maximum headline, two actions, a trust row and a four-cell metric strip. It keeps the original orbit artwork without pushing the sportsbook below the fold on mobile.
- Page heroes are white, thin-bordered and compact (22–26px vertical padding), matching the reference's restrained page-title bars.
- Admin surfaces keep a denser dark control-room theme so staff cannot confuse operations with the player product.

### Components
- Panels, promo cards, tournament cards, modals, help cards and leaderboards share an 8px radius and thin borders.
- Buttons are flat, uppercase and 8px-rounded. Blue is used for navigation and neutral primary actions; green is reserved for conversion and winning states.
- Odds are light-grey cells with navy numerals and a pale-lime selected state. The bet slip's **Place coin bet** action is green.
- Forms use 16px controls, visible labels, focus rings and inline errors; no floating-label ambiguity.

### Coins, not VC
- All player-facing balances, stakes, payouts, ledgers, limits, promotions, help articles and server messages now use **coins**.
- `vc()` formats amounts with a `coins` suffix; the old `VC` abbreviation is gone from the interface.
- Sandbox and real-money boundaries remain explicit: the deposit page states that no money is collected, cash-out is disabled, and live payment collection has a separate server gate.

### Accessibility and interaction
- All audited text/background pairs meet WCAG AA after darkening muted text and green actions.
- Dialogs and drawers trap focus, close on Escape, restore focus and lock background scroll.
- Odds buttons carry content-derived accessible names; the notification count is included in the button's accessible name.
- The mobile header, ticker, hero metrics and quick-sport rail have explicit small-screen rules; the 320px layout has no horizontal overflow.
- Document titles are unique per route and include the selected game name.

## 3. Real-user QA

A Playwright/Edge run exercised the production build as a new player, an existing player and Master Admin. Final result: **32/32 checks passed**.

Passed checks included:

- Home renders brand, navigation icons, sport glyphs, team badges and illustrated game covers.
- Logged-out playable game routes show an account-required panel instead of a misleading 0-coin play surface.
- Registration creates a player, navigates to the account and shows 10,500 coins.
- Sports selection opens the focused bet-slip dialog, debits 50 coins and closes after placement.
- Dice Roll plays and settles with a server result.
- Wallet ledger and My Bets show the new records.
- Support composer opens a ticket.
- Mobile drawer opens as a modal, traps focus, closes on Escape and restores focus.
- Bet slip locks page scroll on mobile, closes on Escape and unlocks.
- Demo player login, account security, Master Admin dashboard and audit route all render.
- Master Admin can issue a one-time staff email/password; the new admin can manage scoped accounts and games but is denied settings, roles and further credential issuance.
- Branch Admin accounts cannot create staff logins.
- No console or page errors during the run.

A separate deposit run passed **11/11 checks**: sandbox configuration, player submission, Master review, approval, deposit ledger, bonus ledger, exact balance increase and no console errors.

A viewport sweep covered **17 routes at 10 widths from 320px to 2560px** and reported **zero horizontal overflow**.

## 4. Lighthouse verification

Final production run:

| Page | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| Home | 100 | 100 | 100 |
| Sports | 100 | 100 | 100 |
| Login | 100 | 100 | 100 |
| Deposit | 100 | 100 | 100 |

Earlier audits also covered casino, account overview, wallet, support, promotions, help, game detail, tournaments, register and Master Admin at 100/100/100. The contrast regressions introduced by the reference palette were fixed by using accessible muted (`#52718a`), green action (`#557d1d`) and footer (`#a9c4dd`) tokens.

## 5. Deposit and bonus flow

The sandbox deposit path is:

1. Deposit page loads with the sandbox notice and QR placeholder.
2. Player submits amount and UTR reference.
3. Pending request appears in player history.
4. Master Admin sees the same request in the review queue.
5. Admin approves and the wallet receives the deposit plus the configured 15% bonus.
6. Player sees both ledger entries and the increased balance.

The API smoke also covers cancellation, rejection and the live-payment activation gate. See `PAYMENTS_AND_BONUSES.md`.

## 6. Remaining boundaries

These are product-scope boundaries, not UI defects:

- All 55 catalogue titles are playable 19X RNG games. Certified live-dealer and third-party provider parity remain outside the build.
- Real-money deposits and withdrawals are sandbox/manual-review only until licensing, KYC/AML, merchant onboarding, a business-owned QR and `PAYMENTS_LIVE_ENABLED=true` are in place. Automated payout execution is not implemented.
- Promotions/tournaments have no automated payout engine.
- There is no real sports feed, multi-market settlement, cash-out or live-stream service.
- Email/SMS verification and transactional password reset are not provisioned.
- Multi-language support and provider-backed KYC document verification are not implemented; the current KYC review is manual.
- External penetration testing, legal sign-off and production monitoring remain outside this build.
