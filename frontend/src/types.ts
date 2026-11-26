export type Role = "master_admin" | "admin" | "sub_admin" | "agent" | "player";

export interface Account {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  roleName: string;
  roleRank: number;
  permissions: string[];
  parentId: string | null;
  referredBy: string | null;
  referralCode: string;
  status: "active" | "suspended" | "pending" | "closed";
  balance: number;
  xp: number;
  level: number;
  country: string;
  phone: string | null;
  avatarSeed: string;
  twoFactorEnabled: boolean;
  marketingOptIn: boolean;
  authProvider?: "password" | "firebase";
  emailVerified?: boolean;
  firebaseLinked?: boolean;
  suspendedReason: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  current: boolean;
}

export interface Sport {
  slug: string;
  name: string;
  icon: string;
  count: number;
}

export interface Match {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: "upcoming" | "live" | "finished" | "suspended";
  minute: string | null;
  scoreHome: string | null;
  scoreAway: string | null;
  odds: { home: number | null; draw: number | null; away: number | null };
  featured: boolean;
  demo: boolean;
}

export type GameCategory =
  | "crash"
  | "mines"
  | "plinko"
  | "dice"
  | "wheel"
  | "coinflip"
  | "cards"
  | "lucky"
  | "slots"
  | "racing"
  | "slots-provider"
  | "live-casino"
  | "virtuals";

export interface GameTheme {
  from: string;
  to: string;
  accent: string;
  icon: string;
}

export interface Game {
  id: string;
  name: string;
  category: GameCategory;
  provider: string;
  playable: boolean;
  integrationStatus: "playable_demo" | "provider_required";
  rtp: number | null;
  volatility: string;
  tagline: string;
  description: string;
  theme: GameTheme;
  features: string[];
  howTo: string[];
  badge: string | null;
  featured: boolean;
  players: number;
  maxWin: string;
  sortOrder?: number;
  status?: string;
  round_count?: number;
  total_wagered?: number;
}

export interface Promotion {
  id: string;
  title: string;
  kicker: string;
  description: string;
  type: string;
  badge: string | null;
  theme: string;
  endsAt: string | null;
  cta: string;
  terms: string;
  prize: string | null;
  active?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  gameId: string | null;
  prizePool: number;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "live" | "finished";
  participants: number;
  leaderboard: [string, number][];
}

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  body: string;
}

