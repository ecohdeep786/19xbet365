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

const evidence = {};
try {
  await login("player@19xbet365.test");
  const contests = (await req("/api/fantasy/contests")).contests;
  const contest = contests.find((item) => item.status === "open");
  if (!contest) throw new Error("No open fantasy contest. Reseed first.");
  const detail = await req(`/api/fantasy/contests/${contest.id}`);
  const lineup = ["kt-wk-1", "kt-bat-1", "kt-bat-2", "kt-bat-4", "pp-bat-4", "kt-ar-1", "kt-ar-3", "pp-ar-1", "kt-bowl-2", "pp-bowl-2", "pp-bowl-3"];
  const entry = await req(`/api/fantasy/contests/${contest.id}/entries`, {
    method: "POST",
    body: JSON.stringify({ lineup, captainId: "kt-bat-1", viceCaptainId: "kt-bat-2" })
  }, 201);
  evidence.entry = { id: entry.entry.id, fee: entry.entry.entryFee, balance: entry.balance };

  await login("admin@19xbet365.test");
  const scores = detail.players.map((player) => ({ playerId: player.id, points: Math.max(1, Math.round(player.salary * 3)) }));
  evidence.scores = (await req(`/api/admin/fantasy/contests/${contest.id}/scores`, { method: "POST", body: JSON.stringify({ scores }) })).updated;
  const settlement = await req(`/api/admin/fantasy/contests/${contest.id}/settle`, { method: "POST" });
  evidence.settlement = settlement;

  await login("player@19xbet365.test");
  const mine = (await req("/api/fantasy/my-entries")).entries.find((item) => item.contestId === contest.id);
  evidence.playerEntry = { status: mine?.status, rank: mine?.rank, score: mine?.score, payout: mine?.payout };
  evidence.pass = mine?.status === "settled" && Number(mine?.payout) >= 0;
} catch (error) {
  evidence.pass = false;
  evidence.error = String(error);
} finally {
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.pass) process.exitCode = 1;
}
