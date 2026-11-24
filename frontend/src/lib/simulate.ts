const WHEEL = [0, 1.5, 0, 1.2, 2, 0, 1.5, 0, 1.2, 3, 0, 1.5, 1.2, 0, 2, 0, 1.5, 0, 1.2, 5, 0, 1.5, 1.2, 0];
const PLINKO: Record<string, Record<string, number[]>> = {
  "8": {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
  },
  "10": {
    low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76]
  },
  "12": {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  }
};
const SLOT_SYMBOLS = ["star", "seven", "diamond", "crown", "bell", "cherry", "lemon"];
const SLOT_WEIGHTS = [2, 4, 7, 10, 14, 18, 22];
const PAIR: Record<string, number> = { star: 2, seven: 1.5, diamond: 1, crown: 0.6, bell: 0.4, cherry: 0.3, lemon: 0.2 };
const TRIPLE: Record<string, number> = { star: 60, seven: 30, diamond: 15, crown: 8, bell: 5, cherry: 3, lemon: 2 };
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const round2 = (value: number) => Math.round(value * 100) / 100;
const pickSymbol = () => {
  const total = SLOT_WEIGHTS.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < SLOT_SYMBOLS.length; index += 1) {
    roll -= SLOT_WEIGHTS[index];
    if (roll < 0) return SLOT_SYMBOLS[index];
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
};

export interface SimulatedOutcome {
  win: boolean;
  multiplier: number;
  outcome: Record<string, unknown>;
  summary: string;
}

export function simulateInstant(gameId: string, stake: number, params: Record<string, unknown> = {}): SimulatedOutcome {
  switch (gameId) {
    case "dice-roll": {
      const target = Math.min(98, Math.max(2, Number(params.target ?? 50)));
      const direction = params.direction === "under" ? "under" : "over";
      const winChance = direction === "over" ? 100 - target : target;
      const multiplier = round2(Math.min(49.5, 99 / winChance));
      const roll = round2(Math.random() * 100);
      const win = direction === "over" ? roll > target : roll < target;
      return { win, multiplier: win ? multiplier : 0, outcome: { game: "dice-roll", target, direction, roll, winChance, multiplier, win }, summary: `Rolled ${roll.toFixed(2)} — ${win ? "win" : "no win"} at ${multiplier.toFixed(2)}x` };
    }
    case "coin-flip": {
      const pick = params.pick === "tails" ? "tails" : "heads";
      const result = Math.random() < 0.5 ? "heads" : "tails";
      const win = result === pick;
      return { win, multiplier: win ? 1.96 : 0, outcome: { game: "coin-flip", pick, result, multiplier: 1.96, win }, summary: `Coin landed ${result} — ${win ? "win" : "no win"}` };
    }
    case "wheel-of-astra": {
      const index = rand(0, WHEEL.length - 1);
      const multiplier = WHEEL[index];
      return { win: multiplier > 0, multiplier, outcome: { game: "wheel-of-astra", index, segments: WHEEL, multiplier, win: multiplier > 0 }, summary: `Wheel stopped at ${multiplier.toFixed(2)}x` };
    }
    case "lucky-ten": {
      const pick = Math.min(9, Math.max(0, Number(params.pick ?? 7)));
      const drawn = rand(0, 9);
      const win = pick === drawn;
      return { win, multiplier: win ? 8.8 : 0, outcome: { game: "lucky-ten", pick, drawn, multiplier: 8.8, win }, summary: `Draw: ${drawn} — ${win ? "your number hit" : "no match"}` };
    }
    case "hi-lo": {
      const current = rand(2, 14);
      const direction = params.direction === "lower" ? "lower" : "higher";
      const next = rand(2, 14);
      const winCount = direction === "higher" ? 14 - current : current - 2;
      const chance = winCount / 13;
      const multiplier = round2(Math.min(12, 0.97 / Math.max(0.01, chance)));
      const win = direction === "higher" ? next > current : next < current;
      return { win, multiplier: win ? multiplier : 0, outcome: { game: "hi-lo", current, next, direction, chance, multiplier, win }, summary: `${RANKS[current - 2]} → ${RANKS[next - 2]} — ${win ? "correct call" : "incorrect call"}` };
    }
    case "plinko-drop": {
      const rows = [8, 10, 12].includes(Number(params.rows)) ? Number(params.rows) : 10;
      const risk = ["low", "medium", "high"].includes(String(params.risk)) ? String(params.risk) : "medium";
      const table = PLINKO[String(rows)][risk];
      const path = Array.from({ length: rows }, () => (Math.random() < 0.5 ? "L" : "R"));
      const bucket = path.filter((step) => step === "R").length;
      const multiplier = table[bucket];
      return { win: multiplier > 1, multiplier, outcome: { game: "plinko-drop", rows, risk, path, bucket, multipliers: table, multiplier, win: multiplier > 1 }, summary: `Landed in bucket ${bucket + 1} at ${multiplier.toFixed(2)}x` };
    }
    case "nova-fruits": {
      const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, pickSymbol));
      let total = 0;
      const lines = grid.map((row, index) => {
        const counts: Record<string, number> = {};
        row.forEach((symbol) => { counts[symbol] = (counts[symbol] || 0) + 1; });
        let best: { symbol: string; kind: number; payout: number } | null = null;
        for (const [symbol, count] of Object.entries(counts)) {
          if (count === 3) best = { symbol, kind: 3, payout: TRIPLE[symbol] };
          else if (count === 2 && (!best || PAIR[symbol] > best.payout)) best = { symbol, kind: 2, payout: PAIR[symbol] };
        }
        if (best) total += best.payout;
        return { row: index, symbols: row, match: best };
      });
      total = round2(total);
      return { win: total > 0, multiplier: total, outcome: { game: "nova-fruits", grid, lines, multiplier: total, win: total > 0 }, summary: total > 0 ? `Line win worth ${total.toFixed(2)}x` : "No winning line" };
    }
    case "velocity-derby":
    case "speed-derby": {
      const count = gameId === "speed-derby" ? 8 : 6;
      const odds = [3.1, 3.8, 4.6, 5.7, 7.2, 9.4, 11.5, 14].slice(0, count);
      const chosen = Math.min(count - 1, Math.max(0, Number(params.runner ?? 0)));
      const winner = rand(0, count - 1);
      const win = chosen === winner;
      const finishOrder = [winner, ...Array.from({ length: count }, (_, index) => index).filter((index) => index !== winner).sort(() => Math.random() - 0.5)];
      return { win, multiplier: win ? odds[chosen] : 0, outcome: { game: gameId, chosen, winner, odds, finishOrder, multiplier: win ? odds[chosen] : 0, win }, summary: `Runner ${winner + 1} won — ${win ? "winning pick" : "no win"}` };
    }
    case "mines-vault": {
      return { win: false, multiplier: 0, outcome: { game: "mines-vault", win: false, multiplier: 0 }, summary: "Use the vault board to start a multi-step round." };
    }
    default:
      return { win: false, multiplier: 0, outcome: { game: gameId, win: false, multiplier: 0 }, summary: "Browser preview outcome unavailable." };
  }
}