export interface BootstrapData {
  serverTime: string;
  sports: Sport[];
  matches: Match[];
  games: Game[];
  promotions: Promotion[];
  tournaments: Tournament[];
  settings: Record<string, unknown>;
  announcements: { type: string; title: string; body: string }[];
  helpArticles?: HelpArticle[];
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface GameRound {
  id: string;
  game_id: string;
  game_name: string;
  category?: string;
  bet: number;
  payout: number;
  status: string;
  outcome: Record<string, unknown> & { summary?: string; multiplier?: number; win?: boolean };
  created_at: string;
  settled_at?: string | null;
}

export interface BetSelection {
  id?: string;
  matchId: string;
  selection: "home" | "draw" | "away";
  selectionLabel: string;
  odds: number;
  result?: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  sport?: string;
}

export interface Bet {
  id: string;
  type: "single" | "acca";
  stake: number;
  total_odds: number;
  potential_return: number;
  status: "open" | "won" | "lost" | "void" | "cashed_out";
  payout: number;
  placed_at: string;
  settled_at: string | null;
  selections: BetSelection[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "info" | "promo" | "security" | "game" | "system";
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Limits {
  account_id?: string;
  daily_bet_limit: number | null;
  session_limit_minutes: number | null;
  reality_check_minutes: number;
  cool_off_until: string | null;
  self_exclusion_until: string | null;
  updated_at?: string;
}

export interface SupportTicket {
  id: string;
  account_id: string;
  subject: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "pending" | "resolved" | "closed";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string | null;
  last_message_at?: string | null;
  account_name?: string;
  account_email?: string;
  assigned_name?: string | null;
}

export interface SupportMessage {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_role?: string;
}

export interface PlayerOverview {
  user: Account;
  stats: {
    openBets: number;
    settledBets: number;
    totalStaked: number;
    totalReturned: number;
    totalRounds: number;
    totalWagered: number;
    totalWon: number;
    favorites: number;
    unreadNotifications: number;
    totalNotifications: number;
    referrals: number;
    rewardedReferrals: number;
    openTickets: number;
  };
  recentTransactions: Transaction[];
  recentRounds: GameRound[];
  limits: Limits | null;
}

export interface NetworkNode {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  roleName: string;
  roleRank: number;
  parentId: string | null;
  status: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  avatarSeed: string;
  children: NetworkNode[];
}

export interface AdminOverview {
  scope: { global: boolean; accountCount: number | null; label: string };
  metrics: {
    accounts: number;
    activeAccounts: number;
    suspendedAccounts: number;
    newThisWeek: number;
    virtualBalance: number;
    gameWagered: number;
    gamePaid: number;
    margin: number;
    roundsToday: number;
    openTickets: number;
    urgentTickets: number;
    failedLogins: number;
    pendingDeposits: number;
    openRoutes: number;
  };
  roleCounts: { role: Role; count: number }[];
  series: { day: string; signups: number; wagered: number; paid: number }[];
  alerts: {
    suspended: number;
    failedLogins: number;
    creditActions: number;
    pendingTransfers: number;
    pendingDeposits: number;
  };
  recentAudit: AuditEvent[];
  auditChainTip: { event_hash: string; prev_hash: string } | null;
  generatedAt: string;
}

export interface AdminRevenue {
  scope: { global: boolean; accountCount: number | null };
  summary: {
    sportsStakes: number;
    sportsPayouts: number;
    sportsGgr: number;
    openExposure: number;
    openBets: number;
    settledBets: number;
    gameStakes: number;
    gamePayouts: number;
    gameGgr: number;
    settledRounds: number;
    fantasyStakes: number;
    fantasyPayouts: number;
    fantasyGgr: number;
    openFantasyEntries: number;
    grossGamingRevenue: number;
    promotionalCost: number;
    welcomeAllocations: number;
    netGamingRevenue: number;
    depositsApproved: number;
    depositBonuses: number;
    pendingDeposits: number;
    withdrawalsPaid: number;
    withdrawalsPending: number;
    pendingWithdrawals: number;
    playerBalances: number;
    activeAccounts: number;
    activePlayers24h: number;
  };
  byGame: { id: string; name: string; category: string; rounds: number; stakes: number; payouts: number; ggr: number }[];
  series: { day: string; sportsGgr: number; sportsStakes: number; gameGgr: number; gameStakes: number; deposits: number }[];
  generatedAt: string;
}

export type FantasyRole = "wk" | "bat" | "ar" | "bowl";
export type FantasyStatus = "draft" | "open" | "locked" | "live" | "settled" | "cancelled";

export interface FantasyContest {
  id: string;
  name: string;
  sport: string;
  matchId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  status: FantasyStatus;
  salaryCap: number;
  entryFee: number;
  maxEntries: number;
  maxEntriesPerUser: number;
  prizePool: number;
  rakePercent: number;
  lockAt: string;
  startTime: string;
  settledAt: string | null;
  entries: number;
  collected: number;
  myEntries: number;
  rules: Record<string, unknown>;
}

export interface FantasyTier { rankFrom: number; rankTo: number; amount: number }
export interface FantasyPlayer { id: string; team: string; name: string; role: FantasyRole; salary: number }
export interface FantasyEntry {
  id: string;
  contestId: string;
  lineup: string[];
  captainId: string;
  viceCaptainId: string;
  entryFee: number;
  status: "confirmed" | "cancelled" | "settled";
  score: number;
  rank: number | null;
  payout: number;
  createdAt: string;
  settledAt: string | null;
}
export interface FantasyLeaderboardRow {
  entryId: string;
  accountId: string;
  player: string;
  score: number;
  rank: number;
  payout: number;
}
export interface FantasyDetail {
  contest: FantasyContest;
  tiers: FantasyTier[];
  players: FantasyPlayer[];
  rules: { size: number; roles: Record<FantasyRole, number>; maxFromOneTeam: number; captainMultiplier: number; viceCaptainMultiplier: number };
  myEntries: FantasyEntry[];
  leaderboard: FantasyLeaderboardRow[];
}

export interface AdminFantasyContest extends Omit<FantasyContest, "myEntries" | "rules"> {
  scoredPlayers: number;
  createdAt: string;
}

export interface AdminFantasyDetail {
  contest: AdminFantasyContest;
  tiers: FantasyTier[];
  entries: (FantasyEntry & { player: string; email: string })[];
  players: FantasyPlayer[];
  scores: Record<string, number>;
}

export interface Verification {
  id?: string;
  status: "not_started" | "pending" | "approved" | "rejected";
  legalName: string;
  dateOfBirth: string;
  country: string;
  address: string;
  documentType: string;
  documentReference: string;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  destination: string;
  status: "pending" | "approved" | "paid" | "rejected" | "cancelled";
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  reviewNote: string | null;
}

export interface WithdrawalConfig {
  enabled: boolean;
  min: number;
  max: number;
  kycRequired: boolean;
  kycStatus: string;
}

export interface AdminVerification extends Omit<Verification, "id"> {
  id: string;
  accountId: string;
  player: string;
  email: string;
}

export interface AdminWithdrawal extends Omit<WithdrawalRequest, "destination"> {
  accountId: string;
  player: string;
  email: string;
  destination: string;
  destinationMasked: string;
  reviewNote: string | null;
}

export interface AuditEvent {
  id: string | number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  prev_hash: string | null;
  event_hash: string;
  created_at: string;
  actor_name?: string | null;
  actor_role?: string | null;
}

export interface AdminAccount extends Account {
  parentName: string | null;
  directCount: number;
  betCount: number;
  roundCount: number;
  invitedPending: boolean;
  rank: number;
}

export interface RoleInfo {
  code: Role;
  name: string;
  rank: number;
  description: string;
  permissions: string[];
  count: number;
}

export interface AdminTicket extends SupportTicket {
  account_name: string;
  account_email: string;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
  assigned_name: string | null;
}

export interface Transfer {
  id: string;
  account_id: string;
  from_parent_id: string | null;
  to_parent_id: string;
  requested_by: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  resolved_at: string | null;
  account_name: string;
  account_email: string;
  from_name: string | null;
  to_name: string;
  requester_name: string;
}

export interface GameActivity {
  topWins: { id: string; payout: number; multiplier: number; name: string; createdAt: string }[];
  stats: { rounds: number; players: number; largestWin: number };
}

export interface SystemHealth {
  status: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  memory: { rss: number; heapTotal: number; heapUsed: number };
  db: { latencyMs: number; db: string; queryLatencyMs: number; size: string };
  counts: Record<string, number>;
  integrations: { status: string; count: number }[];
  auditChain: { checked: number; broken: number; intact: boolean };
  realMoneyRails: Record<string, unknown>;
  services: { name: string; status: string; detail: string }[];
}

export interface DepositTier {
  min: number;
  percent: number;
}

export interface DepositConfig {
  mode: "sandbox" | "manual_review" | "disabled";
  qrImageUrl: string;
  instructions: string;
  tiers: DepositTier[];
  min: number;
  max: number;
  livePaymentsEnabled: boolean;
}

export interface DepositRequest {
  id: string;
  amount: number;
  method: string;
  reference: string;
  note: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  bonusAmount: number;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminDeposit extends DepositRequest {
  accountId: string;
  player: string;
  username: string;
  email: string;
  bonusPercent?: number | null;
  bonusExpected?: boolean;
}

export interface ApiErrorShape {
  error?: string;
  message?: string;
}
