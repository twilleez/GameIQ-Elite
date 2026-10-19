// Event ledger unit tests (step 2, issue 2.1 / GitHub #14).
// Covers spec acceptance criteria 3, 5, 6 (unit level) and 7.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/services/event-ledger.js';

const GK = 'g1';
let seq = 0;
const ev = (type, fields = {}) => L.makeEvent({ gameKey: GK, seq: ++seq, type, period: 1, ...fields });
const shot = (pid, made, pts, fields = {}) => ev('shot', { pid, ...fields, payload: { made, pts, x: 200, y: pts === 3 ? 320 : 90, src: 'chart', ...(fields.payload || {}) } });

// Seeded pseudo-random generator so the 200-tap game is reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('criterion 3: a 200-tap scripted game rebuilds to the same box score as the old counters', () => {
  seq = 0;
  const rand = rng(42);
  const pids = [1, 2, 3, 4, 5];
  const periods = [1, 2, 3, 4, 'OT'];
  const counters = {}; // old-style p.q[period] counters, incremented the way the app does today
  const bump = (pid, period, key) => { ((counters[pid] ||= {})[period] ||= L.emptyCounters())[key] += 1; };
  const events = [];
  for (let i = 0; i < 200; i++) {
    const pid = pids[Math.floor(rand() * pids.length)];
    const period = periods[Math.min(4, Math.floor((i / 200) * 5))];
    const roll = rand();
    if (roll < 0.35) {
      const pts = rand() < 0.35 ? 3 : 2;
      const made = rand() < 0.45;
      events.push(shot(pid, made, pts, { period }));
      bump(pid, period, `p${pts}a`); if (made) bump(pid, period, `p${pts}m`);
    } else if (roll < 0.45) {
      const made = rand() < 0.7;
      events.push(ev('ft', { pid, period, payload: { made } }));
      bump(pid, period, 'fta'); if (made) bump(pid, period, 'ftm');
    } else {
      const type = ['reb', 'ast', 'tov', 'stl', 'blk', 'foul'][Math.floor(rand() * 6)];
      events.push(ev(type, { pid, period, payload: type === 'reb' ? { kind: 'unk' } : type === 'foul' ? { kind: 'personal' } : {} }));
      bump(pid, period, type === 'foul' ? 'fouls' : type);
    }
  }
  const { box } = L.rebuildBox(events);
  assert.deepEqual(box, Object.fromEntries(Object.entries(counters).map(([pid, q]) => [String(pid), q])));
});

test('criterion 5: three Undos void the three most recent stat events and never re-instate anything', () => {
  seq = 0;
  const events = [shot(1, true, 2), ev('reb', { pid: 2, payload: { kind: 'unk' } }), ev('ast', { pid: 1 }), shot(12, true, 3)];
  const undone = [];
  for (let i = 0; i < 3; i++) {
    const target = L.undoTarget(events);
    undone.push(target.ref);
    events.push(L.makeVoid({ gameKey: GK, seq: ++seq, targets: [target.ref], reason: 'undo' }));
  }
  assert.deepEqual(undone, [events[3].ref, events[2].ref, events[1].ref]);
  const { box } = L.rebuildBox(events);
  assert.deepEqual(box['1'][1], { ...L.emptyCounters(), p2m: 1, p2a: 1 });
  assert.equal(box['12'], undefined, 'made 3 by #12 is fully removed');
  // A fourth undo takes the last remaining stat, not a void.
  assert.equal(L.undoTarget(events).ref, events[0].ref);
});

test('criterion 4 (unit): undoing a made 3 removes 3 points, the 3PM/3PA and the chart dot', () => {
  seq = 0;
  const events = [shot(12, true, 3)];
  assert.equal(L.rebuildBox(events).shots.length, 1);
  events.push(L.makeVoid({ gameKey: GK, seq: ++seq, targets: [L.undoTarget(events).ref] }));
  const after = L.rebuildBox(events);
  assert.equal(after.shots.length, 0);
  assert.equal(L.points(L.totals(after.box['12'] || {})), 0);
  assert.equal(events.length, 2, 'history kept: the voided event is still in the ledger');
});

test('criterion 6: stepper minus voids the latest matching rebound, and does nothing at zero', () => {
  seq = 0;
  const events = [ev('reb', { pid: 7, period: 2 }), ev('reb', { pid: 7, period: 1 }), ev('reb', { pid: 7, period: 2 })];
  const target = L.minusTarget(events, { pid: 7, type: 'reb', period: 2 });
  assert.equal(target.ref, events[2].ref);
  events.push(L.makeVoid({ gameKey: GK, seq: ++seq, targets: [target.ref], reason: 'minus' }));
  assert.equal(L.minusTarget(events, { pid: 7, type: 'reb', period: 2 }).ref, events[0].ref);
  assert.equal(L.minusTarget(events, { pid: 7, type: 'reb', period: 3 }), null);
  assert.equal(L.minusTarget(events, { pid: 7, type: 'ast', period: 2 }), null);
});

test('voiding a void brings its targets back (undo of "Clear shots")', () => {
  seq = 0;
  const events = [shot(1, true, 2), shot(1, false, 3)];
  const clear = L.makeVoid({ gameKey: GK, seq: ++seq, targets: events.map((e) => e.ref), reason: 'clear' });
  events.push(clear);
  assert.equal(L.rebuildBox(events).shots.length, 0);
  events.push(L.makeVoid({ gameKey: GK, seq: ++seq, targets: [clear.ref], reason: 'edit' }));
  assert.equal(L.rebuildBox(events).shots.length, 2);
});

