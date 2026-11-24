export function serializeGame(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    provider: row.provider,
    playable: row.playable,
    integrationStatus: row.integration_status,
    rtp: row.rtp == null ? null : Number(row.rtp),
    volatility: row.volatility,
    tagline: row.tagline,
    description: row.description,
    theme: row.theme,
    features: row.features,
    howTo: row.how_to,
    badge: row.badge,
    featured: row.featured,
    players: row.players,
    maxWin: row.max_win,
    sortOrder: row.sort_order,
    status: row.status,
    favoritedAt: row.favorited_at || undefined,
    lastPlayedAt: row.last_played_at || undefined
  };
}

export function serializeGames(rows) {
  return rows.map(serializeGame);
}
