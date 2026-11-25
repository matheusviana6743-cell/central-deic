import { navigationButton } from './navigation.js';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, ModalBuilder,
  OverwriteType, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder,
  TextInputBuilder, TextInputStyle, UserSelectMenuBuilder,
} from 'discord.js';
import { deicModules, team, sameChannelName, matchesSectorChannel } from './deic.js';
import { applyPlan } from './setup.js';
import { intakeChannel, submitIntake } from './intake.js';

const prefix = 'deic-panel:';
const central = '🖥️・central-de-atendimento';
const ticketCategory = '🎫・DEIC | Atendimento';
const privateReply = { flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };
const agents = team.slice(0, 4);
const ticketTypes = {
  consulta: { label: 'Consulta de personagem RP', icon: '🔎' },
  suporte: { label: 'Suporte e dúvidas', icon: '💬' },
  ocorrencia: { label: 'Ocorrência RP', icon: '📋' },
  recrutamento: { label: 'Recrutamento e tag', icon: '🪪' },
  direcao: { label: 'Assunto com a direção', icon: '🔐' },
};
const locks = new Set();
const button = (action, label, style) => new ButtonBuilder().setCustomId(prefix + action).setLabel(label).setStyle(style);
const row = (...items) => new ActionRowBuilder().addComponents(...items);
const tell = (interaction, content) => interaction.deferred || interaction.replied
  ? interaction.editReply({ content, allowedMentions: { parse: [] } })
  : interaction.reply({ ...privateReply, content });

export const panelCommand = new SlashCommandBuilder()
  .setName('painel-deic').setDescription('Publique ou atualize a central da DEIC')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export function handlesPanel(interaction) {
  return interaction.isChatInputCommand() ? interaction.commandName === 'painel-deic'
    : (interaction.isMessageComponent() || interaction.isModalSubmit()) && interaction.customId.startsWith(prefix);
}

function isPanelRoom(channel) {
  return channel?.type === ChannelType.GuildText && matchesSectorChannel(channel,deicModules.deicRecepcao,central);
}

export function ticketMenu() {
  return row(new StringSelectMenuBuilder().setCustomId(prefix + 'ticket')
    .setPlaceholder('Abrir ticket • escolha um assunto')
    .addOptions(Object.entries(ticketTypes).map(([value, entry]) => ({ value, label: entry.label, emoji: entry.icon }))));
}
export function panelCard() {
  return {
    allowedMentions: { parse: [] },
    embeds: [{
      color: 0x183b58,
      author: { name: 'POLÍCIA CIVIL • TRAVESSIA RP' },
      title: '🛡️  DEIC  |  Central de Atendimento',
      description: 'Bem-vindo à DEIC de Travessia RP.\n\n**🪪 Registro de integrante**\nClique em **Registrar**, selecione quem recrutou seu personagem e preencha seu nome RP e passaporte. A direção analisará sua ficha.',
      footer: { text: 'DEIC • Registro de integrantes' },
    }],
    components: [row(button('intake', 'Registrar', ButtonStyle.Primary), navigationButton())],
  };
}

async function publish(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return tell(interaction, 'Gerenciar servidor é necessário para publicar a central.');
  await interaction.deferReply(privateReply);
  const channels = await interaction.guild.channels.fetch();
  const channel = channels.find(isPanelRoom);
  if (!channel) return tell(interaction, 'Reaplique o módulo Recepção da DEIC para criar a central.');
  const recent = await channel.messages.fetch({ limit: 50 });
  const previous = recent.find(message => message.author.id === interaction.client.user.id
    && ['DEIC | Central de Atendimento','🛡️  DEIC  |  Central de Atendimento'].includes(message.embeds[0]?.title));
  const message = previous ? await previous.edit(panelCard()) : await channel.send(panelCard());
  await tell(interaction, `Central disponível em <#${channel.id}>. ${message.url}`);
}

function ticketState(channel) {
  if (channel?.type !== ChannelType.GuildText || !sameChannelName(channel.parent?.name,ticketCategory)) return null;
  const match = /^deic-ticket\|(\d+)\|(suporte|ocorrencia|recrutamento|direcao|consulta)\|(aberto|encerrado)\|(\d+|-)\|?$/.exec(channel.topic ?? '');
  return match && { owner: match[1], kind: match[2], status: match[3], agent: match[4] };
}

const stateTopic = ({ owner, kind, status, agent }) => `deic-ticket|${owner}|${kind}|${status}|${agent}`;
const ticketButtons = () => row(button('claim', 'Assumir ticket', ButtonStyle.Primary), button('close', 'Encerrar ticket', ButtonStyle.Danger));

