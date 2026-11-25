import { pickWeighted, randomFloat, randomInt } from "../lib/crypto.js";

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function crashPoint() {
  const u = randomFloat();
  const raw = u >= 0.98 ? 1.01 : 0.98 / (1 - u);
  return Math.min(1000, Math.max(1, Math.floor(raw * 100) / 100));
}

export function crashMultiplier(startedAt, at = Date.now()) {
  const elapsed = Math.max(0, at - new Date(startedAt).getTime());
  return Math.max(1, Math.floor(Math.exp(elapsed / 5200) * 100) / 100);
}

export function crashTimeFor(crashPointValue) {
  return Math.log(crashPointValue) * 5200;
}

function combination(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return result;
}

export function minesMultiplier(mines, revealed) {
  if (revealed <= 0) return 1;
  const safeWays = combination(25 - mines, revealed);
  const totalWays = combination(25, revealed);
  return Math.max(1, round2((totalWays / safeWays) * 0.97));
}

const WHEEL_SEGMENTS = [
  0, 1.5, 0, 1.2, 2, 0, 1.5, 0, 1.2, 3, 0, 1.5,
  1.2, 0, 0, 0, 1.5, 0, 1.2, 5, 0, 1.5, 1.2, 0
];

// Odds are calibrated so every pick in a set returns about 95-96% over time.
const VIRTUAL_ODDS = {
  "velocity-derby": [2.5, 4, 6, 9, 14, 25],
  "speed-derby": [3.2, 4.6, 6.2, 8.2, 11, 15.5, 21, 32],
  "virtual-football": [2.5, 4, 6, 9, 14, 25],
  "virtual-basketball": [2.5, 4, 6, 9, 14, 25],
  "virtual-tennis": [2.5, 4, 6, 9, 14, 25],
  "greyhound-sprint": [2.5, 4, 6, 9, 14, 25]
};

const SLOT_SYMBOLS = [
  ["star", 2, 60],
  ["seven", 4, 30],
  ["diamond", 7, 15],
  ["crown", 10, 8],
  ["bell", 14, 5],
  ["cherry", 18, 3],
  ["lemon", 22, 2]
];

const PAIR_PAYOUTS = { star: 2, seven: 1.5, diamond: 1, crown: 0.6, bell: 0.4, cherry: 0.3, lemon: 0.2 };

const PLINKO_TABLES = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
  },
  10: {
    low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76]
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  }
};

const SUITS = ["♠", "♥", "♦", "♣"];

function drawCard() {
  return { rank: randomInt(2, 14), suit: SUITS[randomInt(0, SUITS.length - 1)] };
}

function baccaratTotal(cards) {
  return cards.reduce((sum, card) => sum + (card.rank === 14 ? 1 : card.rank >= 10 ? 0 : card.rank), 0) % 10;
}

