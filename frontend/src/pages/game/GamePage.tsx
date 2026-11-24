import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Clock3, Copy, Heart, Info,
  LockKeyhole, Play, ShieldCheck, Sparkles, Star, Trophy, Users, Zap
} from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";
import { api } from "../../lib/api";
import type { GameActivity, GameRound } from "../../types";
import { GameArt } from "../../components/GameArt";
import { GameCard } from "../../components/GameCard";
import { Badge, Button, EmptyState, ErrorState, Skeleton } from "../../components/UI";
import { classNames, gameCategoryLabel, number, relative, vc } from "../../lib/format";
import { CrashGame } from "./CrashGame";
import { MinesGame } from "./MinesGame";
import {
  CoinFlipGame, DerbyGame, DiceGame, GenericInstantGame, HiLoGame, LuckyTenGame,
  NovaFruitsGame, PlinkoGame, WheelGame
} from "./InstantGames";

export function GamePage() {
  const { id } = useParams();
  const { games, gamesById, loading, error, refresh, favorites, toggleFavorite, addRecent, demoMode } = useData();
  const { user, offline, updateUser } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [stake, setStake] = useState(50);
  const [activity, setActivity] = useState<GameActivity | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [categoryTab, setCategoryTab] = useState<"about" | "howto" | "features">("about");

  const game = id ? gamesById.get(id) : undefined;
  const playableComponent = useMemo(() => {
    switch (game?.id) {
      case "crash-orbit": return CrashGame;
      case "mines-vault": return MinesGame;
      case "plinko-drop": return PlinkoGame;
      case "dice-roll": return DiceGame;
      case "wheel-of-astra": return WheelGame;
      case "coin-flip": return CoinFlipGame;
      case "hi-lo": return HiLoGame;
      case "lucky-ten": return LuckyTenGame;
      case "nova-fruits": return NovaFruitsGame;
      case "velocity-derby":
      case "speed-derby": return DerbyGame;
      default: return GenericInstantGame;
    }
  }, [game?.id]);

  useEffect(() => {
    if (!game) return;
    let cancelled = false;
    api.gameActivity(game.id)
      .then((data) => { if (!cancelled) setActivity(data); })
      .catch(() => { if (!cancelled) setActivity(null); });
    if (user) {
      api.rounds(6, game.id)
        .then((data) => { if (!cancelled) setRounds(data.rounds); })
        .catch(() => { if (!cancelled) setRounds([]); });
    }
    return () => { cancelled = true; };
  }, [game, user]);

  const onBalance = useCallback((value: number) => {
    updateUser({ balance: value });
  }, [updateUser]);

  const onSettled = useCallback((message: string, round?: GameRound) => {
    push(message, "info", game?.name || "19X game");
    if (game) addRecent(game.id);
    if (round) setRounds((current) => [round, ...current].slice(0, 6));
  }, [push, game, addRecent]);

  if (loading) return <GameSkeleton />;
  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={refresh} /></div>;
  if (!game) {
    return (
      <div className="page-shell">
        <EmptyState icon={<Sparkles size={22} />} title="That game is not in the lobby" body="The title may have been moved or hidden from the catalogue." action={<Link to="/casino" className="btn btn-secondary btn-sm">Back to casino <ArrowRight size={15} /></Link>} />
      </div>
    );
  }

  const PlayComponent = playableComponent;
  const isFavorite = favorites.has(game.id);
  const similar = games.filter((item) => item.category === game.category && item.id !== game.id).slice(0, 4);
  const fallbackSimilar = games.filter((item) => item.playable && item.id !== game.id).slice(0, 4);

  return (
    <div className="game-page">
      <div className="page-shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={12} />
          <Link to={game.category === "live-casino" ? "/live-casino" : game.category === "virtuals" ? "/virtuals" : game.playable ? "/instant" : "/casino"}>
            {game.category === "live-casino" ? "Live casino" : game.category === "virtuals" ? "Virtuals" : game.playable ? "19X Originals" : "Casino"}
          </Link>
          <ChevronRight size={12} />
          <span>{game.name}</span>
        </nav>

        <header className="game-page-head">
          <div className="game-title-block">
            <div className="game-title-art"><GameArt game={game} /></div>
            <div>
              <div className="game-title-badges">
                <Badge tone={game.playable ? "lime" : "outline"}>{game.playable ? "PLAYABLE" : "INTEGRATION-READY"}</Badge>
                <span className="game-provider-label">{game.provider}</span>
                <span className="game-category-label">{gameCategoryLabel(game.category)}</span>
              </div>
              <h1>{game.name}</h1>
              <p>{game.tagline}</p>
            </div>
          </div>
          <div className="game-head-actions">
            <button className={classNames("icon-btn labeled", isFavorite && "active")} onClick={() => toggleFavorite(game.id)} aria-label={isFavorite ? `Saved: remove ${game.name} from favourites` : `Save ${game.name} to favourites`}>
              <Heart size={17} fill={isFavorite ? "currentColor" : "none"} /> <span>{isFavorite ? "Saved" : "Save"}</span>
            </button>
            <button className="icon-btn labeled" onClick={async () => {
              try { await navigator.clipboard.writeText(window.location.href); push("Game link copied.", "success"); }
              catch { push("Copy is unavailable in this browser.", "info"); }
            }} aria-label="Share game link">
              <Copy size={16} /> <span>Share</span>
            </button>
            <Link to="/instant" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> Lobby</Link>
          </div>
        </header>

        <div className="game-layout">
          <main className="game-main">
            <div className="game-stage-panel panel">
              <div className="stage-toolbar">
                <div className="stage-toolbar-left">
                  <span className={classNames("stage-status", game.playable && "online")}><span className="status-dot" /> {game.playable ? "Game engine online" : "Provider session not configured"}</span>
                  <span className="stage-divider" />
                  <span className="stage-balance"><span>{user ? "Virtual balance" : "Player session"}</span><strong>{user ? vc(user.balance) : "Sign in required"}</strong></span>
                </div>
                <div className="stage-toolbar-right">
                  {demoMode && <Badge tone="amber">Browser preview</Badge>}
                  <Badge tone="outline"><ShieldCheck size={12} /> Server records</Badge>
                </div>
              </div>

              {game.playable ? (
                user ? (
                  <PlayComponent
                    game={game}
                    stake={stake}
                    setStake={setStake}
                    balance={user.balance}
                    onBalance={onBalance}
                    onSettled={onSettled}
                    offline={offline}
                  />
                ) : (
                  <GameSignIn gameName={game.name} />
                )
              ) : (
                <ProviderPreview game={game} />
              )}
            </div>

            <section className="game-details panel">
              <div className="detail-tabs">
                <button className={categoryTab === "about" ? "active" : ""} onClick={() => setCategoryTab("about")}>About this game</button>
                <button className={categoryTab === "howto" ? "active" : ""} onClick={() => setCategoryTab("howto")}>How to play</button>
                <button className={categoryTab === "features" ? "active" : ""} onClick={() => setCategoryTab("features")}>Features</button>
              </div>
              {categoryTab === "about" && (
                <div className="detail-copy">
                  <p>{game.description}</p>
                  {!game.playable && (
                    <div className="detail-warning"><Info size={16} /><span>This is an integration-ready catalogue page. No certified provider session, live dealer feed, or real wagering is active.</span></div>
                  )}
                </div>
              )}
              {categoryTab === "howto" && (
                <ol className="howto-list">
                  {(game.howTo || []).map((step, index) => <li key={index}><span>{index + 1}</span><p>{step}</p></li>)}
                </ol>
              )}
              {categoryTab === "features" && (
                <div className="feature-list">
                  {(game.features || []).map((feature) => <span key={feature}><Check size={15} /> {feature}</span>)}
                </div>
              )}
            </section>
          </main>

          <aside className="game-side-rail">
            <div className="panel game-facts-panel">
              <div className="panel-head"><span><Info size={15} /> Game facts</span></div>
              <div className="fact-list">
                <div><span>Provider</span><strong>{game.provider}</strong></div>
                <div><span>Category</span><strong>{gameCategoryLabel(game.category)}</strong></div>
                <div><span>Target RTP</span><strong>{game.rtp ? `${game.rtp}%` : "Not disclosed"}</strong></div>
                <div><span>Volatility</span><strong>{game.volatility}</strong></div>
                <div><span>Max win</span><strong>{game.maxWin}</strong></div>
                <div><span>Integration</span><strong className={game.playable ? "lime-text" : "amber-text"}>{game.playable ? "Playable demo" : "Provider required"}</strong></div>
                <div><span>Last verified</span><strong>Today</strong></div>
              </div>
              <div className="fact-panel-note"><BadgeCheck size={15} /><span>{game.playable ? "Settled rounds are immutable and recorded in your activity." : "Catalogue details only. A certified provider must be connected before play."}</span></div>
            </div>

            <div className="panel activity-panel">
              <div className="panel-head"><span><Users size={15} /> Live activity</span><Badge tone="outline">{number(activity?.stats.rounds || 0)} rounds</Badge></div>
              <div className="activity-stats">
                <div><strong>{number(activity?.stats.players || 0)}</strong><span>players</span></div>
                <div><strong>{vc(activity?.stats.largestWin || 0, { compact: true })}</strong><span>largest win</span></div>
              </div>
              <div className="top-wins">
                <span className="top-wins-label">Top wins</span>
                {!activity?.topWins.length && <p className="muted-small">No completed rounds yet. Be the first on the board.</p>}
                {activity?.topWins.slice(0, 5).map((win) => (
                  <div className="top-win" key={win.id}>
                    <span className="mini-avatar">{win.name.slice(0, 2)}</span>
                    <span>{win.name}</span>
                    <strong>{vc(win.payout, { compact: true })}</strong>
                    <em>{win.multiplier.toFixed(2)}x</em>
                  </div>
                ))}
              </div>
            </div>

            {rounds.length > 0 && (
              <div className="panel rounds-panel">
                <div className="panel-head"><span><Clock3 size={15} /> Your recent rounds</span><Link to="/account/activity" className="text-btn">All</Link></div>
                {rounds.slice(0, 5).map((round) => (
                  <div className="mini-round" key={round.id}>
                    <div><strong>{round.status === "settled" ? (round.payout > 0 ? "Win" : "Settled") : "Open"}</strong><span>{relative(round.created_at)}</span></div>
                    <div><span>{vc(round.bet)} stake</span><strong className={round.payout > 0 ? "lime-text" : ""}>{round.payout > 0 ? vc(round.payout) : "—"}</strong></div>
                  </div>
                ))}
              </div>
            )}

            <div className="panel responsible-mini">
              <ShieldCheck size={18} />
              <div><strong>Keep it virtual</strong><span>19xbet365 uses non-redeemable virtual credits. No deposits or withdrawals. Set a daily limit whenever you need one.</span></div>
              <Link to="/account/responsible" className="text-btn">Limits</Link>
            </div>
          </aside>
        </div>

        <section className="similar-games">
          <div className="section-heading">
            <div><span className="eyebrow">Keep exploring</span><h2>More like {game.name}</h2></div>
            <Link to="/casino" className="section-link">Open lobby <ArrowRight size={15} /></Link>
          </div>
          <div className="game-grid lobby-grid">
            {(similar.length >= 3 ? similar : fallbackSimilar).slice(0, 4).map((item) => <GameCard key={item.id} game={item} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function GameSignIn({ gameName }: { gameName: string }) {
  const location = useLocation();
  return (
    <div className="game-signin-gate">
      <span className="game-signin-icon"><LockKeyhole size={25} /></span>
      <span className="eyebrow">Account required</span>
      <h2>Sign in to play {gameName}</h2>
      <p>Your virtual balance, game rounds, and payouts are recorded against your player account. Sign in or create a free account to begin.</p>
      <div className="game-signin-actions">
        <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary">Sign in to play <ArrowRight size={16} /></Link>
        <Link to="/register" className="btn btn-secondary">Create free account</Link>
      </div>
      <span className="game-signin-note"><ShieldCheck size={14} /> No deposits · 10,500 VC welcome allocation · virtual credits only</span>
    </div>
  );
}

function ProviderPreview({ game }: { game: ReturnType<typeof useData>["games"][number] }) {
  return (
    <div className="provider-preview">
      <GameArt game={game} className="provider-art" />
      <div className="provider-overlay">
        <Badge tone="amber"><Info size={13} /> PROVIDER SESSION REQUIRED</Badge>
        <h2>{game.name} is integration-ready.</h2>
        <p>{game.description}</p>
        <div className="provider-checklist">
          {(game.features || []).slice(0, 4).map((feature) => <span key={feature}><Check size={14} /> {feature}</span>)}
        </div>
        <div className="provider-actions">
          <Button variant="secondary" disabled><Play size={16} /> Play unavailable</Button>
          <Link to="/support" className="btn btn-ghost">Ask about integrations <ArrowRight size={15} /></Link>
        </div>
        <p className="provider-fineprint">No certified provider, live feed, real-money stake, or payout is connected. This page is a catalogue preview and cannot be played.</p>
      </div>
    </div>
  );
}

function GameSkeleton() {
  return (
    <div className="page-shell game-page">
      <Skeleton className="sk-pill" />
      <div className="game-page-head"><Skeleton className="sk-title" /><Skeleton className="sk-line w30" /></div>
      <div className="game-layout">
        <div className="panel"><Skeleton className="sk-game-stage" /></div>
        <div className="panel"><Skeleton className="sk-line" /><Skeleton className="sk-line w70" /><Skeleton className="sk-line w50" /></div>
      </div>
    </div>
  );
}
