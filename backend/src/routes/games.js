import crypto from "node:crypto";
import express from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { checkDailyLimit, creditWin, debitStake, lockAccount, refundStake, settleRound } from "../services/wallet.js";
import { crashMultiplier, crashPoint, minesMultiplier, playInstant, round2 } from "../services/gameEngine.js";
import { randomInt, sha256 } from "../lib/crypto.js";
import { broadcast } from "../ws.js";
import { rewardReferralIfEligible } from "../services/referrals.js";

const router = express.Router();

async function requirePlayableGame(gameId) {
  const result = await query("SELECT * FROM games WHERE id = $1 AND status <> 'hidden'", [gameId]);
  const game = result.rows[0];
  if (!game) throw Object.assign(new Error("Game not found."), { status: 404, code: "not_found" });
  if (!game.playable) {
    throw Object.assign(new Error("This title is integration-ready. A certified provider session is required before play can be enabled."), {
      status: 409,
      code: "provider_required"
    });
  }
  return game;
}

async function voidStaleRounds(client, accountId, gameId) {
  const stale = await client.query(
    "SELECT id, bet FROM game_rounds WHERE account_id = $1 AND game_id = $2 AND status = 'open' FOR UPDATE",
    [accountId, gameId]
  );
  for (const row of stale.rows) {
    await client.query(
      `UPDATE game_rounds SET status = 'void', payout = $1, created_at = created_at,
         outcome = $2, settled_at = now() WHERE id = $3`,
      [Number(row.bet), {
        game: gameId,
        multiplier: 1,
        win: false,
        voided: true,
        summary: "Previous open round voided — stake returned"
      }, row.id]
    );
    await refundStake(client, accountId, Number(row.bet), "Previous open round voided — stake returned", row.id);
  }
}

async function recordRecent(client, accountId, gameId) {
  await client.query(
    `INSERT INTO recent_plays (account_id, game_id, last_played_at) VALUES ($1,$2,now())
     ON CONFLICT (account_id, game_id) DO UPDATE SET last_played_at = now()`,
    [accountId, gameId]
  );
}

function crashState(row) {
  const state = row.state || {};
  return {
    crashPoint: Number(state.crashPoint),
    autoCashout: state.autoCashout == null ? null : Number(state.autoCashout),
    startedAt: row.created_at,
    serverSeedHash: row.server_seed_hash
  };
}

function publicRound(row) {
  return {
    id: row.id,
    gameId: row.game_id,
    bet: Number(row.bet),
    payout: Number(row.payout),
    status: row.status,
    outcome: row.outcome,
    createdAt: row.created_at,
    settledAt: row.settled_at
  };
}

