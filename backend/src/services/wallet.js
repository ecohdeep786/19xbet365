import { round2 } from "./gameEngine.js";

export async function lockAccount(client, accountId) {
  const result = await client.query(
    "SELECT id, balance, xp, level, status FROM accounts WHERE id = $1 FOR UPDATE",
    [accountId]
  );
  return result.rows[0];
}

export async function ensureCanWager(accountRow, bet) {
  if (!accountRow) throw Object.assign(new Error("Account not found."), { status: 404, code: "not_found" });
  if (accountRow.status !== "active") throw Object.assign(new Error("This account cannot place wagers right now."), { status: 403, code: "account_restricted" });
  if (!Number.isFinite(bet) || bet <= 0) throw Object.assign(new Error("Enter a valid virtual-credit stake."), { status: 400, code: "invalid_stake" });
  if (bet > 5000) throw Object.assign(new Error("The maximum stake per round is 5,000 VC."), { status: 400, code: "stake_limit" });
  if (Number(accountRow.balance) < bet) throw Object.assign(new Error("Your virtual-credit balance is too low for that stake."), { status: 400, code: "insufficient_balance" });
}

export async function checkDailyLimit(client, accountId, bet) {
  const limits = await client.query("SELECT daily_bet_limit, self_exclusion_until, cool_off_until FROM responsible_limits WHERE account_id = $1", [accountId]);
  const limit = limits.rows[0];
  if (!limit) return;
  const now = Date.now();
  if (limit.self_exclusion_until && new Date(limit.self_exclusion_until).getTime() > now) {
    throw Object.assign(new Error("Self-exclusion is active on this account."), { status: 403, code: "self_excluded" });
  }
  if (limit.cool_off_until && new Date(limit.cool_off_until).getTime() > now) {
    throw Object.assign(new Error("A cool-off period is active on this account."), { status: 403, code: "cool_off" });
  }
  if (limit.daily_bet_limit) {
    const spent = await client.query(
      `SELECT COALESCE(SUM(ABS(amount)),0) AS total FROM transactions
       WHERE account_id = $1 AND type IN ('game_stake','bet_stake') AND created_at::date = CURRENT_DATE`,
      [accountId]
    );
    if (Number(spent.rows[0].total) + bet > Number(limit.daily_bet_limit)) {
      throw Object.assign(new Error("This wager would exceed your daily virtual-credit limit."), { status: 403, code: "responsible_limit" });
    }
  }
}

export async function walletTransaction(client, { accountId, type, amount, balanceAfter, description, referenceType = null, referenceId = null, createdBy = null }) {
  await client.query(
    `INSERT INTO transactions (account_id, type, amount, balance_after, description, reference_type, reference_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [accountId, type, amount, balanceAfter, description, referenceType, referenceId, createdBy]
  );
}

export async function debitStake(client, accountId, stake, description, referenceType, referenceId) {
  const account = await lockAccount(client, accountId);
  await ensureCanWager(account, stake);
  const balance = round2(Number(account.balance) - stake);
  await client.query("UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2", [balance, accountId]);
  await walletTransaction(client, {
    accountId,
    type: referenceType === "sports_bet" ? "bet_stake" : "game_stake",
    amount: -stake,
    balanceAfter: balance,
    description,
    referenceType,
    referenceId
  });
  return { balance, before: Number(account.balance), account };
}

export async function refundStake(client, accountId, amount, description, referenceId) {
  const account = await lockAccount(client, accountId);
  const balance = round2(Number(account.balance) + Number(amount));
  await client.query("UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2", [balance, accountId]);
  await walletTransaction(client, {
    accountId,
    type: "bet_refund",
    amount,
    balanceAfter: balance,
    description,
    referenceType: "game_round",
    referenceId
  });
  return balance;
}

export async function creditWin(client, accountId, amount, description, referenceType, referenceId) {
  const account = await lockAccount(client, accountId);
  const balance = round2(Number(account.balance) + amount);
  const xp = account.xp + Math.max(1, Math.floor(Number(amount) / 10));
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 250)) + 1);
  await client.query("UPDATE accounts SET balance = $1, xp = $2, level = $3, updated_at = now() WHERE id = $4", [balance, xp, level, accountId]);
  await walletTransaction(client, {
    accountId,
    type: referenceType === "sports_bet" ? "bet_win" : "game_win",
    amount,
    balanceAfter: balance,
    description,
    referenceType,
    referenceId
  });
  return { balance, xp, level };
}

export async function settleRound(client, roundId, accountId, multiplier, extraOutcome, status = "settled") {
  const locked = await client.query(
    "SELECT * FROM game_rounds WHERE id = $1 AND account_id = $2 FOR UPDATE",
    [roundId, accountId]
  );
  const round = locked.rows[0];
  if (!round) throw Object.assign(new Error("Round not found."), { status: 404, code: "not_found" });
  if (round.status !== "open") throw Object.assign(new Error("This round has already been settled."), { status: 409, code: "round_settled" });
  const payout = round2(Number(round.bet) * Math.max(0, multiplier));
  const outcome = { ...(round.outcome || {}), ...extraOutcome, multiplier: round2(Math.max(0, multiplier)), payout };
  await client.query(
    "UPDATE game_rounds SET status = $1, payout = $2, outcome = $3, settled_at = now() WHERE id = $4",
    [status, payout, outcome, roundId]
  );
  let balance;
  if (payout > 0) {
    const credited = await creditWin(client, accountId, payout, `Game win · ${extraOutcome?.gameName || round.game_id}`, "game_round", roundId);
    balance = credited.balance;
  } else {
    const account = await lockAccount(client, accountId);
    balance = Number(account.balance);
  }
  return { payout, outcome, balance };
}
