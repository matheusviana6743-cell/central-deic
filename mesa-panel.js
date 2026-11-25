import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits, UserSelectMenuBuilder } from 'discord.js';
import { team } from './deic.js';
import * as records from './records.js';

export const mesaTopics=['📋・Informações','📸・Fotos do RP','📁・Documentos','📝・Relatórios'];
const quiet={flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}};
const noMentions={parse:[]};
const color=0x204c64;
const row=(...items)=>new ActionRowBuilder().addComponents(...items);
const button=(action,id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId('mesa-ui:'+action+':'+id).setLabel(label).setStyle(style);
export function mesaName(id,title,closed=false){
  const slug=String(title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65).replace(/-$/,'')||'registro';
  return (closed?'🔒':'📁')+'・mesa-'+String(id).padStart(4,'0')+'-'+slug;
}
export function mesaCard(record,members=[]){
  const count=members.filter(m=>m.member!==record.author).length;
  return {allowedMentions:noMentions,embeds:[{color:record.closed?0x697681:color,
    author:{name:'DEIC • TRAVESSIA RP'},
    title:'📁 Mesa #'+String(record.id).padStart(4,'0')+' · '+String(record.title).slice(0,170),
    description:'**Responsável:** <@'+record.author+'>\n**Situação:** '+(record.closed?'Encerrada':'Em andamento')+'\n**Integrantes designados:** '+count+'\n\n'+(record.closed?'Registro encerrado. Os documentos e mensagens foram preservados.':'Utilize os tópicos abaixo para organizar os registros fictícios do RP.'),
    footer:{text:'Central de registros • Travessia RP'}}],
    components:record.closed?[]:[row(button('members',record.id,'Gerenciar integrantes',ButtonStyle.Primary),button('close',record.id,'Fechar mesa',ButtonStyle.Danger))]};
}
function canViewPrivate(guild,channel,member){
  return channel?.type===ChannelType.GuildText &&
    channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)===false &&
    channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)===true;
}
export function canManageMesa(guild,channel,member,record,actor){
  if(!guild||!member||!record||!canViewPrivate(guild,channel,member)) return false;
  const roles=member.roles?.cache;
  return actor===guild.ownerId || Boolean(roles?.some(r=>team.slice(0,2).includes(r.name))) ||
    (record.author===actor && Boolean(roles?.some(r=>team.includes(r.name))));
}
function isMesaMessage(message,botId,record){
  const title=message?.embeds?.[0]?.title??'';
  return message?.author?.id===botId && (title.startsWith('📂 Mesa investigativa · ') || title.startsWith('📁 Mesa #'+String(record.id).padStart(4,'0')+' · '));
}
export async function publishMesaPanel(guild,channel,record){
  if(!channel || channel.type!==ChannelType.GuildText || channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)!==false) return false;
  const linked=records.roomList(guild.id,record.id).some(r=>r.channel===channel.id&&r.kind==='legacy-mesa');
  if(!linked) return false;
  const id=records.panelId(guild.id,channel.id);
  let message=id?await channel.messages.fetch(id).catch(e=>{if(e.code!==10008)throw e;return null;}):null;
  if(!isMesaMessage(message,guild.client.user.id,record)){
    const recent=await channel.messages.fetch({limit:50});
    message=recent.find(m=>isMesaMessage(m,guild.client.user.id,record));
  }
  const payload=mesaCard(record,records.caseMembers(record.id));
  message=message?await message.edit(payload):await channel.send(payload);
  records.savePanel(guild.id,channel.id,message.id);
  return true;
}
export async function publishExistingMesaPanels(guild){
  let updated=0,failed=0;
  for(const item of records.mesaRooms(guild.id)){
    try{
      const channel=await guild.channels.fetch(item.channel).catch(e=>{if(e.code!==10003)throw e;return null;});
      const record=records.get(guild.id,item.record);
      if(!record||!channel||channel.type!==ChannelType.GuildText)continue;
      if(await publishMesaPanel(guild,channel,record)){
        const target=mesaName(record.id,record.title,Boolean(record.closed));
        if(channel.name!==target) await channel.setName(target).catch(e=>{console.warn('Nome da mesa não atualizado',e.code??e.name);});
        updated++;
      }
    }catch(e){failed++;console.warn('Painel de mesa não atualizado',e.code??e.name);}
  }
  console.log('Mesas RP: '+updated+' painéis atualizados; '+failed+' falhas.');
}
export async function archiveMesaTopics(channel){
  const result={archived:0,failed:0};
  let threads;
  try{threads=(await channel.threads.fetchActive()).threads;}catch{return {archived:0,failed:1};}
  const accepted=new Set([...mesaTopics,'Informações','Fotos do RP','Documentos','Relatórios']);
  for(const thread of threads.values()){
    if(thread.parentId!==channel.id||!accepted.has(thread.name))continue;
    try{
      if(!thread.locked)await thread.setLocked(true,'Encerramento da mesa RP');
      if(!thread.archived)await thread.setArchived(true,'Encerramento da mesa RP');
      result.archived++;
    }catch{result.failed++;}
  }
  return result;
}
export function handlesMesaPanel(i){return typeof i.customId==='string'&&i.customId.startsWith('mesa-ui:');}
export async function handleMesaPanel(i){
  try{
    const [,action,raw]=i.customId.split(':');
    if(!i.inGuild()||!i.guild||!/^\d+$/.test(raw))return await i.reply({...quiet,content:'Mesa indisponível.'});
    const id=Number(raw),record=records.get(i.guildId,id);
    if(!record||record.kind!=='case'||!records.roomList(i.guildId,id).some(r=>r.channel===i.channelId&&r.kind==='legacy-mesa')||
      !canManageMesa(i.guild,i.channel,i.member,record,i.user.id)){
      return await i.reply({...quiet,content:'Somente o responsável ou a chefia pode gerenciar esta mesa.'});
    }
    if(record.closed)return await i.reply({...quiet,content:'Esta mesa já está encerrada.'});
    if(action==='members'&&i.isButton()){
      const members=records.caseMembers(id).filter(m=>m.member!==record.author);
      return await i.reply({...quiet,content:'**Integrantes da mesa #'+id+'**\nResponsável: <@'+record.author+'>\n'+(members.length?members.map(m=>'<@'+m.member+'>').join(', '):'Nenhum integrante designado.')+'\n\nA lista registra a equipe; os acessos do canal continuam conforme os cargos.',components:[row(button('add',id,'Adicionar integrante',ButtonStyle.Success),button('remove',id,'Remover integrante'))]});
    }
    if(['add','remove'].includes(action)&&i.isButton()){
      return await i.reply({...quiet,content:'Selecione um integrante.',components:[row(new UserSelectMenuBuilder().setCustomId('mesa-ui:save-'+action+':'+id).setPlaceholder('Selecionar integrante'))]});
    }
    if(action==='close'&&i.isButton()){
      return await i.reply({...quiet,content:'**Confirma o encerramento da mesa?** O registro será encerrado e os tópicos ativos serão arquivados. Nenhum canal ou mensagem será excluído.',components:[row(button('confirm',id,'Confirmar encerramento',ButtonStyle.Danger))]});
    }
    if(['save-add','save-remove'].includes(action)&&i.isUserSelectMenu()){
      const target=i.values[0];
      if(!target||target===record.author)return await i.reply({...quiet,content:'O responsável não pode ser removido ou adicionado como integrante.'});
      await i.deferReply(quiet);
      const include=action==='save-add';
      if(include){
        const member=await i.guild.members.fetch(target).catch(()=>null);
        if(!member||member.user.bot||!member.roles.cache.some(r=>team.includes(r.name))||!i.channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel))return await i.editReply({content:'Escolha um integrante ativo com acesso à mesa.'});
        if(records.caseMembers(id).length>=50)return await i.editReply({content:'A mesa já tem 50 integrantes.'});
      }
      const changed=records.changeCaseMember(i.guildId,id,i.user.id,target,include);
      if(changed)await publishMesaPanel(i.guild,i.channel,records.get(i.guildId,id)).catch(e=>console.warn('Atualização visual pendente',e.code??e.name));
      return await i.editReply({content:changed?'Integrantes atualizados.':'A equipe já estava nesse estado ou a mesa foi encerrada.'});
    }
    if(action==='confirm'&&i.isButton()){
      await i.deferReply(quiet);
      const current=records.get(i.guildId,id);
      if(!current||current.closed||!canManageMesa(i.guild,i.channel,i.member,current,i.user.id))return await i.editReply({content:'Mesa já encerrada ou acesso alterado.'});
      records.add(i.guildId,id,i.user.id,'Encerramento','Mesa RP encerrada pelo painel de gerenciamento.');
      await i.channel.setName(mesaName(id,current.title,true)).catch(e=>console.warn('Nome de mesa encerrada pendente',e.code??e.name));
      const archived=await archiveMesaTopics(i.channel);
      let panelOk=false;
      try{panelOk=await publishMesaPanel(i.guild,i.channel,records.get(i.guildId,id));}catch(e){console.warn('Atualização visual pendente',e.code??e.name);}
      return await i.editReply({content:'Mesa encerrada. Tópicos arquivados: '+archived.archived+'.'+(archived.failed?' Falhas no arquivamento: '+archived.failed+'.':'')+(panelOk?'':' Painel visual pendente de atualização.')+' Histórico preservado; permissões do canal mantidas.'});
    }
    return await i.reply({...quiet,content:'Controle indisponível.'});
  }catch(e){
    console.error('Falha no painel da mesa',e.code??e.name);
    const payload={content:'Não foi possível concluir. Consulte o estado da mesa antes de tentar novamente.',allowedMentions:noMentions};
    if(i.deferred||i.replied)await i.editReply(payload).catch(()=>{});else await i.reply({...quiet,...payload}).catch(()=>{});
  }
}