router.get("/:gameId/activity", async (req, res, next) => {
  try {
    const [wins, totals] = await Promise.all([
      query(
        `SELECT gr.id, gr.payout, gr.bet, gr.outcome, gr.created_at, a.display_name
         FROM game_rounds gr JOIN accounts a ON a.id = gr.account_id
         WHERE gr.game_id = $1 AND gr.status = 'settled' AND gr.payout > gr.bet * 1.5
         ORDER BY gr.payout DESC, gr.created_at DESC LIMIT 8`,
        [req.params.gameId]
      ),
      query(
        `SELECT COUNT(*) AS rounds, COUNT(DISTINCT account_id) AS players,
                COALESCE(MAX(payout),0) AS largest_win
         FROM game_rounds WHERE game_id = $1 AND status = 'settled'`,
        [req.params.gameId]
      )
    ]);
    res.json({
      topWins: wins.rows.map((row) => ({
        id: row.id,
        payout: Number(row.payout),
        multiplier: row.outcome?.multiplier || round2(Number(row.payout) / Number(row.bet)),
        name: String(row.display_name).slice(0, 2) + "•••",
        createdAt: row.created_at
      })),
      stats: {
        rounds: Number(totals.rows[0].rounds),
        players: Number(totals.rows[0].players),
        largestWin: Number(totals.rows[0].largest_win)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:gameId/play", requireAuth, async (req, res, next) => {
  try {
    const game = await requirePlayableGame(req.params.gameId);
    if (["crash-orbit", "mines-vault"].includes(game.id)) {
      throw Object.assign(new Error("Use the multi-step endpoint for this game."), { status: 400, code: "invalid_endpoint" });
    }
    const stake = round2(Number(req.body?.stake));
    if (!Number.isFinite(stake) || stake < 5) throw Object.assign(new Error("The minimum game stake is 5 VC."), { status: 400, code: "invalid_stake" });
    if (stake > 5000) throw Object.assign(new Error("The maximum game stake is 5,000 VC."), { status: 400, code: "stake_limit" });
    const result = await withTransaction(async (client) => {
      const account = await lockAccount(client, req.account.id);
      await checkDailyLimit(client, req.account.id, stake);
      if (account.status !== "active") throw Object.assign(new Error("Account is restricted."), { status: 403, code: "account_restricted" });
      if (Number(account.balance) < stake) throw Object.assign(new Error("Insufficient virtual-credit balance."), { status: 400, code: "insufficient_balance" });
      const roundId = crypto.randomUUID();
      const debit = await debitStake(client, req.account.id, stake, `Game stake · ${game.name}`, "game_round", roundId);
      const played = playInstant(game.id, stake, req.body?.params || {});
      const payout = round2(stake * played.multiplier);
      await client.query(
        `INSERT INTO game_rounds (id, account_id, game_id, bet, payout, status, outcome, state, server_seed_hash, client_seed, nonce, settled_at)
         VALUES ($1,$2,$3,$4,$5,'settled',$6,$7,$8,$9,$10,now())`,
        [
          roundId, req.account.id, game.id, stake, payout,
          { ...played.outcome, gameName: game.name, summary: played.summary },
          {},
          sha256(`${roundId}:${req.account.id}:${game.id}`),
          String(req.body?.clientSeed || "").slice(0, 64) || null,
          Math.floor(Date.now() / 1000)
        ]
      );
      let newBalance = debit.balance;
      if (payout > 0) {
        const credited = await creditWin(client, req.account.id, payout, `Game win · ${game.name}`, "game_round", roundId);
        newBalance = credited.balance;
      }
      await recordRecent(client, req.account.id, game.id);
      const referralReward = await rewardReferralIfEligible(client, req.account.id);
      return { roundId, played, payout, balance: referralReward?.refereeBalance ?? newBalance, stake };
    });
    broadcast({ type: "game.settled", accountId: req.account.id, gameId: game.id, payout: result.payout });
    res.status(201).json({
      round: {
        id: result.roundId,
        gameId: game.id,
        gameName: game.name,
        bet: result.stake,
        payout: result.payout,
        status: "settled",
        outcome: { ...result.played.outcome, summary: result.played.summary },
        createdAt: new Date().toISOString()
      },
      balance: result.balance,
      message: result.payout > 0 ? `${game.name}: ${result.played.summary}` : `${game.name}: no win this time.`
    });
  } catch (error) {
    next(error);
  }
});

// Crash Orbit -----------------------------------------------------------------
router.post("/crash-orbit/start", requireAuth, async (req, res, next) => {
  try {
    const game = await requirePlayableGame("crash-orbit");
    const stake = round2(Number(req.body?.stake));
    const autoCashout = req.body?.autoCashout ? round2(Number(req.body.autoCashout)) : null;
    if (autoCashout != null && (autoCashout < 1.01 || autoCashout > 1000)) {
      throw Object.assign(new Error("Auto cash-out must be between 1.01x and 1,000x."), { status: 400, code: "invalid_auto_cashout" });
    }
    if (!Number.isFinite(stake) || stake < 5 || stake > 5000) {
      throw Object.assign(new Error("Stake must be between 5 and 5,000 VC."), { status: 400, code: "invalid_stake" });
    }
    const result = await withTransaction(async (client) => {
      await lockAccount(client, req.account.id);
      await voidStaleRounds(client, req.account.id, "crash-orbit");
      await checkDailyLimit(client, req.account.id, stake);
      const crash = crashPoint();
      const roundId = crypto.randomUUID();
      const serverSeed = crypto.randomBytes(24).toString("hex");
      const debit = await debitStake(client, req.account.id, stake, "Crash Orbit launch", "game_round", roundId);
      await client.query(
        `INSERT INTO game_rounds (id, account_id, game_id, bet, status, outcome, state, server_seed_hash)
         VALUES ($1,$2,$3,$4,'open','{}'::jsonb,$5,$6)`,
        [roundId, req.account.id, game.id, stake, { crashPoint: crash, autoCashout, serverSeed }, sha256(serverSeed)]
      );
      await recordRecent(client, req.account.id, game.id);
      return { roundId, serverSeedHash: sha256(serverSeed), balance: debit.balance, startedAt: new Date().toISOString(), autoCashout };
    });
    res.status(201).json({
      roundId: result.roundId,
      serverSeedHash: result.serverSeedHash,
      startedAt: result.startedAt,
      autoCashout: result.autoCashout,
      balance: result.balance,
      message: "Crash Orbit launched. Cash out before the round ends."
    });
  } catch (error) {
    next(error);
  }
});

router.get("/crash-orbit/:roundId/status", requireAuth, async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        `SELECT * FROM game_rounds WHERE id = $1 AND account_id = $2 AND game_id = 'crash-orbit' FOR UPDATE`,
        [req.params.roundId, req.account.id]
      );
      const row = locked.rows[0];
      if (!row) throw Object.assign(new Error("Round not found."), { status: 404, code: "not_found" });
      if (row.status !== "open") {
        return {
          row,
          current: row.outcome?.multiplier ?? 0,
          settled: true,
          crashPoint: row.outcome?.crashPoint,
          payout: Number(row.payout),
          balance: req.account.balance
        };
      }
      const state = crashState(row);
      const current = crashMultiplier(row.created_at);
      if (current >= state.crashPoint) {
        const settled = await settleRound(client, row.id, req.account.id, 0, {
          gameName: "Crash Orbit",
          crashPoint: state.crashPoint,
          bustedAt: state.crashPoint,
          summary: `Crashed at ${state.crashPoint.toFixed(2)}x`,
          win: false
        });
        const referralReward = await rewardReferralIfEligible(client, req.account.id);
        return { row: { ...row, status: "settled" }, current: state.crashPoint, settled: true, crashPoint: state.crashPoint, payout: 0, balance: referralReward?.refereeBalance ?? settled.balance };
      }
      if (state.autoCashout && current >= state.autoCashout && state.autoCashout < state.crashPoint) {
        const settled = await settleRound(client, row.id, req.account.id, state.autoCashout, {
          gameName: "Crash Orbit",
          crashPoint: state.crashPoint,
          autoCashout: true,
          summary: `Auto cash-out at ${state.autoCashout.toFixed(2)}x`,
          win: true
        });
        const referralReward = await rewardReferralIfEligible(client, req.account.id);
        return { row: { ...row, status: "settled" }, current: state.autoCashout, settled: true, crashPoint: state.crashPoint, payout: settled.payout, balance: referralReward?.refereeBalance ?? settled.balance, autoCashout: true };
      }
      return { row, current, settled: false };
    });
    res.json({
      roundId: req.params.roundId,
      status: result.settled ? "settled" : "open",
      multiplier: round2(result.current),
      crashPoint: result.settled ? result.crashPoint : undefined,
      payout: result.payout ?? 0,
      balance: result.balance ?? req.account.balance,
      won: result.settled ? Number(result.payout) > 0 : undefined,
      autoCashout: !!result.autoCashout
    });
  } catch (error) {
    next(error);
  }
});

