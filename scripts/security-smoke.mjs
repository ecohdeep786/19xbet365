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
async function login(email, expected = 200, password = "19X#2026") {
  cookie = "";
  return req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, expected);
}
const evidence = {};
evidence.anonymousAdmin = (await req("/api/admin/overview", {}, 401)).data.message;
evidence.anonymousBet = (await req("/api/bets", { method: "POST", body: JSON.stringify({ selections: [], stake: 10 }) }, 401)).data.message;
evidence.anonymousDeposits = (await req("/api/deposits/config", {}, 401)).data.message;
await login("player@19xbet365.test");
evidence.playerAdmin = (await req("/api/admin/overview", {}, 403)).data.message;
evidence.playerDepositAdmin = (await req("/api/admin/deposits", {}, 403)).data.message;
evidence.playerVerification = (await req("/api/verification")).data.verification.status;
evidence.playerWithdrawalConfig = Boolean((await req("/api/withdrawals/config")).data.config);
evidence.playerComplianceDenied = (await req("/api/admin/compliance/kyc", {}, 403)).data.message;
evidence.unknownGame = (await req("/api/games/not-a-real-game/play", { method: "POST", body: JSON.stringify({ stake: 10 }) }, 404)).data.message;
evidence.invalidStake = (await req("/api/games/astra-roulette-live/play", { method: "POST", body: JSON.stringify({ stake: 1 }) }, 400)).data.message;
await login("admin@19xbet365.test");
evidence.realMoneyLock = (await req("/api/admin/settings/realMoneyEnabled", { method: "PATCH", body: JSON.stringify({ value: true }) }, 403)).data.message;
await login("luca.moretti@19xbet365.test");
const scoped = await req("/api/admin/accounts?limit=100");
evidence.agentScope = { count: scoped.data.total, roles: [...new Set(scoped.data.accounts.map((account) => account.role))], includesMaster: scoped.data.accounts.some((account) => account.role === "master_admin"), includesOtherAdmin: scoped.data.accounts.some((account) => account.role === "admin") };
const overview = await req("/api/admin/overview");
evidence.agentOverview = { global: overview.data.scope.global, accountCount: overview.data.scope.accountCount, roles: overview.data.roleCounts };
evidence.agentRolesDenied = (await req("/api/admin/roles", {}, 403)).data.message;
evidence.agentTransfersDenied = (await req("/api/admin/transfers", {}, 403)).data.message;
evidence.agentDepositsDenied = (await req("/api/admin/deposits", {}, 403)).data.message;
await login("admin.mercer@19xbet365.test");
evidence.adminStaffIssueDenied = (await req("/api/admin/staff", {
  method: "POST",
  body: JSON.stringify({ email: "blocked.staff@19xbet365.test", displayName: "Blocked Staff", role: "admin" })
}, 403)).data.message;
evidence.adminFantasyContests = (await req("/api/admin/fantasy/contests")).data.contests.length >= 0;
evidence.adminComplianceDenied = (await req("/api/admin/compliance/kyc", {}, 403)).data.message;
evidence.adminRevenue = (await req("/api/admin/revenue")).data.scope;
await login("sofia.lind@example.com", 403);
evidence.suspendedLogin = "rejected";
await login("admin@19xbet365.test");
evidence.masterDepositQueue = (await req("/api/admin/deposits", {}, 200)).data.deposits.length >= 0;
evidence.auditCount = (await req("/api/admin/audit?limit=5")).data.total;

const newAdminEmail = `access.${Date.now()}@19xbet365.test`;
const created = await req("/api/admin/staff", {
  method: "POST",
  body: JSON.stringify({ email: newAdminEmail, displayName: "Access QA", role: "admin" })
}, 201);
evidence.masterIssuedCredentials = Boolean(created.data.credentials?.temporaryPassword);
await login(newAdminEmail, 200, created.data.credentials.temporaryPassword);
evidence.newAdminAccounts = (await req("/api/admin/accounts?limit=5", {}, 200)).data.total >= 0;
evidence.newAdminGames = (await req("/api/admin/games", {}, 200)).data.games.length > 0;
evidence.newAdminFantasy = (await req("/api/admin/fantasy/contests", {}, 200)).data.contests.length >= 0;
evidence.newAdminComplianceDenied = (await req("/api/admin/compliance/kyc", {}, 403)).data.message;
evidence.newAdminSettingsDenied = (await req("/api/admin/settings", {}, 403)).data.message;
evidence.newAdminRolesDenied = (await req("/api/admin/roles", {}, 403)).data.message;
evidence.newAdminStaffDenied = (await req("/api/admin/staff", {
  method: "POST",
  body: JSON.stringify({ email: `nested.${Date.now()}@19xbet365.test`, displayName: "Nested Admin", role: "admin" })
}, 403)).data.message;

console.log(JSON.stringify(evidence, null, 2));
