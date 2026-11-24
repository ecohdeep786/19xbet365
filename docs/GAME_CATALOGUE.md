# Game Catalogue

Catalogue source: `shared/catalog.json`; database seed: `backend/db/seed.js`; catalogue builder: `scripts/build-catalog.mjs`.

## Playable 19X Originals

| ID | Name | Category | Server engine | Max win display | Notes |
| --- | --- | --- | --- | --- | --- |
| `crash-orbit` | Crash Orbit | Crash | crash curve, server crash point, polling settlement | 1,000x | manual/auto cash-out; abandoned rounds voided on next start |
| `mines-vault` | Mines Vault | Mines | 25-tile mine layout, combinatorial payout | 2,231x | reveal/cash-out; immutability trigger |
| `plinko-drop` | Plinko Drop | Plinko | server-generated path + bucket table | 170x | 8/10/12 rows, low/medium/high |
| `dice-roll` | Dice Roll | Dice | cryptographic RNG roll 0–100 | 49x | target + over/under |
| `wheel-of-astra` | Wheel of 19X | Wheel | 24-segment weighted array | 5x | server index, CSS replay |
| `coin-flip` | Coin Flip | Coin flip | RNG heads/tails | 1.96x | instant |
| `hi-lo` | Hi-Lo | Cards | two-card draw, rank rules | 12x | ties lose |
| `lucky-ten` | Lucky Ten | Lucky | digit draw 0–9 | 8.8x | instant |
| `nova-fruits` | Nova Fruits | Slots | 3×3 weighted symbol grid + paylines | 180x | 3 horizontal lines |
| `velocity-derby` | Velocity Derby | Virtuals | weighted six-runner race | 9.4x | finish order server-side |
| `speed-derby` | Speed Derby | Virtuals | weighted eight-runner race | 14x | finish order server-side |

All playable titles expose documented how-to-play content and persist rounds in `game_rounds`. Settled payout/outcome/status cannot be updated by the application.

## Provider-required catalogue

The remaining 33 titles are integration-ready and return `provider_required` from play endpoints. They are not simulated as live provider sessions.

- **Live casino:** 19X Roulette Live, Blackjack Azure, Baccarat Royale, Dream Wheel Live, Texas Hold'em Prime, Sic Bo Nova, Speed Baccarat.
- **Provider slots:** Neon Fortune, Starlight Lines, Golden Nova, Mystic Temple, Sakura Fortune, Cyber Heist, Dragon's Vault, Frost Queen, Cairo Nights, Jungle Spirit, Aztec Eclipse, Neon Reels, Gilded Crown, Titan's Gate, Lucky Lanterns, Crystal Cavern, Phoenix Fire.
- **Other provider/instant:** Keno Blitz, Scratch Nova, Limbo Velocity, Airball Crash, Tower Climb, Virtual Football League, Greyhound Sprint, Virtual Basketball, Virtual Tennis Open.

## Engine guarantees

- Outcomes are generated in `backend/src/services/gameEngine.js` or route-level cryptographic RNG; they are never supplied by the browser.
- Stakes are debited under an account row lock before a round starts.
- Payouts are credited transactionally with the round settlement.
- `get /api/player/rounds` exposes recorded outcome summaries.
- The DB trigger `settled_rounds_immutable` blocks payout/outcome/status changes on settled rounds.
- Crash/Mines abandoned rounds are voided and the stake refunded when a new round starts.

## Target RTP

The UI labels the RTP field **Target RTP** because these are simulation parameters, not certified return figures. Provider titles display catalogue RTP ranges only as information and cannot be played.

## Test evidence

`scripts/game-smoke.mjs` played all 11 originals against the API. Last run: dice win, coin loss, wheel zero, Plinko 0.4x, lucky-ten miss, Hi-Lo miss, Nova Fruits 3x, both derbies, Crash cash-out at 1.1x, Mines bust. The test verified settlement responses and final balance.
