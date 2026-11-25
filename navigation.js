import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { deicModules, matchesSectorChannel } from './deic.js';
const options = { flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };
export const navigationRevision='central-2026-11-25-r3';
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
export function navigationText(channels, member) {
  let content='**DEIC · Central de navegação**\nCanais disponíveis conforme suas permissões:';
  let count=0;
  for (const section of Object.values(deicModules)) {
    const visible=section.channels.map(name=>channels.find(c=>c?.type===ChannelType.GuildText&&matchesSectorChannel(c,section,name)&&c.permissionsFor(member)?.has('ViewChannel'))).filter(Boolean);
    if (!visible.length) continue;
    const line='\n\n**'+section.name+'**\n'+visible.map(c=>'<#'+c.id+'>').join(' · ');
    if(content.length+line.length>1850) break;
    content+=line; count+=visible.length;
  }
  if (!count) content+='\n\nNenhum canal configurado foi encontrado para seu acesso. Informe a administração.';
  return {content:content+'\n\n-# '+navigationRevision,count};
}
export async function handleNavigation(i){
  try{
    if(!i.inGuild()||!i.guild||!i.member) return await i.reply({...options,content:'Abra a central dentro do servidor.'});
    await i.deferReply(options);
    const channels=await i.guild.channels.fetch();
    const {content,count}=navigationText(channels,i.member);
    console.log('Central '+navigationRevision+' | canais visíveis: '+count);
    await i.editReply({content,embeds:[],components:[],allowedMentions:{parse:[]}});
  }catch(e){
    console.error('Falha na navegação '+navigationRevision,e.code??e.name);
    const payload={content:'Não foi possível carregar a central. Referência: '+navigationRevision,embeds:[],components:[],allowedMentions:{parse:[]}};
    if(i.deferred||i.replied) await i.editReply(payload).catch(()=>{});
    else await i.reply({...options,...payload}).catch(()=>{});
  }
}
