import test from 'node:test';import assert from 'node:assert/strict';
process.env.DEIC_DATABASE=':memory:';
const {hierarchyGroups,hierarchyCard}=await import('../organization.js');
test('hierarchy uses display names, excludes bots and duplicates, sorts within rank',()=>{
 const roles=[{id:'1',name:'DEIC · Diretor'},{id:'2',name:'DEIC · Investigador'}];
 const members=[{roles:['2'],nick:'Zeca',user:{username:'z'}},{roles:['1','2'],nick:'Ana',user:{username:'a'}},{roles:['2'],nick:'Bruno',user:{username:'b'}},{roles:['2'],user:{bot:true,username:'robot'}}];
 const groups=hierarchyGroups(members,roles);
 assert.deepEqual(groups.find(g=>g.rank===roles[0].name).names,['Ana']);
 assert.deepEqual(groups.find(g=>g.rank===roles[1].name).names,['Bruno','Zeca']);
 assert.equal(hierarchyCard(groups).fields.length,7);
});
