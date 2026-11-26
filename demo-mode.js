import { ChannelType, PermissionFlagsBits as P, MessageFlags } from 'discord.js';

const prefix = 'deic-demo:v1:';
const categoryName = '🧪・DEIC | Laboratório RP';
const panels = [
  {key:'ficha', name:'🪪・ficha-de-personagem', title:'Identidade RP', text:'Crie uma ficha de exemplo com nome e passaporte inventados pelo sistema.', label:'Criar ficha fictícia', result:'Ficha de personagem Aurora • exemplo'},
  {key:'recrutamento', name:'📥・recrutamento', title:'Recepção e recrutamento', text:'Experimente uma inscrição fictícia, sem atribuir cargos ou alterar apelidos.', label:'Simular inscrição', result:'Inscrição fictícia recebida'},
  {key:'mesa', name:'🧩・mesas-narrativas', title:'Mesas de histórias', text:'Experimente o ciclo de uma mesa de RP usando uma história inventada.', label:'Abrir mesa de exemplo', result:'Mesa narrativa • Mistério da biblioteca'},
  {key:'relatorio', name:'📝・relatorios-rp', title:'Arquivo de relatórios RP', text:'Gere uma amostra de relatório sobre uma cena de ficção, sem dados de pessoas reais.', label:'Gerar relatório fictício', result:'Relatório • objeto perdido na biblioteca'},
  {key:'academia', name:'🎓・academia-rp', title:'Academia de interpretação', text:'Simule uma inscrição para uma aula de regras, convivência e interpretação.', label:'Simular inscrição em aula', result:'Aula • interpretação e convivência'},
  {key:'ticket', name:'🎫・atendimento-demo', title:'Atendimento de teste', text:'Crie um protocolo de exemplo sem abrir um canal real de atendimento.', label:'Abrir protocolo fictício', result:'Protocolo • dúvida sobre regras RP'},
  {key:'gabinete', name:'📊・gabinete-simulado', title:'Gabinete simulado', text:'Veja apenas seus próprios testes e experimente finalizar ou reiniciar registros.', label:'Ver resumo dos meus testes'}
];
const eph = {flags:MessageFlags.Ephemeral, allowedMentions:{parse:[]}};
const rows = new Map();
const active = new Set();

