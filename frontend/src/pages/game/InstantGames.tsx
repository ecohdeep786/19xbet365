import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown, ArrowUp, Bell, Bomb, Cherry, Citrus, Coins, Crown, Diamond, Gem, Loader2,
  RotateCcw, Sparkles, Star, Trophy, Zap
} from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { simulateInstant } from "../../lib/simulate";
import { classNames, vc } from "../../lib/format";
import { Button } from "../../components/UI";
import type { GameProps } from "./types";
import { StakeBox } from "./StakeBox";

interface InstantResult {
  outcome: Record<string, any>;
  payout: number;
  multiplier: number;
  message: string;
  win: boolean;
}

function useInstantPlay(gameId: string, props: GameProps, minStake = 5) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstantResult | null>(null);

  const play = useCallback(async (params: Record<string, unknown> = {}) => {
    const { stake, balance, onBalance, onSettled, offline } = props;
    if (stake < minStake) { setError(`The minimum stake is ${minStake} coins.`); return null; }
    if (stake > balance) { setError("Your coin balance is too low for that stake."); return null; }
    setBusy(true); setError(null);
    try {
      if (offline) {
        const sim = simulateInstant(gameId, stake, params);
        const payout = Math.round(stake * sim.multiplier * 100) / 100;
        onBalance(Math.max(0, balance - stake + payout));
        const outcome = { ...sim.outcome, summary: sim.summary };
        const next = { outcome, payout, multiplier: sim.multiplier, message: sim.summary, win: sim.win };
        setResult(next);
        onSettled(`Browser preview: ${sim.summary}`);
        return next;
      }
      const data = await api.playGame(gameId, stake, params);
      onBalance(data.balance);
      const outcome = data.round.outcome || {};
      const next: InstantResult = {
        outcome,
        payout: data.round.payout,
        multiplier: Number(outcome.multiplier || 0),
        message: data.message,
        win: Number(data.round.payout) > 0
      };
      setResult(next);
      onSettled(data.message);
      return next;
    } catch (err) {
      if (isOfflineError(err)) {
        const sim = simulateInstant(gameId, stake, params);
        const payout = Math.round(stake * sim.multiplier * 100) / 100;
        onBalance(Math.max(0, balance - stake + payout));
        const outcome = { ...sim.outcome, summary: sim.summary };
        const next = { outcome, payout, multiplier: sim.multiplier, message: sim.summary, win: sim.win };
        setResult(next);
        onSettled(`API unavailable — browser preview: ${sim.summary}`);
        return next;
      }
      setError(err instanceof Error ? err.message : "The round could not be played.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [gameId, props, minStake]);

  return { busy, error, result, play, setError, reset: () => setResult(null) };
}

function ResultBanner({ result, gameName }: { result: InstantResult | null; gameName: string }) {
  if (!result) return null;
  const push = Boolean((result.outcome as Record<string, unknown>)?.push);
  return (
    <div className={classNames("instant-result", push ? "push" : result.win ? "win" : "loss")}>
      <span>{push ? <><RotateCcw size={15} /> Push</> : result.win ? <><Trophy size={16} /> Win</> : <><RotateCcw size={15} /> No win</>}</span>
      <strong>{push ? `${vc(result.payout)} returned` : result.win ? vc(result.payout) : "Try another round"}</strong>
      <small>{result.message}</small>
      <em>{gameName} · coins</em>
    </div>
  );
}

// Dice -----------------------------------------------------------------------
export function DiceGame(props: GameProps) {
  const { game, stake, setStake, balance, offline } = props;
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<"over" | "under">("over");
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const winChance = direction === "over" ? 100 - target : target;
  const multiplier = Math.min(49.5, 99 / Math.max(1, winChance));
  const roll = Number(result?.outcome.roll ?? 0);
  const hasRoll = !!result;

  return (
    <div className="dice-game">
      <div className="dice-display">
        <span className="stage-live"><span className="live-pulse" /> {busy ? "ROLLING" : hasRoll ? "ROLL COMPLETE" : "READY"}</span>
        <div className={classNames("dice-result", hasRoll && (result.win ? "win" : "loss"))}>
          <span>Roll</span>
          <strong>{hasRoll ? roll.toFixed(2) : "—"}</strong>
          <small>{hasRoll ? (result.win ? `You won ${vc(result.payout)}` : "Outside your range") : "Set a range and roll"}</small>
        </div>
        <div className="dice-range">
          <div className="dice-track">
            <span className="dice-zone under" style={{ width: `${target}%` }} />
            <span className="dice-zone over" style={{ left: `${target}%` }} />
            <span className="dice-target" style={{ left: `${target}%` }}><em>{target}</em></span>
            {hasRoll && <span className="dice-roll-marker" style={{ left: `${Math.min(100, Math.max(0, roll))}%` }} />}
          </div>
          <div className="dice-range-labels"><span>0</span><span>50</span><span>100</span></div>
        </div>
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <div className="dice-settings">
            <label className="field compact-field">
              <span className="field-label">Win direction</span>
              <div className="segmented small">
                <button className={direction === "over" ? "active" : ""} onClick={() => setDirection("over")}><ArrowUp size={14} /> Over</button>
                <button className={direction === "under" ? "active" : ""} onClick={() => setDirection("under")}><ArrowDown size={14} /> Under</button>
              </div>
            </label>
            <label className="field compact-field">
              <span className="field-label">Target <em>{target}</em></span>
              <input className="range" type="range" min={2} max={98} value={target} onChange={(event) => setTarget(Number(event.target.value))} />
            </label>
          </div>
          <div className="chance-row"><span>Win chance <strong>{winChance.toFixed(0)}%</strong></span><span>Payout <strong>{multiplier.toFixed(2)}x</strong></span></div>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play({ target, direction })} className="game-action">Roll for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Engine</span><strong>19X demo</strong></div>
          <div className="fact-note"><Zap size={14} /> Each roll is generated by the server when you submit the round.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
      {offline && <div className="preview-note">Browser preview mode — outcomes are simulated locally until the API reconnects.</div>}
    </div>
  );
}

// Coin flip ------------------------------------------------------------------
export function CoinFlipGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [flipping, setFlipping] = useState(false);
  const { busy, error, result, play } = useInstantPlay(game.id, props);

  useEffect(() => {
    if (!result) return;
    setFlipping(true);
    const timer = window.setTimeout(() => setFlipping(false), 950);
    return () => window.clearTimeout(timer);
  }, [result]);

  const face = result?.outcome.result === "tails" ? "tails" : "heads";
  return (
    <div className="coin-game">
      <div className="coin-stage">
        <span className="stage-live"><span className="live-pulse" /> {flipping ? "COIN IN THE AIR" : result ? "COIN LANDED" : "CHOOSE A SIDE"}</span>
        <div className={classNames("coin", flipping && "flipping", result?.win && "won")}>
          <div className={classNames("coin-face", face === "heads" ? "heads" : "tails")}>
            {result ? <strong>{face === "heads" ? "H" : "T"}</strong> : <Star size={44} />}
          </div>
          <span className="coin-ring" />
        </div>
        <div className="coin-pick">
          <button className={pick === "heads" ? "active" : ""} onClick={() => setPick("heads")}><span className="coin-mini">H</span> Heads <em>1.96x</em></button>
          <button className={pick === "tails" ? "active" : ""} onClick={() => setPick("tails")}><span className="coin-mini">T</span> Tails <em>1.96x</em></button>
        </div>
        {result && <p className={result.win ? "result-win" : "result-loss"}>{result.win ? `Landed ${face} — you called it.` : `Landed ${face} — ${result.outcome.pick === face ? "your side" : "not your side"}.`}</p>}
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy || flipping}>
          <div className="chance-row"><span>Selected <strong>{pick}</strong></span><span>Payout <strong>1.96x</strong></span></div>
          <Button variant="lime" size="lg" loading={busy || flipping} onClick={() => play({ pick })} className="game-action"><Coins size={18} /> Flip for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Engine</span><strong>19X demo</strong></div>
          <div className="fact-note"><Star size={14} /> A 50/50 call with a 1.96x demo return. The server records the result.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Wheel ----------------------------------------------------------------------
const WHEEL_SEGMENTS = [0, 1.5, 0, 1.2, 2, 0, 1.5, 0, 1.2, 3, 0, 1.5, 1.2, 0, 0, 0, 1.5, 0, 1.2, 5, 0, 1.5, 1.2, 0];
const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;
const WHEEL_GRADIENT = (() => {
  const colors = WHEEL_SEGMENTS.map((value, index) => index % 2 === 0 ? (value === 0 ? "#122439" : "#1d4f63") : (value === 0 ? "#0d1b2b" : "#2b6b7a"));
  return `conic-gradient(${WHEEL_SEGMENTS.map((_, index) => `${colors[index]} ${index * SEGMENT_ANGLE}deg ${(index + 1) * SEGMENT_ANGLE}deg`).join(",")})`;
})();

export function WheelGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!result) return;
    const index = Number(result.outcome.index ?? 0);
    setSpinning(true);
    setRotation((current) => current + 360 * 5 + (360 - index * SEGMENT_ANGLE - SEGMENT_ANGLE / 2) - (current % 360));
    const timer = window.setTimeout(() => setSpinning(false), 3200);
    return () => window.clearTimeout(timer);
  }, [result]);

  return (
    <div className="wheel-game">
      <div className="wheel-stage">
        <span className="stage-live"><span className="live-pulse" /> {spinning ? "WHEEL SPINNING" : result ? "WHEEL SETTLED" : "READY TO SPIN"}</span>
        <div className="wheel-wrap">
          <div className="wheel-pointer" />
          <div className="wheel" style={{ background: WHEEL_GRADIENT, transform: `rotate(${rotation}deg)` }}>
            {WHEEL_SEGMENTS.map((value, index) => (
              <span key={index} className={classNames("wheel-segment-label", value === 0 ? "zero" : value >= 3 ? "high" : "")} style={{ transform: `rotate(${index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}deg) translateY(-128px)` }}>
                {value === 0 ? "0" : `${value}x`}
              </span>
            ))}
            <span className="wheel-hub"><Star size={28} /><small>19X</small></span>
          </div>
        </div>
        <div className="wheel-result">
          <span>Last spin</span>
          <strong>{result ? `${Number(result.outcome.multiplier).toFixed(2)}x` : "—"}</strong>
          <small>{result ? (result.win ? `Return ${vc(result.payout)}` : "No return") : "Segments pay 1.2x to 5x"}</small>
        </div>
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy || spinning}>
          <div className="chance-row"><span>Segments <strong>24</strong></span><span>Top prize <strong>5.00x</strong></span></div>
          <Button variant="lime" size="lg" loading={busy || spinning} onClick={() => play()} className="game-action"><RotateCcw size={18} /> Spin for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Segments</span><strong>24</strong></div>
          <div className="fact-note"><Sparkles size={14} /> The wheel index is generated by the server; the CSS animation replays the recorded result.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Plinko ---------------------------------------------------------------------
