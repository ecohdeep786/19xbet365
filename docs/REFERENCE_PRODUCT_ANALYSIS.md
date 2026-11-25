# Reference Product Analysis — 1xBet

**Research date:** 24 November 2026  
**Reference:** `https://1xlite-12669.pro/en` (public redirect from `1xbet.com`)  
**Browser viewport:** approximately 1908 × 1080 desktop; reference mobile evidence in `capture/screenshot-390.png`.

> This document records lawful study of public pages only. Login, account, deposit, withdrawal, and ticket surfaces were not accessed or bypassed. No 1xBet code, image, logo, font, or copy was reused in 19xbet365.

## Pages and states inspected

| Reference page | URL | State | Evidence |
| --- | --- | --- | --- |
| Home / sportsbook shell | `/en` | Fully loaded public | `capture/reference/home-1xbet.jpeg` |
| 1xGames lobby | `/en/games` | Public | `capture/reference/1xgames.jpeg` |
| Live casino lobby | `/en/casino` | Public | `capture/reference/live-casino.jpeg` |
| Live sports | `/en/live` | Public | `capture/reference/live-sports.jpeg` |
| Registration modal | overlay on casino | Public, modal open | `capture/reference/registration-modal.jpeg` |
| Login | `/en/user/login` | Public form | inspected; no credentials submitted |
| Slots / provider lobby | navigation from public nav | Public shell | inspected structurally |

Reference restrictions encountered:

- Many wallet, ticket, deposit, bonus, and account sections require authentication.
- Registration requires a phone number and SMS confirmation in the selected region.
- Google identity and loyalty endpoints returned external errors/403; these were treated as reference-side integration limitations, not bypassed.
- Some live provider content is region-gated.

## High-level layout observations

### Desktop shell

- Top utility strip: brand, country selector, currency/language selector, registration, login, account actions.
- Primary navigation: Top Events, ILT20, Cricket, Sports, Live, 1xGames, Slots, Live Casino, More, featured promotion.
- Background: light blue-grey information surfaces with strong dark-blue navigation and white content cards.
- Three-column sportsbook model:
  - left sports/favourites/category sidebar;
  - central hero carousel, shortcut strip, filters, and dense odds tables;
  - right registration/bet-slip/mobile-app rail.
- Content is deliberately dense: many rows per viewport, compact type, very small row padding.
- Sticky top navigation and right bet slip keep critical actions available.

### Reference colour hierarchy

| Role | Reference character |
| --- | --- |
| Global chrome | Deep navy blue |
| Primary surface | White / near-white |
| Secondary surface | Pale blue-grey |
| Accent/action | Green and bright blue |
| Odds panels | White with pale blue borders |
| Live | Green tag/pulse |
| Selected odds | Blue/green highlight |
| Text | Dark navy primary; slate secondary |
| Warnings/promotions | Orange, green, and image-led banners |

19X adopted the same **hierarchy intent** (strong chrome, clear surface layers, one hot action colour, one informational accent) with its own deep-blue, pale-blue/white and green bookmaker system. Reference brand colours and artwork are not reproduced.

### Reference typography

- Very compact, high-density type with strong numeric odds.
- Sans-serif throughout; bold promotion headlines and small navigation labels.
- Numeric odds use tabular presentation and consistent decimals.
- Registration modal uses multi-step compact labels and helper copy.
- 19X uses self-hosted **Roboto** for body and **Roboto Condensed** for display, with a bookmaker-scale type hierarchy and an 8px spacing rhythm. The public site is now light bookmaker chrome; the admin control room retains a dark operational theme. Numeric odds remain tabular and compact.

## Component-by-component findings

### 1. Global navigation

**Reference**
- Two-level structure: utility row and sports/casino category row.
- Language/country/currency control in the utility row.
- “More” dropdown consolidates secondary products.
- Logged-out state exposes registration and login prominently.
- Search is available in the main sportsbook table and casino.

**19X mapping**
- Two-level header with brand, Sports/Casino mega-menus, Promotions, Tournaments, Help.
- Search overlay, account menu, notifications, virtual balance, persistent bet-slip trigger.
- Mobile hamburger drawer.
- No language selector yet; documented in limitations.

### 2. Home carousel and shortcut strip

**Reference**
- Wide carousel with multiple promotional slides, dots and arrow controls.
- Eight game shortcuts below the hero (1xGames, Crash, Crystal, Burning Hot, Midgard Zombies, Western slot, Solitaire, Under and Over 7).
- A separate sports table begins below the shortcuts.

**19X mapping**
- Original “19X Originals” orbit hero with two floating game cards.
- Quick sports strip, live feed, original game grid, casino split, promotions, tournaments, trust band.
- No autoplay promotional carousel; motion is limited to orbit/floating elements and micro-interactions.

### 3. Sportsbook sidebar

