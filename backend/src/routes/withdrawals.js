import express from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import { getPlatformSettings } from "../lib/settings.js";
import { lockAccount, walletTransaction } from "../services/wallet.js";
import { round2 } from "../services/gameEngine.js";

const router = express.Router();

function maskDestination(destination) {
  const value = String(destination || "");
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return value.length > 4 ? `****${value.slice(-4)}` : "****";
}

function serialize(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    method: row.method,
    destination: row.destination_masked,
    status: row.status,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    paidAt: row.paid_at,
    paymentReference: row.payment_reference,
    reviewNote: row.review_note
  };
}

async function configFor(accountId) {
  const settings = await getPlatformSettings(["withdrawalsEnabled", "withdrawalMin", "withdrawalMax", "kycRequired"]);
  const verification = await query("SELECT status FROM account_verifications WHERE account_id=$1", [accountId]);
  return {
    enabled: settings.withdrawalsEnabled !== false,
    min: Number(settings.withdrawalMin || 500),
    max: Number(settings.withdrawalMax || 50000),
    kycRequired: settings.kycRequired !== false,
    kycStatus: verification.rows[0]?.status || "not_started"
  };
}

router.get("/config", requireAuth, async (req, res, next) => {
  try {
    res.json({ config: await configFor(req.account.id) });
  } catch (error) { next(error); }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM withdrawal_requests WHERE account_id=$1 ORDER BY requested_at DESC LIMIT 50", [req.account.id]);
    res.json({ requests: result.rows.map(serialize) });
  } catch (error) { next(error); }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const config = await configFor(req.account.id);
    if (!config.enabled) throw Object.assign(new Error("Withdrawals are disabled by platform operations."), { status: 403, code: "withdrawals_disabled" });
    if (config.kycRequired && config.kycStatus !== "approved") {
      throw Object.assign(new Error("Complete identity verification before requesting a withdrawal."), { status: 403, code: "kyc_required" });
    }
    const amount = round2(Number(req.body?.amount));
    const method = String(req.body?.method || "");
    const destination = String(req.body?.destination || "").trim().slice(0, 160);
    if (!Number.isFinite(amount) || amount < config.min || amount > config.max) {
      throw Object.assign(new Error(`Withdrawal amount must be between ${config.min} and ${config.max} coins.`), { status: 400, code: "invalid_amount" });
    }
    if (!["upi", "bank"].includes(method)) throw Object.assign(new Error("Choose a valid withdrawal method."), { status: 400, code: "invalid_method" });
    if (destination.length < 4) throw Object.assign(new Error("Enter the destination account or UPI ID."), { status: 400, code: "invalid_destination" });
    const pending = await query("SELECT COUNT(*) AS count FROM withdrawal_requests WHERE account_id=$1 AND status IN ('pending','approved')", [req.account.id]);
    if (Number(pending.rows[0].count) > 0) throw Object.assign(new Error("You already have a withdrawal request awaiting review or payment."), { status: 409, code: "withdrawal_pending" });
    const result = await withTransaction(async (client) => {
      const account = await lockAccount(client, req.account.id);
      if (!account || account.status !== "active") throw Object.assign(new Error("This account cannot request a withdrawal."), { status: 403, code: "account_restricted" });
      if (Number(account.balance) < amount) throw Object.assign(new Error("Your balance is too low for this withdrawal."), { status: 400, code: "insufficient_balance" });
      const balance = round2(Number(account.balance) - amount);
      await client.query("UPDATE accounts SET balance=$1, updated_at=now() WHERE id=$2", [balance, req.account.id]);
      await walletTransaction(client, {
        accountId: req.account.id,
        type: "withdrawal_request",
        amount: -amount,
        balanceAfter: balance,
        description: `Withdrawal request · ${method.toUpperCase()}`,
        referenceType: "withdrawal_request"
      });
      const request = await client.query(
        `INSERT INTO withdrawal_requests (account_id, amount, method, destination, destination_masked)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.account.id, amount, method, destination, maskDestination(destination)]
      );
      await client.query(
        "INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)",
        [req.account.id, "Withdrawal requested", `${amount.toFixed(2)} coins requested via ${method.toUpperCase()}. Manual review is required before payment.`, "/account/withdraw"]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "withdrawal.requested",
        entityType: "withdrawal_request",
        entityId: request.rows[0].id,
        summary: `Requested ${amount.toFixed(2)} coin withdrawal via ${method}`,
        after: { amount, method, destination: maskDestination(destination) },
        ip: requestMeta(req).ip
      });
      return { request: request.rows[0], balance };
    });
    res.status(201).json({ request: serialize(result.request), balance: result.balance, message: "Withdrawal request submitted for review." });
  } catch (error) { next(error); }
});

router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const row = await client.query("SELECT * FROM withdrawal_requests WHERE id=$1 AND account_id=$2 FOR UPDATE", [req.params.id, req.account.id]);
      const request = row.rows[0];
      if (!request) throw Object.assign(new Error("Withdrawal request not found."), { status: 404, code: "not_found" });
      if (request.status !== "pending") throw Object.assign(new Error("Only pending requests can be cancelled."), { status: 409, code: "not_pending" });
      const account = await lockAccount(client, req.account.id);
      const balance = round2(Number(account.balance) + Number(request.amount));
      await client.query("UPDATE accounts SET balance=$1, updated_at=now() WHERE id=$2", [balance, req.account.id]);
      await walletTransaction(client, {
        accountId: req.account.id,
        type: "withdrawal_refund",
        amount: Number(request.amount),
        balanceAfter: balance,
        description: "Withdrawal request cancelled",
        referenceType: "withdrawal_request",
        referenceId: request.id
      });
      await client.query("UPDATE withdrawal_requests SET status='cancelled', reviewed_at=now() WHERE id=$1", [request.id]);
      await appendAudit(client, { actorId: req.account.id, action: "withdrawal.cancelled", entityType: "withdrawal_request", entityId: request.id, summary: "Cancelled withdrawal request", ip: requestMeta(req).ip });
      return { request: { ...request, status: "cancelled" }, balance };
    });
    res.json({ request: serialize(result.request), balance: result.balance, message: "Withdrawal request cancelled and coins returned." });
  } catch (error) { next(error); }
});

export default router;
