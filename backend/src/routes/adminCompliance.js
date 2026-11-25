import express from "express";
import { query, withTransaction } from "../db.js";
import { requireMaster, requireStaff } from "../middleware/auth.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import { lockAccount, walletTransaction } from "../services/wallet.js";
import { round2 } from "../services/gameEngine.js";

const router = express.Router();
router.use(requireStaff);
router.use(requireMaster);

function serializeKyc(row) {
  return {
    id: row.id, accountId: row.account_id, player: row.display_name, email: row.email,
    legalName: row.legal_name, dateOfBirth: row.date_of_birth, country: row.country,
    address: row.address, documentType: row.document_type, documentReference: row.document_reference,
    status: row.status, reviewNote: row.review_note, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at
  };
}

function serializeWithdrawal(row) {
  return {
    id: row.id, accountId: row.account_id, player: row.display_name, email: row.email,
    amount: Number(row.amount), method: row.method, destination: row.destination,
    destinationMasked: row.destination_masked, status: row.status,
    requestedAt: row.requested_at, reviewedAt: row.reviewed_at, paidAt: row.paid_at,
    paymentReference: row.payment_reference, reviewNote: row.review_note
  };
}

router.get("/kyc", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, a.display_name, a.email FROM account_verifications v
       JOIN accounts a ON a.id=v.account_id ORDER BY
       CASE v.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, v.submitted_at DESC LIMIT 100`
    );
    res.json({ verifications: result.rows.map(serializeKyc) });
  } catch (error) { next(error); }
});

router.post("/kyc/:id/approve", async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const row = await client.query("SELECT * FROM account_verifications WHERE id=$1 FOR UPDATE", [req.params.id]);
      const verification = row.rows[0];
      if (!verification) throw Object.assign(new Error("Verification not found."), { status: 404, code: "not_found" });
      if (verification.status === "approved") throw Object.assign(new Error("Already approved."), { status: 409, code: "already_reviewed" });
      await client.query("UPDATE account_verifications SET status='approved', reviewed_by=$1, reviewed_at=now(), review_note=$2, updated_at=now() WHERE id=$3", [req.account.id, String(req.body?.note || "").slice(0, 300) || null, verification.id]);
      await client.query("INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)", [verification.account_id, "Identity verified", "Your identity verification was approved. You can now request withdrawals.", "/account/verification"]);
      await appendAudit(client, { actorId: req.account.id, action: "kyc.approved", entityType: "account_verification", entityId: verification.id, summary: "Approved identity verification", ip: requestMeta(req).ip });
      return { ...verification, status: "approved" };
    });
    res.json({ verification: serializeKyc(result), message: "Verification approved." });
  } catch (error) { next(error); }
});

router.post("/kyc/:id/reject", async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (reason.length < 4) throw Object.assign(new Error("Enter a rejection reason."), { status: 400, code: "invalid_reason" });
    const result = await withTransaction(async (client) => {
      const row = await client.query("SELECT * FROM account_verifications WHERE id=$1 FOR UPDATE", [req.params.id]);
      const verification = row.rows[0];
      if (!verification) throw Object.assign(new Error("Verification not found."), { status: 404, code: "not_found" });
      if (verification.status === "approved") throw Object.assign(new Error("Approved verification cannot be rejected."), { status: 409, code: "already_reviewed" });
      await client.query("UPDATE account_verifications SET status='rejected', reviewed_by=$1, reviewed_at=now(), review_note=$2, updated_at=now() WHERE id=$3", [req.account.id, reason, verification.id]);
      await client.query("INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)", [verification.account_id, "Identity verification needs attention", reason, "/account/verification"]);
      await appendAudit(client, { actorId: req.account.id, action: "kyc.rejected", entityType: "account_verification", entityId: verification.id, summary: `Rejected identity verification: ${reason}`, ip: requestMeta(req).ip });
      return { ...verification, status: "rejected" };
    });
    res.json({ verification: serializeKyc(result), message: "Verification rejected." });
  } catch (error) { next(error); }
});

router.get("/withdrawals", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT w.*, a.display_name, a.email FROM withdrawal_requests w
       JOIN accounts a ON a.id=w.account_id ORDER BY
       CASE w.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, w.requested_at DESC LIMIT 100`
    );
    res.json({ requests: result.rows.map(serializeWithdrawal) });
  } catch (error) { next(error); }
});

