import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Coins, Plus, RefreshCcw, Save, ShieldAlert, Trophy, Users } from "lucide-react";
import { api } from "../../lib/api";
import type { AdminFantasyContest, AdminFantasyDetail } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, Stat, Textarea } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { dateTime, number, vc } from "../../lib/format";

const DEFAULT_TIERS = JSON.stringify([
  { rankFrom: 1, rankTo: 1, amount: 4000 },
  { rankFrom: 2, rankTo: 2, amount: 2000 },
  { rankFrom: 3, rankTo: 3, amount: 1200 },
  { rankFrom: 4, rankTo: 10, amount: 200 },
  { rankFrom: 11, rankTo: 20, amount: 40 }
], null, 2);

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

type EligibleMatch = { id: string; sport: string; league: string; homeTeam: string; awayTeam: string; startTime: string; status: string };

export function AdminFantasyPage() {
  const { push } = useToast();
  const [contests, setContests] = useState<AdminFantasyContest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminFantasyDetail | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<EligibleMatch[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "19X T20 Showdown",
    matchId: "",
    entryFee: 100,
    salaryCap: 100,
    maxEntries: 100,
    maxEntriesPerUser: 1,
    prizePool: 9000,
    lockAt: "",
    startsAt: "",
    tiers: DEFAULT_TIERS
  });

  const load = async () => {
    setLoading(true);
    try {
      const [contestData, matchData] = await Promise.all([api.adminFantasyContests(), api.adminFantasyMatches()]);
      setContests(contestData.contests);
      setMatches(matchData.matches);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load fantasy contests.");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await api.adminFantasyContest(id);
      setDetail(data);
      setScores(Object.fromEntries(data.players.map((player) => [player.id, String(data.scores[player.id] ?? 0)])));
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not load contest detail.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (contests.length && !selectedId) loadDetail(contests[0].id); }, [contests]);

  const selectedMatch = matches.find((match) => match.id === form.matchId);
  const stats = useMemo(() => ({
    open: contests.filter((contest) => contest.status === "open").length,
    entries: contests.reduce((sum, contest) => sum + contest.entries, 0),
    prizes: contests.reduce((sum, contest) => sum + contest.prizePool, 0)
  }), [contests]);

  const chooseMatch = (matchId: string) => {
    const match = matches.find((item) => item.id === matchId);
    const start = match ? new Date(match.startTime) : new Date(Date.now() + 3600000);
    const lock = new Date(start.getTime() - 5 * 60000);
    setForm((current) => ({ ...current, matchId, lockAt: toLocalInput(lock.toISOString()), startsAt: toLocalInput(start.toISOString()) }));
  };

  const create = async () => {
    setBusy(true);
    try {
      let tiers;
      try { tiers = JSON.parse(form.tiers); } catch { throw new Error("Prize tiers must be valid JSON."); }
      const data = await api.adminCreateFantasyContest({
        name: form.name,
        matchId: form.matchId,
        entryFee: Number(form.entryFee),
        salaryCap: Number(form.salaryCap),
        maxEntries: Number(form.maxEntries),
        maxEntriesPerUser: Number(form.maxEntriesPerUser),
        prizePool: Number(form.prizePool),
        lockAt: new Date(form.lockAt).toISOString(),
        startsAt: new Date(form.startsAt).toISOString(),
        tiers
      });
      push(data.message, "success", "Contest created");
      setCreateOpen(false);
      await load();
      await loadDetail(data.contest.id);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not create the contest.", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveScores = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const payload = Object.entries(scores).map(([playerId, value]) => ({ playerId, points: Number(value) || 0 }));
      const data = await api.adminFantasyScores(detail.contest.id, payload);
      push(data.message, "success", "Scores saved");
      await loadDetail(detail.contest.id);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not save scores.", "error");
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const data = await api.adminFantasySettle(detail.contest.id);
      push(`${data.message} ${vc(data.totalPaid)} paid across ${data.entries} entries.`, "success", "Contest settled");
      await loadDetail(detail.contest.id);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not settle the contest.", "error");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const data = await api.adminFantasyCancel(detail.contest.id);
      push(data.message, "success", "Contest cancelled");
      await loadDetail(detail.contest.id);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not cancel the contest.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <AdminHeader
        kicker="Fantasy operations"
        title="Fantasy contests"
        body="Create, score, settle and refund salary-cap contests. Entry fees and prizes move through the coin ledger; every action is audited."
        actions={<><AdminScopePill /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button><Button variant="lime" size="sm" icon={<Plus size={15} />} onClick={() => { chooseMatch(matches[0]?.id || ""); setCreateOpen(true); }}>Create contest</Button></>}
      />
      <div className="admin-stat-grid">
        <Stat label="Contests" value={number(contests.length)} hint={`${stats.open} open`} tone="cyan" icon={<Trophy size={16} />} />
        <Stat label="Entries" value={number(stats.entries)} hint="Confirmed lineups" tone="lime" icon={<Users size={16} />} />
        <Stat label="Prize pools" value={vc(stats.prizes, { compact: true })} hint="Configured across contests" tone="amber" icon={<Coins size={16} />} />
        <Stat label="Settlement model" value="Server" hint="Prizes and scores are immutable after settlement" tone="default" icon={<ShieldAlert size={16} />} />
      </div>

      {loading ? <div className="admin-stat-grid">{Array.from({ length: 4 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div>)}</div> : error ? <ErrorState message={error} onRetry={load} /> : !contests.length ? <EmptyState title="No fantasy contests yet" body="Create the first cricket contest." /> : (
        <div className="admin-fantasy-layout">
          <section className="panel">
            <div className="panel-head"><span><Trophy size={15} /> Contests</span><span className="panel-note">{contests.length}</span></div>
            <div className="admin-fantasy-list">
              {contests.map((contest) => (
                <button className={`admin-fantasy-row ${selectedId === contest.id ? "active" : ""}`} key={contest.id} onClick={() => loadDetail(contest.id)}>
                  <div><strong>{contest.name}</strong><span>{contest.homeTeam} vs {contest.awayTeam}</span></div>
                  <div className="admin-fantasy-row-meta"><Badge tone={contest.status === "open" ? "lime" : "outline"}>{contest.status}</Badge><span>{contest.entries} entries</span><span>{vc(contest.entryFee)}</span></div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel admin-fantasy-manage">
            {detailLoading || !detail ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : (
              <>
                <div className="panel-head"><span><Trophy size={15} /> {detail.contest.name}</span><Badge tone={detail.contest.status === "settled" ? "cyan" : "outline"}>{detail.contest.status}</Badge></div>
                <div className="admin-fantasy-summary">
                  <div><span>Match</span><strong>{detail.contest.homeTeam} vs {detail.contest.awayTeam}</strong></div>
                  <div><span>Lock / start</span><strong>{dateTime(detail.contest.lockAt)} · {dateTime(detail.contest.startTime)}</strong></div>
                  <div><span>Entries / collected</span><strong>{detail.contest.entries} · {vc(detail.contest.collected)}</strong></div>
                  <div><span>Prize pool</span><strong>{vc(detail.contest.prizePool)}</strong></div>
                </div>
                {detail.contest.status !== "settled" && detail.contest.status !== "cancelled" ? (
                  <>
                    <div className="admin-fantasy-scores">
                      <div className="panel-head"><span>Player scores</span><span className="panel-note">Points are server-recorded at settlement</span></div>
                      <div className="admin-score-grid">
                        {detail.players.map((player) => (
                          <label key={player.id} className="admin-score-row"><span><strong>{player.name}</strong><small>{player.team} · {player.role.toUpperCase()} · {player.salary.toFixed(1)}</small></span><Input type="number" min={0} step={1} value={scores[player.id] ?? "0"} onChange={(event) => setScores((current) => ({ ...current, [player.id]: event.target.value }))} /></label>
                        ))}
                      </div>
                      <Button variant="secondary" size="sm" loading={busy} onClick={saveScores} icon={<Save size={14} />}>Save scores</Button>
                    </div>
                    <div className="admin-fantasy-actions">
                      <Button variant="lime" loading={busy} disabled={busy || detail.contest.entries === 0} onClick={settle}>Settle contest</Button>
                      <Button variant="danger" loading={busy} onClick={cancel}>Cancel &amp; refund</Button>
                    </div>
                  </>
                ) : <div className="admin-callout"><ShieldAlert size={17} /><div><strong>{detail.contest.status === "settled" ? "Contest settled." : "Contest cancelled."}</strong><span>Settled scores and payouts are immutable. Cancelled entries were refunded to the original wallets.</span></div></div>}
                <div className="admin-fantasy-entries">
                  <div className="panel-head"><span>Entries</span><span className="panel-note">{detail.entries.length}</span></div>
                  {!detail.entries.length ? <EmptyState title="No entries" body="Players will appear here after they enter." /> : (
                    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Player</th><th>Fee</th><th>Status</th><th>Score</th><th>Rank</th><th>Payout</th></tr></thead><tbody>
                      {detail.entries.map((entry) => <tr key={entry.id}><td><strong>{entry.player}</strong><span className="row-sub">{entry.email}</span></td><td>{vc(entry.entryFee)}</td><td><Badge tone="outline">{entry.status}</Badge></td><td>{entry.score || "—"}</td><td>{entry.rank || "—"}</td><td className={entry.payout ? "amount positive" : "muted-cell"}>{entry.payout ? vc(entry.payout) : "—"}</td></tr>)}
                    </tbody></table></div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create fantasy contest" footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="lime" loading={busy} onClick={create}>Create contest</Button></>}>
        <div className="invite-form">
          <Field label="Contest name" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Match" required><Select value={form.matchId} onChange={(event) => chooseMatch(event.target.value)}>{matches.map((match) => <option key={match.id} value={match.id}>{match.homeTeam} vs {match.awayTeam} · {dateTime(match.startTime)}</option>)}</Select></Field>
          <div className="form-grid">
            <Field label="Entry fee" required><Input type="number" min={1} value={form.entryFee} onChange={(event) => setForm({ ...form, entryFee: Number(event.target.value) })} /></Field>
            <Field label="Salary cap" required><Input type="number" min={1} value={form.salaryCap} onChange={(event) => setForm({ ...form, salaryCap: Number(event.target.value) })} /></Field>
            <Field label="Max entries" required><Input type="number" min={1} value={form.maxEntries} onChange={(event) => setForm({ ...form, maxEntries: Number(event.target.value) })} /></Field>
            <Field label="Max per player" required><Input type="number" min={1} value={form.maxEntriesPerUser} onChange={(event) => setForm({ ...form, maxEntriesPerUser: Number(event.target.value) })} /></Field>
            <Field label="Prize pool" required><Input type="number" min={0} value={form.prizePool} onChange={(event) => setForm({ ...form, prizePool: Number(event.target.value) })} /></Field>
            <Field label="Lock time" required><Input type="datetime-local" value={form.lockAt} onChange={(event) => setForm({ ...form, lockAt: event.target.value })} /></Field>
            <Field label="Start time" required><Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
          </div>
          <Field label="Prize tiers (JSON, amount per rank)" required><Textarea rows={8} value={form.tiers} onChange={(event) => setForm({ ...form, tiers: event.target.value })} /></Field>
          <p className="form-note">The tier total cannot exceed the prize pool. Player rosters come from the selected fixture teams.</p>
        </div>
      </Modal>
    </div>
  );
}
