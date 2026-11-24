import { query, pool } from "../backend/src/db.js";
import { runDemoSettlementCycle } from "../backend/src/services/sportsbook.js";

const base = "http://127.0.0.1:4000";
let cookie = "";

async function request(path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(";")[0];
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(data)}`);
  return data;
}

try {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "player@19xbet365.test", password: "19X#2026" })
  });
  const balanceBefore = Number(login.user.balance);

  const fixtures = (await query(
    `SELECT id, home_team, away_team, sport, odds_home, odds_away
     FROM matches
     WHERE status = 'upcoming' AND is_demo AND odds_home IS NOT NULL
       AND odds_away IS NOT NULL AND odds_draw IS NULL
     ORDER BY start_time ASC LIMIT 3`
  )).rows;
  if (fixtures.length < 3) throw new Error("Three upcoming two-way fixtures are required for settlement test.");
  const [singleFixture, accaHome, accaAway] = fixtures;

  const homeBet = await request("/api/bets", {
    method: "POST",
    body: JSON.stringify({ selections: [{ matchId: singleFixture.id, selection: "home" }], stake: 100 })
  });
  const awayBet = await request("/api/bets", {
    method: "POST",
    body: JSON.stringify({ selections: [{ matchId: singleFixture.id, selection: "away" }], stake: 100 })
  });
  const acca = await request("/api/bets", {
    method: "POST",
    body: JSON.stringify({
      selections: [
        { matchId: accaHome.id, selection: "home" },
        { matchId: accaAway.id, selection: "home" }
      ],
      stake: 100
    })
  });

  const allMatchIds = fixtures.map((row) => row.id);
  await query(
    "UPDATE matches SET status = 'live', start_time = now() - interval '2 hours' WHERE id = ANY($1::text[])",
    [allMatchIds]
  );

  const cycle = await runDemoSettlementCycle();
  const betIds = [homeBet.bet.id, awayBet.bet.id, acca.bet.id];
  const bets = (await query("SELECT * FROM bets WHERE id = ANY($1::uuid[])", [betIds])).rows;
  const selections = (await query(
    `SELECT bs.*, m.result_home, m.result_away, m.status AS match_status
     FROM bet_selections bs JOIN matches m ON m.id = bs.match_id
     WHERE bs.bet_id = ANY($1::uuid[])`,
    [betIds]
  )).rows;
  const matches = (await query("SELECT * FROM matches WHERE id = ANY($1::text[])", [allMatchIds])).rows;
  const account = (await query("SELECT balance FROM accounts WHERE email = 'player@19xbet365.test'")).rows[0];

  const resultFor = (id) => {
    const match = matches.find((row) => row.id === id);
    return match.result_home > match.result_away ? "home" : "away";
  };
  const singleOutcome = resultFor(singleFixture.id);
  const accaOutcomeA = resultFor(accaHome.id);
  const accaOutcomeB = resultFor(accaAway.id);
  const homeWon = singleOutcome === "home";
  const accaWon = accaOutcomeA === "home" && accaOutcomeB === "home";
  const singlePayout = Number(homeWon ? homeBet.bet.potentialReturn : awayBet.bet.potentialReturn);
  const accaPayout = accaWon ? Number(acca.bet.potentialReturn) : 0;
  const expectedBalance = balanceBefore - 300 + singlePayout + accaPayout;
  const byId = new Map(bets.map((row) => [row.id, row]));
  const singlesSelections = selections.filter((row) => row.bet_id === homeBet.bet.id || row.bet_id === awayBet.bet.id);
  const accaSelections = selections.filter((row) => row.bet_id === acca.bet.id);

  const checks = {
    fixturesFinished: matches.every((row) => row.status === "finished"),
    resultsRecorded: matches.every((row) => row.result_home != null && row.result_away != null),
    homeSelectionSettled: singlesSelections.find((row) => row.selection === "home")?.result === (homeWon ? "won" : "lost"),
    awaySelectionSettled: singlesSelections.find((row) => row.selection === "away")?.result === (homeWon ? "lost" : "won"),
    homeBetSettled: byId.get(homeBet.bet.id)?.status === (homeWon ? "won" : "lost"),
    awayBetSettled: byId.get(awayBet.bet.id)?.status === (homeWon ? "lost" : "won"),
    winningSinglePayout: Math.abs(Number((homeWon ? byId.get(homeBet.bet.id) : byId.get(awayBet.bet.id)).payout) - singlePayout) < 0.01,
    losingSinglePayoutZero: Number((homeWon ? byId.get(awayBet.bet.id) : byId.get(homeBet.bet.id)).payout) === 0,
    accaSelectionsSettled: accaSelections.every((row) => row.result === (resultFor(row.match_id) === "home" ? "won" : "lost")),
    accaStatusCorrect: byId.get(acca.bet.id)?.status === (accaWon ? "won" : "lost"),
    accaPayoutCorrect: Math.abs(Number(byId.get(acca.bet.id).payout) - accaPayout) < 0.01,
    balanceCorrect: Math.abs(Number(account.balance) - expectedBalance) < 0.01
  };
  console.log(JSON.stringify({
    fixtures: fixtures.map((row) => `${row.home_team} vs ${row.away_team}`),
    finalScores: matches.map((row) => `${row.result_home}-${row.result_away}`),
    singleResult: homeWon ? "home bet won" : "away bet won",
    accaStatus: byId.get(acca.bet.id).status,
    payouts: { single: singlePayout, acca: accaPayout },
    balanceBefore,
    balanceAfter: Number(account.balance),
    cycle: { started: cycle.started, finished: cycle.finished, betsSettled: cycle.settled.length },
    checks,
    pass: Object.values(checks).every(Boolean)
  }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} finally {
  await pool.end();
}
