import { migrate } from './archive.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, ModalBuilder, PermissionFlagsBits, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from 'discord.js';
import { deicModules as modules, team, intelligence } from './deic.js';
import * as records from './records.js';
import { panelCard, ticketMenu } from './panel.js';

const row = (...items) => new ActionRowBuilder().addComponents(...items);
const button = (id,label,style=ButtonStyle.Secondary) => new ButtonBuilder().setCustomId('rp:'+id).setLabel(label).setStyle(style);
const quiet = {flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}};
const sectors = { case: modules.deicInterna, intel: modules.deicIntel, wanted: modules.deicIntel, admin: modules.deicComando };
const labels = {case:'Caso',intel:'Dossiê RP',wanted:'Procurado RP'};
const locks = new Set();
const field = (id,label,max,short=false) => row(new TextInputBuilder().setCustomId(id).setLabel(label).setRequired(true).setMaxLength(max).setStyle(short?TextInputStyle.Short:TextInputStyle.Paragraph));
const modal = (i,id,title,...fields) => i.showModal(new ModalBuilder().setCustomId('rp:'+id).setTitle(title).addComponents(...fields));
const say = (i,content) => i.editReply({content,allowedMentions:{parse:[]}});
const input = (i,id) => i.fields.getTextInputValue(id).trim();
const color = 0x204c64;

export function deskCard(kind) {
  if (kind==='public') return panelCard();
  const activities = {
    tocaia: ['🎯  Tocaia RP','Organize a cena na cidade. Abra o caso relacionado e use **Abrir tocaia** para criar a sala de voz. Depois, registre o resultado no histórico.'],
    mesa: ['🧩  Mesa de investigação','Reúna a equipe para analisar a cena. Abra o caso e escolha **Abrir mesa** para criar a sala de voz e guardar as decisões no histórico.'],
    relatorio: ['📝  Relatórios de RP','Registre o trabalho realizado em um caso. Consulte a investigação e use **Adicionar relato**, **Vincular evidência** ou **Registrar QRR**.'],
  };
  if (activities[kind]) return {embeds:[{color,author:{name:'POLÍCIA CIVIL  •  TRAVESSIA RP'},title:activities[kind][0],description:activities[kind][1],footer:{text:'DEIC  •  Central de plantão'}}],components:[row(button('list:case:0','Selecionar caso',ButtonStyle.Primary),button('find:case','Pesquisar caso'))]};
  if (kind==='ticket') {
    const card = panelCard();
    card.embeds = [{color, author:{name:'POLÍCIA CIVIL  •  TRAVESSIA RP'}, title:'🎫  Central de Atendimento', description:'**Como podemos ajudar?**\n\nEscolha o assunto no menu abaixo. Um canal reservado será aberto para você conversar com a equipe da DEIC.\n\nTenha em mãos as informações do personagem e os registros da cena, caso sejam necessários.', footer:{text:'DEIC  •  Atendimento e acompanhamento'}}];
    card.components = [ticketMenu()];
    return card;
  }
  const admin = kind==='admin', intel = kind==='intel';
  const title = admin?'Gabinete da direção':intel?'Arquivo de inteligência':'Central de plantão';
  const description = admin
    ? '**Acompanhe a equipe e organize o expediente.**\n\n📊 Consulte a produção registrada e o andamento dos atendimentos.\n🪪 Acesse as fichas de ingresso e a gestão da inteligência.\n📁 Organize os canais da estrutura anterior.'
    : intel
      ? '**Informação organizada para as investigações da cidade.**\n\n🗂️ Cadastre personagens e organizações do RP.\n🔎 Pesquise os registros disponíveis ao seu setor.\n📝 Acrescente atualizações e referências aos casos.'
      : '**Uma central para o trabalho da equipe em Travessia.**\n\n📁 Abra e acompanhe investigações.\n📸 Reúna relatos, prints e clipes no histórico do caso.\n🎙️ Dentro do caso, abra uma mesa ou tocaia e registre o resultado da cena.';
  return {embeds:[{color,author:{name:'POLÍCIA CIVIL  •  TRAVESSIA RP'},title:'DEIC  |  '+title,description,footer:{text:'Polícia Civil • Travessia RP'}}],components:admin?
    [row(button('stats','Produção da equipe',ButtonStyle.Primary),button('queue','Fichas e tickets'),button('access','Acesso à inteligência'),button('archive','Canais antigos'))]:
    [row(button('new:'+kind,intel?'Cadastrar dossiê':'Abrir caso',ButtonStyle.Primary),button('list:'+kind+':0','Consultar registros'),button('find:'+kind,'Pesquisar')), ...(intel?[row(button('new:wanted','Cadastrar procurado RP'),button('list:wanted:0','Ver procurados RP'),button('find:wanted','Consultar passaporte RP'),button('catalog:wanted','Baixar catálogo'))]:[])]};
}