const PLINKO_TABLES: Record<string, Record<string, number[]>> = {
  "8": { low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6], medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29] },
  "10": { low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9], medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22], high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76] },
  "12": { low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10], medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170] }
};

export function PlinkoGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [rows, setRows] = useState(10);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [ballStep, setBallStep] = useState(0);
  const [dropping, setDropping] = useState(false);
  const { busy, error, result, play } = useInstantPlay(game.id, props);

  useEffect(() => {
    if (!result) return;
    const path = (result.outcome.path as string[]) || [];
    setDropping(true);
    setBallStep(0);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setBallStep(step);
      if (step >= path.length) {
        window.clearInterval(timer);
        setDropping(false);
      }
    }, 110);
    return () => window.clearInterval(timer);
  }, [result]);

  const path = (result?.outcome.path as string[]) || [];
  const rights = path.slice(0, ballStep).filter((step) => step === "R").length;
  const bucket = result ? Number(result.outcome.bucket) : -1;
  const table = PLINKO_TABLES[String(rows)][risk];

  return (
    <div className="plinko-game">
      <div className="plinko-stage">
        <div className="plinko-top">
          <span className="stage-live"><span className="live-pulse" /> {dropping ? "BALL DROPPING" : result ? "BUCKET LANDED" : "READY"}</span>
          <div className="plinko-settings">
            <div className="segmented small">{([8, 10, 12] as const).map((value) => <button key={value} className={rows === value ? "active" : ""} onClick={() => setRows(value)} disabled={dropping}>{value}</button>)}</div>
            <div className="segmented small">{(["low", "medium", "high"] as const).map((value) => <button key={value} className={risk === value ? "active" : ""} onClick={() => setRisk(value)} disabled={dropping}>{value}</button>)}</div>
          </div>
        </div>
        <div className="plinko-board" style={{ minHeight: 290 }}>
          <div className="plinko-pegs">
            {Array.from({ length: rows }, (_, row) => (
              <div className="peg-row" key={row}>
                {Array.from({ length: row + 2 }, (_, peg) => <span className="peg" key={peg} />)}
              </div>
            ))}
          </div>
          {dropping && (
            <span className="plinko-ball" style={{ top: `${8 + ballStep * (230 / rows)}px`, left: `${46 + rights * (rows ? 200 / rows : 0)}px` }} />
          )}
          <div className="plinko-buckets">
            {table.map((value, index) => (
              <span key={index} className={classNames("plinko-bucket", value >= 3 ? "high" : value >= 1 ? "mid" : "low", bucket === index && !dropping && "landed")}>{value.toFixed(value < 1 ? 1 : 1)}x</span>
            ))}
          </div>
        </div>
        <div className="plinko-result-line">
          <span>Bucket</span><strong>{result ? `#${bucket + 1}` : "—"}</strong>
          <span>Multiplier</span><strong>{result ? `${result.multiplier.toFixed(2)}x` : "—"}</strong>
          <span>Return</span><strong>{result ? vc(result.payout) : "—"}</strong>
        </div>
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy || dropping}>
          <div className="chance-row"><span>Risk <strong>{risk}</strong></span><span>Rows <strong>{rows}</strong></span></div>
          <Button variant="lime" size="lg" loading={busy || dropping} onClick={() => play({ rows, risk })} className="game-action"><ArrowDown size={18} /> Drop for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Risk</span><strong>{risk}</strong></div>
          <div className="fact-note"><Gem size={14} /> Higher risk moves payout weight to the outer buckets.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Hi-Lo ----------------------------------------------------------------------
