import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarClock, Check, Coins, ShieldCheck, Trophy, Users } from "lucide-react";
import { api } from "../lib/api";
import type { FantasyDetail, FantasyPlayer, FantasyRole } from "../types";
import { useAuth } from "../state/AuthContext";
import { useToast } from "../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Skeleton } from "../components/UI";
import { classNames, dateTime, vc } from "../lib/format";

const ROLE_LABEL: Record<FantasyRole, string> = { wk: "WK", bat: "BAT", ar: "AR", bowl: "BOWL" };
const ROLE_NAME: Record<FantasyRole, string> = { wk: "Wicketkeeper", bat: "Batter", ar: "All-rounder", bowl: "Bowler" };

function countdown(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "Locked";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
}

export function FantasyContestPage() {
  const { id = "" } = useParams();
  const { user, refresh } = useAuth();
  const { push } = useToast();
  const [data, setData] = useState<FantasyDetail | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [captain, setCaptain] = useState("");
  const [vice, setVice] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | FantasyRole>("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const detail = await api.fantasyContest(id);
      setData(detail);
      const existing = detail.myEntries.find((entry) => entry.status === "confirmed");
      if (existing) {
        setSelected(existing.lineup);
        setCaptain(existing.captainId);
        setVice(existing.viceCaptainId);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this contest.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const playersById = useMemo(() => new Map((data?.players || []).map((player) => [player.id, player])), [data]);
  const selectedPlayers = useMemo(() => selected.map((playerId) => playersById.get(playerId)).filter(Boolean) as FantasyPlayer[], [selected, playersById]);
  const salary = selectedPlayers.reduce((sum, player) => sum + player.salary, 0);
  const roleCounts = useMemo(() => selectedPlayers.reduce((counts, player) => ({ ...counts, [player.role]: counts[player.role] + 1 }), { wk: 0, bat: 0, ar: 0, bowl: 0 } as Record<FantasyRole, number>), [selectedPlayers]);
  const teamCounts = selectedPlayers.reduce<Record<string, number>>((counts, player) => ({ ...counts, [player.team]: (counts[player.team] || 0) + 1 }), {});
  const rules = data?.rules;
  const myEntry = data?.myEntries.find((entry) => entry.status === "confirmed");
  const locked = !data ? true : data.contest.status !== "open" || new Date(data.contest.lockAt).getTime() <= Date.now();

  const validation = (() => {
    if (!rules) return { valid: false, message: "Loading contest rules." };
    if (selected.length !== rules.size) return { valid: false, message: `Select ${rules.size - selected.length} more player${rules.size - selected.length === 1 ? "" : "s"}.` };
    for (const [role, required] of Object.entries(rules.roles) as [FantasyRole, number][]) {
      if (roleCounts[role] !== required) return { valid: false, message: `${ROLE_NAME[role]}: need ${required}, selected ${roleCounts[role]}.` };
    }
    if (Object.values(teamCounts).some((count) => count > rules.maxFromOneTeam)) return { valid: false, message: `Maximum ${rules.maxFromOneTeam} players from one team.` };
    if (salary > (data?.contest.salaryCap || 100)) return { valid: false, message: "Your lineup is over the salary cap." };
    if (!captain || !vice || captain === vice) return { valid: false, message: "Choose a different captain and vice-captain." };
    return { valid: true, message: "Lineup ready." };
  })();

  const toggle = (player: FantasyPlayer) => {
    if (locked || myEntry) return;
    if (selected.includes(player.id)) {
      setSelected((current) => current.filter((playerId) => playerId !== player.id));
      if (captain === player.id) setCaptain("");
      if (vice === player.id) setVice("");
      return;
    }
    if (!rules || selected.length >= rules.size) return;
    if (roleCounts[player.role] >= rules.roles[player.role]) {
      push(`Your ${ROLE_LABEL[player.role]} quota is full. Remove one first.`, "info");
      return;
    }
    if ((teamCounts[player.team] || 0) >= rules.maxFromOneTeam) {
      push(`Maximum ${rules.maxFromOneTeam} players from ${player.team}.`, "info");
      return;
    }
    if (salary + player.salary > (data?.contest.salaryCap || 100)) {
      push("That player would put you over the salary cap.", "info");
      return;
    }
    setSelected((current) => [...current, player.id]);
  };

  const submit = async () => {
    if (!data || !validation.valid) return;
    setBusy(true);
    try {
      const result = await api.fantasyEnter(data.contest.id, { lineup: selected, captainId: captain, viceCaptainId: vice });
      push(result.message, "success", "Entry confirmed");
      await Promise.all([load(), refresh()]);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not enter the contest.", "error");
    } finally {
      setBusy(false);
    }
  };

  const filteredPlayers = (data?.players || []).filter((player) => (roleFilter === "all" || player.role === roleFilter) && (teamFilter === "all" || player.team === teamFilter));

  if (loading) return <div className="page-shell fantasy-detail-shell"><div className="panel fantasy-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-button" /></div></div>;
  if (error || !data) return <div className="page-shell fantasy-detail-shell"><ErrorState message={error || "Contest not found."} onRetry={load} /><Link to="/fantasy" className="text-btn"><ArrowLeft size={14} /> Back to fantasy</Link></div>;

  return (
    <div className="fantasy-page">
      <section className="page-hero compact-hero fantasy-detail-hero">
        <div className="page-shell page-hero-inner">
          <div>
            <Link to="/fantasy" className="text-btn"><ArrowLeft size={14} /> All fantasy contests</Link>
            <span className="eyebrow">{data.contest.league}</span>
            <h1>{data.contest.name}</h1>
            <p>{data.contest.homeTeam} <span className="muted">vs</span> {data.contest.awayTeam} · {dateTime(data.contest.startTime)}</p>
          </div>
          <div className="fantasy-hero-stats">
            <div><strong>{vc(data.contest.prizePool, { compact: true })}</strong><span>prize pool</span></div>
            <div><strong>{vc(data.contest.entryFee)}</strong><span>entry fee</span></div>
            <div><strong>{data.contest.entries}/{data.contest.maxEntries}</strong><span>entries</span></div>
          </div>
        </div>
      </section>

      <div className="page-shell fantasy-detail-shell">
        <div className="fantasy-detail-top">
          <Badge tone={data.contest.status === "open" ? "lime" : "outline"}>{data.contest.status.toUpperCase()}</Badge>
          <span className="fantasy-lock"><CalendarClock size={14} /> {countdown(data.contest.lockAt, now)}</span>
          {data.contest.rakePercent > 0 && <span className="muted-small">Guaranteed prize pool for this contest.</span>}
        </div>

        <div className="fantasy-detail-grid">
          <section className="panel fantasy-builder">
            <div className="panel-head"><span><Users size={15} /> Player pool</span><span className="panel-note">{filteredPlayers.length} players</span></div>
            <div className="fantasy-filters">
              {(["all", "wk", "bat", "ar", "bowl"] as const).map((role) => <button key={role} className={classNames("filter-chip", roleFilter === role && "active")} onClick={() => setRoleFilter(role)}>{role === "all" ? "All roles" : ROLE_LABEL[role]}</button>)}
              <select className="input select fantasy-team-select" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="Filter by team">
                <option value="all">Both teams</option>
                <option value={data.contest.homeTeam}>{data.contest.homeTeam}</option>
                <option value={data.contest.awayTeam}>{data.contest.awayTeam}</option>
              </select>
            </div>
            <div className="fantasy-player-list">
              {filteredPlayers.map((player) => {
                const active = selected.includes(player.id);
                return (
                  <button key={player.id} className={classNames("fantasy-player", active && "selected")} onClick={() => toggle(player)} disabled={locked || Boolean(myEntry)}>
                    <span className="fantasy-player-role">{ROLE_LABEL[player.role]}</span>
                    <span className="fantasy-player-copy"><strong>{player.name}</strong><small>{player.team} · {ROLE_NAME[player.role]}</small></span>
                    <span className="fantasy-player-salary">{player.salary.toFixed(1)}<small>credits</small></span>
                    <span className="fantasy-player-check">{active ? <Check size={15} /> : "+"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="fantasy-lineup">
            <section className="panel">
              <div className="panel-head"><span><Trophy size={15} /> Your XI</span><Badge tone={salary > data.contest.salaryCap ? "coral" : "lime"}>{salary.toFixed(1)}/{data.contest.salaryCap}</Badge></div>
              <div className="fantasy-salary-bar"><span style={{ width: `${Math.min(100, (salary / data.contest.salaryCap) * 100)}%` }} /></div>
              <div className="fantasy-role-grid">
                {(Object.keys(data.rules.roles) as FantasyRole[]).map((role) => <div key={role} className={roleCounts[role] === data.rules.roles[role] ? "complete" : ""}><span>{ROLE_LABEL[role]}</span><strong>{roleCounts[role]}/{data.rules.roles[role]}</strong></div>)}
              </div>
              {selectedPlayers.length === 0 ? <p className="fantasy-lineup-empty">Select players from the pool to build your lineup.</p> : (
                <div className="fantasy-selected-list">
                  {selectedPlayers.map((player) => (
                    <div className={classNames("fantasy-selected-player", captain === player.id && "captain", vice === player.id && "vice")} key={player.id}>
                      <span className="fantasy-player-role">{ROLE_LABEL[player.role]}</span>
                      <span><strong>{player.name}</strong><small>{player.team}</small></span>
                      <div className="fantasy-cvc">
                        <button className={classNames(captain === player.id && "active")} onClick={() => setCaptain(player.id)} disabled={Boolean(myEntry)} aria-label={`Make ${player.name} captain`}>C</button>
                        <button className={classNames(vice === player.id && "active")} onClick={() => setVice(player.id)} disabled={Boolean(myEntry)} aria-label={`Make ${player.name} vice-captain`}>VC</button>
                      </div>
                      <button className="fantasy-remove" onClick={() => toggle(player)} disabled={Boolean(myEntry)} aria-label={`Remove ${player.name}`}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="fantasy-entry-summary">
                <div><span>Entry fee</span><strong>{vc(data.contest.entryFee)}</strong></div>
                <div><span>Your balance</span><strong>{vc(user?.balance || 0)}</strong></div>
              </div>
              {myEntry ? (
                <div className="fantasy-entry-done"><ShieldCheck size={16} /><div><strong>Entry confirmed</strong><span>Your lineup is locked for this contest.</span></div></div>
              ) : !user ? (
                <Link to="/login" className="btn btn-primary full-btn">Sign in to enter <ArrowRight size={16} /></Link>
              ) : locked ? (
                <Button variant="secondary" className="full-btn" disabled>Entries closed</Button>
              ) : (
                <>
                  {!validation.valid && <p className="fantasy-validation">{validation.message}</p>}
                  <Button variant="lime" className="full-btn" loading={busy} disabled={!validation.valid} onClick={submit}>Enter contest · {vc(data.contest.entryFee)} <ArrowRight size={16} /></Button>
                  {Number(user.balance) < data.contest.entryFee && <Link to="/account/deposit" className="text-btn">Not enough coins? Add coins</Link>}
                </>
              )}
            </section>

            <section className="panel fantasy-prizes">
              <div className="panel-head"><span><Coins size={15} /> Prize breakdown</span></div>
              <table className="data-table">
                <thead><tr><th>Rank</th><th>Prize</th></tr></thead>
                <tbody>{data.tiers.map((tier) => <tr key={`${tier.rankFrom}-${tier.rankTo}`}><td>{tier.rankFrom === tier.rankTo ? `#${tier.rankFrom}` : `#${tier.rankFrom}–${tier.rankTo}`}</td><td>{vc(tier.amount)}</td></tr>)}</tbody>
              </table>
              <p className="fantasy-note">Prizes are per rank. Ties split the combined prize for the occupied ranks. Cancelled contests refund every entry.</p>
            </section>
          </aside>
        </div>

        {data.contest.status === "settled" && (
          <section className="panel fantasy-leaderboard">
            <div className="panel-head"><span><Trophy size={15} /> Final leaderboard</span><Badge tone="lime">Settled</Badge></div>
            <div className="data-table-wrap">
              <table className="data-table"><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Prize</th></tr></thead><tbody>
                {data.leaderboard.map((row) => <tr key={row.entryId}><td><strong>#{row.rank}</strong></td><td>{row.player}</td><td>{row.score.toFixed(2)}</td><td className={row.payout > 0 ? "amount positive" : "muted-cell"}>{row.payout ? vc(row.payout) : "—"}</td></tr>)}
              </tbody></table>
            </div>
          </section>
        )}

        {data.leaderboard.length === 0 && data.contest.status !== "settled" && !myEntry && (
          <section className="panel fantasy-leaderboard"><EmptyState icon={<Trophy size={22} />} title="No entries yet" body="Be the first lineup in this contest. Prize positions and tie rules are published above." /></section>
        )}
      </div>
    </div>
  );
}