async function openTicket(interaction, kind) {
  if (!Object.hasOwn(ticketTypes, kind)) return tell(interaction, 'Escolha um assunto disponível.');
  await interaction.deferReply(privateReply);
  const { guild, user } = interaction;
  const key = `open:${guild.id}:${user.id}`;
  if (locks.has(key)) return tell(interaction, 'Seu atendimento já está sendo preparado.');
  locks.add(key);
  try {
    const [channels, roles, bot] = await Promise.all([guild.channels.fetch(), guild.roles.fetch(), guild.members.fetchMe()]);
    const previous = channels.find(channel => {
      const state = ticketState(channel);
      return state?.owner === user.id && state.status === 'aberto';
    });
    if (previous) return await tell(interaction, `Seu ticket aberto está em <#${previous.id}>.`);
    const category = channels.find(channel => channel?.type === ChannelType.GuildCategory && sameChannelName(channel.name,ticketCategory));
    const staffNames = agents.slice(0, 2);
    const staff = roles.filter(role => staffNames.includes(role.name) && !role.managed);
    if (!category || !staff.size || new Set(staff.map(role => role.name)).size !== staff.size) {
      return await tell(interaction, 'Reaplique os módulos Atendimento e Gabinete. Confira se os cargos DEIC estão com nomes únicos.');
    }
    const { ViewChannel, SendMessages, ReadMessageHistory } = PermissionFlagsBits;
    const visible = [ViewChannel, SendMessages, ReadMessageHistory];
    if (!bot.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, ...visible])) {
      return await tell(interaction, 'O bot precisa gerenciar canais e cargos e ter acesso para enviar e ler mensagens.');
    }
    const state = { owner: user.id, kind, status: 'aberto', agent: '-' };
    const channel = await guild.channels.create({
      name: `🎫・atendimento-${kind}-${user.id.slice(-6)}`, type: ChannelType.GuildText,
      parent: category.id, topic: stateTopic(state),
      permissionOverwrites: [
        { id: guild.id, type: OverwriteType.Role, deny: [ViewChannel] },
        { id: user.id, type: OverwriteType.Member, allow: visible },
        { id: bot.id, type: OverwriteType.Member, allow: visible },
        ...staff.map(role => ({ id: role.id, type: OverwriteType.Role, allow: visible })),
      ],
      reason: 'Atendimento DEIC solicitado pelo membro',
    });
    try {
      await channel.send({
        allowedMentions: { parse: [] },
        embeds: [{
          color: 0x263e61, author:{name:'CENTRAL DEIC · ATENDIMENTO'}, title: `🎫 ${ticketTypes[kind].label}`,
          description: `Solicitante <@${user.id}>\nProtocolo \`${channel.id}\`\n**Situação:** Aguardando direção\n\n${kind === 'consulta' ? 'Informe o passaporte do personagem de Travessia RP. A equipe consulta o Arquivo de Inteligência e responde neste canal.' : 'Descreva o assunto e inclua links ou prints da cidade RP, se forem necessários.'}`,
        }],
        components: [ticketButtons()],
      });
    } catch (error) {
      console.error('Falha no cartão do ticket.', error.code ?? error.name);
      return await tell(interaction, `Ticket criado em <#${channel.id}>. A equipe pode gerenciar o canal pelo Discord enquanto o cartão está indisponível.`);
    }
    await tell(interaction, `🎫 Atendimento aberto em <#${channel.id}>.`);
  } finally {
    locks.delete(key);
  }
}

async function manageTicket(interaction, action) {
  if ((!interaction.isButton() && !(action==='close-save'&&interaction.isModalSubmit())) || (interaction.isButton()&&interaction.message.author.id !== interaction.client.user.id)) return tell(interaction, 'Controle de ticket inválido.');
  if(action==='close'&&interaction.isButton()){
    const state=ticketState(interaction.channel);
    if(!state||state.status!=='aberto'||!(interaction.user.id===interaction.guild.ownerId||interaction.member.roles.cache.some(r=>agents.slice(0,2).includes(r.name))))return tell(interaction,'Somente a direção pode encerrar.');
    return interaction.showModal(new ModalBuilder().setCustomId(prefix+'close-save').setTitle('Conclusão do atendimento').addComponents(row(new TextInputBuilder().setCustomId('conclusion').setLabel('Conclusão').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000))));
  }
  await interaction.deferReply(privateReply);
  const key = `ticket:${interaction.channelId}`;
  if (locks.has(key)) return tell(interaction, 'Este ticket está sendo atualizado.');
  locks.add(key);
  try {
    const { guild, user } = interaction;
    const channel = await guild.channels.fetch(interaction.channelId, { force: true });
    const state = ticketState(channel);
    if (!state || state.status !== 'aberto') return await tell(interaction, 'Este ticket já está encerrado ou indisponível.');
    const reviewer = await guild.members.fetch({ user: user.id, force: true });
    const names = agents.slice(0, 2);
    const staff = user.id === guild.ownerId || reviewer.roles.cache.some(role => names.includes(role.name));
    if (!staff) return await tell(interaction, 'A equipe responsável pode assumir ou encerrar o ticket.');
    if (action === 'claim') {
      if (state.agent !== '-') return await tell(interaction, `Já está com <@${state.agent}>.`);
      await channel.setTopic(stateTopic({ ...state, agent: user.id }));
      await channel.send({ content: `👤 Atendimento assumido por <@${user.id}>.`, allowedMentions: { parse: [] } });
      return await tell(interaction, 'Ticket assumido.');
    }
    if(action!=='close-save')return tell(interaction,'Controle inválido.');
    const conclusion=interaction.fields.getTextInputValue('conclusion').trim();
    if(!conclusion)return tell(interaction,'Informe a conclusão.');
    await channel.send({embeds:[{color:0x64748b,title:'🔒 Atendimento encerrado',description:conclusion,footer:{text:'Conclusão da direção'}}],allowedMentions:{parse:[]}});
    await channel.permissionOverwrites.edit(state.owner, {
      ViewChannel: true, SendMessages: false, SendMessagesInThreads: false,
      CreatePublicThreads: false, CreatePrivateThreads: false, AddReactions: false,
    }, { type: OverwriteType.Member, reason: 'Ticket DEIC encerrado' });
    await channel.edit({ topic: stateTopic({ ...state, status: 'encerrado' }), name: `🔒・${channel.name.replace(/^[^\\p{L}\\p{N}]+/u,'').slice(0,85)}` });
    if(interaction.message)await interaction.message.edit({ components: [] }).catch(() => {});
    await channel.send({ content: `🔒 Encerrado por <@${user.id}>. O histórico segue disponível para consulta.`, allowedMentions: { parse: [] } });
    await tell(interaction, 'Ticket encerrado.');
  } finally {
    locks.delete(key);
  }
}

