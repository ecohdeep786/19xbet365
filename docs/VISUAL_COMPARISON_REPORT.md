# Visual Comparison Report

## Method

The 1xBet reference was reviewed publicly at desktop and mobile widths. Product evidence was regenerated from the production build on 24 November 2026 with `scripts/capture-screenshots.mjs`, which drives headless Edge through the DevTools protocol at **1440×900** and **390×844**. The script authenticates as the seeded player and Master Admin so account, wallet, bet-history and control-room screens are captured in real states.

Reference captures were retained in the local research workspace (`capture/reference/`, plus the full-page reference screenshots) and are intentionally **not redistributed** in the public repository because they contain third-party website artwork. Product captures are in `capture/product/` and are included.

Comparison focused on hierarchy, density, navigation familiarity, component states and responsive behaviour. Colour values, radii and type scales were matched to the reference's design language; brand artwork and wording remain original.

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

## Reference values adopted

| Token | 1xBet observation | 19xbet365 value |
| --- | --- | --- |
| Header navy | `#1d4268` | `#1d4268` |
| Navigation strip | `#205583`, 40px, 8px radius | `#205583`, 40px, 8px radius |
| Active navigation | Blue pill `#276aa5`, white label | `#276aa5` pill, white label |
| Link/action blue | `#276aa5` | `#276aa5` |
| Accent green | `#7eac2f` (fails AA with white text) | Bright `#7eac2f` for decoration; accessible `#557d1d` for white-text actions |
| Page canvas | Light blue-grey | `#eef1f5` |
| Card radius | 8px | 8px |
| Interface type | Roboto, 14px navigation, 13px odds | Self-hosted Roboto / Roboto Condensed, same scale |
| Muted ink | Low-contrast blue-grey | Accessible `#52718a` |

## Similarities achieved

- Two-level navigation with sports, live, cricket, 1xGames, slots, live casino and a consolidated More menu.
- Deep-blue chrome, a lighter blue navigation strip, white cards, a pale-blue canvas and green conversion actions.
- Bold uppercase navigation labels with original category glyphs and a clear blue active state.
- Flat 8px buttons, light-grey odds cells, compact panel headers and thin separators.
- Persistent bet-slip access in the header and a dedicated right rail on desktop sports pages.
- Three-column home sportsbook: sports rail, live feed, bet slip/activity rail.
- Sports/favourites-style left filter rail with counts.
- Original per-sport glyphs, deterministic club badges and provider monograms give dense lists the same instant scanning cues as the reference without copying real crests or provider logos.
- Dense league-grouped match rows with 1X2 odds, live scores, minutes and visibly selected odds.
- Game lobbies with category filters, search, sorting, provider labels, favourite hearts and playable/provider-required states.
- Full-bleed, picture-led original game covers with title-safe darkening.
- Compact page titles, white policy/help cards and a familiar account sidebar.
- Mobile drawer navigation, compact account strip, stacked game tables and one/two-column card layouts.
- The admin control room intentionally keeps a dark operational theme so staff cannot confuse it with the player product.

## Intentional differences

| Area | Reference | 19xbet365 rationale |
| --- | --- | --- |
| Brand | 1xBet blue/white wordmark | Original 19X wordmark with green mark and navy/white chrome |
| Hero | Marketing carousel with third-party banners | Original orbit hero and coin-play story |
| Typography | Roboto family, very low-contrast muted labels | Roboto / Roboto Condensed, with accessible contrast tokens |
| Accent green | Bright lime with white text | Bright lime for decoration; darker accessible green `#557d1d` for white-text actions |
| Live casino | Live dealer photography/video | Provider preview only; no fabricated live feed |
| Provider games | Many certified providers | 33 clearly labelled integration-ready entries |
| Real money | Deposits, withdrawals, cash bonuses | Disabled by compliance design; sandbox QR review only |
| Sports markets | Many markets per fixture | 1X2 foundation only; no fake markets |
| Header language | Country/currency/language selector | Static `EN · COINS` chip; documented gap |
| Save/load bet slip | Present | Not implemented; documented gap |
| Promotions | Deposit/cashback/free-bet engines | Coin campaigns only; no automated payout engine |
| Admin | No public reference | Deliberately distinct dark control-room theme |

## Visual QA findings corrected

- 320px header overflow after the two-row rebuild; the wordmark now collapses to the 19 mark on very small screens.
- Mobile hero metrics overlapped the second action; metrics now flow below the hero copy on small screens.
- Desktop navigation truncated at 1181–1420px after the bold/uppercase pass; target sizes and letter spacing were retuned and verified with zero overflow.
- Featured-game “PLAY NOW” badge stretched across the whole card; it now sits at its intrinsic width and uses a solid green treatment.
- Long `coins` balance strings caused header and ledger wrapping; balance chips and table cells now size correctly.
- Contrast regressions from the reference palette were corrected with accessible muted, green and footer tokens; Lighthouse returned to 100/100/100.
- The mobile promo ticker could look clipped at the edge; a left/right mask now makes the marquee read as intentional movement.
