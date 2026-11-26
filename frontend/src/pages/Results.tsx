import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ListChecks, Trophy } from "lucide-react";
import { api } from "../lib/api";
import type { Match } from "../types";
import { useData } from "../state/DataContext";
import { SportIcon } from "../components/SportIcon";
import { EmptyState, ErrorState, Skeleton } from "../components/UI";
import { dateTime } from "../lib/format";

export function ResultsPage() {
  const { matches } = useData();
  const [rows, setRows] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState("all");

  useEffect(() => {
    let cancelled = false;
    api.publicMatches("?status=finished&limit=100")
      .then((data) => { if (!cancelled) setRows(data.matches); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Results are unavailable."); });
    return () => { cancelled = true; };
  }, []);

  const source = rows?.length ? rows : matches.filter((match) => match.status === "finished" || match.resultHome != null);
  const sports = useMemo(() => [...new Set(source.map((match) => match.sport))].sort(), [source]);
  const filtered = sport === "all" ? source : source.filter((match) => match.sport === sport);

  return (
    <div className="page-shell results-page">
      <div className="page-hero compact-hero">
        <div className="page-hero-inner">
          <div><span className="eyebrow"><ListChecks size={13} /> Results</span><h1>Settled fixtures, final scores, no ambiguity.</h1><p>Completed demo events and their final scores. Every settlement is recorded by the server.</p></div>
          <div className="hero-stat-panel"><span>Finished events</span><strong>{source.length}</strong><small>recorded results</small></div>
        </div>
      </div>
      <div className="filter-chips results-filters">
        <button className={`filter-chip ${sport === "all" ? "active" : ""}`} onClick={() => setSport("all")}>All sports</button>
        {sports.map((item) => <button key={item} className={`filter-chip ${sport === item ? "active" : ""}`} onClick={() => setSport(item)}><SportIcon sport={item} size={13} /> {item.replace(/-/g, " ")}</button>)}
      </div>
      {error && <ErrorState message={error} />}
      {!rows && !error ? <div className="panel"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : null}
      {rows && filtered.length === 0 ? <EmptyState icon={<CalendarDays size={22} />} title="No finished events yet" body="The demo settlement worker will publish final scores here as fixtures complete." /> : null}
      <div className="results-list">
        {filtered.map((match) => {
          const home = match.resultHome ?? match.scoreHome;
          const away = match.resultAway ?? match.scoreAway;
          return (
            <article className="panel result-row" key={match.id}>
              <div className="result-sport"><SportIcon sport={match.sport} size={17} /><span>{match.league}</span></div>
              <div className="result-teams"><strong>{match.homeTeam}</strong><span className="result-score">{home ?? "—"}</span><span className="result-sep">:</span><span className="result-score">{away ?? "—"}</span><strong>{match.awayTeam}</strong></div>
              <div className="result-meta"><Trophy size={13} /><span>{match.status === "finished" ? "Final" : match.status}</span><time>{dateTime(match.startTime)}</time></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
