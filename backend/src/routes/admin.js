import crypto from "node:crypto";
import express from "express";
import { health, query, withTransaction } from "../db.js";
import { requirePermission, requireStaff, requireMaster } from "../middleware/auth.js";
import { appendAudit, requestMeta, verifyAuditChain } from "../lib/audit.js";
import { getScopedAccountIds } from "../lib/scope.js";
import { ACCOUNT_FIELDS, serializeAccount } from "../lib/account.js";
import { hashPassword, randomReferral, randomToken, sha256 } from "../lib/crypto.js";
import { broadcast } from "../ws.js";
import { round2 } from "../services/gameEngine.js";

const router = express.Router();
router.use(requireStaff);

const PERMISSIONS = [
  "network.view.global", "network.view.scope", "network.manage",
  "accounts.create.admin", "accounts.create.subadmin", "accounts.create.agent", "accounts.create.player",
  "accounts.suspend", "accounts.restore", "credits.adjust", "games.view", "games.manage",
  "content.manage", "promotions.manage", "support.view", "support.manage",
  "security.view", "audit.view.global", "audit.view.scope", "settings.manage",
  "roles.manage", "transfers.approve", "reports.view.global", "reports.view.scope",
  "notifications.broadcast", "system.view"
];

const STAFF_ROLE_RANK = { master_admin: 0, admin: 1, sub_admin: 2, agent: 3, player: 4 };

function allowedInviteRoles(actor) {
  if (actor.role === "master_admin") return ["admin", "sub_admin", "agent", "player"];
  if (actor.role === "admin") return ["sub_admin", "agent", "player"];
  if (actor.role === "sub_admin") return ["agent", "player"];
  if (actor.role === "agent") return ["player"];
  return [];
}

async function scoped(req) {
  return getScopedAccountIds(req.account);
}

function inScope(scope, id) {
  return scope === null || scope.includes(id);
}

