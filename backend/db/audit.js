import { pool } from "../src/db.js";

const checks = [];
function record(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}
async function scalar(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ? Object.values(result.rows[0])[0] : null;
}
async function expectRejected(client, name, sql, params = []) {
  await client.query("BEGIN");
  try {
    await client.query(sql, params);
    await client.query("ROLLBACK");
    record(name, false, "mutation was accepted");
  } catch (error) {
    await client.query("ROLLBACK");
    record(name, true, error.message);
  }
}

const client = await pool.connect();
try {
  const mismatch = Number(await scalar(client, "SELECT COUNT(*)::int FROM wallet_reconciliation WHERE status = 'mismatch'"));
  record("Wallet ledger reconciles every account", mismatch === 0, `${mismatch} mismatched accounts`);

  const duplicateReferences = Number(await scalar(client, `
    SELECT COUNT(*)::int FROM (
      SELECT account_id, reference_type, reference_id, type
      FROM transactions
      WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL
      GROUP BY account_id, reference_type, reference_id, type
      HAVING COUNT(*) > 1
    ) x
  `));
  record("No duplicate wallet movement references", duplicateReferences === 0, `${duplicateReferences} duplicate groups`);

  const tables = ["bonus_grants", "kyc_documents", "responsible_limit_events", "match_odds_history", "schema_migrations"];
  for (const table of tables) {
    const exists = await scalar(client, "SELECT to_regclass($1) IS NOT NULL", [`public.${table}`]);
    record(`Table ${table} exists`, exists === true);
  }

  const triggers = [
    "transactions_append_only", "settled_bets_immutable", "settled_selection_immutable",
    "settled_rounds_immutable", "deposit_financial_fields_immutable", "withdrawal_financial_fields_immutable",
    "accounts_prevent_hierarchy_cycle", "responsible_limits_history", "match_odds_history_trigger",
    "fantasy_prize_tiers_no_overlap", "fantasy_entries_validate_lineup", "fantasy_settlements_append_only",
    "login_history_append_only"
  ];
  for (const trigger of triggers) {
    const exists = await scalar(client, "SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = $1)", [trigger]);
    record(`Trigger ${trigger} exists`, exists === true);
  }

  await expectRejected(client, "Wallet transactions are append-only",
    "UPDATE transactions SET description = description WHERE id = (SELECT id FROM transactions LIMIT 1)");
  await expectRejected(client, "Settled game rounds are immutable",
    "UPDATE game_rounds SET payout = payout WHERE id = (SELECT id FROM game_rounds WHERE status = 'settled' LIMIT 1)");
  await expectRejected(client, "Settled sports bets are immutable",
    "UPDATE bets SET stake = stake WHERE id = (SELECT id FROM bets WHERE status <> 'open' LIMIT 1)");

  await client.query("BEGIN");
  try {
    const inserted = await client.query(
      "INSERT INTO deposit_requests (account_id, amount, reference) VALUES ((SELECT id FROM accounts WHERE email = 'player@19xbet365.test'), 100, 'AUDIT-DB-' || gen_random_uuid()) RETURNING id"
    );
    await client.query("UPDATE deposit_requests SET amount = amount + 1 WHERE id = $1", [inserted.rows[0].id]);
    await client.query("ROLLBACK");
    record("Deposit financial fields are immutable", false, "mutation was accepted");
  } catch (error) {
    await client.query("ROLLBACK");
    record("Deposit financial fields are immutable", true, error.message);
  }

  const limitEvents = Number(await scalar(client, "SELECT COUNT(*)::int FROM responsible_limit_events"));
  record("Responsible-play changes are historised", limitEvents > 0, `${limitEvents} events`);
  const oddsEvents = Number(await scalar(client, "SELECT COUNT(*)::int FROM match_odds_history"));
  record("Match odds have an audit history", oddsEvents > 0, `${oddsEvents} snapshots`);
  const migrations = Number(await scalar(client, "SELECT COUNT(*)::int FROM schema_migrations"));
  record("Versioned migrations applied", migrations > 0, `${migrations} migrations`);

  const pass = checks.every((check) => check.pass);
  console.log(JSON.stringify({ checks, pass }, null, 2));
  if (!pass) process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
