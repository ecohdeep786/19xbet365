# 19XBET365 Design System

## Brand direction

The public product uses a **1xBet-aligned bookmaker language**: deep-navy chrome, a lighter blue navigation strip, bold uppercase navigation, white cards on a pale blue-grey canvas, light-grey odds cells, flat 8px controls and a restrained green conversion accent. The internal Master Admin keeps a dark control-room theme so staff operations are visually distinct from the player product.

All artwork, sport glyphs, team badges, provider marks, game covers and wording are original 19xbet365 assets. No 1xBet code, images, logos or font files are used. The typefaces are open-source Roboto and Roboto Condensed, self-hosted with their SIL Open Font License files.

## Theme scopes

- `body` default / admin: dark control-room tokens in `theme.css`.
- `.bookmaker` public wrapper: light bookmaker tokens in `bookmaker.css`.
- `.auth-page.bookmaker`: light auth panel with deep-blue brand artwork.

`PublicLayout` wraps the header, pages, footer and overlays in `.bookmaker`; `AdminLayout` stays outside it.

## Public colour tokens

| Token | Value | Use |
| --- | --- | --- |
| header navy | `#1d4268` | site header, footer, auth artwork |
| navigation strip | `#205583` | second-row desktop navigation |
| navigation resting | `#b0c8dc` | uppercase navigation labels and icons |
| active blue | `#276aa5` | active nav pill, primary buttons, links, focus |
| accent lime | `#7eac2f` | decorative highlight, borders, icons, ticker glyphs |
| action green | `#557d1d` | white-text conversion actions (Join, Add coins, Place bet) |
| action green hover | `#4f751a` | hover state for action green |
| page background | `#eef1f5` | public canvas |
| soft background | `#f5f7fa` | secondary surface |
| surface | `#ffffff` | panels and cards |
| line | `#e3e9ef` | borders and dividers |
| line strong | `#cbd6e0` | emphasised borders |
| text | `#1d4268` | primary copy and headings |
| text soft | `#2f5475` | secondary copy |
| muted | `#52718a` | helper text, metadata, table subcopy |
| muted 2 | `#7f9ab0` | disabled/decorative metadata |
| live/danger | `#e5484d` | live pulses, bust/danger states |
| violet | `#6d56d9` | tournament/secondary accent |
| amber | `#b7791f` | warning/integration states |
| footer muted | `#a9c4dd` | footer body and bottom bar |

Contrast notes: `#52718a` on white is 5.14:1 and on `#eef1f5` is 4.53:1. `#557d1d` with white text is 4.84:1. Bright `#7eac2f` is reserved for non-text decoration because white text on it does not meet AA.

## Typography

| Role | Font | Scale |
| --- | --- | --- |
| Display / hero h1 | Roboto Condensed 700 | `clamp(2.1rem, 3.4vw, 2.75rem)` |
| Page h1 | Roboto Condensed 700 | `clamp(1.9rem, 3.2vw, 2.7rem)` |
| Page-hero h1 | Roboto Condensed 700 | `clamp(1.55rem, 2.5vw, 2.1rem)` |
| Section h2 | Roboto Condensed 700 | `clamp(1.4rem, 2.1vw, 1.85rem)` |
| Card title | Roboto Condensed 700 | `.9–1.3rem` |
| Body | Roboto 400 | `16px` base, `.88–1rem` UI |
| Navigation | Roboto 700 | `14px`, uppercase |
| Buttons | Roboto 700 | `.82rem` (~13.1px), uppercase |
| Odds | Roboto 700 | `13px`, tabular numbers |
| Labels / eyebrows | Roboto 700 | `.68rem`, spaced uppercase |
| Form controls | Roboto 400 | `16px` (prevents mobile zoom) |

Headings use `text-wrap: balance`; body copy uses `text-wrap: pretty`. Public surfaces apply `tabular-nums` and `lining-nums` so balances, odds and timestamps keep a stable column rhythm. The microtype floor is **11.2px**, with 12–13px metadata and 16px form controls.

## Spacing and layout

The public rhythm uses 8px increments:

- 1320px content shell; 48px desktop gutters.
- 8px header padding; 94px two-row header plus a 28px promo ticker.
- 22px home shell top; 36px between home sections; 18px section-heading gap.
- 14px game-grid gaps; 20px sports/account shell spacing; 16px mobile gutters.
- Admin uses a slightly denser rhythm while retaining its dark theme.

## Components

### Header and navigation

- Two rows: logo + account controls, then a full-width `#205583` navigation strip with 40px height and 8px radius.
- 14px Roboto Bold uppercase labels; active item is a `#276aa5` pill with a white label and icon.
- Search, notifications, balance, account menu and bet slip sit on the top row.
- Below 1180px the navigation collapses to the drawer. Below 380px the logo wordmark collapses to the 19 mark so the header fits a 320px viewport.

### Buttons

- Flat, 8px radius, uppercase, Roboto 700, no decorative shadow.
- 40px default height; 32px compact; 46px large.
- Blue `#276aa5` for primary/neutral actions; green `#557d1d` for conversion and placing bets; secondary is `#eef1f5` on white.

### Cards and panels

- White surface, `#e3e9ef` 1px border, 8px radius, no drop shadow.
- Panel headers use compact uppercase labels, navy text and a blue icon.
- Promo, tournament, help and modal cards share the same 8px radius.

### Odds

- Light-grey `#eef1f5` cells with navy numerals and 8px radius.
- Hover darkens the cell; selected uses a pale-lime fill with a `#7eac2f` border.
- 42px mobile targets; full accessible names built from fixture and selection context.

### Forms

- 16px controls, visible labels, 1px `#c9d9e8` borders, blue focus ring, inline error text.
- Inputs never use floating labels; hints and errors stay in the reading order.

## Motion and interaction

- Dialog and drawer transitions are short and respect `prefers-reduced-motion`.
- Dialogs trap focus, close on Escape, restore focus and lock background scroll.
- The promo ticker uses a slow marquee with edge masks; it is decorative and duplicated content is hidden from assistive technology by the surrounding live-region-free structure.

## Accessibility

- Final Lighthouse runs: **100 accessibility / 100 best practices / 100 SEO** on home, sports, login and deposit.
- Contrast-corrected tokens: muted `#52718a`, action green `#557d1d`, footer `#a9c4dd`.
- Unique page titles per route; skip link; visible focus; labelled controls; accessible bet-slip and drawer names.
- Responsive QA: 17 routes × 10 widths from 320px to 2560px with zero horizontal overflow.
