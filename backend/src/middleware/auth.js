import { query } from "../db.js";
import { ACCOUNT_FIELDS, serializeAccount } from "../lib/account.js";
import { randomToken, sha256 } from "../lib/crypto.js";

const COOKIE_NAME = "xbet_session";
const SESSION_DAYS = 7;

export { COOKIE_NAME, SESSION_DAYS };

export async function setSession(res, accountId, req) {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
  const ua = String(req.headers["user-agent"] || "").slice(0, 300);
  await query(
    `INSERT INTO sessions (account_id, token_hash, ip, user_agent, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [accountId, tokenHash, ip, ua, expiresAt]
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/"
  });
  return { expiresAt };
}

export async function clearSession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    await query("UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [sha256(token)]);
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function loadSession(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== "string" || token.length < 32) return null;
  const result = await query(
    `SELECT ${ACCOUNT_FIELDS}, s.id AS session_id, s.expires_at, s.ip AS session_ip, s.user_agent AS session_user_agent, s.last_seen_at
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     JOIN roles r ON r.code = a.role_code
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
     LIMIT 1`,
    [sha256(token)]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.status !== "active") return { account: null, blocked: row.status };
  const account = serializeAccount(row);
  account.session = {
    id: row.session_id,
    expiresAt: row.expires_at,
    ip: row.session_ip,
    userAgent: row.session_user_agent,
    lastSeenAt: row.last_seen_at
  };
  query("UPDATE sessions SET last_seen_at = now() WHERE id = $1", [row.session_id]).catch(() => {});
  return { account };
}

export async function requireAuth(req, res, next) {
  if (!req.account) return res.status(401).json({ error: "authentication_required", message: "Sign in to continue." });
  return next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.account) return res.status(401).json({ error: "authentication_required", message: "Sign in to continue." });
    if (req.account.role === "master_admin") return next();
    if (!req.account.permissions.includes(permission)) {
      return res.status(403).json({ error: "permission_denied", message: "Your role does not include this action." });
    }
    return next();
  };
}

export function requireStaff(req, res, next) {
  if (!req.account) return res.status(401).json({ error: "authentication_required", message: "Sign in to the control room." });
  if (!["master_admin", "admin", "sub_admin", "agent"].includes(req.account.role)) {
    return res.status(403).json({ error: "staff_required", message: "This area is limited to authorized staff." });
  }
  return next();
}

export function requireMaster(req, res, next) {
  if (!req.account) return res.status(401).json({ error: "authentication_required", message: "Sign in to the control room." });
  if (req.account.role !== "master_admin") {
    return res.status(403).json({ error: "master_admin_required", message: "Master Admin authorization is required." });
  }
  return next();
}
