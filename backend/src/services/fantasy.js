import crypto from "node:crypto";
import { query, withTransaction } from "../db.js";
import { appendAudit } from "../lib/audit.js";
import { lockAccount, checkDailyLimit, debitStake, creditWin, refundStake } from "./wallet.js";
import { round2 } from "./gameEngine.js";

export const FANTASY_RULES = {
  cricket: {
    size: 11,
    roles: { wk: 1, bat: 4, ar: 3, bowl: 3 },
    maxFromOneTeam: 7,
    captainMultiplier: 2,
    viceCaptainMultiplier: 1.5
  }
};

export async function refreshFantasyStatuses() {
  await query("UPDATE fantasy_contests SET status='locked', updated_at=now() WHERE status='open' AND lock_at <= now()");
  await query("UPDATE fantasy_contests SET status='live', updated_at=now() WHERE status='locked' AND starts_at <= now()");
}

export function startFantasyWorker() {
  const timer = setInterval(() => {
    refreshFantasyStatuses().catch((error) => console.error("[fantasy] status refresh failed", error.message));
  }, 60_000);
  timer.unref();
  return timer;
}

export async function getFantasyContest(id, accountId = null) {
  const contest = await query(
    `SELECT fc.*, m.home_team, m.away_team, m.league, m.start_time AS match_start, m.status AS match_status,
            COUNT(fe.id) FILTER (WHERE fe.status='confirmed') AS entries,
            COALESCE(SUM(fe.entry_fee) FILTER (WHERE fe.status='confirmed'),0) AS collected
     FROM fantasy_contests fc
     JOIN matches m ON m.id = fc.match_id
     LEFT JOIN fantasy_entries fe ON fe.contest_id = fc.id
     WHERE fc.id = $1
     GROUP BY fc.id, m.home_team, m.away_team, m.league, m.start_time, m.status`,
    [id]
  );
  if (!contest.rows[0]) return null;
  const tiers = await query("SELECT rank_from, rank_to, amount FROM fantasy_prize_tiers WHERE contest_id=$1 ORDER BY rank_from", [id]);
  const players = await query(
    `SELECT id, team, name, role, salary FROM fantasy_players
     WHERE sport=$1 AND active=true AND team = ANY($2::text[]) ORDER BY team, role, salary DESC, name`,
    [contest.rows[0].sport, [contest.rows[0].home_team, contest.rows[0].away_team]]
  );
  const myEntries = accountId
    ? await query("SELECT * FROM fantasy_entries WHERE contest_id=$1 AND account_id=$2 ORDER BY created_at DESC", [id, accountId])
    : { rows: [] };
  const leaderboard = contest.rows[0].status === "settled"
    ? await query(
        `SELECT fe.id, fe.account_id, a.display_name, fe.score, fe.rank, fe.payout
         FROM fantasy_entries fe JOIN accounts a ON a.id=fe.account_id
         WHERE fe.contest_id=$1 AND fe.status='settled' ORDER BY fe.score DESC, fe.created_at ASC LIMIT 100`,
        [id]
      )
    : { rows: [] };
  return {
    contest: contest.rows[0],
    tiers: tiers.rows,
    players: players.rows,
    myEntries: myEntries.rows,
    leaderboard: leaderboard.rows,
    rules: FANTASY_RULES[contest.rows[0].sport] || FANTASY_RULES.cricket
  };
}

export function validateLineup(contest, players, lineup, captainId, viceCaptainId) {
  const rules = FANTASY_RULES[contest.sport] || FANTASY_RULES.cricket;
  const ids = Array.isArray(lineup) ? lineup.map(String) : [];
  if (new Set(ids).size !== ids.length) throw Object.assign(new Error("Each player can be selected only once."), { status: 400, code: "duplicate_player" });
  if (ids.length !== rules.size) throw Object.assign(new Error(`Select exactly ${rules.size} players.`), { status: 400, code: "invalid_lineup_size" });
  const byId = new Map(players.map((player) => [player.id, player]));
  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  if (selected.length !== rules.size) throw Object.assign(new Error("One or more players are not available in this contest."), { status: 400, code: "unknown_player" });
  const salaries = selected.reduce((sum, player) => sum + Number(player.salary), 0);
  if (salaries > Number(contest.salary_cap)) throw Object.assign(new Error(`The salary cap is ${Number(contest.salary_cap).toFixed(2)} credits. Remove a player or choose a cheaper lineup.`), { status: 400, code: "salary_cap" });
  const counts = { wk: 0, bat: 0, ar: 0, bowl: 0 };
  const teamCounts = {};
  for (const player of selected) {
    counts[player.role] += 1;
    teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
  }
  for (const [role, required] of Object.entries(rules.roles)) {
    if (counts[role] !== required) throw Object.assign(new Error(`Select exactly ${required} ${role.toUpperCase()} player${required === 1 ? "" : "s"}.`), { status: 400, code: "role_quota" });
  }
  if (Object.values(teamCounts).some((count) => count > rules.maxFromOneTeam)) {
    throw Object.assign(new Error(`Select no more than ${rules.maxFromOneTeam} players from one team.`), { status: 400, code: "team_limit" });
  }
  if (!selected.some((player) => player.id === captainId) || !selected.some((player) => player.id === viceCaptainId) || captainId === viceCaptainId) {
    throw Object.assign(new Error("Choose a captain and vice-captain from your selected lineup."), { status: 400, code: "invalid_captain" });
  }
  return { selected, salaries, counts, rules };
}

