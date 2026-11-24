import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Boxes, Cherry, CircleDot, Club, Diamond, Dices, Flag, Flame, Grid3X3,
  Heart, LayoutGrid, Search, Spade, Sparkles, Timer, Trophy, Users, Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useData } from "../state/DataContext";
import { useAuth } from "../state/AuthContext";
import { GameArt } from "../components/GameArt";
import { GameCard } from "../components/GameCard";
import { Badge, Button, EmptyState, ErrorState, Input, Segmented, Skeleton } from "../components/UI";
import { classNames, gameCategoryLabel, number } from "../lib/format";

type CasinoMode = "casino" | "live" | "slots" | "instant";

const COPY: Record<CasinoMode, { kicker: string; title: string; body: string; stat: string }> = {
  casino: {
    kicker: "The casino lobby",
    title: "The casino lobby. All in one board.",
    body: "19X Originals sit beside integration-ready provider titles. Everything playable is clearly marked; nothing pretends to be a certified live feed.",
    stat: "44 catalogue titles"
  },
  live: {
    kicker: "Live casino",
    title: "The felt, with a front-row seat.",
    body: "Roulette, blackjack, baccarat, and game-show style tables. These are interface previews — a licensed provider session is required before live play can be enabled.",
    stat: "8 table previews"
  },
  slots: {
    kicker: "Slots & reels",
    title: "Spin the catalogue.",
    body: "Playable 19X slot originals and provider-required reels in one lobby. Filter by provider, volatility, or your saved favourites.",
    stat: "20 reel titles"
  },
  instant: {
    kicker: "19X Originals",
    title: "Instant games. Real records.",
    body: "Crash, Mines, Plinko, Dice, Wheel, Coin Flip, Hi-Lo, Lucky Ten, Nova Fruits, and Velocity Derby. Every round is server-generated.",
    stat: "11 playable originals"
  }
};

type Chip = { value: string; label: string; icon: LucideIcon };

const CHIPS: Record<CasinoMode, Chip[]> = {
  casino: [
    { value: "all", label: "All games", icon: LayoutGrid },
    { value: "originals", label: "Originals", icon: Sparkles },
    { value: "crash", label: "Crash", icon: Zap },
    { value: "slots", label: "Slots", icon: Cherry },
    { value: "live-casino", label: "Live casino", icon: Spade },
    { value: "virtuals", label: "Virtuals", icon: Timer }
  ],
  live: [
    { value: "all", label: "All tables", icon: LayoutGrid },
    { value: "roulette", label: "Roulette", icon: CircleDot },
    { value: "blackjack", label: "Blackjack", icon: Club },
    { value: "baccarat", label: "Baccarat", icon: Diamond },
    { value: "gameshow", label: "Game shows", icon: Trophy }
  ],
  slots: [
    { value: "all", label: "All slots", icon: Cherry },
    { value: "originals", label: "19X originals", icon: Sparkles },
    { value: "provider", label: "Provider titles", icon: Boxes }
  ],
  instant: [
    { value: "all", label: "All originals", icon: Sparkles },
    { value: "crash", label: "Crash", icon: Zap },
    { value: "mines", label: "Mines", icon: Grid3X3 },
    { value: "table", label: "Table & cards", icon: Dices },
    { value: "race", label: "Racing", icon: Flag }
  ]
};

