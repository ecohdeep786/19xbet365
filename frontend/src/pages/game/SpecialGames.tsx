import { useState } from "react";
import {
  Anchor, Bird, Droplets, Fish, Flame, Grid3X3, Mountain, PawPrint, Shell, Sparkles, Trophy, Waves, Wind
} from "lucide-react";
import { api } from "../../lib/api";
import { classNames, vc } from "../../lib/format";
import { Button } from "../../components/UI";
import { useData } from "../../state/DataContext";
import type { GameProps } from "./types";
import { StakeBox } from "./StakeBox";
import { ResultBanner, useInstantPlay } from "./InstantGames";

// Bingo -----------------------------------------------------------------------
export function BingoGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const grid = (result?.outcome.grid as number[][]) || [[1, 8, 15], [20, 24, 29], [3, 11, 30]];
  const draw = new Set((result?.outcome.draw as number[]) || []);
  const lines = Number(result?.outcome.lines || 0);
  return (
    <div className="special-game bingo-game">
      <div className="special-stage bingo-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {busy ? "CALLING NUMBERS" : result ? "CARD SETTLED" : "BINGO ROOM"}</span><span className="stage-note"><Grid3X3 size={13} /> 3×3 · 12 calls</span></div>
        <div className="bingo-card">
          {grid.flat().map((number, index) => (
            <span key={`${number}-${index}`} className={classNames("bingo-cell", draw.has(number) && "called", result?.outcome.fullHouse && "house")}>{number}</span>
          ))}
        </div>
        <div className="bingo-draw-row">
          {result ? (result.outcome.draw as number[]).map((number, index) => <span key={number} className="bingo-ball" style={{ animationDelay: `${index * 45}ms` }}>{number}</span>) : <span className="bingo-draw-placeholder">Your 12 called numbers appear here.</span>}
        </div>
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play()} className="game-action"><Sparkles size={18} /> Buy card for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Lines hit</span><strong>{result ? lines : "—"}</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// WheelBet --------------------------------------------------------------------
export function WheelBetGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [bet, setBet] = useState<"red" | "black" | "green">("red");
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const outcome = result?.outcome || {};
  const color = String(outcome.color || "");
  return (
    <div className="special-game wheelbet-game">
      <div className="special-stage wheelbet-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {busy ? "WHEEL SPINNING" : result ? "WHEEL SETTLED" : "TV WHEEL"}</span><span className="stage-note">36 numbers + zero</span></div>
        <div className="wheelbet-face">
          <div className={classNames("wheelbet-disc", result && "live")}>
            <span className={classNames("wheelbet-number", color)}>{result ? outcome.number : "?"}</span>
            <small>{result ? color.toUpperCase() : "CALL A COLOUR"}</small>
          </div>
        </div>
        <div className="wheelbet-options">
          {(["red", "black", "green"] as const).map((option) => (
            <button key={option} className={classNames("wheelbet-chip", option, bet === option && "active")} onClick={() => setBet(option)} disabled={busy}>
              <strong>{option}</strong><em>{option === "green" ? "36x" : "2x"}</em>
            </button>
          ))}
        </div>
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play({ bet })} className="game-action"><Sparkles size={18} /> Spin {bet} for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Your call</span><strong className={bet}>{bet}</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// War of Elements -------------------------------------------------------------
const ELEMENTS = [
  { label: "Fire", payout: 1.8, icon: Flame, tone: "fire" },
  { label: "Water", payout: 3.5, icon: Droplets, tone: "water" },
  { label: "Earth", payout: 7, icon: Mountain, tone: "earth" },
  { label: "Air", payout: 25, icon: Wind, tone: "air" }
];

export function WarElementsGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [pick, setPick] = useState(0);
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const winner = result ? Number(result.outcome.winner) : null;
  return (
    <div className="special-game elements-game">
      <div className="special-stage elements-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {busy ? "ELEMENTS CLASH" : result ? "BATTLE SETTLED" : "CHOOSE YOUR FORCE"}</span><span className="stage-note">4 forces · calibrated odds</span></div>
        <div className="elements-arena">
          {ELEMENTS.map((element, index) => {
            const Icon = element.icon;
            return (
              <button key={element.label} className={classNames("element-card", element.tone, pick === index && "picked", winner === index && "won")} onClick={() => setPick(index)} disabled={busy}>
                <span className="element-icon"><Icon size={28} /></span>
                <strong>{element.label}</strong>
                <em>{element.payout.toFixed(2)}x</em>
                {result && winner === index && <small>Winning force</small>}
              </button>
            );
          })}
        </div>
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play({ element: pick })} className="game-action"><Sparkles size={18} /> Call {ELEMENTS[pick].label} for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Your force</span><strong>{ELEMENTS[pick].label}</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Toto 15 ---------------------------------------------------------------------
const TOTO_LABELS = ["1", "X", "2"];
const TOTO_RESULT_LABELS = ["Home", "Draw", "Away"];

