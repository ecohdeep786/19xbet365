import express from "express";
import { query, withTransaction } from "../db.js";
import { requireStaff, requirePermission } from "../middleware/auth.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import {
  cancelFantasyContest,
  saveFantasyScores,
  settleFantasyContest
} from "../services/fantasy.js";

const router = express.Router();
router.use(requireStaff);
router.use(requirePermission("games.manage"));

function serialize(row) {
  return {
    id: row.id, name: row.name, sport: row.sport, matchId: row.match_id, status: row.status,
    entryFee: Number(row.entry_fee), salaryCap: Number(row.salary_cap),
    maxEntries: Number(row.max_entries), maxEntriesPerUser: Number(row.max_entries_per_user),
    prizePool: Number(row.prize_pool), rakePercent: Number(row.rake_percent),
    lockAt: row.lock_at, startTime: row.starts_at, settledAt: row.settled_at,
    league: row.league, homeTeam: row.home_team, awayTeam: row.away_team,
    entries: Number(row.entries || 0), collected: Number(row.collected || 0),
    scoredPlayers: Number(row.scored_players || 0), createdAt: row.created_at
  };
}

router.get("/eligible-matches", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.id, m.sport, m.league, m.home_team, m.away_team, m.start_time, m.status
       FROM matches m
       WHERE m.sport = 'cricket' AND m.status = 'upcoming'
         AND (SELECT COUNT(*) FROM fantasy_players fp WHERE fp.team = m.home_team AND fp.active) >= 11
         AND (SELECT COUNT(*) FROM fantasy_players fp WHERE fp.team = m.away_team AND fp.active) >= 11
       ORDER BY m.start_time ASC LIMIT 50`
    );
    res.json({
      matches: result.rows.map((row) => ({
        id: row.id, sport: row.sport, league: row.league,
        homeTeam: row.home_team, awayTeam: row.away_team,
        startTime: row.start_time, status: row.status
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/contests", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT fc.*, m.league, m.home_team, m.away_team,
              (SELECT COUNT(*) FROM fantasy_entries fe WHERE fe.contest_id=fc.id AND fe.status='confirmed') AS entries,
              (SELECT COALESCE(SUM(fe.entry_fee),0) FROM fantasy_entries fe WHERE fe.contest_id=fc.id AND fe.status='confirmed') AS collected,
              (SELECT COUNT(*) FROM fantasy_player_stats fps WHERE fps.contest_id=fc.id) AS scored_players
       FROM fantasy_contests fc JOIN matches m ON m.id=fc.match_id
       ORDER BY fc.created_at DESC LIMIT 100`
    );
    res.json({ contests: result.rows.map(serialize) });
  } catch (error) {
    next(error);
  }
});