export function demoTarget(id) {
  const configured = process.env.DEIC_DEMO_GUILD_ID;
  return !!configured && /^\d{17,20}$/.test(configured) && configured === id;
}
function ownRows(i) {
  const key = i.guildId + ':' + i.user.id;
  if (!rows.has(key)) {
    if (rows.size >= 1000) rows.delete(rows.keys().next().value);
    rows.set(key, []);
  }
  return rows.get(key);
}
function btn(action, label, style=1) { return {type:2,style,custom_id:prefix+action,label}; }
function payload(p) {
  const buttons = p.key==='gabinete'
    ? [btn('mine:all',p.label),btn('finish:all','Concluir meu último teste',3),btn('reset:all','Limpar meus testes',2)]
    : [btn('create:'+p.key,p.label),btn('mine:'+p.key,'Meus testes',2)];
  return {embeds:[{color:0x2563eb,title:p.title,description:p.text+'\n\n**Modo demonstração** • somente ficção; não envie informações pessoais.',footer:{text:'CENTRAL RP · DEIC DEMO • sessão temporária'}}],components:[{type:1,components:buttons}],allowedMentions:{parse:[]}};
}
export async function registerDemo(guild) {
  if (!demoTarget(guild.id)) return;
  await guild.commands.create({name:'montar-demo-deic',description:'Publica o laboratório fictício sem alterar os canais originais',defaultMemberPermissions:P.ManageGuild});
}
async function mount(i) {
  if(i.user.id!==i.guild.ownerId || !i.memberPermissions?.has(P.ManageGuild))return i.reply({...eph,content:'Somente o dono do servidor pode montar a demo.'});
  if(active.has(i.guildId))return i.reply({...eph,content:'Já existe uma montagem em andamento.'});
  active.add(i.guildId);
  try {
    await i.deferReply(eph);
    const g=i.guild;
    const me=await g.members.fetchMe();
    if(!me.permissions.has([P.ManageChannels,P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory]))throw Error('Confira as permissões de canais e mensagens do bot.');
    const channels=await g.channels.fetch();
    const acl=[{id:g.id,allow:[P.ViewChannel,P.ReadMessageHistory],deny:[P.SendMessages,P.CreatePublicThreads,P.CreatePrivateThreads,P.SendMessagesInThreads]}, {id:me.id,allow:[P.ViewChannel,P.ReadMessageHistory,P.SendMessages,P.EmbedLinks,P.ManageChannels]}];
    let cat=channels.find(c=>c.type===ChannelType.GuildCategory&&c.name===categoryName);
    // Only create new channels, never change legacy permissions or delete history.
    if(!cat)cat=await g.channels.create({name:categoryName,type:ChannelType.GuildCategory,permissionOverwrites:acl});
    let count=0;
    for(const p of panels){
      const marker='deic-demo:v1:'+p.key;
      let ch=channels.find(c=>c.type===ChannelType.GuildText&&c.parentId===cat.id&&c.topic===marker);
      if(!ch)ch=await g.channels.create({name:p.name,type:ChannelType.GuildText,parent:cat.id,topic:marker,permissionOverwrites:acl});
      const msgs=await ch.messages.fetch({limit:30});
      const existing=msgs.find(m=>m.author.id===me.id&&m.components.some(r=>r.components.some(b=>b.customId?.startsWith(prefix))));
      if(existing)await existing.edit(payload(p));else await ch.send(payload(p));
      count++;
    }
    await i.editReply({content:count+' painéis publicados. Os canais e registros antigos não foram alterados. Revise a visibilidade do histórico antes de divulgar o convite.'});
  }catch(error){if(i.deferred)await i.editReply({content:'Montagem incompleta: '+String(error.message).slice(0,150)}).catch(()=>{});else if(!i.replied)await i.reply({...eph,content:'Não foi possível iniciar.'}).catch(()=>{});}
  finally{active.delete(i.guildId);}
}
export async function handleDemo(i) {
  if(!demoTarget(i.guildId))return;
  if(i.isChatInputCommand()&&i.commandName==='montar-demo-deic')return mount(i);
  if(!i.isButton()||!i.customId.startsWith(prefix)){
    if(i.isRepliable())await i.reply({...eph,content:'Este servidor está em modo demonstração. Use os painéis do laboratório; os sistemas originais estão desativados aqui.'}).catch(()=>{});
    return;
  }
  if(!i.channel?.topic?.startsWith(prefix))return i.reply({...eph,content:'Painel indisponível neste canal.'});
  const [action,key]=i.customId.slice(prefix.length).split(':');
  const p=panels.find(x=>x.key===key);
  const records=ownRows(i);
  if(action==='create'&&p?.result&&i.channel.topic===prefix+key){
    if(records.length>=50)return i.reply({...eph,content:'Limite de 50 testes nesta sessão. Limpe seus testes no gabinete.'});
    const record={key,label:p.result,status:'Pendente',id:records.length+1};
    records.push(record);
    return i.reply({...eph,content:'✅ Teste #'+record.id+' · '+record.label});
  }
  if(action==='mine'&&(key==='all'?i.channel.topic===prefix+'gabinete':p&&i.channel.topic===prefix+key)){
    const list=records.filter(r=>key==='all'||r.key===key).slice(-12);
    return i.reply({...eph,content:list.length?list.map(r=>'#'+r.id+' · '+r.label+' · '+r.status).join('\n'):'Nenhum teste nesta sessão.'});
  }
  if(i.channel.topic===prefix+'gabinete'&&key==='all'){
    if(action==='reset'){records.length=0;return i.reply({...eph,content:'Seus testes foram limpos.'});}
    if(action==='finish'){const r=records.findLast(x=>x.status==='Pendente');if(r)r.status='Concluído';return i.reply({...eph,content:r?'Teste #'+r.id+' concluído.':'Nenhum teste pendente.'});}
  }
  return i.reply({...eph,content:'Ação indisponível.'});
}
