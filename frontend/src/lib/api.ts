import type {
  Account, AdminAccount, AdminOverview, AdminTicket, AuditEvent, Bet, BootstrapData,
  Game, GameActivity, GameRound, Limits, Match, NetworkNode, Notification, PlayerOverview,
  Promotion, RoleInfo, SessionInfo, SupportMessage, SupportTicket, SystemHealth, Tournament,
  Transaction, Transfer
} from "../types";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 0, code = "network_error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isOfflineError(error: unknown) {
  return error instanceof ApiError && error.status === 0;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new ApiError("The 19X API is unreachable. Browser preview is running in demo mode.", 0, "offline");
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
      window.dispatchEvent(new Event("19x:unauthorized"));
    }
    const shape = (data || {}) as { error?: string; message?: string };
    throw new ApiError(shape.message || "Something went wrong.", response.status, shape.error || "request_failed");
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  me: () => request<{ user: Account | null }>("/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: Account }>("/auth/login", { method: "POST", body: json({ email, password }) }),
  register: (payload: {
    email: string; password: string; displayName: string; username?: string;
    referralCode?: string; marketingOptIn?: boolean;
  }) => request<{ user: Account }>("/auth/register", { method: "POST", body: json(payload) }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string }>("/auth/forgot-password", { method: "POST", body: json({ email }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>("/auth/change-password", { method: "POST", body: json({ currentPassword, newPassword }) }),
  setTwoFactor: (enabled: boolean) =>
    request<{ ok: boolean; enabled: boolean }>("/auth/2fa", { method: "POST", body: json({ enabled }) }),
  sessions: () => request<{ sessions: SessionInfo[] }>("/auth/sessions"),
  revokeSession: (id: string) => request<{ ok: boolean }>(`/auth/sessions/${id}`, { method: "DELETE" }),
  updateProfile: (payload: { displayName: string; country: string; phone?: string; marketingOptIn?: boolean }) =>
    request<{ user: Account }>("/auth/profile", { method: "PATCH", body: json(payload) }),

  bootstrap: () => request<BootstrapData>("/bootstrap"),
  publicMatches: (params = "") => request<{ matches: Match[] }>(`/matches${params}`),
  publicGames: (params = "") => request<{ games: Game[] }>(`/games${params}`),
  game: (id: string) => request<{ game: Game }>(`/games/${id}`),
  promotions: () => request<{ promotions: Promotion[] }>("/promotions"),
  tournaments: () => request<{ tournaments: Tournament[] }>("/tournaments"),
  contentPage: (slug: string) => request<{ page: { slug: string; title: string; category: string; body: string; status: string; updated_at: string } }>(`/content/${slug}`),

  overview: () => request<PlayerOverview>("/player/overview"),
  transactions: (limit = 30, offset = 0, type?: string) =>
    request<{ transactions: Transaction[]; total: number }>(`/player/transactions?limit=${limit}&offset=${offset}${type ? `&type=${encodeURIComponent(type)}` : ""}`),
  bets: (status?: string) => request<{ bets: Bet[] }>(`/player/bets${status ? `?status=${status}` : ""}`),
  rounds: (limit = 30, game?: string) =>
    request<{ rounds: GameRound[] }>(`/player/rounds?limit=${limit}${game ? `&game=${encodeURIComponent(game)}` : ""}`),
  notifications: () => request<{ notifications: Notification[] }>("/player/notifications"),
  readNotification: (id: string) => request<{ ok: boolean }>(`/player/notifications/${id}/read`, { method: "POST" }),
  readAllNotifications: () => request<{ ok: boolean }>("/player/notifications/read-all", { method: "POST" }),
  favorites: () => request<{ games: Game[] }>("/player/favorites"),
  addFavorite: (gameId: string) => request<{ ok: boolean }>(`/player/favorites/${gameId}`, { method: "POST" }),
  removeFavorite: (gameId: string) => request<{ ok: boolean }>(`/player/favorites/${gameId}`, { method: "DELETE" }),
  recent: () => request<{ games: Game[] }>("/player/recent"),
  responsible: () => request<{ limits: Limits | null }>("/player/responsible"),
  updateResponsible: (payload: Record<string, number | null>) =>
    request<{ limits: Limits; message: string }>("/player/responsible", { method: "PATCH", body: json(payload) }),
  referrals: () => request<{ code: string; referrals: { id: string; status: string; created_at: string; display_name: string; joined_at: string }[] }>("/player/referrals"),
  supportTickets: () => request<{ tickets: SupportTicket[] }>("/player/support"),
  supportTicket: (id: string) => request<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/player/support/${id}`),
  createTicket: (payload: { subject: string; category: string; body: string }) =>
    request<{ ticket: SupportTicket; message: string }>("/player/support", { method: "POST", body: json(payload) }),
  replyTicket: (id: string, body: string) =>
    request<{ ok: boolean }>(`/player/support/${id}/messages`, { method: "POST", body: json({ body }) }),

  placeBet: (payload: { selections: { matchId: string; selection: string }[]; stake: number; mode: string }) =>
    request<{
      bet: { id: string; type: string; stake: number; totalOdds: number; potentialReturn: number; status: string; placedAt: string };
      balance: number;
      message: string;
    }>("/bets", { method: "POST", body: json(payload) }),
  gameActivity: (id: string) => request<GameActivity>(`/games/${id}/activity`),
  playGame: (id: string, stake: number, params: Record<string, unknown> = {}, clientSeed?: string) =>
    request<{ round: GameRound; balance: number; message: string }>(`/games/${id}/play`, {
      method: "POST", body: json({ stake, params, clientSeed })
    }),
  crashStart: (stake: number, autoCashout: number | null) =>
    request<{ roundId: string; serverSeedHash: string; startedAt: string; balance: number; message: string }>("/games/crash-orbit/start", {
      method: "POST", body: json({ stake, autoCashout })
    }),
  crashStatus: (roundId: string) =>
    request<{ roundId: string; status: string; multiplier: number; crashPoint?: number; payout: number; balance: number; won?: boolean; autoCashout?: boolean }>(`/games/crash-orbit/${roundId}/status`),
  crashCashout: (roundId: string) =>
    request<{ status: string; multiplier?: number; crashPoint?: number; payout: number; balance: number; message: string }>(`/games/crash-orbit/${roundId}/cashout`, { method: "POST" }),
  minesStart: (stake: number, mines: number) =>
    request<{ roundId: string; minesCount: number; balance: number; message: string }>("/games/mines-vault/start", {
      method: "POST", body: json({ stake, mines })
    }),
  minesReveal: (roundId: string, tile: number) =>
    request<{ status: string; safe?: boolean; complete?: boolean; mines?: number[]; hitTile?: number; revealed: number[]; multiplier: number; payout: number; balance: number; message: string }>(`/games/mines-vault/${roundId}/reveal`, {
      method: "POST", body: json({ tile })
    }),
  minesCashout: (roundId: string) =>
    request<{ status: string; multiplier: number; payout: number; balance: number; mines: number[]; message: string }>(`/games/mines-vault/${roundId}/cashout`, { method: "POST" }),
  minesState: (roundId: string) =>
    request<{ roundId: string; status: string; revealed: number[]; minesCount: number; mines?: number[]; multiplier: number; payout: number; balance: number }>(`/games/mines-vault/${roundId}/state`),

  adminOverview: () => request<AdminOverview>("/admin/overview"),
  adminNetwork: () => request<{ roots: NetworkNode[]; summary: { total: number; balance: number; suspended: number; roles: Record<string, number> }; scope: { global: boolean; label: string } }>("/admin/network"),
  adminAccounts: (params: string) => request<{ accounts: AdminAccount[]; total: number; page: number; pages: number }>(`/admin/accounts?${params}`),
  adminSuspend: (id: string, reason: string) => request<{ ok: boolean; message: string }>(`/admin/accounts/${id}/suspend`, { method: "POST", body: json({ reason }) }),
  adminRestore: (id: string) => request<{ ok: boolean; message: string }>(`/admin/accounts/${id}/restore`, { method: "POST" }),
  adminCredits: (id: string, amount: number, reason: string) =>
    request<{ ok: boolean; balance: number; message: string }>(`/admin/accounts/${id}/credits`, { method: "POST", body: json({ amount, reason }) }),
  adminRole: (id: string, role: string) => request<{ ok: boolean; message: string }>(`/admin/accounts/${id}/role`, { method: "POST", body: json({ role }) }),
  adminRevokeSessions: (id: string) => request<{ ok: boolean; message: string }>(`/admin/accounts/${id}/revoke-sessions`, { method: "POST" }),
  adminInvite: (payload: { email: string; displayName: string; role: string }) =>
    request<{ accountId: string; credentials: { email: string; temporaryPassword: string }; message: string }>("/admin/staff", { method: "POST", body: json(payload) }),
  adminInvitations: () => request<{ invitations: { id: string; email: string; display_name: string; role_code: string; status: string; created_at: string; expires_at: string; parent_name: string; invited_by_name: string; role_name: string }[] }>("/admin/invitations"),
  adminRevokeInvitation: (id: string) => request<{ ok: boolean; message: string }>(`/admin/invitations/${id}/revoke`, { method: "POST" }),
  adminRoles: () => request<{ roles: RoleInfo[]; permissions: string[] }>("/admin/roles"),
  adminUpdateRole: (code: string, permissions: string[]) =>
    request<{ ok: boolean; permissions: string[]; message: string }>(`/admin/roles/${code}/permissions`, { method: "PATCH", body: json({ permissions }) }),
  adminGames: () => request<{ games: Game[] }>("/admin/games"),
  adminUpdateGame: (id: string, payload: Record<string, unknown>) =>
    request<{ ok: boolean; message: string }>(`/admin/games/${id}`, { method: "PATCH", body: json(payload) }),
  adminContent: () => request<{ pages: { slug: string; title: string; category: string; body: string; status: string; updated_at: string }[]; promotions: Promotion[] }>("/admin/content"),
  adminUpdatePage: (slug: string, payload: { title?: string; body?: string; status?: string }) =>
    request<{ ok: boolean; message: string }>(`/admin/content/pages/${slug}`, { method: "PATCH", body: json(payload) }),
  adminUpdatePromotion: (id: string, payload: Record<string, unknown>) =>
    request<{ ok: boolean; message: string }>(`/admin/content/promotions/${id}`, { method: "PATCH", body: json(payload) }),
  adminCreditsLedger: () => request<{ summary: { credited: number; debited: number; adjustments: number }; activity: (Transaction & { account_name: string; account_email: string; actor_name: string | null })[]; series: { day: string; credited: number; debited: number }[] }>("/admin/credits"),
  adminTickets: () => request<{ tickets: AdminTicket[] }>("/admin/support"),
  adminTicket: (id: string) => request<{ ticket: AdminTicket & { balance: number }; messages: SupportMessage[] }>(`/admin/support/${id}`),
  adminUpdateTicket: (id: string, payload: { status?: string; priority?: string; assign?: boolean | string }) =>
    request<{ ok: boolean; message: string }>(`/admin/support/${id}`, { method: "PATCH", body: json(payload) }),
  adminReplyTicket: (id: string, body: string, isInternal = false) =>
    request<{ ok: boolean }>(`/admin/support/${id}/messages`, { method: "POST", body: json({ body, isInternal }) }),
  adminTransfers: () => request<{ transfers: Transfer[] }>("/admin/transfers"),
  adminCreateTransfer: (payload: { accountId: string; toParentId: string; reason: string }) =>
    request<{ transfer: Transfer; message: string }>("/admin/transfers", { method: "POST", body: json(payload) }),
  adminApproveTransfer: (id: string) => request<{ ok: boolean; message: string }>(`/admin/transfers/${id}/approve`, { method: "POST" }),
  adminRejectTransfer: (id: string) => request<{ ok: boolean; message: string }>(`/admin/transfers/${id}/reject`, { method: "POST" }),
  adminSecurity: () => request<{
    failedLogins: { id: string; email: string; ip: string; user_agent: string; reason: string; created_at: string; display_name: string | null }[];
    activeSessions: { id: string; ip: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string; display_name: string; email: string; role_code: string }[];
    suspendedAccounts: { id: string; display_name: string; email: string; suspended_reason: string; updated_at: string }[];
    recentAdjustments: (Transaction & { display_name: string })[];
    auditChain: { checked: number; broken: number; intact: boolean };
    auditTip: { event_hash: string; prev_hash: string; created_at: string } | null;
  }>("/admin/security"),
  adminAudit: (page = 1, limit = 25, action = "") =>
    request<{ events: AuditEvent[]; total: number; page: number; pages: number; chain: { checked: number; broken: number; intact: boolean }; immutable: boolean }>(`/admin/audit?page=${page}&limit=${limit}${action ? `&action=${encodeURIComponent(action)}` : ""}`),
  adminSettings: () => request<{ settings: { key: string; value: unknown; description: string; updated_at: string }[] }>("/admin/settings"),
  adminUpdateSetting: (key: string, value: unknown) =>
    request<{ ok: boolean; message: string }>(`/admin/settings/${key}`, { method: "PATCH", body: json({ value }) }),
  adminSystem: () => request<SystemHealth>("/admin/system"),
  adminBroadcast: (title: string, body: string) =>
    request<{ ok: boolean; recipients: number; message: string }>("/admin/notifications", { method: "POST", body: json({ title, body }) })
};
