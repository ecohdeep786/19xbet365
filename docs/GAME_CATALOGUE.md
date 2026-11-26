# Game Catalogue

Catalogue source: `shared/catalog.json`; database seed: `backend/db/seed.js`; catalogue builder: `scripts/build-catalog.mjs`.

All **55** catalogue titles are playable 19X Originals across 19 categories. There are no provider-required placeholder pages. Outcomes are generated on the server; settled rounds are immutable.

## Originals

| ID | Name | Category | Engine | Max win display | Target RTP |
| --- | --- | --- | --- | --- | --- |
| `crash-orbit` | Crash Orbit | Crash | Server crash point; polling settlement | 1,000x | 98% |
| `airball-crash` | Airball | Crash | Same crash engine with second theme | 1,000x | 98% |
| `mines-vault` | Mines Vault | Mines | 25-tile layout; combinatorial multiplier | 2,231x at 3 mines | 97% |
| `plinko-drop` | Plinko Drop | Plinko | Server path + bucket table | 170x | 99% |
| `dice-roll` | Dice Roll | Dice | Cryptographic roll 0-100 | 49.5x | 99% |
| `wheel-of-astra` | Wheel of 19X | Wheel | 24-segment weighted array | 5x | 97.9% |
| `coin-flip` | Coinflip | Coinflip | RNG heads/tails | 1.96x | 98% |
| `hi-lo` | Hi-Lo | Cards | Two-card draw; ties lose | 12x | 97% |
| `lucky-ten` | Lucky Ten | Lucky | Digit draw 0-9 | 9x | 90% |

## Slots (18)

`nova-fruits`, `neon-fortune`, `starlight-lines`, `golden-nova`, `mystic-temple`, `sakura-fortune`, `cyber-heist`, `dragons-vault`, `frost-queen`, `cairo-nights`, `jungle-spirit`, `aztec-eclipse`, `neon-reels`, `gilded-crown`, `titans-gate`, `lucky-lanterns`, `crystal-cavern`, `phoenix-fire`.

- Shared three-reel, three-row engine with three horizontal paylines.
- Weighted symbols; three of a kind pays 60x down to 2x; pairs pay 2x down to 0.2x.
- Target RTP **95.6%**; maximum **180x** (three winning lines at 60x).
- Every spin is server-generated and stored in `game_rounds`.

## Virtuals (6)

`velocity-derby`, `speed-derby`, `virtual-football`, `virtual-basketball`, `virtual-tennis`, `greyhound-sprint`.

- Simulated six- or eight-competitor events; no real teams, animals or live feed.
- Odds are calibrated so each pick returns about 95-96% over time: 6-runner sets pay 2.5x-25x (96.2% target), Speed Derby pays 3.2x-32x (95.5% target).
- The finish order is server-generated; the track animation is a visual replay.

## Instant (4)

| ID | Engine | Max win | Target RTP |
| --- | --- | --- | --- |
| `keno-blitz` | Pick 3 of 10; 3 drawn; 3/2/1 matches pay 25x/2.5x/0.6x | 25x | 96.1% |
| `scratch-nova` | 9-cell weighted scratch; star trio 20x, seven trio 5x, other trio returns stake | 20x | 95.5% |
| `limbo-velocity` | Target 1.2x-100x; result from `0.99 / (1-u)` | 100x | 99% |
| `tower-climb` | Choose 1-5 floors; survival chance 0.72 per floor | 5x | 97% |

## RNG tables (7)

| ID | Name | Engine | Max win | Target RTP |
| --- | --- | --- | --- | --- |
| `astra-roulette-live` | 19X Roulette | Single-zero European wheel; red/black/even/odd/high/low pay 2x | 2x | 97.3% |
| `blackjack-azure` | Blackjack Azure | Six-deck shoe; multi-step deal/hit/stand; blackjack pays 3:2; dealer stands on soft 17 | 2.5x | 95.7% |
| `baccarat-royale` | Baccarat Royale | Standard third-card rules; player 2x, banker 1.95x, tie 9x; ties push player/banker | 9x | 98.9% |
| `speed-baccarat` | Speed Baccarat | Same engine as Baccarat Royale | 9x | 98.9% |
| `sicbo-nova` | Sic Bo Nova | Three dice; big/small/odd/even pay 2x; triples lose | 2x | 97.2% |
| `dream-wheel-live` | Dream Wheel | 24-segment RNG wheel | 5x | 97.9% |
| `holdem-prime` | Texas Hold'em Prime | Player vs dealer best-of-seven from shared board; win 1.95x, tie pushes | 1.95x | 97.3% |