function rankLabel(rank: number) {
  if (rank === 14) return "A";
  if (rank === 13) return "K";
  if (rank === 12) return "Q";
  if (rank === 11) return "J";
  return String(rank);
}

export function HiLoGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [direction, setDirection] = useState<"higher" | "lower">("higher");
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const current = result ? Number(result.outcome.current) : null;
  const next = result ? Number(result.outcome.next) : null;

  return (
    <div className="hilo-game">
      <div className="hilo-stage">
        <span className="stage-live"><span className="live-pulse" /> {result ? "CARDS DEALT" : "MAKE YOUR CALL"}</span>
        <div className="hilo-table">
          <div className="playing-card back"><span>19X</span><Star size={26} /></div>
          <div className="hilo-arrow">{direction === "higher" ? <ArrowUp size={28} /> : <ArrowDown size={28} />}</div>
          <div className={classNames("playing-card draw", current !== null && "revealed")}>
            {current ? <><strong>{rankLabel(current)}</strong><span>{current % 2 === 0 ? "♦" : "♠"}</span></> : <span className="card-placeholder">?</span>}
            <em>Current</em>
          </div>
          <div className="hilo-vs">vs</div>
          <div className={classNames("playing-card draw next", next !== null && "revealed")}>
            {next ? <><strong>{rankLabel(next)}</strong><span>{next % 2 === 0 ? "♥" : "♣"}</span></> : <span className="card-placeholder">?</span>}
            <em>Next</em>
          </div>
        </div>
        {result && <p className={result.win ? "result-win" : "result-loss"}>{result.win ? `The next card was ${direction}. You won ${vc(result.payout)}.` : `The next card was ${next === current ? "equal" : next && current && next > current ? "higher" : "lower"}. No win this round.`}</p>}
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <div className="hilo-call">
            <button className={direction === "higher" ? "active" : ""} onClick={() => setDirection("higher")}><ArrowUp size={15} /> Higher <em>pays up to 12x</em></button>
            <button className={direction === "lower" ? "active" : ""} onClick={() => setDirection("lower")}><ArrowDown size={15} /> Lower <em>pays up to 12x</em></button>
          </div>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play({ direction })} className="game-action"><Sparkles size={18} /> Deal for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Cards</span><strong>2–A</strong></div>
          <div className="fact-note"><Zap size={14} /> Equal cards do not win either call. Your payout is fixed before the draw.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Lucky Ten ------------------------------------------------------------------
