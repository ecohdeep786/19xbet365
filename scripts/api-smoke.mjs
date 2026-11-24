const base = "http://127.0.0.1:4000";
let cookie = "";
async function request(path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) cookie = c.split(";")[0];
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  console.log(res.status, path, JSON.stringify(data).slice(0, 600));
  return { status: res.status, data };
}

await request("/api/health");
await request("/api/bootstrap");
await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "player@19xbet365.test", password: "19X#2026" }) });
await request("/api/player/overview");
await request("/api/player/transactions?limit=3");
await request("/api/games/crash-orbit/activity");
await request("/api/games/dice-roll/play", { method: "POST", body: JSON.stringify({ stake: 25, params: { target: 50, direction: "over" } }) });
const mines = await request("/api/games/mines-vault/start", { method: "POST", body: JSON.stringify({ stake: 20, mines: 3 }) });
const reveal = await request(`/api/games/mines-vault/${mines.data.roundId}/reveal`, { method: "POST", body: JSON.stringify({ tile: 0 }) });
if (reveal.data.status === "open") {
  await request(`/api/games/mines-vault/${mines.data.roundId}/cashout`, { method: "POST" });
}
await request("/api/auth/logout", { method: "POST" });
await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@19xbet365.test", password: "19X#2026" }) });
await request("/api/admin/overview");
await request("/api/admin/network");
await request("/api/admin/accounts?limit=5");
await request("/api/admin/audit?limit=3");
await request("/api/admin/security");
await request("/api/admin/system");
