import { query, withTransaction } from "../db.js";
import { appendAudit } from "../lib/audit.js";
import { lockAccount, walletTransaction } from "./wallet.js";
import { round2 } from "./gameEngine.js";

const DEFAULT_TIERS = [
  { min: 100, percent: 5 },
  { min: 500, percent: 10 },
  { min: 1000, percent: 15 },
  { min: 5000, percent: 20 }
];

function parseTiers(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => ({ min: Number(item.min), percent: Number(item.percent) }))
      .filter((item) => Number.isFinite(item.min) && Number.isFinite(item.percent) && item.min >= 0 && item.percent >= 0 && item.percent <= 100)
      .sort((a, b) => a.min - b.min);
  }
  const parsed = String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [min, percent] = part.split(":").map(Number);
      return { min, percent };
    })
    .filter((item) => Number.isFinite(item.min) && Number.isFinite(item.percent) && item.min >= 0 && item.percent >= 0 && item.percent <= 100)
    .sort((a, b) => a.min - b.min);
  return parsed.length ? parsed : DEFAULT_TIERS;
}

export async function getDepositSettings(client = null) {
  const runner = client || { query };
  const result = await runner.query(
    "SELECT key, value FROM platform_settings WHERE key = ANY($1::text[])",
    [["depositMode", "depositQrImageUrl", "depositInstructions", "depositBonusTiers", "depositMin", "depositMax"]]
  );
  const map = Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
  return {
    mode: String(map.depositMode || "sandbox"),
    qrImageUrl: String(map.depositQrImageUrl || ""),
    instructions: String(map.depositInstructions || ""),
    tiers: parseTiers(map.depositBonusTiers),
    min: Math.max(1, Number(map.depositMin) || 50),
    max: Math.max(1, Number(map.depositMax) || 100000)
  };
}

export function bonusForDeposit(amount, tiers) {
  const tier = [...tiers].reverse().find((item) => amount >= item.min);
  const percent = tier?.percent || 0;
  return { percent, amount: round2((amount * percent) / 100), tier: tier?.min || 0 };
}

export function assertDepositAvailable(config) {
  if (config.mode === "disabled") {
    throw Object.assign(new Error("Deposits are currently disabled by platform operations."), { status: 403, code: "deposits_disabled" });
  }
  if (config.mode === "manual_review" && process.env.PAYMENTS_LIVE_ENABLED !== "true") {
    throw Object.assign(new Error("Live payment collection is not activated on this server. Complete licensing, KYC and payment onboarding first."), {
      status: 403,
      code: "payments_not_activated"
    });
  }
}

export async function approveDeposit({ id, reviewerId, reviewNote = null, ip = null }) {
  return withTransaction(async (client) => {
    const requestResult = await client.query("SELECT * FROM deposit_requests WHERE id = $1 FOR UPDATE", [id]);
    const request = requestResult.rows[0];
    if (!request) throw Object.assign(new Error("Deposit request not found."), { status: 404, code: "not_found" });
    if (request.status !== "pending") throw Object.assign(new Error("This deposit request has already been reviewed."), { status: 409, code: "already_reviewed" });
    const config = await getDepositSettings(client);
    const bonus = bonusForDeposit(Number(request.amount), config.tiers);
    const account = await lockAccount(client, request.account_id);
    if (!account) throw Object.assign(new Error("Player account not found."), { status: 404, code: "not_found" });
    const afterDeposit = round2(Number(account.balance) + Number(request.amount));
    const finalBalance = round2(afterDeposit + bonus.amount);
    await client.query("UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2", [finalBalance, request.account_id]);
    await walletTransaction(client, {
      accountId: request.account_id,
      type: "deposit",
      amount: Number(request.amount),
      balanceAfter: afterDeposit,
      description: `Coin deposit approved · ${request.reference}`,
      referenceType: "deposit_request",
      referenceId: request.id,
      createdBy: reviewerId
    });
    if (bonus.amount > 0) {
      await walletTransaction(client, {
        accountId: request.account_id,
        type: "deposit_bonus",
        amount: bonus.amount,
        balanceAfter: finalBalance,
        description: `Deposit bonus · ${bonus.percent}% for ${request.amount} coins`,
        referenceType: "deposit_request",
        referenceId: request.id,
        createdBy: reviewerId
      });
    }
    await client.query(
      "UPDATE deposit_requests SET status = 'approved', bonus_amount = $1, reviewed_by = $2, review_note = $3, reviewed_at = now() WHERE id = $4",
      [bonus.amount, reviewerId, reviewNote, request.id]
    );
    await client.query(
      `INSERT INTO notifications (account_id, title, body, type, link)
       VALUES ($1,$2,$3,'game','/account/wallet')`,
      [
        request.account_id,
        "Deposit approved",
        `${Number(request.amount).toFixed(2)} coins were added${bonus.amount > 0 ? ` with a ${bonus.amount.toFixed(2)} coin bonus` : ""}.`
      ]
    );
    await appendAudit(client, {
      actorId: reviewerId,
      action: "deposit.approved",
      entityType: "deposit_request",
      entityId: request.id,
      summary: `Approved ${Number(request.amount).toFixed(2)} coin deposit and ${bonus.amount.toFixed(2)} bonus`,
      before: { status: request.status, balance: Number(account.balance) },
      after: { status: "approved", balance: finalBalance, bonus: bonus.amount, reference: request.reference },
      ip
    });
    return { request: { ...request, status: "approved", bonus_amount: bonus.amount }, balance: finalBalance, bonus };
  });
}

export async function rejectDeposit({ id, reviewerId, reason, ip = null }) {
  return withTransaction(async (client) => {
    const requestResult = await client.query("SELECT * FROM deposit_requests WHERE id = $1 FOR UPDATE", [id]);
    const request = requestResult.rows[0];
    if (!request) throw Object.assign(new Error("Deposit request not found."), { status: 404, code: "not_found" });
    if (request.status !== "pending") throw Object.assign(new Error("This deposit request has already been reviewed."), { status: 409, code: "already_reviewed" });
    await client.query(
      "UPDATE deposit_requests SET status = 'rejected', reviewed_by = $1, review_note = $2, reviewed_at = now() WHERE id = $3",
      [reviewerId, reason, request.id]
    );
    await client.query(
      `INSERT INTO notifications (account_id, title, body, type, link)
       VALUES ($1,$2,$3,'security','/account/deposit')`,
      [request.account_id, "Deposit request rejected", `Your deposit request could not be verified. ${reason}`]
    );
    await appendAudit(client, {
      actorId: reviewerId,
      action: "deposit.rejected",
      entityType: "deposit_request",
      entityId: request.id,
      summary: `Rejected ${Number(request.amount).toFixed(2)} coin deposit: ${reason}`,
      before: { status: request.status },
      after: { status: "rejected", reason },
      ip
    });
    return { request: { ...request, status: "rejected", review_note: reason } };
  });
}

export async function listPlayerDeposits(accountId) {
  const result = await query(
    "SELECT * FROM deposit_requests WHERE account_id = $1 ORDER BY created_at DESC LIMIT 30",
    [accountId]
  );
  return result.rows;
}
