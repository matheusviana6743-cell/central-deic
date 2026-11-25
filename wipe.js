import { clearGuild } from './records.js';
import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const pending = new Map();
const running = new Set();
export const wipeCommand = new SlashCommandBuilder()
  .setName('apagar-tudo')
  .setDescription('Limpar canais, cargos e registros deste servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export function handlesWipe(i) {
  return (i.isChatInputCommand() && ['apagar-tudo', 'apagar-canais'].includes(i.commandName))
    || (i.isButton() && i.customId.startsWith('wipe:'));
}

export async function handleWipe(i) {
  if (!i.inGuild() || !i.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return i.reply({ flags:MessageFlags.Ephemeral, content:'Este comando exige Administrador no servidor.' });
  }
  try {
    if (i.isChatInputCommand()) {
      await i.deferReply({ flags:MessageFlags.Ephemeral });
      const channels = await i.guild.channels.fetch();
      const roles = await i.guild.roles.fetch();
      const roleCount = roles.filter(role => role.id !== i.guildId && !role.managed).size;
      const count = channels.filter(channel => channel && !channel.isThread()).size;
      const id = randomUUID();
      pending.set(id, { user:i.user.id, guild:i.guildId, expires:Date.now()+120000 });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wipe:confirm:'+id).setLabel('Apagar tudo').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('wipe:cancel:'+id).setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
      );
      return i.editReply({
        content:`⚠️ **Apagar ${count} canais e categorias e ${roleCount} cargos de ${i.guild.name}?**\nMensagens, tickets e tópicos dentro deles serão apagados definitivamente. Cargos comuns e registros da DEIC também serão apagados. Cargos de integração e @everyone dependem do Discord. Confirme em até 2 minutos.`,
        components:[row], allowedMentions:{parse:[]},
      });
    }
    const [,action,id] = i.customId.split(':');
    const request = pending.get(id);
    if (!request || request.user!==i.user.id || request.guild!==i.guildId || request.expires<Date.now()) {
      return i.reply({flags:MessageFlags.Ephemeral,content:'Esta confirmação expirou ou pertence a outra pessoa.'});
    }
    pending.delete(id);
    if(action==='cancel') return i.update({content:'Limpeza cancelada.',components:[]});
    if(action!=='confirm') return;
    if(running.has(i.guildId)) return i.reply({flags:MessageFlags.Ephemeral,content:'Já existe uma limpeza em andamento.'});
    running.add(i.guildId);
    try {
      await i.update({content:'Apagando canais. O canal deste comando será processado por último.',components:[]});
      const channels = await i.guild.channels.fetch();
      const targets = [...channels.values()].filter(channel => channel && !channel.isThread());
      targets.sort((a,b) => (a.id===i.channelId?2:a.type===ChannelType.GuildCategory?1:0) - (b.id===i.channelId?2:b.type===ChannelType.GuildCategory?1:0));
      const failures=[];
      let removed=0;
      let rolesRemoved=0;
      for(const channel of targets) {
        if(channel.id===i.channelId) {
          await i.editReply({content:`Canais apagados até agora: ${removed}. Falhas: ${failures.length}. Processando este canal por último.`}).catch(()=>{});
        }
        try { await channel.delete(`Limpeza solicitada por ${i.user.id}`); removed++; }
        catch(error) { failures.push({name:channel.name,code:error.code ?? error.name}); }
      }
      const roles = await i.guild.roles.fetch();
      for (const role of roles.values()) {
        if(role.id===i.guildId || role.managed) continue;
        try { await role.delete('Limpeza solicitada por '+i.user.id); rolesRemoved++; }
        catch(error) { failures.push({name:'Cargo '+role.name,code:error.code ?? error.name}); }
      }
      let recordsCleared=false;
      if(failures.length===0) { clearGuild(i.guildId); recordsCleared=true; }
      const result=`Limpeza de ${i.guild.name}: ${removed} canais e categorias e ${rolesRemoved} cargos apagados. ${failures.length} falhas. Registros DEIC ${recordsCleared ? "apagados" : "preservados devido às falhas"}.` +
        (failures.length ? '\nFalhas: '+failures.map(f=>f.name+' ('+f.code+')').join(', ').slice(0,1200) : '');
      await i.user.send({content:result,allowedMentions:{parse:[]}}).catch(()=>{});
      await i.editReply({content:result,components:[]}).catch(()=>{});
      console.log(result);
    } finally {running.delete(i.guildId);}
  } catch(error) {
    console.error('Falha na limpeza',error.code ?? error.name);
    if(i.deferred || i.replied) await i.editReply({content:'Falha ao preparar a limpeza. Confira as permissões do bot.',components:[]}).catch(()=>{});
    else await i.reply({flags:MessageFlags.Ephemeral,content:'Falha ao preparar a limpeza.'}).catch(()=>{});
  }
}

