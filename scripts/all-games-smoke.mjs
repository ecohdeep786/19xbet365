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
async function login(email) { cookie = ""; return req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "19X#2026" }) }); }

const evidence = { games: [], failures: [] };
try {
  await login("player@19xbet365.test");
  const all = (await req("/api/games")).games.filter((game) => game.playable);
  evidence.total = all.length;
  for (const game of all) {
    try {
      let result;
      if (game.id === "crash-orbit" || game.id === "airball-crash") {
        const start = await req(`/api/games/${game.id}/start`, { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
        result = await req(`/api/games/${game.id}/${start.roundId}/cashout`, { method: "POST" });
        result = { balance: result.balance, message: result.message };
      } else if (game.id === "mines-vault") {
        const start = await req("/api/games/mines-vault/start", { method: "POST", body: JSON.stringify({ stake: 10, mines: 3 }) }, 201);
        const reveal = await req(`/api/games/mines-vault/${start.roundId}/reveal`, { method: "POST", body: JSON.stringify({ tile: 0 }) });
        if (reveal.status === "open") {
          result = await req(`/api/games/mines-vault/${start.roundId}/cashout`, { method: "POST" });
          result = { balance: result.balance, message: result.message };
        } else {
          result = { balance: reveal.balance, message: reveal.message };
        }
      } else if (game.id === "blackjack-azure") {
        const start = await req("/api/games/blackjack-azure/start", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 201);
        result = await req(`/api/games/blackjack-azure/${start.roundId}/stand`, { method: "POST" });
        result = { balance: result.balance, message: result.message };
      } else {
        const params = game.id === "keno-blitz" ? { picks: [1, 2, 3] }
          : game.id === "limbo-velocity" ? { target: 2 }
          : game.id === "tower-climb" ? { steps: 3 }
          : game.id === "astra-roulette-live" ? { bet: "red" }
          : game.id === "sicbo-nova" ? { bet: "big" }
          : game.id === "baccarat-royale" || game.id === "speed-baccarat" ? { bet: "player" }
          : game.category === "virtuals" ? { runner: 0 }
          : {};
        result = await req(`/api/games/${game.id}/play`, { method: "POST", body: JSON.stringify({ stake: 10, params }) }, 201);
      }
      evidence.games.push({ id: game.id, name: game.name, category: game.category, balance: result.balance, message: result.message });
    } catch (error) {
      evidence.failures.push({ id: game.id, name: game.name, error: String(error) });
    }
  }
  evidence.balance = (await req("/api/player/overview")).user.balance;
  evidence.played = evidence.games.length;
  evidence.pass = evidence.failures.length === 0 && evidence.played === evidence.total;
} catch (error) {
  evidence.pass = false;
  evidence.error = String(error);
} finally {
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.pass) process.exitCode = 1;
}
