const DEFAULT_WORKSPACE_NAME = 'My Program';

export function clientRef(kind, localId) {
  if (!kind) throw new Error('kind is required');
  if (localId === undefined || localId === null || localId === '') throw new Error('localId is required');
  return `${kind}:${String(localId)}`;
}

export function retryDelayMs(attempt, baseMs = 750, maxMs = 6000) {
  const safeAttempt = Math.max(0, Number(attempt) || 0);
  return Math.min(maxMs, baseMs * (2 ** safeAttempt));
}

export async function withRetry(operation, options = {}) {
  if (typeof operation !== 'function') throw new Error('operation is required');
  const attempts = Math.max(1, Number(options.attempts || 3));
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1) break;
      await sleep(retryDelayMs(attempt, options.baseMs, options.maxMs));
    }
  }
  throw lastError || new Error('Retry operation failed');
}

function requireClient(supabase) {
  if (!supabase?.from) throw new Error('A Supabase client is required');
}

function requireUser(user) {
  if (!user?.id) throw new Error('An authenticated user is required');
}

async function unwrap(result, label) {
  if (result?.error) throw new Error(`${label}: ${result.error.message || result.error}`);
  return result?.data;
}

export async function resolveWorkspace(supabase, user) {
  requireClient(supabase);
  requireUser(user);

  const owned = await unwrap(
    await supabase.from('organizations').select('*').eq('owner_profile_id', user.id).eq('client_ref', clientRef('owner', user.id)).maybeSingle(),
    'Load owned workspace',
  );
  if (owned) return owned;

  const memberships = await unwrap(
    await supabase.from('organization_members').select('organization_id,role').eq('profile_id', user.id).limit(1),
    'Load program membership',
  );
  const membership = memberships?.[0];
  if (!membership?.organization_id) return null;

  return unwrap(
    await supabase.from('organizations').select('*').eq('id', membership.organization_id).single(),
    'Load shared workspace',
  );
}

export async function ensureWorkspace(supabase, user, name = DEFAULT_WORKSPACE_NAME) {
  requireClient(supabase);
  requireUser(user);

  const existing = await resolveWorkspace(supabase, user);
  if (existing) return existing;

  const ref = clientRef('owner', user.id);
  const created = await unwrap(
    await supabase.from('organizations').insert({ owner_profile_id: user.id, name, client_ref: ref }).select('*').single(),
    'Create workspace',
  );

  await unwrap(
    await supabase.from('organization_members').upsert({ organization_id: created.id, profile_id: user.id, role: 'owner' }, { onConflict: 'organization_id,profile_id' }),
    'Create owner membership',
  );
  return created;
}

export async function syncTeam(supabase, user, organizationId, localTeam) {
  requireClient(supabase);
  requireUser(user);
  if (!organizationId) throw new Error('organizationId is required');
  if (!localTeam?.id) throw new Error('localTeam.id is required');

  const teamRow = {
    organization_id: organizationId,
    created_by: user.id,
    name: localTeam.name || 'My Team',
    season_name: localTeam.seasonName || null,
    client_ref: clientRef('team', localTeam.id),
    archived: Boolean(localTeam.archived),
  };

  const cloudTeam = await unwrap(
    await supabase.from('teams').upsert(teamRow, { onConflict: 'organization_id,client_ref' }).select('*').single(),
    'Sync team',
  );

  const playerRows = (localTeam.players || []).map((player) => ({
    team_id: cloudTeam.id,
    created_by: user.id,
    client_ref: clientRef('player', player.id),
    jersey_number: player.num == null ? null : String(player.num),
    display_name: player.name || `Player ${player.num || ''}`.trim(),
    position: player.pos || null,
    active: player.active !== false,
  }));

  let players = [];
  if (playerRows.length) {
    players = await unwrap(
      await supabase.from('players').upsert(playerRows, { onConflict: 'team_id,client_ref' }).select('*'),
      'Sync players',
    );
  }

  const playerMap = new Map(players.map((row) => [row.client_ref, row.id]));
  return { team: cloudTeam, players, playerMap };
}

