import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { deicModules, team, intelligence } from './deic.js';
const options = { flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };
const teamRoles=new Set([...team,intelligence]);
export const navigationCommand=new SlashCommandBuilder().setName('central').setDescription('Abra sua central de navegação da DEIC RP');
export const navigationButton=()=>new ButtonBuilder().setCustomId('central:open').setLabel('Central de navegação').setStyle(ButtonStyle.Secondary);
export const participationRow=()=>new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('community:perfil').setLabel('Meu perfil').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('community:presenca').setLabel('Registrar presença').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('community:ranking').setLabel('Ranking').setStyle(ButtonStyle.Secondary));
export const academyRow=(includeProfile=true)=>new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('academy:menu').setLabel('Abrir academia').setStyle(ButtonStyle.Primary),
  ...(includeProfile?[new ButtonBuilder().setCustomId('community:perfil').setLabel('Meu progresso').setStyle(ButtonStyle.Secondary)]:[]));
export function handlesNavigation(i){return (i.isChatInputCommand()&&i.commandName==='central')||(i.isButton()&&i.customId==='central:open');}
export async function handleNavigation(i){
  try{
    if(!i.inGuild()||!i.guild||!i.member?.roles?.cache) return await i.reply({...options,content:'Abra a central dentro do servidor.'});
    await i.deferReply(options);
    const channels=await i.guild.channels.fetch();
    const fields=[];
    for(const section of Object.values(deicModules)){
      const visible=section.channels.map(name=>channels.find(c=>c?.type===ChannelType.GuildText&&c.name===name&&c.parent?.name===section.name&&c.permissionsFor(i.member)?.has('ViewChannel'))).filter(Boolean);
      if(visible.length)fields.push({name:section.name,value:visible.map(c=>'<#'+c.id+'>').join(' · ')});
    }
    const isTeam=i.member.roles.cache.some(r=>teamRoles.has(r.name));
    await i.editReply({embeds:[{color:0x245589,title:'DEIC · Central de navegação',description:'Selecione um canal disponível para o seu cargo. A visibilidade acompanha as permissões do Discord.',fields,footer:{text:'Travessia RP · Ambiente fictício'}}],components:isTeam?[participationRow(),academyRow(false)]:[],allowedMentions:{parse:[]}});
  }catch(e){
    console.error('Falha na navegação',e.code??e.name);
    const payload={content:'Não foi possível carregar a central.',allowedMentions:{parse:[]}};
    if(i.deferred||i.replied) await i.editReply(payload).catch(()=>{});
    else await i.reply({...options,...payload}).catch(()=>{});
  }
}