export function LuckyTenGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [pick, setPick] = useState(7);
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const drawn = result ? Number(result.outcome.drawn) : null;

  return (
    <div className="lucky-game">
      <div className="lucky-stage">
        <span className="stage-live"><span className="live-pulse" /> {result ? "DRAW COMPLETE" : "PICK A DIGIT"}</span>
        <div className="lucky-display">
          <div className="lucky-big">{drawn != null ? drawn : "?"}</div>
          <div className="lucky-copy">
            <span>Your pick</span>
            <strong>{pick}</strong>
            <small>{result ? (result.win ? `Hit for ${vc(result.payout)}` : "No match this draw") : "Match the draw to win 8.80x"}</small>
          </div>
        </div>
        <div className="lucky-grid">
          {Array.from({ length: 10 }, (_, digit) => (
            <button key={digit} className={classNames(pick === digit && "active", drawn === digit && "drawn", result && drawn === digit && result.win && "win")} onClick={() => setPick(digit)} disabled={busy}>
              {digit}
            </button>
          ))}
        </div>
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <div className="chance-row"><span>Selected digit <strong>{pick}</strong></span><span>Payout <strong>9.00x</strong></span></div>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play({ pick })} className="game-action"><Star size={18} /> Draw for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Digits</span><strong>0–9</strong></div>
          <div className="fact-note"><Star size={14} /> One digit is drawn per round. The server records the draw and settlement.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Nova Fruits ----------------------------------------------------------------