export async function syncGameBundle(supabase, user, cloudTeamId, bundle) {
  requireClient(supabase);
  requireUser(user);
  if (!cloudTeamId) throw new Error('cloudTeamId is required');
  if (!bundle?.id) throw new Error('bundle.id is required');

  // Never let an older copy of a game (e.g. from a second device) overwrite or
  // prune a newer save that is already in the cloud.
  const cloudCopy = await unwrap(
    await supabase.from('games').select('*').eq('team_id', cloudTeamId).eq('client_ref', clientRef('game', bundle.id)).maybeSingle(),
    'Check cloud game',
  );
  if (cloudCopy && bundle.localUpdatedAt && cloudCopy.local_updated_at
    && new Date(cloudCopy.local_updated_at).getTime() > new Date(bundle.localUpdatedAt).getTime()) {
    return { ...cloudCopy, skippedAsOlder: true };
  }

  const game = await unwrap(
    await supabase.from('games').upsert({
      team_id: cloudTeamId,
      created_by: user.id,
      client_ref: clientRef('game', bundle.id),
      opponent_name: bundle.opponentName || bundle.awayName || 'Opponent',
      venue: bundle.venue || null,
      game_date: bundle.gameDate || bundle.date || null,
      started_at: bundle.startedAt || null,
      ended_at: bundle.endedAt || null,
      status: bundle.status || 'final',
      current_period: String(bundle.currentPeriod || bundle.quarter || '1'),
      period_seconds: Number(bundle.periodSeconds || 600),
      team_score: Number(bundle.teamScore || bundle.score || 0),
      opponent_score: Number(bundle.opponentScore || bundle.awayScore || 0),
      local_updated_at: bundle.localUpdatedAt || new Date().toISOString(),
    }, { onConflict: 'team_id,client_ref' }).select('*').single(),
    'Sync game',
  );

  if (bundle.events?.length) {
    const rows = bundle.events.map((event, index) => ({
      game_id: game.id,
      team_id: cloudTeamId,
      player_id: event.playerId || null,
      created_by: user.id,
      client_ref: clientRef('event', event.id ?? `${bundle.id}-${index}`),
      event_type: event.type || 'stat',
      period: String(event.period || '1'),
      clock_seconds: event.clockSeconds ?? null,
      value: event.value ?? null,
      payload: event.payload || {},
      occurred_at: event.occurredAt || new Date().toISOString(),
      local_updated_at: event.localUpdatedAt || new Date().toISOString(),
    }));
    await unwrap(await supabase.from('game_events').upsert(rows, { onConflict: 'game_id,client_ref' }), 'Sync game events');
  }

  if (bundle.shots?.length) {
    const rows = bundle.shots.map((shot, index) => ({
      game_id: game.id,
      team_id: cloudTeamId,
      player_id: shot.playerId || null,
      created_by: user.id,
      client_ref: clientRef('shot', shot.id ?? `${bundle.id}-${index}`),
      made: Boolean(shot.made),
      points: Number(shot.points) === 3 ? 3 : 2,
      x: shot.x ?? null,
      y: shot.y ?? null,
      period: String(shot.period || '1'),
      clock_seconds: shot.clockSeconds ?? null,
      local_updated_at: shot.localUpdatedAt || new Date().toISOString(),
    }));
    await unwrap(await supabase.from('shots').upsert(rows, { onConflict: 'game_id,client_ref' }), 'Sync shots');
  }

  // Remove cloud rows this save no longer contains (a cleared shot, a removed
  // player), so a re-saved game restores exactly as it was saved.
  if (bundle.prune !== false) {
    await pruneStaleRows(supabase, 'shots', game.id, (bundle.shots || []).map((shot, index) => clientRef('shot', shot.id ?? `${bundle.id}-${index}`)));
    await pruneStaleRows(supabase, 'game_events', game.id, (bundle.events || []).filter((event) => (event.type || 'stat') === BOX_LINE_EVENT).map((event, index) => clientRef('event', event.id ?? `${bundle.id}-${index}`)), BOX_LINE_EVENT);
  }

  if (bundle.lineupStints?.length) {
    const rows = bundle.lineupStints.map((stint, index) => ({
      game_id: game.id,
      team_id: cloudTeamId,
      created_by: user.id,
      client_ref: clientRef('lineup', stint.id ?? `${bundle.id}-${index}`),
      player_ids: stint.playerIds || [],
      period: String(stint.period || '1'),
      start_clock_seconds: stint.startClockSeconds ?? null,
      end_clock_seconds: stint.endClockSeconds ?? null,
      points_for: Number(stint.pointsFor || 0),
      points_against: Number(stint.pointsAgainst || 0),
      local_updated_at: stint.localUpdatedAt || new Date().toISOString(),
    }));
    await unwrap(await supabase.from('lineup_stints').upsert(rows, { onConflict: 'game_id,client_ref' }), 'Sync lineup stints');
  }

  return game;
}

const BOX_STAT_KEYS = ['p2m', 'p2a', 'p3m', 'p3a', 'ftm', 'fta', 'reb', 'ast', 'tov', 'stl', 'blk', 'fouls', 'tfouls'];
export const BOX_LINE_EVENT = 'box_line';

