import test from 'node:test';import assert from 'node:assert/strict';
import {selectedFormKinds,selectedTextChannels} from '../template-panel-model.js';
import {investigativeTemplate} from '../template.js';
test('all complete selected register sections initialize forms',()=>{
 assert.deepEqual(selectedFormKinds(Object.values(investigativeTemplate)).sort(),['character','mesa','report','scene']);
 const group=investigativeTemplate.baseDeicRelatorios;
 assert.deepEqual(selectedFormKinds([{...group,channels:group.channels.slice(0,1)}]),[]);
});
test('publish targets only selected unambiguous channels with correct privacy',()=>{
 const group=investigativeTemplate.baseDeicRelatorios;
 const ch=(id,name,parent,privateFlag)=>({id,name,parent:{name:parent},privateFlag,type:0});
 const first=ch('1',group.channels[0],group.name,true),second=ch('2',group.channels[1],group.name,false),wrong=ch('3',group.channels[2],'Other',true);
 assert.deepEqual(selectedTextChannels([group],[first,second,wrong],c=>c.type===0,c=>c.privateFlag).map(x=>x.channel.id),['1']);
 assert.equal(selectedTextChannels([group],[first,{...first,id:'4'}],c=>c.type===0,c=>c.privateFlag).length,0);
});