const SYMBOL_MAP: Record<string, { icon: ReactNode; tone: string }> = {
  star: { icon: <Star size={28} fill="currentColor" />, tone: "star" },
  seven: { icon: <strong className="seven-symbol">7</strong>, tone: "seven" },
  diamond: { icon: <Diamond size={26} fill="currentColor" />, tone: "diamond" },
  crown: { icon: <Crown size={27} />, tone: "crown" },
  bell: { icon: <Bell size={26} />, tone: "bell" },
  cherry: { icon: <Cherry size={26} />, tone: "cherry" },
  lemon: { icon: <Citrus size={26} />, tone: "lemon" }
};

function SlotGrid({ grid, spinning }: { grid: string[][]; spinning?: boolean }) {
  return (
    <div className={classNames("slot-grid", spinning && "spinning")}>
      {grid.flatMap((row, rowIndex) => row.map((symbol, colIndex) => {
        const item = SYMBOL_MAP[symbol] || SYMBOL_MAP.lemon;
        return <span key={`${rowIndex}-${colIndex}`} className={`slot-symbol ${item.tone}`} style={{ animationDelay: `${(rowIndex * 3 + colIndex) * 45}ms` }}>{item.icon}</span>;
      }))}
    </div>
  );
}

export function NovaFruitsGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const grid = (result?.outcome.grid as string[][]) || [
    ["cherry", "bell", "lemon"], ["seven", "star", "crown"], ["diamond", "lemon", "bell"]
  ];
  const lines = (result?.outcome.lines as { row: number; match: { symbol: string; kind: number; payout: number } | null }[]) || [];

  return (
    <div className="slots-game">
      <div className="slots-stage">
        <span className="stage-live"><span className="live-pulse" /> {busy ? "REELS SPINNING" : result ? "REELS SETTLED" : "READY"}</span>
        <div className="slot-machine">
          <div className="slot-machine-top"><span>{game.name.toUpperCase()}</span><em>3 × 3</em></div>
          <SlotGrid grid={grid} spinning={busy} />
          <div className="slot-paylines">
            {[0, 1, 2].map((row) => <span key={row} className={lines.some((line) => line.row === row && line.match) ? "win" : ""}>Line {row + 1}</span>)}
          </div>
        </div>
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <div className="chance-row"><span>Lines <strong>3</strong></span><span>Top win <strong>60x</strong></span></div>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play()} className="game-action"><Sparkles size={18} /> Spin for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Paylines</span><strong>3 horizontal</strong></div>
          <div className="fact-note"><Sparkles size={14} /> Three matching symbols on a line pay the triple prize. Pairs pay smaller returns.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Derby ----------------------------------------------------------------------
