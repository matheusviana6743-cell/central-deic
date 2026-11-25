import { ActionRowBuilder,ButtonBuilder,ButtonStyle,ChannelType,MessageFlags,ModalBuilder,OverwriteType,PermissionFlagsBits,SlashCommandBuilder,TextInputBuilder,TextInputStyle } from 'discord.js';
import { team } from './deic.js';
import { formKinds,formPayload,formCard } from './form-model.js';
import * as db from './records.js';
const quiet={flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}},mentions={parse:[]};
const row=(...items)=>new ActionRowBuilder().addComponents(...items);
const btn=(action,id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId('forms:'+action+':'+id).setLabel(label).setStyle(style);
const locks=new Set();
const eligible=m=>Boolean(m?.roles?.cache?.some(r=>team.includes(r.name)));
const chief=i=>i.user.id===i.guild.ownerId||Boolean(i.member?.roles?.cache?.some(r=>team.slice(0,2).includes(r.name)));
const privateChannel=(g,c)=>c?.type===ChannelType.GuildText&&c.permissionsFor(g.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)===false;
const view=(c,m)=>c.permissionsFor(m)?.has(PermissionFlagsBits.ViewChannel)===true;
const edit=(i,content)=>i.editReply({content,allowedMentions:mentions});
export const formCommands=[
 new SlashCommandBuilder().setName('organizar-registros').setDescription('Cria as centrais privadas de registros RP sem apagar canais').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('foto-registro').setDescription('Anexa uma imagem fictícia ao seu rascunho').addAttachmentOption(o=>o.setName('foto').setDescription('Captura de tela do jogo ou arte fictícia').setRequired(true))
];
function panel(kind){
 const spec=formKinds[kind];
 return {allowedMentions:mentions,embeds:[{color:0x245589,author:{name:'CENTRAL DEIC · TRAVESSIA RP'},title:spec.icon+' '+spec.name,description:'Abra um rascunho privado, preencha o formulário e confira a prévia antes de publicar. Use apenas conteúdo fictício do jogo, sem dados pessoais reais.',footer:{text:'Registro · Publicação · Arquivo'}}],components:[row(btn('start',kind,'Registrar',ButtonStyle.Primary),btn('list',kind,'Lista de registros'))]};
}
async function setup(i){
 if(!chief(i)||!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))return i.reply({...quiet,content:'A direção administra a estrutura de registros.'});
 await i.deferReply(quiet);
 const key='setup:'+i.guildId;if(locks.has(key))return edit(i,'Configuração em andamento.');locks.add(key);
 try{
 const g=i.guild,roles=await g.roles.fetch(),bot=await g.members.fetchMe();
 const names=roles.filter(r=>!r.managed&&team.includes(r.name));
 if(!names.size||new Set(names.map(r=>r.name)).size!==names.size)return edit(i,'Confira os cargos DEIC antes de configurar.');
 const access=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory];
 const permissionOverwrites=[{id:g.id,type:OverwriteType.Role,deny:[PermissionFlagsBits.ViewChannel]},{id:bot.id,type:OverwriteType.Member,allow:[...access,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]},...names.map(r=>({id:r.id,type:OverwriteType.Role,allow:access,deny:[PermissionFlagsBits.SendMessages,PermissionFlagsBits.CreatePublicThreads,PermissionFlagsBits.CreatePrivateThreads,PermissionFlagsBits.SendMessagesInThreads]}))];
 for(const [kind,spec] of Object.entries(formKinds)){
  let channels=await g.channels.fetch();const old=db.formSection(g.id,kind);
  const name=spec.icon+'・DEIC | '+spec.name+' · Registros';
  let cat=old&&channels.get(old.category);
  if(!cat)cat=channels.find(c=>c?.type===ChannelType.GuildCategory&&c.name===name);
  if(!cat)cat=await g.channels.create({name,type:ChannelType.GuildCategory,permissionOverwrites});
  if(cat.permissionsFor(g.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)!==false)throw Error('Categoria não privada');
  const ids=[];
  for(const [field,label] of [['entry','🖥️・registrar'],['published','📄・publicados'],['archived','🔒・arquivados']]){
   let ch=old&&channels.get(old[field]);
   if(!ch)ch=channels.find(c=>c?.type===ChannelType.GuildText&&c.parentId===cat.id&&c.name===label);
   if(!ch)ch=await g.channels.create({name:label,type:ChannelType.GuildText,parent:cat.id});
   if(ch.parentId!==cat.id||!privateChannel(g,ch))throw Error('Canal não privado');
   ids.push(ch.id);
   if(field==='entry'){
    const recent=await ch.messages.fetch({limit:30});
    const previous=recent.find(m=>m.author.id===g.client.user.id&&m.embeds[0]?.title===spec.icon+' '+spec.name);
    if(previous)await previous.edit(panel(kind));else await ch.send(panel(kind));
   }
  }
  db.saveFormSection(g.id,kind,cat.id,...ids);
 }
 return edit(i,'Centrais de registros configuradas. Os canais anteriores foram preservados.');
 }finally{locks.delete(key);}
}
function draftModal(r){
 const data=JSON.parse(r.payload);const spec=formKinds[r.kind];
 const modal=new ModalBuilder().setCustomId('forms:save:'+r.id).setTitle('Registro · '+spec.name);
 for(const [key,label] of spec.fields){
  const input=new TextInputBuilder().setCustomId(key).setLabel(label).setStyle(TextInputStyle.Paragraph).setMaxLength(700).setRequired(true);
  if(data[key])input.setValue(data[key]);
  modal.addComponents(row(input));
 }
 return modal;
}
function draftControls(id){return row(btn('fill',id,'Preencher / modificar',ButtonStyle.Primary),btn('preview',id,'Prévia'),btn('cancel',id,'Cancelar',ButtonStyle.Danger));}
function previewControls(id){return row(btn('publish',id,'Publicar',ButtonStyle.Success),btn('fill',id,'Modificar'),btn('cancel',id,'Cancelar',ButtonStyle.Danger));}
async function target(i,r,field){
 const cfg=db.formSection(i.guildId,r.kind);
 const ch=cfg&&await i.guild.channels.fetch(cfg[field]);
 if(!privateChannel(i.guild,ch)||ch.parentId!==cfg.category||!view(ch,i.member))throw Error('Destino sem acesso privado');
 return ch;
}
async function start(i,kind){
 const spec=formKinds[kind],cfg=db.formSection(i.guildId,kind);
 if(!spec||!cfg||cfg.entry!==i.channelId||!privateChannel(i.guild,i.channel)||!view(i.channel,i.member))return i.reply({...quiet,content:'Use a central de registros autorizada.'});
 await i.deferReply(quiet);
 const key='draft:'+i.guildId+':'+i.user.id+':'+kind;if(locks.has(key))return edit(i,'Rascunho em preparação.');locks.add(key);
 try{
 const g=i.guild,bot=await g.members.fetchMe();
 const visible=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.SendMessages];
 const ch=await g.channels.create({name:'📝・rascunho-'+kind+'-'+i.user.id.slice(-6),type:ChannelType.GuildText,parent:cfg.category,permissionOverwrites:[{id:g.id,type:OverwriteType.Role,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,type:OverwriteType.Member,allow:visible},{id:bot.id,type:OverwriteType.Member,allow:[...visible,PermissionFlagsBits.ManageChannels]}]});
 const id=db.formStart(g.id,i.user.id,kind,ch.id);
 await ch.send({allowedMentions:mentions,embeds:[{color:0x245589,title:'📝 Rascunho #'+id,description:'Preencha os campos do formulário. Depois, se desejar, use /foto-registro com uma imagem do jogo ou selecione Sem foto / prévia. Revise antes de publicar. Não envie dados ou fotos de pessoas reais.'}],components:[row(btn('fill',id,'Preencher relatório',ButtonStyle.Primary),btn('preview',id,'Sem foto / prévia'),btn('cancel',id,'Cancelar',ButtonStyle.Danger))]});
 return edit(i,'Rascunho aberto em <#'+ch.id+'>.');
 }finally{locks.delete(key);}
}
async function preview(i,r){
 const payload=JSON.parse(r.payload);if(!formPayload(r.kind,payload))return i.reply({...quiet,content:'Preencha primeiro todos os campos.'});
 return i.reply({...quiet,embeds:[formCard(r.kind,r.id,payload)],components:[previewControls(r.id)]});
}
async function publish(i,r){
 const payload=JSON.parse(r.payload);if(!formPayload(r.kind,payload))return i.reply({...quiet,content:'Preencha primeiro todos os campos.'});
 await i.deferReply(quiet);
 if(!db.formTransition(i.guildId,r.id,'draft','publishing'))return edit(i,'Registro já processado.');
 try{
 const ch=await target(i,r,'published');
 const message=await ch.send({allowedMentions:mentions,embeds:[formCard(r.kind,r.id,payload,'Publicado')],components:[row(btn('archive',r.id,'Arquivar',ButtonStyle.Secondary))]});
 if(!db.formPublish(i.guildId,r.id,ch.id,message.id))throw Error('Estado inesperado após publicar');
 await edit(i,'Registro publicado em <#'+ch.id+'>.');
 await i.channel.delete('Rascunho publicado').catch(()=>{});
 }catch(e){console.error('Publicação pendente de revisão',e.code??e.name);return edit(i,'Publicação não confirmada. A direção deve verificar o estado antes de tentar novamente. O rascunho foi preservado.');}
}
async function archive(i,r){
 if(!chief(i)||r.published_channel!==i.channelId||r.state!=='published')return i.reply({...quiet,content:'A direção arquiva registros publicados no canal correto.'});
 await i.deferReply(quiet);
 if(!db.formTransition(i.guildId,r.id,'published','archiving'))return edit(i,'Registro já processado.');
 try{
 const ch=await target(i,r,'archived'),payload=JSON.parse(r.payload);
 const msg=await ch.send({allowedMentions:mentions,embeds:[formCard(r.kind,r.id,payload,'Arquivado')]});
 if(!db.formArchive(i.guildId,r.id,ch.id,msg.id))throw Error('Estado inesperado');
 await i.channel.messages.delete(r.published_message).catch(async()=>{const old=await i.channel.messages.fetch(r.published_message);await old.edit({embeds:[formCard(r.kind,r.id,payload,'Arquivado')],components:[]});});
 return edit(i,'Registro arquivado em <#'+ch.id+'>.');
 }catch(e){console.error('Arquivo pendente de revisão',e.code??e.name);return edit(i,'Arquivamento pendente de verificação pela direção.');}
}
export function handlesForms(i){return (i.isChatInputCommand()&&['organizar-registros','foto-registro'].includes(i.commandName))||i.customId?.startsWith('forms:');}
export async function handleForms(i){
 try{
 if(!i.inGuild()||!i.guild||!i.member||(!eligible(i.member)&&!chief(i)))return i.reply({...quiet,content:'Disponível para a equipe autorizada de RP.'});
 if(i.isChatInputCommand()&&i.commandName==='organizar-registros')return await setup(i);
 if(i.isChatInputCommand()){
  const r=db.formByChannel(i.guildId,i.channelId),photo=i.options.getAttachment('foto',true);
  if(!r||r.owner!==i.user.id||r.state!=='draft'||!privateChannel(i.guild,i.channel)||!view(i.channel,i.member))return i.reply({...quiet,content:'Use seu próprio canal de rascunho.'});
  if(!/^image\/(png|jpeg|webp|gif)$/.test(photo.contentType??'')||photo.size>8000000||!/^https:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(photo.url))return i.reply({...quiet,content:'Envie uma imagem do jogo de até 8 MB.'});
  const payload=JSON.parse(r.payload);
  if(!db.formSave(i.guildId,r.id,{...payload,photo:photo.url}))return i.reply({...quiet,content:'Rascunho indisponível.'});
  return i.reply({...quiet,content:'Imagem vinculada. Confira a prévia.',components:[draftControls(r.id)]});
 }
 const [,action,value]=i.customId.split(':');
 if(action==='start')return await start(i,value);
 if(action==='list'){
  const cfg=db.formSection(i.guildId,value);
  if(!cfg||cfg.entry!==i.channelId||!privateChannel(i.guild,i.channel)||!view(i.channel,i.member))return i.reply({...quiet,content:'Use a central autorizada.'});
  const rows=db.formList(i.guildId,value);
  return i.reply({...quiet,content:rows.length?rows.map(r=>'#'+r.id+' · https://discord.com/channels/'+i.guildId+'/'+r.published_channel+'/'+r.published_message).join('\n').slice(0,1900):'Nenhum registro publicado.'});
 }
 if(!/^\d+$/.test(value))return i.reply({...quiet,content:'Registro inválido.'});
 const r=db.formGet(i.guildId,Number(value));
 if(!r||!privateChannel(i.guild,i.channel)||!view(i.channel,i.member))return i.reply({...quiet,content:'Registro indisponível.'});
 if(action==='archive')return await archive(i,r);
 if(r.channel!==i.channelId||r.owner!==i.user.id||r.state!=='draft')return i.reply({...quiet,content:'Somente o autor do rascunho pode editar.'});
 if(action==='fill')return i.showModal(draftModal(r));
 if(action==='save'&&i.isModalSubmit()){
  const payload=formPayload(r.kind,Object.fromEntries(formKinds[r.kind].fields.map(([key])=>[key,i.fields.getTextInputValue(key)])));
  if(!payload)return i.reply({...quiet,content:'Revise os campos.'});
  const old=JSON.parse(r.payload);
  if(!db.formSave(i.guildId,r.id,{...payload,...(old.photo?{photo:old.photo}:{})}))return i.reply({...quiet,content:'Rascunho indisponível.'});
  return i.reply({...quiet,content:'Dados salvos. Envie uma imagem usando /foto-registro ou abra a prévia sem foto.',components:[draftControls(r.id)]});
 }
 if(action==='preview')return await preview(i,r);
 if(action==='publish')return await publish(i,r);
 if(action==='cancel'){
  if(!db.formTransition(i.guildId,r.id,'draft','cancelled'))return i.reply({...quiet,content:'Registro indisponível.'});
  await i.reply({...quiet,content:'Rascunho cancelado.'});return await i.channel.delete('Rascunho cancelado');
 }
 return i.reply({...quiet,content:'Controle indisponível.'});
 }catch(e){
 console.error('Falha registros RP',e.code??e.name);
 const p={content:'Não foi possível concluir. Verifique as permissões e o estado do registro.',allowedMentions:mentions};
 if(i.deferred||i.replied)await i.editReply(p).catch(()=>{});else await i.reply({...quiet,...p}).catch(()=>{});
 }
}
