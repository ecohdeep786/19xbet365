import crypto from "node:crypto";
import { sha256 } from "./crypto.js";

/**
 * Append an audit event with a tamper-evident hash chain.
 * No API or service exposes update/delete for audit_events, and a database
 * trigger rejects mutations at the storage layer.
 */
export async function appendAudit(client, { actorId = null, action, entityType, entityId = null, summary, before = null, after = null, ip = null }) {
  // Serialize chain appends so two concurrent privileged actions cannot share a parent hash.
  await client.query("SELECT pg_advisory_xact_lock(824001)");
  const previous = await client.query(
    "SELECT event_hash FROM audit_events ORDER BY id DESC LIMIT 1"
  );
  const prevHash = previous.rows[0]?.event_hash || "GENESIS";
  const payload = JSON.stringify({
    actorId,
    action,
    entityType,
    entityId,
    summary,
    before,
    after,
    ip,
    prevHash,
    at: new Date().toISOString()
  });
  const eventHash = sha256(payload);
  const result = await client.query(
    `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, summary, before, after, ip, prev_hash, event_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at, event_hash, prev_hash`,
    [actorId, action, entityType, entityId, summary, before, after, ip, prevHash, eventHash]
  );
  return result.rows[0];
}

export async function verifyAuditChain(client, limit = 200) {
  const result = await client.query(
    `SELECT id, event_hash, prev_hash FROM audit_events ORDER BY id DESC LIMIT $1`,
    [limit]
  );
  let broken = 0;
  let expectedPrev = null;
  for (const row of result.rows) {
    if (expectedPrev !== null && row.event_hash !== expectedPrev) broken += 1;
    expectedPrev = row.prev_hash;
  }
  return { checked: result.rows.length, broken, intact: broken === 0 };
}

export function requestMeta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || null,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300)
  };
}

export function auditReference() {
  return `AUD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
