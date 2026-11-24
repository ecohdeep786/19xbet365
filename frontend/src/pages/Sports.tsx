import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Filter, ReceiptText, Search, ShieldCheck, Sparkles, Ticket, Trophy, Zap } from "lucide-react";
import { useData } from "../state/DataContext";
import { useBetSlip } from "../state/BetSlipContext";
import { MatchRow, OddsButton, SportIcon } from "../components/MatchRow";
import { TeamBadge } from "../components/TeamBadge";
import { Badge, Button, EmptyState, ErrorState, Input, Segmented, Skeleton } from "../components/UI";
import { GameCard } from "../components/GameCard";
import { classNames, number, vc } from "../lib/format";

type Mode = "all" | "live" | "esports" | "virtuals";

const COPY: Record<Mode, { kicker: string; title: string; body: string }> = {
  all: {
    kicker: "The sportsbook",
    title: "Every fixture. One clean board.",
    body: "Browse demo fixtures across 12 sports. Odds are illustrative, every selection settles into a transparent coin record."
  },
  live: {
    kicker: "In-play",
    title: "Live betting, without the noise.",
    body: "Follow the demo feed, see the score, and build a coin bet slip while the action is moving."
  },
  esports: {
    kicker: "Competitive gaming",
    title: "Esports with a sharper edge.",
    body: "Demo esports fixtures with clean markets. No fabricated live feeds — status and scores come from the seeded match record."
  },
  virtuals: {
    kicker: "Virtual sports",
    title: "Fast events. Instant outcomes.",
    body: "Original virtual racing and simulated sports titles. Playable originals are labelled; provider-required titles show their integration state."
  }
};

