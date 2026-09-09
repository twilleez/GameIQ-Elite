import test from 'node:test';
import assert from 'node:assert/strict';
import {
  points,fieldGoalsMade,fieldGoalsAttempted,percent,
  effectiveFieldGoalPercent,isThreePointShot,sumPeriods,sumTeam
} from '../src/domain/basketball.js';

test('calculates points correctly',()=>{
  assert.equal(points({p2m:4,p3m:3,ftm:2}),19);
});

test('calculates field goals and percentages',()=>{
  const s={p2m:4,p2a:8,p3m:2,p3a:5};
  assert.equal(fieldGoalsMade(s),6);
  assert.equal(fieldGoalsAttempted(s),13);
  assert.equal(percent(6,13),46);
});

test('returns zero percent when there are no attempts',()=>{
  assert.equal(percent(0,0),0);
  assert.equal(effectiveFieldGoalPercent({}),0);
});

test('calculates eFG percent correctly',()=>{
  assert.equal(effectiveFieldGoalPercent({p2m:4,p2a:8,p3m:2,p3a:4}),58);
});

test('matches the three point classifier to the line drawn on the court',()=>{
  assert.equal(isThreePointShot(20,100),true,'outside left corner line is three');
  assert.equal(isThreePointShot(40,100),false,'inside left corner line is two');
  assert.equal(isThreePointShot(200,250),false,'top of key inside arc is two');
  assert.equal(isThreePointShot(200,280),false,'just inside top arc is two');
  assert.equal(isThreePointShot(200,292),true,'just beyond top arc is three');
  assert.equal(isThreePointShot(200,330),true,'deep straight-on shot is three');
  assert.equal(isThreePointShot(70,215),false,'wing inside arc is two');
  assert.equal(isThreePointShot(55,235),true,'wing beyond arc is three');
  assert.equal(isThreePointShot(360,100),false,'inside right corner line is two');
  assert.equal(isThreePointShot(380,100),true,'outside right corner line is three');
});

test('sums player periods without mutating player state',()=>{
  const player={q:{1:{p2m:2,reb:3},2:{p3m:1,ast:2},OT:{ftm:2}}};
  const total=sumPeriods(player);
  assert.equal(points(total),9);
  assert.equal(total.reb,3);
  assert.equal(total.ast,2);
});

test('sums a full team',()=>{
  const players=[
    {q:{1:{p2m:2,reb:3}}},
    {q:{1:{p3m:2,ast:4}}}
  ];
  const total=sumTeam(players);
  assert.equal(points(total),10);
  assert.equal(total.reb,3);
  assert.equal(total.ast,4);
});
