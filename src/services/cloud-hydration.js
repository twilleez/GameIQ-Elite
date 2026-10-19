import { rebuildBox, LEDGER_VERSION } from './event-ledger.js';

function localIdFromClientRef(ref, kind) {
  const prefix = `${kind}:`;
  if (!ref || !String(ref).startsWith(prefix)) return String(ref || '');
  const value = String(ref).slice(prefix.length);
  return /^\d+$/.test(value) ? Number(value) : value;
}

const STAT_KEYS = ['p2m', 'p2a', 'p3m', 'p3a', 'ftm', 'fta', 'reb', 'ast', 'tov'];

// Rebuilds the summary fields the season history card shows, which are not
// stored as columns in the cloud, from the restored box scores.
function summarizeRestoredGame(game, cloudTeam) {
  const totals = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
  let mvp = null;
  for (const player of game.players || []) {
    const sum = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
    for (const stats of Object.values(player.q || {})) for (const key of STAT_KEYS) sum[key] += Number(stats?.[key] || 0);
    for (const key of STAT_KEYS) totals[key] += sum[key];
    const pts = sum.p2m * 2 + sum.p3m * 3 + sum.ftm;
    if (!mvp || pts > mvp.pts) mvp = { name: player.name, pts };
  }
  const fgm = totals.p2m + totals.p3m;
  const fga = totals.p2a + totals.p3a;
  return {
    home: cloudTeam?.name || 'HOME',
    teamFg: fga ? Math.round((fgm / fga) * 100) : 0,
    teamReb: totals.reb,
    teamAst: totals.ast,
    teamTov: totals.tov,
    mvp: mvp && mvp.pts > 0 ? mvp : null,
  };
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
    quarter: /^\d+$/.test(String(row.current_period || '')) ? Number(row.current_period) : (row.current_period || 1),
    teamPts: Number(row.team_score || 0),
    awayScore: Number(row.opponent_score || 0),
    players: Array.from(boxByGame.get(row.id)?.values() || []),
    shots: shotsByGame.get(row.id) || [],
    localUpdatedAt: row.local_updated_at || row.updated_at,
    cloudSyncedAt: row.updated_at || new Date().toISOString(),
    cloudId: row.id,
  }));
  // Ledger games: rebuild from the uploaded events and ignore box_line rows.
  const ledgerByGame = new Map();
  for (const row of cloudState?.events || []) {
    if (!row.event_type || row.event_type === 'box_line') continue;
    if (!ledgerByGame.has(row.game_id)) ledgerByGame.set(row.game_id, []);
    const { seq, synthetic, pid: localPid, ...payload } = row.payload || {};
    const pid = row.player_id ? (playerByCloudId.get(row.player_id) ?? localPid ?? null) : (localPid ?? null);
    ledgerByGame.get(row.game_id).push({
      ref: String(row.client_ref || '').replace(/^event:/, ''),
      gameKey: null,
      seq: Number(seq ?? 0),
      type: row.event_type,
      pid,
      period: /^\d+$/.test(String(row.period)) ? Number(row.period) : row.period,
      clock: row.clock_seconds ?? null,
      value: row.value ?? null,
      payload,
      at: row.occurred_at,
      synthetic: Boolean(synthetic),
    });
  }
  for (const game of games) {
    const events = ledgerByGame.get(game.cloudId);
    if (!events?.length) continue;
    events.forEach((event) => { event.gameKey = String(game.id); });
    events.sort((a, b) => (a.seq - b.seq) || a.ref.localeCompare(b.ref));
    const rebuilt = rebuildBox(events);
    const rosterById = new Map(players.map((player) => [String(player.id), player]));
    const pids = new Set([...Object.keys(rebuilt.box).filter((k) => k !== 'team'), ...game.players.map((p) => String(p.id))]);
    game.players = Array.from(pids).map((pid) => {
      const roster = rosterById.get(pid) || game.players.find((p) => String(p.id) === pid) || { id: /^\d+$/.test(pid) ? Number(pid) : pid, num: '', name: 'Player', pos: '' };
      const q = {};
      for (const [period, counters] of Object.entries(rebuilt.box[pid] || {})) {
        q[/^\d+$/.test(period) ? Number(period) : period] = { ...counters, onCourt: true, minsOn: 0, courtEnteredAt: null };
      }
      return { ...roster, onCourt: true, q };
    }).filter((player) => Object.keys(player.q).length);
    game.shots = rebuilt.shots;
    game.pmData = rebuilt.pm;
    game.events = events;
    game.ledgerKey = String(game.id);
    game.ledgerVersion = LEDGER_VERSION;
  }
  for (const game of games) Object.assign(game, summarizeRestoredGame(game, cloudTeam));
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
