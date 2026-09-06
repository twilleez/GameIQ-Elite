import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudStateToLocal, mergeCloudGames } from '../src/services/cloud-hydration.js';

test('cloud state hydrates an identical game score and shot chart', () => {
  const state = {
    players: [{ id:'p-uuid', client_ref:'player:24', jersey_number:'24', display_name:'Guard', position:'G', active:true }],
    games: [{ id:'g-uuid', client_ref:'game:1001', opponent_name:'Rivals', game_date:'2026-08-27', current_period:'4', team_score:71, opponent_score:68, local_updated_at:'2026-08-27T22:00:00Z', updated_at:'2026-08-27T22:00:01Z' }],
    shots: [{ id:'s-uuid', game_id:'g-uuid', client_ref:'shot:7', player_id:'p-uuid', made:true, points:3, x:50, y:175, period:'4', clock_seconds:12 }],
    syncedAt:'2026-08-27T22:00:02Z',
  };
  const local = cloudStateToLocal(state, {name:'Varsity'}, 'td');
  assert.equal(local.team.players[0].id, 24);
  assert.equal(local.games.length, 1);
  assert.equal(local.games[0].teamPts, 71);
  assert.equal(local.games[0].awayScore, 68);
  assert.equal(local.games[0].shots[0].pid, 24);
  assert.equal(local.games[0].shots[0].points, 3);
});

test('mergeCloudGames does not duplicate the same client game and prefers newer state', () => {
  const local = [{id:1001,teamPts:69,localUpdatedAt:'2026-08-27T21:59:00Z'}];
  const cloud = [{id:1001,teamPts:71,localUpdatedAt:'2026-08-27T22:00:00Z'}];
  const merged = mergeCloudGames(local, cloud);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].teamPts, 71);
});
