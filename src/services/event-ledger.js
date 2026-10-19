// GameIQ event ledger (step 2, issue 2.1).
//
// Every stat tap becomes an append-only event. Box scores, the shot chart and
// plus/minus are rebuilt from the active events, so a correction is a `void`
// event rather than an edit, and the full history is always kept.
//
// Pure module: no DOM, no storage, no network. The app and tests import it.

export const LEDGER_VERSION = 1;

export const STAT_KEYS = ['p2m', 'p2a', 'p3m', 'p3a', 'ftm', 'fta', 'reb', 'ast', 'tov', 'stl', 'blk', 'fouls', 'tfouls'];
const SIMPLE_STATS = { ast: 'ast', tov: 'tov', stl: 'stl', blk: 'blk' };
const NON_STAT_TYPES = new Set(['void', 'period', 'box_line']);
const MIGRATION_SEQ_BASE = -1_000_000; // migrated events always sort before live ones

export function emptyCounters() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
}

function defaultValue(type, payload, value) {
  if (value !== undefined && value !== null) return value;
  switch (type) {
    case 'shot': return payload.made ? Number(payload.pts) : 0;
    case 'ft': return payload.made ? 1 : 0;
    case 'sub': return payload.dir === 'in' ? 1 : 0;
    case 'reb': case 'ast': case 'tov': case 'stl': case 'blk': case 'foul': return 1;
    default: return null;
  }
}

// Builds a well-formed event. `ref` is derived from gameKey/deviceId/seq unless given.
export function makeEvent({ gameKey, deviceId = 'local', seq, type, pid = null, period = 1, clock = null, value, payload = {}, at, synthetic = false, ref } = {}) {
  if (!gameKey) throw new Error('gameKey is required');
  if (!type) throw new Error('type is required');
  if (seq === null || seq === undefined || !Number.isFinite(Number(seq))) throw new Error('seq is required');
  if (type === 'shot' && ![2, 3].includes(Number(payload.pts))) throw new Error('shot payload.pts must be 2 or 3');
  return {
    ref: ref || `ev:${gameKey}:${deviceId}:${seq}`,
    gameKey,
    seq: Number(seq),
    type,
    pid,
    period,
    clock,
    value: defaultValue(type, payload, value),
    payload: { ...payload },
    at: at || new Date().toISOString(),
    synthetic: Boolean(synthetic),
  };
}

export function makeVoid({ gameKey, deviceId, seq, targets, reason = 'undo', replacedBy, at, period }) {
  if (!Array.isArray(targets) || !targets.length) throw new Error('void needs at least one target');
  const payload = { targets: [...targets], reason };
  if (replacedBy) payload.replacedBy = replacedBy;
  return makeEvent({ gameKey, deviceId, seq, type: 'void', period: period ?? 1, payload, at });
}

export function sortEvents(events = []) {
  return [...events].sort((a, b) => (a.seq - b.seq) || String(a.ref).localeCompare(String(b.ref)));
}

// An event is active unless an ACTIVE void targets it. Voiding a void brings
// its targets back (that is how "undo Clear shots" works).
// Keeps the first copy of each ref, so a ledger loaded twice never double-counts.
export function dedupeEvents(events = []) {
  const seen = new Set();
  return events.filter((event) => (seen.has(event.ref) ? false : (seen.add(event.ref), true)));
}

export function activeRefs(input = []) {
  const events = dedupeEvents(input);
  const byRef = new Map(events.map((event) => [event.ref, event]));
  const voidersOf = new Map();
  for (const event of events) {
    if (event.type !== 'void') continue;
    for (const target of event.payload?.targets || []) {
      if (!voidersOf.has(target)) voidersOf.set(target, []);
      voidersOf.get(target).push(event.ref);
    }
  }
  const memo = new Map();
  const visiting = new Set();
  const isActive = (ref) => {
    if (memo.has(ref)) return memo.get(ref);
    if (visiting.has(ref)) return false; // a void caught in a cycle has no effect
    visiting.add(ref);
    const voiders = voidersOf.get(ref) || [];
    const active = byRef.has(ref) && !voiders.some((voider) => isActive(voider));
    visiting.delete(ref);
    memo.set(ref, active);
    return active;
  };
  return new Set(events.filter((event) => isActive(event.ref)).map((event) => event.ref));
}

export function activeEvents(events = []) {
  const active = activeRefs(events);
  return sortEvents(dedupeEvents(events).filter((event) => active.has(event.ref)));
}

