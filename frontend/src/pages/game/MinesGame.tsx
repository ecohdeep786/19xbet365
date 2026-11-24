import { useState } from "react";
import { Bomb, Coins, Gem, ShieldCheck, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { classNames, vc } from "../../lib/format";
import { Button } from "../../components/UI";
import type { GameProps } from "./types";
import { StakeBox } from "./StakeBox";

function minesMultiplierClient(mines: number, revealed: number) {
  if (revealed <= 0) return 1;
  const combination = (n: number, k: number) => {
    let result = 1;
    for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
    return result;
  };
  const safeWays = combination(25 - mines, revealed);
  const totalWays = combination(25, revealed);
  return Math.max(1, Math.round((totalWays / safeWays) * 0.97 * 100) / 100);
}

export function MinesGame({ game, stake, setStake, balance, onBalance, onSettled, offline }: GameProps) {
  const [minesCount, setMinesCount] = useState(3);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "open" | "settled">("idle");
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hitTile, setHitTile] = useState<number | null>(null);

  const start = async () => {
    if (stake < 5) { setError("Stake must be at least 5 VC."); return; }
    if (stake > balance) { setError("Your virtual-credit balance is too low for that stake."); return; }
    setBusy(true); setError(null); setRevealed([]); setMinePositions([]); setPayout(0); setHitTile(null); setMultiplier(1);
    try {
      if (offline) {
        const positions = new Set<number>();
        while (positions.size < minesCount) positions.add(Math.floor(Math.random() * 25));
        setMinePositions([...positions]);
        setRoundId(`preview-${Date.now()}`);
        setStatus("open");
        onBalance(balance - stake);
        onSettled("Mines Vault armed in browser preview mode.");
        return;
      }
      const data = await api.minesStart(stake, minesCount);
      setRoundId(data.roundId);
      setStatus("open");
      onBalance(data.balance);
      onSettled("Vault armed. Reveal a tile to begin.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the round.");
    } finally { setBusy(false); }
  };

  const reveal = async (tile: number) => {
    if (status !== "open" || revealed.includes(tile) || busy) return;
    setBusy(true); setError(null);
    try {
      if (offline) {
        if (minePositions.includes(tile)) {
          setHitTile(tile);
          setStatus("settled");
          setMultiplier(0);
          setPayout(0);
          setRevealed((current) => [...current, tile]);
          onSettled("Browser preview: mine hit. Round over.");
          return;
        }
        const next = [...revealed, tile].sort((a, b) => a - b);
        setRevealed(next);
        const nextMultiplier = minesMultiplierClient(minesCount, next.length);
        setMultiplier(nextMultiplier);
        if (next.length === 25 - minesCount) {
          const win = Math.round(stake * nextMultiplier * 100) / 100;
          setStatus("settled"); setPayout(win); onBalance(balance + win);
          onSettled(`Vault cleared in browser preview for ${vc(win)}.`);
        }
        return;
      }
      if (!roundId) return;
      const data = await api.minesReveal(roundId, tile);
      setRevealed(data.revealed);
      setMultiplier(data.multiplier);
      if (data.status === "busted") {
        setStatus("settled"); setMinePositions(data.mines || []); setHitTile(data.hitTile ?? tile); setPayout(0);
        onSettled(data.message || "Mine hit. Round over.");
      } else if (data.status === "settled") {
        setStatus("settled"); setPayout(data.payout); onBalance(data.balance); setMinePositions(data.mines || []);
        onSettled(data.message || "Vault cleared.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reveal that tile.");
    } finally { setBusy(false); }
  };

  const cashout = async () => {
    if (status !== "open" || !revealed.length) return;
    setBusy(true); setError(null);
    try {
      if (offline) {
        const win = Math.round(stake * multiplier * 100) / 100;
        setStatus("settled"); setPayout(win); onBalance(balance + win);
        onSettled(`Cashed out in browser preview at ${multiplier.toFixed(2)}x for ${vc(win)}.`);
        return;
      }
      if (!roundId) return;
      const data = await api.minesCashout(roundId);
      setStatus("settled"); setPayout(data.payout); setMultiplier(data.multiplier); setMinePositions(data.mines || []); onBalance(data.balance);
      onSettled(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cash-out failed.");
    } finally { setBusy(false); }
  };

  const reset = () => {
    setStatus("idle"); setRoundId(null); setRevealed([]); setMinePositions([]); setHitTile(null); setMultiplier(1); setPayout(0);
  };

  return (
    <div className="mines-game">
      <div className="mines-head">
        <div>
          <span className={classNames("stage-live", status === "open" && "active")}><span className="live-pulse" /> {status === "open" ? "VAULT OPEN" : status === "settled" ? "ROUND SETTLED" : "READY"}</span>
          <h3>Clear the field. Bank the vault.</h3>
          <p>Reveal safe tiles to raise your multiplier. One mine ends the round.</p>
        </div>
        <div className="mines-score">
          <span>Current multiplier</span>
          <strong>{multiplier.toFixed(2)}x</strong>
          <small>{revealed.filter((tile) => !minePositions.includes(tile)).length} safe revealed</small>
        </div>
      </div>
      <div className="mines-board" role="grid" aria-label="Mines board">
        {Array.from({ length: 25 }, (_, tile) => {
          const isRevealed = revealed.includes(tile);
          const isMine = minePositions.includes(tile);
          const isHit = hitTile === tile;
          const showMine = isMine && (status === "settled");
          return (
            <button
              key={tile}
              className={classNames("mine-tile", isRevealed && "revealed", showMine && "mine", isHit && "hit")}
              disabled={status !== "open" || isRevealed || busy}
              onClick={() => reveal(tile)}
              aria-label={showMine ? `Tile ${tile + 1}: mine` : isRevealed ? `Tile ${tile + 1}: safe` : `Reveal tile ${tile + 1}`}
            >
              {showMine ? <Bomb size={20} /> : isRevealed ? <Gem size={20} /> : <span className="tile-dot" />}
            </button>
          );
        })}
      </div>
      <div className="mines-actions">
        {status === "open" ? (
          <>
            <Button variant="lime" size="lg" loading={busy} onClick={cashout} disabled={!revealed.length}>
              <Coins size={18} /> Cash out {vc(stake * multiplier)}
            </Button>
            <span className="mines-note"><ShieldCheck size={14} /> Server settles the round when you cash out or hit a mine.</span>
          </>
        ) : status === "settled" ? (
          <div className="round-result">
            <span className={payout > 0 ? "result-win" : "result-loss"}>{payout > 0 ? <><Trophy size={16} /> Round won</> : <><Bomb size={16} /> Mine hit</>}</span>
            <strong>{payout > 0 ? vc(payout) : "No return"}</strong>
            <Button variant="secondary" size="sm" onClick={reset}>Play again</Button>
          </div>
        ) : (
          <Button variant="lime" size="lg" loading={busy} onClick={start}><Gem size={18} /> Arm vault for {vc(stake)}</Button>
        )}
      </div>
      {error && <div className="game-error">{error}</div>}
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={status === "open"}>
          <label className="field compact-field">
            <span className="field-label">Mines <em>{minesCount} of 24</em></span>
            <input className="range" type="range" min={1} max={24} value={minesCount} disabled={status === "open"} onChange={(event) => setMinesCount(Number(event.target.value))} />
            <div className="range-ticks"><span>1 · safer</span><span>24 · riskier</span></div>
          </label>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Engine</span><strong>19X demo</strong></div>
          <div className="fact-note"><Bomb size={14} /> The mine layout is fixed at round start and stays server-side until settlement.</div>
        </div>
      </div>
    </div>
  );
}
