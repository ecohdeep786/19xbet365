import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Gamepad2, RefreshCcw, Save, Search, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import type { Game } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Input, Skeleton, Stat } from "../../components/UI";
import { GameArt } from "../../components/GameArt";
import { AdminHeader } from "./AdminLayout";
import { classNames, gameCategoryLabel, number, vc } from "../../lib/format";

interface Draft { status?: string; featured?: boolean; badge?: string }

export function AdminGamesPage() {
  const { push } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const data = await api.adminGames(); setGames(data.games); setDrafts({}); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load the catalogue."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => games.filter((game) => {
    if (filter === "playable" && !game.playable) return false;
    if (filter === "provider" && game.playable) return false;
    if (filter === "hidden" && game.status !== "hidden") return false;
    if (filter === "featured" && !game.featured) return false;
    if (query.trim() && ![game.name, game.provider, game.category].some((value) => value.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [games, filter, query]);

  const updateDraft = (id: string, patch: Draft) => {
    const base = games.find((game) => game.id === id);
    if (!base) return;
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const currentValue = (game: Game, key: keyof Draft) => drafts[game.id]?.[key] ?? game[key as keyof Game];

  const save = async (game: Game) => {
    const draft = drafts[game.id];
    if (!draft) return;
    setBusyId(game.id);
    try {
      const data = await api.adminUpdateGame(game.id, { ...draft });
      push(data.message, "success", "Catalogue updated");
      setGames((current) => current.map((item) => item.id === game.id ? { ...item, ...draft } : item));
      setDrafts((current) => { const next = { ...current }; delete next[game.id]; return next; });
    } catch (err) { push(err instanceof Error ? err.message : "Could not update the game.", "error"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="admin-page">
      <AdminHeader kicker="Operations" title="Game catalogue" body="Publish, hide, feature, or update the copy for catalogue entries. Outcomes, RTP, and settled results are not editable here." actions={<Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button>} />
      <div className="admin-stat-grid compact-stats">
        <Stat label="Catalogue titles" value={number(games.length)} hint={`${games.filter((game) => game.playable).length} playable originals`} tone="cyan" icon={<Gamepad2 size={16} />} />
        <Stat label="Provider required" value={number(games.filter((game) => !game.playable).length)} hint="Integration-ready pages" tone="coral" icon={<ShieldCheck size={16} />} />
        <Stat label="Featured" value={number(games.filter((game) => game.featured).length)} hint="Highlighted in the lobby" tone="lime" icon={<Sparkles size={16} />} />
        <Stat label="Total rounds" value={number(games.reduce((sum, game) => sum + Number(game.round_count || 0), 0))} hint={`${vc(games.reduce((sum, game) => sum + Number(game.total_wagered || 0), 0), { compact: true })} wagered`} icon={<Check size={16} />} />
      </div>
      <div className="admin-toolbar panel">
        <div className="admin-search"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search game, provider or category" aria-label="Search games" /></div>
        <div className="admin-filters">
          <select className="input select" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter catalogue">
            <option value="all">All titles</option><option value="playable">Playable only</option><option value="provider">Provider required</option><option value="featured">Featured</option><option value="hidden">Hidden</option>
          </select>
        </div>
      </div>
      <div className="panel admin-table-panel">
        <div className="panel-head"><span><Gamepad2 size={15} /> Catalogue entries</span><span className="panel-note">{filtered.length} showing</span></div>
        {loading ? <div className="table-loading">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="sk-line" />)}</div> : error ? <ErrorState message={error} onRetry={load} /> : !filtered.length ? <EmptyState title="No catalogue entries match" body="Clear the search or filter." /> : (
          <div className="admin-game-list">
            {filtered.map((game) => {
              const changed = !!drafts[game.id];
              return (
                <div className={classNames("admin-game-row", game.status === "hidden" && "is-hidden")} key={game.id}>
                  <div className="admin-game-art"><GameArt game={game} /></div>
                  <div className="admin-game-copy"><strong>{game.name}</strong><span>{game.provider} · {gameCategoryLabel(game.category)}</span><div><Badge tone={game.playable ? "lime" : "outline"}>{game.playable ? "PLAYABLE" : "PROVIDER"}</Badge>{game.badge && <em>{game.badge}</em>}</div></div>
                  <div className="admin-game-stats"><span>Rounds <strong>{number(game.round_count || 0)}</strong></span><span>Wagered <strong>{vc(game.total_wagered || 0, { compact: true })}</strong></span></div>
                  <label className="admin-toggle"><input type="checkbox" checked={!!currentValue(game, "featured")} onChange={(event) => updateDraft(game.id, { featured: event.target.checked })} /><span /> Featured</label>
                  <select className="input select compact" value={String(currentValue(game, "status") || "published")} onChange={(event) => updateDraft(game.id, { status: event.target.value })} aria-label={`Status for ${game.name}`}>
                    <option value="published">Published</option><option value="hidden">Hidden</option><option value="maintenance">Maintenance</option>
                  </select>
                  <div className="admin-game-actions">
                    <Button variant={changed ? "lime" : "ghost"} size="sm" disabled={!changed} loading={busyId === game.id} icon={<Save size={14} />} onClick={() => save(game)}>Save</Button>
                    <Link to={`/game/${game.id}`} className="icon-btn" aria-label={`View ${game.name}`}><ArrowRight size={15} /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="admin-fineprint"><ShieldCheck size={15} /> RTP, outcomes, payout data, and settled rounds are immutable. Catalogue edits are audit-logged with before/after state.</div>
    </div>
  );
}