export function isStatEvent(event) {
  return Boolean(event) && !NON_STAT_TYPES.has(event.type);
}

function emptyCache() {
  return { box: {}, shots: [], pm: {}, onCourt: {}, oppPts: 0, teamReb: { off: 0, def: 0, unk: 0 } };
}

function countersFor(cache, pid, period) {
  const key = pid == null ? 'team' : String(pid);
  if (!cache.box[key]) cache.box[key] = {};
  if (!cache.box[key][period]) cache.box[key][period] = emptyCounters();
  return cache.box[key][period];
}

// Applies one active, non-void event to a derived cache (mutates and returns it).
// rebuildBox uses this too, so the incremental and full paths can't disagree.
export function applyEvent(cache, event) {
  const c = cache || emptyCache();
  if (!isStatEvent(event)) return c;
  const p = event.payload || {};
  switch (event.type) {
    case 'shot': {
      const three = Number(p.pts) === 3;
      // A shot with no player is a chart dot only: the box score has always been
      // the sum of player lines, so it must not add to team totals.
      if (event.pid != null) {
        const counters = countersFor(c, event.pid, event.period);
        counters[three ? 'p3a' : 'p2a'] += 1;
        if (p.made) counters[three ? 'p3m' : 'p2m'] += 1;
      }
      if (p.x != null && p.y != null) {
        c.shots.push({ pid: event.pid, x: p.x, y: p.y, type: p.made ? 'made' : 'miss', det: three ? '3pt' : '2pt', q: event.period, t: Date.parse(event.at) || null, ref: event.ref });
      }
      break;
    }
    case 'ft': {
      const counters = countersFor(c, event.pid, event.period);
      counters.fta += 1;
      if (p.made) counters.ftm += 1;
      break;
    }
    case 'reb': {
      countersFor(c, event.pid, event.period).reb += 1;
      const kind = ['off', 'def'].includes(p.kind) ? p.kind : 'unk';
      c.teamReb[kind] += 1;
      break;
    }
    case 'foul':
      countersFor(c, event.pid, event.period)[p.kind === 'technical' ? 'tfouls' : 'fouls'] += 1;
      break;
    case 'sub': {
      const key = String(event.pid);
      if (p.dir === 'in') {
        c.onCourt[key] = { home: Number(p.home || 0), away: Number(p.away || 0) };
      } else if (c.onCourt[key]) {
        const entry = c.onCourt[key];
        c.pm[key] = (c.pm[key] || 0) + ((Number(p.home || 0) - entry.home) - (Number(p.away || 0) - entry.away));
        delete c.onCourt[key];
      }
      break;
    }
    case 'opp_pts':
      c.oppPts += Number(event.value || 0);
      break;
    default:
      if (SIMPLE_STATS[event.type]) countersFor(c, event.pid, event.period)[SIMPLE_STATS[event.type]] += 1;
  }
  return c;
}

// Full rebuild: { box: {pid: {period: counters}}, shots, pm, oppPts, teamReb }.
export function rebuildBox(events = []) {
  const cache = emptyCache();
  for (const event of activeEvents(events)) applyEvent(cache, event);
  return cache;
}

// Undo button (spec rule 3): the most recent active event that is a stat event
// or a non-undo void (so "Clear shots" can be undone). It never targets an
// undo, so pressing Undo repeatedly never ping-pongs, and it never targets
// migrated (synthetic) history.
export function undoTarget(events = []) {
  const candidates = activeEvents(events).filter((event) => !event.synthetic
    && (isStatEvent(event) || (event.type === 'void' && event.payload?.reason !== 'undo')));
  return candidates.length ? candidates[candidates.length - 1] : null;
}

// Stepper minus: the most recent active event matching player, type, period
// and (optionally) made / pts / kind. Null means "nothing to remove".
export function minusTarget(events = [], { pid, type, period, made, pts, kind } = {}) {
  const matches = activeEvents(events).filter((event) => event.type === type
    && String(event.pid) === String(pid)
    && String(event.period) === String(period)
    && (made === undefined || Boolean(event.payload?.made) === Boolean(made))
    && (pts === undefined || Number(event.payload?.pts) === Number(pts))
    && (kind === undefined || (event.payload?.kind || (event.type === 'foul' ? 'personal' : 'unk')) === kind));
  return matches.length ? matches[matches.length - 1] : null;
}

