import type { Game, GameRound } from "../../types";

export interface GameProps {
  game: Game;
  stake: number;
  setStake: (value: number) => void;
  balance: number;
  onBalance: (value: number) => void;
  onSettled: (message: string, round?: GameRound) => void;
  offline: boolean;
  onBusyChange?: (busy: boolean) => void;
}
