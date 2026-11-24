import { withTransaction } from "../db.js";
import { appendAudit } from "../lib/audit.js";
import { randomInt } from "../lib/crypto.js";
import { lockAccount, creditWin, walletTransaction } from "./wallet.js";
import { round2 } from "./gameEngine.js";
import { broadcast } from "../ws.js";

const DEMO_DURATION_MINUTES = Math.max(5, Number(process.env.DEMO_MATCH_MINUTES || 90));
const SETTLEMENT_INTERVAL_MS = Math.max(10_000, Number(process.env.DEMO_SETTLEMENT_INTERVAL_MS || 60_000));

const SCORE_RANGES = {
  football: [0, 4],
  "table-tennis": [0, 4],
  tennis: [0, 3],
  "ice-hockey": [0, 6],
  basketball: [72, 118],
  esports: [0, 3],
  "horse-racing": [1, 12],
  volleyball: [0, 3],
  cricket: [90, 220],
  mma: [0, 3],
  baseball: [0, 12],
  badminton: [0, 3],
  "aussie-rules": [40, 120],
  handball: [18, 36],
  darts: [0, 3],
  snooker: [0, 5]
};

function finalScore(sport) {
  const [min, max] = SCORE_RANGES[sport] || [0, 5];
  return [randomInt(min, max), randomInt(min, max)];
}

function outcomeFor(home, away) {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

function scoreLabel(sport, score) {
  if (sport === "cricket") return `${score}/${randomInt(0, 9)}`;
  return String(score);
}

async function settleBetsForMatch(client, match) {
  const outcome = outcomeFor(match.result_home, match.result_away);
  await client.query(
    `UPDATE bet_selections
     SET result = CASE WHEN selection = $1 THEN 'won' ELSE 'lost' END
     WHERE match_id = $2 AND result = 'pending'`,
    [outcome, match.id]
  );

  const candidates = await client.query(
    `SELECT b.* FROM bets b
     WHERE b.status = 'open'
       AND EXISTS (SELECT 1 FROM bet_selections bs WHERE bs.bet_id = b.id AND bs.match_id = $1)
     FOR UPDATE`,
    [match.id]
  );

  const settled = [];
  for (const bet of candidates.rows) {
    const selections = await client.query(
      "SELECT result FROM bet_selections WHERE bet_id = $1",
      [bet.id]
    );
    if (selections.rows.some((row) => row.result === "pending")) continue;

    const results = selections.rows.map((row) => row.result);
    const status = results.includes("lost") ? "lost" : results.includes("void") ? "void" : "won";
    const payout = status === "won" ? Number(bet.potential_return) : status === "void" ? Number(bet.stake) : 0;
    await client.query(
      "UPDATE bets SET status = $1, payout = $2, settled_at = now() WHERE id = $3",
      [status, payout, bet.id]
    );

    let balance = null;
    if (payout > 0) {
      if (status === "void") {
        const account = await lockAccount(client, bet.account_id);
        balance = round2(Number(account.balance) + payout);
        await client.query("UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2", [balance, bet.account_id]);
        await walletTransaction(client, {
          accountId: bet.account_id,
          type: "bet_refund",
          amount: payout,
          balanceAfter: balance,
          description: "Sports bet voided · stake returned",
          referenceType: "sports_bet",
          referenceId: bet.id
        });
      } else {
        const credited = await creditWin(client, bet.account_id, payout, "Sports bet settled · win", "sports_bet", bet.id);
        balance = credited.balance;
      }
    }

    const title = status === "won" ? "Sports bet won" : status === "void" ? "Sports bet voided" : "Sports bet settled";
    const body = status === "won"
      ? `Your ${bet.type === "acca" ? "accumulator" : "single"} returned ${payout.toFixed(2)} VC.`
      : status === "void"
        ? `Your ${bet.type === "acca" ? "accumulator" : "single"} was voided and ${payout.toFixed(2)} VC was returned.`
        : `Your ${bet.type === "acca" ? "accumulator" : "single"} did not win.`;
    await client.query(
      `INSERT INTO notifications (account_id, title, body, type, link)
       VALUES ($1,$2,$3,'game','/account/bets')`,
      [bet.account_id, title, body]
    );

    await appendAudit(client, {
      action: "sportsbook.bet_settled",
      entityType: "bet",
      entityId: bet.id,
      summary: `${title} · ${payout.toFixed(2)} VC · fixture ${match.id}`,
      after: { status, payout, outcome, matchId: match.id },
      ip: "demo-settlement-worker"
    });

    settled.push({ betId: bet.id, accountId: bet.account_id, status, payout, balance });
  }
  return settled;
}

export async function runDemoSettlementCycle() {
  return withTransaction(async (client) => {
    const started = await client.query(
      `UPDATE matches
       SET status = 'live', minute = COALESCE(minute, 'LIVE')
       WHERE status = 'upcoming' AND is_demo AND start_time <= now()
       RETURNING id`
    );

    const due = await client.query(
      `SELECT * FROM matches
       WHERE status = 'live' AND is_demo
         AND start_time <= now() - ($1 * interval '1 minute')
       ORDER BY start_time ASC
       FOR UPDATE SKIP LOCKED`,
      [DEMO_DURATION_MINUTES]
    );

    const settlements = [];
    const finishedMatches = [];
    for (const match of due.rows) {
      let [home, away] = finalScore(match.sport);
      if (home === away && match.odds_draw == null) {
        if (randomInt(0, 1) === 0) home += 1;
        else away += 1;
      }
      await client.query(
        `UPDATE matches
         SET status = 'finished', minute = NULL, score_home = $1, score_away = $2,
             result_home = $3, result_away = $4, settled_at = now()
         WHERE id = $5`,
        [scoreLabel(match.sport, home), scoreLabel(match.sport, away), home, away, match.id]
      );
      const updated = { ...match, result_home: home, result_away: away };
      const bets = await settleBetsForMatch(client, updated);
      settlements.push(...bets);
      finishedMatches.push({ id: match.id, home, away, outcome: outcomeFor(home, away), bets: bets.length });
      await appendAudit(client, {
        action: "sportsbook.fixture_settled",
        entityType: "match",
        entityId: match.id,
        summary: `Demo fixture settled ${home}–${away} (${outcomeFor(home, away)}) · ${bets.length} bet${bets.length === 1 ? "" : "s"}`,
        after: { home, away, outcome: outcomeFor(home, away), bets: bets.length },
        ip: "demo-settlement-worker"
      });
    }

    return {
      started: started.rowCount,
      finished: finishedMatches.length,
      matches: finishedMatches,
      settled: settlements
    };
  }).then((result) => {
    for (const bet of result.settled) {
      broadcast({ type: "bet.settled", accountId: bet.accountId, betId: bet.betId, status: bet.status, payout: bet.payout });
    }
    return result;
  });
}

let workerRunning = false;

export function startDemoSettlementWorker() {
  if (process.env.DEMO_SETTLEMENT === "off") return null;
  const run = () => {
    if (workerRunning) return;
    workerRunning = true;
    runDemoSettlementCycle()
      .then((result) => {
        if (result.finished || result.started || result.settled.length) {
          console.log(`[sportsbook] demo settlement: ${result.finished} fixture(s) finished, ${result.settled.length} bet(s) settled`);
        }
      })
      .catch((error) => console.error("[sportsbook] demo settlement failed", error.message))
      .finally(() => { workerRunning = false; });
  };
  const initial = setTimeout(run, 3000);
  initial.unref();
  const timer = setInterval(run, SETTLEMENT_INTERVAL_MS);
  timer.unref();
  return timer;
}