**Reference**
- Collapsible sports block.
- Favourites, recommended, top games, live/sports toggles.
- Sports list with live counts and A–Z categories.
- Very high information density.

**19X mapping**
- Sticky Sports list with icons, counts, filter state, and “All sports”.
- Live/upcoming/all state in the toolbar and separate live route.
- Mobile filter drawer with backdrop.
- Sport categories are seeded from `shared/catalog.json`.

### 4. Odds table

**Reference**
- Alternating pale rows, league group headers, match/team rows, multiple market columns.
- Odds cells show 1/X/2, double chance, totals, both-teams-to-score, team wins.
- Small green/blue indicators for live and stream availability.
- Bet slip receives selections directly.

**19X mapping**
- League grouping with sport icon, live tag, kickoff, score, and 1/X/2 odds.
- Odds buttons show selected state and feed the global bet slip.
- Our build supports the core 1X2 market only; additional markets are explicitly not fabricated.
- This is a documented functional difference, not a visual placeholder.

### 5. Right bet slip

**Reference**
- Persistent desktop right rail.
- Empty state, selection cards, “Bet on the favorite” recommendation, registration prompt, save/load slip.
- Tabs for Bet slip / My bets.

**19X mapping**
- Persistent header “Bet slip” trigger and slide-over drawer.
- New compact bet-slip rail on sports pages with total odds and return.
- Single/accumulator selection, stake chips, auth prompt, server placement, toast confirmation.
- No save/load slip yet.

### 6. 1xGames / casino lobby

**Reference**
- Full-width promotional hero.
- Category tabs: All Games, Demo, Slots, Card Games, Climb to Victory, Dice, Lotteries, Other Games, Best, For you.
- Search, sorting, grid/list toggle.
- 5-column dense game tile grid with demo badges, max multipliers, provider art.
- Right FAQ/cashback rail and floating vertical utility icons.

**19X mapping**
- Original casino hero, featured game card, search, provider filter, sort, favourites.
- Playable originals with 19X Original labels.
- 5-column desktop lobby; responsive 2-column mobile.
- No real cashback/FAQ right rail; responsible-play and tournament information are used instead.
- All artwork is original CSS/SVG.

### 7. Live casino lobby

**Reference**
- Hero carousel, category filter chips, provider filter, game-type tiles.
- Large portrait game cards with dealer imagery, stake ranges, “cashback” badges.
- Multiple horizontal game rails.

**19X mapping**
- Live-casino lobby with clear “provider session required” notice.
- Filter chips, table previews, provider labels, no fabricated live video or dealer.
- Honest integration state is a deliberate compliance decision.

### 8. Registration

**Reference**
- Modal over the lobby.
- Tabs: By phone, One-click, By email, Socials.
- Welcome bonus selection cards.
- Country/currency, SMS code, promo code, legal consent, marketing consent.
- Compact inputs and a primary green action.

**19X mapping**
- Full auth screen with split brand panel and form.
- Display name, email, password/confirm, referral, marketing, age consent.
- Validation, welcome allocation, session creation, account redirect.
- No SMS/social/phone registration or email verification; documented as an external/provider gap.

### 9. Motion

**Reference**
- Carousel autoplay and manual arrows/dots.
- Hover elevation on game cards.
- Dropdowns and modals with short fades/slides.
- Live indicator pulses.
- Bet-slip selection and account menu interactions.

**19X mapping**
- Fade-up section/card entrances, orbit float/rotation, hover lifts, drawer slide, toast fade, live pulses, modal fade.
- Motion tokens are centralised; `prefers-reduced-motion` disables animations.
- No manipulative loops or fake countdown urgency.

## Responsive findings

- Reference desktop uses a three-column sportsbook layout.
- Reference mobile retains dense odds rows, collapses navigation to drawers, and uses horizontal game rails.
- Reference 390px capture is stored in `capture/screenshot-390.png`.
- 19X responsive QA covers 320, 360, 390, 430, 768, 1024, 1280, 1440, 1920, and 2560 widths. See `docs/RESPONSIVE_TEST_REPORT.md`.

## What 19X deliberately did not copy

- Brand name, logo, hero art, game art, icon set, fonts, copy, promotion images, social imagery, dealer photos.
- Exact colours or 1xBet-specific page chrome.
- Any live odds feed, live dealer feed, provider game outcome, or real-money flow.
- Restricted/authenticated account data.

## Conclusions for our product

Priority parity gaps addressed during this cycle:

1. Persistent sports bet-slip rail and live spotlight strip.
2. Accessible skip links and reduced-motion support.
3. Responsive overflow corrections for 320px mobile.
4. Honest provider/live-casino integration states and real-money lock.
5. Original branded game and casino artwork.

Remaining reference gaps are recorded in `docs/PRODUCT_PARITY_MATRIX.md` and `docs/KNOWN_LIMITATIONS.md`.
