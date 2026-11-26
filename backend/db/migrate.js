import { pool } from "../src/db.js";
import { applyMigrations } from "./applyMigrations.js";

const client = await pool.connect();
try {
  const applied = await applyMigrations(client, { log: (message) => console.log(message) });
  console.log(applied.length ? `Applied ${applied.length} migration(s).` : "Database is up to date.");
} finally {
  client.release();
  await pool.end();
}
