import catalogJson from "../data/catalog.json";
import type {
  Account, Bet, BootstrapData, Game, GameRound, Match, Notification, PlayerOverview,
  Promotion, SupportMessage, SupportTicket, Tournament, Transaction
} from "../types";

type RawGame = {
  id: string; name: string; category: string; provider: string; playable: boolean;
  integrationStatus: string; rtp: number | null; volatility: string; tagline: string;
  description: string; theme: { from: string; to: string; accent: string; icon: string };
  features: string[]; howTo: string[]; badge: string | null; featured: boolean;
  players: number; maxWin: string; sortOrder: number;
};

type RawMatch = {
  id: string; sport: string; league: string; homeTeam: string; awayTeam: string;
  startTime: string; status: Match["status"]; minute: string | null;
  scoreHome: string | null; scoreAway: string | null;
  oddsHome: number | null; oddsDraw: number | null; oddsAway: number | null;
  featured: boolean;
};

const catalog = catalogJson as unknown as {
  sports: BootstrapData["sports"];
  matches: RawMatch[];
  games: RawGame[];
  promotions: Promotion[];
  tournaments: Tournament[];
  helpArticles: BootstrapData["helpArticles"];
};

const matchMapper = (m: RawMatch): Match => ({
  id: m.id, sport: m.sport, league: m.league, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
  startTime: m.startTime, status: m.status, minute: m.minute, scoreHome: m.scoreHome,
  scoreAway: m.scoreAway, odds: { home: m.oddsHome, draw: m.oddsDraw, away: m.oddsAway },
  featured: m.featured, demo: true
});

const gameMapper = (g: RawGame): Game => ({
  ...g,
  category: g.category as Game["category"],
  integrationStatus: g.integrationStatus as Game["integrationStatus"],
  status: "published"
});

export const demoMatches = catalog.matches.map(matchMapper);
export const demoGames = catalog.games.map(gameMapper);

export const demoBootstrap: BootstrapData = {
  serverTime: new Date().toISOString(),
  sports: catalog.sports,
  matches: [...demoMatches].sort((a, b) => Number(b.featured) - Number(a.featured)),
  games: demoGames,
  promotions: catalog.promotions,
  tournaments: catalog.tournaments,
  settings: {
    platformName: "19xbet365",
    platformTagline: "Play beyond the ordinary.",
    realMoneyEnabled: false,
    licenseStatus: "Demonstration — virtual credits only",
    thirdPartyIntegrations: "disabled"
  },
  announcements: [
    { type: "demo", title: "Virtual credits only", body: "19xbet365 uses non-redeemable virtual credits. No real-money wagering, deposits, or withdrawals are enabled." },
    { type: "integrity", title: "Server-authoritative rounds", body: "Every playable 19X Original round is generated and recorded on the server. Third-party titles remain clearly marked as integration-ready." }
  ],
  helpArticles: catalog.helpArticles
};

