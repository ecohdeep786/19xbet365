const base = "http://127.0.0.1:4000";
let cookie = "";
async function req(path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  for (const item of res.headers.getSetCookie?.() || []) cookie = item.split(";")[0];
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`);
  return data;
}

async function login(email, password) {
  await req("/api/auth/logout", { method: "POST" }).catch(() => {});
  const data = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return data.user;
}

try {
  const player = await login("player@19xbet365.test", "19X#2026");
  const config = await req("/api/deposits/config");
  const before = Number(player.balance);
  const amount = 1000;
  const created = await req("/api/deposits", {
    method: "POST",
    body: JSON.stringify({ amount, reference: `QA-UTR-${Date.now()}`, note: "Deposit smoke test" })
  });

  await login("admin@19xbet365.test", "19X#2026");
  const queue = await req("/api/admin/deposits?status=pending");
  const request = queue.deposits.find((item) => item.id === created.deposit.id);
  if (!request) throw new Error("Deposit request did not reach the admin queue.");
  const approved = await req(`/api/admin/deposits/${request.id}/approve`, { method: "POST", body: JSON.stringify({ note: "Verified in smoke test" }) });

  await login("player@19xbet365.test", "19X#2026");
  const overview = await req("/api/player/overview");
  const transactions = await req("/api/player/transactions?limit=5");
  const expectedBonus = 150;
  const expectedBalance = before + amount + expectedBonus;
  const checks = {
    sandboxMode: config.mode === "sandbox",
    requestPending: created.deposit.status === "pending",
    bonusPreviewCorrect: created.bonusPreview.amount === expectedBonus,
    adminApproved: approved.deposit.status === "approved",
    bonusCredited: Number(approved.bonus.amount) === expectedBonus,
    balanceCorrect: Math.abs(Number(overview.user.balance) - expectedBalance) < 0.01,
    depositLedger: transactions.transactions.some((item) => item.type === "deposit" && Number(item.amount) === amount),
    bonusLedger: transactions.transactions.some((item) => item.type === "deposit_bonus" && Number(item.amount) === expectedBonus)
  };
  const second = await req("/api/deposits", {
    method: "POST",
    body: JSON.stringify({ amount: 200, reference: `QA-CANCEL-${Date.now()}` })
  });
  const cancelled = await req(`/api/deposits/${second.deposit.id}/cancel`, { method: "POST" });
  checks.cancelWorks = cancelled.deposit.status === "cancelled";

  const third = await req("/api/deposits", {
    method: "POST",
    body: JSON.stringify({ amount: 300, reference: `QA-REJECT-${Date.now()}` })
  });
  await login("admin@19xbet365.test", "19X#2026");
  const rejected = await req(`/api/admin/deposits/${third.deposit.id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: "Reference not found in smoke test." })
  });
  checks.rejectWorks = rejected.deposit.status === "rejected";

  await req("/api/admin/settings/depositMode", { method: "PATCH", body: JSON.stringify({ value: "manual_review" }) });
  await login("player@19xbet365.test", "19X#2026");
  const gateResponse = await fetch(`${base}/api/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ amount: 100, reference: `QA-GATE-${Date.now()}` })
  });
  const gateBody = await gateResponse.json().catch(() => ({}));
  checks.liveGateBlocksCollection = gateResponse.status === 403 && gateBody.error === "payments_not_activated";
  await login("admin@19xbet365.test", "19X#2026");
  await req("/api/admin/settings/depositMode", { method: "PATCH", body: JSON.stringify({ value: "sandbox" }) });

  console.log(JSON.stringify({ mode: config.mode, before, expectedBalance, finalBalance: overview.user.balance, bonus: approved.bonus, checks, pass: Object.values(checks).every(Boolean) }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
