import {ActionRowBuilder,ButtonBuilder,ButtonStyle,ChannelType,PermissionFlagsBits,StringSelectMenuBuilder} from 'discord.js';
import {panelCard} from './panel.js';
import {academyRow,navigationButton,participationRow} from './navigation.js';
import {team,sameChannelName,channelNameKey} from './deic.js';
import {formLayout,formKinds} from './form-model.js';
import {formPanelCard} from './forms.js';
import {hierarchyGroups,hierarchyCard,membersForHierarchy} from './organization.js';
import {selectedFormKinds,selectedTextChannels} from './template-panel-model.js';
import {panelId,savePanel,formSection,saveFormSection} from './records.js';
import {investigativeTemplate} from './template.js';
const mentions={parse:[]};
const row=(...items)=>new ActionRowBuilder().addComponents(...items);
const btn=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const key=channelNameKey;
const isPrivate=(guild,ch)=>ch.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)===false;
const isText=ch=>ch?.type===ChannelType.GuildText;
const card=(title,description,components=[],color=0x204c64)=>({embeds:[{color,author:{name:'CENTRAL DEIC · TRAVESSIA RP'},title,description,footer:{text:'DEIC · Comunidade de roleplay fictício'}}],components,allowedMentions:mentions});
const pretty=name=>key(name).replace(/-/g,' ').replace(/^./,s=>s.toUpperCase());
const guideText={
 'comunicados':'Acompanhe os avisos oficiais, eventos e novidades da comunidade RP.',
 'regras-e-orientacoes':'Respeite os demais participantes e as regras do servidor. Use somente informações fictícias do jogo. Não compartilhe dados pessoais reais. Em caso de dúvida, procure o atendimento.',
 'conversa-da-equipe':'Espaço para conversar sobre a comunidade, tirar dúvidas e combinar atividades fictícias.',
 'avisos-internos':'Comunicados da direção e informações administrativas da equipe.',
 'fotos-da-equipe':'Compartilhe capturas do jogo e registros de eventos da comunidade, sem fotos ou dados pessoais reais.',
 'central-de-plantao':'Consulte os canais disponíveis e as orientações para os registros fictícios de RP.',
 'agenda-de-aulas':'Informe tema, instrutor, data, horário e sala de aula. O material fica no canal de formação.',
 'material-de-formacao':'Consulte as aulas de conduta, regras do RP e funcionamento da comunidade.',
 'triagem-de-fichas':'Área reservada à direção para acompanhar solicitações de ingresso no RP. As fichas enviadas pelo sistema aparecem aqui.',
 'decisoes-da-direcao':'Registre as decisões administrativas, com assunto, responsável e data.',
 'acompanhamento-da-equipe':'Registre atividades de formação, reuniões e participação voluntária na comunidade.',
 'painel-da-direcao':'Área administrativa da direção. Acompanhe os atendimentos e a formação da equipe.',
 'painel-de-mesas':'Abra uma mesa de documentação fictícia do RP, com tópicos de informações e arquivos do jogo.',
};
async function upsert(guild,ch,payload){
 const id=panelId(guild.id,ch.id);
 let old=id?await ch.messages.fetch(id).catch(e=>{if(e.code===10008)return null;throw e;}):null;
 if(old?.author?.id!==guild.client.user.id)old=null;
 if(!old){
  const recent=await ch.messages.fetch({limit:50});
  const title=payload.embeds[0].title;
  old=recent.find(m=>m.author.id===guild.client.user.id&&m.embeds[0]?.title===title);
 }
 const message=old?await old.edit({...payload,allowedMentions:mentions}):await ch.send({...payload,allowedMentions:mentions});
 savePanel(guild.id,ch.id,message.id);
}
function panelFor(name,context){
 const n=key(name);
 if(n==='central-de-atendimento'){
  if(context.has('triagem-de-fichas'))return panelCard();
  return card('🛡️ Central de atendimento','Bem-vindo ao servidor de RP. Consulte as orientações e os canais disponíveis.',[row(navigationButton())]);
 }
 if(n==='abrir-ticket'){
  if(!context.directionReady)return card('🎫 Atendimento','Para abrir tickets, a direção precisa configurar seus cargos.');
  return card('🎫 Central de atendimento','Escolha um assunto para iniciar um atendimento privado com a direção.',[row(new StringSelectMenuBuilder().setCustomId('deic-panel:ticket').setPlaceholder('Escolha o assunto').addOptions([{label:'Suporte e dúvidas',value:'suporte',emoji:'💬'},{label:'Recrutamento e tag',value:'recrutamento',emoji:'🪪'},{label:'Assunto com a direção',value:'direcao',emoji:'🔐'}]))]);
 }
 if(n==='material-de-formacao')return card('📚 Material de formação',guideText[n],[academyRow()]);
 if(n==='escala-e-presenca')return card('📅 Escala e presença','Organize os horários e registre sua participação voluntária na comunidade.',[participationRow()]);
 if(n==='central-de-plantao')return card('🖥️ Central de plantão',guideText[n],[row(navigationButton())]);
 if(n==='painel-de-mesas')return card('🧩 Mesa de registros RP',guideText[n],[row(btn('rp:start-mesa:case','Criar mesa',ButtonStyle.Primary))]);
 return card('📌 '+pretty(name),guideText[n]??'Canal reservado à finalidade indicada no nome. Utilize somente documentação fictícia do jogo e respeite as permissões do setor.');
}
export async function publishTemplatePanels(guild,groups=Object.values(investigativeTemplate)){
 const channels=await guild.channels.fetch(),roles=await guild.roles.fetch();
 const selected=selectedTextChannels(groups,[...channels.values()],isText,ch=>isPrivate(guild,ch));
 const byName=new Map(selected.map(x=>[key(x.name),x.channel]));
 const active=new Map(),failures=[],notes=[];
 let published=0;
 for(const kind of selectedFormKinds(groups)){
  const spec=formLayout[kind];
  const chs=['entry','published','archived'].map(field=>selected.find(x=>sameChannelName(x.group.name,spec.category)&&sameChannelName(x.name,spec[field]))?.channel);
  if(chs.some(c=>!c)||new Set(chs.map(c=>c.parentId)).size!==1||chs.some(c=>!isPrivate(guild,c))){notes.push(spec.category+': destinos incompletos ou sem privacidade.');continue;}
  const [entry,output,archive]=chs,old=formSection(guild.id,kind);
  if(old&&[old.entry,old.published,old.archived].some((id,index)=>id!==chs[index].id)){notes.push(spec.category+': configuração anterior preservada; revise com /organizar-registros.');continue;}
  saveFormSection(guild.id,kind,entry.parentId,entry.id,output.id,archive.id);
  active.set(entry.id,kind);
 }
 const context={has:n=>byName.has(n),directionReady:team.slice(0,2).some(n=>roles.some(r=>r.name===n&&!r.managed))};
 for(const {name,channel} of selected){
  try{
   let payload;
   const n=key(name);
   const kind=active.get(channel.id);
   const layoutEntry=Object.entries(formLayout).find(([,layout])=>sameChannelName(name,layout.entry));
   if(kind)payload=formPanelCard(kind);
   else if(layoutEntry)payload=card('📋 '+formKinds[layoutEntry[0]].name,'Para habilitar o formulário, inclua também os canais de publicação e arquivo desta categoria.');
   else if(n==='hierarquia-deic'){
    const members=await membersForHierarchy(guild);
    payload={embeds:[hierarchyCard(hierarchyGroups(members,[...roles.values()]))],components:[],allowedMentions:mentions};
   }else{
    const destination=Object.entries(formLayout).find(([,layout])=>['published','archived'].some(field=>sameChannelName(name,layout[field])));
    if(destination)payload=card('📁 '+pretty(name),'Os registros fictícios '+(sameChannelName(name,destination[1].archived)?'arquivados':'publicados')+' serão exibidos abaixo. O painel de registro está na mesma categoria.');
    else payload=panelFor(name,context);
   }
   await upsert(guild,channel,payload);
   published++;
  }catch(e){console.warn('Painel não publicado',channel.id,e.code??e.name);failures.push(name);}
 }
 return {published,failures,notes};
}