export function CasinoPage({ mode = "casino" }: { mode?: CasinoMode }) {
  const { games, loading, error, refresh, favorites, recentGames, bootstrap } = useData();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("all");
  const [provider, setProvider] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState<"featured" | "players" | "az">("featured");
  const copy = COPY[mode];

  const baseGames = useMemo(() => {
    if (mode === "live") return games.filter((game) => game.category === "live-casino");
    if (mode === "slots") return games.filter((game) => ["slots", "slots-provider"].includes(game.category));
    if (mode === "instant") return games.filter((game) => game.playable);
    return games;
  }, [games, mode]);

  const providers = useMemo(() => [...new Set(baseGames.map((game) => game.provider))].sort(), [baseGames]);

  const filtered = useMemo(() => {
    let list = baseGames;
    if (mode === "live" && chip !== "all") {
      list = list.filter((game) => chip === "gameshow"
        ? /wheel|show|dream|money/i.test(game.name)
        : game.name.toLowerCase().includes(chip));
    }
    else if (chip === "originals") list = list.filter((game) => game.playable);
    else if (chip === "provider") list = list.filter((game) => !game.playable);
    else if (chip === "table") list = list.filter((game) => ["cards", "dice", "coinflip", "lucky", "wheel"].includes(game.category));
    else if (chip === "race") list = list.filter((game) => game.category === "racing");
    else if (chip === "slots") list = list.filter((game) => ["slots", "slots-provider"].includes(game.category));
    else if (chip === "crash") list = list.filter((game) => game.category === "crash");
    else if (chip === "mines") list = list.filter((game) => game.category === "mines");
    else if (chip !== "all") list = list.filter((game) => game.category === chip);
    if (onlyFavorites) list = list.filter((game) => favorites.has(game.id));
    if (provider !== "all") list = list.filter((game) => game.provider === provider);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((game) => [game.name, game.provider, game.category, game.tagline].some((value) => value.toLowerCase().includes(q)));
    }
    return [...list].sort((a, b) => {
      if (sort === "players") return b.players - a.players;
      if (sort === "az") return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
    });
  }, [baseGames, chip, onlyFavorites, favorites, provider, query, sort]);

  const featured = filtered.find((game) => game.featured) || filtered[0] || baseGames[0];
  const stats = {
    total: baseGames.length,
    playable: baseGames.filter((game) => game.playable).length,
    players: baseGames.reduce((sum, game) => sum + game.players, 0)
  };

  if (loading) return <CasinoSkeleton />;
  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={refresh} /></div>;

  return (
    <div className="casino-page">
      <div className="page-hero casino-hero">
        <div className="casino-hero-glow" />
        <div className="page-shell page-hero-inner">
          <div>
            <span className="eyebrow">{copy.kicker}</span>
            <h1>{copy.title}</h1>
            <p>{copy.body}</p>
            <div className="page-hero-stats inline-stats">
              <div><strong>{number(stats.total)}</strong><span>titles</span></div>
              <div><strong>{number(stats.playable)}</strong><span>playable now</span></div>
              <div><strong>{number(stats.players)}</strong><span>in lobby</span></div>
            </div>
          </div>
          {featured && (
            <Link to={`/game/${featured.id}`} className="featured-game-card">
              <GameArt game={featured} />
              <div className="featured-game-copy">
                <Badge tone={featured.playable ? "lime" : "outline"}>{featured.playable ? "PLAY NOW" : "PROVIDER REQUIRED"}</Badge>
                <h2>{featured.name}</h2>
                <p>{featured.tagline}</p>
                <span className="featured-play">Open game <ArrowRight size={16} /></span>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="page-shell casino-shell">
        <div className="casino-toolbar panel">
          <div className="sports-search">
            <Search size={17} />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the lobby" aria-label="Search games" />
          </div>
          <div className="casino-filters">
            <Segmented
              size="sm"
              value={sort}
              onChange={setSort}
              options={[{ value: "featured", label: "Featured" }, { value: "players", label: "Popular" }, { value: "az", label: "A–Z" }]}
            />
            <Button variant={onlyFavorites ? "lime" : "ghost"} size="sm" icon={<Heart size={15} fill={onlyFavorites ? "currentColor" : "none"} />} onClick={() => setOnlyFavorites((value) => !value)}>
              Favourites
            </Button>
            <select className="input select compact-select" value={provider} onChange={(event) => setProvider(event.target.value)} aria-label="Filter by provider">
              <option value="all">All providers</option>
              {providers.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        <div className="filter-chips" role="tablist">
          {CHIPS[mode].map((item) => (
            <button key={item.value} className={classNames("filter-chip", chip === item.value && "active")} onClick={() => setChip(item.value)} role="tab" aria-selected={chip === item.value}>
              <item.icon size={13} />
              {item.label}
            </button>
          ))}
        </div>

        {mode === "live" && (
          <div className="live-casino-notice">
            <span className="notice-icon"><Users size={19} /></span>
            <div><strong>Provider session required</strong><p>Live dealer titles are presented as integration-ready interfaces. No live video, dealer, or wagering session is active in this environment.</p></div>
            <Badge tone="amber">Not live</Badge>
          </div>
        )}

        {mode === "instant" && recentGames.length > 0 && (
          <section className="recent-strip">
            <div className="rail-head"><span><Flame size={15} /> Recently played</span><Link to="/account/activity" className="text-btn">Full activity</Link></div>
            <div className="game-rail">
              {recentGames.slice(0, 6).map((game) => <GameCard key={game.id} game={game} size="sm" />)}
            </div>
          </section>
        )}

        <div className="lobby-head">
          <div>
            <span className="eyebrow">{chip === "all" ? "Full lobby" : CHIPS[mode].find((item) => item.value === chip)?.label}</span>
            <h2>{filtered.length} {filtered.length === 1 ? "title" : "titles"}</h2>
          </div>
          {user && <span className="lobby-note"><Sparkles size={14} /> Favourites sync to your account</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="panel">
            <EmptyState icon={<LayoutGrid size={22} />} title="No games match this view" body={onlyFavorites ? "You have not saved any games here yet. Tap the heart on a game card to build your favourites." : "Try clearing the search or choosing a different category."} action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); setChip("all"); setProvider("all"); setOnlyFavorites(false); }}>Reset lobby</Button>} />
          </div>
        ) : (
          <div className="game-grid lobby-grid">
            {filtered.map((game, index) => (
              <div className="stagger-card" key={game.id} style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
                <GameCard game={game} size={mode === "instant" ? "md" : "md"} />
              </div>
            ))}
          </div>
        )}

        <section className="lobby-footer-grid">
          <div className="panel lobby-info">
            <span className="eyebrow"><Dices size={13} /> What is playable?</span>
            <h3>Original titles vs provider titles</h3>
            <p><strong>19X Originals</strong> are built and settled by our game engine. You can play them immediately with coins.</p>
            <p><strong>Provider titles</strong> are catalogue entries prepared for future certified integrations. Their pages describe the game and clearly label the missing provider session.</p>
            <Link to="/help/games-and-providers" className="text-btn">Read about providers <ArrowRight size={14} /></Link>
          </div>
          <div className="panel lobby-info">
            <span className="eyebrow"><Trophy size={13} /> Tournaments</span>
            <h3>Turn a good round into a leaderboard run</h3>
            <p>Altitude Week is live on Crash Orbit. The top ten players share 250,000 coins. Every qualifying round is recorded automatically.</p>
            <Link to="/tournaments" className="text-btn">View tournaments <ArrowRight size={14} /></Link>
          </div>
          <div className="panel lobby-info">
            <span className="eyebrow"><Zap size={13} /> Fair play</span>
            <h3>Server-generated, always</h3>
            <p>Outcomes are produced by the server, not the browser. Settled rounds are immutable, and every staff action enters the hash-chained audit trail.</p>
            <Link to="/about" className="text-btn">How 19X works <ArrowRight size={14} /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function CasinoSkeleton() {
  return (
    <div className="casino-page">
      <div className="page-hero casino-hero"><div className="page-shell"><Skeleton className="sk-pill" /><Skeleton className="sk-title" /><Skeleton className="sk-line w50" /></div></div>
      <div className="page-shell">
        <div className="game-grid lobby-grid">{Array.from({ length: 8 }).map((_, index) => <div className="card skeleton-card" key={index}><Skeleton className="sk-art" /><Skeleton className="sk-line w70" /><Skeleton className="sk-line w45" /></div>)}</div>
      </div>
    </div>
  );
}

export function Casino() { return <CasinoPage mode="casino" />; }
export function LiveCasino() { return <CasinoPage mode="live" />; }
export function Slots() { return <CasinoPage mode="slots" />; }
export function InstantGames() { return <CasinoPage mode="instant" />; }