// ---------- Metrics ----------

function round1(value) {
  return Math.round(value * 10) / 10;
}

export function totals(byPeriod = {}) {
  const sum = emptyCounters();
  for (const counters of Object.values(byPeriod)) for (const key of STAT_KEYS) sum[key] += Number(counters?.[key] || 0);
  return sum;
}

export function points(c = {}) {
  return (c.p2m || 0) * 2 + (c.p3m || 0) * 3 + (c.ftm || 0);
}

// True shooting %: PTS / (2 × (FGA + 0.44 × FTA)). Null when there are no attempts.
export function tsPct(c = {}) {
  const fga = (c.p2a || 0) + (c.p3a || 0);
  const fta = c.fta || 0;
  if (fga + fta === 0) return null;
  return round1((points(c) / (2 * (fga + 0.44 * fta))) * 100);
}

// Team possessions: FGA − ORB + TOV + 0.44 × FTA, using tagged offensive
// rebounds only. Untagged rebounds make it an estimate with a range.
export function possessions(teamCounters = {}, teamReb = { off: 0, unk: 0 }) {
  const fga = (teamCounters.p2a || 0) + (teamCounters.p3a || 0);
  const base = fga + (teamCounters.tov || 0) + 0.44 * (teamCounters.fta || 0);
  const high = round1(base - (teamReb.off || 0));
  const low = Math.max(0, round1(base - (teamReb.off || 0) - (teamReb.unk || 0)));
  return { exact: !(teamReb.unk > 0), value: high, low, high };
}

// ---------- Migration: per-quarter counters -> synthetic events ----------

function periodKey(period) {
  return /^\d+$/.test(String(period)) ? Number(period) : period;
}

