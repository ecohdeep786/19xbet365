import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BootstrapData, Game, Match, Notification } from "../types";
import { api, isOfflineError } from "../lib/api";
import { demoBootstrap, demoGames, demoMatches, demoNotifications } from "../lib/demo";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface DataValue {
  bootstrap: BootstrapData | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  games: Game[];
  matches: Match[];
  gamesById: Map<string, Game>;
  favorites: Set<string>;
  recentGames: Game[];
  notifications: Notification[];
  unreadCount: number;
  liveConnected: boolean;
  refresh: () => Promise<void>;
  toggleFavorite: (gameId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addRecent: (gameId: string) => void;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, offline } = useAuth();
  const { push } = useToast();
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    if (offline) { setLiveConnected(false); return; }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    const connect = () => {
      try {
        socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
        socket.onopen = () => setLiveConnected(true);
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(String(event.data));
            if (message.type === "bet.settled") {
              window.dispatchEvent(new CustomEvent("19x:bet-settled", { detail: message }));
            }
          } catch { /* ignore malformed live events */ }
        };
        socket.onclose = () => {
          setLiveConnected(false);
          retry = window.setTimeout(connect, 6000);
        };
        socket.onerror = () => { socket?.close(); };
      } catch {
        setLiveConnected(false);
      }
    };
    connect();
    return () => {
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
  }, [offline]);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.bootstrap();
      setBootstrap(data);
      setError(null);
      setDemoMode(false);
    } catch (err) {
      if (isOfflineError(err)) {
        setBootstrap(demoBootstrap);
        setDemoMode(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load the platform.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBootstrap(); }, [loadBootstrap]);

  const refreshNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    if (offline) { setNotifications(demoNotifications); return; }
    try {
      const data = await api.notifications();
      setNotifications(data.notifications);
    } catch (err) {
      if (isOfflineError(err)) setNotifications(demoNotifications);
    }
  }, [user, offline]);

  useEffect(() => {
    (async () => {
      if (!user) {
        setFavorites(new Set());
        setRecentGames([]);
        setNotifications([]);
        return;
      }
      if (offline) {
        setFavorites(new Set(["crash-orbit", "mines-vault", "nova-fruits", "velocity-derby"]));
        setRecentGames(demoGames.filter((game) => ["crash-orbit", "nova-fruits", "mines-vault", "wheel-of-astra"].includes(game.id)));
        setNotifications(demoNotifications);
        return;
      }
      try {
        const [fav, recent] = await Promise.all([api.favorites(), api.recent()]);
        setFavorites(new Set(fav.games.map((game) => game.id)));
        setRecentGames(recent.games);
      } catch { /* empty states remain */ }
      refreshNotifications();
    })();
  }, [user, offline, refreshNotifications]);

  useEffect(() => {
    const onSettled = (event: Event) => {
      const detail = (event as CustomEvent<{ accountId?: string; status?: string; payout?: number }>).detail;
      if (!user || !detail || detail.accountId !== user.id) return;
      const won = detail.status === "won";
      const body = won
        ? `Sports bet settled · ${Number(detail.payout || 0).toFixed(2)} VC returned.`
        : detail.status === "void"
          ? "Sports bet voided · stake returned."
          : "Sports bet settled · no return this time.";
      push(body, won ? "success" : "info", "Bet settlement");
      refreshNotifications();
    };
    window.addEventListener("19x:bet-settled", onSettled);
    return () => window.removeEventListener("19x:bet-settled", onSettled);
  }, [user, push, refreshNotifications]);

  const toggleFavorite = useCallback(async (gameId: string) => {
    if (!user) {
      push("Sign in to save games to your favourites.", "info");
      return;
    }
    const isFav = favorites.has(gameId);
    setFavorites((current) => {
      const next = new Set(current);
      if (isFav) next.delete(gameId); else next.add(gameId);
      return next;
    });
    if (offline) {
      push(isFav ? "Removed from favourites." : "Saved to favourites.", "success");
      return;
    }
    try {
      if (isFav) await api.removeFavorite(gameId);
      else await api.addFavorite(gameId);
      push(isFav ? "Removed from favourites." : "Saved to favourites.", "success");
    } catch (err) {
      setFavorites((current) => {
        const next = new Set(current);
        if (isFav) next.add(gameId); else next.delete(gameId);
        return next;
      });
      push(err instanceof Error ? err.message : "Could not update favourites.", "error");
    }
  }, [user, favorites, offline, push]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    if (!offline) await api.readNotification(id).catch(() => {});
  }, [offline]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    if (!offline) await api.readAllNotifications().catch(() => {});
  }, [offline]);

  const addRecent = useCallback((gameId: string) => {
    const game = demoGames.find((item) => item.id === gameId) || bootstrap?.games.find((item) => item.id === gameId);
    if (!game) return;
    setRecentGames((current) => [game, ...current.filter((item) => item.id !== gameId)].slice(0, 12));
  }, [bootstrap]);

  const games = bootstrap?.games || [];
  const matches = bootstrap?.matches || [];
  const gamesById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const value = useMemo<DataValue>(() => ({
    bootstrap, loading, error, demoMode: demoMode || offline, games, matches, gamesById,
    favorites, recentGames, notifications, unreadCount, liveConnected,
    refresh: loadBootstrap, toggleFavorite, markNotificationRead, markAllRead,
    refreshNotifications, addRecent
  }), [bootstrap, loading, error, demoMode, offline, games, matches, gamesById, favorites, recentGames, notifications, unreadCount, liveConnected, loadBootstrap, toggleFavorite, markNotificationRead, markAllRead, refreshNotifications, addRecent]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

export const fallbackMatches = demoMatches;
