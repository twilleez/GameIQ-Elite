// Cloud round-trip test: a game saved on one device, synced, then restored on a
// clean device must come back with the same box score and shot chart.
// Runs with plain Node (no browser, no network): node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as sync from '../src/services/cloud-sync.js';
import { cloudStateToLocal } from '../src/services/cloud-hydration.js';
import { isThreePointShot, sumPeriods, points } from '../preview/src/domain/basketball.js';

// Minimal in-memory stand-in for the parts of supabase-js the sync code uses.
function fakeSupabase() {
  const tables = {};
  let nextId = 1;
  const rowsOf = (t) => (tables[t] ||= []);
  function builder(table) {
    const filters = [];
    let op = 'select';
    let payload = null;
    let conflictKeys = null;
    let wantSingle = false;
    let limitN = null;
    const inFilters = [];
    const run = () => {
      const rows = rowsOf(table);
      if (op === 'delete') {
        const doomed = rows.filter((r) => filters.every(([k, v]) => r[k] === v) && inFilters.every(([k, vs]) => vs.includes(r[k])));
        tables[table] = rows.filter((r) => !doomed.includes(r));
        return doomed;
      }
      if (op === 'insert' || op === 'upsert') {
        const list = Array.isArray(payload) ? payload : [payload];
        const out = list.map((row) => {
          const existing = conflictKeys && rows.find((r) => conflictKeys.every((k) => r[k] === row[k]));
          if (existing) { Object.assign(existing, row, { updated_at: new Date().toISOString() }); return existing; }
          const created = { id: `id-${nextId++}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row };
          rows.push(created);
          return created;
        });
        return wantSingle ? out[0] : out;
      }
      let out = rows.filter((r) => filters.every(([k, v]) => r[k] === v));
      if (limitN != null) out = out.slice(0, limitN);
      if (wantSingle === 'maybe') return out[0] || null;
      if (wantSingle) return out[0];
      return out;
    };
    const api = {
      select() { return api; },
      eq(k, v) { filters.push([k, v]); return api; },
      gt() { return api; },
      order() { return api; },
      limit(n) { limitN = n; return api; },
      in(k, vs) { inFilters.push([k, vs]); return api; },
      delete() { op = 'delete'; return api; },
      insert(p) { op = 'insert'; payload = p; return api; },
      upsert(p, opts = {}) { op = 'upsert'; payload = p; conflictKeys = (opts.onConflict || '').split(',').filter(Boolean); return api; },
      single() { wantSingle = true; return api; },
      maybeSingle() { wantSingle = 'maybe'; return api; },
      then(resolve, reject) { try { resolve({ data: run(), error: null }); } catch (e) { reject(e); } },
    };
    return api;
  }
  return { from: builder, tables };
}

const emptyQ = () => ({ p2m: 0, p2a: 0, p3m: 0, p3a: 0, ftm: 0, fta: 0, reb: 0, ast: 0, tov: 0, stl: 0, blk: 0, fouls: 0, tfouls: 0, onCourt: true, minsOn: 0, courtEnteredAt: null });

// A small hand-scored game: two players, two quarters plus overtime.
function sampleGame() {
  const ava = { id: 1, num: '3', name: 'Ava', pos: 'G', q: {
    1: { ...emptyQ(), p2m: 2, p2a: 3, p3m: 1, p3a: 2, ftm: 1, fta: 2, ast: 3, reb: 1 },
    2: { ...emptyQ(), p2m: 1, p2a: 2, p3a: 1, tov: 2, fouls: 2 },
    OT: { ...emptyQ(), p3m: 1, p3a: 1, stl: 1 },
  } };
  const bea = { id: 2, num: '24', name: 'Bea', pos: 'F', q: {
    1: { ...emptyQ(), p2m: 3, p2a: 5, reb: 6, blk: 2 },
    2: { ...emptyQ(), ftm: 4, fta: 4, reb: 3, fouls: 3 },
  } };
  return {
    id: 1760000000000, teamId: 'td', teamName: 'Wildcats', date: '2026-10-18', away: 'Tigers',
    quarter: 'OT', teamPts: 27, awayScore: 22, localUpdatedAt: '2026-10-18T22:00:00.000Z',
    players: [ava, bea],
    shots: [
      { pid: 1, x: 200, y: 90, type: 'made', det: '2pt', q: 1 },
      { pid: 1, x: 20, y: 100, type: 'made', det: '3pt', q: 1 },
      { pid: 1, x: 200, y: 330, type: 'miss', det: '3pt', q: 1 },
      { pid: 2, x: 180, y: 70, type: 'made', det: '2pt', q: 1 },
      { pid: 2, x: 230, y: 120, type: 'miss', det: '2pt', q: 1 },
      { pid: 1, x: 200, y: 320, type: 'made', det: '3pt', q: 'OT' },
    ],
  };
}

test('made shots keep their result and value through sync', () => {
  const game = sampleGame();
  const map = new Map([['player:1', 'cloud-ava'], ['player:2', 'cloud-bea']]);
  const bundle = sync.buildGameBundle(game, map, { isThree: isThreePointShot });
  assert.deepEqual(bundle.shots.map((s) => s.made), [true, true, false, true, false, true]);
  assert.deepEqual(bundle.shots.map((s) => s.points), [2, 3, 3, 2, 2, 3]);
  assert.equal(bundle.events.filter((e) => e.type === 'box_line').length, 5);
});

test('shotPoints falls back to geometry only when nothing was recorded', () => {
  assert.equal(sync.shotPoints({ x: 20, y: 100 }, isThreePointShot), 3);
  assert.equal(sync.shotPoints({ x: 200, y: 90 }, isThreePointShot), 2);
  assert.equal(sync.shotPoints({ det: '2pt', x: 20, y: 100 }, isThreePointShot), 2);
});

test('a synced game restores on a clean device with an identical box score and shot chart', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = sampleGame();
  const localTeam = { id: game.teamId, name: game.teamName, players: game.players };

  const workspace = await sync.ensureWorkspace(sb, user);
  const syncedTeam = await sync.syncTeam(sb, user, workspace.id, localTeam);
  await sync.syncGameBundle(sb, user, syncedTeam.team.id, sync.buildGameBundle(game, syncedTeam.playerMap, { isThree: isThreePointShot }));

  // Clean device: nothing local, pull everything back.
  const state = await sync.pullTeamCloudState(sb, syncedTeam.team.id);
  const restored = cloudStateToLocal(state, syncedTeam.team, 'td').games[0];

  assert.equal(restored.teamPts, game.teamPts);
  assert.equal(restored.awayScore, game.awayScore);
  assert.equal(restored.players.length, game.players.length);
  for (const original of game.players) {
    const back = restored.players.find((p) => String(p.id) === String(original.id));
    assert.ok(back, `player ${original.name} restored`);
    assert.equal(back.name, original.name);
    for (const [period, stats] of Object.entries(original.q)) {
      for (const key of ['p2m', 'p2a', 'p3m', 'p3a', 'ftm', 'fta', 'reb', 'ast', 'tov', 'stl', 'blk', 'fouls']) {
        assert.equal(back.q[period]?.[key] ?? 0, stats[key], `${original.name} Q${period} ${key}`);
      }
    }
    assert.equal(points(sumPeriods(back)), points(sumPeriods(original)), `${original.name} points`);
  }

  const key = (s) => `${s.pid}|${s.x}|${s.y}|${s.type}|${s.det}|${s.q}`;
  assert.deepEqual(restored.shots.map(key).sort(), game.shots.map(key).sort());
});

test('re-saving an edited game updates rows instead of duplicating them', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = sampleGame();
  const localTeam = { id: game.teamId, name: game.teamName, players: game.players };
  const ws = await sync.ensureWorkspace(sb, user);
  const team = await sync.syncTeam(sb, user, ws.id, localTeam);
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(game, team.playerMap));
  game.players[1].q[2].reb = 4; // correction after halftime save
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(game, team.playerMap));
  assert.equal(sb.tables.games.length, 1);
  assert.equal(sb.tables.shots.length, game.shots.length);
  assert.equal(sb.tables.game_events.length, 5);
  const line = sb.tables.game_events.find((e) => e.client_ref.endsWith('-box-2-2'));
  assert.equal(line.payload.reb, 4);
});

async function syncAndRestore(sb, user, game) {
  const ws = await sync.ensureWorkspace(sb, user);
  const team = await sync.syncTeam(sb, user, ws.id, { id: game.teamId, name: game.teamName, players: game.players });
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(game, team.playerMap, { isThree: isThreePointShot }));
  const state = await sync.pullTeamCloudState(sb, team.team.id);
  return cloudStateToLocal(state, team.team, 'td').games[0];
}

test('QA bug A: a removed player and their shots do not come back after re-save', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = sampleGame();
  await syncAndRestore(sb, user, game);
  game.players = game.players.filter((p) => p.id !== 2);
  game.shots = game.shots.filter((s) => s.pid !== 2);
  const restored = await syncAndRestore(sb, user, game);
  assert.equal(restored.shots.length, game.shots.length);
  assert.deepEqual(restored.players.map((p) => p.name), ['Ava']);
});

test('QA bug A: clearing all shots and re-saving clears them in the cloud', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = sampleGame();
  await syncAndRestore(sb, user, game);
  game.shots = [];
  const restored = await syncAndRestore(sb, user, game);
  assert.equal(restored.shots.length, 0);
});

test('QA bugs B and C: overtime and history-card summary survive restore', async () => {
  const restored = await syncAndRestore(fakeSupabase(), { id: 'user-1' }, sampleGame());
  assert.equal(restored.quarter, 'OT');
  assert.equal(restored.home, 'Wildcats');
  // Hand-scored: Ava 5 of 9 FG (13 pts), Bea 3 of 5 FG: team FGM 8, FGA 14
  assert.equal(restored.teamFg, Math.round((8 / 14) * 100));
  assert.equal(restored.teamReb, 10);
  assert.equal(restored.teamAst, 3);
  assert.equal(restored.teamTov, 2);
  assert.deepEqual(restored.mvp, { name: 'Ava', pts: 13 });
});

test('QA P2: an older copy of a game cannot overwrite or prune a newer cloud save', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const newer = sampleGame();
  newer.localUpdatedAt = '2026-10-18T23:00:00.000Z';
  const older = sampleGame();
  older.localUpdatedAt = '2026-10-18T21:00:00.000Z';
  older.shots = older.shots.slice(0, 2);
  const ws = await sync.ensureWorkspace(sb, user);
  const team = await sync.syncTeam(sb, user, ws.id, { id: 'td', name: 'Wildcats', players: newer.players });
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(newer, team.playerMap));
  const result = await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(older, team.playerMap));
  assert.equal(result.skippedAsOlder, true);
  assert.equal(sb.tables.shots.length, newer.shots.length);
});

// ---------- Step 2, issue #16: ledger events sync and hydrate ----------
import * as L from '../src/services/event-ledger.js';

function ledgerGame() {
  const gk = '1761000000000';
  let seq = 0;
  const ev = (type, fields = {}) => L.makeEvent({ gameKey: gk, deviceId: 'dA', seq: ++seq, type, period: 1, ...fields });
  const events = [
    ev('sub', { pid: 1, payload: { dir: 'in', home: 0, away: 0 } }),
    ev('shot', { pid: 1, payload: { made: true, pts: 3, x: 20, y: 100, src: 'chart' } }),
    ev('shot', { pid: 2, payload: { made: false, pts: 2, x: 210, y: 80, src: 'chart' } }),
    ev('ft', { pid: 2, payload: { made: true, src: 'stepper' } }),
    ev('reb', { pid: 2, payload: { kind: 'unk' } }),
    ev('opp_pts', { value: 2 }),
    ev('period', { payload: { from: 1, to: 2 }, period: 2 }),
    ev('shot', { pid: 2, period: 2, payload: { made: true, pts: 2, x: 200, y: 90, src: 'chart' } }),
    ev('foul', { pid: 1, period: 2, payload: { kind: 'personal' } }),
    ev('sub', { pid: 1, period: 2, payload: { dir: 'out', home: 6, away: 2 } }),
  ];
  // a mistake corrected with a void
  const wrong = ev('ast', { pid: 2, period: 2 });
  events.push(wrong, L.makeVoid({ gameKey: gk, deviceId: 'dA', seq: ++seq, targets: [wrong.ref], reason: 'undo', period: 2 }));
  const rebuilt = L.rebuildBox(events);
  const players = [{ id: 1, num: '3', name: 'Ava', pos: 'G' }, { id: 2, num: '24', name: 'Bea', pos: 'F' }].map((p) => {
    const q = {};
    for (const [per, c] of Object.entries(rebuilt.box[String(p.id)] || {})) q[/^\d+$/.test(per) ? Number(per) : per] = { ...c };
    return { ...p, q };
  });
  return {
    id: Number(gk), teamId: 'td', teamName: 'Wildcats', date: '2026-10-19', away: 'Tigers', quarter: 2,
    teamPts: 6, awayScore: 2, localUpdatedAt: '2026-10-19T20:00:00.000Z',
    players, shots: rebuilt.shots, events, ledgerKey: gk, ledgerVersion: 1, expected: rebuilt,
  };
}

async function syncLedgerGame(sb, user, game) {
  const ws = await sync.ensureWorkspace(sb, user);
  const team = await sync.syncTeam(sb, user, ws.id, { id: game.teamId, name: game.teamName, players: game.players });
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(game, team.playerMap, { isThree: isThreePointShot }));
  return team;
}

test('#16 criterion 8: a ledger game restores on a clean device with identical box, chart, plus/minus and event order', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = ledgerGame();
  const team = await syncLedgerGame(sb, user, game);
  const restored = cloudStateToLocal(await sync.pullTeamCloudState(sb, team.team.id), team.team, 'td').games[0];

  for (const original of game.players) {
    const back = restored.players.find((p) => String(p.id) === String(original.id));
    assert.ok(back, `${original.name} restored`);
    for (const [period, counters] of Object.entries(original.q)) {
      for (const key of L.STAT_KEYS) assert.equal(back.q[period]?.[key] ?? 0, counters[key], `${original.name} Q${period} ${key}`);
    }
  }
  const dot = (s) => `${s.pid}|${s.x}|${s.y}|${s.type}|${s.det}|${s.q}`;
  assert.deepEqual(restored.shots.map(dot).sort(), game.shots.map(dot).sort());
  assert.deepEqual(restored.pmData, game.expected.pm);
  assert.deepEqual(restored.events.map((e) => e.ref), game.events.map((e) => e.ref), 'same events in the same order, voids included');
  assert.equal(restored.events.filter((e) => e.type === 'void').length, 1);
  assert.deepEqual(L.rebuildBox(restored.events).box, game.expected.box, 'restored ledger rebuilds to the same box');
});

test('#16: re-saving a ledger game twice creates no duplicate event rows', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = ledgerGame();
  const team = await syncLedgerGame(sb, user, game);
  const rowsAfterFirst = sb.tables.game_events.length;
  game.localUpdatedAt = '2026-10-19T20:05:00.000Z';
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(game, team.playerMap, { isThree: isThreePointShot }));
  assert.equal(sb.tables.game_events.length, rowsAfterFirst);
  assert.equal(sb.tables.game_events.filter((r) => r.event_type !== 'box_line').length, game.events.length);
});

test('#16: an old cloud game with only box_line rows still restores', async () => {
  const sb = fakeSupabase();
  const user = { id: 'user-1' };
  const game = sampleGame(); // pre-ledger game, no events
  const ws = await sync.ensureWorkspace(sb, user);
  const team = await sync.syncTeam(sb, user, ws.id, { id: game.teamId, name: game.teamName, players: game.players });
  await sync.syncGameBundle(sb, user, team.team.id, sync.buildGameBundle(game, team.playerMap));
  const restored = cloudStateToLocal(await sync.pullTeamCloudState(sb, team.team.id), team.team, 'td').games[0];
  assert.equal(restored.events, undefined);
  assert.equal(restored.players.find((p) => p.name === 'Ava').q[1].p3m, 1);
});
