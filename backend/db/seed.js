import crypto from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";
import { hashPassword, randomInt, randomReferral, randomToken, sha256, randomFloat } from "../src/lib/crypto.js";
import { appendAudit } from "../src/lib/audit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(__dirname, "..", "..", "shared", "catalog.json"), "utf8"));
const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");

const PASSWORD = "19X#2026";

const ROLES = [
  {
    code: "master_admin", name: "Master Admin", rank: 0,
    description: "Global oversight of the entire 19xbet365 network, platform configuration, and immutable audit verification.",
    permissions: [
      "network.view.global", "network.view.scope", "network.manage",
      "accounts.create.admin", "accounts.create.subadmin", "accounts.create.agent", "accounts.create.player",
      "accounts.suspend", "accounts.restore", "credits.adjust", "games.view", "games.manage",
      "content.manage", "promotions.manage", "support.view", "support.manage",
      "security.view", "audit.view.global", "audit.view.scope", "settings.manage",
      "roles.manage", "transfers.approve", "reports.view.global", "reports.view.scope",
      "notifications.broadcast", "system.view"
    ]
  },
  {
    code: "admin", name: "Administrator", rank: 1,
    description: "Runs an independent network branch with delegated sub-admins, agents, and direct players.",
    permissions: [
      "network.view.scope", "network.manage", "accounts.create.subadmin", "accounts.create.agent",
      "accounts.create.player", "accounts.suspend", "accounts.restore", "credits.adjust",
      "games.view", "games.manage", "content.manage", "promotions.manage", "support.view", "support.manage",
      "security.view", "audit.view.scope", "transfers.approve", "reports.view.scope",
      "notifications.broadcast", "system.view"
    ]
  },
  {
    code: "sub_admin", name: "Sub-admin", rank: 2,
    description: "Manages a delegated sub-network of agents and players within an administrator's branch.",
    permissions: [
      "network.view.scope", "network.manage", "accounts.create.agent", "accounts.create.player",
      "accounts.suspend", "accounts.restore", "credits.adjust", "games.view",
      "support.view", "support.manage", "security.view", "audit.view.scope",
      "reports.view.scope", "notifications.broadcast"
    ]
  },
  {
    code: "agent", name: "Agent", rank: 3,
    description: "Supports and manages players assigned to its delegated branch.",
    permissions: [
      "network.view.scope", "network.manage", "accounts.create.player", "accounts.suspend",
      "accounts.restore", "games.view", "support.view", "audit.view.scope", "reports.view.scope"
    ]
  },
  {
    code: "player", name: "Player", rank: 4,
    description: "Self-service access to sports, games, coins, history, responsible-play tools, and support.",
    permissions: []
  }
];

function hashEvent({ actorId, action, entityType, entityId, summary, before, after, at }) {
  return sha256(JSON.stringify({ actorId, action, entityType, entityId, summary, before, after, ip: "seed", prevHash: "SEED_PREV", at }));
}

