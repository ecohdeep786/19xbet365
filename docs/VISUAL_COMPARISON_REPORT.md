# Visual Comparison Report

## Method

The 1xBet reference was reviewed publicly at desktop and mobile widths. Product evidence was regenerated from the production build on 24 November 2026 with `scripts/capture-screenshots.mjs`, which drives headless Edge through the DevTools protocol at **1440×900** and **390×844**. The script authenticates as the seeded player and Master Admin so account, wallet, bet-history and control-room screens are captured in real states.

Reference captures were retained in the local research workspace (`capture/reference/`, plus the full-page reference screenshots) and are intentionally **not redistributed** in the public repository because they contain third-party website artwork. Product captures are in `capture/product/` and are included.

Comparison focused on hierarchy, density, navigation familiarity, component states and responsive behaviour, not colour-for-colour or pixel-for-pixel imitation.

## Screenshot evidence

| View | Reference | 19xbet365 |
| --- | --- | --- |
| Desktop home | `capture/reference/home-1xbet.jpeg` | `capture/product/home-1440.jpeg` |
| Sportsbook | `capture/reference/live-sports.jpeg` | `capture/product/sports-1440.jpeg` |
| Live sports | `capture/reference/live-sports.jpeg` | `capture/product/live-1440.jpeg` |
| Casino lobby | `capture/reference/live-casino.jpeg` | `capture/product/casino-1440.jpeg` |
| Instant games | `capture/reference/1xgames.jpeg` | `capture/product/instant-1440.jpeg` |
| Playable game detail | reference game page | `capture/product/dice-1440.jpeg` |
| Registration | `capture/reference/registration-modal.jpeg` | `capture/product/register-1440.jpeg` |
| Sign in | reference login modal | `capture/product/login-1440.jpeg` |
| Player dashboard | reference account gated | `capture/product/account-1440.jpeg` |
| Wallet and ledger | reference account gated | `capture/product/wallet-1440.jpeg` |
| Deposit / QR review | reference account gated | `capture/product/deposit-1440.jpeg` |
| Sports bet history | reference account gated | `capture/product/bets-1440.jpeg` |
| Promotions | reference promotions | `capture/product/promotions-1440.jpeg` |
| Tournaments | reference tournaments | `capture/product/tournaments-1440.jpeg` |
| Help centre | reference help | `capture/product/help-1440.jpeg` |
| Support | reference support | `capture/product/support-1440.jpeg` |
| Master Admin | not public reference | `capture/product/admin-dashboard-1440.jpeg` |
| Admin accounts & credential issuance | not public reference | `capture/product/admin-accounts-1440.jpeg` |
| Deposit review | not public reference | `capture/product/admin-deposits-1440.jpeg` |
| Mobile home | `capture/screenshot-390.png` | `capture/product/home-390.jpeg` |
| Mobile sports | reference mobile live | `capture/product/sports-390.jpeg` |
| Mobile casino | reference mobile casino | `capture/product/casino-390.jpeg` |
| Mobile wallet | reference account gated | `capture/product/wallet-390.jpeg` |
| Mobile sign in | reference mobile login | `capture/product/login-390.jpeg` |
| Mobile admin | not public reference | `capture/product/admin-dashboard-390.jpeg` |

## Similarities achieved

