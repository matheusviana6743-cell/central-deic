import { ChannelType, PermissionFlagsBits as P, MessageFlags } from 'discord.js';

const prefix='deic-demo:v1:';
const legacyCategory='🧪・DEIC | Laboratório RP';
const info=(key,name,title,text)=>({key,name,title,text,kind:'info'});
const panel=(key,name,title,text,choices)=>({key,name,title,text,choices,kind:'panel'});
const view=(key,name,title,text,filter)=>({key,name,title,text,filter,kind:'view'});
const chat=(key,name)=>({key,name,kind:'chat'});
const voice=(key,name)=>({key,name,kind:'voice'});
export const sections=[
 {key:'recepcao',name:'01 ┃ 🏛️ RECEPÇÃO DEMO',channels:[
 info('welcome','👋・boas-vindas','Bem-vindo ao DEIC Demo','Explore os painéis da Central RP. Todos os personagens, histórias e protocolos são fictícios. Os seus testes são privados e reiniciam quando o bot reinicia.'),
 info('rules','📜・regras-da-demo','Regras do laboratório','Respeite os membros. Não use nomes, documentos, imagens ou dados de pessoas reais. Nenhuma função representa uma autoridade real.'),
 panel('ficha','🪪・ficha-de-personagem','Registro de personagem','Escolha um personagem de exemplo. O sistema gera uma ficha fictícia sem mudar seu apelido.',[['Aurora Lima','Ficha RP • Aurora Lima | 1001'],['Alex Vale','Ficha RP • Alex Vale | 1002']]),
 panel('recrutamento','📥・recrutamento','Recrutamento RP','Experimente a inscrição em um setor narrativo, sem receber permissões.',[['Formação','Inscrição • formação'],['Arquivo','Inscrição • arquivo'],['Atendimento','Inscrição • atendimento']]),
 info('hierarquia','🎖️・hierarquia','Hierarquia ilustrativa','Diretor · Delegado · Investigador · Escrivão · Perito · Agente em formação. São títulos de personagens, não permissões administrativas.')
 ]},
 {key:'convivencia',name:'02 ┃ 💬 CONVIVÊNCIA DEMO',channels:[
 chat('general','💬・chat-geral-demo'),chat('galeria','🎨・galeria-de-historias'),voice('lounge','☕・Sala de descanso'),voice('meet','🎙️・Conversa da equipe')
 ]},
 {key:'atendimento',name:'03 ┃ 🎫 ATENDIMENTO DEMO',channels:[
 panel('ticket','🎫・atendimento-demo','Atendimento','Abra um protocolo privado de simulação, sem criar um ticket real.',[['Dúvida sobre regras','Protocolo • regras RP'],['Dúvida sobre inscrição','Protocolo • inscrição'],['Sugestão de história','Protocolo • sugestão']]),
 view('tickets','📬・meus-atendimentos','Meus atendimentos','Consulte e finalize os seus protocolos de exemplo.','ticket'),
 panel('feedback','💡・sugestoes','Sugestões fictícias','Teste a fila de sugestões com exemplos prontos.',[['Evento narrativo','Sugestão • evento narrativo'],['Aula de integração','Sugestão • integração']])
 ]},
 {key:'mesas',name:'04 ┃ 🧩 MESAS NARRATIVAS DEMO',channels:[
 panel('mesa','🧩・mesas-narrativas','Criar mesa de história','Escolha uma história fictícia e acompanhe seu estado.',[['Biblioteca','Mesa • mistério da biblioteca'],['Museu','Mesa • enigma do museu'],['Festival','Mesa • surpresa no festival']]),
 view('active','📌・mesas-ativas','Mesas ativas','Consulte as mesas pendentes e conclua uma delas.','mesa:pending'),
 view('archive','🗃️・mesas-arquivadas','Mesas arquivadas','Veja as histórias já concluídas.','mesa:done'),
 voice('story','🧩・Sala de histórias')
 ]},
 {key:'arquivo',name:'05 ┃ 📂 RELATÓRIOS DEMO',channels:[
 panel('relatorio','📝・relatorios-rp','Relatório de cena','Gere um registro narrativo de exemplo.',[['Objeto perdido','Relatório • objeto perdido na biblioteca'],['Evento cultural','Relatório • evento cultural'],['Fim de sessão','Relatório • encerramento da sessão']]),
 view('historico','📂・arquivo-rp','Arquivo de relatórios','Consulte e finalize os relatórios de sua sessão.','relatorio'),
 panel('presenca','📅・presenca-rp','Participação','Simule a presença em atividades da comunidade.',[['Sessão narrativa','Presença • sessão narrativa'],['Aula RP','Presença • aula RP']])
 ]},
 {key:'academia',name:'06 ┃ 🎓 ACADEMIA DEMO',channels:[
 panel('academia','🎓・academia-rp','Academia de interpretação','Escolha uma aula fictícia.',[['Convivência','Aula • convivência'],['Criação de personagem','Aula • criação de personagem'],['Narrativa colaborativa','Aula • narrativa colaborativa']]),
 info('material','📚・material-de-formacao','Material de formação','Crie histórias de forma colaborativa, respeite os limites dos outros jogadores e mantenha a ficção separada da vida real.'),
 view('aulas','📅・minhas-aulas','Minhas aulas','Consulte e conclua sua inscrição fictícia.','academia'),
 voice('training','🎓・Sala de formação')
 ]},
 {key:'gabinete',name:'07 ┃ ⭐ GABINETE DEMO',channels:[
 view('gabinete','📊・gabinete-simulado','Gabinete simulado','Acompanhe somente os seus testes. Nenhum botão concede poderes reais.','all'),
 view('triagem','🪪・triagem-simulada','Triagem de fichas','Veja e conclua suas próprias inscrições de recrutamento.','recrutamento'),
 view('summary','📈・painel-de-atividade','Atividade de demonstração','Confira o resumo e limpe seus registros de teste.','all'),
 voice('meeting','⭐・Reunião de personagens')
 ]}
];
const channels=sections.flatMap(s=>s.channels);
const eph={flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}};
const sessions=new Map(),active=new Set();
export function demoTarget(id){const configured=process.env.DEIC_DEMO_GUILD_ID;return configured==='1444958228378288201'&&id===configured;}
function ownRows(i){const k=i.guildId+':'+i.user.id;if(!sessions.has(k)){if(sessions.size>=1000)sessions.delete(sessions.keys().next().value);sessions.set(k,{next:1,records:[]});}return sessions.get(k);}
const btn=(action,label,style=1)=>({type:2,style,custom_id:prefix+action,label});
function payload(c){
 const buttons=c.kind==='panel'?[...c.choices.map(([label],n)=>btn('create:'+c.key+':'+n,label)),btn('mine:'+c.key,'Meus registros',2)]:c.kind==='view'?[btn('mine:'+c.key,'Consultar'),...(c.filter.endsWith(':done')?[]:[btn('finish:'+c.key,'Concluir meu último',3)]),...(c.key==='summary'?[btn('reset:'+c.key,'Limpar meus testes',2)]:[])]:[];
 return {embeds:[{color:0x2563eb,title:c.title,description:c.text+'\n\n**DEIC DEMO** · Ficção RP · Não envie informações pessoais.',footer:{text:'Central RP · Sessão temporária e individual'}}],components:buttons.length?[{type:1,components:buttons}]:[],allowedMentions:{parse:[]}};
}
export async function registerDemo(guild){if(demoTarget(guild.id)){await guild.commands.create({name:'montar-demo-deic',description:'Publica os sete setores de demonstração DEIC',defaultMemberPermissions:P.ManageGuild});console.log('DEIC DEMO R2 | 7 setores | /montar-demo-deic registrado em '+guild.id);}}
function acl(g,me,kind){const v=kind==='voice',talk=kind==='chat';return [{id:g.id,allow:[P.ViewChannel,...(v?[P.Connect,P.Speak]:[P.ReadMessageHistory,...(talk?[P.SendMessages]:[])])],deny:v?[]:[...(talk?[]:[P.SendMessages]),P.CreatePublicThreads,P.CreatePrivateThreads,P.SendMessagesInThreads]},{id:me.id,allow:[P.ViewChannel,P.ReadMessageHistory,P.SendMessages,P.EmbedLinks,P.ManageChannels]}];}
async function mount(i){
 if(i.user.id!==i.guild.ownerId||!i.memberPermissions?.has(P.ManageGuild))return i.reply({...eph,content:'Somente o dono pode montar a demo.'});
 if(active.has(i.guildId))return i.reply({...eph,content:'Montagem em andamento.'});
 active.add(i.guildId);
 try{
 await i.deferReply(eph);const g=i.guild,me=await g.members.fetchMe();
 if(!me.permissions.has([P.ManageChannels,P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory]))throw Error('Confira as permissões do bot.');
 const before=await g.channels.fetch();
 let count=0,total=0;const newCategories=[];
 const oldCat=before.find(c=>c?.type===ChannelType.GuildCategory&&c.name===legacyCategory);
 for(const s of sections){
  let cat=before.find(c=>c?.type===ChannelType.GuildCategory&&c.name===s.name);
  if(!cat)cat=await g.channels.create({name:s.name,type:ChannelType.GuildCategory,permissionOverwrites:acl(g,me,'info')});
  newCategories.push(cat);
  for(const c of s.channels){
   const type=c.kind==='voice'?ChannelType.GuildVoice:ChannelType.GuildText;
   const marker=prefix+c.key;
   let ch=before.find(x=>x?.type===type&&(type===ChannelType.GuildText?x.topic===marker:x.parentId===cat.id&&x.name===c.name));
   if(ch&&type===ChannelType.GuildText&&ch.parentId!==cat.id){if(ch.parentId!==oldCat?.id)throw Error('Canal de demo em categoria não reconhecida: '+c.key);await ch.edit({parent:cat.id,lockPermissions:false,permissionOverwrites:acl(g,me,c.kind),name:c.name});}
   if(!ch)ch=await g.channels.create({name:c.name,type,parent:cat.id,permissionOverwrites:acl(g,me,c.kind),...(type===ChannelType.GuildText?{topic:marker}:{})});
   total++;
   if(['info','panel','view'].includes(c.kind)){const msgs=await ch.messages.fetch({limit:30});const existing=msgs.find(m=>m.author.id===me.id&&(m.components.some(r=>r.components.some(b=>b.customId?.startsWith(prefix)))||m.embeds.some(e=>e.footer?.text?.startsWith('Central RP · Sessão temporária'))));if(existing)await existing.edit(payload(c));else await ch.send(payload(c));if(c.kind!=='info')count++;}
  }
 }
 for(let n=0;n<newCategories.length;n++){try{await newCategories[n].setPosition(n);}catch(e){console.warn('Ordenação demo pendente',newCategories[n].id,e.code??e.name);}}
 // Never delete or expose legacy content. Old empty lab is left intact for manual review.
 await i.editReply({content:total+' canais de demo e '+count+' painéis interativos em '+sections.length+' setores. Os sete canais anteriores foram reaproveitados quando encontrados. Canais originais preservados; revise o histórico e as permissões antes de divulgar.'});
 }catch(e){if(i.deferred)await i.editReply({content:'Montagem incompleta: '+String(e.message).slice(0,200)}).catch(()=>{});else if(!i.replied)await i.reply({...eph,content:'Não foi possível iniciar.'}).catch(()=>{});}
 finally{active.delete(i.guildId);}
}
function select(records,c){const filter=c.kind==='panel'?c.key:c.filter;const [key,state]=filter.split(':');return records.filter(r=>(key==='all'||r.key===key)&&(!state||r.status===(state==='done'?'Concluído':'Pendente')));}
export async function handleDemo(i){
 if(!demoTarget(i.guildId))return;
 if(i.isChatInputCommand()&&i.commandName==='montar-demo-deic')return mount(i);
 if(!i.isButton()||!i.customId.startsWith(prefix)){if(i.isRepliable())await i.reply({...eph,content:'Este servidor está em modo demo. Use os novos painéis; as funções originais estão desativadas aqui.'}).catch(()=>{});return;}
 const [action,key,n]=i.customId.slice(prefix.length).split(':');const c=channels.find(p=>p.key===key);
 if(!c||i.channel?.topic!==prefix+key||!['panel','view'].includes(c.kind))return i.reply({...eph,content:'Painel indisponível. Utilize o painel atualizado.'});
 const session=ownRows(i),records=session.records;
 if(action==='create'&&c.kind==='panel'&&/^\d+$/.test(n??'')&&c.choices[Number(n)]){if(records.length>=50)return i.reply({...eph,content:'Limite de 50 testes. Limpe seus testes em painel-de-atividade.'});const r={key,id:session.next++,label:c.choices[Number(n)][1],status:'Pendente'};records.push(r);return i.reply({...eph,content:'✅ Teste #'+r.id+' · '+r.label});}
 if(action==='mine'){const list=select(records,c).slice(-12);return i.reply({...eph,content:list.length?list.map(r=>'#'+r.id+' · '+r.label+' · '+r.status).join('\n'):'Nenhum registro nesta sessão.'});}
 if(action==='finish'&&c.kind==='view'&&!c.filter.endsWith(':done')){const r=select(records,c).findLast(x=>x.status==='Pendente');if(r)r.status='Concluído';return i.reply({...eph,content:r?'Teste #'+r.id+' concluído.':'Nenhum registro pendente.'});}
 if(action==='reset'&&key==='summary'){records.length=0;return i.reply({...eph,content:'Seus testes foram limpos.'});}
 return i.reply({...eph,content:'Ação indisponível.'});
}
