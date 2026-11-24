import express from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { appendAudit, requestMeta } from "../lib/audit.js";
import { serializeGames } from "../lib/gameMapper.js";

const router = express.Router();

router.get("/overview", requireAuth, async (req, res, next) => {
  try {
    const accountId = req.account.id;
    const [bets, rounds, txns, recentRounds, notifications, favorites, limits, referrals, tickets] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open') AS open_count,
           COUNT(*) FILTER (WHERE status IN ('won','lost','void')) AS settled_count,
           COALESCE(SUM(stake),0) AS total_staked,
           COALESCE(SUM(payout),0) AS total_returned
         FROM bets WHERE account_id = $1`,
        [accountId]
      ),
      query(
        `SELECT COUNT(*) AS total_rounds, COALESCE(SUM(bet),0) AS total_wagered,
                COALESCE(SUM(payout),0) AS total_won
         FROM game_rounds WHERE account_id = $1 AND status = 'settled'`,
        [accountId]
      ),
      query(
        `SELECT id, type, amount, balance_after, description, created_at
         FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 7`,
        [accountId]
      ),
      query(
        `SELECT gr.id, gr.game_id, g.name AS game_name, gr.bet, gr.payout, gr.status, gr.outcome, gr.created_at
         FROM game_rounds gr JOIN games g ON g.id = gr.game_id
         WHERE gr.account_id = $1 ORDER BY gr.created_at DESC LIMIT 6`,
        [accountId]
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE read_at IS NULL) AS unread,
                COUNT(*) AS total FROM notifications WHERE account_id = $1 OR account_id IS NULL`,
        [accountId]
      ),
      query("SELECT COUNT(*) AS count FROM favorites WHERE account_id = $1", [accountId]),
      query("SELECT * FROM responsible_limits WHERE account_id = $1", [accountId]),
      query(
        `SELECT COUNT(*) AS invited,
                COUNT(*) FILTER (WHERE r.status = 'rewarded') AS rewarded
         FROM referrals r WHERE r.referrer_id = $1`,
        [accountId]
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE status IN ('open','pending')) AS open_count
         FROM support_tickets WHERE account_id = $1`,
        [accountId]
      )
    ]);
    const b = bets.rows[0];
    const r = rounds.rows[0];
    res.json({
      user: req.account,
      stats: {
        openBets: Number(b.open_count),
        settledBets: Number(b.settled_count),
        totalStaked: Number(b.total_staked),
        totalReturned: Number(b.total_returned),
        totalRounds: Number(r.total_rounds),
        totalWagered: Number(r.total_wagered),
        totalWon: Number(r.total_won),
        favorites: Number(favorites.rows[0].count),
        unreadNotifications: Number(notifications.rows[0].unread),
        totalNotifications: Number(notifications.rows[0].total),
        referrals: Number(referrals.rows[0].invited),
        rewardedReferrals: Number(referrals.rows[0].rewarded),
        openTickets: Number(tickets.rows[0].open_count)
      },
      recentTransactions: txns.rows.map((row) => ({ ...row, amount: Number(row.amount), balance_after: Number(row.balance_after) })),
      recentRounds: recentRounds.rows.map((row) => ({ ...row, bet: Number(row.bet), payout: Number(row.payout) })),
      limits: limits.rows[0] || null
    });
  } catch (error) {
    next(error);
  }
});

router.get("/transactions", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const types = Array.isArray(req.query.type) ? req.query.type : req.query.type ? [req.query.type] : null;
    const params = [req.account.id, limit, offset];
    let typeFilter = "";
    if (types?.length) {
      params.push(types);
      typeFilter = ` AND type = ANY($${params.length})`;
    }
    const [rows, count] = await Promise.all([
      query(
        `SELECT id, type, amount, balance_after, description, reference_type, reference_id, created_at
         FROM transactions WHERE account_id = $1${typeFilter}
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        params
      ),
      query(`SELECT COUNT(*) FROM transactions WHERE account_id = $1${typeFilter}`, [req.account.id, ...(types?.length ? [types] : [])])
    ]);
    res.json({
      transactions: rows.rows.map((row) => ({ ...row, amount: Number(row.amount), balance_after: Number(row.balance_after) })),
      total: Number(count.rows[0].count)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/bets", requireAuth, async (req, res, next) => {
  try {
    const status = ["open", "won", "lost", "void", "cashed_out"].includes(req.query.status) ? req.query.status : null;
    const params = [req.account.id];
    let filter = "";
    if (status) {
      params.push(status);
      filter = ` AND b.status = $${params.length}`;
    }
    const bets = await query(
      `SELECT b.*,
         COALESCE((SELECT json_agg(json_build_object(
           'id', s.id, 'matchId', s.match_id, 'selection', s.selection,
           'selectionLabel', s.selection_label, 'odds', s.odds, 'result', s.result,
           'homeTeam', m.home_team, 'awayTeam', m.away_team, 'league', m.league, 'sport', m.sport
         ) ORDER BY s.id) FROM bet_selections s JOIN matches m ON m.id = s.match_id WHERE s.bet_id = b.id), '[]'::json) AS selections
       FROM bets b WHERE b.account_id = $1${filter}
       ORDER BY b.placed_at DESC LIMIT 100`,
      params
    );
    res.json({
      bets: bets.rows.map((row) => ({
        ...row,
        stake: Number(row.stake),
        total_odds: Number(row.total_odds),
        potential_return: Number(row.potential_return),
        payout: Number(row.payout)
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/rounds", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const game = req.query.game ? String(req.query.game) : null;
    const params = [req.account.id, limit];
    let filter = "";
    if (game) { params.push(game); filter = ` AND gr.game_id = $${params.length}`; }
    const result = await query(
      `SELECT gr.id, gr.game_id, g.name AS game_name, g.category, gr.bet, gr.payout, gr.status, gr.outcome, gr.created_at, gr.settled_at
       FROM game_rounds gr JOIN games g ON g.id = gr.game_id
       WHERE gr.account_id = $1${filter}
       ORDER BY gr.created_at DESC LIMIT $2`,
      params
    );
    res.json({ rounds: result.rows.map((row) => ({ ...row, bet: Number(row.bet), payout: Number(row.payout) })) });
  } catch (error) {
    next(error);
  }
});

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, body, type, link, read_at, created_at
       FROM notifications WHERE account_id = $1 OR account_id IS NULL
       ORDER BY created_at DESC LIMIT 60`,
      [req.account.id]
    );
    res.json({ notifications: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET read_at = now() WHERE id = $1 AND (account_id = $2 OR account_id IS NULL)",
      [req.params.id, req.account.id]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    await query("UPDATE notifications SET read_at = now() WHERE (account_id = $1 OR account_id IS NULL) AND read_at IS NULL", [req.account.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/favorites", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT g.*, f.created_at AS favorited_at FROM favorites f JOIN games g ON g.id = f.game_id
       WHERE f.account_id = $1 AND g.status <> 'hidden' ORDER BY f.created_at DESC`,
      [req.account.id]
    );
    res.json({ games: serializeGames(result.rows) });
  } catch (error) {
    next(error);
  }
});

router.post("/favorites/:gameId", requireAuth, async (req, res, next) => {
  try {
    const game = await query("SELECT id FROM games WHERE id = $1 AND status <> 'hidden'", [req.params.gameId]);
    if (!game.rows[0]) throw Object.assign(new Error("Game not found."), { status: 404, code: "not_found" });
    await query("INSERT INTO favorites (account_id, game_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.account.id, req.params.gameId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/favorites/:gameId", requireAuth, async (req, res, next) => {
  try {
    await query("DELETE FROM favorites WHERE account_id = $1 AND game_id = $2", [req.account.id, req.params.gameId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/recent", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT g.*, rp.last_played_at FROM recent_plays rp JOIN games g ON g.id = rp.game_id
       WHERE rp.account_id = $1 ORDER BY rp.last_played_at DESC LIMIT 24`,
      [req.account.id]
    );
    res.json({ games: serializeGames(result.rows) });
  } catch (error) {
    next(error);
  }
});

router.get("/responsible", requireAuth, async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM responsible_limits WHERE account_id = $1", [req.account.id]);
    res.json({ limits: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
});

router.patch("/responsible", requireAuth, async (req, res, next) => {
  try {
    const { dailyBetLimit, sessionLimitMinutes, realityCheckMinutes, coolOffHours, selfExcludeDays } = req.body || {};
    const duration = Number(coolOffHours) > 0 ? Math.min(168, Number(coolOffHours)) : 0;
    const exclusion = Number(selfExcludeDays) > 0 ? Math.min(365, Number(selfExcludeDays)) : 0;
    await query(
      `INSERT INTO responsible_limits (account_id, daily_bet_limit, session_limit_minutes, reality_check_minutes, cool_off_until, self_exclusion_until, updated_at)
       VALUES ($1,$2,$3,$4,
         CASE WHEN $5 > 0 THEN now() + ($5 || ' hours')::interval ELSE NULL END,
         CASE WHEN $6 > 0 THEN now() + ($6 || ' days')::interval ELSE NULL END,
         now())
       ON CONFLICT (account_id) DO UPDATE SET
         daily_bet_limit = EXCLUDED.daily_bet_limit,
         session_limit_minutes = EXCLUDED.session_limit_minutes,
         reality_check_minutes = EXCLUDED.reality_check_minutes,
         cool_off_until = COALESCE(EXCLUDED.cool_off_until, responsible_limits.cool_off_until),
         self_exclusion_until = COALESCE(EXCLUDED.self_exclusion_until, responsible_limits.self_exclusion_until),
         updated_at = now()`,
      [
        req.account.id,
        dailyBetLimit ? Math.max(0, Number(dailyBetLimit)) : null,
        sessionLimitMinutes ? Math.max(0, Number(sessionLimitMinutes)) : null,
        realityCheckMinutes ? Math.max(0, Number(realityCheckMinutes)) : 60,
        duration,
        exclusion
      ]
    );
    await query(
      `INSERT INTO notifications (account_id, title, body, type, link)
       VALUES ($1,'Responsible-play settings updated','Your coin limits have been saved. These controls are part of the demonstration environment.','security','/account/responsible')`,
      [req.account.id]
    );
    const result = await query("SELECT * FROM responsible_limits WHERE account_id = $1", [req.account.id]);
    res.json({ limits: result.rows[0], message: "Responsible-play settings updated." });
  } catch (error) {
    next(error);
  }
});

router.get("/referrals", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.id, r.status, r.created_at, a.display_name, a.created_at AS joined_at
       FROM referrals r JOIN accounts a ON a.id = r.referee_id
       WHERE r.referrer_id = $1 ORDER BY r.created_at DESC`,
      [req.account.id]
    );
    res.json({ code: req.account.referralCode, referrals: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get("/support", requireAuth, async (req, res, next) => {
  try {
    const tickets = await query(
      `SELECT t.*, (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id AND m.is_internal = false) AS message_count,
              (SELECT created_at FROM support_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
       FROM support_tickets t WHERE t.account_id = $1 ORDER BY t.updated_at DESC`,
      [req.account.id]
    );
    res.json({ tickets: tickets.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/support", requireAuth, async (req, res, next) => {
  try {
    const subject = String(req.body?.subject || "").trim().slice(0, 140);
    const body = String(req.body?.body || "").trim().slice(0, 4000);
    const category = String(req.body?.category || "general").slice(0, 30);
    if (subject.length < 4) throw Object.assign(new Error("Add a short subject."), { status: 400, code: "invalid_subject" });
    if (body.length < 10) throw Object.assign(new Error("Tell us a little more so we can help."), { status: 400, code: "invalid_message" });
    const result = await withTransaction(async (client) => {
      const ticket = await client.query(
        `INSERT INTO support_tickets (account_id, subject, category, priority) VALUES ($1,$2,$3,'normal') RETURNING *`,
        [req.account.id, subject, category]
      );
      await client.query(
        `INSERT INTO support_messages (ticket_id, sender_id, body) VALUES ($1,$2,$3)`,
        [ticket.rows[0].id, req.account.id, body]
      );
      await appendAudit(client, {
        actorId: req.account.id,
        action: "support.ticket_created",
        entityType: "support_ticket",
        entityId: ticket.rows[0].id,
        summary: `Support ticket opened: ${subject}`,
        ip: requestMeta(req).ip
      });
      return ticket.rows[0];
    });
    res.status(201).json({ ticket: result, message: "Ticket received. Our team will respond in the support centre." });
  } catch (error) {
    next(error);
  }
});

router.get("/support/:id", requireAuth, async (req, res, next) => {
  try {
    const ticket = await query("SELECT * FROM support_tickets WHERE id = $1 AND account_id = $2", [req.params.id, req.account.id]);
    if (!ticket.rows[0]) throw Object.assign(new Error("Ticket not found."), { status: 404, code: "not_found" });
    const messages = await query(
      `SELECT m.id, m.body, m.is_internal, m.created_at, a.display_name AS sender_name
       FROM support_messages m LEFT JOIN accounts a ON a.id = m.sender_id
       WHERE m.ticket_id = $1 AND m.is_internal = false ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json({ ticket: ticket.rows[0], messages: messages.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/support/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const body = String(req.body?.body || "").trim().slice(0, 4000);
    if (body.length < 2) throw Object.assign(new Error("Write a message first."), { status: 400, code: "invalid_message" });
    const ticket = await query("SELECT id, status FROM support_tickets WHERE id = $1 AND account_id = $2", [req.params.id, req.account.id]);
    if (!ticket.rows[0]) throw Object.assign(new Error("Ticket not found."), { status: 404, code: "not_found" });
    if (["closed"].includes(ticket.rows[0].status)) throw Object.assign(new Error("This ticket is closed. Open a new ticket for help."), { status: 400, code: "ticket_closed" });
    await query("INSERT INTO support_messages (ticket_id, sender_id, body) VALUES ($1,$2,$3)", [req.params.id, req.account.id, body]);
    await query("UPDATE support_tickets SET status = 'open', updated_at = now() WHERE id = $1", [req.params.id]);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
