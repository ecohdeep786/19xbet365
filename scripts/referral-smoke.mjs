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
const register = await req("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({
    email: "referral.qa@example.com",
    password: "19XTest#2026",
    displayName: "Referral QA",
    referralCode: process.argv[2]
  })
});
const before = register.user.balance;
const play = await req("/api/games/dice-roll/play", { method: "POST", body: JSON.stringify({ stake: 10, params: { target: 50, direction: "over" } }) });
const after = play.balance;
const referral = await req("/api/player/referrals");
console.log(JSON.stringify({ before, after, expectedReferralReward: 1000, referrals: referral.referrals, status: referral.referrals[0]?.status }, null, 2));
