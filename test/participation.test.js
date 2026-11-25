import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DEIC_DATABASE=':memory:';
const {completeLesson,localDay,weekStart,communityCheckin,communityProfile,communityRanking,rankingVisibility,clearGuild}=await import('../records.js');
const monday=Date.parse('2026-11-23T03:00:00Z')/1000;
const day=86400;
test('Brasilia day and Monday boundary',()=>{
  assert.equal(localDay(monday-1),'2026-11-22');
  assert.equal(localDay(monday),'2026-11-23');
  assert.equal(weekStart(monday-1),monday-7*day);
  assert.equal(weekStart(monday+6*day),monday);
});
test('one check-in per local day and one credit per lesson',()=>{
  assert.equal(communityCheckin('a','u',monday),true);
  assert.equal(communityCheckin('a','u',monday+3600),false);
  assert.equal(communityCheckin('a','u',monday+day),true);
  assert.equal(completeLesson('a','u','conduta',monday),true);
  assert.equal(completeLesson('a','u','conduta',monday+day),false);
  assert.deepEqual(communityProfile('a','u',monday+2*day),{lessons:['conduta'],checkins:2,weeklyLessons:1,visible:false});
});
test('ranking is opt-in, ordered and isolated per guild',()=>{
  for(const [guild,member] of [['b','one'],['b','two'],['c','one']]) communityCheckin(guild,member,monday);
  completeLesson('b','two','equipe',monday);
  assert.equal(communityRanking('b',monday).length,0);
  rankingVisibility('b','one',true);
  rankingVisibility('b','two',true);
  assert.deepEqual(communityRanking('b',monday).map(r=>[r.member,r.points]),[['two',2],['one',1]]);
  assert.equal(communityRanking('c',monday).length,0);
  rankingVisibility('b','two',false);
  assert.deepEqual(communityRanking('b',monday).map(r=>r.member),['one']);
  assert.equal(communityRanking('b',monday+7*day).length,0);
});
test('guild reset removes participation without affecting another guild',()=>{
  communityCheckin('reset','u',monday);
  completeLesson('reset','u','equipe',monday);
  rankingVisibility('reset','u',true);
  communityCheckin('keep','u',monday);
  clearGuild('reset');
  assert.deepEqual(communityProfile('reset','u',monday),{lessons:[],checkins:0,weeklyLessons:0,visible:false});
  assert.equal(communityProfile('keep','u',monday).checkins,1);
});