export async function publishDesks(guild, groups) {
  const channels = await guild.channels.fetch();
  const desks = [[modules.deicRecepcao,'public',0],[modules.deicTickets,'ticket',0],[modules.deicInterna,'case',0],[modules.deicInterna,'tocaia',1],[modules.deicInterna,'mesa',2],[modules.deicInterna,'relatorio',3],[modules.deicIntel,'intel',0],[modules.deicComando,'admin',0]];
  for (const [sector,kind,index] of desks) {
    if (!groups.some(g=>g.name===sector.name)) continue;
    const channel = channels.find(c=>c?.type===ChannelType.GuildText && c.name===sector.channels[index] && c.parent?.name===sector.name);
    if (!channel) continue;
    const card = deskCard(kind);
    const id = records.panelId(guild.id,channel.id);
    let msg = id ? await channel.messages.fetch(id).catch(e=>{if(e.code!==10008)throw e;return null;}) : null;
    if (!msg) msg=(await channel.messages.fetch({limit:50})).find(m=>m.author.id===guild.client.user.id && (m.embeds[0]?.title===card.embeds[0].title || (kind==='public' && m.embeds[0]?.title==='DEIC | Central de Atendimento') || (kind==='ticket' && m.embeds[0]?.title==='DEIC | Abrir atendimento') || (['case','intel','admin'].includes(kind) && m.embeds[0]?.title===card.embeds[0].title.replace('DEIC  |  ','DEIC | '))));
    msg=msg?await msg.edit(card):await channel.send(card);
    records.savePanel(guild.id,channel.id,msg.id);
  }
}

function listing(i,kind,page,encoded='') {
  const term=Buffer.from(encoded,'base64url').toString();
  const results=records.search(i.guildId,kind,term,page);
  if (!results.length) return say(i,'Nenhum registro encontrado.');
  const menu=new StringSelectMenuBuilder().setCustomId('rp:pick:'+kind).setPlaceholder('Abrir registro').addOptions(results.slice(0,10).map(r=>({label:('#'+r.id+' · '+r.title).slice(0,100),value:String(r.id),description:r.closed?'Encerrado':'Em andamento'})));
  const navigation=[];
  if(page) navigation.push(button(['list',kind,page-1,encoded].join(':'),'Anterior'));
  if(results.length>10) navigation.push(button(['list',kind,page+1,encoded].join(':'),'Próxima'));
  return i.editReply({content:'**'+(term?'Resultado da pesquisa':'Registros do setor')+'**',components:[row(menu),...(navigation.length?[row(...navigation)]:[])]});
}

function detail(i,record,page=0) {
  const entries=records.history(record.id,page);
  const stem=record.kind+':'+record.id;
  const controls=[];
  if(record.kind==='case') controls.push(row(button('export:'+stem,'Exportar histórico'),...(record.closed?[button('reopen:'+stem,'Reabrir caso')]:[])));
  if (!record.closed) {
    controls.push(row(button('note:'+stem,'Adicionar relato'),button('evidence:'+stem,'Vincular evidência'),button('finish:'+stem,'Encerrar',ButtonStyle.Danger)));
    if(record.kind==='case') controls.push(row(button('mesa:'+stem,'Abrir mesa'),button('tocaia:'+stem,'Abrir tocaia'),button('qrr:'+stem,'Registrar QRR'),button('transfer:'+stem,'Passar caso'),button('crew:'+stem,'Equipe')));
  }
  if(records.roomList(i.guildId,record.id).length) controls.push(row(button('release:'+stem,'Finalizar salas vazias')));
  const nav=[];
  if(page) nav.push(button('view:'+stem+':'+(page-1),'Mais recentes'));
  if(entries.length>3) nav.push(button('view:'+stem+':'+(page+1),'Mais antigas'));
  if(nav.length) controls.push(row(...nav));
  return i.editReply({allowedMentions:{parse:[]},embeds:[{color,title:labels[record.kind]+' #'+record.id+' · '+record.title,
    description:(record.closed?'Encerrado':'Em andamento')+' • Responsável <@'+record.author+'>',
    fields:entries.slice(0,3).map(e=>({name:e.kind,value:'<@'+e.actor+'> · <t:'+e.stamp+':f>\n'+e.body}))}],components:controls});
}

