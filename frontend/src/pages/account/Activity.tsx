import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Coins, RefreshCcw, Sparkles, Trophy } from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { demoRounds } from "../../lib/demo";
import type { GameRound } from "../../types";
import { useData } from "../../state/DataContext";
import { Badge, EmptyState, ErrorState, Select, Skeleton, Stat } from "../../components/UI";
import { classNames, dateTime, vc } from "../../lib/format";

export function AccountActivity() {
  const { games } = useData();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [gameFilter, setGameFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.rounds(80);
      setRounds(data.rounds);
      setError(null);
    } catch (err) {
      if (isOfflineError(err)) { setRounds(demoRounds); setError(null); }
      else setError(err instanceof Error ? err.message : "Could not load game activity.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => gameFilter === "all" ? rounds : rounds.filter((round) => round.game_id === gameFilter), [rounds, gameFilter]);
  const wagered = filtered.reduce((sum, round) => sum + Number(round.bet), 0);
  const returned = filtered.reduce((sum, round) => sum + Number(round.payout), 0);
  const wins = filtered.filter((round) => Number(round.payout) > Number(round.bet)).length;
  const playableGames = games.filter((game) => game.playable);

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Game history</span>
        <h2>Game activity</h2>
        <p>Server-recorded rounds across every 19X Original. Settled outcomes and payouts are immutable.</p>
      </div>
      <div className="stat-grid">
        <Stat label="Rounds" value={filtered.length} hint={`${wins} winning rounds`} tone="cyan" icon={<Activity size={16} />} />
        <Stat label="Total wagered" value={vc(wagered, { compact: true })} hint="Virtual credits" icon={<Coins size={16} />} />
        <Stat label="Total returned" value={vc(returned, { compact: true })} hint="Virtual credits" tone="lime" icon={<Trophy size={16} />} />
        <Stat label="Net" value={vc(returned - wagered, { compact: true, sign: true })} hint="Return minus stake" tone={returned - wagered >= 0 ? "lime" : "coral"} icon={<Sparkles size={16} />} />
      </div>
      <div className="panel activity-history-panel">
        <div className="wallet-toolbar">
          <div className="panel-head"><span><Activity size={15} /> Round ledger</span><Badge tone="outline">Immutable once settled</Badge></div>
          <div className="activity-filter">
            <Select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)} aria-label="Filter by game">
              <option value="all">All games</option>
              {playableGames.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </Select>
            <button className="icon-btn" onClick={load} aria-label="Refresh activity"><RefreshCcw size={16} /></button>
          </div>
        </div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? (
          <EmptyState icon={<Sparkles size={22} />} title="No rounds in this view" body="Play an 19X Original to start your game history. Every round is generated and stored by the server." action={<Link to="/instant" className="btn btn-secondary btn-sm">Play originals <ArrowRight size={15} /></Link>} />
        ) : (
          <div className="round-history-list">
            {filtered.map((round) => {
              const outcome = round.outcome || {};
              const multiplier = Number(outcome.multiplier || (Number(round.bet) > 0 ? Number(round.payout) / Number(round.bet) : 0));
              const win = Number(round.payout) > 0;
              return (
                <article className={classNames("round-history-row", win && "win")} key={round.id}>
                  <div className="round-history-main">
                    <span className={classNames("round-icon", win ? "win" : "")}>{win ? <Trophy size={16} /> : <Activity size={16} />}</span>
                    <div>
                      <strong>{round.game_name}</strong>
                      <span>{String(outcome.summary || (round.status === "settled" ? "Settled round" : "Round open"))}</span>
                      <small>{dateTime(round.created_at)} · {round.id.slice(0, 8).toUpperCase()}</small>
                    </div>
                  </div>
                  <div className="round-history-numbers">
                    <span>Stake <strong>{vc(round.bet)}</strong></span>
                    <span>Multiplier <strong>{multiplier ? `${multiplier.toFixed(2)}x` : "—"}</strong></span>
                    <span>Return <strong className={win ? "lime-text" : ""}>{win ? vc(round.payout) : "—"}</strong></span>
                  </div>
                  <button className="text-btn" onClick={() => setExpanded(expanded === round.id ? null : round.id)}>{expanded === round.id ? "Hide details" : "Details"}</button>
                  {expanded === round.id && (
                    <div className="round-detail">
                      <div><span>Status</span><strong>{round.status}</strong></div>
                      <div><span>Recorded payout</span><strong>{vc(round.payout)}</strong></div>
                      <div><span>Recorded multiplier</span><strong>{multiplier ? `${multiplier.toFixed(2)}x` : "—"}</strong></div>
                      <div><span>Outcome summary</span><strong>{String(outcome.summary || "—")}</strong></div>
                      <div><span>Round reference</span><strong>{round.id}</strong></div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
      <div className="account-fineprint">Completed rounds are protected by an immutability trigger. Staff cannot alter payouts or outcomes after settlement.</div>
    </div>
  );
}