export async function joinFantasyContest({ contestId, accountId, lineup, captainId, viceCaptainId, ip = null }) {
  return withTransaction(async (client) => {
    const contestResult = await client.query("SELECT * FROM fantasy_contests WHERE id=$1 FOR UPDATE", [contestId]);
    const contest = contestResult.rows[0];
    if (!contest) throw Object.assign(new Error("Fantasy contest not found."), { status: 404, code: "not_found" });
    if (contest.status !== "open" || new Date(contest.lock_at).getTime() <= Date.now()) {
      throw Object.assign(new Error("This contest is locked and no longer accepting entries."), { status: 409, code: "contest_locked" });
    }
    const match = await client.query("SELECT home_team, away_team FROM matches WHERE id=$1", [contest.match_id]);
    const players = await client.query(
      "SELECT id, team, name, role, salary FROM fantasy_players WHERE sport=$1 AND active=true AND team = ANY($2::text[])",
      [contest.sport, [match.rows[0].home_team, match.rows[0].away_team]]
    );
    const validation = validateLineup(contest, players.rows, lineup, captainId, viceCaptainId);
    const entryCount = await client.query("SELECT COUNT(*) AS count FROM fantasy_entries WHERE contest_id=$1 AND status='confirmed'", [contestId]);
    if (Number(entryCount.rows[0].count) >= contest.max_entries) throw Object.assign(new Error("This contest is full."), { status: 409, code: "contest_full" });
    const userEntries = await client.query("SELECT COUNT(*) AS count FROM fantasy_entries WHERE contest_id=$1 AND account_id=$2 AND status='confirmed'", [contestId, accountId]);
    if (Number(userEntries.rows[0].count) >= contest.max_entries_per_user) throw Object.assign(new Error("You have reached the entry limit for this contest."), { status: 409, code: "entry_limit" });
    const account = await lockAccount(client, accountId);
    if (!account || account.status !== "active") throw Object.assign(new Error("This account cannot enter contests right now."), { status: 403, code: "account_restricted" });
    if (Number(account.balance) < Number(contest.entry_fee)) throw Object.assign(new Error("Your coin balance is too low for this entry."), { status: 400, code: "insufficient_balance" });
    await checkDailyLimit(client, accountId, Number(contest.entry_fee));
    const entryId = crypto.randomUUID();
    const debit = await debitStake(client, accountId, Number(contest.entry_fee), `Fantasy entry · ${contest.name}`, "fantasy_entry", entryId, "fantasy_entry");
    const entry = await client.query(
      `INSERT INTO fantasy_entries (id, contest_id, account_id, lineup, captain_id, vice_captain_id, entry_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [entryId, contestId, accountId, JSON.stringify(validation.selected.map((player) => player.id)), captainId, viceCaptainId, contest.entry_fee]
    );
    await client.query(
      "INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'game',$4)",
      [accountId, "Fantasy entry confirmed", `${contest.name}: ${Number(contest.entry_fee).toFixed(2)} coins entered. Your lineup locks 5 minutes before the match.`, `/fantasy/${contestId}`]
    );
    await appendAudit(client, {
      actorId: accountId,
      action: "fantasy.entry_created",
      entityType: "fantasy_entry",
      entityId: entry.rows[0].id,
      summary: `Fantasy entry created for ${contest.name}`,
      after: { contestId, lineup, captainId, viceCaptainId, fee: Number(contest.entry_fee) },
      ip
    });
    return { entry: entry.rows[0], balance: debit.balance, contest };
  });
}

export async function cancelFantasyContest({ contestId, actorId, ip = null }) {
  return withTransaction(async (client) => {
    const result = await client.query("SELECT * FROM fantasy_contests WHERE id=$1 FOR UPDATE", [contestId]);
    const contest = result.rows[0];
    if (!contest) throw Object.assign(new Error("Fantasy contest not found."), { status: 404, code: "not_found" });
    if (contest.status === "settled") throw Object.assign(new Error("A settled contest cannot be cancelled."), { status: 409, code: "already_settled" });
    if (contest.status === "cancelled") return { contest, refunded: 0 };
    const entries = await client.query("SELECT * FROM fantasy_entries WHERE contest_id=$1 AND status='confirmed' FOR UPDATE", [contestId]);
    for (const entry of entries.rows) {
      await refundStake(client, entry.account_id, Number(entry.entry_fee), `Fantasy contest cancelled · ${contest.name}`, entry.id, "fantasy_entry", "fantasy_refund");
      await client.query("UPDATE fantasy_entries SET status='cancelled', settled_at=now() WHERE id=$1", [entry.id]);
      await client.query(
        "INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'system',$4)",
        [entry.account_id, "Fantasy contest cancelled", `${contest.name} was cancelled. Your ${Number(entry.entry_fee).toFixed(2)} coin entry was refunded.`, "/fantasy"]
      );
    }
    await client.query("UPDATE fantasy_contests SET status='cancelled', updated_at=now() WHERE id=$1", [contestId]);
    await appendAudit(client, {
      actorId,
      action: "fantasy.contest_cancelled",
      entityType: "fantasy_contest",
      entityId: contestId,
      summary: `Cancelled fantasy contest ${contest.name} and refunded ${entries.rows.length} entries`,
      after: { refunded: entries.rows.length },
      ip
    });
    return { contest: { ...contest, status: "cancelled" }, refunded: entries.rows.length };
  });
}

export async function saveFantasyScores({ contestId, scores, actorId, ip = null }) {
  return withTransaction(async (client) => {
    const contest = await client.query("SELECT * FROM fantasy_contests WHERE id=$1 FOR UPDATE", [contestId]);
    if (!contest.rows[0]) throw Object.assign(new Error("Fantasy contest not found."), { status: 404, code: "not_found" });
    if (contest.rows[0].status === "settled" || contest.rows[0].status === "cancelled") {
      throw Object.assign(new Error("Scores cannot be changed after settlement or cancellation."), { status: 409, code: "contest_closed" });
    }
    if (!Array.isArray(scores) || !scores.length) throw Object.assign(new Error("Provide at least one player score."), { status: 400, code: "invalid_scores" });
    for (const item of scores) {
      const playerId = String(item.playerId || "");
      const points = Number(item.points);
      if (!playerId || !Number.isFinite(points) || points < 0 || points > 1000) {
        throw Object.assign(new Error("Player scores must be between 0 and 1000."), { status: 400, code: "invalid_scores" });
      }
      await client.query(
        `INSERT INTO fantasy_player_stats (contest_id, player_id, points, stats, updated_at)
         VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (contest_id, player_id) DO UPDATE SET points=EXCLUDED.points, stats=EXCLUDED.stats, updated_at=now()`,
        [contestId, playerId, points, JSON.stringify(item.stats || {})]
      );
    }
    await appendAudit(client, {
      actorId,
      action: "fantasy.scores_updated",
      entityType: "fantasy_contest",
      entityId: contestId,
      summary: `Updated ${scores.length} fantasy player scores`,
      after: { scores: scores.map((item) => ({ playerId: item.playerId, points: item.points })) },
      ip
    });
    return { updated: scores.length };
  });
}

function prizesForRanks(tiers, from, to) {
  let total = 0;
  for (let rank = from; rank <= to; rank += 1) {
    for (const tier of tiers) {
      if (rank >= tier.rank_from && rank <= tier.rank_to) total += Number(tier.amount);
    }
  }
  return round2(total);
}

export async function settleFantasyContest({ contestId, actorId, ip = null }) {
  return withTransaction(async (client) => {
    const result = await client.query("SELECT * FROM fantasy_contests WHERE id=$1 FOR UPDATE", [contestId]);
    const contest = result.rows[0];
    if (!contest) throw Object.assign(new Error("Fantasy contest not found."), { status: 404, code: "not_found" });
    if (contest.status === "settled") throw Object.assign(new Error("This contest has already been settled."), { status: 409, code: "already_settled" });
    if (contest.status === "cancelled") throw Object.assign(new Error("A cancelled contest cannot be settled."), { status: 409, code: "cancelled" });
    const existing = await client.query("SELECT id FROM fantasy_settlements WHERE contest_id=$1", [contestId]);
    if (existing.rows[0]) throw Object.assign(new Error("A settlement record already exists."), { status: 409, code: "already_settled" });
    const entriesResult = await client.query("SELECT * FROM fantasy_entries WHERE contest_id=$1 AND status='confirmed' ORDER BY created_at FOR UPDATE", [contestId]);
    const entries = entriesResult.rows;
    if (!entries.length) throw Object.assign(new Error("There are no confirmed entries to settle."), { status: 400, code: "no_entries" });
    const statsResult = await client.query("SELECT player_id, points FROM fantasy_player_stats WHERE contest_id=$1", [contestId]);
    const points = new Map(statsResult.rows.map((row) => [row.player_id, Number(row.points)]));
    for (const entry of entries) {
      const lineup = Array.isArray(entry.lineup) ? entry.lineup : [];
      if (lineup.some((playerId) => !points.has(playerId))) {
        throw Object.assign(new Error("Enter scores for every selected player before settling."), { status: 400, code: "incomplete_scores" });
      }
    }
    for (const entry of entries) {
      const lineup = entry.lineup;
      const base = lineup.reduce((sum, playerId) => {
        const multiplier = playerId === entry.captain_id ? 2 : playerId === entry.vice_captain_id ? 1.5 : 1;
        return sum + (points.get(playerId) || 0) * multiplier;
      }, 0);
      entry._score = round2(base);
    }
    entries.sort((a, b) => b._score - a._score || new Date(a.created_at) - new Date(b.created_at));
    const tiers = (await client.query("SELECT * FROM fantasy_prize_tiers WHERE contest_id=$1 ORDER BY rank_from", [contestId])).rows;
    let index = 0;
    let totalPaid = 0;
    const payouts = [];
    while (index < entries.length) {
      const score = entries[index]._score;
      let end = index;
      while (end + 1 < entries.length && entries[end + 1]._score === score) end += 1;
      const group = entries.slice(index, end + 1);
      const rankFrom = index + 1;
      const rankTo = end + 1;
      const totalPrize = prizesForRanks(tiers, rankFrom, rankTo);
      const baseShare = group.length ? round2(totalPrize / group.length) : 0;
      const remainder = round2(totalPrize - baseShare * group.length);
      group.forEach((entry, groupIndex) => {
        const payout = round2(baseShare + (groupIndex === group.length - 1 ? remainder : 0));
        entry._rank = rankFrom;
        entry._payout = payout;
        payouts.push({ entry, payout });
        totalPaid += payout;
      });
      index = end + 1;
    }
    for (const { entry, payout } of payouts) {
      await client.query(
        "UPDATE fantasy_entries SET status='settled', score=$1, rank=$2, payout=$3, settled_at=now() WHERE id=$4",
        [entry._score, entry._rank, payout, entry.id]
      );
      if (payout > 0) {
        await creditWin(client, entry.account_id, payout, `Fantasy prize · ${contest.name}`, "fantasy_entry", entry.id, "fantasy_win");
        await client.query(
          "INSERT INTO notifications (account_id, title, body, type, link) VALUES ($1,$2,$3,'game',$4)",
          [entry.account_id, "Fantasy prize credited", `${contest.name}: rank ${entry._rank} with ${entry._score.toFixed(2)} points. ${payout.toFixed(2)} coins credited.`, `/fantasy/${contestId}`]
        );
      }
    }
    await client.query("UPDATE fantasy_contests SET status='settled', settled_at=now(), updated_at=now() WHERE id=$1", [contestId]);
    const settlement = await client.query(
      `INSERT INTO fantasy_settlements (contest_id, settled_by, total_entries, total_paid, details)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [contestId, actorId, entries.length, round2(totalPaid), JSON.stringify({ payouts: payouts.map(({ entry, payout }) => ({ entryId: entry.id, accountId: entry.account_id, score: entry._score, rank: entry._rank, payout })) })]
    );
    await appendAudit(client, {
      actorId,
      action: "fantasy.contest_settled",
      entityType: "fantasy_contest",
      entityId: contestId,
      summary: `Settled ${contest.name}: ${entries.length} entries, ${totalPaid.toFixed(2)} coins paid`,
      after: { entries: entries.length, totalPaid: round2(totalPaid) },
      ip
    });
    return { settlement: settlement.rows[0], entries: entries.length, totalPaid: round2(totalPaid) };
  });
}
