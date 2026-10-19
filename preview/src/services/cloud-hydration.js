function localIdFromClientRef(ref, kind) {
  const prefix = `${kind}:`;
  if (!ref || !String(ref).startsWith(prefix)) return String(ref || '');
  const value = String(ref).slice(prefix.length);
  return /^\d+$/.test(value) ? Number(value) : value;
}

export function cloudStateToLocal(cloudState, cloudTeam, fallbackTeamId = 'td') {
  const players = (cloudState?.players || []).map((row) => ({
    id: localIdFromClientRef(row.client_ref, 'player'),
    num: row.jersey_number ?? '',
    name: row.display_name || 'Player',
    pos: row.position || '',
    active: row.active !== false,
  }));
  const playerByCloudId = new Map((cloudState?.players || []).map((row) => [row.id, localIdFromClientRef(row.client_ref, 'player')]));
  const shotsByGame = new Map();
  for (const shot of cloudState?.shots || []) {
    if (!shotsByGame.has(shot.game_id)) shotsByGame.set(shot.game_id, []);
    shotsByGame.get(shot.game_id).push({
      id: localIdFromClientRef(shot.client_ref, 'shot'),
      pid: shot.player_id ? (playerByCloudId.get(shot.player_id) ?? null) : null,
      type: shot.made ? 'made' : 'miss',
      det: Number(shot.points) === 3 ? '3pt' : '2pt',
      made: Boolean(shot.made),
      x: shot.x,
      y: shot.y,
      q: shot.period,
      clockSeconds: shot.clock_seconds,
      points: Number(shot.points) === 3 ? 3 : 2,
    });
  }
  const rosterByLocalId = new Map(players.map((player) => [String(player.id), player]));
  const boxByGame = new Map();
  for (const event of cloudState?.events || []) {
    if (event.event_type !== 'box_line') continue;
    const pid = event.player_id ? playerByCloudId.get(event.player_id) : null;
    if (pid == null) continue;
    if (!boxByGame.has(event.game_id)) boxByGame.set(event.game_id, new Map());
    const gamePlayers = boxByGame.get(event.game_id);
    if (!gamePlayers.has(String(pid))) {
      const roster = rosterByLocalId.get(String(pid)) || { id: pid, num: '', name: 'Player', pos: '' };
      gamePlayers.set(String(pid), { ...roster, onCourt: true, q: {} });
    }
    const period = /^\d+$/.test(String(event.period)) ? Number(event.period) : String(event.period);
    const stats = { onCourt: true, minsOn: 0, courtEnteredAt: null };
    for (const [key, value] of Object.entries(event.payload || {})) stats[key] = Number(value || 0);
    gamePlayers.get(String(pid)).q[period] = stats;
  }
  const games = (cloudState?.games || []).map((row) => ({
    id: localIdFromClientRef(row.client_ref, 'game'),
    teamId: fallbackTeamId,
    teamName: cloudTeam?.name || 'My Team',
    away: row.opponent_name || 'Opponent',
    date: row.game_date || '',
    quarter: Number(row.current_period) || 1,
    teamPts: Number(row.team_score || 0),
    awayScore: Number(row.opponent_score || 0),
    players: Array.from(boxByGame.get(row.id)?.values() || []),
    shots: shotsByGame.get(row.id) || [],
    localUpdatedAt: row.local_updated_at || row.updated_at,
    cloudSyncedAt: row.updated_at || new Date().toISOString(),
    cloudId: row.id,
  }));
  return {
    team: { id: fallbackTeamId, name: cloudTeam?.name || 'My Team', players },
    games,
    syncedAt: cloudState?.syncedAt || new Date().toISOString(),
  };
}

export function mergeCloudGames(localGames = [], cloudGames = []) {
  const merged = new Map(localGames.map((game) => [String(game.id), game]));
  for (const cloudGame of cloudGames) {
    const key = String(cloudGame.id);
    const local = merged.get(key);
    if (!local || new Date(cloudGame.localUpdatedAt || 0) > new Date(local.localUpdatedAt || 0)) merged.set(key, cloudGame);
  }
  return Array.from(merged.values()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