const RUNNER_SETS: Record<string, { runners: string[]; odds: number[] }> = {
  "velocity-derby": { runners: ["Nova Bolt", "Atlas Wind", "Kestrel", "Orion Dash", "Vega Storm", "Comet Trail"], odds: [2.5, 4, 6, 9, 14, 25] },
  "speed-derby": { runners: ["Nova Bolt", "Atlas Wind", "Kestrel", "Orion Dash", "Vega Storm", "Comet Trail", "Lyra Swift", "Nyx Runner"], odds: [3.2, 4.6, 6.2, 8.2, 11, 15.5, 21, 32] },
  "virtual-football": { runners: ["Mumbai Mariners", "Delhi Dynamos", "Bengaluru Blaze", "Chennai Kings", "Kolkata Tigers", "Punjab Panthers"], odds: [2.5, 4, 6, 9, 14, 25] },
  "virtual-basketball": { runners: ["Coastal Hawks", "Metro Kings", "Desert Suns", "Northern Giants", "Capital Storm", "Lake City Five"], odds: [2.5, 4, 6, 9, 14, 25] },
  "virtual-tennis": { runners: ["A. Petrov", "M. Silva", "K. Tanaka", "L. Moreau", "R. Okafor", "S. Novak"], odds: [2.5, 4, 6, 9, 14, 25] },
  "greyhound-sprint": { runners: ["Rapid Ember", "Silver Arrow", "Night Comet", "Copper Belle", "Storm Chaser", "Blue Rocket"], odds: [2.5, 4, 6, 9, 14, 25] }
};