export function TotoGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const { matches } = useData();
  const [picks, setPicks] = useState<number[]>(Array(15).fill(0));
  const { busy, error, result, play, setError, reset } = useInstantPlay(game.id, props);
  const fixtures = matches.filter((match) => match.status !== "finished").slice(0, 15);
  const results = (result?.outcome.results as number[]) || [];
  const correct = result ? Number(result.outcome.correct) : null;
  const setPick = (index: number, value: number) => {
    if (result) reset();
    setPicks((current) => current.map((pick, i) => i === index ? value : pick));
  };
  const launch = () => {
    if (fixtures.length < 15) { setError("The Toto board is not ready yet. Reload the lobby."); return; }
    play({ picks });
  };
  return (
    <div className="toto-game">
      <div className="special-stage toto-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {busy ? "POOL SETTLING" : result ? "POOL SETTLED" : "TOTO 15"}</span><span className="stage-note">15 fixtures · 1/X/2</span></div>
        <div className="toto-board">
          {Array.from({ length: 15 }).map((_, index) => {
            const fixture = fixtures[index];
            return (
              <div className="toto-row" key={fixture?.id || index}>
                <span className="toto-index">{index + 1}</span>
                <div className="toto-fixture"><strong>{fixture ? `${fixture.homeTeam} vs ${fixture.awayTeam}` : `Fixture ${index + 1}`}</strong><small>{fixture ? fixture.league : "Toto pool"}</small></div>
                <div className="toto-picks">
                  {TOTO_LABELS.map((label, value) => (
                    <button key={label} className={classNames("toto-pick", picks[index] === value && "active", result && results[index] === value && "result")} onClick={() => setPick(index, value)} disabled={busy}>{label}</button>
                  ))}
                </div>
                <span className={classNames("toto-actual", result && results[index] === picks[index] && "hit")}>{result ? TOTO_RESULT_LABELS[results[index]] : "—"}</span>
              </div>
            );
          })}
        </div>
        {correct != null && <div className="toto-summary"><strong>{correct}/15 correct</strong><span>{correct >= 6 ? "Prize tier reached." : "No prize this pool."}</span></div>}
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={launch} className="game-action"><Trophy size={18} /> Play Toto for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Board</span><strong>{fixtures.length}/15 ready</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Lotto 6/36 ------------------------------------------------------------------
export function LottoGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const [picks, setPicks] = useState<number[]>([]);
  const { busy, error, result, play, setError, reset } = useInstantPlay(game.id, props);
  const drawn = new Set((result?.outcome.draw as number[]) || []);
  const matched = new Set((result?.outcome.picks as number[]) || []);
  const toggle = (number: number) => {
    if (result) reset();
    setPicks((current) => current.includes(number) ? current.filter((value) => value !== number) : current.length >= 6 ? current : [...current, number]);
  };
  const launch = () => {
    if (picks.length !== 6) { setError("Pick exactly six numbers from 1 to 36."); return; }
    play({ picks });
  };
  return (
    <div className="special-game lotto-game">
      <div className="special-stage lotto-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {busy ? "DRAWING" : result ? "DRAW COMPLETE" : "LOTTO 6/36"}</span><span className="stage-note">6 numbers · 1–36</span></div>
        <div className="lotto-grid">
          {Array.from({ length: 36 }, (_, index) => index + 1).map((number) => (
            <button key={number} className={classNames("lotto-number", picks.includes(number) && "picked", drawn.has(number) && "drawn", drawn.has(number) && matched.has(number) && "hit")} onClick={() => toggle(number)} disabled={busy}>{number}</button>
          ))}
        </div>
        {result && <div className="lotto-draw-row">{(result.outcome.draw as number[]).map((number: number) => <span key={number} className={classNames("lotto-ball", matched.has(number) && "hit")}>{number}</span>)}</div>}
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={launch} className="game-action"><Sparkles size={18} /> Draw for {vc(stake)}</Button>
          <span className="lotto-pick-count">{picks.length}/6 selected</span>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Your numbers</span><strong>{picks.length ? picks.join(" · ") : "Pick 6"}</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Reef Hunter -----------------------------------------------------------------
const REEF_TARGETS = [
  { label: "Sardine", payout: 2, icon: Fish, tone: "sardine" },
  { label: "Clownfish", payout: 4, icon: Fish, tone: "clown" },
  { label: "Sea Turtle", payout: 7, icon: Shell, tone: "turtle" },
  { label: "Manta Ray", payout: 12, icon: Waves, tone: "ray" },
  { label: "Reef Shark", payout: 25, icon: Anchor, tone: "shark" },
  { label: "Golden Marlin", payout: 50, icon: Trophy, tone: "golden" }
];
const HUNT_TARGETS = [
  { label: "Rabbit", payout: 2, icon: PawPrint, tone: "sardine" },
  { label: "Fox", payout: 4, icon: PawPrint, tone: "clown" },
  { label: "Boar", payout: 7, icon: PawPrint, tone: "turtle" },
  { label: "Stag", payout: 12, icon: PawPrint, tone: "ray" },
  { label: "Wolf", payout: 25, icon: PawPrint, tone: "shark" },
  { label: "Golden Eagle", payout: 50, icon: Bird, tone: "golden" }
];

export function ReefGame(props: GameProps) {
  const { game, stake, setStake, balance } = props;
  const targets = game.id === "shadow-hunt" ? HUNT_TARGETS : REEF_TARGETS;
  const [target, setTarget] = useState(0);
  const { busy, error, result, play } = useInstantPlay(game.id, props);
  const winner = result ? Number(result.outcome.winner) : null;
  return (
    <div className="special-game reef-game">
      <div className="special-stage reef-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {busy ? "TRACKING" : result ? "TARGET REVEALED" : game.id === "shadow-hunt" ? "SHADOW HUNT" : "REEF HUNTER"}</span><span className="stage-note">6 targets · calibrated</span></div>
        <div className="reef-grid">
          {targets.map((fish, index) => {
            const Icon = fish.icon;
            return (
              <button key={fish.label} className={classNames("reef-card", fish.tone, target === index && "picked", winner === index && "won")} onClick={() => setTarget(index)} disabled={busy}>
                <span className="reef-icon"><Icon size={26} /></span>
                <strong>{fish.label}</strong>
                <em>{fish.payout}x</em>
                {result && winner === index && <small>{game.id === "shadow-hunt" ? "Tracked" : "Caught"}</small>}
              </button>
            );
          })}
        </div>
        <ResultBanner result={result} gameName={game.name} />
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy}>
          <Button variant="lime" size="lg" loading={busy} onClick={() => play({ target })} className="game-action"><Fish size={18} /> {game.id === "shadow-hunt" ? "Track" : "Catch"} {targets[target].label} for {vc(stake)}</Button>
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Your target</span><strong>{targets[target].label}</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}

// Video Poker -----------------------------------------------------------------
type PlayingCard = { rank: number; suit: string };

function CardFace({ card, held, onClick, disabled }: { card: PlayingCard; held?: boolean; onClick?: () => void; disabled?: boolean }) {
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <button type="button" className={classNames("video-poker-card", red && "red", held && "held")} onClick={onClick} disabled={disabled}>
      <strong>{card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank === 14 ? "A" : card.rank}</strong>
      <span>{card.suit}</span>
      {held && <em>HELD</em>}
    </button>
  );
}

export function VideoPokerGame(props: GameProps) {
  const { game, stake, setStake, balance, onBalance, onSettled } = props;
  const [phase, setPhase] = useState<"idle" | "open" | "settled">("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [hand, setHand] = useState<PlayingCard[]>([]);
  const [held, setHeld] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deal = async () => {
    if (stake < 5) { setError("Stake must be at least 5 coins."); return; }
    if (stake > balance) { setError("Your coin balance is too low for that stake."); return; }
    setBusy(true); setError(null);
    try {
      const data = await api.videoPokerStart(stake);
      setRoundId(data.roundId);
      setHand(data.hand);
      setHeld([]);
      setMessage(data.message);
      setPayout(0);
      setPhase("open");
      onBalance(data.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deal a hand.");
    } finally { setBusy(false); }
  };

  const draw = async () => {
    if (!roundId) return;
    setBusy(true); setError(null);
    try {
      const data = await api.videoPokerDraw(roundId, held);
      setHand(data.hand);
      setHeld(data.held);
      setMessage(data.message);
      setPayout(data.payout);
      setPhase("settled");
      onBalance(data.balance);
      onSettled(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draw replacements.");
    } finally { setBusy(false); }
  };

  const toggleHold = (index: number) => {
    if (phase !== "open") return;
    setHeld((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]);
  };

  return (
    <div className="special-game video-poker-game">
      <div className="special-stage video-poker-stage">
        <div className="special-stage-top"><span className="stage-live"><span className="live-pulse" /> {phase === "open" ? "HOLD OR DRAW" : phase === "settled" ? "HAND SETTLED" : "VIDEO POKER"}</span><span className="stage-note">Jacks or Better · 9/6</span></div>
        <div className="video-poker-table">
          {hand.length ? hand.map((card, index) => (
            <CardFace key={`${card.rank}-${card.suit}-${index}`} card={card} held={held.includes(index)} onClick={() => toggleHold(index)} disabled={busy || phase !== "open"} />
          )) : Array.from({ length: 5 }).map((_, index) => <span key={index} className="video-poker-card empty">?</span>)}
        </div>
        {message && <p className={classNames("video-poker-message", phase === "settled" && payout > 1 && "win")}>{message}</p>}
        <div className="video-poker-paytable">
          <span>Royal 250x</span><span>Straight flush 50x</span><span>Four 25x</span><span>Full house 9x</span><span>Flush 6x</span><span>Straight 4x</span>
        </div>
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy || phase === "open"}>
          {phase === "open" ? (
            <Button variant="lime" size="lg" loading={busy} onClick={draw} className="game-action"><Sparkles size={18} /> Draw {5 - held.length} replacement{5 - held.length === 1 ? "" : "s"}</Button>
          ) : (
            <Button variant="lime" size="lg" loading={busy} onClick={deal} className="game-action"><Sparkles size={18} /> {phase === "settled" ? "Deal again for" : "Deal for"} {vc(stake)}</Button>
          )}
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Cards held</span><strong>{held.length}/5</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}
