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

test('classifies shots beyond the three point boundary from every major angle',()=>{
  assert.equal(isThreePointShot(20,100),true,'corner three');
  assert.equal(isThreePointShot(50,120),true,'wing three');
  assert.equal(isThreePointShot(200,192),true,'top of arc three');
  assert.equal(isThreePointShot(200,250),true,'deep straight-on three');
  assert.equal(isThreePointShot(200,180),false,'inside top of arc is two');
  assert.equal(isThreePointShot(200,100),false,'paint/midrange is two');
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