export function DerbyGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const set = RUNNER_SETS[game.id] || RUNNER_SETS["velocity-derby"];
  const runners = set.runners;
  const odds = set.odds;
  const count = runners.length;
  const [runner, setRunner] = useState(0);
  const [racing, setRacing] = useState(false);
  const { busy, error, result, play } = useInstantPlay(game.id, props);

  useEffect(() => {
    if (!result) return;
    setRacing(true);
    const timer = window.setTimeout(() => setRacing(false), 1900);
    return () => window.clearTimeout(timer);
  }, [result]);

  const order = (result?.outcome.finishOrder as number[]) || [];
  const winner = result ? Number(result.outcome.winner) : null;

  return (
    <div className="derby-game">
      <div className="derby-stage">
        <div className="derby-top">
          <span className="stage-live"><span className="live-pulse" /> {racing ? "RACE IN PROGRESS" : result ? "PHOTO FINISH" : "PICK YOUR RUNNER"}</span>
          <BadgeTone>{count} competitors — virtual event</BadgeTone>
        </div>
        <div className="derby-track">
          {Array.from({ length: count }, (_, index) => {
            const finishIndex = order.indexOf(index);
            const progress = !result ? 8 + ((index * 13) % 24) : racing ? 18 + ((index * 31) % 42) : Math.max(8, 96 - Math.max(0, finishIndex) * 8);
            return (
              <div key={index} className={classNames("derby-lane", winner === index && !racing && result && "winner", runner === index && "selected")}>
                <span className="lane-number">{index + 1}</span>
                <span className="lane-name">{runners[index]}</span>
                <div className="lane-track">
                  <span className="lane-progress" style={{ width: `${progress}%`, transition: `width ${racing ? 0.4 : 1.4}s ease` }} />
                  <span className="lane-runner" style={{ left: `${progress}%`, transition: `left ${racing ? 0.4 : 1.4}s ease` }} />
                </div>
                <span className="lane-odds">{odds[index].toFixed(2)}x</span>
                <button className={classNames("lane-pick", runner === index && "active")} onClick={() => setRunner(index)} disabled={busy || racing} aria-label={`Pick ${runners[index]}`}>
                  {runner === index ? "PICKED" : "PICK"}
                </button>
              </div>
            );
          })}
        </div>
        {result && !racing && <p className={result.win ? "result-win" : "result-loss"}>{result.win ? `${runners[winner!]} won — your pick paid ${vc(result.payout)}.` : `${runners[winner!]} won — your pick finished ${order.indexOf(runner) + 1}.`}</p>}
      </div>
      <ResultBanner result={result} gameName={game.name} />
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy || racing}>
          <div className="chance-row"><span>Runner <strong>{runners[runner]}</strong></span><span>Pays <strong>{odds[runner].toFixed(2)}x</strong></span></div>
          <Button variant="lime" size="lg" loading={busy || racing} onClick={() => play({ runner })} className="game-action"><Zap size={18} /> Race for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Runners</span><strong>{count}</strong></div>
          <div className="fact-note"><Trophy size={14} /> Race order is generated server-side. The track animation is a visual replay.</div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

function BadgeTone({ children }: { children: ReactNode }) {
  return <span className="badge badge-outline">{children}</span>;
}

