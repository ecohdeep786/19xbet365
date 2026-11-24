import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, ChevronRight, Clock3, Coins, Eye, Gamepad2, Radio,
  ServerCog, ShieldCheck, Sparkles, Trophy, Zap
} from "lucide-react";
import { useData } from "../state/DataContext";
import { GameArt } from "../components/GameArt";
import { GameCard } from "../components/GameCard";
import { MatchRow, SportIcon } from "../components/MatchRow";
import { BetSlipRail } from "./Sports";
import { Badge, Button, CardSkeleton, ErrorState, SectionHeading, Skeleton } from "../components/UI";
import { dateShort, number, relative, timeOnly, vc } from "../lib/format";

export function Home() {
  const { bootstrap, loading, error, refresh, games, matches } = useData();

  if (loading) return <HomeSkeleton />;
  if (error || !bootstrap) return <div className="page-shell"><ErrorState message={error || "The platform could not be loaded."} onRetry={refresh} /></div>;

  const playable = games.filter((game) => game.playable).slice(0, 8);
  const crash = games.find((game) => game.id === "crash-orbit");
  const mines = games.find((game) => game.id === "mines-vault");
  const liveMatches = matches.filter((match) => match.status === "live").slice(0, 5);
  const showcase = liveMatches.length ? liveMatches : matches.filter((match) => match.featured).slice(0, 5);
  const slots = games.filter((game) => ["slots-provider", "slots"].includes(game.category)).slice(0, 6);
  const liveCasino = games.filter((game) => game.category === "live-casino").slice(0, 4);
  const promo = bootstrap.promotions[0];
  const tournaments = bootstrap.tournaments;
  const liveTournament = tournaments.find((item) => item.status === "live") || tournaments[0];

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-bg">
          <span className="hero-star s1" /><span className="hero-star s2" /><span className="hero-star s3" />
          <span className="hero-star s4" /><span className="hero-star s5" /><span className="hero-star s6" />
        </div>
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="live-pulse" />
              <span>19X Originals · server-recorded rounds</span>
              <span className="hero-kicker-divider" />
              <span>Virtual credits only</span>
            </div>
            <h1>Play beyond<br />the <em>ordinary.</em></h1>
            <p className="hero-lede">
              A sportsbook, casino lobby, and original instant games in one precise arena.
              Every 19X round is generated on our server, recorded, and completely free to play.
            </p>
            <div className="hero-actions">
              <Link to="/instant" className="btn btn-primary btn-lg">Explore originals <ArrowRight size={18} /></Link>
              <Link to="/live" className="btn btn-ghost btn-lg"><span className="live-pulse" /> View live odds</Link>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck size={15} /> No real money</span>
              <span><ServerCog size={15} /> Server-authoritative</span>
              <span><Eye size={15} /> Transparent limits</span>
            </div>
          </div>
          <div className="hero-stage" aria-hidden="true">
            <div className="orbit-halo" />
            <div className="orbit-ring ring-a"><span className="orbit-node" /></div>
            <div className="orbit-ring ring-b"><span className="orbit-node" /></div>
            <div className="orbit-ring ring-c" />
            <div className="orbit-core">
              <span className="core-label">19X</span>
              <strong>ORIGINALS</strong>
              <span className="core-sub">11 playable titles</span>
            </div>
            {crash && (
              <div className="floating-card float-crash">
                <GameArt game={crash} />
                <div><span>LIVE GAME</span><strong>{crash.name}</strong><em>Crash · 1,000x max</em></div>
              </div>
            )}
            {mines && (
              <div className="floating-card float-mines">
                <GameArt game={mines} />
                <div><span>ORIGINAL</span><strong>{mines.name}</strong><em>5×5 · cash out anytime</em></div>
              </div>
            )}
            <div className="floating-chip float-chip">
              <Trophy size={14} /> 250,000 VC prize pool
            </div>
            <div className="floating-chip float-chip-two">
              <ServerCog size={14} /> Rounds start on demand
            </div>
            <div className="hero-orbit-label">SERVER<br />AUTHORITATIVE</div>
          </div>
        </div>
        <div className="hero-metrics">
          <div><strong>{number(games.length)}</strong><span>catalogue titles</span></div>
          <div><strong>{number(games.filter((game) => game.playable).length)}</strong><span>playable originals</span></div>
          <div><strong>{number(matches.length)}</strong><span>demo fixtures</span></div>
          <div><strong>100%</strong><span>virtual credits</span></div>
        </div>
      </section>

      <div className="page-shell home-shell">
        <section className="quick-strip">
          {bootstrap.sports.slice(0, 8).map((sport) => (
            <Link to={`/sports?sport=${sport.slug}`} key={sport.slug} className="quick-sport">
              <span className="quick-sport-icon"><SportIcon sport={sport.slug} size={18} /></span>
              <div><strong>{sport.name}</strong><small>{number(sport.count)} events</small></div>
              <ChevronRight size={14} />
            </Link>
          ))}
        </section>

        <section className="home-section">
          <SectionHeading
            kicker="In the arena"
            title={liveMatches.length ? "Live right now" : "Tonight's fixtures"}
            body="Server-generated demo fixtures with transparent prices. Add a selection to your virtual bet slip."
            action={<Link to={liveMatches.length ? "/live" : "/sports"} className="section-link">All {liveMatches.length ? "live" : "fixtures"} <ArrowRight size={15} /></Link>}
          />
          <div className="home-sports-grid">
            <aside className="panel home-sports-sidebar">
              <div className="sidebar-head"><span>Sports</span><Link to="/sports" className="text-btn">All</Link></div>
              <Link to="/sports" className="sport-filter active"><span className="sport-filter-icon"><Trophy size={16} /></span><span>All sports</span><em>{matches.length}</em></Link>
              {bootstrap.sports.slice(0, 10).map((sport) => (
                <Link to={`/sports?sport=${sport.slug}`} className="sport-filter" key={sport.slug}>
                  <span className="sport-filter-icon"><SportIcon sport={sport.slug} size={16} /></span>
                  <span>{sport.name}</span>
                  <em>{sport.count}</em>
                </Link>
              ))}
              <div className="sidebar-note"><ShieldCheck size={15} /><div><strong>Illustrative prices</strong><span>Demo fixtures only. Sandbox coins have no cash value.</span></div></div>
            </aside>
            <div className="panel match-panel">
              <div className="panel-head">
                <span><Radio size={15} /> {liveMatches.length ? "Live feed" : "Featured card"}</span>
                <Badge tone="outline">Demo fixtures</Badge>
              </div>
              {showcase.map((match, index) => (
                <div key={match.id} className="stagger-row" style={{ animationDelay: `${index * 55}ms` }}>
                  <MatchRow match={match} showLeague />
                </div>
              ))}
              <Link to="/sports" className="panel-foot-link">Open the full sportsbook <ArrowRight size={14} /></Link>
            </div>
            <aside className="home-rail-stack">
              <BetSlipRail />
              <div className="panel live-pulse-panel">
                <div className="panel-head"><span><Zap size={15} /> Activity pulse</span><span className="live-tag"><span className="live-pulse" /> live</span></div>
                <div className="pulse-big">
                  <span>Players in originals</span>
                  <strong>{number(games.filter((game) => game.playable).reduce((sum, game) => sum + game.players, 0))}</strong>
                  <div className="pulse-bars">{Array.from({ length: 16 }).map((_, index) => <i key={index} style={{ height: `${18 + ((index * 37) % 62)}%` }} />)}</div>
                </div>
                <div className="pulse-list">
                  {games.filter((game) => game.playable).slice(0, 3).map((game) => (
                    <Link to={`/game/${game.id}`} key={game.id}>
                      <span>{game.name}</span>
                      <strong>{number(game.players)}<small> playing</small></strong>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="home-section">
          <SectionHeading
            kicker="19X Originals"
            title="Games with a fair edge"
            body="Built in-house. Server-generated outcomes, instant settlement, and full round history."
            action={<Link to="/instant" className="section-link">View all originals <ArrowRight size={15} /></Link>}
          />
          <div className="game-grid featured-grid">
            {playable.map((game) => <GameCard key={game.id} game={game} size="md" />)}
          </div>
        </section>

        <section className="home-section casino-split">
          <div>
            <SectionHeading
              kicker="Casino lobby"
              title="Reels, tables, and after-dark energy"
              body="Original slots are playable now. Certified provider titles are labelled and integration-ready."
              action={<Link to="/casino" className="section-link">Enter casino <ArrowRight size={15} /></Link>}
            />
            <div className="game-grid casino-grid">
              {slots.slice(0, 3).map((game) => <GameCard key={game.id} game={game} size="md" />)}
            </div>
          </div>
          <div className="live-casino-promo">
            <div className="live-casino-art">
              <span className="table-arc" />
              <span className="live-chip c1" /><span className="live-chip c2" /><span className="live-chip c3" />
              <div className="live-casino-copy">
                <Badge tone="coral"><span className="live-pulse" /> LIVE LOBBY</Badge>
                <h3>The felt, reimagined.</h3>
                <p>Roulette, blackjack, baccarat, and game-show style tables. Provider sessions are required before real play is enabled.</p>
                <Link to="/live-casino" className="btn btn-secondary btn-sm">Explore live casino <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div className="live-casino-rail">
              {liveCasino.map((game) => <GameCard key={game.id} game={game} size="sm" showFavorite={false} />)}
            </div>
          </div>
        </section>

        <section className="home-section">
          <SectionHeading
            kicker="Rewards & competition"
            title="More ways to make the board"
            body="Virtual-credit promotions and leaderboards. No cash value, no wagering requirements."
            action={<Link to="/promotions" className="section-link">All promotions <ArrowRight size={15} /></Link>}
          />
          <div className="promo-grid">
            {promo && (
              <Link to="/promotions" className={`promo-card promo-${promo.theme} promo-large`}>
                <span className="promo-kicker">{promo.kicker}</span>
                <h3>{promo.title}</h3>
                <p>{promo.description}</p>
                <div className="promo-bottom">
                  <span className="promo-prize"><Coins size={16} /> {promo.prize}</span>
                  <span className="promo-cta">{promo.cta} <ArrowRight size={15} /></span>
                </div>
                <span className="promo-orbit" />
              </Link>
            )}
            {bootstrap.promotions.slice(1, 3).map((item) => (
              <Link to="/promotions" key={item.id} className={`promo-card promo-${item.theme}`}>
                <span className="promo-kicker">{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="promo-bottom"><span className="promo-cta">{item.cta} <ArrowRight size={15} /></span></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="tournament-band">
            <div className="tournament-copy">
              <span className="eyebrow"><Trophy size={13} /> Live tournament</span>
              <h2>{liveTournament?.name || "19X tournament series"}</h2>
              <p>Climb the leaderboard with your best completed rounds. Prize pools are virtual credits.</p>
              <div className="tournament-meta">
                <span><Coins size={15} /> {vc(liveTournament?.prizePool || 0)} pool</span>
                <span><Clock3 size={15} /> Ends {dateShort(liveTournament?.endsAt)}</span>
                <span><Gamepad2 size={15} /> {number(liveTournament?.participants || 0)} players</span>
              </div>
              <Link to="/tournaments" className="btn btn-lime btn-sm">See standings <ArrowRight size={15} /></Link>
            </div>
            <div className="leaderboard">
              <div className="leaderboard-head"><span>#</span><span>Player</span><span>Best multiplier</span></div>
              {liveTournament?.leaderboard.slice(0, 5).map(([name, multiplier], index) => (
                <div className="leaderboard-row" key={name}>
                  <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                  <span className="player-name"><span className="mini-avatar">{name.slice(0, 2).toUpperCase()}</span>{name}</span>
                  <strong>{Number(multiplier).toFixed(1)}x</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="trust-band">
          <div><span className="trust-icon"><ShieldCheck size={19} /></span><div><strong>Sandbox coins only</strong><p>No live cash deposits, withdrawals, redemption, or real-money wagering until operator activation.</p></div></div>
          <div><span className="trust-icon"><ServerCog size={19} /></span><div><strong>Server-authoritative play</strong><p>Rounds are generated and stored by the 19X game engine — never in the browser.</p></div></div>
          <div><span className="trust-icon"><BadgeCheck size={19} /></span><div><strong>Immutable audit trail</strong><p>Settled rounds and staff actions are hash-chained and append-only.</p></div></div>
          <div><span className="trust-icon"><Eye size={19} /></span><div><strong>Responsible by design</strong><p>Daily limits, reality checks, cool-offs, and self-exclusion are built in.</p></div></div>
        </section>

        <section className="responsible-cta">
          <div>
            <span className="eyebrow">Play with a clear head</span>
            <h2>Entertainment, not income.</h2>
            <p>Set a virtual-credit limit, schedule a reality check, or take a cool-off. Your controls are always one tap away.</p>
          </div>
          <div className="responsible-actions">
            <Link to="/account/responsible" className="btn btn-secondary">Set my limits</Link>
            <Link to="/responsible-gaming" className="btn btn-ghost">Responsible play <ArrowRight size={15} /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="home-page">
      <section className="hero hero-skeleton">
        <div className="hero-inner">
          <div className="hero-copy">
            <Skeleton className="sk-pill" />
            <Skeleton className="sk-title" />
            <Skeleton className="sk-title short" />
            <Skeleton className="sk-line w70" />
            <Skeleton className="sk-line w50" />
            <div className="hero-actions"><Skeleton className="sk-button" /><Skeleton className="sk-button" /></div>
          </div>
          <div className="hero-stage"><Skeleton className="sk-orbit" /></div>
        </div>
      </section>
      <div className="page-shell home-shell">
        <div className="quick-strip">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="sk-quick" />)}</div>
        <div className="game-grid">{Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}</div>
      </div>
    </div>
  );
}
