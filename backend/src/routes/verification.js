import express from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import { getPlatformSettings } from "../lib/settings.js";

const router = express.Router();

function serialize(row) {
  if (!row) return { status: "not_started", legalName: "", dateOfBirth: "", country: "", address: "", documentType: "", documentReference: "", reviewNote: "", submittedAt: null, reviewedAt: null };
  return {
    id: row.id,
    status: row.status,
    legalName: row.legal_name,
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().slice(0, 10) : "",
    country: row.country,
    address: row.address,
    documentType: row.document_type,
    documentReference: row.document_reference,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at
  };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM account_verifications WHERE account_id=$1", [req.account.id]);
    res.json({ verification: serialize(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const legalName = String(req.body?.legalName || "").trim().slice(0, 120);
    const dateOfBirth = String(req.body?.dateOfBirth || "");
    const country = String(req.body?.country || "").trim().slice(0, 80);
    const address = String(req.body?.address || "").trim().slice(0, 300);
    const documentType = String(req.body?.documentType || "").trim();
    const documentReference = String(req.body?.documentReference || "").trim().slice(0, 80);
    if (legalName.length < 2) throw Object.assign(new Error("Enter your full legal name."), { status: 400, code: "invalid_name" });
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) throw Object.assign(new Error("Enter a valid date of birth."), { status: 400, code: "invalid_dob" });
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 18) throw Object.assign(new Error("You must be at least 18 to verify an account."), { status: 400, code: "underage" });
    if (!country || !address) throw Object.assign(new Error("Enter your country and residential address."), { status: 400, code: "invalid_address" });
    if (!["passport", "driving_licence", "national_id"].includes(documentType)) throw Object.assign(new Error("Choose a valid identity document."), { status: 400, code: "invalid_document" });
    if (documentReference.length < 4) throw Object.assign(new Error("Enter the document reference shown on your ID."), { status: 400, code: "invalid_document" });
    const existing = await query("SELECT * FROM account_verifications WHERE account_id=$1", [req.account.id]);
    if (existing.rows[0]?.status === "approved") throw Object.assign(new Error("Your identity is already verified."), { status: 409, code: "already_verified" });
    if (existing.rows[0]?.status === "pending") throw Object.assign(new Error("Your verification is already under review."), { status: 409, code: "already_pending" });
    const result = await withTransaction(async (client) => {
      const row = await client.query(
        `INSERT INTO account_verifications
          (account_id, legal_name, date_of_birth, country, address, document_type, document_reference, status, submitted_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',now(),now())
         ON CONFLICT (account_id) DO UPDATE SET
           legal_name=EXCLUDED.legal_name, date_of_birth=EXCLUDED.date_of_birth, country=EXCLUDED.country,
           address=EXCLUDED.address, document_type=EXCLUDED.document_type, document_reference=EXCLUDED.document_reference,
           status='pending', review_note=NULL, reviewed_by=NULL, reviewed_at=NULL, submitted_at=now(), updated_at=now()
         RETURNING *`,
        [req.account.id, legalName, dateOfBirth, country, address, documentType, documentReference]
      );
      await client.query(
        "UPDATE kyc_documents SET status='superseded' WHERE verification_id=$1 AND status='pending'",
        [row.rows[0].id]
      );
      await client.query(
        `INSERT INTO kyc_documents (verification_id, account_id, document_type, document_reference, metadata)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.rows[0].id, req.account.id, documentType, documentReference, JSON.stringify({ country, address })]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "kyc.submitted",
        entityType: "account_verification",
        entityId: row.rows[0].id,
        summary: "Submitted identity verification",
        after: { legalName, country, documentType },
        ip: requestMeta(req).ip
      });
      return row.rows[0];
    });
    res.status(201).json({ verification: serialize(result), message: "Verification submitted for review." });
  } catch (error) {
    next(error);
  }
});

export default router;