// Instant draw ---------------------------------------------------------------
export function InstantDrawGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [picks, setPicks] = useState<number[]>([1, 2, 3]);
  const [target, setTarget] = useState("2.00");
  const [steps, setSteps] = useState(3);
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const symbols = (result?.outcome.symbols as string[]) || [];
  const togglePick = (number: number) => {
    if (game.id !== "keno-blitz") return;
    setPicks((current) => current.includes(number) ? current.filter((value) => value !== number) : current.length >= 3 ? current : [...current, number]);
  };
  const launch = () => play(game.id === "keno-blitz" ? { picks } : game.id === "limbo-velocity" ? { target: Number(target) } : game.id === "tower-climb" ? { steps } : {});
  return (
    <div className="generic-game instant-draw-game">
      <div className="generic-stage">
        <span className="stage-live"><span className="live-pulse" /> 19X INSTANT</span>
        <h3>{game.name}</h3>
        <p>{game.tagline}</p>
        {game.id === "keno-blitz" && <div className="keno-grid">{Array.from({ length: 10 }, (_, index) => { const number = index + 1; return <button key={number} className={classNames("keno-number", picks.includes(number) && "active")} onClick={() => togglePick(number)} disabled={busy}>{number}</button>; })}</div>}
        {game.id === "scratch-nova" && <div className="scratch-grid">{Array.from({ length: 9 }, (_, index) => <span key={index} className={classNames("scratch-cell", symbols[index] && "revealed")}>{symbols[index] || "?"}</span>)}</div>}
        {game.id === "limbo-velocity" && <label className="limbo-control">Target multiplier <input className="input" type="number" min={1.2} max={100} step={0.1} value={target} onChange={(event) => setTarget(event.target.value)} disabled={busy} /></label>}
        {game.id === "tower-climb" && <div className="tower-control">{Array.from({ length: 5 }, (_, index) => { const value = index + 1; return <button key={value} className={classNames("tower-step", steps === value && "active")} onClick={() => setSteps(value)} disabled={busy}>{value}</button>; })}<span>{steps} floors</span></div>}
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={launch} className="game-action"><Sparkles size={18} /> Play for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Engine</span><strong>19X server RNG</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Casino table games ---------------------------------------------------------
function CardFace({ card }: { card: { rank: number; suit: string } }) {
  return <span className="table-card">{card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank === 14 ? "A" : card.rank}{card.suit}</span>;
}

export function TableGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [bet, setBet] = useState(game.id === "astra-roulette-live" ? "red" : game.id === "sicbo-nova" ? "big" : "player");
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const options = game.id === "astra-roulette-live"
    ? ["red", "black", "even", "odd", "high", "low"]
    : game.id === "sicbo-nova" ? ["big", "small", "odd", "even"]
    : game.id === "baccarat-royale" || game.id === "speed-baccarat" ? ["player", "banker", "tie"]
    : [];
  const noBetChoice = game.id === "blackjack-azure" || game.id === "holdem-prime";
  const outcome = result?.outcome || {};
  return (
    <div className="table-game">
      <div className="table-stage">
        <div className="table-top"><span className="stage-live"><span className="live-pulse" /> RNG TABLE</span><BadgeTone>{game.name}</BadgeTone></div>
        <div className="table-felt">
          {game.id === "astra-roulette-live" && <div className="roulette-result"><span>Number</span><strong>{outcome.number ?? "—"}</strong><em>{outcome.color ?? ""}</em></div>}
          {game.id === "sicbo-nova" && <div className="dice-result-row">{(outcome.dice as number[] || []).map((die, index) => <span key={index} className="die">{die}</span>)}<strong>{outcome.total ?? "—"}</strong></div>}
          {(game.id === "baccarat-royale" || game.id === "speed-baccarat") && <div className="table-hands"><div><span>Player {outcome.playerTotal ?? "—"}</span><div className="table-cards">{(outcome.player as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div></div><div><span>Banker {outcome.bankerTotal ?? "—"}</span><div className="table-cards">{(outcome.banker as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div></div></div>}
          {game.id === "blackjack-azure" && <div className="table-hands"><div><span>You {outcome.playerTotal ?? "—"}</span><div className="table-cards">{(outcome.player as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div></div><div><span>Dealer {outcome.dealerTotal ?? "—"}</span><div className="table-cards">{(outcome.dealer as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div></div></div>}
          {game.id === "holdem-prime" && <div className="holdem-result"><span className="table-caption">Board</span><div className="table-cards">{(outcome.board as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div><div className="table-hands"><div><span>You {outcome.playerHand ? `· ${outcome.playerHand}` : ""}</span><div className="table-cards">{(outcome.player as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div></div><div><span>Dealer {outcome.dealerHand ? `· ${outcome.dealerHand}` : ""}</span><div className="table-cards">{(outcome.dealer as any[] || []).map((card, index) => <CardFace card={card} key={index} />)}</div></div></div></div>}
          <ResultBanner result={result} gameName={game.name} />
        </div>
        <div className="table-options">{options.map((option) => <button key={option} className={classNames("filter-chip", bet === option && "active")} onClick={() => setBet(option)} disabled={busy}>{option}</button>)}</div>
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play(noBetChoice ? {} : { bet })} className="game-action"><Sparkles size={18} /> {noBetChoice ? "Deal hand for" : `Play ${bet} for`} {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts"><div><span>Max win</span><strong>{game.maxWin}</strong></div><div><span>Volatility</span><strong>{game.volatility}</strong></div><div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div><div><span>Engine</span><strong>19X server RNG</strong></div></div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

export function GenericInstantGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  return (
    <div className="generic-game">
      <div className="generic-stage">
        <span className="stage-live"><span className="live-pulse" /> 19X INSTANT</span>
        <h3>{game.name}</h3>
        <p>{game.tagline}</p>
        <div className="generic-orb"><Star size={46} /></div>
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play()} className="game-action">Play for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Engine</span><strong>19X demo</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}
