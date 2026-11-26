const base = "http://127.0.0.1:4000";
let cookie = "";
async function req(path, options = {}, expected = 200) {
  const res = await fetch(base + path, { ...options, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) } });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(";")[0];
  if (res.status !== expected) throw new Error(`${path}: expected ${expected}, got ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
async function play(id, params = {}) {
  return req(`/api/games/${id}/play`, { method: "POST", body: JSON.stringify({ stake: 10, params }) }, 201);
}
await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "player@19xbet365.test", password: "19X#2026" }) });

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
}
try {
  for (let i = 0; i < 5; i += 1) {
    const data = await play("bingo-bonanza");
    const outcome = data.round.outcome;
    const flat = outcome.grid.flat();
    check(`Bingo ticket ${i + 1} has 9 unique numbers`, new Set(flat).size === 9 && flat.length === 9, JSON.stringify(flat));
    check(`Bingo draw ${i + 1} has 12 unique calls`, new Set(outcome.draw).size === 12 && outcome.draw.length === 12, outcome.draw.length);
    check(`Bingo lines ${i + 1} settle`, typeof outcome.lines === "number" && data.round.status === "settled", outcome.lines);
  }

  for (let i = 0; i < 6; i += 1) {
    const data = await play("tv-wheelbet", { bet: "red" });
    const outcome = data.round.outcome;
    const expectedColor = outcome.number === 0 ? "green" : outcome.color;
    check(`WheelBet ${i + 1} number is 0-36`, outcome.number >= 0 && outcome.number <= 36, outcome.number);
    check(`WheelBet ${i + 1} colour is consistent`, expectedColor === outcome.color, `${outcome.number}/${outcome.color}`);
  }

  for (let i = 0; i < 5; i += 1) {
    const data = await play("war-of-elements", { element: i % 4 });
    const outcome = data.round.outcome;
    check(`War of Elements ${i + 1} settles`, outcome.winner >= 0 && outcome.winner <= 3, outcome.winner);
    check(`War of Elements ${i + 1} payout matches pick`, outcome.win ? Number(outcome.multiplier) === Number(outcome.elements[outcome.pick].payout) : Number(outcome.multiplier) === 0, outcome.multiplier);
  }

  for (let i = 0; i < 3; i += 1) {
    const picks = Array.from({ length: 15 }, (_, index) => (index + i) % 3);
    const data = await play("toto-fifteen", { picks });
    const outcome = data.round.outcome;
    const correct = picks.reduce((total, pick, index) => total + (pick === outcome.results[index] ? 1 : 0), 0);
    check(`Toto ${i + 1} returns 15 results`, outcome.results.length === 15, outcome.results.length);
    check(`Toto ${i + 1} correct count is exact`, outcome.correct === correct, `${outcome.correct}/${correct}`);
  }

  for (let i = 0; i < 5; i += 1) {
    const picks = [1, 2, 3, 4, 5, 6];
    const data = await play("lotto-636", { picks });
    const outcome = data.round.outcome;
    check(`Lotto ${i + 1} draws 6 unique numbers`, new Set(outcome.draw).size === 6 && outcome.draw.length === 6, outcome.draw.length);
    check(`Lotto ${i + 1} matches count`, outcome.matches === picks.filter((number) => outcome.draw.includes(number)).length, outcome.matches);
  }

  for (let i = 0; i < 4; i += 1) {
    const data = await play("reef-hunter", { target: i % 6 });
    const outcome = data.round.outcome;
    check(`Reef Hunter ${i + 1} settles`, outcome.winner >= 0 && outcome.winner <= 5, outcome.winner);
    check(`Reef Hunter ${i + 1} payout matches target`, outcome.win ? Number(outcome.multiplier) === Number(outcome.targets[outcome.pick].payout) : Number(outcome.multiplier) === 0, outcome.multiplier);
  }

  for (const id of ["scratch-gold", "scratch-lucky", "scratch-nova"]) {
    const data = await play(id);
    check(`${id} returns 9 scratches`, data.round.outcome.symbols.length === 9, data.round.outcome.symbols.length);
  }

  for (let i = 0; i < 4; i += 1) {
    const start = await req("/api/games/video-poker-deluxe/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
    check(`Video Poker ${i + 1} deals five cards`, start.hand.length === 5, start.hand.length);
    const draw = await req(`/api/games/video-poker-deluxe/${start.roundId}/draw`, { method: "POST", body: JSON.stringify({ held: [0, 2] }) });
    check(`Video Poker ${i + 1} settles`, draw.status === "settled" && draw.hand.length === 5, draw.handLabel);
    check(`Video Poker ${i + 1} keeps held cards`, JSON.stringify(draw.held) === JSON.stringify([0, 2]), JSON.stringify(draw.held));
    await req(`/api/games/video-poker-deluxe/${start.roundId}/draw`, { method: "POST", body: JSON.stringify({ held: [0] }) }, 409);
  }

  const first = await req("/api/games/video-poker-deluxe/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
  const second = await req("/api/games/video-poker-deluxe/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
  check("Abandoned Video Poker hand is refunded", first.balance === second.balance, `${first.balance}/${second.balance}`);
  await req(`/api/games/video-poker-deluxe/${second.roundId}/draw`, { method: "POST", body: JSON.stringify({ held: [] }) });

  console.log(JSON.stringify({ checks, pass: checks.every((item) => item.pass) }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ checks, pass: false, error: String(error) }, null, 2));
  process.exitCode = 1;
}