router.post("/withdrawals/:id/approve", async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const row = await client.query("SELECT * FROM withdrawal_requests WHERE id=$1 FOR UPDATE", [req.params.id]);
      const request = row.rows[0];
      if (!request) throw Object.assign(new Error("Withdrawal request not found."), { status: 404, code: "not_found" });
      if (request.status !== "pending") throw Object.assign(new Error("Only pending requests can be approved."), { status: 409, code: "not_pending" });
      await client.query("UPDATE withdrawal_requests SET status='approved', reviewed_by=$1, reviewed_at=now(), review_note=$2 WHERE id=$3", [req.account.id, String(req.body?.note || "").slice(0, 300) || null, request.id]);
      await client.query("INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)", [request.account_id, "Withdrawal approved", `${Number(request.amount).toFixed(2)} coins approved for manual payment processing.`, "/account/withdraw"]);
      await appendAudit(client, { actorId: req.account.id, action: "withdrawal.approved", entityType: "withdrawal_request", entityId: request.id, summary: `Approved withdrawal of ${Number(request.amount).toFixed(2)} coins`, ip: requestMeta(req).ip });
      return { ...request, status: "approved" };
    });
    res.json({ request: serializeWithdrawal(result), message: "Withdrawal approved." });
  } catch (error) { next(error); }
});

router.post("/withdrawals/:id/reject", async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (reason.length < 4) throw Object.assign(new Error("Enter a rejection reason."), { status: 400, code: "invalid_reason" });
    const result = await withTransaction(async (client) => {
      const row = await client.query("SELECT * FROM withdrawal_requests WHERE id=$1 FOR UPDATE", [req.params.id]);
      const request = row.rows[0];
      if (!request) throw Object.assign(new Error("Withdrawal request not found."), { status: 404, code: "not_found" });
      if (!["pending", "approved"].includes(request.status)) throw Object.assign(new Error("This request cannot be rejected."), { status: 409, code: "not_pending" });
      const account = await lockAccount(client, request.account_id);
      const balance = round2(Number(account.balance) + Number(request.amount));
      await client.query("UPDATE accounts SET balance=$1, updated_at=now() WHERE id=$2", [balance, request.account_id]);
      await walletTransaction(client, { accountId: request.account_id, type: "withdrawal_refund", amount: Number(request.amount), balanceAfter: balance, description: "Withdrawal request rejected", referenceType: "withdrawal_request", referenceId: request.id });
      await client.query("UPDATE withdrawal_requests SET status='rejected', reviewed_by=$1, reviewed_at=now(), review_note=$2 WHERE id=$3", [req.account.id, reason, request.id]);
      await client.query("INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)", [request.account_id, "Withdrawal rejected", `${reason} The coins were returned to your wallet.`, "/account/withdraw"]);
      await appendAudit(client, { actorId: req.account.id, action: "withdrawal.rejected", entityType: "withdrawal_request", entityId: request.id, summary: `Rejected withdrawal: ${reason}`, ip: requestMeta(req).ip });
      return { ...request, status: "rejected" };
    });
    res.json({ request: serializeWithdrawal(result), message: "Withdrawal rejected and coins returned." });
  } catch (error) { next(error); }
});

router.post("/withdrawals/:id/paid", async (req, res, next) => {
  try {
    const reference = String(req.body?.paymentReference || "").trim().slice(0, 120);
    if (reference.length < 4) throw Object.assign(new Error("Enter the payment reference."), { status: 400, code: "invalid_reference" });
    const result = await withTransaction(async (client) => {
      const row = await client.query("SELECT * FROM withdrawal_requests WHERE id=$1 FOR UPDATE", [req.params.id]);
      const request = row.rows[0];
      if (!request) throw Object.assign(new Error("Withdrawal not found."), { status: 404, code: "not_found" });
      if (request.status !== "approved") throw Object.assign(new Error("Approve the request before marking it paid."), { status: 409, code: "not_approved" });
      await client.query("UPDATE withdrawal_requests SET status='paid', paid_at=now(), payment_reference=$1 WHERE id=$2", [reference, request.id]);
      await client.query("INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)", [request.account_id, "Withdrawal paid", `${Number(request.amount).toFixed(2)} coins marked paid. Reference: ${reference}.`, "/account/withdraw"]);
      await appendAudit(client, { actorId: req.account.id, action: "withdrawal.paid", entityType: "withdrawal_request", entityId: request.id, summary: `Marked withdrawal paid: ${reference}`, ip: requestMeta(req).ip });
      return { ...request, status: "paid", payment_reference: reference };
    });
    res.json({ request: serializeWithdrawal(result), message: "Withdrawal marked paid." });
  } catch (error) { next(error); }
});

export default router;