router.get("/contests/:id", async (req, res, next) => {
  try {
    const contest = await query(
      `SELECT fc.*, m.league, m.home_team, m.away_team
       FROM fantasy_contests fc JOIN matches m ON m.id=fc.match_id WHERE fc.id=$1`,
      [req.params.id]
    );
    if (!contest.rows[0]) return res.status(404).json({ error: "not_found", message: "Fantasy contest not found." });
    const [tiers, entries, stats] = await Promise.all([
      query("SELECT * FROM fantasy_prize_tiers WHERE contest_id=$1 ORDER BY rank_from", [req.params.id]),
      query(
        `SELECT fe.*, a.display_name, a.email FROM fantasy_entries fe
         JOIN accounts a ON a.id=fe.account_id WHERE fe.contest_id=$1 ORDER BY fe.created_at`,
        [req.params.id]
      ),
      query("SELECT player_id, points FROM fantasy_player_stats WHERE contest_id=$1", [req.params.id])
    ]);
    const players = await query(
      `SELECT id, team, name, role, salary FROM fantasy_players
       WHERE sport=$1 AND active=true AND team = ANY($2::text[]) ORDER BY team, CASE role WHEN 'wk' THEN 1 WHEN 'bat' THEN 2 WHEN 'ar' THEN 3 ELSE 4 END, salary DESC, name`,
      [contest.rows[0].sport, [contest.rows[0].home_team, contest.rows[0].away_team]]
    );
    res.json({
      contest: serialize({
        ...contest.rows[0],
        entries: entries.rows.filter((entry) => entry.status === "confirmed").length,
        collected: entries.rows.filter((entry) => entry.status === "confirmed").reduce((sum, entry) => sum + Number(entry.entry_fee), 0),
        scored_players: stats.rows.length
      }),
      tiers: tiers.rows.map((tier) => ({ rankFrom: tier.rank_from, rankTo: tier.rank_to, amount: Number(tier.amount) })),
      entries: entries.rows.map((entry) => ({
        id: entry.id, accountId: entry.account_id, player: entry.display_name, email: entry.email,
        lineup: entry.lineup, captainId: entry.captain_id, viceCaptainId: entry.vice_captain_id,
        entryFee: Number(entry.entry_fee), status: entry.status, score: Number(entry.score),
        rank: entry.rank, payout: Number(entry.payout), createdAt: entry.created_at
      })),
      players: players.rows.map((player) => ({ id: player.id, team: player.team, name: player.name, role: player.role, salary: Number(player.salary) })),
      scores: Object.fromEntries(stats.rows.map((row) => [row.player_id, Number(row.points)]))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/contests", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const matchId = String(req.body?.matchId || "");
    const entryFee = Number(req.body?.entryFee);
    const salaryCap = Number(req.body?.salaryCap || 100);
    const maxEntries = Number(req.body?.maxEntries);
    const maxEntriesPerUser = Number(req.body?.maxEntriesPerUser || 1);
    const lockAt = new Date(req.body?.lockAt);
    const startsAt = new Date(req.body?.startsAt);
    const prizePool = Number(req.body?.prizePool);
    const tiers = Array.isArray(req.body?.tiers) ? req.body.tiers : [];
    if (!name || !matchId) throw Object.assign(new Error("Contest name and match are required."), { status: 400, code: "invalid_contest" });
    if (![entryFee, salaryCap, maxEntries, maxEntriesPerUser, prizePool].every((value) => Number.isFinite(value) && value > 0)) {
      throw Object.assign(new Error("Entry fee, salary cap, max entries and prize pool must be positive."), { status: 400, code: "invalid_contest" });
    }
    if (Number.isNaN(lockAt.getTime()) || Number.isNaN(startsAt.getTime()) || lockAt >= startsAt) {
      throw Object.assign(new Error("Lock time must be before the contest start time."), { status: 400, code: "invalid_times" });
    }
    const match = await query("SELECT id, sport, league, home_team, away_team FROM matches WHERE id=$1", [matchId]);
    if (!match.rows[0]) throw Object.assign(new Error("Match not found."), { status: 404, code: "not_found" });
    const pool = await query(
      `SELECT
         (SELECT COUNT(*) FROM fantasy_players WHERE team=$1 AND active=true) AS home,
         (SELECT COUNT(*) FROM fantasy_players WHERE team=$2 AND active=true) AS away`,
      [match.rows[0].home_team, match.rows[0].away_team]
    );
    if (Number(pool.rows[0].home) < 11 || Number(pool.rows[0].away) < 11) {
      throw Object.assign(new Error("Both teams need at least 11 active fantasy players before a contest can be created."), { status: 400, code: "player_pool_missing" });
    }
    if (!tiers.length) throw Object.assign(new Error("Add at least one prize tier."), { status: 400, code: "invalid_prizes" });
    let tierTotal = 0;
    const normalized = tiers.map((tier) => {
      const rankFrom = Number(tier.rankFrom);
      const rankTo = Number(tier.rankTo);
      const amount = Number(tier.amount);
      if (![rankFrom, rankTo, amount].every((value) => Number.isFinite(value)) || rankFrom < 1 || rankTo < rankFrom || amount < 0) {
        throw Object.assign(new Error("Prize tiers must have valid rank ranges and amounts."), { status: 400, code: "invalid_prizes" });
      }
      tierTotal += amount * (rankTo - rankFrom + 1);
      return { rankFrom, rankTo, amount };
    });
    if (tierTotal > prizePool) throw Object.assign(new Error("Prize tiers cannot exceed the prize pool."), { status: 400, code: "invalid_prizes" });
    const result = await withTransaction(async (client) => {
      const contest = await client.query(
        `INSERT INTO fantasy_contests
          (name, sport, match_id, status, salary_cap, entry_fee, max_entries, max_entries_per_user,
           prize_pool, rake_percent, lock_at, starts_at, rules, created_by)
         VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [name, match.rows[0].sport, matchId, salaryCap, entryFee, maxEntries, maxEntriesPerUser, prizePool,
         10, lockAt.toISOString(), startsAt.toISOString(), JSON.stringify({
           positions: { wk: 1, bat: 4, ar: 3, bowl: 3 },
           maxFromOneTeam: 7, captainMultiplier: 2, viceCaptainMultiplier: 1.5,
           tieBreak: "Earlier entry wins the higher rank when scores are equal.", sandbox: true
         }), req.account.id]
      );
      for (const tier of normalized) {
        await client.query(
          "INSERT INTO fantasy_prize_tiers (contest_id, rank_from, rank_to, amount) VALUES ($1,$2,$3,$4)",
          [contest.rows[0].id, tier.rankFrom, tier.rankTo, tier.amount]
        );
      }
      await appendAudit(client, {
        actorId: req.account.id, action: "fantasy.contest_created", entityType: "fantasy_contest",
        entityId: contest.rows[0].id, summary: `Created fantasy contest ${name}`,
        after: { matchId, entryFee, prizePool, tiers: normalized }, ip: requestMeta(req).ip
      });
      return contest.rows[0];
    });
    res.status(201).json({ contest: serialize({ ...result, league: match.rows[0].league, home_team: match.rows[0].home_team, away_team: match.rows[0].away_team }), message: "Fantasy contest created." });
  } catch (error) {
    next(error);
  }
});

router.post("/contests/:id/scores", async (req, res, next) => {
  try {
    const scores = Array.isArray(req.body?.scores) ? req.body.scores : [];
    const result = await saveFantasyScores({ contestId: req.params.id, scores, actorId: req.account.id, ip: requestMeta(req).ip });
    res.json({ updated: result.updated, message: "Player scores saved." });
  } catch (error) {
    next(error);
  }
});

router.post("/contests/:id/cancel", async (req, res, next) => {
  try {
    const result = await cancelFantasyContest({ contestId: req.params.id, actorId: req.account.id, ip: requestMeta(req).ip });
    res.json({ refunded: result.refunded, message: `Contest cancelled. ${result.refunded} entries refunded.` });
  } catch (error) {
    next(error);
  }
});

router.post("/contests/:id/settle", async (req, res, next) => {
  try {
    const result = await settleFantasyContest({ contestId: req.params.id, actorId: req.account.id, ip: requestMeta(req).ip });
    res.json({ entries: result.entries, totalPaid: result.totalPaid, message: "Fantasy contest settled." });
  } catch (error) {
    next(error);
  }
});

export default router;