// Converts a saved (pre-ledger) game into events. Deterministic: the same game
// always yields the same refs, so a re-run or a second device never duplicates.
// Returns { events, ok, mismatches, fixedAttempts }. If ok is false the caller
// must keep using the counters (no data is ever dropped).
export function migrateGame(game, { gameKey } = {}) {
  const gk = String(gameKey ?? game?.id ?? '');
  if (!gk) throw new Error('gameKey or game.id is required');
  const at = game.localUpdatedAt || new Date(0).toISOString();
  const events = [];
  let seq = MIGRATION_SEQ_BASE;
  const push = (fields, refTail) => events.push(makeEvent({ gameKey: gk, seq: seq++, at, synthetic: true, ref: `ev:${gk}:mig:${refTail}`, ...fields }));

  // 1. Chart shots, in recorded order.
  const chart = new Map(); // `${pid}|${period}` -> { m2, x2, m3, x3 }
  const validTime = (t) => (Number.isFinite(Number(t)) && Number(t) > 0 && !Number.isNaN(new Date(Number(t)).getTime()) ? Number(t) : null);
  // Order by recorded time, but name each shot by a stable id (the same one cloud
  // sync uses: shot.id, else "<gameId>-<index>") so every device derives the same ref.
  const shots = [...(game.shots || [])].map((shot, i) => ({ shot, i, id: String(shot.id ?? `${gk}-${i}`) }))
    .sort((a, b) => ((validTime(a.shot.t) ?? 0) - (validTime(b.shot.t) ?? 0)) || a.id.localeCompare(b.id));
  for (const { shot, id } of shots) {
    const made = shot.type === 'made' || shot.made === true;
    const pts = shot.det === '3pt' || Number(shot.points) === 3 ? 3 : 2;
    const period = periodKey(shot.q ?? shot.period ?? 1);
    const pid = shot.pid ?? null;
    push({ type: 'shot', pid, period, payload: { made, pts, x: shot.x ?? null, y: shot.y ?? null, src: 'chart' }, at: validTime(shot.t) ? new Date(validTime(shot.t)).toISOString() : at }, `chart:${id}`);
    const key = `${pid}|${period}`;
    if (!chart.has(key)) chart.set(key, { m2: 0, x2: 0, m3: 0, x3: 0 });
    const tally = chart.get(key);
    tally[`${made ? 'm' : 'x'}${pts}`] += 1;
  }

  // 2. Counters, minus what the chart shots already explain.
  let fixedAttempts = 0;
  const expected = {};
  for (const player of game.players || []) {
    for (const [rawPeriod, raw] of Object.entries(player.q || {})) {
      const period = periodKey(rawPeriod);
      const c = { ...emptyCounters(), ...Object.fromEntries(STAT_KEYS.map((k) => [k, Number(raw?.[k] || 0)])) };
      const tally = chart.get(`${player.id}|${period}`) || { m2: 0, x2: 0, m3: 0, x3: 0 };
      // Data fix: every make is also an attempt (old Advanced "+made" skipped p2a/p3a),
      // so attempts are at least makes plus the misses already on the chart.
      for (const pts of [2, 3]) {
        const minAttempts = c[`p${pts}m`] + tally[`x${pts}`];
        if (c[`p${pts}a`] < minAttempts && c[`p${pts}m`] > c[`p${pts}a`] - tally[`x${pts}`]) {
          fixedAttempts += minAttempts - c[`p${pts}a`];
          c[`p${pts}a`] = minAttempts;
        }
      }
      (expected[String(player.id)] ||= {})[period] = c;

      const tail = (type, n) => `${player.id}:${period}:${type}:${n}`;
      for (const pts of [2, 3]) {
        const made = Math.max(0, c[`p${pts}m`] - tally[`m${pts}`]);
        const missed = Math.max(0, (c[`p${pts}a`] - c[`p${pts}m`]) - tally[`x${pts}`]);
        for (let n = 0; n < made; n++) push({ type: 'shot', pid: player.id, period, payload: { made: true, pts, x: null, y: null, src: 'stepper' } }, tail(`shot${pts}m`, n));
        for (let n = 0; n < missed; n++) push({ type: 'shot', pid: player.id, period, payload: { made: false, pts, x: null, y: null, src: 'stepper' } }, tail(`shot${pts}x`, n));
      }
      for (let n = 0; n < c.ftm; n++) push({ type: 'ft', pid: player.id, period, payload: { made: true, src: 'stepper' } }, tail('ftm', n));
      for (let n = 0; n < c.fta - c.ftm; n++) push({ type: 'ft', pid: player.id, period, payload: { made: false, src: 'stepper' } }, tail('ftx', n));
      for (let n = 0; n < c.reb; n++) push({ type: 'reb', pid: player.id, period, payload: { kind: 'unk' } }, tail('reb', n));
      for (const type of ['ast', 'tov', 'stl', 'blk']) for (let n = 0; n < c[type]; n++) push({ type, pid: player.id, period }, tail(type, n));
      for (let n = 0; n < c.fouls; n++) push({ type: 'foul', pid: player.id, period, payload: { kind: 'personal' } }, tail('foul', n));
      for (let n = 0; n < c.tfouls; n++) push({ type: 'foul', pid: player.id, period, payload: { kind: 'technical' } }, tail('tfoul', n));
    }
  }
  if (Number(game.awayScore || 0)) push({ type: 'opp_pts', pid: null, period: periodKey(game.quarter ?? 1), value: Number(game.awayScore) }, 'opp');

  // 3. Invariant: rebuilding must reproduce every player's counters exactly.
  const rebuilt = rebuildBox(events);
  const mismatches = [];
  const pids = new Set([...Object.keys(expected), ...Object.keys(rebuilt.box).filter((k) => k !== 'team')]);
  for (const pid of pids) {
    const periods = new Set([...Object.keys(expected[pid] || {}), ...Object.keys(rebuilt.box[pid] || {})]);
    for (const period of periods) {
      const want = expected[pid]?.[period] || emptyCounters();
      const got = rebuilt.box[pid]?.[period] || emptyCounters();
      for (const key of STAT_KEYS) if (want[key] !== got[key]) mismatches.push({ pid, period, key, expected: want[key], actual: got[key] });
    }
  }
  if (rebuilt.oppPts !== Number(game.awayScore || 0)) mismatches.push({ pid: null, period: null, key: 'oppPts', expected: Number(game.awayScore || 0), actual: rebuilt.oppPts });

  // Historic plus/minus can't be rebuilt without sub events; keep it alongside.
  const legacyPm = game.legacyPm ?? game.pmData ?? null;
  return { events, ok: mismatches.length === 0, mismatches, fixedAttempts, legacyPm, ledgerVersion: LEDGER_VERSION };
}

if (typeof window !== 'undefined') {
  window.GameIQLedger = { LEDGER_VERSION, dedupeEvents, makeEvent, makeVoid, activeEvents, applyEvent, rebuildBox, undoTarget, minusTarget, migrateGame, tsPct, possessions, totals, points };
}