async function guide(interaction) {
  await interaction.deferReply(privateReply);
  const channels = await interaction.guild.channels.fetch();
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const names = Object.values(deicModules).flatMap(group=>group.channels);
  const visible = names.map(name => channels.find(channel => channel?.name === name
    && channel.parent?.name.includes('DEIC |') && channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel))).filter(Boolean);
  await tell(interaction, ['**Setores disponíveis para você**', ...visible.map(channel => `• <#${channel.id}>`)].join('\n'));
}

export async function handlePanel(interaction) {
  try {
    if (!interaction.inGuild() || !interaction.guild) return await tell(interaction, 'Use a central no servidor da DEIC.');
    if (interaction.isChatInputCommand()) return await publish(interaction);
    const [, action, recruiter] = interaction.customId.split(':');
    if (action === 'claim' || action === 'close' || action === 'close-save') return await manageTicket(interaction, action);
    if(action==='ticket' && interaction.isStringSelectMenu() && matchesSectorChannel(interaction.channel,deicModules.deicTickets,'🎫・abrir-ticket')) return await openTicket(interaction,interaction.values[0]);
    if (!isPanelRoom(interaction.channel)) return await tell(interaction, 'Use o painel da recepção.');
    if(action==='configure' && interaction.isButton()){
      if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return await tell(interaction,'Disponível para quem gerencia o servidor.');
      return await interaction.reply({...privateReply,content:'Aplicar a estrutura compacta da DEIC e publicar os painéis de recepção, tickets, plantão, inteligência e direção?',components:[row(button('install','Aplicar e publicar',ButtonStyle.Primary))]});
    }
    if(action==='install' && interaction.isButton()){
      if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return await tell(interaction,'Gerenciar servidor é necessário.');
      const key='install:'+interaction.guildId;
      if(locks.has(key)) return await tell(interaction,'Montagem em andamento.');
      locks.add(key);
      try {
        await interaction.deferReply(privateReply);
        const groups=Object.values(deicModules);
        await applyPlan(interaction.guild,groups,{categories:0,channels:0,roles:0});
        await (await import('./desks.js')).publishDesks(interaction.guild,groups);
        await (await import('./guides.js')).publishGuides(interaction.guild,groups);
        return await tell(interaction,'Estrutura aplicada e painéis publicados.');
      } finally { locks.delete(key); }
    }
    if (action === 'guide' && interaction.isButton()) return await guide(interaction);
    if (action === 'ticket' && interaction.isStringSelectMenu()) return await openTicket(interaction, interaction.values[0]);
    if (action === 'intake' && interaction.isButton()) {
      return await interaction.reply({ ...privateReply, content: 'Selecione quem recrutou seu personagem.',
        components: [row(new UserSelectMenuBuilder().setCustomId(prefix + 'recruiter').setPlaceholder('Selecionar recrutador'))] });
    }
    if (action === 'recruiter' && interaction.isUserSelectMenu()) {
      const id = interaction.values[0];
      const modal = new ModalBuilder().setCustomId(prefix + 'form:' + id).setTitle('Ficha de ingresso • DEIC')
        .addComponents(
          row(new TextInputBuilder().setCustomId('name').setLabel('Nome RP').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)),
          row(new TextInputBuilder().setCustomId('passport').setLabel('Passaporte do personagem').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(10)),
        );
      return await interaction.showModal(modal);
    }
    if (action === 'form' && interaction.isModalSubmit() && /^\d+$/.test(recruiter)) {
      return await submitIntake(interaction, interaction.fields.getTextInputValue('name'),
        interaction.fields.getTextInputValue('passport'), { id: recruiter });
    }
  } catch (error) {
    console.error('Falha na central DEIC.', error.code ?? error.name);
    await tell(interaction, 'A central encontrou um erro. Confira as permissões do bot e o estado do canal antes de tentar novamente.').catch(() => {});
  }
}

