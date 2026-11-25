import crypto from "node:crypto";
import express from "express";
import { withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { checkDailyLimit, debitStake, lockAccount } from "../services/wallet.js";
import { round2 } from "../services/gameEngine.js";
import { getPlatformSettings } from "../lib/settings.js";
import { broadcast } from "../ws.js";

const router = express.Router();

const LABELS = {
  home: "Home",
  draw: "Draw",
  away: "Away"
};

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const selections = Array.isArray(req.body?.selections) ? req.body.selections : [];
    const stake = round2(Number(req.body?.stake));
    if (!selections.length || selections.length > 20) {
      throw Object.assign(new Error("Add between 1 and 20 selections to your bet slip."), { status: 400, code: "invalid_selections" });
    }
    if (!Number.isFinite(stake) || stake < 10) {
      throw Object.assign(new Error("The minimum coin stake is 10 coins."), { status: 400, code: "invalid_stake" });
    }
    const riskSettings = await getPlatformSettings(["maxSportsStake", "maxSportsPayout"]);
    const maxStake = Number(riskSettings.maxSportsStake ?? 5000);
    const maxPayout = Number(riskSettings.maxSportsPayout ?? 50000);
    if (Number.isFinite(maxStake) && stake > maxStake) {
      throw Object.assign(new Error(`The maximum sports stake is ${maxStake.toLocaleString("en-GB")} coins.`), { status: 400, code: "stake_limit" });
    }
    if (selections.length > 1 && req.body?.mode === "singles") {
      throw Object.assign(new Error("Multiple singles are not enabled in this build. Place a single bet or use an accumulator."), { status: 400, code: "unsupported_mode" });
    }
    const uniqueMatches = new Set(selections.map((item) => String(item.matchId)));
    if (uniqueMatches.size !== selections.length) {
      throw Object.assign(new Error("Each selection must be from a different fixture."), { status: 400, code: "duplicate_match" });
    }
    const result = await withTransaction(async (client) => {
      const matchIds = selections.map((item) => String(item.matchId));
      // Lock fixtures first and in a stable order so settlement cannot finish a
      // market between validation and bet insertion, and concurrent slips cannot
      // deadlock each other.
      const matches = await client.query(
        `SELECT * FROM matches WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
        [matchIds]
      );
      if (matches.rows.length !== matchIds.length) throw Object.assign(new Error("One or more fixtures are unavailable."), { status: 400, code: "match_unavailable" });
      const byId = new Map(matches.rows.map((row) => [row.id, row]));
      const prepared = selections.map((item) => {
        const match = byId.get(String(item.matchId));
        const selection = ["home", "draw", "away"].includes(item.selection) ? item.selection : null;
        if (!selection) throw Object.assign(new Error("Invalid selection."), { status: 400, code: "invalid_selection" });
        if (match.status === "finished" || match.status === "suspended") {
          throw Object.assign(new Error(`${match.home_team} vs ${match.away_team} is not accepting bets.`), { status: 400, code: "market_closed" });
        }
        const odds = selection === "home" ? match.odds_home : selection === "draw" ? match.odds_draw : match.odds_away;
        if (odds == null) throw Object.assign(new Error("That market is not available."), { status: 400, code: "market_closed" });
        return {
          matchId: match.id,
          selection,
          odds: Number(odds),
          selectionLabel: `${match.home_team} vs ${match.away_team} · ${selection === "home" ? match.home_team : selection === "away" ? match.away_team : "Draw"}`,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          league: match.league,
          sport: match.sport
        };
      });
      await lockAccount(client, req.account.id);
      await checkDailyLimit(client, req.account.id, stake);
      const totalOdds = round2(prepared.reduce((product, item) => product * item.odds, 1));
      const potentialReturn = round2(stake * totalOdds);
      if (Number.isFinite(maxPayout) && potentialReturn > maxPayout) {
        throw Object.assign(new Error(`The maximum potential return is ${maxPayout.toLocaleString("en-GB")} coins. Reduce the stake or remove selections.`), { status: 400, code: "payout_limit" });
      }
      const betId = crypto.randomUUID();
      const balance = await debitStake(client, req.account.id, stake, `Sports ${prepared.length > 1 ? "accumulator" : "single"} · ${prepared.length} selection${prepared.length > 1 ? "s" : ""}`, "sports_bet", betId);
      await client.query(
        `INSERT INTO bets (id, account_id, type, stake, total_odds, potential_return, status)
         VALUES ($1,$2,$3,$4,$5,$6,'open')`,
        [betId, req.account.id, prepared.length > 1 ? "acca" : "single", stake, totalOdds, potentialReturn]
      );
      for (const item of prepared) {
        await client.query(
          `INSERT INTO bet_selections (bet_id, match_id, selection, selection_label, odds)
           VALUES ($1,$2,$3,$4,$5)`,
          [betId, item.matchId, item.selection, item.selectionLabel, item.odds]
        );
      }
      await client.query(
        `INSERT INTO notifications (account_id, title, body, type, link)
         VALUES ($1,$2,$3,'game','/account/bets')`,
        [req.account.id, "Coin bet placed", `${prepared.length > 1 ? "Accumulator" : "Single"} · ${stake.toFixed(2)} coins at ${totalOdds.toFixed(2)} total odds. Potential return ${potentialReturn.toFixed(2)} coins.`]
      );
      return { betId, totalOdds, potentialReturn, balance: balance.balance, prepared };
    });
    broadcast({ type: "bet.placed", accountId: req.account.id, betId: result.betId, stake, odds: result.totalOdds });
    res.status(201).json({
      bet: {
        id: result.betId,
        type: result.prepared.length > 1 ? "acca" : "single",
        stake,
        totalOdds: result.totalOdds,
        potentialReturn: result.potentialReturn,
        selections: result.prepared,
        status: "open",
        placedAt: new Date().toISOString()
      },
      balance: result.balance,
      message: "Bet placed with coins."
    });
  } catch (error) {
    next(error);
  }
});

router.get("/labels", (req, res) => res.json({ labels: LABELS }));

export default router;
