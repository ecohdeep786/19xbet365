const base = "http://127.0.0.1:4000";
let cookie = "";
async function req(path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(";")[0];
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`);
  return data;
}
await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "player@19xbet365.test", password: "19X#2026" }) });
const results = [];
for (const [game, params] of [
  ["dice-roll", { target: 40, direction: "over" }],
  ["coin-flip", { pick: "heads" }],
  ["wheel-of-astra", {}],
  ["plinko-drop", { rows: 10, risk: "medium" }],
  ["lucky-ten", { pick: 3 }],
  ["hi-lo", { direction: "higher" }],
  ["nova-fruits", {}],
  ["velocity-derby", { runner: 2 }],
  ["speed-derby", { runner: 4 }]
]) {
  const data = await req(`/api/games/${game}/play`, { method: "POST", body: JSON.stringify({ stake: 10, params }) });
  results.push({ game, status: "ok", payout: data.round.payout, summary: data.round.outcome.summary });
}
const crash = await req("/api/games/crash-orbit/start", { method: "POST", body: JSON.stringify({ stake: 10, autoCashout: null }) });
await new Promise((r) => setTimeout(r, 250));
const crashStatus = await req(`/api/games/crash-orbit/${crash.roundId}/status`);
if (crashStatus.status === "settled") {
  results.push({ game: "crash-orbit", status: "ok", cashout: "busted", crashPoint: crashStatus.crashPoint, payout: crashStatus.payout });
} else {
  const cashout = await req(`/api/games/crash-orbit/${crash.roundId}/cashout`, { method: "POST" });
  results.push({ game: "crash-orbit", status: "ok", multiplier: cashout.multiplier, cashout: cashout.status, payout: cashout.payout });
}
const mines = await req("/api/games/mines-vault/start", { method: "POST", body: JSON.stringify({ stake: 10, mines: 3 }) });
let minesResult;
for (let tile = 0; tile < 25; tile += 1) {
  minesResult = await req(`/api/games/mines-vault/${mines.roundId}/reveal`, { method: "POST", body: JSON.stringify({ tile }) });
  if (minesResult.status !== "open") break;
}
results.push({ game: "mines-vault", status: "ok", result: minesResult?.status, multiplier: minesResult?.multiplier, payout: minesResult?.payout });
const overview = await req("/api/player/overview");
console.log(JSON.stringify({ results, balance: overview.user.balance, rounds: overview.stats.totalRounds }, null, 2));
