import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Coins, LineChart, ShieldCheck, Sparkles, Ticket, Trophy, Users } from "lucide-react";
import { api } from "../lib/api";
import type { FantasyContest, FantasyEntry } from "../types";
import { useAuth } from "../state/AuthContext";
import { Badge, Button, EmptyState, ErrorState, Skeleton } from "../components/UI";
import { dateTime, number, vc } from "../lib/format";

type MyEntry = FantasyEntry & { contestName: string; contestStatus: string; startTime: string; prizePool: number; league: string; homeTeam: string; awayTeam: string };

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Locked";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m left`;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open", locked: "Locked", live: "Live", settled: "Settled", cancelled: "Cancelled", draft: "Draft"
};

export function FantasyPage() {
  const { user } = useAuth();
  const [contests, setContests] = useState<FantasyContest[]>([]);
  const [entries, setEntries] = useState<MyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.fantasyContests(),
      user ? api.fantasyMyEntries() : Promise.resolve({ entries: [] as MyEntry[] })
    ])
      .then(([contestData, entryData]) => {
        if (!alive) return;
        setContests(contestData.contests);
        setEntries(entryData.entries);
        setError(null);
      })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : "Could not load fantasy contests."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user]);

  const open = useMemo(() => contests.filter((contest) => contest.status === "open"), [contests]);
  const prizeTotal = useMemo(() => open.reduce((sum, contest) => sum + contest.prizePool, 0), [open]);

  return (
    <div className="fantasy-page">
      <section className="page-hero compact-hero fantasy-hero">
        <div className="page-shell page-hero-inner">
          <div>
            <span className="eyebrow"><Trophy size={13} /> Daily fantasy cricket</span>
            <h1>Pick the XI. <em>Own the result.</em></h1>
            <p>Build a salary-cap lineup for a live fixture, choose your captain and vice-captain, and climb the contest leaderboard. Every entry is wallet-funded and server-validated.</p>
            <div className="hero-actions">
              <a href="#fantasy-contests" className="btn btn-primary">Browse contests <ArrowRight size={16} /></a>
              <Link to="/help" className="btn btn-ghost">Fantasy rules</Link>
            </div>
          </div>
          <div className="fantasy-hero-stats">
            <div><strong>{open.length}</strong><span>open contests</span></div>
            <div><strong>{vc(prizeTotal, { compact: true })}</strong><span>prize pool</span></div>
            <div><strong>{number(contests.reduce((sum, contest) => sum + contest.entries, 0))}</strong><span>entries</span></div>
          </div>
        </div>
      </section>

      <div className="page-shell fantasy-shell" id="fantasy-contests">
        <section className="fantasy-how">
          <div><span className="fantasy-step">01</span><div><strong>Pick a contest</strong><span>Choose an open cricket fixture and entry fee.</span></div></div>
          <div><span className="fantasy-step">02</span><div><strong>Build your XI</strong><span>Stay under 100 credits and follow the role quotas.</span></div></div>
          <div><span className="fantasy-step">03</span><div><strong>Choose C &amp; VC</strong><span>Your captain scores 2×, vice-captain 1.5×.</span></div></div>
          <div><span className="fantasy-step">04</span><div><strong>Win the pool</strong><span>Prizes settle from the server-recorded player scores.</span></div></div>
        </section>

        <div className="section-heading">
          <div><span className="eyebrow">Live lobby</span><h2>Open contests</h2><p>Entries lock five minutes before the first ball. Prizes are paid into your coin wallet after settlement.</p></div>
          <Badge tone="lime">Sandbox coin contests</Badge>
        </div>

        {loading ? (
          <div className="fantasy-grid">{Array.from({ length: 3 }).map((_, index) => <div className="panel fantasy-card" key={index}><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-button" /></div>)}</div>
        ) : error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : !contests.length ? (
          <EmptyState icon={<Trophy size={22} />} title="No fantasy contests are open" body="New contests appear here when the next cricket fixture is published." />
        ) : (
          <div className="fantasy-grid">
            {contests.map((contest) => (
              <article className={`panel fantasy-card status-${contest.status}`} key={contest.id}>
                <div className="fantasy-card-top">
                  <div><Badge tone={contest.status === "open" ? "lime" : contest.status === "settled" ? "cyan" : "outline"}>{STATUS_LABEL[contest.status] || contest.status}</Badge><span>{contest.league}</span></div>
                  <span className="fantasy-lock"><CalendarClock size={13} /> {countdown(contest.lockAt)}</span>
                </div>
                <h3>{contest.name}</h3>
                <p className="fantasy-match">{contest.homeTeam} <span>vs</span> {contest.awayTeam}</p>
                <div className="fantasy-card-metrics">
                  <div><span>Prize pool</span><strong>{vc(contest.prizePool, { compact: true })}</strong></div>
                  <div><span>Entry</span><strong>{vc(contest.entryFee)}</strong></div>
                  <div><span>Spots</span><strong>{contest.entries}/{contest.maxEntries}</strong></div>
                </div>
                <div className="fantasy-card-foot">
                  <span><Users size={14} /> {Math.max(0, contest.maxEntries - contest.entries)} spots left</span>
                  <Link to={`/fantasy/${contest.id}`} className="btn btn-primary btn-sm">{contest.status === "open" ? (contest.myEntries ? "View entry" : "Build lineup") : "View contest"} <ArrowRight size={14} /></Link>
                </div>
                {contest.status === "open" && contest.myEntries > 0 && <small className="fantasy-entered"><ShieldCheck size={13} /> You have {contest.myEntries} entry in this contest</small>}
              </article>
            ))}
          </div>
        )}

        {user && entries.length > 0 && (
          <section className="fantasy-my-entries">
            <div className="section-heading"><div><span className="eyebrow">Your contests</span><h2>My fantasy entries</h2><p>Track locked lineups, scores and prize credits.</p></div><Link to="/account/wallet" className="section-link">Wallet <ArrowRight size={14} /></Link></div>
            <div className="data-table-wrap panel">
              <table className="data-table">
                <thead><tr><th>Contest</th><th>Match</th><th>Entry</th><th>Status</th><th>Score</th><th>Rank</th><th>Payout</th><th /></tr></thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td><strong>{entry.contestName}</strong><span className="row-sub">{entry.league}</span></td>
                      <td>{entry.homeTeam} vs {entry.awayTeam}</td>
                      <td>{vc(entry.entryFee)}</td>
                      <td><Badge tone={entry.contestStatus === "settled" ? "cyan" : "outline"}>{entry.contestStatus}</Badge></td>
                      <td>{entry.score ? entry.score.toFixed(2) : "—"}</td>
                      <td>{entry.rank || "—"}</td>
                      <td className={entry.payout > 0 ? "amount positive" : "muted-cell"}>{entry.payout ? vc(entry.payout) : "—"}</td>
                      <td><Link to={`/fantasy/${entry.contestId}`} className="text-btn">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="fantasy-rules panel">
          <div className="panel-head"><span><ShieldCheck size={15} /> Contest rules</span><Badge tone="outline">Server-authoritative</Badge></div>
          <div className="fantasy-rules-grid">
            <div><strong>Salary cap</strong><span>100 credits for 11 players. Role quotas: 1 WK, 4 BAT, 3 AR, 3 BOWL.</span></div>
            <div><strong>Team limit</strong><span>Maximum 7 players from one team.</span></div>
            <div><strong>Captain &amp; vice</strong><span>Captain scores 2×, vice-captain 1.5×. They must be in your XI.</span></div>
            <div><strong>Settlement</strong><span>Leaderboard is ordered by points; earlier entry wins an exact score tie.</span></div>
            <div><strong>Cancellation</strong><span>If a contest is cancelled before settlement, every entry is refunded.</span></div>
            <div><strong>Sandbox note</strong><span>Coin contests are currently sandbox-only. Real-money entry stays gated until KYC, licensing and payment onboarding are approved.</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