These are **RNG tables, not live-dealer feeds**. Blackjack currently offers hit and stand only; doubling and splitting are not available. Baccarat does not charge banker commission because the banker payout is already 1.95x.

## Bingo (2)

| ID | Engine | Max win | Target RTP |
| --- | --- | --- | --- |
| `bingo-bonanza` | 3×3 card, 12-number draw from 30; one line 1.5x, two+ lines 4x, full house 5,000x | 5,000x | 96.5% |
| `bingo-neon` | Same quick-bingo engine with a neon theme | 5,000x | 96.5% |

## Poker (1)

| ID | Engine | Max win | Target RTP |
| --- | --- | --- | --- |
| `video-poker-deluxe` | Five-card Jacks or Better; hold/draw; royal 250x, straight flush 50x, four 25x, full house 9x, flush 6x, straight 4x, trips 3x, two pair 2x, jacks+ 1x | 250x | 98.0% |

`holdem-prime` is also available from the Poker lobby as a player-vs-dealer Hold'em table.

## TV Games (2)

| ID | Engine | Max win | Target RTP |
| --- | --- | --- | --- |
| `tv-wheelbet` | 36-number colour wheel plus zero; red/black 2x, zero 36x | 36x | 97.3% |
| `war-of-elements` | Four elemental picks with calibrated payouts from 1.8x to 25x | 25x | 97.7% |

The TV Games page also links Keno Blitz and the RNG table games for a studio-style line-up.

## Toto (1)

`toto-fifteen` — choose 1/X/2 for 15 fixtures. The server generates the results and pays 6-15 correct selections. Max **120,000x**, target **82.0%**.

## Lotto (1)

`lotto-636` — pick six numbers from 1-36; the server draws six. Prizes start at two matches. Max **50,000x**, target **81.1%**.

## Scratch cards (2)

`scratch-gold`, `scratch-lucky` — nine-cell cards; star trio 20x, seven trio 5x, any other trio returns stake. Target **95.5%**, max **20x**. `scratch-nova` is also available in the instant lobby.

## Hunting & Fishing (2)

`reef-hunter`, `shadow-hunt` — six targets with calibrated payouts from 2x to 50x. Match the server-selected catch to win its multiplier. Target **96.5%**, max **50x**.

## Navigation pages

- **Other Games** highlights Crash Orbit, Airball, Mines Vault and Plinko Drop.
- **Quick Play** groups 11 short-session originals.
- **Results** shows finished fixtures and final scores.
- **Statistics** shows catalogue, category, fixture and settled-round totals.

## Engine guarantees

- Outcomes are generated in `backend/src/services/gameEngine.js` or route-level cryptographic RNG; they are never supplied by the browser.
- Stakes are debited under an account row lock before a round starts.
- Payouts are credited transactionally with the round settlement.
- `GET /api/player/rounds` exposes recorded outcome summaries; the full blackjack shoe and video-poker deck remain server-side.
- The DB trigger `settled_rounds_immutable` blocks changes to settled/void rounds.
- Crash, Mines, Blackjack and Video Poker abandoned rounds are voided and the stake refunded when a new round starts.
- Multi-step games reject a second action on a settled round with `409 round_settled`.

## Target RTP

The UI labels the RTP field **Target RTP** because these are simulation parameters, not certified return figures. The figures above are the modelled return for each implemented engine under its stated rules.

## Test evidence

- `scripts/all-games-smoke.mjs`: played all **55/55** catalogue games through the API; every round settled and the wallet reconciled.
- `scripts/all-games-ui-smoke.mjs`: loaded **55/55** game pages with no provider gate and played a representative sample across slots, virtuals, instant, bingo, poker, TV, Toto, Lotto, scratch, fishing, tables and crash.
- `scripts/special-games-smoke.mjs`: bingo tickets/draws, WheelBet colours, elemental payouts, Toto result counts, Lotto draws, reef/hunt targets, scratch cards, video-poker hold/draw and stale-hand refunds all passed.
- `scripts/categories-ui-smoke.mjs`: every new category page, Results and Statistics loaded with no console errors or overflow.
- `scripts/blackjack-smoke.mjs`: deal, hit, stand, dealer draw to 17, double-settle rejection and stale-hand refund all passed.
- `scripts/game-smoke.mjs`: legacy smoke for the original 11 titles.
