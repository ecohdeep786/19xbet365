/**
 * Hierarchy scoping.
 * Scope is derived from the authoritative parent_id chain in PostgreSQL.
 * A master admin can see the entire platform. Every other staff account can
 * only see itself and its descendants. No client-provided scope is trusted.
 */
export async function getDescendantIds(client, rootId) {
  const result = await client.query(
    `WITH RECURSIVE network AS (
       SELECT id FROM accounts WHERE id = $1
       UNION ALL
       SELECT a.id FROM accounts a JOIN network n ON a.parent_id = n.id
     ) SELECT id FROM network`,
    [rootId]
  );
  return result.rows.map((row) => row.id);
}

export async function getScopedAccountIds(actor, client = null) {
  const role = actor.role_code || actor.role;
  if (role === "master_admin") return null; // global
  const db = client || (await import("../db.js"));
  const runner = client ? { query: (text, params) => client.query(text, params) } : db;
  return getDescendantIds(runner, actor.id);
}

export function isStaff(role) {
  return ["master_admin", "admin", "sub_admin", "agent"].includes(role);
}

export async function assertInScope(actor, accountId, client) {
  if ((actor.role_code || actor.role) === "master_admin") return true;
  const ids = await getDescendantIds(client, actor.id);
  return ids.includes(accountId);
}

export async function getNetworkTree(client, rootId = null) {
  const params = [];
  let where = "";
  if (rootId) {
    params.push(rootId);
    where = "WHERE id = $1";
  }
  const result = await client.query(
    `SELECT a.id, a.username, a.email, a.display_name, a.role_code, a.parent_id, a.status, a.balance,
            a.referral_code, a.referred_by, a.created_at, a.last_login_at, a.avatar_seed,
            r.name AS role_name, r.rank AS role_rank
     FROM accounts a JOIN roles r ON r.code = a.role_code ${where}
     ORDER BY r.rank ASC, a.created_at ASC`,
    params
  );
  const byId = new Map();
  const rows = result.rows.map((row) => ({ ...row, balance: Number(row.balance), children: [] }));
  rows.forEach((row) => byId.set(row.id, row));
  const roots = [];
  rows.forEach((row) => {
    if (row.parent_id && byId.has(row.parent_id)) byId.get(row.parent_id).children.push(row);
    else roots.push(row);
  });
  return roots;
}
