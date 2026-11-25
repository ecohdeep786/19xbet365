import express from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requestMeta } from "../lib/audit.js";
import {
  getFantasyContest,
  joinFantasyContest,
  refreshFantasyStatuses
} from "../services/fantasy.js";

const router = express.Router();

function serializeContest(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    matchId: row.match_id,
    league: row.league,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    status: row.status,
    salaryCap: Number(row.salary_cap),
    entryFee: Number(row.entry_fee),
    maxEntries: Number(row.max_entries),
    maxEntriesPerUser: Number(row.max_entries_per_user),
    prizePool: Number(row.prize_pool),
    rakePercent: Number(row.rake_percent),
    lockAt: row.lock_at,
    startTime: row.starts_at,
    settledAt: row.settled_at,
    entries: Number(row.entries || 0),
    collected: Number(row.collected || 0),
    rules: row.rules || {}
  };
}

function serializeEntry(row) {
  return {
    id: row.id,
    contestId: row.contest_id,
    lineup: row.lineup,
    captainId: row.captain_id,
    viceCaptainId: row.vice_captain_id,
    entryFee: Number(row.entry_fee),
    status: row.status,
    score: Number(row.score),
    rank: row.rank == null ? null : Number(row.rank),
    payout: Number(row.payout),
    createdAt: row.created_at,
    settledAt: row.settled_at
  };
}

router.get("/contests", async (req, res, next) => {
  try {
    await refreshFantasyStatuses();
    const accountId = req.account?.id || null;
    const result = await query(
      `SELECT fc.*, m.league, m.home_team, m.away_team,
              (SELECT COUNT(*) FROM fantasy_entries fe WHERE fe.contest_id=fc.id AND fe.status='confirmed') AS entries,
              (SELECT COALESCE(SUM(fe.entry_fee),0) FROM fantasy_entries fe WHERE fe.contest_id=fc.id AND fe.status='confirmed') AS collected,
              ${accountId ? "(SELECT COUNT(*) FROM fantasy_entries me WHERE me.contest_id=fc.id AND me.account_id=$1 AND me.status='confirmed')" : "0"} AS my_entries
       FROM fantasy_contests fc
       JOIN matches m ON m.id=fc.match_id
       WHERE fc.status <> 'draft'
       ORDER BY CASE fc.status WHEN 'open' THEN 0 WHEN 'locked' THEN 1 WHEN 'live' THEN 2 WHEN 'settled' THEN 3 ELSE 4 END, fc.lock_at ASC
       LIMIT 50`,
      accountId ? [accountId] : []
    );
    res.json({
      contests: result.rows.map((row) => ({ ...serializeContest(row), myEntries: Number(row.my_entries || 0) }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/contests/:id", async (req, res, next) => {
  try {
    await refreshFantasyStatuses();
    const data = await getFantasyContest(req.params.id, req.account?.id || null);
    if (!data) return res.status(404).json({ error: "not_found", message: "Fantasy contest not found." });
    const entries = data.contest.entries;
    res.json({
      contest: {
        ...serializeContest(data.contest),
        entries: Number(entries),
        collected: Number(data.contest.collected)
      },
      tiers: data.tiers.map((tier) => ({ rankFrom: Number(tier.rank_from), rankTo: Number(tier.rank_to), amount: Number(tier.amount) })),
      players: data.players.map((player) => ({ id: player.id, team: player.team, name: player.name, role: player.role, salary: Number(player.salary) })),
      rules: data.rules,
      myEntries: data.myEntries.map(serializeEntry),
      leaderboard: data.leaderboard.map((row) => ({
        entryId: row.id, accountId: row.account_id, player: row.display_name,
        score: Number(row.score), rank: Number(row.rank), payout: Number(row.payout)
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/my-entries", requireAuth, async (req, res, next) => {
  try {
    await refreshFantasyStatuses();
    const result = await query(
      `SELECT fe.*, fc.name, fc.status AS contest_status, fc.starts_at, fc.prize_pool,
              m.home_team, m.away_team, m.league
       FROM fantasy_entries fe
       JOIN fantasy_contests fc ON fc.id=fe.contest_id
       JOIN matches m ON m.id=fc.match_id
       WHERE fe.account_id=$1
       ORDER BY fe.created_at DESC LIMIT 100`,
      [req.account.id]
    );
    res.json({
      entries: result.rows.map((row) => ({
        ...serializeEntry(row),
        contestName: row.name,
        contestStatus: row.contest_status,
        startTime: row.starts_at,
        prizePool: Number(row.prize_pool),
        league: row.league,
        homeTeam: row.home_team,
        awayTeam: row.away_team
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/contests/:id/entries", requireAuth, async (req, res, next) => {
  try {
    const lineup = Array.isArray(req.body?.lineup) ? req.body.lineup.map(String) : [];
    const result = await joinFantasyContest({
      contestId: req.params.id,
      accountId: req.account.id,
      lineup,
      captainId: String(req.body?.captainId || ""),
      viceCaptainId: String(req.body?.viceCaptainId || ""),
      ip: requestMeta(req).ip
    });
    res.status(201).json({
      entry: serializeEntry(result.entry),
      balance: result.balance,
      message: "Fantasy entry confirmed."
    });
  } catch (error) {
    next(error);
  }
});

export default router;