async function sessionRoom(i,record,kind) {
  const key=i.guildId+':'+record.id;
  if(locks.has(key)) return say(i,'A sala está sendo atualizada.');
  locks.add(key);
  try {
    const existing=records.roomList(i.guildId,record.id);
    for(const room of existing.filter(r=>kind==='release'||r.kind===kind)) {
      const ch=await i.guild.channels.fetch(room.channel,{force:true}).catch(e=>{if(e.code!==10003)throw e;return null;});
      if(!ch) {records.forgetRoom(room.channel);continue;}
      if(kind!=='release') return say(i,'Sala disponível em <#'+ch.id+'>.');
      if(ch.parentId!==i.channel.parentId || ch.type!==ChannelType.GuildVoice || ch.members.size) continue;
      await ch.delete('Sessão RP finalizada pelo painel');
      records.forgetRoom(room.channel);
    }
    if(kind==='release') return say(i,'Salas restantes deste caso: '+records.roomList(i.guildId,record.id).length+'. Salas ocupadas continuam abertas.');
    const ch=await i.guild.channels.create({type:ChannelType.GuildVoice,parent:i.channel.parentId,name:(kind==='mesa'?'Mesa':'Tocaia RP')+' · Caso '+record.id});
    records.saveRoom(i.guildId,ch.id,record.id,kind);
    records.add(i.guildId,record.id,i.user.id,kind==='mesa'?'Mesa':'Tocaia RP','Sala de voz aberta para a cena.');
    return say(i,'Entre em <#'+ch.id+'>. Registre o resultado no histórico do caso.');
  } finally {locks.delete(key);}
}

