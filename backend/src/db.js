import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:5433/astra_play",
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: "19xbet365-api"
});

pool.on("error", (error) => {
  console.error("[pg] idle client error", error.message);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function health() {
  const started = Date.now();
  const result = await pool.query("SELECT now() AS now, current_database() AS db");
  return { latencyMs: Date.now() - started, db: result.rows[0].db, serverTime: result.rows[0].now };
}
