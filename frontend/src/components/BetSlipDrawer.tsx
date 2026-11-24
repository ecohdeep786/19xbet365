import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Coins, ReceiptText, ShieldCheck, Trash2, X } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useBetSlip } from "../state/BetSlipContext";
import { Button } from "./UI";
import { classNames, vc } from "../lib/format";
import { useDialog } from "../lib/useDialog";

function selectionName(matchLabel: string, selection: "home" | "draw" | "away") {
  const [home, away] = matchLabel.split(" vs ");
  if (selection === "draw") return "Draw";
  return selection === "home" ? home : away;
}

export function BetSlipDrawer() {
  const { selections, open, setOpen, removeSelection, clear, stake, setStake, totalOdds, potentialReturn, placeBet, busy } = useBetSlip();
  const { user } = useAuth();
  const panelRef = useRef<HTMLElement>(null);
  useDialog(open, () => setOpen(false), panelRef);

  if (!open) return null;
  const multiple = selections.length > 1;

  return (
    <>
      <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} />
      <aside className="bet-slip" role="dialog" aria-modal="true" aria-labelledby="bet-slip-title" ref={panelRef}>
        <div className="bet-slip-head">
          <div>
            <span className="eyebrow">Your selection{selections.length === 1 ? "" : "s"}</span>
            <h2 id="bet-slip-title">Bet slip <em>{selections.length}</em></h2>
          </div>
          <div className="bet-slip-head-actions">
            {selections.length > 0 && <button className="text-btn" onClick={clear}>Clear</button>}
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close bet slip"><X size={18} /></button>
          </div>
        </div>
        <div className="bet-slip-body">
          {!selections.length && (
            <div className="slip-empty">
              <span className="slip-empty-icon"><ReceiptText size={26} /></span>
              <h3>Your slip is waiting</h3>
              <p>Tap any odds button across the sportsbook to build a single or accumulator.</p>
              <Link to="/sports" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Browse sports <ArrowRight size={15} /></Link>
            </div>
          )}
          {selections.map((selection) => (
            <div className="slip-selection" key={selection.matchId}>
              <div className="slip-selection-copy">
                <span className="slip-league">{selection.league}</span>
                <strong>{selectionName(selection.matchLabel, selection.selection)}</strong>
                <small>{selection.matchLabel}</small>
              </div>
              <div className="slip-selection-side">
                <span className={classNames("slip-pick", selection.selection)}>{selection.selection === "home" ? "1" : selection.selection === "draw" ? "X" : "2"}</span>
                <strong>{selection.odds.toFixed(2)}</strong>
                <button className="icon-btn tiny" onClick={() => removeSelection(selection.matchId)} aria-label="Remove selection"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {selections.length > 0 && (
            <>
              <div className="slip-mode">
                <span>{multiple ? "Accumulator" : "Single"}</span>
                <span className="slip-mode-note">{multiple ? `${selections.length} selections combined` : "One selection"}</span>
              </div>
              <div className="slip-stake">
                <label htmlFor="slip-stake">Stake</label>
                <div className="stake-input">
                  <Coins size={16} />
                  <input
                    id="slip-stake"
                    type="number"
                    data-autofocus
                    min={10}
                    max={5000}
                    step={10}
                    value={stake || ""}
                    onChange={(event) => setStake(Number(event.target.value))}
                  />
                  <span>coins</span>
                </div>
                <div className="quick-stakes">
                  {[50, 100, 250, 500].map((amount) => (
                    <button key={amount} className={stake === amount ? "active" : ""} onClick={() => setStake(amount)}>{amount}</button>
                  ))}
                  <button onClick={() => setStake(Math.min(5000, Math.floor((user?.balance || 0))))}>Max</button>
                </div>
              </div>
              <div className="slip-summary">
                <div><span>Total odds</span><strong>{totalOdds.toFixed(2)}</strong></div>
                <div><span>Potential return</span><strong className="lime-text">{vc(potentialReturn)}</strong></div>
              </div>
              {!user && (
                <div className="slip-signin">
                  <ShieldCheck size={17} />
                  <div><strong>Sign in to place your bet</strong><span>Coins, real server records.</span></div>
                  <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
                </div>
              )}
              {user && stake > user.balance && (
                <div className="slip-low-balance">
                  <Coins size={16} />
                  <div><strong>Not enough coins</strong><span>Your balance is {vc(user.balance)}.</span></div>
                  <Link to="/account/deposit" onClick={() => setOpen(false)}>Add coins</Link>
                </div>
              )}
              <Button variant="lime" size="lg" loading={busy} onClick={placeBet} className="slip-place" disabled={Boolean(user && stake > user.balance)}>
                {user && stake > user.balance ? "Add coins to place bet" : "Place coin bet"} <ArrowRight size={17} />
              </Button>
              <p className="slip-disclaimer">Demo fixtures only. All stakes and returns are non-redeemable coins. No real-money wagering.</p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