async function loadTarget(client, id) {
  const result = await client.query(
    `SELECT ${ACCOUNT_FIELDS} FROM accounts a JOIN roles r ON r.code = a.role_code WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function requireTarget(req, client, permission) {
  const target = await loadTarget(client, req.params.id);
  if (!target) throw Object.assign(new Error("Account not found."), { status: 404, code: "not_found" });
  const scope = await getScopedAccountIds(req.account, client);
  if (!inScope(scope, target.id)) throw Object.assign(new Error("This account is outside your authorized network."), { status: 403, code: "out_of_scope" });
  return target;
}

// Overview --------------------------------------------------------------------
router.get("/overview", requirePermission("reports.view.scope"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const ids = scope;
    const accountFilter = ids === null ? "" : "AND a.id = ANY($1::uuid[])";
    const param = ids === null ? [] : [ids];
    const [
      accounts, roleCounts, wagering, tickets, failedLogins, recentAudit,
      dailySeries, alerts, routeCount, auditChain
    ] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE a.status='active') AS active,
                COUNT(*) FILTER (WHERE a.status='suspended') AS suspended,
                COUNT(*) FILTER (WHERE a.created_at > now() - interval '7 days') AS new_week,
                COALESCE(SUM(a.balance),0) AS total_balance
         FROM accounts a WHERE 1=1 ${accountFilter}`,
        param
      ),
      query(`SELECT a.role_code, COUNT(*) AS count FROM accounts a WHERE 1=1 ${accountFilter} GROUP BY a.role_code ORDER BY count DESC`, param),
      query(
        `SELECT COALESCE(SUM(CASE WHEN gr.status='settled' THEN gr.bet END),0) AS game_wagered,
                COALESCE(SUM(CASE WHEN gr.status='settled' THEN gr.payout END),0) AS game_paid,
                COUNT(*) FILTER (WHERE gr.created_at::date = CURRENT_DATE) AS rounds_today
         FROM game_rounds gr JOIN accounts a ON a.id = gr.account_id WHERE 1=1 ${accountFilter}`,
        param
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE t.status IN ('open','pending')) AS open_tickets,
                COUNT(*) FILTER (WHERE t.priority IN ('high','urgent') AND t.status <> 'closed') AS urgent_tickets
         FROM support_tickets t JOIN accounts a ON a.id = t.account_id WHERE 1=1 ${accountFilter}`,
        param
      ),
      query(
        `SELECT COUNT(*) AS failed FROM login_history l JOIN accounts a ON a.id = l.account_id
         WHERE l.success = false AND l.created_at > now() - interval '24 hours' ${accountFilter}`,
        param
      ),
      query(
        `SELECT e.id, e.action, e.entity_type, e.entity_id, e.summary, e.created_at, e.event_hash, e.actor_id,
                ac.display_name AS actor_name, ac.role_code AS actor_role
         FROM audit_events e LEFT JOIN accounts ac ON ac.id = e.actor_id
         WHERE 1=1 ${ids === null ? "" : "AND (e.actor_id = ANY($1::uuid[]) OR e.entity_id = ANY($2::text[]))"}
         ORDER BY e.created_at DESC LIMIT 10`,
        ids === null ? [] : [ids, ids.map(String)]
      ),
      query(
        `SELECT d.day,
           (SELECT COUNT(*) FROM accounts a WHERE date_trunc('day', a.created_at) = d.day ${ids === null ? "" : "AND a.id = ANY($1::uuid[])"}) AS signups,
           (SELECT COALESCE(SUM(gr.bet),0) FROM game_rounds gr JOIN accounts a ON a.id=gr.account_id WHERE date_trunc('day', gr.created_at)=d.day ${ids === null ? "" : "AND a.id = ANY($1::uuid[])"}) AS wagered,
           (SELECT COALESCE(SUM(gr.payout),0) FROM game_rounds gr JOIN accounts a ON a.id=gr.account_id WHERE date_trunc('day', gr.created_at)=d.day ${ids === null ? "" : "AND a.id = ANY($1::uuid[])"}) AS paid
         FROM generate_series(date_trunc('day', now()) - interval '6 days', date_trunc('day', now()), interval '1 day') d(day)
         ORDER BY d.day`,
        ids === null ? [] : [ids]
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM accounts a WHERE a.status='suspended' ${accountFilter}) AS suspended,
           (SELECT COUNT(*) FROM login_history l JOIN accounts a ON a.id=l.account_id WHERE l.success=false AND l.created_at > now()-interval '24 hours' ${accountFilter}) AS failed_logins,
           (SELECT COUNT(*) FROM transactions t JOIN accounts a ON a.id=t.account_id WHERE t.type IN ('admin_credit','admin_debit') AND t.created_at > now()-interval '24 hours' ${accountFilter}) AS credit_actions,
           (SELECT COUNT(*) FROM account_transfers tr JOIN accounts a ON a.id=tr.account_id WHERE tr.status='pending' ${accountFilter}) AS transfers`,
        param
      ),
      query("SELECT COUNT(*) AS routes FROM matches WHERE status <> 'finished'"),
      query("SELECT event_hash, prev_hash FROM audit_events ORDER BY id DESC LIMIT 1")
    ]);
    const wagered = Number(wagering.rows[0].game_wagered);
    const paid = Number(wagering.rows[0].game_paid);
    res.json({
      scope: {
        global: ids === null,
        accountCount: ids === null ? null : ids.length,
        label: ids === null ? "Entire platform network" : `${req.account.displayName}'s authorized network`
      },
      metrics: {
        accounts: Number(accounts.rows[0].total),
        activeAccounts: Number(accounts.rows[0].active),
        suspendedAccounts: Number(accounts.rows[0].suspended),
        newThisWeek: Number(accounts.rows[0].new_week),
        virtualBalance: Number(accounts.rows[0].total_balance),
        gameWagered: wagered,
        gamePaid: paid,
        margin: round2(wagered - paid),
        roundsToday: Number(wagering.rows[0].rounds_today),
        openTickets: Number(tickets.rows[0].open_tickets),
        urgentTickets: Number(tickets.rows[0].urgent_tickets),
        failedLogins: Number(failedLogins.rows[0].failed),
        openRoutes: Number(routeCount.rows[0].routes)
      },
      roleCounts: roleCounts.rows.map((row) => ({ role: row.role_code, count: Number(row.count) })),
      series: dailySeries.rows.map((row) => ({
        day: row.day,
        signups: Number(row.signups),
        wagered: Number(row.wagered),
        paid: Number(row.paid)
      })),
      alerts: {
        suspended: Number(alerts.rows[0].suspended),
        failedLogins: Number(alerts.rows[0].failed_logins),
        creditActions: Number(alerts.rows[0].credit_actions),
        pendingTransfers: Number(alerts.rows[0].transfers)
      },
      recentAudit: recentAudit.rows,
      auditChainTip: auditChain.rows[0] || null,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Network --------------------------------------------------------------------
router.get("/network", requirePermission("reports.view.scope"), async (req, res, next) => {
  try {
    const actor = req.account;
    const isMaster = actor.role === "master_admin";
    const result = isMaster
      ? await query(
          `SELECT a.id, a.username, a.email, a.display_name, a.role_code, a.parent_id, a.status, a.balance,
                  a.referral_code, a.referred_by, a.created_at, a.last_login_at, a.avatar_seed,
                  r.name AS role_name, r.rank AS role_rank
           FROM accounts a JOIN roles r ON r.code = a.role_code
           ORDER BY r.rank ASC, a.created_at ASC`
        )
      : await query(
          `WITH RECURSIVE tree AS (
             SELECT id FROM accounts WHERE id = $1
             UNION ALL SELECT a.id FROM accounts a JOIN tree t ON a.parent_id = t.id
           )
           SELECT a.id, a.username, a.email, a.display_name, a.role_code, a.parent_id, a.status, a.balance,
                  a.referral_code, a.referred_by, a.created_at, a.last_login_at, a.avatar_seed,
                  r.name AS role_name, r.rank AS role_rank
           FROM accounts a JOIN roles r ON r.code = a.role_code
           WHERE a.id IN (SELECT id FROM tree)
           ORDER BY r.rank ASC, a.created_at ASC`,
          [actor.id]
        );
    const rows = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      role: row.role_code,
      roleName: row.role_name,
      roleRank: Number(row.role_rank),
      parentId: row.parent_id,
      status: row.status,
      balance: Number(row.balance),
      referralCode: row.referral_code,
      referredBy: row.referred_by,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      avatarSeed: row.avatar_seed,
      children: []
    }));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const roots = [];
    rows.forEach((row) => {
      if (row.parentId && byId.has(row.parentId)) byId.get(row.parentId).children.push(row);
      else roots.push(row);
    });
    const summary = rows.reduce((acc, row) => {
      acc.total += 1;
      acc.roles[row.role] = (acc.roles[row.role] || 0) + 1;
      acc.balance += row.balance;
      if (row.status === "suspended") acc.suspended += 1;
      return acc;
    }, { total: 0, balance: 0, suspended: 0, roles: {} });
    res.json({
      roots,
      summary: { ...summary, balance: round2(summary.balance) },
      scope: { global: isMaster, label: isMaster ? "Global hierarchy" : `${actor.displayName}'s delegated network` },
      maxDepth: 4
    });
  } catch (error) {
    next(error);
  }
});

