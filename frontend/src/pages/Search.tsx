import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Gamepad2, Search as SearchIcon, Trophy } from "lucide-react";
import { useData } from "../state/DataContext";
import { GameCard } from "../components/GameCard";
import { MatchRow } from "../components/MatchRow";
import { EmptyState, Input, Skeleton } from "../components/UI";

export function SearchPage() {
  const { games, matches, bootstrap, loading } = useData();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const active = (params.get("q") || "").trim().toLowerCase();

  const results = useMemo(() => {
    if (!active) return { games: [], matches: [], help: [] };
    const gameResults = games.filter((game) =>
      [game.name, game.provider, game.category, game.tagline, game.description].some((value) => value.toLowerCase().includes(active))
    );
    const matchResults = matches.filter((match) =>
      [match.homeTeam, match.awayTeam, match.league, match.sport, match.id].some((value) => value.toLowerCase().includes(active))
    );
    const helpResults = (bootstrap?.helpArticles || []).filter((article) =>
      [article.title, article.category, article.body].some((value) => value.toLowerCase().includes(active))
    );
    return { games: gameResults, matches: matchResults, help: helpResults };
  }, [active, games, matches, bootstrap]);

  const total = results.games.length + results.matches.length + results.help.length;

  return (
    <div className="search-page">
      <div className="page-hero compact-hero">
        <div className="page-shell">
          <span className="eyebrow">Search 19X</span>
          <h1>Find your next board.</h1>
          <form className="search-page-form" onSubmit={(event) => { event.preventDefault(); setParams({ q: query }); }}>
            <SearchIcon size={20} />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Games, providers, teams, leagues, help articles…" autoFocus aria-label="Search 19X" />
            <button className="btn btn-lime" type="submit">Search</button>
          </form>
          <div className="search-suggestions">
            {["Crash Orbit", "Mines Vault", "Premier Division", "19X Originals", "responsible gaming"].map((suggestion) => (
              <button key={suggestion} onClick={() => { setQuery(suggestion); setParams({ q: suggestion }); }}>{suggestion}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="page-shell">
        {loading ? <Skeleton className="sk-match-block" /> : !active ? (
          <EmptyState icon={<SearchIcon size={22} />} title="Start typing to search" body="Search the full game catalogue, demo fixtures, and help centre. Try a game name, a team, or a provider." />
        ) : total === 0 ? (
          <EmptyState icon={<SearchIcon size={22} />} title={`No results for “${params.get("q")}”`} body="Check the spelling or try a broader term. You can also browse the casino lobby and sportsbook directly." action={<Link to="/casino" className="btn btn-secondary btn-sm">Open casino <ArrowRight size={15} /></Link>} />
        ) : (
          <div className="search-results">
            <div className="search-summary"><strong>{total}</strong> result{total === 1 ? "" : "s"} for “{params.get("q")}”</div>
            {results.games.length > 0 && (
              <section>
                <div className="rail-head"><span><Gamepad2 size={16} /> Games</span><em>{results.games.length}</em></div>
                <div className="game-grid lobby-grid">{results.games.map((game) => <GameCard key={game.id} game={game} />)}</div>
              </section>
            )}
            {results.matches.length > 0 && (
              <section>
                <div className="rail-head"><span><Trophy size={16} /> Fixtures</span><em>{results.matches.length}</em></div>
                <div className="panel league-block">{results.matches.slice(0, 20).map((match) => <MatchRow key={match.id} match={match} showLeague />)}</div>
              </section>
            )}
            {results.help.length > 0 && (
              <section>
                <div className="rail-head"><span><BookOpen size={16} /> Help centre</span><em>{results.help.length}</em></div>
                <div className="help-result-list">
                  {results.help.map((article) => (
                    <Link to={`/help/${article.slug}`} key={article.slug} className="help-result">
                      <span>{article.category}</span><strong>{article.title}</strong><p>{article.body.slice(0, 150)}…</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
