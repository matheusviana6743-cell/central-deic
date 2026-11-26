import { ChannelType,PermissionFlagsBits as P,OverwriteType,Routes } from 'discord.js';
import { team,intelligence,sameChannelName } from './deic.js';
import { formSection,mesaRooms,get,panelId,savePanel } from './records.js';
const noMentions={parse:[]};
const escape=s=>String(s).replace(/[\r\n]/g,' ').replace(/([\\`*_~|>])/g,'\\$1').slice(0,80);
export function hierarchyGroups(members,roles){
 const byRole=new Map(roles.map(r=>[r.id,r.name]));
 const ranks=[...team.slice(0,2),intelligence,...team.slice(2)];
 const grouped=new Map(ranks.map(r=>[r,[]]));
 for(const m of members){
  if(m.user?.bot)continue;
  const owned=new Set((m.roles??[]).map(id=>byRole.get(id)));
  const rank=ranks.find(r=>owned.has(r));
  if(!rank)continue;
  const name=m.nick||m.user?.global_name||m.user?.username;
  if(name)grouped.get(rank).push(escape(name));
 }
 return [...grouped].map(([rank,names])=>({rank,names:names.sort((a,b)=>a.localeCompare(b,'pt-BR'))}));
}
export function hierarchyCard(groups){
 const fields=[];let remaining=3500;
 for(const {rank,names} of groups){
  let value='',used=0;
  for(const n of names){
   if(value.length+n.length+4>Math.min(850,remaining))break;
   value+=(value?'\n':'')+'• '+n;used++;
  }
  remaining-=value.length;
  fields.push({name:rank.replace('DEIC · ','')+' · '+names.length,value:(value||'—')+(used<names.length?'\n… '+(names.length-used)+' nome(s) não exibido(s).':'')});
 }
 return {color:0xc69b42,author:{name:'CENTRAL DEIC · TRAVESSIA RP'},title:'🏛️ Hierarquia da equipe',description:'Integrantes por cargo principal, usando o nome exibido no Discord. Atualização sob solicitação da direção.',fields,footer:{text:'DEIC · Organograma interno'},timestamp:new Date().toISOString()};
}
const findCat=(channels,name)=>channels.find(c=>c?.type===ChannelType.GuildCategory&&sameChannelName(c.name,name));
const child=(channels,cat,name,type)=>channels.find(c=>c?.parentId===cat.id&&c.type===type&&sameChannelName(c.name,name));
const privateChannel=(guild,c)=>c&&c.permissionsFor(guild.roles.everyone)?.has(P.ViewChannel)===false;
async function upsert(guild,ch,card,components=[]){
 const id=panelId(guild.id,ch.id);
 let msg=id?await ch.messages.fetch(id).catch(e=>{if(e.code===10008)return null;throw e;}):null;
 if(msg?.author.id!==guild.client.user.id)msg=null;
 if(!msg)msg=(await ch.messages.fetch({limit:30})).find(m=>m.author.id===guild.client.user.id&&m.embeds[0]?.title===card.title);
 const payload={embeds:[card],components,allowedMentions:noMentions};
 msg=msg?await msg.edit(payload):await ch.send(payload);
 savePanel(guild.id,ch.id,msg.id);
}
async function membersForHierarchy(guild){
 const members=[];let after='0';
 for(let page=0;page<10;page++){
  const query=new URLSearchParams({limit:'1000',after});
  const batch=await guild.client.rest.get(Routes.guildMembers(guild.id),{query});
  if(!Array.isArray(batch))throw Error('Lista de integrantes indisponível');
  members.push(...batch);
  if(batch.length<1000)return members;
  after=batch.at(-1).user.id;
 }
 throw Error('Limite de integrantes; hierarquia anterior preservada');
}
async function order(guild,ids){
 const channels=await guild.channels.fetch();
 const ordered=ids.map(id=>channels.get(id)).filter(Boolean);
 if(!ordered.length)return;
 const positions=ordered.map(c=>c.rawPosition).sort((a,b)=>a-b);
 await guild.channels.setPositions(ordered.map((c,index)=>({channel:c.id,position:positions[index]})));
}
export async function organizeExtras(guild){
 const notes=[];const channels=await guild.channels.fetch(),roles=await guild.roles.fetch(),bot=await guild.members.fetchMe();
 const internal=findCat(channels,'DEIC | Área interna');
 const formation=findCat(channels,'DEIC | Formação');
 const cabinet=findCat(channels,'DEIC | Gabinete');
 const safeOverwrites=(rankNames,voice)=>[
  {id:guild.id,type:OverwriteType.Role,deny:[P.ViewChannel]},
  {id:bot.id,type:OverwriteType.Member,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.Connect,P.Speak]},
  ...roles.filter(r=>rankNames.includes(r.name)&&!r.managed).map(r=>({id:r.id,type:OverwriteType.Role,allow:voice?[P.ViewChannel,P.Connect,P.Speak]:[P.ViewChannel,P.ReadMessageHistory],...(voice?{}:{deny:[P.SendMessages,P.CreatePublicThreads,P.CreatePrivateThreads]})}))
 ];
 if(internal&&privateChannel(guild,internal)){
  try{
   let ch=child(channels,internal,'hierarquia-deic',ChannelType.GuildText);
   if(!ch)ch=await guild.channels.create({name:'🏛️・hierarquia-deic',type:ChannelType.GuildText,parent:internal.id,permissionOverwrites:safeOverwrites([...team,intelligence],false)});
   if(!privateChannel(guild,ch))throw Error('Canal de hierarquia não privado');
   const members=await membersForHierarchy(guild);
   await upsert(guild,ch,hierarchyCard(hierarchyGroups(members,[...roles.values()])));
   notes.push('Hierarquia atualizada por nomes e cargos.');
  }catch(e){console.warn('Hierarquia não atualizada',e.code??e.name);notes.push('Hierarquia: não foi possível consultar todos os integrantes; confira a permissão Server Members Intent no Developer Portal.');}
 }
 for(const [cat,ranks,names] of [[formation,team,['🎙️・Aula 01','🎙️・Aula 02','💬・Dúvidas e orientação']],[cabinet,team.slice(0,2),['🔐・Reunião da direção','🎙️・Atendimento interno']],[internal,team,['💬・Conversa da equipe 02','📚・Sala de estudos']]]){
  if(!cat||!privateChannel(guild,cat))continue;
  for(const name of names){
   try{
    const existing=child(channels,cat,name,ChannelType.GuildVoice);
    if(!existing)await guild.channels.create({name,type:ChannelType.GuildVoice,parent:cat.id,permissionOverwrites:safeOverwrites(ranks,true)});
   }catch(e){notes.push('Sala não criada: '+name);console.warn('Sala de voz',e.code??e.name);}
  }
 }
 for(const kind of ['report','scene','mesa','character']){
  const s=formSection(guild.id,kind);if(!s)continue;
  try{
   let ids=[s.entry,s.published,s.archived];
   if(kind==='mesa'){
    const cat=channels.get(s.category);
    const panel=cat&&child(channels,cat,'painel-de-mesas',ChannelType.GuildText);
    if(panel)ids.unshift(panel.id);
    const desks=mesaRooms(guild.id).filter(r=>channels.get(r.channel)?.parentId===s.category);
    desks.sort((a,b)=>Number(Boolean(get(guild.id,a.record)?.closed))-Number(Boolean(get(guild.id,b.record)?.closed))||a.record-b.record);
    ids.push(...desks.map(r=>r.channel));
   }
   await order(guild,ids);
  }catch(e){notes.push('Ordem de '+kind+' pendente.');console.warn('Ordem de canais',e.code??e.name);}
 }
 if(formation&&privateChannel(guild,formation)){
  try{
   const current=await guild.channels.fetch();
   const material=child(current,formation,'orientacoes-da-equipe',ChannelType.GuildText)||child(current,formation,'material-de-formacao',ChannelType.GuildText);
   const schedule=child(current,formation,'treinamentos-rp',ChannelType.GuildText)||child(current,formation,'agenda-de-aulas',ChannelType.GuildText);
   if(material&&!sameChannelName(material.name,'material-de-formacao'))await material.setName('📚・material-de-formacao');
   if(schedule&&!sameChannelName(schedule.name,'agenda-de-aulas'))await schedule.setName('📅・agenda-de-aulas');
   if(material&&schedule)await order(guild,[material.id,schedule.id]);
   notes.push('Formação: materiais e agenda separados.');
  }catch(e){notes.push('Formação: organização pendente.');}
 }
 if(cabinet&&privateChannel(guild,cabinet)){
  try{
   const names=['painel-da-direcao','triagem-de-fichas','decisoes-da-direcao','acompanhamento-da-equipe'];
   const ids=names.map(n=>child(channels,cabinet,n,ChannelType.GuildText)?.id).filter(Boolean);
   await order(guild,ids);
   notes.push('Gabinete organizado; salas de reunião reservadas à direção.');
  }catch(e){notes.push('Gabinete: organização pendente.');}
 }
 return notes;
}