// Accounts -------------------------------------------------------------------
router.get("/accounts", requirePermission("network.view.scope"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));
    const conditions = [];
    const params = [];
    if (scope !== null) { params.push(scope); conditions.push(`a.id = ANY($${params.length}::uuid[])`); }
    if (req.query.role && req.query.role !== "all") { params.push(req.query.role); conditions.push(`a.role_code = $${params.length}`); }
    if (req.query.status && req.query.status !== "all") { params.push(req.query.status); conditions.push(`a.status = $${params.length}`); }
    if (req.query.query) {
      params.push(`%${String(req.query.query).slice(0, 80)}%`);
      conditions.push(`(a.display_name ILIKE $${params.length} OR a.email ILIKE $${params.length} OR a.username ILIKE $${params.length} OR a.referral_code ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await query(`SELECT COUNT(*) FROM accounts a ${where}`, params);
    params.push(limit);
    params.push((page - 1) * limit);
    const result = await query(
      `SELECT ${ACCOUNT_FIELDS}, p.display_name AS parent_name,
        (SELECT COUNT(*) FROM accounts c WHERE c.parent_id = a.id) AS direct_count,
        (SELECT COUNT(*) FROM bets b WHERE b.account_id = a.id) AS bet_count,
        (SELECT COUNT(*) FROM game_rounds gr WHERE gr.account_id = a.id) AS round_count,
        EXISTS(SELECT 1 FROM account_invitations ai WHERE lower(ai.email) = lower(a.email) AND ai.status = 'pending') AS invited_pending
       FROM accounts a JOIN roles r ON r.code = a.role_code
       LEFT JOIN accounts p ON p.id = a.parent_id
       ${where}
       ORDER BY r.rank ASC, a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({
      accounts: result.rows.map((row) => ({
        ...serializeAccount(row),
        parentName: row.parent_name,
        directCount: Number(row.direct_count),
        betCount: Number(row.bet_count),
        roundCount: Number(row.round_count),
        invitedPending: row.invited_pending,
        rank: row.role_rank
      })),
      total: Number(count.rows[0].count),
      page,
      pages: Math.max(1, Math.ceil(Number(count.rows[0].count) / limit))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts/:id/suspend", requirePermission("accounts.suspend"), async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (reason.length < 8) throw Object.assign(new Error("Add a reason of at least 8 characters."), { status: 400, code: "reason_required" });
    if (req.params.id === req.account.id) throw Object.assign(new Error("You cannot suspend your own account."), { status: 400, code: "self_action" });
    const result = await withTransaction(async (client) => {
      const target = await requireTarget(req, client, "accounts.suspend");
      if (target.role_code === "master_admin") throw Object.assign(new Error("A Master Admin cannot be suspended."), { status: 403, code: "protected_account" });
      if (STAFF_ROLE_RANK[target.role_code] <= STAFF_ROLE_RANK[req.account.role]) {
        throw Object.assign(new Error("You cannot suspend an account at or above your own level."), { status: 403, code: "rank_violation" });
      }
      if (target.status === "suspended") throw Object.assign(new Error("This account is already suspended."), { status: 409, code: "already_suspended" });
      await client.query("UPDATE accounts SET status = 'suspended', suspended_reason = $1, updated_at = now() WHERE id = $2", [reason, target.id]);
      await client.query("UPDATE sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL", [target.id]);
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,'Account suspended',$2,'security','/support')`,
        [target.id, `Your account has been suspended. Reason: ${reason}. Review the support centre for next steps.`]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "account.suspended",
        entityType: "account",
        entityId: target.id,
        summary: `Suspended ${target.display_name} (${target.email})`,
        before: { status: target.status },
        after: { status: "suspended", reason },
        ip: requestMeta(req).ip
      });
      return { ...target, status: "suspended" };
    });
    broadcast({ type: "admin.account_suspended", accountId: result.id });
    res.json({ ok: true, account: serializeAccount(result), message: "Account suspended and active sessions revoked." });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts/:id/restore", requirePermission("accounts.restore"), async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const target = await requireTarget(req, client, "accounts.restore");
      if (target.status === "active") throw Object.assign(new Error("This account is already active."), { status: 409, code: "already_active" });
      await client.query("UPDATE accounts SET status = 'active', suspended_reason = NULL, updated_at = now() WHERE id = $1", [target.id]);
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,'Account restored','Your account has been restored. You can sign in again.','security','/account')`,
        [target.id]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "account.restored",
        entityType: "account",
        entityId: target.id,
        summary: `Restored ${target.display_name} (${target.email})`,
        before: { status: target.status },
        after: { status: "active" },
        ip: requestMeta(req).ip
      });
      return target;
    });
    broadcast({ type: "admin.account_restored", accountId: result.id });
    res.json({ ok: true, account: serializeAccount(result), message: "Account restored." });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts/:id/credits", requirePermission("credits.adjust"), async (req, res, next) => {
  try {
    const amount = round2(Number(req.body?.amount));
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) {
      throw Object.assign(new Error("Enter an adjustment between -100,000 and +100,000 VC."), { status: 400, code: "invalid_amount" });
    }
    if (reason.length < 8) throw Object.assign(new Error("A reason of at least 8 characters is required for every credit adjustment."), { status: 400, code: "reason_required" });
    if (req.params.id === req.account.id) throw Object.assign(new Error("Use a separate authorized account for adjustments."), { status: 400, code: "self_action" });
    const result = await withTransaction(async (client) => {
      const target = await requireTarget(req, client, "credits.adjust");
      if (target.role_code !== "player") throw Object.assign(new Error("Virtual-credit adjustments are limited to player accounts."), { status: 403, code: "target_role" });
      if (target.status === "closed") throw Object.assign(new Error("Closed accounts cannot receive adjustments."), { status: 400, code: "account_closed" });
      const locked = await client.query("SELECT balance, status FROM accounts WHERE id = $1 FOR UPDATE", [target.id]);
      const before = Number(locked.rows[0].balance);
      const after = round2(before + amount);
      if (after < 0) throw Object.assign(new Error("This adjustment would take the balance below zero."), { status: 400, code: "negative_balance" });
      await client.query("UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2", [after, target.id]);
      await client.query(
        `INSERT INTO transactions (account_id, type, amount, balance_after, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [target.id, amount > 0 ? "admin_credit" : "admin_debit", amount, after, `Admin adjustment: ${reason}`, req.account.id]
      );
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'security','/account/wallet')`,
        [target.id, "Virtual balance adjusted", `${amount > 0 ? "+" : ""}${amount.toFixed(2)} VC was added to your account by platform operations. Reason: ${reason}.`]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: amount > 0 ? "credits.credited" : "credits.debited",
        entityType: "account",
        entityId: target.id,
        summary: `${amount > 0 ? "Credited" : "Debited"} ${Math.abs(amount).toFixed(2)} VC to ${target.display_name}: ${reason}`,
        before: { balance: before },
        after: { balance: after, amount, reason },
        ip: requestMeta(req).ip
      });
      return { balance: after, before, target };
    });
    res.json({ ok: true, balance: result.balance, message: `Adjustment recorded. New balance: ${result.balance.toFixed(2)} VC.` });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts/:id/role", requireMaster, async (req, res, next) => {
  try {
    const role = String(req.body?.role || "");
    if (!["admin", "sub_admin", "agent", "player"].includes(role)) throw Object.assign(new Error("Invalid role."), { status: 400, code: "invalid_role" });
    const result = await withTransaction(async (client) => {
      const target = await requireTarget(req, client, "roles.manage");
      if (target.role_code === "master_admin") throw Object.assign(new Error("The Master Admin role is protected."), { status: 403, code: "protected_account" });
      await client.query("UPDATE accounts SET role_code = $1, updated_at = now() WHERE id = $2", [role, target.id]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "account.role_changed",
        entityType: "account",
        entityId: target.id,
        summary: `Changed ${target.display_name} from ${target.role_code} to ${role}`,
        before: { role: target.role_code },
        after: { role },
        ip: requestMeta(req).ip
      });
      return target;
    });
    res.json({ ok: true, message: `Role updated to ${role}.` });
  } catch (error) {
    next(error);
  }
});

