import { query } from "../db.js";

export async function getPlatformSettings(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return {};
  const result = await query("SELECT key, value FROM platform_settings WHERE key = ANY($1::text[])", [keys]);
  return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
}