export function SportsPage({ mode = "all" }: { mode?: Mode }) {
  const { matches, games, bootstrap, loading, error, refresh } = useData();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "upcoming" | "live">(mode === "live" ? "live" : "all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const copy = COPY[mode];
  const selectedSport = params.get("sport") || "all";

  const sports = bootstrap?.sports || [];
  const filtered = useMemo(() => {
    let list = matches;
    if (mode === "live") list = list.filter((match) => match.status === "live");
    if (mode === "esports") list = list.filter((match) => match.sport === "esports");
    if (selectedSport !== "all") list = list.filter((match) => match.sport === selectedSport);
    if (status !== "all") list = list.filter((match) => match.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((match) =>
        [match.homeTeam, match.awayTeam, match.league, match.sport].some((value) => value.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [matches, mode, selectedSport, status, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const match of filtered) {
      const key = `${match.sport}|${match.league}`;
      map.set(key, [...(map.get(key) || []), match]);
    }
    return [...map.entries()];
  }, [filtered]);

  const virtualGames = games.filter((game) => game.category === "virtuals");
  const liveCount = matches.filter((match) => match.status === "live").length;

  if (loading) return <SportsSkeleton />;
  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={refresh} /></div>;

  return (
    <div className="sports-page">
      <div className="page-hero compact-hero">
        <div className="page-shell page-hero-inner">
          <div>
            <span className="eyebrow">{copy.kicker}</span>
            <h1>{copy.title}</h1>
            <p>{copy.body}</p>
          </div>
          <div className="page-hero-stats">
            <div><strong>{number(filtered.length)}</strong><span>fixtures showing</span></div>
            <div><strong>{number(liveCount)}</strong><span>live now</span></div>
            <div><strong>{number(sports.length)}</strong><span>sports</span></div>
          </div>
        </div>
      </div>

      <div className="page-shell sports-shell">
        <div className={classNames("mobile-filter-backdrop", filtersOpen && "open")} onClick={() => setFiltersOpen(false)} />
        <aside className={classNames("sports-sidebar panel", filtersOpen && "open")}>
          <div className="sidebar-head">
            <span>Sports</span>
            <button className="text-btn mobile-only" onClick={() => setFiltersOpen(false)}>Close</button>
          </div>
          <button className={classNames("sport-filter all", selectedSport === "all" && "active")} onClick={() => { params.delete("sport"); setParams(params); }}>
            <span className="sport-filter-icon"><Trophy size={16} /></span>
            <span>All sports</span>
            <em>{matches.length}</em>
          </button>
          {sports.map((sport) => {
            const count = matches.filter((match) => match.sport === sport.slug).length;
            if (mode === "esports" && sport.slug !== "esports") return null;
            return (
              <button
                key={sport.slug}
                className={classNames("sport-filter", selectedSport === sport.slug && "active")}
                onClick={() => { const next = new URLSearchParams(params); next.set("sport", sport.slug); setParams(next); }}
              >
                <span className="sport-filter-icon"><SportIcon sport={sport.slug} size={16} /></span>
                <span>{sport.name}</span>
                <em>{count || sport.count}</em>
              </button>
            );
          })}
          <div className="sidebar-note">
            <ShieldCheck size={16} />
            <div><strong>Illustrative prices</strong><span>All fixtures and odds are demo data. No real-money markets.</span></div>
          </div>
        </aside>

        <main className="sports-main">
          <div className="sports-toolbar panel">
            <div className="sports-search">
              <Search size={17} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team, league or sport" aria-label="Search fixtures" />
            </div>
            <div className="sports-toolbar-actions">
              <Segmented
                size="sm"
                value={status}
                onChange={setStatus}
                options={mode === "live" ? [{ value: "live", label: "Live" }] : [
                  { value: "all", label: "All" },
                  { value: "live", label: "Live" },
                  { value: "upcoming", label: "Upcoming" }
                ]}
              />
              <Button variant="ghost" size="sm" className="mobile-only" icon={<Filter size={15} />} onClick={() => setFiltersOpen(true)}>Filters</Button>
            </div>
          </div>

          {mode === "live" && <LiveSpotlight matches={matches.filter((match) => match.status === "live")} />}

          {mode === "virtuals" ? (
            <VirtualsContent games={virtualGames} matches={matches.filter((match) => ["horse-racing", "motor-sport"].includes(match.sport)).slice(0, 6)} />
          ) : (
            <div className="league-list">
              {!grouped.length && (
                <div className="panel">
                  <EmptyState icon={<Search size={22} />} title="No fixtures match those filters" body="Clear the search or choose another sport. New demo events are seeded regularly." action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); setStatus("all"); params.delete("sport"); setParams(params); }}>Reset filters</Button>} />
                </div>
              )}
              {grouped.map(([key, rows]) => {
                const [sport, league] = key.split("|");
                return (
                  <section className="league-block panel" key={key}>
                    <div className="league-head">
                      <div>
                        <span className="league-icon"><SportIcon sport={sport} size={17} /></span>
                        <strong>{league}</strong>
                        <span className="league-sport">{sport.replace("-", " ")}</span>
                      </div>
                      <Badge tone={rows.some((match) => match.status === "live") ? "coral" : "outline"}>
                        {rows.some((match) => match.status === "live") ? "LIVE" : `${rows.length} fixture${rows.length === 1 ? "" : "s"}`}
                      </Badge>
                    </div>
                    {rows.map((match) => <MatchRow key={match.id} match={match} />)}
                  </section>
                );
              })}
            </div>
          )}

          <div className="sports-footnote">
            <ShieldCheck size={16} />
            <span>All prices are illustrative demo data. Coin stakes are settled in your account ledger. No real-money wagering is offered.</span>
          </div>
        </main>

        <aside className="sports-rail">
          <BetSlipRail />
          <div className="panel rail-panel">
            <div className="panel-head"><span><Sparkles size={15} /> Original games</span><Link to="/instant" className="text-btn">All</Link></div>
            <div className="rail-games">
              {games.filter((game) => game.playable).slice(0, 4).map((game) => <GameCard key={game.id} game={game} size="sm" showFavorite={false} />)}
            </div>
          </div>
          <div className="panel rail-panel help-panel">
            <span className="eyebrow">First time here?</span>
            <h3>How coin betting works</h3>
            <ol>
              <li>Pick a fixture and tap 1, X, or 2.</li>
              <li>Set a coin stake in your slip.</li>
              <li>Your bet is recorded server-side. Open bets appear in your dashboard.</li>
            </ol>
            <Link to="/help/getting-started" className="text-btn">Read the quick start <ArrowRight size={14} /></Link>
          </div>
          <div className="panel rail-panel limits-panel">
            <Zap size={18} />
            <div><strong>Play within limits</strong><span>Set a daily coin limit in Responsible Gaming.</span></div>
            <Link to="/account/responsible" className="text-btn">Manage</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LiveSpotlight({ matches }: { matches: ReturnType<typeof useData>["matches"] }) {
  if (!matches.length) return null;
  return (
    <section className="live-spotlight">
      <div className="rail-head"><span><Zap size={15} /> Live now</span><span className="panel-note">{matches.length} events in play</span></div>
      <div className="live-spot-grid">
        {matches.slice(0, 4).map((match) => (
          <article className="live-spot-card" key={match.id}>
            <div className="live-spot-top"><span className="live-tag"><span className="live-pulse" /> {match.minute || "LIVE"}</span><span className="live-spot-sport"><SportIcon sport={match.sport} size={13} /> {match.league}</span></div>
            <div className="live-spot-teams">
              <div><TeamBadge name={match.homeTeam} size={20} /><span>{match.homeTeam}</span><strong>{match.scoreHome ?? "0"}</strong></div>
              <div><TeamBadge name={match.awayTeam} size={20} /><span>{match.awayTeam}</span><strong>{match.scoreAway ?? "0"}</strong></div>
            </div>
            <div className="live-spot-odds">
              <OddsButton match={match} selection="home" value={match.odds.home} compact />
              <OddsButton match={match} selection="draw" value={match.odds.draw} compact />
              <OddsButton match={match} selection="away" value={match.odds.away} compact />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BetSlipRail() {
  const { selections, totalOdds, potentialReturn, setOpen } = useBetSlip();
  return (
    <div className="panel bet-slip-rail">
      <div className="panel-head"><span><Ticket size={15} /> Bet slip</span><Badge tone={selections.length ? "lime" : "outline"}>{selections.length}</Badge></div>
      {selections.length === 0 ? (
        <div className="slip-rail-empty">
          <ReceiptText size={20} />
          <strong>No selections yet</strong>
          <span>Tap 1, X, or 2 on any fixture to start a coin slip.</span>
        </div>
      ) : (
        <div className="slip-rail-body">
          {selections.slice(0, 3).map((selection) => <div className="slip-rail-row" key={selection.matchId}><span>{selection.matchLabel}</span><strong>{selection.odds.toFixed(2)}</strong></div>)}
          {selections.length > 3 && <span className="muted-small">+{selections.length - 3} more selections</span>}
          <div className="slip-rail-totals"><div><span>Total odds</span><strong>{totalOdds.toFixed(2)}</strong></div><div><span>Potential return</span><strong className="lime-text">{vc(potentialReturn)}</strong></div></div>
          <Button variant="lime" size="sm" className="full-btn" onClick={() => setOpen(true)}>Open bet slip <ArrowRight size={14} /></Button>
        </div>
      )}
    </div>
  );
}

function VirtualsContent({ games, matches }: { games: ReturnType<typeof useData>["games"]; matches: ReturnType<typeof useData>["matches"] }) {
  return (
    <div className="virtuals-content">
      <section className="panel virtuals-hero">
        <div>
          <span className="eyebrow"><Zap size={13} /> Simulated sport</span>
          <h2>Short cycles. Fast results.</h2>
          <p>Virtual events run on compressed schedules. Playable originals settle instantly; provider titles are integration-ready only.</p>
        </div>
        <div className="virtuals-badge">
          <span>Settlement</span>
          <strong>Instant</strong>
          <small>server-recorded</small>
        </div>
      </section>
      <div className="game-grid featured-grid">
        {games.map((game) => <GameCard key={game.id} game={game} />)}
      </div>
      <section className="league-block panel">
        <div className="league-head">
          <div><span className="league-icon"><SportIcon sport="horse-racing" size={17} /></span><strong>Virtual racing schedule</strong><span className="league-sport">simulated</span></div>
          <Badge tone="outline">Demo</Badge>
        </div>
        {matches.map((match) => <MatchRow key={match.id} match={match} showLeague />)}
      </section>
    </div>
  );
}

function SportsSkeleton() {
  return (
    <div className="sports-page">
      <div className="page-hero compact-hero"><div className="page-shell"><Skeleton className="sk-pill" /><Skeleton className="sk-title" /><Skeleton className="sk-line w50" /></div></div>
      <div className="page-shell sports-shell">
        <aside className="panel sports-sidebar">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="sk-line" />)}</aside>
        <main className="sports-main">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="sk-match-block" />)}</main>
      </div>
    </div>
  );
}

export function LiveSports() { return <SportsPage mode="live" />; }
export function Esports() { return <SportsPage mode="esports" />; }
export function VirtualSports() { return <SportsPage mode="virtuals" />; }
