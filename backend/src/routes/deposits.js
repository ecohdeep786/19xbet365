import crypto from "node:crypto";
import express from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import { round2 } from "../services/gameEngine.js";
import { assertDepositAvailable, bonusForDeposit, getDepositSettings } from "../services/deposits.js";

const router = express.Router();

function serializeDeposit(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    method: row.method,
    reference: row.reference,
    note: row.note,
    status: row.status,
    bonusAmount: Number(row.bonus_amount),
    reviewNote: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at
  };
}

router.get("/config", requireAuth, async (req, res, next) => {
  try {
    const config = await getDepositSettings();
    res.json({
      mode: config.mode,
      qrImageUrl: config.qrImageUrl,
      instructions: config.instructions,
      tiers: config.tiers,
      min: config.min,
      max: config.max,
      livePaymentsEnabled: process.env.PAYMENTS_LIVE_ENABLED === "true"
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM deposit_requests WHERE account_id = $1 ORDER BY created_at DESC LIMIT 30",
      [req.account.id]
    );
    res.json({ deposits: result.rows.map(serializeDeposit) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    if (req.account.emailVerified === false) {
      throw Object.assign(new Error("Verify your email address before adding coins. Resend the verification link from your account."), { status: 403, code: "email_verification_required" });
    }
    const config = await getDepositSettings();
    assertDepositAvailable(config);
    const amount = round2(Number(req.body?.amount));
    const reference = String(req.body?.reference || "").trim().slice(0, 120);
    const note = String(req.body?.note || "").trim().slice(0, 300);
    if (!Number.isFinite(amount) || amount < config.min || amount > config.max) {
      throw Object.assign(new Error(`Enter a deposit between ${config.min} and ${config.max} coins.`), { status: 400, code: "invalid_amount" });
    }
    if (reference.length < 6) {
      throw Object.assign(new Error("Enter the payment reference or UTR from your transfer."), { status: 400, code: "reference_required" });
    }
    const pending = await query(
      "SELECT count(*)::int AS count FROM deposit_requests WHERE account_id = $1 AND status = 'pending'",
      [req.account.id]
    );
    if (pending.rows[0].count >= 3) {
      throw Object.assign(new Error("You already have three deposit requests awaiting review."), { status: 429, code: "too_many_pending" });
    }
    const id = crypto.randomUUID();
    const request = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO deposit_requests (id, account_id, amount, reference, note)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id, req.account.id, amount, reference, note || null]
      );
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link)
         VALUES ($1,$2,$3,'system','/account/deposit')`,
        [req.account.id, "Deposit request received", `${amount.toFixed(2)} coin deposit is awaiting verification for reference ${reference}.`]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "deposit.requested",
        entityType: "deposit_request",
        entityId: id,
        summary: `Requested ${amount.toFixed(2)} coin deposit · ${reference}`,
        after: { amount, reference, mode: config.mode },
        ip: requestMeta(req).ip
      });
      return result.rows[0];
    });
    const preview = bonusForDeposit(amount, config.tiers);
    res.status(201).json({ deposit: serializeDeposit(request), bonusPreview: preview, message: "Deposit request submitted for verification." });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        "SELECT * FROM deposit_requests WHERE id = $1 AND account_id = $2 FOR UPDATE",
        [req.params.id, req.account.id]
      );
      const request = locked.rows[0];
      if (!request) throw Object.assign(new Error("Deposit request not found."), { status: 404, code: "not_found" });
      if (request.status !== "pending") throw Object.assign(new Error("Only pending requests can be cancelled."), { status: 409, code: "not_pending" });
      const updated = await client.query(
        "UPDATE deposit_requests SET status = 'cancelled', reviewed_at = now() WHERE id = $1 RETURNING *",
        [request.id]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "deposit.cancelled",
        entityType: "deposit_request",
        entityId: request.id,
        summary: `Cancelled ${Number(request.amount).toFixed(2)} coin deposit request`,
        ip: requestMeta(req).ip
      });
      return updated.rows[0];
    });
    res.json({ deposit: serializeDeposit(result), message: "Deposit request cancelled." });
  } catch (error) {
    next(error);
  }
});

export default router;
