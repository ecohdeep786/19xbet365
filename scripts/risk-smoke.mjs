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
try {
  await login("admin@19xbet365.test");
  const revenue = await req("/api/admin/revenue");
  evidence.masterRevenue = {
    grossGamingRevenue: revenue.data.summary.grossGamingRevenue,
    openExposure: revenue.data.summary.openExposure,
    byGameRows: revenue.data.byGame.length,
    seriesRows: revenue.data.series.length
  };

  await req("/api/admin/settings/maxSportsStake", { method: "PATCH", body: JSON.stringify({ value: 4000 }) });
  const matches = await req("/api/matches");
  const match = matches.data.matches.find((item) => item.status !== "finished");
  if (!match) throw new Error("No open fixture available for the stake-limit test.");
  const overStake = await req("/api/bets", {
    method: "POST",
    body: JSON.stringify({ stake: 4100, selections: [{ matchId: match.id, selection: "home" }] })
  }, 400);
  evidence.maxSportsStake = overStake.data.message;
  await req("/api/admin/settings/maxSportsStake", { method: "PATCH", body: JSON.stringify({ value: 5000 }) });

  await req("/api/admin/settings/maxSportsPayout", { method: "PATCH", body: JSON.stringify({ value: 100 }) });
  const overPayout = await req("/api/bets", {
    method: "POST",
    body: JSON.stringify({ stake: 100, selections: [{ matchId: match.id, selection: "home" }] })
  }, 400);
  evidence.maxSportsPayout = overPayout.data.message;
  await req("/api/admin/settings/maxSportsPayout", { method: "PATCH", body: JSON.stringify({ value: 50000 }) });

  await login("admin.mercer@19xbet365.test");
  evidence.adminRevenue = (await req("/api/admin/revenue")).data.scope;
  evidence.adminSettingsDenied = (await req("/api/admin/settings", {}, 403)).data.message;

  await login("player@19xbet365.test");
  evidence.playerRevenueDenied = (await req("/api/admin/revenue", {}, 403)).data.message;

  evidence.pass = true;
} catch (error) {
  evidence.pass = false;
  evidence.error = String(error);
} finally {
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.pass) process.exitCode = 1;
}
