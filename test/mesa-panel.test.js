import test from 'node:test';
import assert from 'node:assert/strict';
import { Collection, ChannelType } from 'discord.js';
process.env.DEIC_DATABASE=':memory:';
const {mesaName,mesaTopics,mesaCard,canManageMesa,archiveMesaTopics}=await import('../mesa-panel.js');
const records=await import('../records.js');
test('name and panel keep a short unique identifier and two controls',()=>{
  assert.equal(mesaName(5,'Teste de revisão'),'📁・mesa-0005-teste-de-revisao');
  assert.ok(mesaName(999,'a'.repeat(100)).length<100);
  const record={id:5,title:'Teste',author:'u',closed:0};
  const card=mesaCard(record,[{member:'x'}]);
  assert.equal(card.components[0].toJSON().components.length,2);
  assert.equal(card.components[0].toJSON().components[0].custom_id,'mesa-ui:members:5');
  assert.equal(mesaCard({...record,closed:1}).components.length,0);
  assert.equal(mesaTopics.length,4);
});
test('management requires private channel and owner or authorized role',()=>{
  const everyone={},guild={ownerId:'owner',roles:{everyone}};
  const member={roles:{cache:new Collection([['r',{name:'DEIC · Investigador'}]])}};
  const outsider={roles:{cache:new Collection()}};
  const channel={type:ChannelType.GuildText,permissionsFor:who=>({has:()=>who!==everyone})};
  const record={author:'responsavel'};
  assert.ok(canManageMesa(guild,channel,member,record,'responsavel'));
  assert.ok(canManageMesa(guild,channel,outsider,record,'owner'));
  assert.equal(canManageMesa(guild,channel,outsider,record,'responsavel'),false);
  assert.equal(canManageMesa(guild,{...channel,permissionsFor:()=>({has:()=>true})},member,record,'responsavel'),false);
});
test('room records stay isolated by guild',()=>{
  const id=records.create('g1','case','Mesa fictícia','u','Teste');
  records.saveRoom('g1','c1',id,'legacy-mesa');
  assert.equal(records.mesaRooms('g1')[0].channel,'c1');
  assert.equal(records.mesaRooms('g2').length,0);
});
test('closing archives only recognized active topics of this channel',async()=>{
  const calls=[];
  const thread=(name,parentId)=>({name,parentId,locked:false,archived:false,setLocked:async()=>calls.push('lock:'+name),setArchived:async()=>calls.push('archive:'+name)});
  const threads=new Collection([['a',thread('Informações','c1')],['b',thread('Documentos','other')],['c',thread('Conversa','c1')]]);
  assert.deepEqual(await archiveMesaTopics({id:'c1',threads:{fetchActive:async()=>({threads})}}),{archived:1,failed:0});
  assert.deepEqual(calls,['lock:Informações','archive:Informações']);
});
