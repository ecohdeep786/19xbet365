import { Clock3 } from "lucide-react";
import type { Match } from "../types";
import { classNames, kickoff, odds as formatOdds } from "../lib/format";
import { useBetSlip } from "../state/BetSlipContext";
import { SportIcon } from "./SportIcon";
import { TeamBadge } from "./TeamBadge";

export { SportIcon } from "./SportIcon";

export function OddsButton({ match, selection, value, compact }: { match: Match; selection: "home" | "draw" | "away"; value: number | null; compact?: boolean }) {
  const { selections, toggleSelection } = useBetSlip();
  const active = selections.some((item) => item.matchId === match.id && item.selection === selection);
  const label = selection === "home" ? "1" : selection === "draw" ? "X" : "2";
  return (
    <button
      className={classNames("odds-btn", active && "active", compact && "compact")}
      disabled={value == null || match.status === "finished" || match.status === "suspended"}
      onClick={() => { if (value != null) toggleSelection(match, selection, value); }}
      aria-label={`${label} ${selection} odds ${formatOdds(value)}`}
      aria-pressed={active}
    >
      <span className="odds-label">{label}</span>
      <strong>{formatOdds(value)}</strong>
    </button>
  );
}

export function MatchRow({ match, showLeague = false }: { match: Match; showLeague?: boolean }) {
  const live = match.status === "live";
  const finished = match.status === "finished";
  return (
    <div className={classNames("match-row", live && "is-live", finished && "is-finished")}>
      <div className="match-info">
        <div className="match-meta">
          <span className="sport-chip"><SportIcon sport={match.sport} size={13} /> {showLeague ? match.league : match.sport.replace("-", " ")}</span>
          {live ? (
            <span className="live-tag"><span className="live-pulse" /> LIVE {match.minute || ""}</span>
          ) : finished ? (
            <span className="ft-tag">FT · settled</span>
          ) : (
            <span className="match-time"><Clock3 size={12} /> {kickoff(match.startTime)}</span>
          )}
        </div>
        <div className="teams">
          <span className="team-link">
            <TeamBadge name={match.homeTeam} />
            <span>{match.homeTeam}</span>
            {(live || finished) && <strong>{match.scoreHome ?? 0}</strong>}
          </span>
          <span className="team-sep">vs</span>
          <span className="team-link">
            <TeamBadge name={match.awayTeam} />
            <span>{match.awayTeam}</span>
            {(live || finished) && <strong>{match.scoreAway ?? 0}</strong>}
          </span>
        </div>
        {showLeague && <span className="league-line">{match.league}</span>}
      </div>
      <div className="match-odds">
        <OddsButton match={match} selection="home" value={match.odds.home} />
        <OddsButton match={match} selection="draw" value={match.odds.draw} />
        <OddsButton match={match} selection="away" value={match.odds.away} />
      </div>
    </div>
  );
}