router.post("/accounts/:id/revoke-sessions", requirePermission("security.view"), async (req, res, next) => {
  try {
    const target = await requireTarget(req, { query }, "security.view");
    await withTransaction(async (client) => {
      await client.query("UPDATE sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL", [target.id]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "security.sessions_revoked",
        entityType: "account",
        entityId: target.id,
        summary: `Revoked all sessions for ${target.display_name}`,
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "All sessions revoked." });
  } catch (error) {
    next(error);
  }
});

// Staff, invitations ----------------------------------------------------------
router.post("/staff", requirePermission("network.manage"), async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const displayName = String(req.body?.displayName || "").trim().slice(0, 60);
    const role = String(req.body?.role || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Enter a valid email address."), { status: 400, code: "invalid_email" });
    if (displayName.length < 2) throw Object.assign(new Error("Enter a display name."), { status: 400, code: "invalid_name" });
    if (!allowedInviteRoles(req.account).includes(role)) {
      throw Object.assign(new Error(`Your role cannot invite a ${role}.`), { status: 403, code: "role_escalation" });
    }
    const tempPassword = `19X-${randomToken(3)}!7`;
    const username = email.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 20) + crypto.randomInt(10, 99);
    const result = await withTransaction(async (client) => {
      const exists = await client.query("SELECT id FROM accounts WHERE lower(email) = lower($1)", [email]);
      if (exists.rows[0]) throw Object.assign(new Error("An account with this email already exists."), { status: 409, code: "email_taken" });
      let referral = randomReferral("TEAM");
      while ((await client.query("SELECT 1 FROM accounts WHERE referral_code = $1", [referral])).rows[0]) referral = randomReferral("TEAM");
      const account = await client.query(
        `INSERT INTO accounts (username, email, password_hash, display_name, role_code, parent_id, referral_code, status, avatar_seed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8) RETURNING id`,
        [username, email, hashPassword(tempPassword), displayName, role, req.account.id, referral, randomToken(3)]
      );
      const token = randomToken(24);
      const invitation = await client.query(
        `INSERT INTO account_invitations (email, display_name, role_code, parent_id, invited_by, token_hash, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6, now() + interval '7 days') RETURNING id, created_at, expires_at`,
        [email, displayName, role, req.account.id, req.account.id, sha256(token)]
      );
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link)
         VALUES ($1,'Welcome to the team', $2, 'system', '/admin')`,
        [account.rows[0].id, `You have been invited as ${role.replace("_", " ")}. Sign in with your temporary credentials and update your password.`]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "staff.invited",
        entityType: "account",
        entityId: account.rows[0].id,
        summary: `Invited ${displayName} as ${role}`,
        after: { email, role, parentId: req.account.id },
        ip: requestMeta(req).ip
      });
      return { id: account.rows[0].id, invitationId: invitation.rows[0].id, expiresAt: invitation.rows[0].expires_at };
    });
    res.status(201).json({
      accountId: result.id,
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
      credentials: { email, temporaryPassword: tempPassword },
      message: "Invitation created. Share the temporary credentials through an approved secure channel; they are shown only once."
    });
  } catch (error) {
    next(error);
  }
});

router.get("/invitations", requirePermission("network.manage"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const result = await query(
      `SELECT i.id, i.email, i.display_name, i.role_code, i.status, i.created_at, i.expires_at, i.accepted_at,
              p.display_name AS parent_name, inv.display_name AS invited_by_name,
              r.name AS role_name
       FROM account_invitations i
       JOIN accounts p ON p.id = i.parent_id
       JOIN accounts inv ON inv.id = i.invited_by
       JOIN roles r ON r.code = i.role_code
       ${scope === null ? "" : "WHERE i.invited_by = ANY($1::uuid[])"}
       ORDER BY i.created_at DESC LIMIT 100`,
      scope === null ? [] : [scope]
    );
    res.json({ invitations: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/invitations/:id/revoke", requirePermission("network.manage"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const result = await withTransaction(async (client) => {
      const found = await client.query("SELECT * FROM account_invitations WHERE id = $1", [req.params.id]);
      const invite = found.rows[0];
      if (!invite) throw Object.assign(new Error("Invitation not found."), { status: 404, code: "not_found" });
      if (scope !== null && !scope.includes(invite.invited_by)) throw Object.assign(new Error("Invitation is outside your network."), { status: 403, code: "out_of_scope" });
      if (invite.status !== "pending") throw Object.assign(new Error("Only pending invitations can be revoked."), { status: 409, code: "invitation_final" });
      await client.query("UPDATE account_invitations SET status = 'revoked' WHERE id = $1", [invite.id]);
      const account = await client.query("SELECT id, display_name FROM accounts WHERE lower(email) = lower($1)", [invite.email]);
      if (account.rows[0]) await client.query("UPDATE accounts SET status = 'closed', updated_at = now() WHERE id = $1 AND role_code <> 'player'", [account.rows[0].id]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "staff.invitation_revoked",
        entityType: "invitation",
        entityId: invite.id,
        summary: `Revoked invitation for ${invite.email}`,
        ip: requestMeta(req).ip
      });
      return invite;
    });
    res.json({ ok: true, message: "Invitation revoked." });
  } catch (error) {
    next(error);
  }
});

// Roles ----------------------------------------------------------------------
router.get("/roles", requirePermission("roles.manage"), async (req, res, next) => {
  try {
    const [roles, counts] = await Promise.all([
      query("SELECT * FROM roles ORDER BY rank ASC"),
      query("SELECT role_code, COUNT(*) AS count FROM accounts GROUP BY role_code")
    ]);
    const countMap = Object.fromEntries(counts.rows.map((row) => [row.role_code, Number(row.count)]));
    res.json({
      roles: roles.rows.map((row) => ({ ...row, count: countMap[row.code] || 0 })),
      permissions: PERMISSIONS
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/roles/:code/permissions", requireMaster, async (req, res, next) => {
  try {
    const permissions = Array.isArray(req.body?.permissions) ? [...new Set(req.body.permissions)] : null;
    if (!permissions) throw Object.assign(new Error("Permissions must be an array."), { status: 400, code: "invalid_permissions" });
    const invalid = permissions.filter((permission) => !PERMISSIONS.includes(permission));
    if (invalid.length) throw Object.assign(new Error(`Unknown permissions: ${invalid.join(", ")}`), { status: 400, code: "invalid_permission" });
    if (req.params.code === "master_admin") throw Object.assign(new Error("Master Admin permissions are fixed."), { status: 403, code: "protected_role" });
    const result = await withTransaction(async (client) => {
      const before = await client.query("SELECT code, permissions FROM roles WHERE code = $1", [req.params.code]);
      if (!before.rows[0]) throw Object.assign(new Error("Role not found."), { status: 404, code: "not_found" });
      await client.query("UPDATE roles SET permissions = $1, updated_at = now() WHERE code = $2", [JSON.stringify(permissions), req.params.code]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "role.permissions_updated",
        entityType: "role",
        entityId: req.params.code,
        summary: `Updated permissions for ${req.params.code}`,
        before: { permissions: before.rows[0].permissions },
        after: { permissions },
        ip: requestMeta(req).ip
      });
      return permissions;
    });
    res.json({ ok: true, permissions: result, message: "Role permissions updated. Changes take effect on the next request." });
  } catch (error) {
    next(error);
  }
});

// Game catalogue --------------------------------------------------------------
router.get("/games", requirePermission("games.view"), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT g.*, (SELECT COUNT(*) FROM game_rounds r WHERE r.game_id = g.id) AS round_count,
              (SELECT COALESCE(SUM(bet),0) FROM game_rounds r WHERE r.game_id = g.id) AS total_wagered
       FROM games g ORDER BY g.sort_order ASC`
    );
    res.json({ games: result.rows.map((row) => ({ ...row, rtp: row.rtp == null ? null : Number(row.rtp), round_count: Number(row.round_count), total_wagered: Number(row.total_wagered) })) });
  } catch (error) {
    next(error);
  }
});

