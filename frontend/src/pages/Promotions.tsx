import { Link, useNavigate } from "react-router-dom";
import type { Tournament } from "../types";
import { ArrowRight, CalendarClock, Coins, Gift, Info, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { useData } from "../state/DataContext";
import { Badge, Button, EmptyState, SectionHeading, Skeleton, Stat } from "../components/UI";
import { dateShort, number, relative, vc } from "../lib/format";

export function Promotions() {
  const { bootstrap, loading } = useData();
  const promotions = bootstrap?.promotions || [];

  return (
    <div className="promotions-page">
      <div className="page-hero compact-hero promo-hero">
        <div className="page-shell page-hero-inner">
          <div>
            <span className="eyebrow">Rewards, without the fine print</span>
            <h1>Coins.<br /><em>Real reasons to play.</em></h1>
            <p>Every 19X promotion awards non-redeemable coins. No deposit, no wagering requirement, no cash value. The terms are written to be read.</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-lime">Claim the welcome haul <ArrowRight size={16} /></Link>
              <Link to="/help" className="btn btn-ghost">Promotion rules</Link>
            </div>
          </div>
          <div className="promo-hero-mark"><Gift size={54} /><span>10,500 coins</span><small>new player allocation</small></div>
        </div>
      </div>
      <div className="page-shell">
        {loading ? (
          <div className="promo-grid">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="sk-promo" />)}</div>
        ) : (
          <>
            <div className="promo-grid promo-page-grid">
              {promotions.map((promo, index) => (
                <article key={promo.id} className={`promo-card promo-${promo.theme} ${index === 0 ? "promo-large" : ""}`}>
                  <div className="promo-card-top">
                    <span className="promo-kicker">{promo.kicker}</span>
                    {promo.badge && <Badge tone={promo.theme === "lime" ? "lime" : "outline"}>{promo.badge}</Badge>}
                  </div>
                  <h2>{promo.title}</h2>
                  <p>{promo.description}</p>
                  <div className="promo-prize-line"><Coins size={16} /> {promo.prize || "Coin reward"}</div>
                  <div className="promo-bottom">
                    <span className={promo.endsAt ? "promo-deadline" : "promo-deadline open"}>
                      {promo.endsAt ? <><CalendarClock size={13} /> Ends {relative(promo.endsAt)}</> : <><Sparkles size={13} /> Always available</>}
                    </span>
                    <Link to={promo.type === "welcome" ? "/register" : promo.type === "tournament" ? "/tournaments" : "/instant"} className="promo-cta">
                      {promo.cta} <ArrowRight size={15} />
                    </Link>
                  </div>
                  <p className="promo-terms">{promo.terms}</p>
                  <span className="promo-orbit" />
                </article>
              ))}
            </div>
            <div className="promo-info-band">
              <div><Info size={18} /><span><strong>Coins only.</strong> Promotions have no cash value and cannot be withdrawn, transferred, or redeemed.</span></div>
              <div><ShieldCheck size={18} /><span><strong>One allocation per verified player.</strong> Abuse, duplicate accounts, or attempts to manipulate outcomes are reviewed by platform operations.</span></div>
              <div><Trophy size={18} /><span><strong>Leaderboards are final after settlement.</strong> Tournament prizes are awarded as coins and recorded in the audit trail.</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Tournaments() {
  const { bootstrap, loading } = useData();
  const tournaments = bootstrap?.tournaments || [];
  const live = tournaments.filter((item) => item.status === "live");
  const upcoming = tournaments.filter((item) => item.status === "upcoming");
  const finished = tournaments.filter((item) => item.status === "finished");

  return (
    <div className="tournaments-page">
      <div className="page-hero compact-hero tournament-hero">
        <div className="page-shell page-hero-inner">
          <div>
            <span className="eyebrow">19X tournament series</span>
            <h1>Make the board.<br /><em>Take the pool.</em></h1>
            <p>Leaderboards built from completed 19X Original rounds. Prize pools are coins; standings are recorded from settled game history.</p>
          </div>
          <div className="tournament-totals">
            <div><strong>{number(live.length)}</strong><span>live now</span></div>
            <div><strong>{vc(tournaments.reduce((sum, item) => sum + Number(item.prizePool), 0), { compact: true })}</strong><span>total pools</span></div>
            <div><strong>{number(tournaments.reduce((sum, item) => sum + item.participants, 0))}</strong><span>participants</span></div>
          </div>
        </div>
      </div>
      <div className="page-shell">
        {loading ? <Skeleton className="sk-promo" /> : (
          <>
            {live.length > 0 && (
              <section className="tournament-section">
                <SectionHeading kicker="Live" title="Currently climbing" body="Completed qualifying rounds count automatically. Ties are broken by the earliest settlement time." />
                <div className="tournament-list">
                  {live.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} featured />)}
                </div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section className="tournament-section">
                <SectionHeading kicker="Upcoming" title="On the calendar" />
                <div className="tournament-list">
                  {upcoming.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
                </div>
              </section>
            )}
            {finished.length > 0 && (
              <section className="tournament-section">
                <SectionHeading kicker="Finished" title="Recent final standings" />
                <div className="tournament-list">
                  {finished.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
                </div>
              </section>
            )}
            {!tournaments.length && <EmptyState icon={<Trophy size={22} />} title="No tournaments scheduled" body="New coin leaderboards appear here when platform operations publishes them." />}
            <div className="tournament-rules panel">
              <div>
                <span className="eyebrow"><ShieldCheck size={13} /> How standings work</span>
                <h3>Recorded, not negotiated.</h3>
                <p>Only settled 19X Original rounds count toward a tournament. The leaderboard is generated from the game-round ledger; no staff member can edit a payout or outcome after settlement.</p>
              </div>
              <ul>
                <li><Coins size={15} /> Prize pools are non-redeemable coins.</li>
                <li><Users size={15} /> One account per participant. Referral activity never grants administrative access.</li>
                <li><CalendarClock size={15} /> Qualifying windows are fixed and shown on each event.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TournamentCard({ tournament, featured }: { tournament: Tournament; featured?: boolean }) {
  const game = tournament.gameId;
  const navigate = useNavigate();
  return (
    <article className={`tournament-card ${featured ? "featured" : ""}`}>
      <div className="tournament-card-head">
        <div>
          <Badge tone={tournament.status === "live" ? "coral" : tournament.status === "upcoming" ? "cyan" : "outline"}>
            {tournament.status === "live" ? <><span className="live-pulse" /> LIVE</> : tournament.status.toUpperCase()}
          </Badge>
          <h3>{tournament.name}</h3>
          <span className="tournament-game">Qualifying game: {game ? game.replace(/-/g, " ") : "19X sports predictor"}</span>
        </div>
        <div className="tournament-prize"><span>Prize pool</span><strong>{vc(tournament.prizePool)}</strong></div>
      </div>
      <div className="tournament-stats">
        <Stat label="Participants" value={number(tournament.participants)} icon={<Users size={15} />} />
        <Stat label="Starts" value={dateShort(tournament.startsAt)} icon={<CalendarClock size={15} />} />
        <Stat label="Ends" value={dateShort(tournament.endsAt)} icon={<CalendarClock size={15} />} />
      </div>
      <div className="leaderboard tournament-leaderboard">
        <div className="leaderboard-head"><span>#</span><span>Player</span><span>Best multiplier</span></div>
        {tournament.leaderboard.slice(0, 5).map(([name, multiplier], index) => (
          <div className="leaderboard-row" key={name}>
            <span className={`rank rank-${index + 1}`}>{index + 1}</span>
            <span className="player-name"><span className="mini-avatar">{name.slice(0, 2).toUpperCase()}</span>{name}</span>
            <strong>{Number(multiplier).toFixed(1)}x</strong>
          </div>
        ))}
      </div>
      <div className="tournament-card-foot">
        <span>{tournament.status === "live" ? "Open now · settle a qualifying round to enter" : tournament.status === "upcoming" ? "Opens at the scheduled start" : "Final standings"}</span>
        <Button variant={featured ? "lime" : "secondary"} size="sm" onClick={() => navigate(game ? `/game/${game}` : "/sports")}>{game ? "Play qualifying game" : "Open sportsbook"} <ArrowRight size={14} /></Button>
      </div>
    </article>
  );
}
