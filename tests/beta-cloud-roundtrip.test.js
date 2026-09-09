import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { syncTeam, syncGameBundle } from '../src/services/cloud-sync.js';
import { cloudStateToLocal } from '../src/services/cloud-hydration.js';

class MemorySupabase {
  constructor() {
    this.tables = { teams: [], players: [], games: [], game_events: [], shots: [], lineup_stints: [] };
    this.nextId = 1;
  }
  from(table) {
    if (!this.tables[table]) this.tables[table] = [];
    const db = this;
    const state = { mode: null, payload: null, conflict: null };
    const api = {
      upsert(payload, options = {}) { state.mode = 'upsert'; state.payload = payload; state.conflict = options.onConflict || ''; return api; },
      select() { return api; },
      single: async () => ({ data: execute(true), error: null }),
      then(resolve, reject) { return Promise.resolve({ data: execute(false), error: null }).then(resolve, reject); },
    };
    function execute(single) {
      const rows = Array.isArray(state.payload) ? state.payload : [state.payload];
      const out = rows.map((input) => {
        const row = { ...input };
        const keys = String(state.conflict || '').split(',').map((x) => x.trim()).filter(Boolean);
        const existing = keys.length ? db.tables[table].find((candidate) => keys.every((key) => candidate[key] === row[key])) : null;
        if (existing) {
          Object.assign(existing, row, { updated_at: '2026-09-09T16:30:00.000Z' });
          return { ...existing };
        }
        const created = { id: `${table}-${db.nextId++}`, created_at: '2026-09-09T16:00:00.000Z', updated_at: '2026-09-09T16:30:00.000Z', ...row };
        db.tables[table].push(created);
        return { ...created };
      });
      return single ? out[0] : out;
    }
    return api;
  }
}

test('offline/reconnect gate is wired in the production candidate', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /if\(!game\|\|game\.cloudSyncedAt\|\|!sb\|\|!authUser\|\|!navigator\.onLine\)return false/);
  assert.match(html, /window\.addEventListener\('online',async\(\)=>\{await retryPendingCloudSync\(\)/);
  assert.match(html, /const pending=\(S\.games\|\|\[\]\)\.filter\(g=>!g\.cloudSyncedAt\)/);
  assert.match(html, /game\.cloudSyncedAt=new Date\(\)\.toISOString\(\)/);
});

test('replaying the same saved game creates exactly one cloud game and hydrates Device B', async () => {
  const sb = new MemorySupabase();
  const user = { id: 'beta-user' };
  const localTeam = { id: 'td', name: 'Beta Team', players: [{ id: 1, num: 2, name: 'Guard', pos: 'PG' }] };

  const syncedTeam = await syncTeam(sb, user, 'org-beta', localTeam);
  await syncTeam(sb, user, 'org-beta', localTeam);
  assert.equal(sb.tables.teams.length, 1);
  assert.equal(sb.tables.players.length, 1);

  const cloudPlayerId = syncedTeam.players[0].id;
  const bundle = {
    id: 'offline-game-1',
    date: '2026-09-09',
    awayName: 'Visitors',
    quarter: 4,
    teamScore: 61,
    awayScore: 58,
    localUpdatedAt: '2026-09-09T16:29:00.000Z',
    shots: [{ id: 'shot-1', playerId: cloudPlayerId, made: true, points: 3, x: 200, y: 300, period: 4 }],
  };

  await syncGameBundle(sb, user, syncedTeam.team.id, bundle);
  await syncGameBundle(sb, user, syncedTeam.team.id, bundle);

  assert.equal(sb.tables.games.length, 1, 'duplicate reconnect attempts must upsert one game row');
  assert.equal(sb.tables.shots.length, 1, 'duplicate reconnect attempts must upsert one shot row');

  const deviceB = cloudStateToLocal({
    players: sb.tables.players,
    games: sb.tables.games,
    events: sb.tables.game_events,
    shots: sb.tables.shots,
    lineupStints: sb.tables.lineup_stints,
    syncedAt: '2026-09-09T16:31:00.000Z',
  }, syncedTeam.team, 'td');

  assert.equal(deviceB.team.name, 'Beta Team');
  assert.equal(deviceB.team.players.length, 1);
  assert.equal(deviceB.games.length, 1);
  assert.equal(deviceB.games[0].teamPts, 61);
  assert.equal(deviceB.games[0].awayScore, 58);
  assert.equal(deviceB.games[0].shots.length, 1);
  assert.equal(deviceB.games[0].shots[0].pid, 1);
  assert.equal(deviceB.games[0].shots[0].points, 3);
});