// A local shot is "made" when the app recorded it with type "made".
// Older or hydrated shots may carry a boolean `made` instead.
export function isMadeShot(shot = {}) {
  return shot.type === 'made' || shot.made === true;
}

// Shot value: trust the classification saved at record time (det), then an
// explicit points value, then fall back to the supplied geometry check.
export function shotPoints(shot = {}, isThree = () => false) {
  if (shot.det === '3pt') return 3;
  if (shot.det === '2pt') return 2;
  if (Number(shot.points) === 3) return 3;
  if (Number(shot.points) === 2) return 2;
  return isThree(shot.x, shot.y) ? 3 : 2;
}

// Turns a locally saved game into the rows syncGameBundle expects:
// every shot (with its real made/missed result) plus one "box_line" event per
// player per period, so the full box score can be rebuilt on another device.
export function buildGameBundle(game, playerMap, options = {}) {
  if (!game?.id) throw new Error('game.id is required');
  const map = playerMap instanceof Map ? playerMap : new Map();
  const isThree = options.isThree || (() => false);
  const cloudPlayerId = (pid) => (pid == null ? null : (map.get(clientRef('player', pid)) || null));

  const shots = (game.shots || []).map((shot, index) => ({
    id: shot.id ?? `${game.id}-${index}`,
    playerId: cloudPlayerId(shot.pid),
    made: isMadeShot(shot),
    points: shotPoints(shot, isThree),
    x: shot.x ?? null,
    y: shot.y ?? null,
    period: shot.q ?? shot.period ?? game.quarter ?? 1,
    clockSeconds: shot.clockSeconds ?? null,
    localUpdatedAt: game.localUpdatedAt,
  }));

  const events = [];
  for (const player of game.players || []) {
    const playerId = cloudPlayerId(player.id);
    if (!playerId) continue;
    for (const [period, stats] of Object.entries(player.q || {})) {
      const payload = {};
      for (const key of BOX_STAT_KEYS) payload[key] = Number(stats?.[key] || 0);
      events.push({
        id: `${game.id}-box-${player.id}-${period}`,
        type: BOX_LINE_EVENT,
        playerId,
        period,
        payload,
        localUpdatedAt: game.localUpdatedAt,
      });
    }
  }

  return {
    id: game.id,
    date: game.date,
    awayName: game.away,
    quarter: game.quarter,
    teamScore: game.teamPts,
    awayScore: game.awayScore,
    periodSeconds: options.periodSeconds || 600,
    status: 'final',
    localUpdatedAt: game.localUpdatedAt,
    shots,
    events,
  };
}

async function pruneStaleRows(supabase, table, gameId, keepRefs, eventType = null) {
  let query = supabase.from(table).select('client_ref').eq('game_id', gameId);
  if (eventType) query = query.eq('event_type', eventType);
  const existing = await unwrap(await query, `Load ${table} for cleanup`);
  const keep = new Set(keepRefs);
  const stale = (existing || []).map((row) => row.client_ref).filter((ref) => !keep.has(ref));
  if (!stale.length) return 0;
  await unwrap(await supabase.from(table).delete().eq('game_id', gameId).in('client_ref', stale), `Remove stale ${table}`);
  return stale.length;
}

export async function pullTeamCloudState(supabase, cloudTeamId, since = null) {
  requireClient(supabase);
  if (!cloudTeamId) throw new Error('cloudTeamId is required');

  const query = (table) => {
    let q = supabase.from(table).select('*').eq('team_id', cloudTeamId);
    if (since) q = q.gt('updated_at', since);
    return q.order('updated_at', { ascending: true });
  };

  const [players, games, events, shots, lineups] = await Promise.all([
    query('players'), query('games'), query('game_events'), query('shots'), query('lineup_stints'),
  ]);

  return {
    players: await unwrap(players, 'Pull players'),
    games: await unwrap(games, 'Pull games'),
    events: await unwrap(events, 'Pull game events'),
    shots: await unwrap(shots, 'Pull shots'),
    lineupStints: await unwrap(lineups, 'Pull lineup stints'),
    syncedAt: new Date().toISOString(),
  };
}

export function shouldPushLocal(localUpdatedAt, cloudUpdatedAt) {
  if (!localUpdatedAt) return false;
  if (!cloudUpdatedAt) return true;
  return new Date(localUpdatedAt).getTime() > new Date(cloudUpdatedAt).getTime();
}

if (typeof window !== 'undefined') {
  window.GameIQCloudSync = { clientRef, isMadeShot, shotPoints, buildGameBundle, retryDelayMs, withRetry, resolveWorkspace, ensureWorkspace, syncTeam, syncGameBundle, pullTeamCloudState, shouldPushLocal };
}
