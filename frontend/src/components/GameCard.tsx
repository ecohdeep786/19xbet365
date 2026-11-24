import { Heart, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { Game } from "../types";
import { GameArt } from "./GameArt";
import { ProviderMark } from "./ProviderMark";
import { Badge } from "./UI";
import { classNames, gameCategoryLabel, number } from "../lib/format";
import { useData } from "../state/DataContext";

export function GameCard({ game, size = "md", showFavorite = true }: { game: Game; size?: "sm" | "md" | "lg" | "wide"; showFavorite?: boolean }) {
  const { favorites, toggleFavorite } = useData();
  const isFavorite = favorites.has(game.id);
  const target = `/game/${game.id}`;
  return (
    <article className={classNames("game-card", `game-card-${size}`)}>
      <Link to={target} className="game-card-link">
        <GameArt game={game} />
        <div className="game-card-overlay">
          <div className="game-card-topline">
            {game.playable ? <Badge tone="lime">PLAY NOW</Badge> : <Badge tone="outline">PROVIDER</Badge>}
            {game.badge && <span className="game-badge">{game.badge}</span>}
          </div>
          <div className="game-card-info">
            <span className="game-provider"><ProviderMark name={game.provider} size={14} /> {game.provider}</span>
            <h3>{game.name}</h3>
            <div className="game-meta">
              <span>{gameCategoryLabel(game.category)}</span>
              <span className="dot-sep" />
              <span>{game.players ? `${number(game.players)} playing` : game.volatility}</span>
            </div>
          </div>
          <span className="game-play"><Play size={16} fill="currentColor" /></span>
          <span className="sr-only">Open game</span>
        </div>
      </Link>
      {showFavorite && (
        <button
          className={classNames("favorite-btn", isFavorite && "is-favorite")}
          onClick={(event) => { event.preventDefault(); toggleFavorite(game.id); }}
          aria-label={isFavorite ? `Remove ${game.name} from favourites` : `Add ${game.name} to favourites`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      )}
      {game.integrationStatus === "provider_required" && <span className="provider-flag"><Sparkles size={11} /> Integration-ready</span>}
    </article>
  );
}

export function GameRail({ games }: { games: Game[] }) {
  return (
    <div className="game-rail">
      {games.map((game) => <GameCard key={game.id} game={game} size="sm" />)}
    </div>
  );
}