function blackjackTotal(cards) {
  let total = cards.reduce((sum, card) => sum + Math.min(10, card.rank === 14 ? 11 : card.rank), 0);
  let aces = cards.filter((card) => card.rank === 14).length;
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

function baccaratValue(card) {
  return card.rank === 14 ? 1 : card.rank >= 10 ? 0 : card.rank;
}

function baccaratPlay() {
  const player = [drawCard(), drawCard()];
  const banker = [drawCard(), drawCard()];
  let playerTotal = baccaratTotal(player);
  let bankerTotal = baccaratTotal(banker);
  let playerThird = null;
  if (playerTotal < 8 && bankerTotal < 8) {
    if (playerTotal <= 5) {
      playerThird = drawCard();
      player.push(playerThird);
      playerTotal = baccaratTotal(player);
    }
    let bankerDraws = false;
    if (!playerThird) {
      bankerDraws = bankerTotal <= 5;
    } else {
      const third = baccaratValue(playerThird);
      if (bankerTotal <= 2) bankerDraws = true;
      else if (bankerTotal === 3) bankerDraws = third !== 8;
      else if (bankerTotal === 4) bankerDraws = third >= 2 && third <= 7;
      else if (bankerTotal === 5) bankerDraws = third >= 4 && third <= 7;
      else if (bankerTotal === 6) bankerDraws = third === 6 || third === 7;
    }
    if (bankerDraws) {
      banker.push(drawCard());
      bankerTotal = baccaratTotal(banker);
    }
  }
  const winner = playerTotal === bankerTotal ? "tie" : playerTotal > bankerTotal ? "player" : "banker";
  return { player, banker, playerTotal, bankerTotal, winner };
}

function makeShoe(decks = 6) {
  const cards = [];
  for (let deck = 0; deck < decks; deck += 1) {
    for (let rank = 2; rank <= 14; rank += 1) {
      for (const suit of SUITS) cards.push({ rank, suit });
    }
  }
  return shuffle(cards);
}

export function createBlackjackRound() {
  const shoe = makeShoe();
  return { shoe, player: [shoe.pop(), shoe.pop()], dealer: [shoe.pop(), shoe.pop()] };
}

export function blackjackHandTotal(cards) {
  return blackjackTotal(cards);
}

export function settleBlackjack(hand) {
  while (blackjackTotal(hand.dealer) < 17) hand.dealer.push(hand.shoe.pop());
  const playerTotal = blackjackTotal(hand.player);
  const dealerTotal = blackjackTotal(hand.dealer);
  const playerBlackjack = playerTotal === 21 && hand.player.length === 2;
  const dealerBlackjack = dealerTotal === 21 && hand.dealer.length === 2;
  let multiplier = 0;
  let result = "loss";
  if (playerTotal > 21) result = "bust";
  else if (playerBlackjack && dealerBlackjack) { multiplier = 1; result = "push"; }
  else if (playerBlackjack) { multiplier = 2.5; result = "blackjack"; }
  else if (dealerBlackjack) result = "dealer_blackjack";
  else if (dealerTotal > 21 || playerTotal > dealerTotal) { multiplier = 2; result = "win"; }
  else if (playerTotal === dealerTotal) { multiplier = 1; result = "push"; }
  return {
    player: hand.player,
    dealer: hand.dealer,
    playerTotal,
    dealerTotal,
    playerBlackjack,
    dealerBlackjack,
    result,
    multiplier,
    win: multiplier > 1,
    push: multiplier === 1
  };
}

const HAND_LABELS = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];

function evaluateFive(cards) {
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = ranks.reduce((acc, rank) => ({ ...acc, [rank]: (acc[rank] || 0) + 1 }), {});
  const groups = Object.entries(counts).map(([rank, count]) => [Number(rank), count]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const unique = [...new Set(ranks)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0];
    else if (unique[0] === 14 && unique[1] === 5) straightHigh = 5;
  }
  if (flush && straightHigh) return { score: [8, straightHigh], label: "Straight flush" };
  if (groups[0][1] === 4) return { score: [7, groups[0][0], groups[1][0]], label: "Four of a kind" };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { score: [6, groups[0][0], groups[1][0]], label: "Full house" };
  if (flush) return { score: [5, ...ranks], label: "Flush" };
  if (straightHigh) return { score: [4, straightHigh], label: "Straight" };
  if (groups[0][1] === 3) return { score: [3, groups[0][0], ...groups.slice(1).map((g) => g[0])], label: "Three of a kind" };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { score: [2, groups[0][0], groups[1][0], groups[2][0]], label: "Two pair" };
  if (groups[0][1] === 2) return { score: [1, groups[0][0], ...groups.slice(1).map((g) => g[0])], label: "Pair" };
  return { score: [0, ...ranks], label: "High card" };
}

function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return 1;
    if ((a[i] || 0) < (b[i] || 0)) return -1;
  }
  return 0;
}

function bestSeven(cards) {
  let best = null;
  for (let a = 0; a < 3; a += 1) {
    for (let b = a + 1; b < 4; b += 1) {
      for (let c = b + 1; c < 5; c += 1) {
        for (let d = c + 1; d < 6; d += 1) {
          for (let e = d + 1; e < 7; e += 1) {
            const hand = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareScores(hand.score, best.score) > 0) best = hand;
          }
        }
      }
    }
  }
  return best;
}

