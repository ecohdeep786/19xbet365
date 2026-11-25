import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Match } from "../types";
import { api, isOfflineError } from "../lib/api";
import { round2 } from "./betUtils";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

export interface SlipSelection {
  matchId: string;
  selection: "home" | "draw" | "away";
  odds: number;
  matchLabel: string;
  league: string;
  sport: string;
  startTime: string;
}

const SLIP_STORAGE_KEY = "19x:bet-slip";

function readSavedSlip(): { selections: SlipSelection[]; stake: number } | null {
  try {
    const raw = window.localStorage.getItem(SLIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const { selections, stake } = parsed as { selections?: unknown; stake?: unknown };
    if (!Array.isArray(selections) || !selections.length) return null;
    const valid = selections.filter((item): item is SlipSelection =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as SlipSelection).matchId === "string" &&
      ((item as SlipSelection).selection === "home" || (item as SlipSelection).selection === "draw" || (item as SlipSelection).selection === "away") &&
      typeof (item as SlipSelection).odds === "number" && Number.isFinite((item as SlipSelection).odds)
    );
    if (!valid.length) return null;
    const savedStake = typeof stake === "number" && Number.isFinite(stake) ? stake : 100;
    return { selections: valid, stake: Math.max(0, Math.min(5000, savedStake)) };
  } catch {
    return null;
  }
}

function saveSlip(slip: { selections: SlipSelection[]; stake: number }) {
  try {
    window.localStorage.setItem(SLIP_STORAGE_KEY, JSON.stringify(slip));
  } catch {
    // localStorage unavailable — skip persistence silently
  }
}

interface BetSlipValue {
  selections: SlipSelection[];
  stake: number;
  setStake: (value: number) => void;
  mode: "single" | "acca";
  setMode: (mode: "single" | "acca") => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSelection: (match: Match, selection: "home" | "draw" | "away", odds: number) => void;
  removeSelection: (matchId: string) => void;
  clear: () => void;
  totalOdds: number;
  potentialReturn: number;
  placeBet: () => Promise<boolean>;
  busy: boolean;
}

const BetSlipContext = createContext<BetSlipValue | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const { user, offline, updateUser } = useAuth();
  const { push } = useToast();
  const [selections, setSelections] = useState<SlipSelection[]>([]);
  const [stake, setStakeState] = useState(100);
  const [mode, setMode] = useState<"single" | "acca">("single");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const setStake = useCallback((value: number) => {
    setStakeState(Math.max(0, Math.min(5000, Number.isFinite(value) ? value : 0)));
  }, []);

  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = readSavedSlip();
    if (saved) {
      setSelections(saved.selections);
      setStakeState(saved.stake);
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    saveSlip({ selections, stake });
  }, [restored, selections, stake]);

  const toggleSelection = useCallback((match: Match, selection: "home" | "draw" | "away", odds: number) => {
    setSelections((current) => {
      const existing = current.find((item) => item.matchId === match.id);
      if (existing && existing.selection === selection) {
        return current.filter((item) => item.matchId !== match.id);
      }
      const next: SlipSelection = {
        matchId: match.id,
        selection,
        odds,
        matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
        league: match.league,
        sport: match.sport,
        startTime: match.startTime
      };
      return [...current.filter((item) => item.matchId !== match.id), next];
    });
    setOpen(true);
  }, []);

  const removeSelection = useCallback((matchId: string) => {
    setSelections((current) => current.filter((item) => item.matchId !== matchId));
  }, []);

  const clear = useCallback(() => setSelections([]), []);

  const totalOdds = useMemo(() => round2(selections.reduce((product, item) => product * item.odds, 1)), [selections]);
  const effectiveMode = selections.length > 1 ? "acca" : "single";
  const potentialReturn = useMemo(() => round2(stake * totalOdds), [stake, totalOdds]);

  const placeBet = useCallback(async () => {
    if (!user) {
      push("Sign in or create an account to place your coin bet.", "info");
      return false;
    }
    if (!selections.length) {
      push("Add at least one selection to your bet slip.", "info");
      return false;
    }
    if (stake < 10) {
      push("The minimum coin stake is 10 coins.", "error");
      return false;
    }
    setBusy(true);
    try {
      if (offline) {
        const balance = Math.max(0, round2(user.balance - stake));
        updateUser({ balance });
        push(`Demo bet placed at ${totalOdds.toFixed(2)} total odds. Browser preview only.`, "success", "Bet placed");
        setSelections([]);
        setOpen(false);
        return true;
      }
      const data = await api.placeBet({
        selections: selections.map((item) => ({ matchId: item.matchId, selection: item.selection })),
        stake,
        mode: effectiveMode
      });
      updateUser({ balance: data.balance });
      const potential = Number(data.bet.potentialReturn ?? (data.bet as { potential_return?: number }).potential_return ?? 0);
      push(`${data.message} Potential return ${potential.toFixed(2)} coins.`, "success", "Bet placed");
      setSelections([]);
      setOpen(false);
      return true;
    } catch (error) {
      if (isOfflineError(error)) {
        const balance = Math.max(0, round2(user.balance - stake));
        updateUser({ balance });
        push("API unreachable — demo bet simulated in browser preview.", "info", "Preview mode");
        setSelections([]);
        return true;
      }
      push(error instanceof Error ? error.message : "Could not place the bet.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }, [user, selections, stake, offline, totalOdds, effectiveMode, updateUser, push]);

  const value = useMemo<BetSlipValue>(() => ({
    selections, stake, setStake, mode: effectiveMode, setMode, open, setOpen,
    toggleSelection, removeSelection, clear, totalOdds, potentialReturn, placeBet, busy
  }), [selections, stake, setStake, effectiveMode, open, toggleSelection, removeSelection, clear, totalOdds, potentialReturn, placeBet, busy]);

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside BetSlipProvider");
  return ctx;
}