router.post("/crash-orbit/:roundId/cashout", requireAuth, async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        `SELECT * FROM game_rounds WHERE id = $1 AND account_id = $2 AND game_id = 'crash-orbit' FOR UPDATE`,
        [req.params.roundId, req.account.id]
      );
      const row = locked.rows[0];
      if (!row) throw Object.assign(new Error("Round not found."), { status: 404, code: "not_found" });
      if (row.status !== "open") throw Object.assign(new Error("This round has already ended."), { status: 409, code: "round_settled" });
      const state = crashState(row);
      const current = crashMultiplier(row.created_at);
      if (current >= state.crashPoint) {
        const settled = await settleRound(client, row.id, req.account.id, 0, {
          gameName: "Crash Orbit",
          crashPoint: state.crashPoint,
          bustedAt: state.crashPoint,
          summary: `Crashed at ${state.crashPoint.toFixed(2)}x`,
          win: false
        });
        const referralReward = await rewardReferralIfEligible(client, req.account.id);
        return { busted: true, crashPoint: state.crashPoint, balance: referralReward?.refereeBalance ?? settled.balance, current };
      }
      const settled = await settleRound(client, row.id, req.account.id, current, {
        gameName: "Crash Orbit",
        crashPoint: state.crashPoint,
        summary: `Cashed out at ${current.toFixed(2)}x`,
        win: true
      });
      const referralReward = await rewardReferralIfEligible(client, req.account.id);
      return { busted: false, multiplier: current, payout: settled.payout, balance: referralReward?.refereeBalance ?? settled.balance, crashPoint: state.crashPoint };
    });
    broadcast({ type: "game.settled", accountId: req.account.id, gameId: "crash-orbit", payout: result.payout || 0 });
    if (result.busted) {
      return res.json({ status: "busted", crashPoint: result.crashPoint, multiplier: result.current, payout: 0, balance: result.balance, message: `Too late — crash at ${result.crashPoint.toFixed(2)}x.` });
    }
    res.json({ status: "cashed_out", multiplier: result.multiplier, payout: result.payout, balance: result.balance, crashPoint: result.crashPoint, message: `Cashed out at ${result.multiplier.toFixed(2)}x for ${result.payout.toFixed(2)} VC.` });
  } catch (error) {
    next(error);
  }
});