router.patch("/games/:id", requirePermission("games.manage"), async (req, res, next) => {
  try {
    const allowed = ["status", "featured", "badge", "tagline", "description", "sort_order"];
    const changes = {};
    for (const key of allowed) if (req.body?.[key] !== undefined) changes[key] = req.body[key];
    if (!Object.keys(changes).length) throw Object.assign(new Error("No editable fields supplied."), { status: 400, code: "no_changes" });
    if (changes.status && !["published", "hidden", "maintenance"].includes(changes.status)) throw Object.assign(new Error("Invalid status."), { status: 400, code: "invalid_status" });
    const result = await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM games WHERE id = $1", [req.params.id]);
      if (!before.rows[0]) throw Object.assign(new Error("Game not found."), { status: 404, code: "not_found" });
      const sets = Object.keys(changes).map((key, index) => `${key} = $${index + 1}`);
      await client.query(`UPDATE games SET ${sets.join(", ")}, updated_at = now() WHERE id = $${sets.length + 1}`, [...Object.values(changes), req.params.id]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "game.catalogue_updated",
        entityType: "game",
        entityId: req.params.id,
        summary: `Updated catalogue entry for ${before.rows[0].name}`,
        before: { status: before.rows[0].status, featured: before.rows[0].featured },
        after: changes,
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "Catalogue entry updated. Game outcomes and RTP cannot be edited here." });
  } catch (error) {
    next(error);
  }
});

// Content --------------------------------------------------------------------
router.get("/content", requirePermission("content.manage"), async (req, res, next) => {
  try {
    const [pages, promotions] = await Promise.all([
      query("SELECT slug, title, category, body, status, updated_at FROM content_pages ORDER BY category, title"),
      query("SELECT * FROM promotions ORDER BY sort_order ASC")
    ]);
    res.json({ pages: pages.rows, promotions: promotions.rows });
  } catch (error) {
    next(error);
  }
});

router.patch("/content/pages/:slug", requirePermission("content.manage"), async (req, res, next) => {
  try {
    const { title, body, status } = req.body || {};
    const result = await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM content_pages WHERE slug = $1", [req.params.slug]);
      if (!before.rows[0]) throw Object.assign(new Error("Page not found."), { status: 404, code: "not_found" });
      await client.query(
        "UPDATE content_pages SET title = COALESCE($1,title), body = COALESCE($2,body), status = COALESCE($3,status), updated_by = $4, updated_at = now() WHERE slug = $5",
        [title || null, body || null, status || null, req.account.id, req.params.slug]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "content.page_updated",
        entityType: "content_page",
        entityId: req.params.slug,
        summary: `Updated content page ${req.params.slug}`,
        before: { title: before.rows[0].title, status: before.rows[0].status },
        after: { title, status },
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "Content page updated." });
  } catch (error) {
    next(error);
  }
});

router.patch("/content/promotions/:id", requirePermission("promotions.manage"), async (req, res, next) => {
  try {
    const { title, description, badge, active, cta, terms } = req.body || {};
    const result = await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM promotions WHERE id = $1", [req.params.id]);
      if (!before.rows[0]) throw Object.assign(new Error("Promotion not found."), { status: 404, code: "not_found" });
      await client.query(
        `UPDATE promotions SET title = COALESCE($1,title), description = COALESCE($2,description), badge = COALESCE($3,badge),
         active = COALESCE($4,active), cta = COALESCE($5,cta), terms = COALESCE($6,terms), updated_at = now() WHERE id = $7`,
        [title || null, description || null, badge || null, active == null ? null : !!active, cta || null, terms || null, req.params.id]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "content.promotion_updated",
        entityType: "promotion",
        entityId: req.params.id,
        summary: `Updated promotion ${before.rows[0].title}`,
        before: { active: before.rows[0].active, badge: before.rows[0].badge },
        after: { active, badge, title },
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "Promotion updated." });
  } catch (error) {
    next(error);
  }
});

