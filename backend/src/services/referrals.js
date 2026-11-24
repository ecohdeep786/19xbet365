import { round2 } from "./gameEngine.js";
import { lockAccount, walletTransaction } from "./wallet.js";
import { appendAudit } from "../lib/audit.js";

const REWARD = 1000;

export async function rewardReferralIfEligible(client, refereeId) {
  const found = await client.query(
    `SELECT r.id, r.referrer_id, r.referee_id, r.status, a.status AS referrer_status
     FROM referrals r JOIN accounts a ON a.id = r.referrer_id
     WHERE r.referee_id = $1 AND r.status = 'pending'
     FOR UPDATE OF r`,
    [refereeId]
  );
  const referral = found.rows[0];
  if (!referral) return null;
  if (referral.referrer_status !== "active") {
    await client.query("UPDATE referrals SET status = 'void' WHERE id = $1", [referral.id]);
    return null;
  }

  await client.query("UPDATE referrals SET status = 'rewarded' WHERE id = $1", [referral.id]);
  let refereeBalance = null;
  for (const accountId of [referral.referrer_id, referral.referee_id]) {
    const account = await lockAccount(client, accountId);
    if (!account || account.status !== "active") continue;
    const balance = round2(Number(account.balance) + REWARD);
    await client.query("UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2", [balance, accountId]);
    await walletTransaction(client, {
      accountId,
      type: "referral_reward",
      amount: REWARD,
      balanceAfter: balance,
      description: "Referral reward — first qualifying round",
      referenceType: "referral",
      referenceId: referral.id
    });
    if (accountId === referral.referee_id) refereeBalance = balance;
    await client.query(
      `INSERT INTO notifications (account_id, title, body, type, link)
       VALUES ($1, 'Referral reward credited', $2, 'promo', '/account/referrals')`,
      [accountId, `${REWARD.toFixed(0)} coins were added for a completed referral. This reward has no cash value.`]
    );
  }
  await appendAudit(client, {
    actorId: refereeId,
    action: "referral.rewarded",
    entityType: "referral",
    entityId: referral.id,
    summary: `Referral qualified; ${REWARD.toFixed(0)} coins credited to both accounts`,
    after: { referrerId: referral.referrer_id, refereeId: referral.referee_id, amount: REWARD },
    ip: null
  });
  return { referralId: referral.id, referrerId: referral.referrer_id, refereeId: referral.referee_id, amount: REWARD, refereeBalance };
}