// Mines Vault -----------------------------------------------------------------
router.post("/mines-vault/start", requireAuth, async (req, res, next) => {
  try {
    const game = await requirePlayableGame("mines-vault");
    const stake = round2(Number(req.body?.stake));
    const minesCount = Math.max(1, Math.min(24, Number(req.body?.mines) || 3));
    if (!Number.isFinite(stake) || stake < 5 || stake > 5000) {
      throw Object.assign(new Error("Stake must be between 5 and 5,000 VC."), { status: 400, code: "invalid_stake" });
    }
    const result = await withTransaction(async (client) => {
      await lockAccount(client, req.account.id);
      await voidStaleRounds(client, req.account.id, "mines-vault");
      await checkDailyLimit(client, req.account.id, stake);
      const positions = new Set();
      while (positions.size < minesCount) positions.add(randomInt(0, 24));
      const roundId = crypto.randomUUID();
      const debit = await debitStake(client, req.account.id, stake, "Mines Vault entry", "game_round", roundId);
      await client.query(
        `INSERT INTO game_rounds (id, account_id, game_id, bet, status, outcome, state, server_seed_hash)
         VALUES ($1,$2,$3,$4,'open','{}'::jsonb,$5,$6)`,
        [roundId, req.account.id, game.id, stake, { mines: [...positions], revealed: [], minesCount }, sha256(roundId + "mines")]
      );
      await recordRecent(client, req.account.id, game.id);
      return { roundId, balance: debit.balance };
    });
    res.status(201).json({ roundId: result.roundId, minesCount, balance: result.balance, multiplier: 1, message: "Vault armed. Reveal a tile to begin." });
  } catch (error) {
    next(error);
  }
});

