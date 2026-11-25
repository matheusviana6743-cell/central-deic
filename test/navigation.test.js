import test from 'node:test';
import assert from 'node:assert/strict';
import { ChannelType, Collection } from 'discord.js';
process.env.DEIC_DATABASE=':memory:';
const { navigationCommand, navigationButton, participationRow, academyRow, handleNavigation }=await import('../navigation.js');
const { academyCommand, handleAcademy }=await import('../academy.js');
const { participationCommands, handleParticipation }=await import('../participation.js');
const { deicModules }=await import('../deic.js');
const { panelCard }=await import('../panel.js');
const member={roles:{cache:new Collection([['a',{name:'DEIC · Agente em formação'}]])}};
const outsider={roles:{cache:new Collection()}};
const roles=(m)=>({inGuild:()=>true,member:m,guildId:'integration',user:{id:'123456789012345678'}});
test('command and panel builders serialize to valid Discord components',()=>{
  for(const command of [navigationCommand,academyCommand,...participationCommands])assert.ok(command.toJSON().name);
  for(const row of [participationRow(),academyRow(),...panelCard().components])assert.ok(row.toJSON().components.length<=5);
  assert.equal(navigationButton().toJSON().custom_id,'central:open');
});
test('navigation excludes channels without ViewChannel permission',async()=>{
  const section=deicModules.deicRecepcao;
  let result;
  const channels=[{type:ChannelType.GuildText,id:'101',name:section.channels[0],parent:{name:section.name},permissionsFor:()=>({has:()=>true})},
    {type:ChannelType.GuildText,id:'102',name:section.channels[1],parent:{name:section.name},permissionsFor:()=>({has:()=>false})}];
  await handleNavigation({...roles(outsider),guild:{channels:{fetch:async()=>channels}},deferReply:async()=>{},editReply:async p=>{result=p;}});
  assert.ok(result.embeds[0].fields[0].value.includes('<#101>'));
  assert.ok(!JSON.stringify(result).includes('<#102>'));
  assert.equal(result.components.length,0);
});
test('academy menu and lesson are private and restricted',async()=>{
  let result;
  await handleAcademy({...roles(outsider),isChatInputCommand:()=>true,reply:async p=>{result=p;}});
  assert.match(result.content,/integrantes/);
  const base={...roles(member),isChatInputCommand:()=>false,reply:async p=>{result=p;},update:async p=>{result=p;}};
  await handleAcademy({...base,customId:'academy:menu'});
  assert.equal(result.components[0].toJSON().components.length,3);
  await handleAcademy({...base,customId:'academy:open:conduta:other'});
  assert.match(result.content,/própria/);
  await handleAcademy({...base,customId:'academy:open:conduta:'+base.user.id});
  assert.match(result.embeds[0].title,/Conduta/);
});
test('community check-in button records at most one daily point',async()=>{
  let result;
  const base={...roles(member),isButton:()=>true,customId:'community:presenca',reply:async p=>{result=p;}};
  await handleParticipation(base);assert.match(result.content,/Presença registrada/);
  await handleParticipation(base);assert.match(result.content,/já registrou/);
  await handleParticipation({...base,member:outsider});assert.match(result.content,/exclusivo/);
});

test('team navigation never repeats component IDs across rows',async()=>{
  let result;
  await handleNavigation({...roles(member),guild:{channels:{fetch:async()=>[]}},deferReply:async()=>{},editReply:async p=>{result=p;}});
  const ids=result.components.flatMap(row=>row.toJSON().components.map(c=>c.custom_id));
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(ids,['community:perfil','community:presenca','community:ranking','academy:menu']);
  assert.equal(academyRow().toJSON().components.length,2);
});

test('channel names tolerate decoration but preserve explicit sector boundaries',async()=>{
  const {sameChannelName,matchesSectorChannel}=await import('../deic.js');
  const internal=deicModules.deicInterna;
  assert.ok(sameChannelName('📋・central-de-plantao', '📝・central-de-plantao'));
  assert.ok(matchesSectorChannel({name:'🧩・painel-de-mesas',parent:{name:'🧩・DEIC | Mesas'}},internal,internal.channels[2]));
  assert.ok(matchesSectorChannel({name:'📝・painel-de-relatorios',parent:{name:'📝・DEIC | Relatórios'}},internal,internal.channels[3]));
  assert.ok(matchesSectorChannel({name:'🎯・painel-de-tocaias',parent:{name:'🎯・DEIC | Tocaias RP'}},internal,internal.channels[1]));
  assert.equal(matchesSectorChannel({name:'🧩・painel-de-mesas',parent:{name:'DEIC | Gabinete'}},internal,internal.channels[2]),false);
  assert.equal(matchesSectorChannel({name:'🧩・painel-de-mesas-falso',parent:{name:'DEIC | Mesas'}},internal,internal.channels[2]),false);
  assert.equal(matchesSectorChannel({name:'painel-da-direcao',parent:{name:'DEIC | Mesas'}},deicModules.deicComando,deicModules.deicComando.channels[0]),false);
});
