const base = "http://127.0.0.1:4000";
let cookie = "";
async function req(path, options = {}, expected = 200) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(";")[0];
  if (res.status !== expected) throw new Error(`${path}: expected ${expected}, got ${res.status}: ${JSON.stringify(data)}`);
  return { status: res.status, data };
}
async function login(email, expected = 200) {
  cookie = "";
  return req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "19X#2026" }) }, expected);
}
const evidence = {};
evidence.anonymousAdmin = (await req("/api/admin/overview", {}, 401)).data.message;
evidence.anonymousBet = (await req("/api/bets", { method: "POST", body: JSON.stringify({ selections: [], stake: 10 }) }, 401)).data.message;
await login("player@19xbet365.test");
evidence.playerAdmin = (await req("/api/admin/overview", {}, 403)).data.message;
evidence.providerRequired = (await req("/api/games/astra-roulette-live/play", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 409)).data.message;
await login("admin@19xbet365.test");
evidence.realMoneyLock = (await req("/api/admin/settings/realMoneyEnabled", { method: "PATCH", body: JSON.stringify({ value: true }) }, 403)).data.message;
await login("luca.moretti@19xbet365.test");
const scoped = await req("/api/admin/accounts?limit=100");
evidence.agentScope = { count: scoped.data.total, roles: [...new Set(scoped.data.accounts.map((account) => account.role))], includesMaster: scoped.data.accounts.some((account) => account.role === "master_admin"), includesOtherAdmin: scoped.data.accounts.some((account) => account.role === "admin") };
const overview = await req("/api/admin/overview");
evidence.agentOverview = { global: overview.data.scope.global, accountCount: overview.data.scope.accountCount, roles: overview.data.roleCounts };
evidence.agentRolesDenied = (await req("/api/admin/roles", {}, 403)).data.message;
evidence.agentTransfersDenied = (await req("/api/admin/transfers", {}, 403)).data.message;
await login("sofia.lind@example.com", 403);
evidence.suspendedLogin = "rejected";
await login("admin@19xbet365.test");
evidence.auditCount = (await req("/api/admin/audit?limit=5")).data.total;
console.log(JSON.stringify(evidence, null, 2));