router.post("/mines-vault/:roundId/reveal", requireAuth, async (req, res, next) => {
  try {
    const tile = Number(req.body?.tile);
    if (!Number.isInteger(tile) || tile < 0 || tile > 24) throw Object.assign(new Error("Choose a valid tile."), { status: 400, code: "invalid_tile" });
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        `SELECT * FROM game_rounds WHERE id = $1 AND account_id = $2 AND game_id = 'mines-vault' FOR UPDATE`,
        [req.params.roundId, req.account.id]
      );
      const row = locked.rows[0];
      if (!row) throw Object.assign(new Error("Round not found."), { status: 404, code: "not_found" });
      if (row.status !== "open") throw Object.assign(new Error("This round is already closed."), { status: 409, code: "round_settled" });
      const state = { ...row.state };
      if (state.revealed.includes(tile)) throw Object.assign(new Error("That tile is already revealed."), { status: 400, code: "tile_revealed" });
      if (state.mines.includes(tile)) {
        const settled = await settleRound(client, row.id, req.account.id, 0, {
          gameName: "Mines Vault",
          mines: state.mines,
          hitTile: tile,
          revealed: state.revealed,
          summary: `Mine hit at tile ${tile + 1}`,
          win: false
        });
        const referralReward = await rewardReferralIfEligible(client, req.account.id);
        return { busted: true, mines: state.mines, hitTile: tile, revealed: state.revealed, payout: 0, balance: referralReward?.refereeBalance ?? settled.balance };
      }
      state.revealed = [...state.revealed, tile].sort((a, b) => a - b);
      const multiplier = minesMultiplier(state.minesCount, state.revealed.length);
      const clearedAllSafe = state.revealed.length === 25 - state.minesCount;
      if (clearedAllSafe) {
        const settled = await settleRound(client, row.id, req.account.id, multiplier, {
          gameName: "Mines Vault",
          mines: state.mines,
          revealed: state.revealed,
          summary: `Vault cleared at ${multiplier.toFixed(2)}x`,
          win: true
        });
        const referralReward = await rewardReferralIfEligible(client, req.account.id);
        return { safe: true, complete: true, mines: state.mines, revealed: state.revealed, multiplier, payout: settled.payout, balance: referralReward?.refereeBalance ?? settled.balance };
      }
      await client.query("UPDATE game_rounds SET state = $1 WHERE id = $2", [state, row.id]);
      return { safe: true, minesCount: state.minesCount, revealed: state.revealed, multiplier, balance: req.account.balance };
    });
    if (result.busted) {
      return res.json({ status: "busted", mines: result.mines, hitTile: result.hitTile, revealed: result.revealed, multiplier: 0, payout: 0, balance: result.balance, message: "Mine hit. Round over." });
    }
    res.json({
      status: result.complete ? "settled" : "open",
      safe: true,
      complete: !!result.complete,
      mines: result.mines,
      revealed: result.revealed,
      multiplier: result.multiplier,
      payout: result.payout ?? 0,
      balance: result.balance,
      message: result.complete ? `Vault cleared for ${result.payout.toFixed(2)} VC.` : `Safe. Current multiplier ${result.multiplier.toFixed(2)}x.`
    });
  } catch (error) {
    next(error);
  }
});

router.post("/mines-vault/:roundId/cashout", requireAuth, async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        `SELECT * FROM game_rounds WHERE id = $1 AND account_id = $2 AND game_id = 'mines-vault' FOR UPDATE`,
        [req.params.roundId, req.account.id]
      );
      const row = locked.rows[0];
      if (!row) throw Object.assign(new Error("Round not found."), { status: 404, code: "not_found" });
      if (row.status !== "open") throw Object.assign(new Error("This round is already closed."), { status: 409, code: "round_settled" });
      const state = row.state || {};
      const revealed = state.revealed || [];
      if (!revealed.length) throw Object.assign(new Error("Reveal at least one tile before cashing out."), { status: 400, code: "no_reveals" });
      const multiplier = minesMultiplier(state.minesCount, revealed.length);
      const settled = await settleRound(client, row.id, req.account.id, multiplier, {
        gameName: "Mines Vault",
        mines: state.mines,
        revealed,
        summary: `Cashed out at ${multiplier.toFixed(2)}x`,
        win: true
      });
      const referralReward = await rewardReferralIfEligible(client, req.account.id);
      return { multiplier, payout: settled.payout, balance: referralReward?.refereeBalance ?? settled.balance, mines: state.mines };
    });
    broadcast({ type: "game.settled", accountId: req.account.id, gameId: "mines-vault", payout: result.payout });
    res.json({ status: "settled", multiplier: result.multiplier, payout: result.payout, balance: result.balance, mines: result.mines, message: `Cashed out at ${result.multiplier.toFixed(2)}x for ${result.payout.toFixed(2)} VC.` });
  } catch (error) {
    next(error);
  }
});

router.get("/mines-vault/:roundId/state", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM game_rounds WHERE id = $1 AND account_id = $2 AND game_id = 'mines-vault'`,
      [req.params.roundId, req.account.id]
    );
    const row = result.rows[0];
    if (!row) throw Object.assign(new Error("Round not found."), { status: 404, code: "not_found" });
    const state = row.state || {};
    res.json({
      roundId: row.id,
      status: row.status,
      revealed: state.revealed || [],
      minesCount: state.minesCount,
      mines: row.status === "settled" ? state.mines || row.outcome?.mines : undefined,
      multiplier: row.status === "open" ? minesMultiplier(state.minesCount, (state.revealed || []).length) : row.outcome?.multiplier,
      payout: Number(row.payout),
      balance: req.account.balance
    });
  } catch (error) {
    next(error);
  }
});

export default router;