const now = new Date("2026-11-24T12:40:00.000Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

export const demoUser: Account = {
  id: "demo-player",
  username: "alexrowan",
  email: "player@19xbet365.test",
  displayName: "Alex Rowan",
  role: "player",
  roleName: "Player",
  roleRank: 4,
  permissions: [],
  parentId: null,
  referredBy: null,
  referralCode: "19X-357692",
  status: "active",
  balance: 22500,
  xp: 32400,
  level: 12,
  country: "United Kingdom",
  phone: null,
  avatarSeed: "a4c9b6",
  twoFactorEnabled: false,
  marketingOptIn: false,
  suspendedReason: null,
  lastLoginAt: ago(2),
  createdAt: "2026-10-13T14:00:00.000Z",
  updatedAt: ago(2)
};

export const demoTransactions: Transaction[] = [
  { id: "t1", type: "promo_credit", amount: 300, balance_after: 22500, description: "19X loyalty top-up — virtual credits", reference_type: "promotion", reference_id: "p1", created_at: ago(100) },
  { id: "t2", type: "bet_stake", amount: -300, balance_after: 22200, description: "Sports single · 1 selection", reference_type: "sports_bet", reference_id: "b1", created_at: ago(160) },
  { id: "t3", type: "bet_stake", amount: -400, balance_after: 22600, description: "Sports accumulator · 2 selections", reference_type: "sports_bet", reference_id: "b2", created_at: ago(220) },
  { id: "t4", type: "game_win", amount: 5590, balance_after: 23000, description: "Game win · Crash Orbit", reference_type: "game_round", reference_id: "r1", created_at: ago(4320) },
  { id: "t5", type: "game_stake", amount: -3000, balance_after: 17410, description: "Crash Orbit launch", reference_type: "game_round", reference_id: "r1", created_at: ago(4321) },
  { id: "t6", type: "game_win", amount: 300, balance_after: 20410, description: "Game win · Wheel of 19X", reference_type: "game_round", reference_id: "r2", created_at: ago(7200) }
];

export const demoRounds: GameRound[] = [
  { id: "r1", game_id: "crash-orbit", game_name: "Crash Orbit", bet: 3000, payout: 5590, status: "settled", outcome: { gameName: "Crash Orbit", multiplier: 1.86, win: true, summary: "Cashed out at 1.86x" }, created_at: ago(4320), settled_at: ago(4320) },
  { id: "r2", game_id: "wheel-of-astra", game_name: "Wheel of 19X", bet: 100, payout: 300, status: "settled", outcome: { gameName: "Wheel of 19X", multiplier: 3, win: true, summary: "Wheel stopped at 3.00x" }, created_at: ago(7200), settled_at: ago(7200) },
  { id: "r3", game_id: "mines-vault", game_name: "Mines Vault", bet: 150, payout: 0, status: "settled", outcome: { gameName: "Mines Vault", multiplier: 0, win: false, summary: "Mine hit at tile 3" }, created_at: ago(10080), settled_at: ago(10080) },
  { id: "r4", game_id: "nova-fruits", game_name: "Nova Fruits", bet: 100, payout: 0, status: "settled", outcome: { gameName: "Nova Fruits", multiplier: 0, win: false, summary: "No winning line" }, created_at: ago(20160), settled_at: ago(20160) }
];

export const demoBets: Bet[] = [
  {
    id: "b1", type: "single", stake: 300, total_odds: 2.05, potential_return: 615, status: "open", payout: 0,
    placed_at: ago(160), settled_at: null,
    selections: [{ matchId: "m001", selection: "home", selectionLabel: "Northbridge FC vs Riverside Athletic", odds: 2.05, homeTeam: "Northbridge FC", awayTeam: "Riverside Athletic", league: "Premier Division", sport: "football" }]
  },
  {
    id: "b2", type: "acca", stake: 400, total_odds: 3.18, potential_return: 1272, status: "open", payout: 0,
    placed_at: ago(220), settled_at: null,
    selections: [
      { matchId: "m021", selection: "home", selectionLabel: "Metro Giants vs Lakeview Storm", odds: 1.72, homeTeam: "Metro Giants", awayTeam: "Lakeview Storm", league: "National Basketball", sport: "basketball" },
      { matchId: "m022", selection: "home", selectionLabel: "Coastal Kings vs Ridge Raptors", odds: 1.85, homeTeam: "Coastal Kings", awayTeam: "Ridge Raptors", league: "National Basketball", sport: "basketball" }
    ]
  },
  {
    id: "b3", type: "single", stake: 250, total_odds: 2.05, potential_return: 512.5, status: "lost", payout: 0,
    placed_at: ago(21600), settled_at: ago(21600),
    selections: [{ matchId: "m003", selection: "home", selectionLabel: "Harbour City vs Southbank United", odds: 2.05, homeTeam: "Harbour City", awayTeam: "Southbank United", league: "Premier Division", sport: "football" }]
  }
];

export const demoNotifications: Notification[] = [
  { id: "n1", title: "Crash Orbit tournament is live", body: "Altitude Week is underway. Your best completed cash-out this week is 1.86x. The top ten share 250,000 VC.", type: "promo", link: "/promotions", read_at: null, created_at: ago(60) },
  { id: "n2", title: "New sign-in detected", body: "A sign-in to your account was recorded from your current browser. If this was not you, change your password and sign out other sessions.", type: "security", link: "/account/security", read_at: null, created_at: ago(180) },
  { id: "n3", title: "Your Mines Vault round settled", body: "A 150.00 VC round ended on a mine. Review the full round in game activity.", type: "game", link: "/account/activity", read_at: ago(10080), created_at: ago(10080) },
  { id: "n4", title: "Welcome to 19xbet365", body: "Your virtual-credit wallet is ready. Explore sports, originals, and responsible-play tools.", type: "system", link: "/account", read_at: ago(57600), created_at: ago(60480) }
];

export const demoOverview: PlayerOverview = {
  user: demoUser,
  stats: {
    openBets: 2, settledBets: 3, totalStaked: 8900, totalReturned: 1180,
    totalRounds: 6, totalWagered: 4900, totalWon: 5890, favorites: 4,
    unreadNotifications: 2, totalNotifications: 4, referrals: 1, rewardedReferrals: 1, openTickets: 1
  },
  recentTransactions: demoTransactions.slice(0, 6),
  recentRounds: demoRounds,
  limits: { daily_bet_limit: 5000, session_limit_minutes: 120, reality_check_minutes: 60, cool_off_until: null, self_exclusion_until: null }
};

export const demoTickets: SupportTicket[] = [
  { id: "st1", account_id: "demo-player", subject: "How do I set a session reminder?", category: "responsible", priority: "normal", status: "open", assigned_to: null, created_at: ago(2880), updated_at: ago(2800), message_count: 2, last_message_at: ago(2800) }
];

export const demoMessages: SupportMessage[] = [
  { id: "sm1", body: "I can see the daily limit but I want a reminder after a set amount of time. Where is that?", is_internal: false, created_at: ago(2880), sender_id: "demo-player", sender_name: "Alex Rowan", sender_role: "player" },
  { id: "sm2", body: "Open Account → Responsible Gaming. Session reminders are in the second panel. You can choose 30, 60, or 120 minutes. Happy to help further.", is_internal: false, created_at: ago(2800), sender_id: "agent", sender_name: "Luca Moretti", sender_role: "agent" }
];

export const demoAdmin: Account = {
  ...demoUser,
  id: "demo-admin",
  email: "admin@19xbet365.test",
  displayName: "Nadia Voss",
  username: "master_nadia",
  role: "master_admin",
  roleName: "Master Admin",
  roleRank: 0,
  permissions: ["network.view.global", "reports.view.global", "audit.view.global", "roles.manage", "settings.manage"],
  balance: 0,
  referralCode: "TEAM-698EAF",
  country: "United Kingdom"
};
