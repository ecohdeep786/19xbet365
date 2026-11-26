import express from "express";
import { query, withTransaction } from "../db.js";
import { hashPassword, verifyPassword } from "../lib/crypto.js";
import { ACCOUNT_FIELDS, serializeAccount } from "../lib/account.js";
import { clearSession, loadSession, requireAuth, setSession } from "../middleware/auth.js";
import { loginRateLimit, rateLimit } from "../middleware/common.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import { createPlayerAccount } from "../services/playerAccount.js";
import { verifyFirebaseIdToken } from "../services/firebase.js";

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
    const user = await withTransaction(async (client) => createPlayerAccount(client, {
      email,
      password,
      displayName: cleanName,
      username,
      referralCode,
      marketingOptIn
    }));
    await setSession(res, user.id, req);
    res.status(201).json({ user: publicAuth(user) });
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

router.post("/firebase", rateLimit({
  windowMs: 60_000,
  max: 60,
  message: "Too many secure sign-in attempts. Wait a minute and try again."
}), async (req, res, next) => {
  const meta = requestMeta(req);
  try {
    const idToken = String(req.body?.idToken || "");
    const decoded = await verifyFirebaseIdToken(idToken);
    const email = String(decoded.email || "").trim().toLowerCase();
    if (!email) {
      throw Object.assign(new Error("Firebase sign-in must include a verified email address."), { status: 400, code: "firebase_email_required" });
    }
    const verified = decoded.email_verified === true;

    const result = await withTransaction(async (client) => {
      let row = (await client.query(
        `SELECT ${ACCOUNT_FIELDS}, a.firebase_uid
         FROM accounts a JOIN roles r ON r.code = a.role_code
         WHERE a.firebase_uid = $1
         LIMIT 1`,
        [decoded.uid]
      )).rows[0];
      let isNew = false;

      if (!row) {
        row = (await client.query(
          `SELECT ${ACCOUNT_FIELDS}, a.firebase_uid
           FROM accounts a JOIN roles r ON r.code = a.role_code
           WHERE lower(a.email) = lower($1)
           LIMIT 1`,
          [email]
        )).rows[0];

        if (row) {
          if (row.status !== "active") {
            throw Object.assign(new Error("This account is not available. Contact support."), { status: 403, code: "account_unavailable" });
          }
          if (row.firebase_uid && row.firebase_uid !== decoded.uid) {
            throw Object.assign(new Error("This email is already linked to a different secure identity."), { status: 409, code: "firebase_identity_mismatch" });
          }
          if (row.role_code !== "player") {
            throw Object.assign(new Error("Staff accounts must sign in with their issued password or ask Master Admin to link the identity."), { status: 403, code: "staff_firebase_link_forbidden" });
          }
          if (!verified) {
            throw Object.assign(new Error("Verify your Firebase email before linking it to an existing 19xbet365 account."), { status: 403, code: "email_verification_required" });
          }
          await client.query(
            "UPDATE accounts SET firebase_uid = $1, email_verified = true, updated_at = now() WHERE id = $2",
            [decoded.uid, row.id]
          );
          await appendAudit(client, {
            actorId: row.id,
            action: "auth.firebase_linked",
            entityType: "account",
            entityId: row.id,
            summary: "Firebase secure sign-in linked to an existing player account",
            after: { provider: decoded.firebase?.sign_in_provider || "firebase", emailVerified: true },
            ip: meta.ip
          });
        } else {
          const created = await createPlayerAccount(client, {
            email,
            displayName: decoded.name || req.body?.displayName,
            referralCode: req.body?.referralCode,
            marketingOptIn: req.body?.marketingOptIn,
            firebaseUid: decoded.uid,
            authProvider: "firebase",
            emailVerified: verified
          });
          await appendAudit(client, {
            actorId: created.id,
            action: "auth.firebase_registered",
            entityType: "account",
            entityId: created.id,
            summary: "New player registered with Firebase Authentication",
            after: { provider: decoded.firebase?.sign_in_provider || "firebase", emailVerified: verified },
            ip: meta.ip
          });
          await client.query(
            `INSERT INTO login_history (account_id, email, ip, user_agent, success) VALUES ($1,$2,$3,$4,true)`,
            [created.id, email.slice(0, 120), meta.ip, meta.userAgent]
          );
          return { user: created, isNew: true };
        }
      } else if (row.status !== "active") {
        throw Object.assign(new Error("This account is not available. Contact support."), { status: 403, code: "account_unavailable" });
      } else if (String(row.email).toLowerCase() !== email) {
        throw Object.assign(new Error("The email on this secure identity no longer matches the account. Contact support."), { status: 409, code: "firebase_email_changed" });
      }

      await client.query(
        `UPDATE accounts
         SET last_login_at = now(), updated_at = now(), email_verified = email_verified OR $1
         WHERE id = $2`,
        [verified, row.id]
      );
      await client.query(
        `INSERT INTO login_history (account_id, email, ip, user_agent, success) VALUES ($1,$2,$3,$4,true)`,
        [row.id, email.slice(0, 120), meta.ip, meta.userAgent]
      );
      const fresh = await client.query(
        `SELECT ${ACCOUNT_FIELDS} FROM accounts a JOIN roles r ON r.code = a.role_code WHERE a.id = $1`,
        [row.id]
      );
      return { user: serializeAccount(fresh.rows[0]), isNew };
    });

    await setSession(res, result.user.id, req);
    res.status(result.isNew ? 201 : 200).json({
      user: publicAuth(result.user),
      isNew: result.isNew,
      emailVerified: result.user.emailVerified
    });
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
    const row = await query("SELECT password_hash, auth_provider, firebase_uid FROM accounts WHERE id = $1", [req.account.id]);
    if (row.rows[0].auth_provider === "firebase" && row.rows[0].firebase_uid) {
      throw Object.assign(new Error("This account uses Firebase secure sign-in. Use Forgot password to reset it."), { status: 400, code: "firebase_password_managed" });
    }
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
