# 1xBet Navigation Coverage

Reviewed against the public 1xBet navigation at `https://1xbet.com/` on 27 November 2026. All implementations below are original 19X work; no 1xBet artwork, provider games, copy or proprietary assets were copied.

## Game-category pages

| 1xBet navigation area | 19X route | Status | What is playable |
| --- | --- | --- | --- |
| Sports / Line | `/sports` | Complete | 12 sports, 42 demo fixtures, 1X2 market, bet slip and settlement |
| Live | `/live` | Complete | Live demo fixtures, scores, live odds and bet placement |
| Esports | `/esports` | Complete | Seeded esports fixtures and 1X2 markets |
| Virtual sports | `/virtuals` | Complete | Six simulated 19X events |
| 1xGames | `/instant` | Complete | Instant originals plus the full category lobby |
| Slots | `/slots` | Complete | 18 original three-reel slots |
| Live Casino | `/live-casino` | Complete | Seven in-house RNG tables; no live-dealer feed |
| Bingo | `/bingo` | Complete | Bingo Bonanza and Neon Bingo |
| Poker | `/poker` | Complete | Video Poker Deluxe and Texas Hold'em Prime |
| TV Games | `/tv-games` | Complete | WheelBet, War of Elements, Keno and RNG tables |
| Toto | `/toto` | Complete | Toto 15 pool ticket with 1/X/2 selections |
| Lotto | `/lotto` | Complete | Lotto 6/36 draw |
| Scratch Cards | `/scratch-cards` | Complete | Scratch Gold, Scratch Lucky and Scratch Nova |
| Hunting and Fishing | `/hunting-fishing` | Complete | Reef Hunter and Shadow Hunt |
| Other Games | `/other-games` | Complete | Crash, Airball, Mines and Plinko |
| Quick Play | `/quick-play` | Complete | 11 short-session originals |
| Results | `/results` | Complete | Finished fixtures and final scores |
| Statistics | `/statistics` | Complete | Catalogue, category, fixture and settled-round totals |
| Promotions | `/promotions` | Complete | Coin campaigns and terms |
| Tournaments | `/tournaments` | Complete | Seeded tournament leaderboards |

## 1xBet betting-mode shortcuts

These are betting-mode shortcuts rather than separate game catalogues. The current product supports the underlying capability through the sportsbook, bet slip and Toto page:

- **Fast Bet** — the sportsbook bet slip supports quick single and accumulator placement.
- **Multi-LIVE** — the bet slip supports accumulators across live selections; there is no separate multi-view wall.
- **Marble-Live** — not implemented as a dedicated marble-race product.
- **Bet on Your National Team** — supported through normal sports filters, not as a separate landing page.
- **Toto variants** (Correct Score, Football, Hockey, Basketball, Cricket, Esports) — the current Toto 15 uses the shared fixture board; sport-specific Toto variants are not separately routed.

## Catalogue limitation

1xBet exposes hundreds of third-party provider games. 19xbet365 does not copy those titles or connect uncertified provider sessions. Every playable title is an original 19X game with a server-side engine. Certified provider/live-dealer parity remains an external integration and licensing task.

## Verification

- `scripts/categories-ui-smoke.mjs` loads all new category, Results and Statistics pages at desktop width.
- `scripts/responsive-game-audit.mjs` checks all 55 game pages and 19 lobby/category routes at 320, 390, 768, 1440 and 2560.
- `scripts/all-games-smoke.mjs` and `scripts/all-games-ui-smoke.mjs` cover every catalogue game.
- `scripts/special-games-smoke.mjs` covers the new multi-step and pick-based engines.
