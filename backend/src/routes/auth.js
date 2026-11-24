import express from "express";
import { query, withTransaction } from "../db.js";
import { hashPassword, randomReferral, randomToken, sha256, verifyPassword } from "../lib/crypto.js";
import { ACCOUNT_FIELDS, serializeAccount } from "../lib/account.js";
import { clearSession, loadSession, requireAuth, setSession } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/common.js";
import { requestMeta } from "../lib/audit.js";

const router = express.Router();

function publicAuth(account) {
  const { session, ...safe } = account;
  return safe;
}

router.post("/register", loginRateLimit(), async (req, res, next) => {
  try {
    const { email, password, displayName, username, referralCode, marketingOptIn } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      throw Object.assign(new Error("Enter a valid email address."), { status: 400, code: "invalid_email" });
    }
    if (!password || String(password).length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw Object.assign(new Error("Use at least 8 characters with a letter and a number."), { status: 400, code: "weak_password" });
    }
    const cleanName = String(displayName || "").trim().slice(0, 60);
    if (cleanName.length < 2) throw Object.assign(new Error("Enter your display name."), { status: 400, code: "invalid_name" });
    const baseUsername = String(username || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "player";
    const result = await withTransaction(async (client) => {
      const exists = await client.query("SELECT id FROM accounts WHERE lower(email) = lower($1)", [email]);
      if (exists.rows[0]) throw Object.assign(new Error("An account with this email already exists."), { status: 409, code: "email_taken" });

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
      const startingBalance = 10500;
      const account = await client.query(
        `INSERT INTO accounts (username, email, password_hash, display_name, role_code, parent_id, referred_by, referral_code, balance, avatar_seed, marketing_opt_in)
         VALUES ($1,$2,$3,$4,'player',$5,$6,$7,$8,$9,$10) RETURNING *`,
        [usernameCandidate, String(email).toLowerCase(), hashPassword(password), cleanName, parent, referredBy, referral, startingBalance, randomToken(3), !!marketingOptIn]
      );
      const created = account.rows[0];
      await client.query(
        `INSERT INTO transactions (account_id, type, amount, balance_after, description, reference_type, reference_id)
         VALUES ($1,'welcome_bonus',$2,$3,'Welcome to 19xbet365 — virtual-credit allocation','welcome',$4)`,
        [created.id, startingBalance, startingBalance, created.id]
      );
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link)
         VALUES ($1,'Welcome to 19xbet365',$2,'system','/account')`,
        [created.id, "Your virtual-credit wallet is ready. Explore the sportsbook, casino originals, and responsible-play tools. Virtual credits have no cash value."]
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
    });
    await setSession(res, result.id, req);
    const loaded = await query(
      `SELECT ${ACCOUNT_FIELDS} FROM accounts a JOIN roles r ON r.code = a.role_code WHERE a.id = $1`,
      [result.id]
    );
    res.status(201).json({ user: publicAuth(serializeAccount(loaded.rows[0])) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", loginRateLimit(), async (req, res, next) => {
  const meta = requestMeta(req);
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  try {
    if (!email || !password) throw Object.assign(new Error("Enter your email and password."), { status: 400, code: "missing_credentials" });
    const result = await query(
      `SELECT a.password_hash, a.status, a.id, ${ACCOUNT_FIELDS}
       FROM accounts a JOIN roles r ON r.code = a.role_code
       WHERE lower(a.email) = lower($1) OR lower(a.username) = lower($1)
       LIMIT 1`,
      [email]
    );
    const row = result.rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) {
      req.recordFailedLogin?.();
      await query(
        `INSERT INTO login_history (account_id, email, ip, user_agent, success, reason) VALUES ($1,$2,$3,$4,false,'invalid_credentials')`,
        [row?.id || null, email.slice(0, 120), meta.ip, meta.userAgent]
      );
      throw Object.assign(new Error("Email or password is incorrect."), { status: 401, code: "invalid_credentials" });
    }
    if (row.status !== "active") {
      await query(
        `INSERT INTO login_history (account_id, email, ip, user_agent, success, reason) VALUES ($1,$2,$3,$4,false,$5)`,
        [row.id, email.slice(0, 120), meta.ip, meta.userAgent, `account_${row.status}`]
      );
      throw Object.assign(new Error("This account is not available. Contact support."), { status: 403, code: "account_unavailable" });
    }
    req.clearFailedLogins?.();
    await query("UPDATE accounts SET last_login_at = now(), updated_at = now() WHERE id = $1", [row.id]);
    await query(
      `INSERT INTO login_history (account_id, email, ip, user_agent, success) VALUES ($1,$2,$3,$4,true)`,
      [row.id, email.slice(0, 120), meta.ip, meta.userAgent]
    );
    await setSession(res, row.id, req);
    const fresh = await query(
      `SELECT ${ACCOUNT_FIELDS} FROM accounts a JOIN roles r ON r.code = a.role_code WHERE a.id = $1`,
      [row.id]
    );
    res.json({ user: publicAuth(serializeAccount(fresh.rows[0])) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await clearSession(req, res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res) => {
  if (!req.account) return res.json({ user: null });
  return res.json({ user: publicAuth(req.account) });
});

router.post("/forgot-password", loginRateLimit(), async (req, res, next) => {
  try {
    const email = String(req.body?.email || "");
    if (email) {
      await query(
        `INSERT INTO notifications (account_id, title, body, type)
         SELECT id, 'Password reset requested', 'A password reset was requested for your account. For this demonstration environment, contact support to verify ownership. Your existing password remains active.', 'security'
         FROM accounts WHERE lower(email) = lower($1)`,
        [email]
      );
    }
    res.json({ ok: true, message: "If that email is registered, reset instructions will appear in the account notifications." });
  } catch (error) {
    next(error);
  }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw Object.assign(new Error("Use at least 8 characters with a letter and a number."), { status: 400, code: "weak_password" });
    }
    const row = await query("SELECT password_hash FROM accounts WHERE id = $1", [req.account.id]);
    if (!verifyPassword(String(currentPassword || ""), row.rows[0].password_hash)) {
      throw Object.assign(new Error("Your current password is incorrect."), { status: 401, code: "invalid_password" });
    }
    await query("UPDATE accounts SET password_hash = $1, updated_at = now() WHERE id = $2", [hashPassword(newPassword), req.account.id]);
    await query("UPDATE sessions SET revoked_at = now() WHERE account_id = $1 AND id <> $2", [req.account.id, req.account.session?.id]);
    res.json({ ok: true, message: "Password updated. Other sessions have been signed out." });
  } catch (error) {
    next(error);
  }
});

router.post("/2fa", requireAuth, async (req, res, next) => {
  try {
    const enabled = !!req.body?.enabled;
    await query("UPDATE accounts SET two_factor_enabled = $1, updated_at = now() WHERE id = $2", [enabled, req.account.id]);
    await query(
      `INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'security','/account/security')`,
      [req.account.id, enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled", "This is a demonstration security control; no authenticator is provisioned in the foundation build."]
    );
    res.json({ ok: true, enabled });
  } catch (error) {
    next(error);
  }
});

router.get("/sessions", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, ip, user_agent, created_at, last_seen_at, expires_at, (id = $2) AS current
       FROM sessions WHERE account_id = $1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY last_seen_at DESC`,
      [req.account.id, req.account.session?.id || null]
    );
    res.json({ sessions: result.rows });
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions/:id", requireAuth, async (req, res, next) => {
  try {
    await query("UPDATE sessions SET revoked_at = now() WHERE id = $1 AND account_id = $2", [req.params.id, req.account.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const displayName = String(req.body?.displayName || req.account.displayName).trim().slice(0, 60);
    const country = String(req.body?.country || req.account.country).trim().slice(0, 40);
    const phone = req.body?.phone == null ? req.account.phone : String(req.body.phone).trim().slice(0, 30);
    if (displayName.length < 2) throw Object.assign(new Error("Display name is too short."), { status: 400, code: "invalid_name" });
    await query(
      "UPDATE accounts SET display_name = $1, country = $2, phone = $3, marketing_opt_in = $4, updated_at = now() WHERE id = $5",
      [displayName, country, phone || null, !!req.body?.marketingOptIn, req.account.id]
    );
    const fresh = await query(`SELECT ${ACCOUNT_FIELDS} FROM accounts a JOIN roles r ON r.code = a.role_code WHERE a.id = $1`, [req.account.id]);
    res.json({ user: publicAuth(serializeAccount(fresh.rows[0])) });
  } catch (error) {
    next(error);
  }
});

export default router;
