const DEFAULT_WORKSPACE_NAME = 'My Program';

export function clientRef(kind, localId) {
  if (!kind) throw new Error('kind is required');
  if (localId === undefined || localId === null || localId === '') throw new Error('localId is required');
  return `${kind}:${String(localId)}`;
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

export async function ensureWorkspace(supabase, user, name = DEFAULT_WORKSPACE_NAME) {
  requireClient(supabase);
  requireUser(user);
  const ref = clientRef('owner', user.id);

  const existing = await unwrap(
    await supabase.from('organizations').select('*').eq('owner_profile_id', user.id).eq('client_ref', ref).maybeSingle(),
    'Load workspace',
  );
  if (existing) return existing;

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
  window.GameIQCloudSync = { clientRef, ensureWorkspace, syncTeam, syncGameBundle, pullTeamCloudState, shouldPushLocal };
}
