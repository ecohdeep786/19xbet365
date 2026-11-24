import type { ReactNode } from "react";
import { Coins, Sparkles } from "lucide-react";
import { vc } from "../../lib/format";

export function StakeBox({
  stake, setStake, balance, min = 5, max = 5000, disabled, children, title = "Your stake"
}: {
  stake: number;
  setStake: (value: number) => void;
  balance: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  children?: ReactNode;
  title?: string;
}) {
  return (
    <div className="stake-box">
      <div className="stake-box-head">
        <label htmlFor="game-stake">{title}</label>
        <span><Coins size={13} /> {vc(balance)}</span>
      </div>
      <div className="stake-input large">
        <input
          id="game-stake"
          type="number"
          min={min}
          max={max}
          step={5}
          value={stake || ""}
          disabled={disabled}
          onChange={(event) => setStake(Math.max(0, Math.min(max, Number(event.target.value) || 0)))}
        />
        <span>coins</span>
      </div>
      <div className="quick-stakes game-stakes">
        {[10, 25, 50, 100, 250].map((amount) => (
          <button key={amount} type="button" className={stake === amount ? "active" : ""} disabled={disabled} onClick={() => setStake(amount)}>{amount}</button>
        ))}
        <button type="button" disabled={disabled} onClick={() => setStake(Math.min(max, Math.floor(balance)))}>Max</button>
      </div>
      <div className="stake-meta">
        <span>Min {min} · Max {max} coins</span>
        <span><Sparkles size={12} /> Coins only</span>
      </div>
      {children}
    </div>
  );
}
