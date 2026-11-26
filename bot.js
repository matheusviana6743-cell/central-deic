import { publishTemplatePanels } from './template-panels.js';
import { channelChoices,restrictChannels,templatePlan,templateRoles } from './template.js';
import { handlesForms,handleForms } from './forms.js';
import { handlesMesaPanel, handleMesaPanel, publishExistingMesaPanels } from './mesa-panel.js';
import { handlesNavigation, handleNavigation, navigationRevision } from './navigation.js';
import { handlesParticipation, handleParticipation } from './participation.js';
import { handlesAcademy, handleAcademy } from './academy.js';
import { handlesWipe, handleWipe } from './wipe.js';
import { handleDesk, publishDesks } from './desks.js';
import { publishGuides } from './guides.js';
import { deicModules, matchesSectorChannel } from './deic.js';
import { handlesPanel, handlePanel } from './panel.js';
import { handlesIntake, handleIntake } from './intake.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Events, GatewayIntentBits, MessageFlags, PermissionFlagsBits, StringSelectMenuBuilder } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { customModule, modules, plan, presets } from './catalog.js';
import { applyPlan } from './setup.js';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('Preencha DISCORD_TOKEN no arquivo .env.');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const sessions = new Map();
const runningGuilds = new Set();
const previewLifetime = 10 * 60 * 1000;
const privateMessage = { flags: MessageFlags.Ephemeral };
const noMentions = { parse: [] };

setInterval(() => {
  for (const [id, session] of sessions) {
    if (session.expires <= Date.now()) sessions.delete(id);
  }
}, 60000).unref();

function sessionPlan(session){
  const groups=plan(session.selected,session.custom);
  if(!session.customizable)return groups;
  const selectedGroups=groups.map((g,index)=>index<session.selected.length?restrictChannels(g,session.channelSelections[session.selected[index]]):g);
  return templatePlan(selectedGroups,session.optionalRoles);
}
function preview(id, session) {
  const choices = session.available;
  const groups = sessionPlan(session);
  const lines = groups.map(group => [
    `**${group.name}**`,
    group.channels.map(name => `#${name}`).join(', '),
    group.access?.length ? '🔒 Área interna por cargo' : '',
    group.voice?.length ? `Voz: ${group.voice.join(', ')}` : '',
    group.roles?.length ? `Cargos: ${group.roles.join(', ')}` : '',
  ].filter(Boolean).join('\n'));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`base:select:${id}`).setPlaceholder('Escolha os módulos')
    .setMinValues(0).setMaxValues(choices.length)
    .addOptions(choices.map(value => ({
      value, label: modules[value].name, default: session.selected.includes(value),
    })));
  const apply = new ButtonBuilder().setCustomId(`base:apply:${id}`)
    .setLabel('Aplicar estrutura').setStyle(ButtonStyle.Success).setDisabled(!groups.length);
  const cancel = new ButtonBuilder().setCustomId(`base:cancel:${id}`)
    .setLabel('Cancelar').setStyle(ButtonStyle.Secondary);
  const controls=[new ActionRowBuilder().addComponents(select)];
  if(session.customizable){
    if(!session.selected.includes(session.focus))session.focus=session.selected[0];
    if(session.focus){
      const focus=new StringSelectMenuBuilder().setCustomId('base:focus:'+id).setPlaceholder('Escolha a categoria para editar canais').addOptions(session.selected.map(value=>({value,label:modules[value].name,default:value===session.focus})));
      controls.push(new ActionRowBuilder().addComponents(focus));
      const entries=channelChoices(modules[session.focus]);
      const enabled=session.channelSelections[session.focus]??entries.map(e=>e.value);
      if(entries.length){
        const channels=new StringSelectMenuBuilder().setCustomId('base:channels:'+id).setPlaceholder('Selecione os canais desta categoria').setMinValues(0).setMaxValues(entries.length).addOptions(entries.map(e=>({...e,default:enabled.includes(e.value)})));
        controls.push(new ActionRowBuilder().addComponents(channels));
      }
    }
    const required=new Set(groups.flatMap(g=>g.access??[]));
    const optional=templateRoles.filter(role=>!required.has(role));
    if(optional.length){
      const roles=new StringSelectMenuBuilder().setCustomId('base:roles:'+id).setPlaceholder('Selecione cargos opcionais').setMinValues(0).setMaxValues(optional.length).addOptions(optional.map(role=>({label:role,value:role,default:session.optionalRoles.includes(role)})));
      controls.push(new ActionRowBuilder().addComponents(roles));
    }
  }
  controls.push(new ActionRowBuilder().addComponents(apply,cancel));
  let description=[`**Prévia · ${session.title}**`,...lines,'Ajuste os módulos abaixo. A prévia vale por 10 minutos.'].join('\n\n');
  if(session.customizable){
    const roles=[...new Set(groups.flatMap(g=>[...(g.roles??[]),...(g.access??[])]))];
    description+= '\n\n**Cargos previstos:** '+(roles.join(', ')||'Nenhum')+'\nCargos necessários para categorias privadas são incluídos automaticamente. Modelo de comunidade fictícia RP: não copia registros, pessoas nem permissões de outro servidor.';
  }
  if(description.length>4050)description=description.slice(0,3990)+'\n… Consulte os módulos e canais nos menus.';
  return {embeds:[{color:0x245589,description}],components:controls,allowedMentions:noMentions};
}