// Credits --------------------------------------------------------------------
router.get("/credits", requirePermission("credits.adjust"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const filter = scope === null ? "" : "AND t.account_id = ANY($1::uuid[])";
    const params = scope === null ? [] : [scope];
    const [summary, rows, series] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END),0) AS credited,
                COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END),0) AS debited,
                COUNT(*) AS adjustments
         FROM transactions t WHERE t.type IN ('admin_credit','admin_debit') ${filter}`,
        params
      ),
      query(
        `SELECT t.id, t.amount, t.balance_after, t.description, t.created_at, t.type,
                a.display_name AS account_name, a.email AS account_email,
                actor.display_name AS actor_name
         FROM transactions t JOIN accounts a ON a.id = t.account_id
         LEFT JOIN accounts actor ON actor.id = t.created_by
         WHERE t.type IN ('admin_credit','admin_debit') ${filter}
         ORDER BY t.created_at DESC LIMIT 80`,
        params
      ),
      query(
        `SELECT date_trunc('day', t.created_at) AS day,
                COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END),0) AS credited,
                COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END),0) AS debited
         FROM transactions t WHERE t.type IN ('admin_credit','admin_debit') AND t.created_at > now()-interval '14 days' ${filter}
         GROUP BY 1 ORDER BY 1`,
        params
      )
    ]);
    res.json({
      summary: {
        credited: Number(summary.rows[0].credited),
        debited: Number(summary.rows[0].debited),
        adjustments: Number(summary.rows[0].adjustments)
      },
      activity: rows.rows.map((row) => ({ ...row, amount: Number(row.amount), balance_after: Number(row.balance_after) })),
      series: series.rows.map((row) => ({ day: row.day, credited: Number(row.credited), debited: Number(row.debited) }))
    });
  } catch (error) {
    next(error);
  }
});

// Support --------------------------------------------------------------------
router.get("/support", requirePermission("support.view"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const filter = scope === null ? "" : "AND t.account_id = ANY($1::uuid[])";
    const params = scope === null ? [] : [scope];
    const result = await query(
      `SELECT t.*, a.display_name AS account_name, a.email AS account_email,
              (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS message_count,
              (SELECT body FROM support_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM support_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
              assignee.display_name AS assigned_name
       FROM support_tickets t JOIN accounts a ON a.id = t.account_id
       LEFT JOIN accounts assignee ON assignee.id = t.assigned_to
       WHERE 1=1 ${filter}
       ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, t.updated_at DESC
       LIMIT 100`,
      params
    );
    res.json({ tickets: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/support/:id", requirePermission("support.view"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const ticket = await query(
      `SELECT t.*, a.display_name AS account_name, a.email AS account_email, a.balance
       FROM support_tickets t JOIN accounts a ON a.id = t.account_id WHERE t.id = $1`,
      [req.params.id]
    );
    if (!ticket.rows[0]) throw Object.assign(new Error("Ticket not found."), { status: 404, code: "not_found" });
    if (scope !== null && !scope.includes(ticket.rows[0].account_id)) throw Object.assign(new Error("Ticket is outside your network."), { status: 403, code: "out_of_scope" });
    const messages = await query(
      `SELECT m.id, m.body, m.is_internal, m.created_at, m.sender_id, a.display_name AS sender_name, a.role_code AS sender_role
       FROM support_messages m LEFT JOIN accounts a ON a.id = m.sender_id WHERE m.ticket_id = $1 ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json({ ticket: ticket.rows[0], messages: messages.rows });
  } catch (error) {
    next(error);
  }
});

router.patch("/support/:id", requirePermission("support.manage"), async (req, res, next) => {
  try {
    const { status, priority, assign } = req.body || {};
    const allowedStatus = ["open", "pending", "resolved", "closed"];
    const allowedPriority = ["low", "normal", "high", "urgent"];
    if (status && !allowedStatus.includes(status)) throw Object.assign(new Error("Invalid status."), { status: 400, code: "invalid_status" });
    if (priority && !allowedPriority.includes(priority)) throw Object.assign(new Error("Invalid priority."), { status: 400, code: "invalid_priority" });
    const result = await withTransaction(async (client) => {
      const found = await client.query("SELECT * FROM support_tickets WHERE id = $1", [req.params.id]);
      const ticket = found.rows[0];
      if (!ticket) throw Object.assign(new Error("Ticket not found."), { status: 404, code: "not_found" });
      const scope = await getScopedAccountIds(req.account, client);
      if (scope !== null && !scope.includes(ticket.account_id)) throw Object.assign(new Error("Ticket is outside your network."), { status: 403, code: "out_of_scope" });
      await client.query(
        `UPDATE support_tickets SET status = COALESCE($1,status), priority = COALESCE($2,priority),
         assigned_to = CASE WHEN $3::boolean THEN $4::uuid ELSE assigned_to END, updated_at = now() WHERE id = $5`,
        [status || null, priority || null, assign === true || assign === "me", req.account.id, req.params.id]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "support.ticket_updated",
        entityType: "support_ticket",
        entityId: req.params.id,
        summary: `Updated support ticket ${req.params.id.slice(0, 8)}`,
        before: { status: ticket.status, priority: ticket.priority, assignedTo: ticket.assigned_to },
        after: { status, priority, assignedTo: assign ? req.account.id : undefined },
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "Ticket updated." });
  } catch (error) {
    next(error);
  }
});

router.post("/support/:id/messages", requirePermission("support.manage"), async (req, res, next) => {
  try {
    const body = String(req.body?.body || "").trim().slice(0, 4000);
    const isInternal = !!req.body?.isInternal;
    if (body.length < 2) throw Object.assign(new Error("Write a message first."), { status: 400, code: "invalid_message" });
    const result = await withTransaction(async (client) => {
      const found = await client.query("SELECT * FROM support_tickets WHERE id = $1", [req.params.id]);
      const ticket = found.rows[0];
      if (!ticket) throw Object.assign(new Error("Ticket not found."), { status: 404, code: "not_found" });
      const scope = await getScopedAccountIds(req.account, client);
      if (scope !== null && !scope.includes(ticket.account_id)) throw Object.assign(new Error("Ticket is outside your network."), { status: 403, code: "out_of_scope" });
      const message = await client.query(
        `INSERT INTO support_messages (ticket_id, sender_id, body, is_internal) VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
        [ticket.id, req.account.id, body, isInternal]
      );
      await client.query("UPDATE support_tickets SET status = CASE WHEN status = 'closed' THEN 'open' ELSE status END, updated_at = now() WHERE id = $1", [ticket.id]);
      if (!isInternal) {
        await client.query(
          `INSERT INTO notifications (account_id, title, body, type, link)
           VALUES ($1,'Support replied to your ticket',$2,'info','/support')`,
          [ticket.account_id, body.slice(0, 180)]
        );
      }
      return message.rows[0];
    });
    res.status(201).json({ ok: true, message: result });
  } catch (error) {
    next(error);
  }
});

// Transfers ------------------------------------------------------------------
router.get("/transfers", requirePermission("transfers.approve"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const filter = scope === null ? "" : "AND (t.from_parent_id = ANY($1::uuid[]) OR t.to_parent_id = ANY($1::uuid[]))";
    const result = await query(
      `SELECT t.*, a.display_name AS account_name, a.email AS account_email,
              f.display_name AS from_name, p.display_name AS to_name, r.display_name AS requester_name
       FROM account_transfers t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN accounts f ON f.id = t.from_parent_id
       JOIN accounts p ON p.id = t.to_parent_id
       JOIN accounts r ON r.id = t.requested_by
       ${scope === null ? "" : "WHERE 1=1 " + filter}
       ORDER BY t.created_at DESC LIMIT 100`,
      scope === null ? [] : [scope]
    );
    res.json({ transfers: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/transfers", requirePermission("transfers.approve"), async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (reason.length < 8) throw Object.assign(new Error("Add a transfer reason."), { status: 400, code: "reason_required" });
    const result = await withTransaction(async (client) => {
      const account = await client.query("SELECT id, display_name, parent_id, role_code FROM accounts WHERE id = $1", [req.body?.accountId]);
      if (!account.rows[0]) throw Object.assign(new Error("Account not found."), { status: 404, code: "not_found" });
      const targetParent = await client.query("SELECT id, display_name FROM accounts WHERE id = $1", [req.body?.toParentId]);
      if (!targetParent.rows[0]) throw Object.assign(new Error("Destination node not found."), { status: 404, code: "not_found" });
      const scope = await getScopedAccountIds(req.account, client);
      if (scope !== null && (!scope.includes(account.rows[0].id) || !scope.includes(targetParent.rows[0].id))) {
        throw Object.assign(new Error("Both accounts must be inside your authorized network."), { status: 403, code: "out_of_scope" });
      }
      if (account.rows[0].id === targetParent.rows[0].id) throw Object.assign(new Error("An account cannot be its own parent."), { status: 400, code: "invalid_transfer" });
      const transfer = await client.query(
        `INSERT INTO account_transfers (account_id, from_parent_id, to_parent_id, requested_by, reason)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [account.rows[0].id, account.rows[0].parent_id, targetParent.rows[0].id, req.account.id, reason]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "transfer.requested",
        entityType: "account_transfer",
        entityId: transfer.rows[0].id,
        summary: `Requested transfer of ${account.rows[0].display_name} to ${targetParent.rows[0].display_name}`,
        after: { accountId: account.rows[0].id, toParentId: targetParent.rows[0].id, reason },
        ip: requestMeta(req).ip
      });
      return transfer.rows[0];
    });
    res.status(201).json({ transfer: result, message: "Transfer request created for approval." });
  } catch (error) {
    next(error);
  }
});

