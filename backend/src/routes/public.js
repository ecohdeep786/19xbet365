import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { health, query } from "../db.js";
import { loadSession, requireAuth } from "../middleware/auth.js";

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "shared", "catalog.json"), "utf8"));

const gameMapper = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  provider: row.provider,
  playable: row.playable,
  integrationStatus: row.integration_status,
  rtp: row.rtp == null ? null : Number(row.rtp),
  volatility: row.volatility,
  tagline: row.tagline,
  description: row.description,
  theme: row.theme,
  features: row.features,
  howTo: row.how_to,
  badge: row.badge,
  featured: row.featured,
  players: row.players,
  maxWin: row.max_win,
  sortOrder: row.sort_order,
  status: row.status
});

const matchMapper = (row) => ({
  id: row.id,
  sport: row.sport,
  league: row.league,
  homeTeam: row.home_team,
  awayTeam: row.away_team,
  startTime: row.start_time,
  status: row.status,
  minute: row.minute,
  scoreHome: row.score_home,
  scoreAway: row.score_away,
  odds: {
    home: row.odds_home == null ? null : Number(row.odds_home),
    draw: row.odds_draw == null ? null : Number(row.odds_draw),
    away: row.odds_away == null ? null : Number(row.odds_away)
  },
  featured: row.featured,
  demo: row.is_demo
});

export async function buildBootstrap() {
  const [sports, matches, games, promotions, tournaments, settings] = await Promise.all([
    query("SELECT * FROM sports WHERE active = true ORDER BY event_count DESC"),
    query("SELECT * FROM matches ORDER BY featured DESC, start_time ASC LIMIT 120"),
    query("SELECT * FROM games WHERE status <> 'hidden' ORDER BY sort_order ASC"),
    query("SELECT * FROM promotions WHERE active = true ORDER BY sort_order ASC"),
    query("SELECT * FROM tournaments ORDER BY starts_at ASC"),
    query("SELECT key, value FROM platform_settings")
  ]);
  const settingsMap = Object.fromEntries(settings.rows.map((row) => [row.key, row.value]));
  return {
    serverTime: new Date().toISOString(),
    sports: sports.rows.map((row) => ({ slug: row.slug, name: row.name, icon: row.icon, count: row.event_count })),
    matches: matches.rows.map(matchMapper),
    games: games.rows.map(gameMapper),
    promotions: promotions.rows.map((row) => ({
      id: row.id,
      title: row.title,
      kicker: row.kicker,
      description: row.description,
      type: row.type,
      badge: row.badge,
      theme: row.theme,
      endsAt: row.ends_at,
      cta: row.cta,
      terms: row.terms,
      prize: row.prize
    })),
    tournaments: tournaments.rows.map((row) => ({
      id: row.id,
      name: row.name,
      gameId: row.game_id,
      prizePool: Number(row.prize_pool),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      participants: row.participants,
      leaderboard: row.leaderboard
    })),
    settings: settingsMap,
    helpArticles: catalog.helpArticles || [],
    announcements: [
      { type: "demo", title: "Coins only", body: "19xbet365 uses non-redeemable coins. No real-money wagering, deposits, or withdrawals are enabled." },
      { type: "integrity", title: "Server-authoritative rounds", body: "Every playable 19X Original round is generated and recorded on the server. Third-party titles remain clearly marked as integration-ready." }
    ]
  };
}

router.get("/bootstrap", async (req, res, next) => {
  try {
    res.json(await buildBootstrap());
  } catch (error) {
    next(error);
  }
});

router.get("/health", async (req, res, next) => {
  try {
    const db = await health();
    res.json({ status: "ok", db, uptime: process.uptime(), version: "1.0.0" });
  } catch (error) {
    next(error);
  }
});

router.get("/matches", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.sport) { params.push(req.query.sport); conditions.push(`sport = $${params.length}`); }
    if (req.query.live === "true") conditions.push("status = 'live'");
    if (req.query.search) {
      params.push(`%${String(req.query.search).slice(0, 60)}%`);
      conditions.push(`(home_team ILIKE $${params.length} OR away_team ILIKE $${params.length} OR league ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await query(`SELECT * FROM matches ${where} ORDER BY featured DESC, start_time ASC LIMIT 200`, params);
    res.json({ matches: result.rows.map(matchMapper) });
  } catch (error) {
    next(error);
  }
});

router.get("/games", async (req, res, next) => {
  try {
    const conditions = ["status <> 'hidden'"];
    const params = [];
    if (req.query.category && req.query.category !== "all") {
      params.push(req.query.category);
      conditions.push(`category = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${String(req.query.search).slice(0, 60)}%`);
      conditions.push(`(name ILIKE $${params.length} OR provider ILIKE $${params.length})`);
    }
    const result = await query(`SELECT * FROM games WHERE ${conditions.join(" AND ")} ORDER BY sort_order ASC`, params);
    res.json({ games: result.rows.map(gameMapper) });
  } catch (error) {
    next(error);
  }
});

router.get("/games/:id", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) throw Object.assign(new Error("Game not found."), { status: 404, code: "not_found" });
    res.json({ game: gameMapper(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.get("/promotions", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM promotions WHERE active = true ORDER BY sort_order ASC");
    res.json({ promotions: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/tournaments", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM tournaments ORDER BY starts_at ASC");
    res.json({ tournaments: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/content/:slug", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT slug, title, category, body, status, updated_at FROM content_pages WHERE slug = $1 AND status = 'published'",
      [req.params.slug]
    );
    if (!result.rows[0]) throw Object.assign(new Error("Content page not found."), { status: 404, code: "not_found" });
    res.json({ page: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get("/settings/public", async (req, res, next) => {
  try {
    const result = await query("SELECT key, value FROM platform_settings WHERE key NOT LIKE '%secret%'");
    res.json({ settings: Object.fromEntries(result.rows.map((row) => [row.key, row.value])) });
  } catch (error) {
    next(error);
  }
});

router.get("/responsible", async (req, res) => {
  res.json({
    headline: "19xbet365 is coin entertainment.",
    points: [
      "No real-money deposits, withdrawals, or cash prizes are available.",
      "Players must be 18 or older to create an account.",
      "Daily limits, reality checks, cool-offs, and self-exclusion are available in your account.",
      "If play stops feeling like entertainment, take a break and contact support."
    ]
  });
});

export default router;