export function playInstant(gameId, bet, params = {}) {
  switch (gameId) {
    case "dice-roll": {
      const target = Math.min(98, Math.max(2, Number(params.target ?? 50)));
      const direction = params.direction === "under" ? "under" : "over";
      const winChance = direction === "over" ? 100 - target : target;
      const multiplier = round2(Math.min(49.5, 99 / winChance));
      const roll = round2(randomFloat() * 100);
      const win = direction === "over" ? roll > target : roll < target;
      return {
        win,
        multiplier: win ? multiplier : 0,
        outcome: { game: "dice-roll", target, direction, roll, winChance, multiplier, win },
        summary: `Rolled ${roll.toFixed(2)} — ${win ? "win" : "no win"} at ${multiplier.toFixed(2)}x`
      };
    }
    case "coin-flip": {
      const pick = params.pick === "tails" ? "tails" : "heads";
      const result = randomInt(0, 1) === 0 ? "heads" : "tails";
      const win = result === pick;
      return {
        win,
        multiplier: win ? 1.96 : 0,
        outcome: { game: "coin-flip", pick, result, multiplier: 1.96, win },
        summary: `Coin landed ${result} — ${win ? "win" : "no win"}`
      };
    }
    case "wheel-of-astra":
    case "dream-wheel-live": {
      const index = randomInt(0, WHEEL_SEGMENTS.length - 1);
      const multiplier = WHEEL_SEGMENTS[index];
      return {
        win: multiplier > 0,
        multiplier,
        outcome: { game: gameId, index, segments: WHEEL_SEGMENTS, multiplier, win: multiplier > 0 },
        summary: `Wheel stopped at ${multiplier.toFixed(2)}x`
      };
    }
    case "lucky-ten": {
      const pick = Math.min(9, Math.max(0, Number(params.pick ?? 7)));
      const drawn = randomInt(0, 9);
      const win = drawEquals(pick, drawn);
      return {
        win,
        multiplier: win ? 9 : 0,
        outcome: { game: "lucky-ten", pick, drawn, multiplier: 9, win },
        summary: `Draw: ${drawn} — ${win ? "your number hit" : "no match"}`
      };
    }
    case "hi-lo": {
      const current = randomInt(3, 13);
      const direction = params.direction === "lower" ? "lower" : "higher";
      const next = randomInt(2, 14);
      const winCount = direction === "higher" ? 14 - current : current - 2;
      const chance = winCount / 13;
      if (chance <= 0) throw Object.assign(new Error("This card has no valid higher/lower outcome. Start a new round."), { status: 400, code: "invalid_guess" });
      const multiplier = round2(Math.min(12, 0.97 / chance));
      const win = direction === "higher" ? next > current : next < current;
      return {
        win,
        multiplier: win ? multiplier : 0,
        outcome: { game: "hi-lo", current, next, direction, chance, multiplier, win },
        summary: `${cardName(current)} → ${cardName(next)} — ${win ? "correct call" : "incorrect call"}`
      };
    }
    case "plinko-drop": {
      const rows = [8, 10, 12].includes(Number(params.rows)) ? Number(params.rows) : 10;
      const risk = ["low", "medium", "high"].includes(params.risk) ? params.risk : "medium";
      const table = PLINKO_TABLES[rows][risk];
      const path = Array.from({ length: rows }, () => (randomInt(0, 1) === 0 ? "L" : "R"));
      const bucket = path.filter((step) => step === "R").length;
      const multiplier = table[bucket];
      return {
        win: multiplier > 1,
        multiplier,
        outcome: { game: "plinko-drop", rows, risk, path, bucket, multipliers: table, multiplier, win: multiplier > 1 },
        summary: `Landed in bucket ${bucket + 1} at ${multiplier.toFixed(2)}x`
      };
    }
    case "nova-fruits":
    case "neon-fortune":
    case "starlight-lines":
    case "golden-nova":
    case "mystic-temple":
    case "sakura-fortune":
    case "cyber-heist":
    case "dragons-vault":
    case "frost-queen":
    case "cairo-nights":
    case "jungle-spirit":
    case "aztec-eclipse":
    case "neon-reels":
    case "gilded-crown":
    case "titans-gate":
    case "lucky-lanterns":
    case "crystal-cavern":
    case "phoenix-fire": {
      const grid = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => pickWeighted(SLOT_SYMBOLS.map(([symbol, weight]) => [symbol, weight])))
      );
      let totalMultiplier = 0;
      const lines = grid.map((row, index) => {
        const counts = row.reduce((acc, symbol) => ({ ...acc, [symbol]: (acc[symbol] || 0) + 1 }), {});
        let best = null;
        for (const [symbol, count] of Object.entries(counts)) {
          const triple = SLOT_SYMBOLS.find(([s]) => s === symbol)[2];
          if (count === 3) best = { symbol, kind: 3, payout: triple };
          else if (count === 2 && (!best || PAIR_PAYOUTS[symbol] > best.payout)) {
            best = { symbol, kind: 2, payout: PAIR_PAYOUTS[symbol] };
          }
        }
        if (best) totalMultiplier += best.payout;
        return { row: index, symbols: row, match: best };
      });
      totalMultiplier = round2(totalMultiplier);
      return {
        win: totalMultiplier > 0,
        multiplier: totalMultiplier,
        outcome: { game: gameId, grid, lines, multiplier: totalMultiplier, win: totalMultiplier > 0 },
        summary: totalMultiplier > 0 ? `Line win worth ${totalMultiplier.toFixed(2)}x` : "No winning line"
      };
    }
    case "virtual-football":
    case "virtual-basketball":
    case "virtual-tennis":
    case "greyhound-sprint":
    case "velocity-derby":
    case "speed-derby": {
      const odds = VIRTUAL_ODDS[gameId] || VIRTUAL_ODDS["velocity-derby"];
      const count = odds.length;
      const chosen = Math.min(count - 1, Math.max(0, Number(params.runner ?? 0)));
      const weights = odds.map((value, index) => [index, 1 / value]);
      const winner = pickWeighted(weights);
      const win = winner === chosen;
      const finishOrder = [winner, ...shuffle(Array.from({ length: count }, (_, i) => i).filter((i) => i !== winner))];
      return {
        win,
        multiplier: win ? odds[chosen] : 0,
        outcome: { game: gameId, chosen, winner, odds, finishOrder, multiplier: win ? odds[chosen] : 0, win },
        summary: `Competitor ${winner + 1} won — ${win ? "winning pick" : "no win"}`
      };
    }
    case "keno-blitz": {
      const picks = Array.isArray(params.picks) ? [...new Set(params.picks.map(Number).filter((n) => n >= 1 && n <= 10))].slice(0, 3) : [];
      if (picks.length !== 3) throw Object.assign(new Error("Pick three numbers from 1 to 10."), { status: 400, code: "invalid_picks" });
      const draw = shuffle(Array.from({ length: 10 }, (_, index) => index + 1)).slice(0, 3);
      const matches = picks.filter((pick) => draw.includes(pick)).length;
      const multiplier = matches === 3 ? 25 : matches === 2 ? 2.5 : matches === 1 ? 0.6 : 0;
      return {
        win: multiplier > 0,
        multiplier,
        outcome: { game: gameId, picks, draw, matches, multiplier, win: multiplier > 0 },
        summary: `${matches} of 3 numbers matched — ${multiplier > 0 ? `${multiplier.toFixed(2)}x` : "no win"}`
      };
    }
    case "scratch-nova": {
      const symbols = Array.from({ length: 9 }, () => pickWeighted(SLOT_SYMBOLS.map(([symbol, weight]) => [symbol, weight])));
      const counts = symbols.reduce((acc, symbol) => ({ ...acc, [symbol]: (acc[symbol] || 0) + 1 }), {});
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const multiplier = best && best[1] >= 3 ? (best[0] === "star" ? 20 : best[0] === "seven" ? 5 : 1) : 0;
      return {
        win: multiplier > 0,
        multiplier,
        outcome: { game: gameId, symbols, match: best?.[0] || null, multiplier, win: multiplier > 0 },
        summary: multiplier === 1 ? `Three ${best[0]} symbols — stake returned` : multiplier > 0 ? `Three ${best[0]} symbols — ${multiplier}x` : "No matching trio"
      };
    }
    case "limbo-velocity": {
      const target = Math.min(100, Math.max(1.2, round2(Number(params.target || 2))));
      const u = randomFloat();
      const result = Math.min(1000, Math.max(1, round2(0.99 / Math.max(0.000001, 1 - u))));
      const win = result >= target;
      return {
        win,
        multiplier: win ? target : 0,
        outcome: { game: gameId, target, result, multiplier: win ? target : 0, win },
        summary: `Limbo at ${result.toFixed(2)}x — ${win ? "target beaten" : "target missed"}`
      };
    }
    case "tower-climb": {
      const steps = Math.min(5, Math.max(1, Number(params.steps || 3)));
      const chance = Math.pow(0.72, steps);
      const win = randomFloat() < chance;
      const multiplier = round2(0.97 / chance);
      return {
        win,
        multiplier: win ? multiplier : 0,
        outcome: { game: gameId, steps, chance: round2(chance), multiplier: win ? multiplier : 0, win },
        summary: win ? `Cleared ${steps} floors at ${multiplier.toFixed(2)}x` : `Tower collapsed on floor ${steps}`
      };
    }
    case "astra-roulette-live": {
      const bet = ["red", "black", "even", "odd", "high", "low"].includes(params.bet) ? params.bet : "red";
      const number = randomInt(0, 36);
      const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
      const color = number === 0 ? "green" : reds.has(number) ? "red" : "black";
      const win = number !== 0 && (
        (bet === "red" && color === "red") || (bet === "black" && color === "black") ||
        (bet === "even" && number % 2 === 0) || (bet === "odd" && number % 2 === 1) ||
        (bet === "high" && number >= 19) || (bet === "low" && number <= 18)
      );
      return {
        win,
        multiplier: win ? 2 : 0,
        outcome: { game: gameId, number, color, bet, multiplier: win ? 2 : 0, win },
        summary: `Roulette ${number} ${color} — ${win ? "winning bet" : "no win"}`
      };
    }
    case "baccarat-royale":
    case "speed-baccarat": {
      const bet = ["player", "banker", "tie"].includes(params.bet) ? params.bet : "player";
      const round = baccaratPlay();
      const win = round.winner === bet && round.winner !== "tie";
      const push = round.winner === "tie" && bet !== "tie";
      const multiplier = win ? (bet === "tie" ? 9 : bet === "banker" ? 1.95 : 2) : push ? 1 : 0;
      return {
        win,
        multiplier,
        outcome: { game: gameId, bet, ...round, multiplier, win, push },
        summary: `Player ${round.playerTotal} · Banker ${round.bankerTotal} — ${push ? "tie, stake pushed" : win ? "winning bet" : `${round.winner} won`}`
      };
    }
    case "sicbo-nova": {
      const bet = ["big", "small", "odd", "even"].includes(params.bet) ? params.bet : "big";
      const dice = [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)];
      const total = dice.reduce((sum, value) => sum + value, 0);
      const triple = dice[0] === dice[1] && dice[1] === dice[2];
      const win = !triple && (
        (bet === "big" && total >= 11) || (bet === "small" && total <= 10) ||
        (bet === "odd" && total % 2 === 1) || (bet === "even" && total % 2 === 0)
      );
      return {
        win,
        multiplier: win ? 2 : 0,
        outcome: { game: gameId, dice, total, bet, triple, multiplier: win ? 2 : 0, win },
        summary: `Sic Bo ${dice.join("+")} = ${total} — ${win ? "winning bet" : triple ? "triple loses" : "no win"}`
      };
    }
    case "blackjack-azure": {
      const player = [drawCard(), drawCard()];
      const dealer = [drawCard(), drawCard()];
      while (blackjackTotal(dealer) < 17) dealer.push(drawCard());
      const playerTotal = blackjackTotal(player);
      const dealerTotal = blackjackTotal(dealer);
      const playerBlackjack = playerTotal === 21 && player.length === 2;
      const dealerBlackjack = dealerTotal === 21 && dealer.length === 2;
      let multiplier = 0;
      let result = "loss";
      if (playerTotal > 21) result = "bust";
      else if (playerBlackjack && dealerBlackjack) { multiplier = 1; result = "push"; }
      else if (playerBlackjack) { multiplier = 2.5; result = "blackjack"; }
      else if (dealerBlackjack) result = "dealer_blackjack";
      else if (dealerTotal > 21 || playerTotal > dealerTotal) { multiplier = 2; result = "win"; }
      else if (playerTotal === dealerTotal) { multiplier = 1; result = "push"; }
      return {
        win: multiplier > 1,
        multiplier,
        outcome: { game: gameId, player, dealer, playerTotal, dealerTotal, result, multiplier, win: multiplier > 1, push: multiplier === 1 },
        summary: `Player ${playerTotal} · Dealer ${dealerTotal} — ${result.replace("_", " ")}`
      };
    }
    case "holdem-prime": {
      const player = [drawCard(), drawCard()];
      const dealer = [drawCard(), drawCard()];
      const board = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];
      const playerBest = bestSeven([...player, ...board]);
      const dealerBest = bestSeven([...dealer, ...board]);
      const comparison = compareScores(playerBest.score, dealerBest.score);
      const multiplier = comparison > 0 ? 1.95 : comparison === 0 ? 1 : 0;
      return {
        win: comparison > 0,
        multiplier,
        outcome: { game: gameId, player, dealer, board, playerHand: playerBest.label, dealerHand: dealerBest.label, result: comparison > 0 ? "win" : comparison === 0 ? "push" : "loss", multiplier, win: comparison > 0, push: comparison === 0 },
        summary: `${playerBest.label} vs ${dealerBest.label} — ${comparison > 0 ? "win" : comparison === 0 ? "push" : "dealer wins"}`
      };
    }
    default:
      throw Object.assign(new Error("This game does not have an active play engine."), { status: 400, code: "game_not_playable" });
  }
}

function drawEquals(a, b) {
  return a === b;
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function cardName(rank) {
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  return String(rank);
}

export { WHEEL_SEGMENTS, SLOT_SYMBOLS, PLINKO_TABLES };