client.on(Events.InteractionCreate, async interaction => {
  if (handlesForms(interaction)) return handleForms(interaction);
  if (handlesMesaPanel(interaction)) return handleMesaPanel(interaction);
  if (handlesNavigation(interaction)) return handleNavigation(interaction);
  if (handlesParticipation(interaction)) return handleParticipation(interaction);
  if (handlesAcademy(interaction)) return handleAcademy(interaction);
  if (handlesWipe(interaction)) return handleWipe(interaction);
  if (interaction.customId?.startsWith('rp:')) return handleDesk(interaction);
  if (handlesPanel(interaction)) return handlePanel(interaction);
  if (handlesIntake(interaction)) return handleIntake(interaction);
  const command = interaction.isChatInputCommand() && interaction.commandName === 'montar';
  const component = interaction.isMessageComponent() && interaction.customId.startsWith('base:');
  if (!command && !component) return;
  try {
    if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.reply({ ...privateMessage, content: 'Você precisa da permissão Gerenciar servidor.' });
    }

    if (command) {
      const preset = presets[interaction.options.getString('modelo', true)];
      if (!preset) return await interaction.reply({ ...privateMessage, content: 'Modelo indisponível.' });
      let custom;
      try {
        custom = customModule(interaction.options.getString('categoria'), interaction.options.getString('canais'));
      } catch (error) {
        return await interaction.reply({ ...privateMessage, content: error.message });
      }
      const id = randomUUID();
      const session = {
        owner: interaction.user.id, guild: interaction.guildId, title: preset.name,
        available: preset.themed ? preset.modules : Object.keys(modules).filter(key => !modules[key].themed),
        selected: [...preset.modules], custom, customizable:Boolean(preset.customizable), channelSelections:{}, optionalRoles:[...templateRoles], focus:preset.modules[0], expires: Date.now() + previewLifetime,
      };
      sessions.set(id, session);
      return await interaction.reply({ ...privateMessage, ...preview(id, session) });
    }

    const [, action, id] = interaction.customId.split(':');
    const session = sessions.get(id);
    if (!session || session.expires <= Date.now() || session.guild !== interaction.guildId || session.owner !== interaction.user.id) {
      return await interaction.reply({ ...privateMessage, content: 'Esta prévia expirou ou pertence a outro gestor. Use /montar.' });
    }
    if (action === 'select' && interaction.isStringSelectMenu()) {
      session.selected = [...new Set(interaction.values)].filter(key => session.available.includes(key));
      return await interaction.update(preview(id, session));
    }
    if(session.customizable&&interaction.isStringSelectMenu()){
      if(action==='focus'&&session.selected.includes(interaction.values[0])){
        session.focus=interaction.values[0];return await interaction.update(preview(id,session));
      }
      if(action==='channels'&&session.selected.includes(session.focus)){
        const allowed=new Set(channelChoices(modules[session.focus]).map(e=>e.value));
        session.channelSelections[session.focus]=[...new Set(interaction.values)].filter(v=>allowed.has(v));return await interaction.update(preview(id,session));
      }
      if(action==='roles'){
        const required=new Set(sessionPlan(session).flatMap(g=>g.access??[]));
        session.optionalRoles=templateRoles.filter(r=>required.has(r)?session.optionalRoles.includes(r):interaction.values.includes(r));return await interaction.update(preview(id,session));
      }
    }
    if (action === 'cancel') {
      sessions.delete(id);
      return await interaction.update({ content: 'Configuração cancelada.', components: [], embeds: [] });
    }
    if (action !== 'apply') return;
    const groups = sessionPlan(session);
    if (!groups.length || runningGuilds.has(interaction.guildId)) {
      return await interaction.reply({ ...privateMessage, content: 'Escolha um módulo ou aguarde a configuração em andamento neste servidor.' });
    }

    runningGuilds.add(interaction.guildId);
    const counts = { categories: 0, channels: 0, roles: 0 };
    try {
      await interaction.deferUpdate();
      sessions.delete(id);
      await applyPlan(interaction.guild ?? await client.guilds.fetch(interaction.guildId), groups, counts);
      let panelSummary='';
      if (session.customizable) {
        const result=await publishTemplatePanels(interaction.guild,groups);
        panelSummary='\nPainéis publicados/atualizados: '+result.published+'.'+(result.failures.length?' Pendentes: '+result.failures.join(', ')+'.':'')+(result.notes.length?'\n'+result.notes.join('\n'):'');
      } else if (session.title === presets.deic.name) {
        await publishDesks(interaction.guild, groups);
        await publishGuides(interaction.guild, groups);
      }
      await interaction.editReply({
        content: (`Estrutura aplicada. Novos itens: ${counts.categories} categorias, ${counts.channels} canais e ${counts.roles} cargos.`+panelSummary).slice(0,1900),
        components: [], embeds: [],
      });
    } catch (error) {
      console.error('Falha ao aplicar em', interaction.guildId, error.code ?? error.message);
      if (!interaction.deferred) throw error;
      const detail = error.constructor === Error ? error.message : 'Confira as permissões do bot e os limites do servidor.';
      await interaction.editReply({
        content: `A configuração parou após criar ${counts.categories} categorias, ${counts.channels} canais e ${counts.roles} cargos. ${detail} Use /montar para tentar de novo.`,
        components: [], embeds: [], allowedMentions: noMentions,
      });
    } finally {
      runningGuilds.delete(interaction.guildId);
    }
  } catch (error) {
    console.error('Falha na interação.', error.code ?? error.name);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ ...privateMessage, content: 'Houve um erro. Tente /montar de novo.' }).catch(() => {});
    }
  }
});

client.once(Events.ClientReady, async ready => {
  console.log('Servidor Base conectado como '+ready.user.tag+' | revisão paineis-r7 / '+navigationRevision);
  for(const guild of ready.guilds.cache.values()){
    const reception=deicModules.deicRecepcao;
    try {
      await publishExistingMesaPanels(guild);
      const channels=await guild.channels.fetch();
      if(!channels.some(c=>matchesSectorChannel(c,reception,reception.channels[0]))) { console.log('Painéis: recepção não reconhecida no servidor '+guild.id); continue; }
      console.log('Painéis: recepção reconhecida; atualizando mensagens existentes no servidor '+guild.id);
      await publishDesks(guild, Object.values(deicModules));
      await publishGuides(guild, Object.values(deicModules));
      console.log('Painéis: atualização concluída no servidor '+guild.id);
    }
    catch(error){console.error('Falha ao atualizar recepção',guild.id,error.code??error.name);}
  }
});
try {
  await client.login(token);
} catch (error) {
  console.error('Falha ao conectar ao Discord.', error.code ?? error.name);
  process.exitCode = 1;
}





