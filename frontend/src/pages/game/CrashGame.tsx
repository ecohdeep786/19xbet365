import { useCallback, useEffect, useRef, useState } from "react";
import { Rocket, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { api } from "../../lib/api";
import { classNames, vc } from "../../lib/format";
import { Button } from "../../components/UI";
import type { GameProps } from "./types";
import { StakeBox } from "./StakeBox";

function localMultiplier(startedAt: number) {
  const elapsed = Math.max(0, Date.now() - startedAt);
  return Math.max(1, Math.floor(Math.exp(elapsed / 5200) * 100) / 100);
}

export function CrashGame({ game, stake, setStake, balance, onBalance, onSettled, offline }: GameProps) {
  const [phase, setPhase] = useState<"idle" | "running" | "settled">("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [result, setResult] = useState<{ win: boolean; payout: number; text: string } | null>(null);
  const [autoCashout, setAutoCashout] = useState("");
  const [history, setHistory] = useState<{ multiplier: number; win: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localCrash = useRef(1);
  const settledRef = useRef(false);
  const multiplierRef = useRef(1);

  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);

  const finish = useCallback((win: boolean, payout: number, text: string, crash?: number) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPhase("settled");
    setResult({ win, payout, text });
    if (crash) setCrashPoint(crash);
    setHistory((current) => [{ multiplier: win ? multiplierRef.current : (crash || multiplierRef.current), win }, ...current].slice(0, 8));
  }, []);

  const launch = async () => {
    if (stake < 5) { setError("Stake must be at least 5 coins."); return; }
    if (stake > balance) { setError("Your coin balance is too low for that stake."); return; }
    setError(null);
    setResult(null);
    setCrashPoint(null);
    settledRef.current = false;
    setBusy(true);
    try {
      if (offline) {
        const point = Math.max(1.01, Math.floor((0.98 / Math.max(0.01, 1 - Math.random())) * 100) / 100);
        localCrash.current = Math.min(120, point);
        onBalance(balance - stake);
        setStartedAt(Date.now());
        setMultiplier(1);
        setRoundId(`preview-${Date.now()}`);
        setPhase("running");
        onSettled(`${game.name} launched in browser preview mode.`);
        return;
      }
      const data = await api.crashStart(game.id, stake, autoCashout ? Number(autoCashout) : null);
      onBalance(data.balance);
      setStartedAt(new Date(data.startedAt).getTime());
      setRoundId(data.roundId);
      setMultiplier(1);
      setPhase("running");
      onSettled(`${game.name} launched. Cash out before the curve breaks.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch the round.");
    } finally {
      setBusy(false);
    }
  };

  const cashout = async () => {
    if (phase !== "running") return;
    setBusy(true);
    try {
      if (offline) {
        if (multiplier >= localCrash.current) {
          finish(false, 0, `Crashed at ${localCrash.current.toFixed(2)}x`, localCrash.current);
          setError("Too late — the curve broke before your cash-out.");
          return;
        }
        const payout = Math.round(stake * multiplier * 100) / 100;
        onBalance(balance + payout);
        finish(true, payout, `Cashed out at ${multiplier.toFixed(2)}x`, localCrash.current);
        onSettled(`Browser preview: cashed out at ${multiplier.toFixed(2)}x for ${vc(payout)}.`);
        return;
      }
      if (!roundId) return;
      const data = await api.crashCashout(game.id, roundId);
      onBalance(data.balance);
      if (data.status === "busted") {
        finish(false, 0, data.message, data.crashPoint);
        onSettled(data.message);
      } else {
        finish(true, data.payout, data.message, data.crashPoint);
        onSettled(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cash-out failed.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (phase !== "running") return;
    const animation = window.setInterval(() => {
      setMultiplier((current) => Math.max(current, Math.min(1000, localMultiplier(startedAt))));
    }, 70);
    const poll = window.setInterval(async () => {
      if (offline) {
        const current = localMultiplier(startedAt);
        if (current >= localCrash.current && !settledRef.current) {
          setMultiplier(localCrash.current);
          finish(false, 0, `Crashed at ${localCrash.current.toFixed(2)}x`, localCrash.current);
          onSettled(`${game.name} broke at ${localCrash.current.toFixed(2)}x. No win this round.`);
          window.clearInterval(poll);
        }
        return;
      }
      if (!roundId || settledRef.current) return;
      try {
        const data = await api.crashStatus(game.id, roundId);
        setMultiplier(data.multiplier);
        if (data.status === "settled") {
          onBalance(data.balance);
          finish(Number(data.payout) > 0, data.payout, data.won ? `Auto cash-out at ${data.multiplier.toFixed(2)}x` : `Crashed at ${(data.crashPoint || data.multiplier).toFixed(2)}x`, data.crashPoint);
          onSettled(data.won ? `Auto cash-out at ${data.multiplier.toFixed(2)}x for ${vc(data.payout)}.` : `${game.name} broke at ${(data.crashPoint || data.multiplier).toFixed(2)}x.`);
          window.clearInterval(poll);
        }
      } catch {
        /* keep the animation running; a later poll can settle the round */
      }
    }, 750);
    return () => { window.clearInterval(animation); window.clearInterval(poll); };
  }, [phase, roundId, startedAt, offline, onBalance, onSettled, finish]);

  const progress = Math.min(1, Math.log(Math.max(1, multiplier)) / Math.log(100));
  const points = Array.from({ length: 34 }, (_, index) => {
    const t = (index / 33) * Math.max(0.02, progress);
    const x = 14 + t * 492;
    const y = 168 - Math.pow(t, 1.6) * 132 - Math.min(40, t * 26);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const endX = 14 + progress * 492;
  const endY = 168 - Math.pow(progress, 1.6) * 132 - Math.min(40, progress * 26);
  const busted = phase === "settled" && result && !result.win;

  return (
    <div className="crash-game">
      <div className={classNames("crash-stage", busted && "busted")}>
        <div className="crash-stage-top">
          <span className={classNames("stage-live", phase === "running" && "active")}><span className="live-pulse" /> {phase === "running" ? "ROUND LIVE" : phase === "settled" ? "ROUND ENDED" : "READY"}</span>
          <span className="stage-note"><ShieldCheck size={13} /> Server-generated crash point</span>
        </div>
        <div className="crash-display">
          <span className="crash-label">{phase === "running" ? "Current multiplier" : phase === "settled" ? (busted ? "Crashed at" : "Cashed out at") : "Multiplier"}</span>
          <strong className={classNames("crash-value", busted && "bust", result?.win && "win")}>
            {phase === "idle" ? "1.00x" : `${(busted ? crashPoint || multiplier : phase === "settled" ? multiplier : multiplier).toFixed(2)}x`}
          </strong>
          {phase === "settled" && crashPoint && <span className="crash-crashpoint">Crash point {crashPoint.toFixed(2)}x</span>}
        </div>
        <svg className="crash-chart" viewBox="0 0 520 210" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={busted ? "#ff7a7a" : "#67f7e7"} stopOpacity=".35" />
              <stop offset="100%" stopColor={busted ? "#ff7a7a" : "#67f7e7"} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[42, 84, 126, 168].map((y) => <line key={y} x1="14" y1={y} x2="506" y2={y} stroke="rgba(255,255,255,.07)" strokeDasharray="3 6" />)}
          {[100, 200, 300, 400].map((x) => <line key={x} x1={x} y1="28" x2={x} y2="184" stroke="rgba(255,255,255,.05)" />)}
          {phase !== "idle" && (
            <>
              <polygon points={`14,184 ${points} ${endX},184`} fill="url(#crashFill)" />
              <polyline points={points} fill="none" stroke={busted ? "#ff7a7a" : "#67f7e7"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={endX} cy={endY} r="5" fill={busted ? "#ff7a7a" : "#c9ff63"} />
            </>
          )}
        </svg>
        {phase === "running" && (
          <div className="crash-rocket" style={{ left: `${Math.min(86, 10 + progress * 80)}%`, bottom: `${Math.min(62, 8 + progress * 52)}%` }}>
            <Rocket size={22} />
          </div>
        )}
        <div className="crash-controls">
          {phase !== "running" ? (
            <Button variant="lime" size="lg" loading={busy} onClick={launch} className="crash-action">
              <Rocket size={18} /> Launch round for {vc(stake)}
            </Button>
          ) : (
            <Button variant="lime" size="lg" loading={busy} onClick={cashout} className="crash-action cashout">
              <TrendingUp size={18} /> Cash out {vc(stake * multiplier)}
            </Button>
          )}
          <span className="crash-hint">{phase === "running" ? "The server settles the round when the curve breaks." : "Every crash point is generated server-side and recorded."}</span>
        </div>
        {error && <div className="game-error">{error}</div>}
      </div>

      <div className="crash-history">
        <span className="history-label">Recent rounds</span>
        {!history.length && <span className="history-empty">Your completed rounds will appear here.</span>}
        {history.map((item, index) => <span key={index} className={classNames("history-chip", item.win ? "win" : "bust")}>{item.multiplier.toFixed(2)}x</span>)}
      </div>

      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={phase === "running"}>
          <label className="field compact-field">
            <span className="field-label">Auto cash-out <em>optional</em></span>
            <div className="inline-field">
              <input className="input" type="number" min={1.01} max={1000} step={0.1} placeholder="e.g. 2.00" value={autoCashout} disabled={phase === "running"} onChange={(event) => setAutoCashout(event.target.value)} />
              <span>x</span>
            </div>
          </label>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Engine</span><strong>19X server RNG</strong></div>
          <div className="fact-note"><Zap size={14} /> Auto cash-out is enforced by the server when the round status is polled.</div>
        </div>
      </div>
    </div>
  );
}