router.post("/transfers/:id/approve", requirePermission("transfers.approve"), async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const found = await client.query("SELECT * FROM account_transfers WHERE id = $1 FOR UPDATE", [req.params.id]);
      const transfer = found.rows[0];
      if (!transfer) throw Object.assign(new Error("Transfer not found."), { status: 404, code: "not_found" });
      if (transfer.status !== "pending") throw Object.assign(new Error("Transfer is already resolved."), { status: 409, code: "transfer_resolved" });
      const scope = await getScopedAccountIds(req.account, client);
      if (scope !== null && !scope.includes(transfer.to_parent_id)) throw Object.assign(new Error("Destination is outside your network."), { status: 403, code: "out_of_scope" });
      await client.query(
        `UPDATE account_transfers SET status='approved', reviewed_by=$1, review_note=$2, resolved_at=now() WHERE id=$3`,
        [req.account.id, String(req.body?.note || "").slice(0, 300) || null, transfer.id]
      );
      await client.query("UPDATE accounts SET parent_id = $1, updated_at = now() WHERE id = $2", [transfer.to_parent_id, transfer.account_id]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "transfer.approved",
        entityType: "account_transfer",
        entityId: transfer.id,
        summary: `Approved transfer of account ${transfer.account_id.slice(0, 8)}`,
        before: { parentId: transfer.from_parent_id },
        after: { parentId: transfer.to_parent_id },
        ip: requestMeta(req).ip
      });
      return transfer;
    });
    res.json({ ok: true, message: "Transfer approved and hierarchy updated." });
  } catch (error) {
    next(error);
  }
});

router.post("/transfers/:id/reject", requirePermission("transfers.approve"), async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const found = await client.query("SELECT * FROM account_transfers WHERE id = $1 FOR UPDATE", [req.params.id]);
      const transfer = found.rows[0];
      if (!transfer) throw Object.assign(new Error("Transfer not found."), { status: 404, code: "not_found" });
      if (transfer.status !== "pending") throw Object.assign(new Error("Transfer is already resolved."), { status: 409, code: "transfer_resolved" });
      await client.query("UPDATE account_transfers SET status='rejected', reviewed_by=$1, review_note=$2, resolved_at=now() WHERE id=$3", [req.account.id, String(req.body?.note || "").slice(0, 300) || null, transfer.id]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "transfer.rejected",
        entityType: "account_transfer",
        entityId: transfer.id,
        summary: `Rejected transfer of account ${transfer.account_id.slice(0, 8)}`,
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "Transfer rejected." });
  } catch (error) {
    next(error);
  }
});

