import { useState } from "react";
import { Coins, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { classNames, vc } from "../../lib/format";
import { Button } from "../../components/UI";
import type { GameProps } from "./types";
import { StakeBox } from "./StakeBox";

type Card = { rank: number; suit: string };

function rankLabel(rank: number) {
  return rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : rank === 14 ? "A" : String(rank);
}

function CardFace({ card }: { card: Card }) {
  const red = card.suit === "♥" || card.suit === "♦";
  return <span className={classNames("table-card", red && "red-suit")}>{rankLabel(card.rank)}{card.suit}</span>;
}

export function BlackjackGame({ game, stake, setStake, balance, onBalance, onSettled }: GameProps) {
  const [phase, setPhase] = useState<"idle" | "open" | "settled">("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [dealerTotal, setDealerTotal] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deal = async () => {
    if (stake < 5) { setError("Stake must be at least 5 coins."); return; }
    if (stake > balance) { setError("Your coin balance is too low for that stake."); return; }
    setBusy(true);
    setError(null);
    try {
      const data = await api.blackjackStart(stake);
      setRoundId(data.roundId);
      setPlayer(data.player);
      setDealer(data.dealer);
      setPlayerTotal(data.playerTotal);
      setDealerTotal(null);
      setMessage(data.message);
      setPayout(0);
      setPhase("open");
      onBalance(data.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deal a hand.");
    } finally {
      setBusy(false);
    }
  };

  const hit = async () => {
    if (!roundId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.blackjackHit(roundId);
      setPlayer(data.player);
      setDealer(data.dealer);
      setPlayerTotal(data.playerTotal);
      setMessage(data.message);
      onBalance(data.balance);
      if (data.status === "settled") {
        setDealerTotal(data.dealerTotal ?? null);
        setPayout(data.payout || 0);
        setPhase("settled");
        onSettled(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draw a card.");
    } finally {
      setBusy(false);
    }
  };

  const stand = async () => {
    if (!roundId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.blackjackStand(roundId);
      setPlayer(data.player);
      setDealer(data.dealer);
      setPlayerTotal(data.playerTotal);
      setDealerTotal(data.dealerTotal);
      setMessage(data.message);
      setPayout(data.payout);
      setPhase("settled");
      onBalance(data.balance);
      onSettled(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stand.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="table-game blackjack-game">
      <div className="table-stage">
        <div className="table-top">
          <span className="stage-live"><span className="live-pulse" /> BLACKJACK TABLE</span>
          <span className="stage-note"><ShieldCheck size={13} /> Server shoe · 6 decks</span>
        </div>
        <div className="table-felt blackjack-felt">
          <div className="bj-side">
            <span className="table-caption">Dealer {dealerTotal != null ? `· ${dealerTotal}` : dealer.length ? "· upcard" : ""}</span>
            <div className="table-cards">
              {dealer.map((card, index) => <CardFace card={card} key={`dealer-${index}`} />)}
              {phase === "open" && <span className="table-card hidden-card" aria-label="Hidden dealer card">?</span>}
            </div>
          </div>
          <div className="bj-side">
            <span className="table-caption">Your hand {playerTotal ? `· ${playerTotal}` : ""}</span>
            <div className="table-cards">
              {player.length ? player.map((card, index) => <CardFace card={card} key={`player-${index}`} />) : <span className="bj-empty">Deal to begin</span>}
            </div>
          </div>
          {message && <p className={classNames("bj-message", phase === "settled" && payout > 0 && "win")}>{message}</p>}
        </div>
      </div>
      <div className="game-control-grid">
        <StakeBox stake={stake} setStake={setStake} balance={balance} disabled={busy || phase === "open"}>
          {phase === "open" ? (
            <div className="bj-actions">
              <Button variant="lime" size="lg" loading={busy} onClick={hit} className="game-action"><Sparkles size={17} /> Hit</Button>
              <Button variant="secondary" size="lg" loading={busy} onClick={stand} className="game-action bj-stand"><Coins size={17} /> Stand</Button>
            </div>
          ) : (
            <Button variant="lime" size="lg" loading={busy} onClick={deal} className="game-action">
              <Sparkles size={18} /> {phase === "settled" ? "Deal again for" : "Deal hand for"} {vc(stake)}
            </Button>
          )}
        </StakeBox>
        <div className="game-facts">
          <div><span>Max win</span><strong>{game.maxWin}</strong></div>
          <div><span>Volatility</span><strong>{game.volatility}</strong></div>
          <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "—"}</strong></div>
          <div><span>Rules</span><strong>Dealer stands on 17</strong></div>
        </div>
      </div>
      {error && <div className="game-error">{error}</div>}
    </div>
  );
}
