import { useEffect, useMemo, useState } from "react";
import { BarChart3, Coins, Gamepad2, Layers3, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { useData } from "../state/DataContext";
import { Skeleton } from "../components/UI";
import { GameCard } from "../components/GameCard";
import { number } from "../lib/format";

type Stats = Awaited<ReturnType<typeof api.statistics>>;

export function StatisticsPage() {
  const { games } = useData();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.statistics().then(setStats).catch((err) => setError(err instanceof Error ? err.message : "Statistics are unavailable."));
  }, []);

  const topGames = useMemo(() => [...games].sort((a, b) => b.players - a.players).slice(0, 6), [games]);
  const totalCategories = stats?.categories.length || new Set(games.map((game) => game.category)).size;
  const totalGames = stats?.games.total || Math.max(1, games.length);

  return (
    <div className="page-shell statistics-page">
      <div className="page-hero compact-hero">
        <div className="page-hero-inner">
          <div><span className="eyebrow"><BarChart3 size={13} /> Statistics</span><h1>The board, counted.</h1><p>Catalogue size, settled rounds and the games drawing the most players right now.</p></div>
          <div className="hero-stat-panel"><span>Server-settled rounds</span><strong>{stats ? number(stats.rounds.settled) : "—"}</strong><small>recorded on the ledger</small></div>
        </div>
      </div>
      {error && <div className="panel statistics-error">{error}</div>}
      <div className="statistics-grid">
        <div className="panel statistic-card"><Gamepad2 size={18} /><span>Games</span><strong>{stats ? number(stats.games.total) : "—"}</strong><small>{stats ? `${stats.games.playable} playable` : "loading"}</small></div>
        <div className="panel statistic-card"><Layers3 size={18} /><span>Categories</span><strong>{totalCategories}</strong><small>19X Originals</small></div>
        <div className="panel statistic-card"><Trophy size={18} /><span>Sports</span><strong>{stats ? stats.sports : "—"}</strong><small>{stats ? `${stats.fixtures.finished}/${stats.fixtures.total} fixtures settled` : "loading"}</small></div>
        <div className="panel statistic-card"><Coins size={18} /><span>Coins wagered</span><strong>{stats ? number(stats.rounds.wagered) : "—"}</strong><small>across settled rounds</small></div>
      </div>
      <div className="statistics-lower">
        <section className="panel statistics-breakdown">
          <div className="panel-head"><span><BarChart3 size={15} /> Catalogue by category</span></div>
          {(stats?.categories || []).map((item) => (
            <div className="stat-bar-row" key={item.category}><span>{item.category.replace(/-/g, " ")}</span><div><i style={{ width: `${Math.max(4, (item.count / Math.max(1, totalGames)) * 100)}%` }} /></div><strong>{item.count}</strong></div>
          ))}
          {!stats && <Skeleton className="sk-line" />}
        </section>
        <section className="panel statistics-note">
          <div className="panel-head"><span><Trophy size={15} /> Player activity</span></div>
          <p>Player counts are seeded demo activity. Settled rounds, wagers and prizes are read from the server ledger. Coins have no cash value.</p>
          <div className="stat-mini-list"><div><span>Settled rounds</span><strong>{stats ? number(stats.rounds.settled) : "—"}</strong></div><div><span>Coins returned</span><strong>{stats ? number(stats.rounds.paid) : "—"}</strong></div><div><span>Playable titles</span><strong>{stats ? stats.games.playable : "—"}</strong></div></div>
        </section>
      </div>
      <div className="lobby-head"><div><span className="eyebrow">Most in lobby</span><h2>Popular originals</h2></div></div>
      <div className="game-grid lobby-grid">{topGames.map((game) => <GameCard key={game.id} game={game} size="md" />)}</div>
    </div>
  );
}