- Two-level navigation with sports, live, cricket, 1xGames, slots, live casino and a consolidated More menu.
- Deep-blue header chrome, pale-blue page canvas, white cards and green primary actions; a familiar bookmaker information hierarchy without copying 1xBet artwork or wording.
- Persistent, visible bet-slip access in the header and a dedicated right rail on desktop sports pages.
- Three-column home sportsbook: sports rail, live feed, bet slip/activity rail.
- Sports/favourites-style left filter rail with counts.
- Original per-sport glyphs in the sports rail, league headers, live spotlight and mobile lists; distinct shapes replace reused generic icons.
- Deterministic club badges beside fixture names and provider monograms on catalogue cards, giving dense lists the same instant visual scanning cues as the reference without copying real crests or provider logos.
- Category icons in the desktop navigation, mega menus, casino filter chips and mobile drawer.
- Dense league-grouped match rows with 1X2 odds, live scores, minutes and visibly selected odds.
- Game lobbies with category filters, search, sorting, provider labels, favourite hearts and playable/provider-required states.
- Full-bleed, picture-led game covers on every card, inspired by the reference’s strong tile imagery but drawn from original 19xbet365 scenes and theme tokens.
- A restrained action palette: deep-blue primary buttons, a white conversion pill in the header, and green used only for positive/settled states.
- Dense promotion and tournament sections with clear virtual-credit disclosure.
- Registration, login, account sidebar, wallet ledger, bet history, support, legal and admin routes.
- Mobile drawer navigation, compact account strip, stacked game tables and one/two-column card layouts.
- The admin control room intentionally keeps a dark operational theme so staff cannot confuse it with the player product.

## Intentional differences

| Area | Reference | 19xbet365 rationale |
| --- | --- | --- |
| Brand | 1xBet blue/white | Original 19X wordmark, deep-blue chrome, pale-blue/white surfaces and green actions |
| Hero | Marketing carousel with third-party banners | Original orbit hero and virtual-credit story |
| Typography | Reference sans | Supplied Sora/Manrope pair |
| Live casino | Live dealer photography/video | Provider preview only; no fabricated live feed |
| Provider games | Many certified providers | 33 clearly labelled integration-ready entries |
| Real money | Deposits, withdrawals, cash bonuses | Disabled by compliance design |
| Sports markets | Many markets per fixture | 1X2 foundation only; no fake markets |
| Header language | Country/currency/language selector | Locale is a static `EN · VC` chip; documented gap |
| Save/load bet slip | Present | Not implemented; documented gap |
| Promotions | Deposit/cashback/free-bet engines | Virtual-credit campaigns only; no automated payout engine |
| Admin | No public reference | Deliberately distinct dark control-room theme |

## Visual QA findings corrected

- Game-card badge truncation caused by the favourite control; redundant card badges removed.
- Home/casino horizontal rails inherited the game-page sidebar grid; renamed to `game-side-rail`.
- Wallet balance wrapped `VC` onto a second line; nowrap and flex sizing fixed.
- Admin support email was title-cased by a broad CSS selector; corrected.
- Static legal kicker duplicated “LEGAL · LEGAL”; de-duplicated.
- Admin overview panels stretched to equal heights leaving dead space; aligned grid items to start.
- 320px header, live spotlight, wallet segmented control and account navigation overflow fixed.
- Generic Lucide sport icons were reused for unrelated sports (cricket and MMA shared swords, tennis and baseball shared a dot). Replaced with a purpose-built 17-mark `SportIcon` set.
- Desktop navigation gained category icons; the 1181–1400px header was then rebalanced by shortening nav padding, hiding the duplicate balance chip and tightening the action row. Overflow test passed at every width.
- Mobile account view exposed the desktop “Need a hand?” support card before page content; now hidden below 900px and available through the Support route.
- Search summary and empty-state closing curly quotes rendered as replacement characters; corrected.
- Legacy “A” boot splash and dark theme-color meta removed in favour of the 19 mark and deep-blue chrome.
- Demo account and support addresses now use the `19xbet365.test` domain, visible in the login demo shortcuts and admin support panel.

## Residual visual risks

- The reference is information-denser (dozens of markets and promotions per screen); 19xbet365 intentionally trades some density for legibility.
- The live-casino preview lacks dealer imagery by design; it must not imply an active stream.
- Some promotional and game art is CSS/SVG-generated rather than illustrated; there is no image-generation budget in the build.
- Full visual regression tooling (Percy/Chromatic) is not configured; future UI changes should add snapshot automation.
- Captures cover 1440×900 and 390×844. Intermediate widths were measured for overflow, not compared screenshot-by-screenshot.
