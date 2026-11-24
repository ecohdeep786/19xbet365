# Responsive Test Report

**Date:** 24 November 2026  
**Method:** A same-origin iframe harness rendered the production build at controlled widths and compared `documentElement.scrollWidth` with `clientWidth + 1` on every route. Horizontal overflow was treated as a defect. Final evidence captures were then regenerated with `scripts/capture-screenshots.mjs` in headless Edge at 1440×900 and 390×844. The temporary QA harness was removed from the production output after acceptance.

## Widths tested

`320, 360, 390, 430, 768, 1024, 1181, 1280, 1440, 1920, 2560` CSS pixels.

## Routes tested

`/`, `/sports`, `/live`, `/casino`, `/instant`, `/game/crash-orbit`, `/game/dice-roll`, `/account`, `/account/wallet`, `/account/bets`, `/promotions`, `/tournaments`, `/help`, `/support`, `/login`, `/register`, `/terms`.

Admin routes were separately tested with a Master Admin session:

`/admin`, `/admin/accounts`, `/admin/network`, `/admin/roles`, `/admin/settings`, `/admin/system`, `/admin/audit`, `/admin/support`.

## Result

**0 horizontal overflows** after corrections, across all tested widths and routes.

### Defects found and corrected during the cycle

1. **320px header overflow (all routes).**
   - Cause: search, notification, account avatar and bet-slip controls exceeded the header action width.
   - Fix: hide the header search icon at `≤480px`; hide the account avatar trigger at `≤380px`; search and account remain available in the mobile drawer.
   - Evidence: `Layout.tsx`, `theme.css`.

2. **320px live spotlight overflow.**
   - Cause: live cards remained two-up at 320px.
   - Fix: one-column live spotlight at `≤520px`.
   - Evidence: `pages.css`, `.live-spot-grid`.

3. **320px wallet filter overflow.**
   - Cause: the five-option `Segmented` control exceeded the wallet toolbar.
   - Fix: segmented controls scroll horizontally inside their own bounds; buttons never wrap mid-label.
   - Evidence: `theme.css`, `.segmented`.

4. **Body minimum width.**
   - Cause: `body { min-width: 320px }` forced a 320px layout inside a 320px viewport with a vertical scrollbar.
   - Fix: removed the forced minimum; layout now fits the available content width and all tested breakpoints passed.

5. **Mobile account screen showed the desktop support card first.**
   - Cause: the `≤900px` rule targeted `.account-nav-card .support-card`, but the support card is its own `.account-nav-card`.
   - Fix: the rule now targets `.account-nav .support-card`; mobile users see the account tab strip followed by page content.
   - Evidence: `pages.css`, `capture/product/wallet-390.jpeg`.

6. **Mobile account tabs clipped without an obvious scroll affordance.**
   - The strip is intentionally horizontally scrollable with no wrapping; labels stay on one line and the active tab remains scrolled into view on navigation.

7. **Icon pass caused desktop header crowding at 1181–1400px.**
   - Cause: eight new category icons and club badges increased nav width while the balance chip stayed visible.
   - Fix: nav labels are nowrap; icons are 13–15px; padding tightens below 1400px, the header balance chip hides below 1400px, and the locale chip hides below 1440px. Desktop navigation remains available at 1181px and above.
   - Verification: measured `scrollWidth === clientWidth` at 1181, 1280 and 1440; full route sweep at 320–1920 returned zero overflows with club badges and category chips enabled.

## Layout behaviour verified

| Width | Behaviour |
| --- | --- |
| 320–430 | hamburger drawer, stacked hero, one/two-column tiles, stacked match odds, page-level overflow-free |
| 768 | tablet drawer, two-column game/sports layouts, bet slip reachable from the header |
| 1024–1180 | drawer navigation, compact sportsbook with main board plus bet-slip rail, no left sports rail |
| 1181–1280 | desktop navigation returns, three-column home sportsbook and persistent slip rail |
| 1440 | full spacing, four-up game rails, three-column home and sportsbook, sticky bet slip |
| 1920–2560 | content shell capped and centred; header utility width capped; no stretched data tables |

## Screenshots

- Product desktop: `capture/product/home-1440.jpeg`, `sports-1440.jpeg`, `live-1440.jpeg`, `casino-1440.jpeg`, `instant-1440.jpeg`, `dice-1440.jpeg`, `account-1440.jpeg`, `wallet-1440.jpeg`, `bets-1440.jpeg`, `promotions-1440.jpeg`, `tournaments-1440.jpeg`, `help-1440.jpeg`, `support-1440.jpeg`, `login-1440.jpeg`, `register-1440.jpeg`, `admin-dashboard-1440.jpeg`.
- Product mobile: `capture/product/home-390.jpeg`, `sports-390.jpeg`, `casino-390.jpeg`, `dice-390.jpeg`, `wallet-390.jpeg`, `login-390.jpeg`, `admin-dashboard-390.jpeg`.
- Reference desktop/mobile captures were studied locally and are excluded from the public repository because they contain third-party artwork.

## Remaining manual checks

- Physical touch scrolling, landscape orientation and iOS/Android browser chrome should be repeated on real hardware.
- Screen-reader announcement order for complex admin tables and horizontally scrolling account tabs should be verified with NVDA/VoiceOver.
- Visual regression automation is not configured; add screenshot diffing before a larger design-system change.