function isoDaysAgo(days, hour = 12) {
  const date = new Date("2026-11-24T12:40:00.000Z");
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

const PLAYERS = [
  { name: "Alex Rowan", email: "player@19xbet365.test", username: "alexrowan", parent: "luca", balance: 12500, level: 12, xp: 32400, daysAgo: 42, country: "United Kingdom", referral: true },
  { name: "Sofia Lind", email: "sofia.lind@example.com", username: "sofialind", parent: "jonas", balance: 8400, daysAgo: 31, country: "Sweden", status: "suspended", suspendedReason: "Routine account review — pending ownership verification." },
  { name: "Mateo Cruz", email: "mateo.cruz@example.com", username: "mateocruz", parent: "luca", balance: 19200, daysAgo: 26, country: "Spain" },
  { name: "Amara Osei", email: "amara.osei@example.com", username: "amaraosei", parent: "mira", balance: 6400, daysAgo: 22, country: "Ghana" },
  { name: "Noah Kim", email: "noah.kim@example.com", username: "noahkim", parent: "owen", balance: 22300, daysAgo: 18, country: "South Korea" },
  { name: "Elena Petrova", email: "elena.petrova@example.com", username: "elenapetrova", parent: "priya", balance: 3100, daysAgo: 17, country: "Bulgaria" },
  { name: "Idris Bello", email: "idris.bello@example.com", username: "idrisbello", parent: "luca", balance: 15050, daysAgo: 15, country: "Nigeria" },
  { name: "Hana Sato", email: "hana.sato@example.com", username: "hanasato", parent: "mira", balance: 9800, daysAgo: 14, country: "Japan" },
  { name: "Liam Walsh", email: "liam.walsh@example.com", username: "liamwalsh", parent: "jonas", balance: 5400, daysAgo: 13, country: "Ireland" },
  { name: "Camila Rojas", email: "camila.rojas@example.com", username: "camilarojas", parent: "priya", balance: 11800, daysAgo: 12, country: "Chile" },
  { name: "Ethan Brooks", email: "ethan.brooks@example.com", username: "ethanbrooks", parent: "luca", balance: 7600, daysAgo: 11, country: "United States" },
  { name: "Zara Ahmed", email: "zara.ahmed@example.com", username: "zaraahmed", parent: "mira", balance: 20400, daysAgo: 10, country: "Pakistan" },
  { name: "Lucas Meyer", email: "lucas.meyer@example.com", username: "lucasmeyer", parent: "owen", balance: 3900, daysAgo: 9, country: "Germany" },
  { name: "Yara Haddad", email: "yara.haddad@example.com", username: "yarahaddad", parent: "mira", balance: 14400, daysAgo: 8, country: "Lebanon" },
  { name: "Oliver Grant", email: "oliver.grant@example.com", username: "olivergrant", parent: "jonas", balance: 6100, daysAgo: 7, country: "Canada" },
  { name: "Mila Novak", email: "mila.novak@example.com", username: "milanovak", parent: "luca", balance: 8800, daysAgo: 6, country: "Slovenia" },
  { name: "Ravi Shah", email: "ravi.shah@example.com", username: "ravishah", parent: "priya", balance: 16700, daysAgo: 5, country: "India" },
  { name: "Nia Williams", email: "nia.williams@example.com", username: "niawilliams", parent: "luca", balance: 4200, daysAgo: 4, country: "Jamaica" },
  { name: "Felix Bauer", email: "felix.bauer@example.com", username: "felixbauer", parent: "owen", balance: 25900, daysAgo: 3, country: "Austria" },
  { name: "Sana Iqbal", email: "sana.iqbal@example.com", username: "sanaiqbal", parent: "mira", balance: 7300, daysAgo: 2, country: "United Arab Emirates" },
  { name: "Theo Martin", email: "theo.martin@example.com", username: "theomartin", parent: "jonas", balance: 2200, daysAgo: 1, country: "France" },
  { name: "Isla Fraser", email: "isla.fraser@example.com", username: "islafraser", parent: "luca", balance: 10900, daysAgo: 1, country: "Scotland", status: "suspended", suspendedReason: "Chargeback simulation flag — demonstration review." }
];

async function main() {
  const client = await pool.connect();
  try {
    console.log("Applying schema…");
    await client.query(schema);
    console.log("Resetting demonstration data…");
    await client.query(`
      TRUNCATE TABLE audit_events, support_messages, support_tickets, account_transfers, account_invitations,
        responsible_limits, recent_plays, favorites, notifications, transactions, bet_selections, bets,
        game_rounds, login_history, sessions, referrals, content_pages, platform_settings, tournaments,
        promotions, matches, sports, games, accounts, roles RESTART IDENTITY CASCADE
    `);

    await client.query("BEGIN");
    for (const role of ROLES) {
      await client.query(
        "INSERT INTO roles (code, name, rank, description, permissions) VALUES ($1,$2,$3,$4,$5)",
        [role.code, role.name, role.rank, role.description, JSON.stringify(role.permissions)]
      );
    }

    const ids = {};
    async function account({ key, name, email, username, role, parent, balance = 0, daysAgo = 30, country = "Global", status = "active", suspendedReason = null, level = 1, xp = 0 }) {
      const referral = randomReferral(role === "player" ? "19X" : "TEAM");
      const created = isoDaysAgo(daysAgo, 9 + (randomInt(0, 8)));
      const lastLogin = isoDaysAgo(Math.max(0, daysAgo - randomInt(1, 4)), 18);
      const result = await client.query(
        `INSERT INTO accounts (username, email, password_hash, display_name, role_code, parent_id, referral_code, status,
          balance, xp, level, country, avatar_seed, last_login_at, suspended_reason, created_at, updated_at,
          two_factor_enabled, marketing_opt_in)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16,$17,$18) RETURNING id`,
        [username, email, hashPassword(PASSWORD), name, role, parent ? ids[parent] : null, referral, status,
          balance, xp, level, country, randomToken(3), lastLogin, suspendedReason, created, role === "master_admin", false]
      );
      ids[key] = result.rows[0].id;
      if (balance > 0) {
        await client.query(
          `INSERT INTO transactions (account_id, type, amount, balance_after, description, reference_type, reference_id, created_at)
           VALUES ($1,'welcome_bonus',$2,$2,'Welcome coin allocation','welcome',$1,$3)`,
          [ids[key], balance, created]
        );
      }
      return ids[key];
    }

    await account({ key: "master", name: "Nadia Voss", email: "admin@19xbet365.test", username: "master_nadia", role: "master_admin", parent: null, daysAgo: 90, country: "United Kingdom", level: 99, xp: 999999 });
    await account({ key: "mercer", name: "Kai Mercer", email: "admin.mercer@19xbet365.test", username: "kai_mercer", role: "admin", parent: "master", daysAgo: 72, country: "United Kingdom", level: 44, xp: 190000 });
    await account({ key: "chen", name: "Ivy Chen", email: "admin.chen@19xbet365.test", username: "ivy_chen", role: "admin", parent: "master", daysAgo: 64, country: "Singapore", level: 41, xp: 170000 });
    await account({ key: "owen", name: "Owen Blake", email: "owen.blake@19xbet365.test", username: "owen_blake", role: "sub_admin", parent: "mercer", daysAgo: 55, country: "United Kingdom", level: 30, xp: 91000 });
    await account({ key: "priya", name: "Priya Nair", email: "priya.nair@19xbet365.test", username: "priya_nair", role: "sub_admin", parent: "chen", daysAgo: 51, country: "India", level: 28, xp: 83000 });
    await account({ key: "luca", name: "Luca Moretti", email: "luca.moretti@19xbet365.test", username: "luca_moretti", role: "agent", parent: "owen", daysAgo: 45, country: "Italy", level: 22, xp: 52000 });
    await account({ key: "mira", name: "Mira Haddad", email: "mira.haddad@19xbet365.test", username: "mira_haddad", role: "agent", parent: "priya", daysAgo: 43, country: "Lebanon", level: 20, xp: 47000 });
    await account({ key: "jonas", name: "Jonas Weber", email: "jonas.weber@19xbet365.test", username: "jonas_weber", role: "agent", parent: "mercer", daysAgo: 40, country: "Germany", level: 24, xp: 61000 });

    for (const player of PLAYERS) {
      await account({
        key: player.username,
        name: player.name,
        email: player.email,
        username: player.username,
        role: "player",
        parent: player.parent,
        balance: 0,
        daysAgo: player.daysAgo,
        country: player.country,
        status: player.status || "active",
        suspendedReason: player.suspendedReason || null,
        level: player.level || randomInt(2, 18),
        xp: player.xp || randomInt(400, 26000)
      });
      await client.query(
        "UPDATE accounts SET email = $1 WHERE id = $2",
        [player.email, ids[player.username]]
      );
    }

    // Referral: a player referred by Alex Rowan — no administrative rights follow.
    await client.query(
      "INSERT INTO referrals (referrer_id, referee_id, code, status, created_at) VALUES ($1,$2,$3,'rewarded',$4)",
      [ids.alexrowan, ids.theomartin, (await client.query("SELECT referral_code FROM accounts WHERE id=$1", [ids.alexrowan])).rows[0].referral_code, isoDaysAgo(1)]
    );
    await client.query("UPDATE accounts SET referred_by = $1 WHERE id = $2", [ids.alexrowan, ids.theomartin]);
    await client.query("UPDATE accounts SET parent_id = $1 WHERE id = $2", [ids.luca, ids.theomartin]);

    // Catalog -----------------------------------------------------------------
    for (const sport of catalog.sports) {
      await client.query("INSERT INTO sports (slug, name, icon, event_count) VALUES ($1,$2,$3,$4)", [sport.slug, sport.name, sport.icon, sport.count]);
    }
    for (const [matchIndex, m] of catalog.matches.entries()) {
      // Keep the demo board alive relative to the seed run instead of replaying
      // stale catalogue timestamps. Live fixtures stay inside the 90-minute
      // settlement window; upcoming fixtures start over the next few hours.
      const startTime = m.status === "live"
        ? new Date(Date.now() - (12 + (matchIndex % 5) * 6) * 60_000).toISOString()
        : m.status === "upcoming"
          ? new Date(Date.now() + (25 + (matchIndex % 10) * 14) * 60_000).toISOString()
          : m.startTime;
      await client.query(
        `INSERT INTO matches (id, sport, league, home_team, away_team, start_time, status, minute, score_home, score_away, odds_home, odds_draw, odds_away, featured, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true)`,
        [m.id, m.sport, m.league, m.homeTeam, m.awayTeam, startTime, m.status, m.minute, m.scoreHome, m.scoreAway, m.oddsHome, m.oddsDraw, m.oddsAway, m.featured]
      );
    }
    for (const g of catalog.games) {
      await client.query(
        `INSERT INTO games (id, name, category, provider, playable, integration_status, rtp, volatility, tagline, description, theme, features, how_to, badge, featured, players, max_win, sort_order, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'published')`,
        [g.id, g.name, g.category, g.provider, g.playable, g.integrationStatus, g.rtp, g.volatility, g.tagline, g.description, JSON.stringify(g.theme), JSON.stringify(g.features), JSON.stringify(g.howTo), g.badge, g.featured, g.players, g.maxWin, g.sortOrder]
      );
    }
    for (const [index, p] of catalog.promotions.entries()) {
      await client.query(
        `INSERT INTO promotions (id,title,kicker,description,type,badge,theme,ends_at,cta,terms,prize,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [p.id, p.title, p.kicker, p.description, p.type, p.badge, p.theme, p.endsAt, p.cta, p.terms, p.prize, index + 1]
      );
    }
    for (const t of catalog.tournaments) {
      await client.query(
        `INSERT INTO tournaments (id,name,game_id,prize_pool,starts_at,ends_at,status,participants,leaderboard)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [t.id, t.name, t.gameId, t.prizePool, t.startsAt, t.endsAt, t.status, t.participants, JSON.stringify(t.leaderboard)]
      );
    }

    // Platform settings -------------------------------------------------------
    const settings = [
      ["platformName", "19xbet365", "Public brand name"],
      ["platformTagline", "Play beyond the ordinary.", "Brand tagline"],
      ["maintenanceMode", false, "Pauses public playable actions when enabled"],
      ["registrationsEnabled", true, "Allows new player registration"],
      ["maxGameStake", 5000, "Maximum coin stake per game round"],
      ["depositMode", "sandbox", "Deposit mode: sandbox, manual_review or disabled"],
      ["depositQrImageUrl", "", "Payment QR image URL for the deposit page"],
      ["depositInstructions", "Scan the payment QR, then enter the amount and payment reference. A reviewer verifies the transfer before coins are credited.", "Instructions shown on the deposit page"],
      ["depositBonusTiers", "100:5,500:10,1000:15,5000:20", "Deposit bonus tiers: minimum amount:percent"],
      ["depositMin", 50, "Minimum deposit amount"],
      ["depositMax", 100000, "Maximum deposit amount"],
      ["supportEmail", "support@19xbet365.test", "Support contact"],
      ["licenseStatus", "Demonstration — coins only", "Regulatory status shown in the footer"],
      ["thirdPartyIntegrations", "disabled", "Certified provider connections"],
      ["realMoneyEnabled", false, "Hard-disabled pending licensing"],
      ["responsibleGaming", "enabled", "Responsible-play tooling"],
      ["auditRetentionDays", 2555, "Audit retention policy"],
      ["liveUpdates", true, "WebSocket activity channel"],
      ["kycRequired", false, "KYC required for real-money operations (disabled)"]
    ];
    for (const [key, value, description] of settings) {
      await client.query("INSERT INTO platform_settings (key, value, description) VALUES ($1,$2,$3)", [key, JSON.stringify(value), description]);
    }

    // Content pages -----------------------------------------------------------
    const pages = [
      ["about", "About 19xbet365", "Company", "19xbet365 is an independent, coin entertainment platform built as a complete foundation for future licensed operations. Our sportsbook, casino lobby, live dealer lobby, and original instant games are presented with clear labels about what is active and what requires a licensed provider.\n\nEvery 19X Originals round is generated on our server and recorded. Real-money wagering, deposits, withdrawals, cash redemption, and financial commission systems are disabled."],
      ["terms", "Terms and Conditions", "Legal", "These terms govern use of the 19xbet365 demonstration platform. Access is limited to users aged 18 or older. All balances are coins with no cash value and cannot be purchased, transferred, redeemed, or withdrawn.\n\nPlayable original games are provided for entertainment only. Third-party game pages are integration-ready interfaces and do not represent active provider services. 19xbet365 may suspend or close accounts that breach these terms or attempt to interfere with platform integrity.\n\nCompleted rounds and audit records are retained in an append-only ledger. Platform staff cannot alter settled game outcomes or erase audit history."],
      ["privacy", "Privacy Policy", "Legal", "We collect account details, session metadata, gameplay activity, coin transactions, support communications, and security events to operate and protect the platform. We do not sell personal data. Data is retained according to the audit-retention policy and applicable law.\n\nYou can review and update your profile and security settings from your account. For data requests in this demonstration environment, contact support."],
      ["responsible-gaming", "Responsible Gaming", "Safety", "19xbet365 is entertainment, not income. Use coin limits, reality checks, cool-off periods, and self-exclusion to stay in control. Our account tools let you set a daily wager limit and short session reminders.\n\nIf you feel that play is affecting your wellbeing, take a break and seek independent support in your region. This platform does not offer real-money wagering."],
      ["bonus-terms", "Bonus Terms", "Legal", "All bonuses on 19xbet365 are coin gameplay allocations. They have no cash value, cannot be withdrawn, and do not create a debt or ownership interest. Tournament prize pools are coins. One welcome allocation is available per verified player. Where a bonus has an expiry, the expiration is shown on the promotion card."],
      ["cookies", "Cookie Policy", "Legal", "19xbet365 uses a strictly necessary session cookie to authenticate your account. We do not use advertising cookies. The cookie is HttpOnly and SameSite-protected. Clearing it signs you out."],
      ["aml", "AML & KYC Policy", "Legal", "Real-money operations are disabled. In a future licensed deployment, identity verification, source-of-funds checks, sanctions screening, and transaction monitoring would be mandatory before any deposit, withdrawal, or real-money wager. No financial services are provided in this build."],
      ["affiliates", "Affiliate Programme", "Company", "19xbet365's affiliate programme is not open for real-money commissions. In this foundation build, referral links award coins to both parties after a referred player completes their first round. Referring a player never grants administrative access or staff permissions."]
    ];
    for (const [slug, title, category, body] of pages) {
      await client.query("INSERT INTO content_pages (slug, title, category, body, status) VALUES ($1,$2,$3,$4,'published')", [slug, title, category, body]);
    }

    // History for the demo player --------------------------------------------
    const now = new Date("2026-11-24T12:40:00.000Z");
    const at = (days, hour) => { const d = new Date(now); d.setUTCDate(d.getUTCDate() - days); d.setUTCHours(hour, 20, 0, 0); return d.toISOString(); };
    let balance = 10000;
    const balanceTx = async (type, amount, description, createdAt, referenceType = null, referenceId = null) => {
      balance = Math.round((balance + amount) * 100) / 100;
      await client.query(
        `INSERT INTO transactions (account_id,type,amount,balance_after,description,reference_type,reference_id,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ids.alexrowan, type, amount, balance, description, referenceType, referenceId, createdAt]
      );
    };
    await balanceTx("welcome_bonus", 10000, "Welcome coin allocation", isoDaysAgo(42, 9), "welcome", ids.alexrowan);

    const historicalRounds = [
      ["nova-fruits", 100, 0, at(20, 14), { game: "nova-fruits", grid: [["cherry","bell","lemon"],["seven","star","crown"],["diamond","lemon","bell"]], lines: [], multiplier: 0, win: false, summary: "No winning line", gameName: "Nova Fruits" }],
      ["crash-orbit", 200, 480, at(17, 19), { game: "Crash Orbit", gameName: "Crash Orbit", crashPoint: 3.12, multiplier: 2.4, win: true, summary: "Cashed out at 2.40x" }],
      ["mines-vault", 150, 0, at(12, 21), { game: "Mines Vault", gameName: "Mines Vault", mines: [2,6,17,22], revealed: [0,1], hitTile: 2, multiplier: 0, win: false, summary: "Mine hit at tile 3" }],
      ["wheel-of-astra", 100, 300, at(8, 16), { game: "Wheel of 19X", gameName: "Wheel of 19X", index: 9, multiplier: 3, win: true, summary: "Wheel stopped at 3.00x" }],
      ["plinko-drop", 50, 0, at(6, 11), { game: "Plinko Drop", gameName: "Plinko Drop", rows: 10, risk: "medium", path: ["L","L","R","L","R","L","L","R","L","L"], bucket: 3, multiplier: 1.4, win: true, summary: "Landed in bucket 4 at 1.40x" }],
      ["crash-orbit", 3000, 5590, at(3, 20), { game: "Crash Orbit", gameName: "Crash Orbit", crashPoint: 1.91, multiplier: 1.86, win: true, summary: "Cashed out at 1.86x" }]
    ];
    for (const [gameId, bet, payout, createdAt, outcome] of historicalRounds) {
      const round = await client.query(
        `INSERT INTO game_rounds (account_id,game_id,bet,payout,status,outcome,state,created_at,settled_at,server_seed_hash)
         VALUES ($1,$2,$3,$4,'settled',$5,'{}'::jsonb,$6,$6,$7) RETURNING id`,
        [ids.alexrowan, gameId, bet, payout, JSON.stringify(outcome), createdAt, sha256(createdAt + gameId)]
      );
      await balanceTx("game_stake", -bet, `Game stake · ${outcome.gameName}`, createdAt, "game_round", round.rows[0].id);
      if (payout > 0) await balanceTx("game_win", payout, `Game win · ${outcome.gameName}`, createdAt, "game_round", round.rows[0].id);
    }

    const settledBets = [
      { type: "single", stake: 250, odds: 2.05, status: "lost", payout: 0, pay: 0, at: at(15, 18), matchId: "m003", selection: "home", label: "Harbour City" },
      { type: "acca", stake: 500, odds: 2.36, status: "won", payout: 1180, pay: 1180, at: at(9, 17), matchId: "m013", selection: "home", label: "Athens BC", second: { matchId: "m001", selection: "home", label: "Northbridge FC" } },
      { type: "single", stake: 300, odds: 1.66, status: "lost", payout: 0, pay: 0, at: at(5, 15), matchId: "m017", selection: "away", label: "K. Sato" }
    ];
    for (const bet of settledBets) {
      const created = await client.query(
        `INSERT INTO bets (account_id,type,stake,total_odds,potential_return,status,payout,placed_at,settled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [ids.alexrowan, bet.type, bet.stake, bet.odds, Math.round(bet.stake * bet.odds * 100) / 100, bet.status, bet.payout, bet.at, bet.at]
      );
      const selections = [bet, ...(bet.second ? [bet.second] : [])];
      for (const selection of selections) {
        const match = catalog.matches.find((m) => m.id === selection.matchId);
        await client.query(
          `INSERT INTO bet_selections (bet_id,match_id,selection,selection_label,odds,result)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [created.rows[0].id, selection.matchId, selection.selection, `${match.homeTeam} vs ${match.awayTeam} · ${selection.label}`, selection === bet && bet.selection === "home" ? Number(match.oddsHome) : Number(match.oddsAway || match.oddsHome), bet.status === "won" ? "won" : "lost"]
        );
      }
      await balanceTx("bet_stake", -bet.stake, `Sports ${bet.type === "single" ? "single" : "accumulator"} · ${selections.length} selection${selections.length > 1 ? "s" : ""}`, bet.at, "sports_bet", created.rows[0].id);
      if (bet.pay) await balanceTx("bet_win", bet.pay, "Sports bet settled — won", bet.at, "sports_bet", created.rows[0].id);
    }

    const openBets = [
      { type: "single", stake: 300, at: isoDaysAgo(1, 19), matchId: "m001", selection: "home" },
      { type: "acca", stake: 400, at: isoDaysAgo(1, 18), selections: [{ matchId: "m021", selection: "home" }, { matchId: "m022", selection: "home" }] }
    ];
    for (const bet of openBets) {
      const list = bet.selections || [{ matchId: bet.matchId, selection: bet.selection }];
      let totalOdds = 1;
      const oddsList = list.map((item) => {
        const match = catalog.matches.find((m) => m.id === item.matchId);
        const odds = item.selection === "home" ? match.oddsHome : item.selection === "draw" ? match.oddsDraw : match.oddsAway;
        totalOdds *= Number(odds);
        return { ...item, odds: Number(odds), match };
      });
      totalOdds = Math.round(totalOdds * 100) / 100;
      const created = await client.query(
        `INSERT INTO bets (account_id,type,stake,total_odds,potential_return,status,placed_at)
         VALUES ($1,$2,$3,$4,$5,'open',$6) RETURNING id`,
        [ids.alexrowan, bet.type, bet.stake, totalOdds, Math.round(bet.stake * totalOdds * 100) / 100, bet.at]
      );
      for (const item of oddsList) {
        await client.query(
          `INSERT INTO bet_selections (bet_id,match_id,selection,selection_label,odds)
           VALUES ($1,$2,$3,$4,$5)`,
          [created.rows[0].id, item.matchId, item.selection, `${item.match.homeTeam} vs ${item.match.awayTeam} · ${item.selection === "home" ? item.match.homeTeam : item.selection === "away" ? item.match.awayTeam : "Draw"}`, item.odds]
        );
      }
      await balanceTx("bet_stake", -bet.stake, `Sports ${bet.type === "single" ? "single" : "accumulator"} · ${list.length} selection${list.length > 1 ? "s" : ""}`, bet.at, "sports_bet", created.rows[0].id);
    }
    await balanceTx("promo_credit", 300, "19X loyalty top-up", at(0, 6), "promotion", "p1");
    await client.query("UPDATE accounts SET balance = $1 WHERE id = $2", [balance, ids.alexrowan]);

    // A little activity for the rest of the network --------------------------
    const networkPlayers = PLAYERS.filter((p) => p.username !== "alexrowan");
    const playableGames = catalog.games.filter((g) => g.playable);
    for (const player of networkPlayers) {
      const accountId = ids[player.username];
      const status = player.status || "active";
      if (status !== "active") continue;
      let running = 0;
      const welcome = randomInt(50, 180) * 100;
      running = welcome;
      const created = isoDaysAgo(player.daysAgo, 10);
      await client.query(
        `INSERT INTO transactions (account_id,type,amount,balance_after,description,reference_type,created_at)
         VALUES ($1,'welcome_bonus',$2,$2,'Welcome coin allocation','welcome',$3)`,
        [accountId, welcome, created]
      );
      const rounds = randomInt(3, 9);
      for (let i = 0; i < rounds; i += 1) {
        const game = playableGames[randomInt(0, playableGames.length - 1)];
        const bet = randomInt(1, 20) * 10;
        if (running < bet) break;
        const win = randomFloat() < 0.42;
        const multiplier = win ? 1.2 + randomFloat() * 3 : 0;
        const payout = Math.round(bet * multiplier * 100) / 100;
        const ts = isoDaysAgo(Math.max(0, player.daysAgo - randomInt(0, Math.min(7, player.daysAgo))), randomInt(10, 22));
        running -= bet;
        const round = await client.query(
          `INSERT INTO game_rounds (account_id,game_id,bet,payout,status,outcome,created_at,settled_at,server_seed_hash)
           VALUES ($1,$2,$3,$4,'settled',$5,$6,$6,$7) RETURNING id`,
          [accountId, game.id, bet, payout, JSON.stringify({ game: game.name, rec: Math.random() < 0.5 ? "heads" : "tails", multiplier: payout / bet, win: win, gameName: game.name }), ts, sha256(ts + game.id)]
        );
        await client.query(
          `INSERT INTO transactions (account_id,type,amount,balance_after,description,reference_type,reference_id,created_at)
           VALUES ($1,'game_stake',$2,$3,$4,'game_round',$5,$6)`,
          [accountId, -bet, running, `Game stake · ${game.name}`, round.rows[0].id, ts]
        );
        if (payout > 0) {
          running += payout;
          await client.query(
            `INSERT INTO transactions (account_id,type,amount,balance_after,description,reference_type,reference_id,created_at)
             VALUES ($1,'game_win',$2,$3,$4,'game_round',$5,$6)`,
            [accountId, payout, running, `Game win · ${game.name}`, round.rows[0].id, ts]
          );
        }
      }
      await client.query("UPDATE accounts SET balance = $1 WHERE id = $2", [Math.max(0, Math.round(running * 100) / 100), accountId]);
    }

    // Favorites, recent plays, limits, notifications -------------------------
    for (const gameId of ["crash-orbit", "mines-vault", "nova-fruits", "velocity-derby"]) {
      await client.query("INSERT INTO favorites (account_id, game_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [ids.alexrowan, gameId]);
    }
    for (const [index, gameId] of ["crash-orbit", "nova-fruits", "mines-vault", "wheel-of-astra"].entries()) {
      await client.query(
        "INSERT INTO recent_plays (account_id, game_id, last_played_at) VALUES ($1,$2,now() - ($3 || ' hours')::interval) ON CONFLICT (account_id, game_id) DO UPDATE SET last_played_at = EXCLUDED.last_played_at",
        [ids.alexrowan, gameId, index * 4 + 2]
      );
    }
    await client.query(
      "INSERT INTO responsible_limits (account_id, daily_bet_limit, session_limit_minutes, reality_check_minutes) VALUES ($1,5000,120,60)",
      [ids.alexrowan]
    );
    const notes = [
      ["Crash Orbit tournament is live", "Altitude Week is underway. Your best completed cash-out this week is 1.86x. The top ten share 250,000 coins.", "promo", "/promotions", false, 1],
      ["New sign-in detected", "A sign-in to your account was recorded from your current browser. If this was not you, change your password and sign out other sessions.", "security", "/account/security", false, 2],
      ["Your Mines Vault round settled", "A 150.00-coin round ended on a mine. Review the full round in game activity.", "game", "/account/activity", true, 3],
      ["Welcome to 19xbet365", "Your coin wallet is ready. Explore sports, originals, and responsible-play tools.", "system", "/account", true, 30]
    ];
    for (const [title, body, type, link, read, days] of notes) {
      await client.query(
        `INSERT INTO notifications (account_id,title,body,type,link,read_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [ids.alexrowan, title, body, type, link, read ? isoDaysAgo(days, 12) : null, isoDaysAgo(days, 12)]
      );
    }

    // Support tickets --------------------------------------------------------
    const tickets = [
      { player: "alexrowan", subject: "How do I set a session reminder?", category: "responsible", priority: "normal", status: "open", messages: [["alexrowan", "I can see the daily limit but I want a reminder after a set amount of time. Where is that?"], ["luca", "Open Account → Responsible Gaming. Session reminders are in the second panel. You can choose 30, 60, or 120 minutes. Happy to help further."]] },
      { player: "sofialind", subject: "Account review documents", category: "account", priority: "high", status: "pending", messages: [["sofialind", "My account is suspended pending verification. Which document should I upload first?"], ["owen", "Please open a secure message with our support team. For this demonstration, no identity documents are collected.", true]] },
      { player: "noahkim", subject: "Missing round in activity", category: "games", priority: "normal", status: "resolved", messages: [["noahkim", "I played a round earlier and can’t find it in my history."], ["mira", "I found the round and confirmed the settled result. It appears in Game Activity now."]] }
    ];
    for (const t of tickets) {
      const created = await client.query(
        `INSERT INTO support_tickets (account_id,subject,category,priority,status,assigned_to,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [ids[t.player], t.subject, t.category, t.priority, t.status, t.priority === "high" ? ids.owen : ids.luca, isoDaysAgo(2, 14)]
      );
      for (const [index, [sender, body, internal]] of t.messages.entries()) {
        const messageAt = new Date(isoDaysAgo(2, 15));
        messageAt.setMinutes(messageAt.getMinutes() + index * 6);
        await client.query(
          `INSERT INTO support_messages (ticket_id,sender_id,body,is_internal,created_at) VALUES ($1,$2,$3,$4,$5)`,
          [created.rows[0].id, ids[sender], body, !!internal, messageAt.toISOString()]
        );
      }
      if (t.messages.length) {
        const lastAt = new Date(isoDaysAgo(2, 15));
        lastAt.setMinutes(lastAt.getMinutes() + (t.messages.length - 1) * 6);
        await client.query("UPDATE support_tickets SET updated_at = $1 WHERE id = $2", [lastAt.toISOString(), created.rows[0].id]);
      }
    }

    // Transfer requests and an invitation ------------------------------------
    await client.query(
      `INSERT INTO account_transfers (account_id,from_parent_id,to_parent_id,requested_by,reason,status,created_at)
       VALUES ($1,$2,$3,$4,'Rebalancing the Mercer branch after a regional reassignment.','pending',$5)`,
      [ids.mateocruz, ids.luca, ids.jonas, ids.owen, isoDaysAgo(1, 16)]
    );
    await client.query(
      `INSERT INTO account_transfers (account_id,from_parent_id,to_parent_id,requested_by,reason,status,created_at)
       VALUES ($1,$2,$3,$4,'Player requested to move under the Chen network.','pending',$5)`,
      [ids.camilarojas, ids.priya, ids.mira, ids.priya, isoDaysAgo(0, 6)]
    );
    await client.query(
      `INSERT INTO account_invitations (email,display_name,role_code,parent_id,invited_by,token_hash,status,expires_at,created_at)
       VALUES ('new.agent@19xbet365.test','Talia Hart','agent',$1,$2,$3,'pending',now()+interval '5 days',now()-interval '1 day')`,
      [ids.chen, ids.chen, sha256(randomToken(24))]
    );

    // Seed audit trail (hash-chained, append-only) ---------------------------
    const auditSeed = [
      { actor: "master", action: "platform.foundation_initialized", entityType: "platform", entityId: "19xbet365", summary: "19xbet365 foundation initialized with coin controls enabled." },
      { actor: "master", action: "real_money.disabled", entityType: "configuration", entityId: "realMoneyEnabled", summary: "Real-money deposits, withdrawals, and wagering hard-disabled pending licensing." },
      { actor: "mercer", action: "account.suspended", entityType: "account", entityId: ids.sofialind, summary: "Suspended Sofia Lind pending ownership verification." },
      { actor: "owen", action: "credits.credited", entityType: "account", entityId: ids.mateocruz, summary: "Credited 2,500.00 coins to Mateo Cruz: tournament correction." },
      { actor: "chen", action: "network.branch_reviewed", entityType: "network", entityId: ids.chen, summary: "Reviewed the Chen branch hierarchy and direct-player assignments." },
      { actor: "master", action: "settings.updated", entityType: "setting", entityId: "licenseStatus", summary: "Confirmed demonstration licensing status in platform settings." },
      { actor: "priya", action: "support.ticket_updated", entityType: "support_ticket", entityId: null, summary: "Resolved a support ticket in the Nair delegated network." },
      { actor: "master", action: "roles.permissions_updated", entityType: "role", entityId: "sub_admin", summary: "Reviewed delegated permissions for the Sub-admin role." },
      { actor: "luca", action: "player.onboarded", entityType: "account", entityId: ids.niawilliams, summary: "Onboarded Nia Williams under the Moretti branch." },
      { actor: "mira", action: "transfer.rejected", entityType: "account_transfer", entityId: null, summary: "Rejected a duplicate in-network transfer request." }
    ];
    for (const event of auditSeed) {
      await appendAudit(client, {
        actorId: ids[event.actor],
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        summary: event.summary,
        after: null,
        before: null,
        ip: "seed"
      });
    }

    await client.query("COMMIT");
    console.log(`Seed complete. ${PLAYERS.length} players, ${catalog.games.length} games, ${catalog.matches.length} fixtures.`);
    console.log("Demo credentials: player@19xbet365.test / 19X#2026 — admin@19xbet365.test / 19X#2026");
    console.log("Admin branches: admin.mercer@19xbet365.test, admin.chen@19xbet365.test — all with 19X#2026");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
