import { ACCOUNT_FIELDS, serializeAccount } from "../lib/account.js";
import { hashPassword, randomReferral, randomToken } from "../lib/crypto.js";

/**
 * Create a player account and the associated welcome ledger/notification rows.
 * The caller owns the transaction, session creation and any audit event.
 * `password` is optional because Firebase-only accounts cannot use password login.
 */
export async function createPlayerAccount(client, {
  email,
  password = null,
  displayName,
  username,
  referralCode,
  marketingOptIn = false,
  firebaseUid = null,
  authProvider = "password",
  emailVerified = true
}) {
  const emailLower = String(email || "").trim().toLowerCase();
  if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    throw Object.assign(new Error("Enter a valid email address."), { status: 400, code: "invalid_email" });
  }
  const exists = await client.query("SELECT id FROM accounts WHERE lower(email) = lower($1)", [emailLower]);
  if (exists.rows[0]) throw Object.assign(new Error("An account with this email already exists."), { status: 409, code: "email_taken" });

  const cleanName = String(displayName || emailLower.split("@")[0] || "Player").trim().slice(0, 60) || "Player";
  const baseUsername = String(username || emailLower.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "player";

  let parent = null;
  let referredBy = null;
  if (referralCode) {
    const referrer = await client.query(
      "SELECT id, role_code, parent_id FROM accounts WHERE upper(referral_code) = upper($1) AND status = 'active'",
      [String(referralCode).trim()]
    );
    if (!referrer.rows[0]) throw Object.assign(new Error("That referral code was not found."), { status: 400, code: "invalid_referral" });
    const ref = referrer.rows[0];
    referredBy = ref.id;
    parent = ["master_admin", "admin", "sub_admin", "agent"].includes(ref.role_code) ? ref.id : ref.parent_id;
  }
  if (!parent) {
    const master = await client.query("SELECT id FROM accounts WHERE role_code = 'master_admin' ORDER BY created_at LIMIT 1");
    parent = master.rows[0]?.id || null;
  }

  let usernameCandidate = baseUsername;
  let suffix = 1;
  while ((await client.query("SELECT 1 FROM accounts WHERE lower(username) = lower($1)", [usernameCandidate])).rows[0]) {
    usernameCandidate = `${baseUsername}${suffix}`;
    suffix += 1;
  }
  let referral = randomReferral();
  while ((await client.query("SELECT 1 FROM accounts WHERE referral_code = $1", [referral])).rows[0]) referral = randomReferral();

  const passwordHash = password ? hashPassword(password) : hashPassword(randomToken(32));
  const startingBalance = 10500;
  const account = await client.query(
    `INSERT INTO accounts (username, email, password_hash, display_name, role_code, parent_id, referred_by, referral_code, balance, avatar_seed, marketing_opt_in, firebase_uid, auth_provider, email_verified)
     VALUES ($1,$2,$3,$4,'player',$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [usernameCandidate, emailLower, passwordHash, cleanName, parent, referredBy, referral, startingBalance, randomToken(3), !!marketingOptIn, firebaseUid, authProvider, !!emailVerified]
  );
  const created = account.rows[0];
  await client.query(
    `INSERT INTO transactions (account_id, type, amount, balance_after, description, reference_type, reference_id)
     VALUES ($1,'welcome_bonus',$2,$3,'Welcome to 19xbet365 — coin allocation','welcome',$4)`,
    [created.id, startingBalance, startingBalance, created.id]
  );
  await client.query(
    `INSERT INTO notifications (account_id, title, body, type, link)
     VALUES ($1,'Welcome to 19xbet365',$2,'system','/account')`,
    [created.id, "Your coin wallet is ready. Explore the sportsbook, casino originals, and responsible-play tools. Coins have no cash value."]
  );
  await client.query(
    `INSERT INTO responsible_limits (account_id, reality_check_minutes) VALUES ($1, 60) ON CONFLICT DO NOTHING`,
    [created.id]
  );
  if (referredBy) {
    await client.query(
      `INSERT INTO referrals (referrer_id, referee_id, code, status) VALUES ($1,$2,$3,'pending')`,
      [referredBy, created.id, String(referralCode).trim().toUpperCase()]
    );
  }
  const full = await client.query(
    `SELECT ${ACCOUNT_FIELDS} FROM accounts a JOIN roles r ON r.code = a.role_code WHERE a.id = $1`,
    [created.id]
  );
  return serializeAccount(full.rows[0]);
}