// Security -------------------------------------------------------------------
router.get("/security", requirePermission("security.view"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const filter = scope === null ? "" : "AND a.id = ANY($1::uuid[])";
    const params = scope === null ? [] : [scope];
    const [failed, sessions, suspended, adjustments, audit] = await Promise.all([
      query(
        `SELECT l.id, l.email, l.ip, l.user_agent, l.reason, l.created_at, a.display_name
         FROM login_history l LEFT JOIN accounts a ON a.id = l.account_id
         WHERE l.success = false ${scope === null ? "" : "AND a.id = ANY($1::uuid[])"}
         ORDER BY l.created_at DESC LIMIT 25`,
        params
      ),
      query(
        `SELECT s.id, s.ip, s.user_agent, s.created_at, s.last_seen_at, s.expires_at, a.display_name, a.email, a.role_code
         FROM sessions s JOIN accounts a ON a.id = s.account_id
         WHERE s.revoked_at IS NULL AND s.expires_at > now() ${filter}
         ORDER BY s.last_seen_at DESC LIMIT 25`,
        params
      ),
      query(
        `SELECT a.id, a.display_name, a.email, a.suspended_reason, a.updated_at FROM accounts a
         WHERE a.status = 'suspended' ${filter} ORDER BY a.updated_at DESC LIMIT 25`,
        params
      ),
      query(
        `SELECT t.id, t.amount, t.description, t.created_at, a.display_name, t.type
         FROM transactions t JOIN accounts a ON a.id=t.account_id
         WHERE t.type IN ('admin_credit','admin_debit') AND t.created_at > now()-interval '7 days' ${filter}
         ORDER BY t.created_at DESC LIMIT 15`,
        params
      ),
      query("SELECT event_hash, prev_hash, created_at FROM audit_events ORDER BY id DESC LIMIT 1")
    ]);
    const chain = await verifyAuditChain((await import("../db.js")).pool, 200);
    res.json({
      failedLogins: failed.rows,
      activeSessions: sessions.rows,
      suspendedAccounts: suspended.rows,
      recentAdjustments: adjustments.rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      auditChain: chain,
      auditTip: audit.rows[0] || null,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Audit ----------------------------------------------------------------------
router.get("/audit", requirePermission("audit.view.scope"), async (req, res, next) => {
  try {
    const scope = await scoped(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const params = [];
    const conditions = [];
    if (scope !== null) {
      params.push(scope);
      const uuidParam = params.length;
      params.push(scope.map(String));
      conditions.push(`(e.actor_id = ANY($${uuidParam}::uuid[]) OR e.entity_id = ANY($${params.length}::text[]))`);
    }
    if (req.query.action) {
      params.push(String(req.query.action).slice(0, 60));
      conditions.push(`e.action = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await query(`SELECT COUNT(*) FROM audit_events e ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const result = await query(
      `SELECT e.*, a.display_name AS actor_name, a.role_code AS actor_role
       FROM audit_events e LEFT JOIN accounts a ON a.id = e.actor_id
       ${where} ORDER BY e.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const chain = await verifyAuditChain((await import("../db.js")).pool, 500);
    res.json({
      events: result.rows,
      total: Number(count.rows[0].count),
      page,
      pages: Math.max(1, Math.ceil(Number(count.rows[0].count) / limit)),
      chain,
      immutable: true
    });
  } catch (error) {
    next(error);
  }
});

// Settings -------------------------------------------------------------------
router.get("/settings", requirePermission("settings.manage"), async (req, res, next) => {
  try {
    const result = await query("SELECT key, value, description, updated_at FROM platform_settings ORDER BY key");
    res.json({ settings: result.rows });
  } catch (error) {
    next(error);
  }
});

router.patch("/settings/:key", requireMaster, async (req, res, next) => {
  try {
    if (req.body?.value === undefined) throw Object.assign(new Error("A value is required."), { status: 400, code: "invalid_value" });
    if (req.params.key === "realMoneyEnabled" && req.body.value !== false) {
      throw Object.assign(new Error("Real-money rails are hard-disabled in this foundation and cannot be enabled from configuration."), { status: 403, code: "real_money_locked" });
    }
    await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM platform_settings WHERE key = $1", [req.params.key]);
      if (!before.rows[0]) throw Object.assign(new Error("Setting not found."), { status: 404, code: "not_found" });
      await client.query("UPDATE platform_settings SET value = $1, updated_by = $2, updated_at = now() WHERE key = $3", [JSON.stringify(req.body.value), req.account.id, req.params.key]);
      await appendAudit(client, {
        actorId: req.account.id,
        action: "settings.updated",
        entityType: "setting",
        entityId: req.params.key,
        summary: `Updated platform setting ${req.params.key}`,
        before: { value: before.rows[0].value },
        after: { value: req.body.value },
        ip: requestMeta(req).ip
      });
    });
    res.json({ ok: true, message: "Setting updated." });
  } catch (error) {
    next(error);
  }
});

// System health ---------------------------------------------------------------
router.get("/system", requirePermission("system.view"), async (req, res, next) => {
  try {
    const started = Date.now();
    const db = await health();
    const [counts, integrations, chain, dbSize] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*) FROM accounts) AS accounts,
        (SELECT COUNT(*) FROM game_rounds) AS rounds,
        (SELECT COUNT(*) FROM bets) AS bets,
        (SELECT COUNT(*) FROM notifications) AS notifications,
        (SELECT COUNT(*) FROM support_tickets WHERE status <> 'closed') AS tickets`),
      query(`SELECT integration_status, COUNT(*) AS count FROM games GROUP BY integration_status`),
      verifyAuditChain((await import("../db.js")).pool, 500),
      query("SELECT pg_size_pretty(pg_database_size(current_database())) AS size")
    ]);
    res.json({
      status: "operational",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      db: { ...db, queryLatencyMs: Date.now() - started, size: dbSize.rows[0].size },
      counts: Object.fromEntries(Object.entries(counts.rows[0]).map(([key, value]) => [key, Number(value)])),
      integrations: integrations.rows.map((row) => ({ status: row.integration_status, count: Number(row.count) })),
      auditChain: chain,
      realMoneyRails: { enabled: false, reason: "Licensing and regulatory approval required", deposits: false, withdrawals: false, cashRedemption: false },
      services: [
        { name: "API", status: "operational", detail: "Express REST gateway" },
        { name: "PostgreSQL", status: "operational", detail: `Query ${Date.now() - started} ms` },
        { name: "Realtime", status: "operational", detail: "WebSocket activity channel" },
        { name: "Game engine", status: "operational", detail: "Server-authoritative 19X Originals" },
        { name: "Third-party providers", status: "not_configured", detail: "Integration-ready titles are disabled" },
        { name: "Payments", status: "disabled", detail: "Real-money rails require licensing" }
      ]
    });
  } catch (error) {
    next(error);
  }
});

// Notifications broadcast -----------------------------------------------------
router.post("/notifications", requirePermission("notifications.broadcast"), async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 120);
    const body = String(req.body?.body || "").trim().slice(0, 1000);
    if (title.length < 3 || body.length < 8) throw Object.assign(new Error("Add a title and message."), { status: 400, code: "invalid_notification" });
    const scope = await scoped(req);
    const ids = scope;
    const result = await withTransaction(async (client) => {
      const insert = await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link)
         SELECT id, $1, $2, 'system', '/account/notifications' FROM accounts
         WHERE status='active' ${ids === null ? "" : "AND id = ANY($3::uuid[])"}
         RETURNING id`,
        ids === null ? [title, body] : [title, body, ids]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "notifications.broadcast",
        entityType: "notification",
        entityId: null,
        summary: `Broadcast "${title}" to ${insert.rowCount} accounts`,
        after: { title, recipients: insert.rowCount },
        ip: requestMeta(req).ip
      });
      return insert.rowCount;
    });
    broadcast({ type: "notification.broadcast", title });
    res.json({ ok: true, recipients: result, message: `Notification sent to ${result} accounts.` });
  } catch (error) {
    next(error);
  }
});

export default router;