export async function handleDesk(i) {
  const [,action,kind,arg,extra]=i.customId.split(':');
  const sector=sectors[kind]??sectors.admin;
  const authorized=i.guild && i.channel?.parent?.name===sector.name && (kind==='case' ? sector.channels.includes(i.channel?.name) : i.channel?.name===sector.channels[0]) &&
    (i.user.id===i.guild.ownerId || i.member.roles.cache.some(r=>sector.access.includes(r.name)));
  if(!authorized) return i.reply({...quiet,content:'Este controle pertence ao painel reservado do seu setor.'});
  try {
    const chief = i.user.id===i.guild.ownerId || i.member.roles.cache.some(r=>team.slice(0,2).includes(r.name));
    if(action==='reopen' && kind==='case' && chief) return await modal(i,'reopen-save:case:'+arg,'Reabrir caso',field('body','Motivo da reabertura',850));
    if(action==='new' && kind==='wanted') return await modal(i,'create:wanted','Cadastrar procurado RP',field('passport','Passaporte do personagem RP',16,true),field('title','Nome do personagem RP',55,true),field('body','Resumo ficcional e link de print do jogo',850));
    if(action==='new') return await modal(i,'create:'+kind,'Abrir '+labels[kind],field('title','Título ou nome do personagem RP',80,true),field('body','Resumo da cena e referências do jogo',850));
    if(action==='find') return await modal(i,'search:'+kind,'Pesquisar registros',field('query',kind==='wanted'?'Passaporte do personagem RP':'Número, nome ou palavra do histórico',16,true));
    const notes={note:'Relato',evidence:'Evidência',finish:'Encerramento',qrr:'Registro QRR'};
    if(notes[action]) return await modal(i,'save:'+kind+':'+arg+':'+action,notes[action],field('body',action==='evidence'?'Link do print ou clipe e contexto da cena':'Resumo para o histórico',850));
    await i.deferReply(quiet);
    if(action==='create'){
      const title=input(i,'title'), body=input(i,'body');
      if(!title||!body) return await say(i,'Preencha o título e o resumo.');
      let name=title;
      if(kind==='wanted'){
        const passport=input(i,'passport');
        if(!/^\d{1,16}$/.test(passport)) return await say(i,'Informe o passaporte numérico do personagem RP.');
        if(records.search(i.guildId,kind,passport,0).some(r=>!r.closed)) return await say(i,'Já existe um cadastro ativo para esse passaporte RP.');
        name=passport+' | '+title;
      }
      const id=records.create(i.guildId,kind,name,i.user.id,body);
      return await detail(i,records.get(i.guildId,id));
    }
    if(action==='catalog' && kind==='wanted'){
      const active=records.activeWanted(i.guildId);
      if(active.length>500) return await say(i,'O catálogo excede 500 fichas ativas. Consulte pelo passaporte RP.');
      const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const cards=active.map(record=>{
        const photo=record.body.match(/https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\/[^\s<>"']+/i)?.[0];
        return '<article><h2>'+escape(record.title)+'</h2><p>'+escape(record.body)+'</p>'+(photo?'<img loading="lazy" alt="Print do personagem RP" src="'+escape(photo)+'">':'')+'</article>';
      });
      const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>Procurados RP | DEIC</title><style>body{margin:3rem auto;padding:0 1rem;max-width:56rem;background:#101923;color:#edf0f4;font:1rem system-ui}h1{color:#ebcd88}article{background:#1b2938;padding:1rem;margin:1rem 0;border-radius:12px}p{white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style><h1>Procurados RP</h1><p>DEIC · Travessia RP · Personagens fictícios</p>'+(cards.join('')||'<p>Nenhuma ficha ativa.</p>')+'</html>';
      return await i.editReply({content:'Catálogo interno de personagens de Travessia RP.',files:[{attachment:Buffer.from(html),name:'procurados-travessia.html'}]});
    }
    if(action==='search') return await listing(i,kind,0,Buffer.from(input(i,'query')).toString('base64url'));
    if(action==='list') return await listing(i,kind,Number(arg),extra);
    if(['archive','hide','restore'].includes(action)){
      if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator)) return await say(i,'Somente o administrador do servidor pode arquivar e restaurar canais.');
      if(action==='archive') return await i.editReply({content:await migrate(i.guild,'preview'),components:[row(button('hide','Confirmar arquivamento',ButtonStyle.Danger),button('restore','Restaurar permissões'))]});
      return await say(i,await migrate(i.guild,action));
    }
    if(action==='stats'){
      const totals=records.totals(i.guildId), production=records.production(i.guildId);
      return await say(i,['**Acervo do servidor**',...totals.map(x=>labels[x.kind]+' · '+(x.closed?'encerrados':'em andamento')+' · '+x.n),'**Atividade registrada nos últimos 7 dias**',...production.map(x=>'<@'+x.actor+'> · '+x.kind+' · '+x.n),...(!production.length?['Ainda não há atividade registrada.']:[])].join('\n'));
    }
    if(action==='queue'){
      const channels=await i.guild.channels.fetch();
      const tickets=channels.filter(c=>c?.parent?.name===modules.deicTickets.name && c.topic?.startsWith('deic-ticket|'));
      const review=channels.find(c=>c?.parent?.name===modules.deicComando.name && c.name==='🪪・triagem-de-fichas');
      return await say(i,'**Atendimento**\nAbertos: '+tickets.filter(c=>c.topic.includes('|aberto|')).size+' • Encerrados: '+tickets.filter(c=>c.topic.includes('|encerrado|')).size+'\n**Aprovações e cargos de ingresso**\n'+(review?'<#'+review.id+'>':'Reaplique o módulo Gabinete.'));
    }
    if(action==='access') return await i.editReply({content:'Selecione um integrante para gerenciar o acesso ao arquivo de inteligência.',components:[row(new UserSelectMenuBuilder().setCustomId('rp:member'))]});
    if(action==='member') return await i.editReply({content:'Acesso de <@'+i.values[0]+'>',components:[row(button('grant:admin:'+i.values[0],'Conceder acesso'),button('remove:admin:'+i.values[0],'Remover acesso',ButtonStyle.Danger))]});
    if(action==='grant'||action==='remove'){
      const target=await i.guild.members.fetch({user:arg,force:true});
      const roles=(await i.guild.roles.fetch()).filter(r=>r.name===intelligence&&!r.managed);
      const role=roles.size===1?roles.first():null;
      if(!role?.editable || role.permissions.bitfield!==0n || target.user.bot || !target.manageable) return await say(i,'Confira a hierarquia e o cargo de Inteligência.');
      if(action==='grant' && !target.roles.cache.some(r=>team.includes(r.name))) return await say(i,'Aprove o ingresso desse integrante primeiro.');
      await target.roles[action==='grant'?'add':'remove'](role,'Gabinete DEIC • '+i.user.id);
      return await say(i,'Acesso departamental atualizado para <@'+arg+'>.');
    }
    const record=records.get(i.guildId,Number(action==='pick'?i.values[0]:arg));
    if(!record||record.kind!==kind) return await say(i,'Registro indisponível neste setor.');
    if(['crew','crew-add','crew-drop','crew-save-add','crew-save-drop'].includes(action)){
      if(record.kind!=='case' || record.closed || (!chief && record.author!==i.user.id)) return await say(i,'A chefia ou o responsável pode editar a equipe de um caso aberto.');
      if(action==='crew'){
        const members=records.caseMembers(record.id);
        return await i.editReply({content:'**Equipe do caso #'+record.id+'**\n'+(members.map(x=>'<@'+x.member+'>').join(', ') || 'Nenhum integrante designado.'),allowedMentions:{parse:[]},components:[row(button('crew-add:case:'+record.id,'Adicionar integrante'),button('crew-drop:case:'+record.id,'Remover integrante'))]});
      }
      if(action==='crew-add'||action==='crew-drop') return await i.editReply({content:'Selecione o integrante.',components:[row(new UserSelectMenuBuilder().setCustomId('rp:crew-save-'+(action==='crew-add'?'add':'drop')+':case:'+record.id))]});
      const include=action==='crew-save-add';
      if(include){
        const member=await i.guild.members.fetch(i.values[0]);
        if(member.user.bot || !member.roles.cache.some(role=>team.includes(role.name))) return await say(i,'Selecione um integrante ativo da DEIC.');
        if(records.caseMembers(record.id).length>=50) return await say(i,'A equipe já tem 50 integrantes.');
      }
      return await say(i,records.changeCaseMember(i.guildId,record.id,i.user.id,i.values[0],include)?'Equipe atualizada.':'A equipe já estava nesse estado.');
    }
    if(action==='reopen-save'){
      if(!chief || record.kind!=='case') return await say(i,'Apenas a chefia pode reabrir casos.');
      const reason=input(i,'body');
      if(!reason || !records.reopen(i.guildId,record.id,i.user.id,reason)) return await say(i,'Informe um motivo para reabrir um caso encerrado.');
    }
    if(action==='export' && record.kind==='case'){
      const header='Caso #'+record.id+' — '+record.title;
      const lines=[header];
      let bytes=Buffer.byteLength(header);
      for(const entry of records.timeline(record.id)){
        const line='\n'+new Date(entry.stamp*1000).toISOString()+' | '+entry.kind+' | '+entry.actor+'\n'+entry.body;
        bytes+=Buffer.byteLength(line);
        if(bytes>7_000_000) return await say(i,'O histórico excede o limite de exportação.');
        lines.push(line);
      }
      return await i.editReply({files:[{attachment:Buffer.from(lines.join('')),name:'caso-'+record.id+'.txt'}]});
    }
    if(action==='transfer'||action==='handoff'){
      const chief=i.guild.ownerId===i.user.id || i.member.roles.cache.some(r=>team.slice(0,2).includes(r.name));
      if(record.closed||record.kind!=='case'||(!chief && record.author!==i.user.id)) return await say(i,'A passagem de um caso aberto cabe ao responsável ou à chefia.');
      if(action==='transfer') return await i.editReply({content:'Selecione quem assume o caso #'+record.id+'.',components:[row(new UserSelectMenuBuilder().setCustomId('rp:handoff:case:'+record.id))]});
      const next=await i.guild.members.fetch({user:i.values[0],force:true});
      if(next.user.bot || !next.roles.cache.some(r=>team.includes(r.name)))return await say(i,'Escolha um integrante ativo da DEIC.');
      records.handoff(i.guildId,record.id,i.user.id,record.author,next.id);
    }
    if(action==='save'){
      const body=input(i,'body');
      if(!body||!notes[extra]) return await say(i,'Informe o conteúdo do registro.');
      if(extra==='finish' && record.author!==i.user.id && i.guild.ownerId!==i.user.id && !i.member.roles.cache.some(r=>team.slice(0,2).includes(r.name))) return await say(i,'O responsável pelo registro ou a chefia pode encerrar.');
      records.add(i.guildId,record.id,i.user.id,notes[extra],body);
    }
    if(['mesa','tocaia','release'].includes(action) && record.kind==='case' && (!record.closed||action==='release')) return await sessionRoom(i,record,action);
    return await detail(i,records.get(i.guildId,record.id),action==='view'?Number(extra):0);
  } catch(error){
    console.error('Painel DEIC',error.code??error.name);
    const content='Não foi possível concluir. Consulte o registro atualizado e confira as permissões do bot.';
    if(i.deferred||i.replied) await say(i,content).catch(()=>{}); else await i.reply({...quiet,content}).catch(()=>{});
  }
}



