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
await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "player@19xbet365.test", password: "19X#2026" }) });

const evidence = { hands: [], failures: [] };
try {
  for (let i = 0; i < 12; i += 1) {
    const start = await req("/api/games/blackjack-azure/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
    if (start.dealer.length !== 1) throw new Error("Hole card leaked on deal");
    if (start.player.length !== 2) throw new Error("Player was not dealt two cards");
    let settled = null;
    if (start.playerTotal < 17) {
      const hit = await req(`/api/games/blackjack-azure/${start.roundId}/hit`, { method: "POST" });
      if (hit.dealer.length !== 1 && hit.status === "open") throw new Error("Hole card leaked after hit");
      if (hit.status === "settled") settled = { ...hit, via: "hit" };
    }
    if (!settled) {
      const stand = await req(`/api/games/blackjack-azure/${start.roundId}/stand`, { method: "POST" });
      if (stand.status !== "settled") throw new Error("Stand did not settle the hand");
      if (stand.dealer.length < 2) throw new Error("Dealer hand not revealed");
      if (stand.dealerTotal < 17 && stand.result !== "bust" && stand.result !== "dealer_blackjack") {
        throw new Error(`Dealer stood below 17: ${stand.dealerTotal}`);
      }
      settled = { ...stand, via: "stand" };
    }
    evidence.hands.push({
      playerTotal: settled.playerTotal,
      dealerTotal: settled.dealerTotal,
      result: settled.result,
      payout: settled.payout,
      via: settled.via,
      balance: settled.balance
    });
    const replay = await req(`/api/games/blackjack-azure/${start.roundId}/stand`, { method: "POST" }, 409);
    if (!replay?.error && !replay?.message) throw new Error("Settled hand allowed a second stand");
  }

  // An abandoned hand is voided and its stake returned when a new hand starts.
  const first = await req("/api/games/blackjack-azure/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
  const afterFirst = first.balance;
  const second = await req("/api/games/blackjack-azure/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
  if (second.balance !== afterFirst) throw new Error(`Stale hand was not refunded: ${afterFirst} -> ${second.balance}`);
  await req(`/api/games/blackjack-azure/${second.roundId}/stand`, { method: "POST" });
  evidence.staleRefund = { afterFirst, afterSecond: second.balance };
  evidence.pass = evidence.failures.length === 0;
} catch (error) {
  evidence.pass = false;
  evidence.error = String(error);
}
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.pass) process.exitCode = 1;