test('plus/minus is derived from sub in/out pairs', () => {
  seq = 0;
  const events = [
    ev('sub', { pid: 3, payload: { dir: 'in', home: 0, away: 0 } }),
    ev('sub', { pid: 3, payload: { dir: 'out', home: 10, away: 4 } }),
    ev('sub', { pid: 3, payload: { dir: 'in', home: 12, away: 4 } }),
    ev('sub', { pid: 3, payload: { dir: 'out', home: 14, away: 11 } }),
  ];
  assert.equal(L.rebuildBox(events).pm['3'], 6 + -5);
});

test('TS% and possessions', () => {
  // 20 pts on 15 FGA and 6 FTA -> 56.7% (matches the worked example in the analysis)
  assert.equal(L.tsPct({ p2m: 4, p2a: 10, p3m: 3, p3a: 5, ftm: 3, fta: 6 }), 56.7);
  assert.equal(L.tsPct(L.emptyCounters()), null);
  const team = { p2a: 30, p3a: 20, tov: 12, fta: 10 };
  assert.deepEqual(L.possessions(team, { off: 5, unk: 0 }), { exact: true, value: 61.4, low: 61.4, high: 61.4 });
  assert.deepEqual(L.possessions(team, { off: 5, unk: 4 }), { exact: false, value: 61.4, low: 57.4, high: 61.4 });
});

// ---------- Migration (criterion 7) ----------

const q = (o) => ({ ...L.emptyCounters(), onCourt: true, minsOn: 0, courtEnteredAt: null, ...o });
function savedGame(id, extra = {}) {
  return {
    id, quarter: 4, awayScore: 31, localUpdatedAt: '2026-10-18T22:00:00.000Z',
    players: [
      { id: 1, name: 'Ava', q: { 1: q({ p2m: 2, p2a: 3, p3m: 1, p3a: 2, ftm: 1, fta: 2, reb: 2, ast: 3 }), 2: q({ p2a: 2, tov: 1, fouls: 2 }), OT: q({ p3m: 1, p3a: 1, stl: 1 }) } },
      { id: 2, name: 'Bea', q: { 1: q({ p2m: 3, p2a: 5, reb: 6, blk: 2, tfouls: 1 }), 3: q({ ftm: 4, fta: 4 }) } },
    ],
    shots: [
      { pid: 1, x: 200, y: 90, type: 'made', det: '2pt', q: 1, t: 1 },
      { pid: 1, x: 20, y: 100, type: 'made', det: '3pt', q: 1, t: 2 },
      { pid: 2, x: 230, y: 120, type: 'miss', det: '2pt', q: 1, t: 3 },
      { pid: 1, x: 200, y: 320, type: 'made', det: '3pt', q: 'OT', t: 4 },
    ],
    ...extra,
  };
}

test('criterion 7: migrating 5 saved games plus a live game is lossless', () => {
  const games = [1, 2, 3, 4, 5].map((n) => savedGame(1000 + n));
  games.push(savedGame('live', { shots: [], awayScore: 0 }));
  for (const game of games) {
    const result = L.migrateGame(game);
    assert.equal(result.ok, true, JSON.stringify(result.mismatches));
    const { box, shots, oppPts } = L.rebuildBox(result.events);
    assert.equal(shots.length, game.shots.length, 'chart dots preserved');
    assert.equal(oppPts, game.awayScore);
    assert.equal(L.points(L.totals(box['1'])), 2 * 2 + 3 * 2 + 1);
    assert.ok(result.events.every((e) => e.synthetic && e.seq < 0), 'migrated events sort before live ones');
  }
});

test('criterion 7: migration is deterministic, so re-runs and second devices never duplicate', () => {
  const a = L.migrateGame(savedGame(77));
  const b = L.migrateGame(JSON.parse(JSON.stringify(savedGame(77))));
  assert.deepEqual(a.events.map((e) => e.ref), b.events.map((e) => e.ref));
  assert.equal(new Set(a.events.map((e) => e.ref)).size, a.events.length, 'refs are unique');
});

test('migration fixes makes that exceeded attempts (old Advanced "+made" bug) and reports it', () => {
  const game = savedGame(9, { shots: [], players: [{ id: 1, name: 'Ava', q: { 1: q({ p2m: 3, p2a: 1 }) } }] });
  const result = L.migrateGame(game);
  assert.equal(result.ok, true);
  assert.equal(result.fixedAttempts, 2);
  assert.deepEqual(L.rebuildBox(result.events).box['1'][1], { ...L.emptyCounters(), p2m: 3, p2a: 3 });
});

test('migration refuses (ok=false) instead of losing data when chart and counters disagree', () => {
  // Chart shows a made 3 that the counters were later stepped back from.
  const game = savedGame(10, { shots: [{ pid: 1, x: 20, y: 100, type: 'made', det: '3pt', q: 2, t: 1 }] });
  const result = L.migrateGame(game);
  assert.equal(result.ok, false);
  assert.ok(result.mismatches.some((m) => m.pid === '1' && String(m.period) === '2' && m.key === 'p3m'));
});

test('makeEvent validates input', () => {
  assert.throws(() => L.makeEvent({ seq: 1, type: 'ast' }), /gameKey/);
  assert.throws(() => L.makeEvent({ gameKey: 'g', seq: 1, type: 'shot', payload: { made: true, pts: 4 } }), /pts/);
  assert.equal(L.makeEvent({ gameKey: 'g', deviceId: 'd1', seq: 5, type: 'ast' }).ref, 'ev:g:d1:5');
});
