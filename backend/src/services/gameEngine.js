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
  1.2, 0, 2, 0, 1.5, 0, 1.2, 5, 0, 1.5, 1.2, 0
];

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
    case "wheel-of-astra": {
      const index = randomInt(0, WHEEL_SEGMENTS.length - 1);
      const multiplier = WHEEL_SEGMENTS[index];
      return {
        win: multiplier > 0,
        multiplier,
        outcome: { game: "wheel-of-astra", index, segments: WHEEL_SEGMENTS, multiplier, win: multiplier > 0 },
        summary: `Wheel stopped at ${multiplier.toFixed(2)}x`
      };
    }
    case "lucky-ten": {
      const pick = Math.min(9, Math.max(0, Number(params.pick ?? 7)));
      const drawn = randomInt(0, 9);
      const win = drawEquals(pick, drawn);
      return {
        win,
        multiplier: win ? 8.8 : 0,
        outcome: { game: "lucky-ten", pick, drawn, multiplier: 8.8, win },
        summary: `Draw: ${drawn} — ${win ? "your number hit" : "no match"}`
      };
    }
    case "hi-lo": {
      const current = randomInt(2, 14);
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
    case "nova-fruits": {
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
        outcome: { game: "nova-fruits", grid, lines, multiplier: totalMultiplier, win: totalMultiplier > 0 },
        summary: totalMultiplier > 0 ? `Line win worth ${totalMultiplier.toFixed(2)}x` : "No winning line"
      };
    }
    case "velocity-derby":
    case "speed-derby": {
      const count = gameId === "speed-derby" ? 8 : 6;
      const odds = [3.1, 3.8, 4.6, 5.7, 7.2, 9.4, 11.5, 14.0].slice(0, count);
      const chosen = Math.min(count - 1, Math.max(0, Number(params.runner ?? 0)));
      const weights = odds.map((value) => [odds.indexOf(value), 0.96 / value]);
      const winner = pickWeighted(weights);
      const win = winner === chosen;
      const finishOrder = [winner, ...shuffle(Array.from({ length: count }, (_, i) => i).filter((i) => i !== winner))];
      return {
        win,
        multiplier: win ? odds[chosen] : 0,
        outcome: { game: gameId, chosen, winner, odds, finishOrder, multiplier: win ? odds[chosen] : 0, win },
        summary: `Runner ${winner + 1} won — ${win ? "winning pick" : "no win"}`
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
