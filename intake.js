import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder,
} from 'discord.js';
import { deicModules, team, sameChannelName } from './deic.js';

export const intakeChannel = '🏷️・solicitar-tag';
export const reviewChannel = '🪪・triagem-de-fichas';
const reviewCategory = deicModules.deicComando.name;
const intakeCategory = deicModules.deicRecepcao.name;
const reviewers = team.slice(0, 2);
const jobs = [
  { role: team[2], tag: 'Investigador' },
  { role: team[3], tag: 'Escrivão' },
  { role: team[4], tag: 'Perito' },
  { role: team[5], tag: 'Formação' },
];
const locks = new Set();
const noMentions = { parse: [] };
const privateReply = { flags: MessageFlags.Ephemeral, allowedMentions: noMentions };
const approval = 'deic-intake:approve';
const rejection = 'deic-intake:reject';

export const intakeCommand = new SlashCommandBuilder()
  .setName('ficha')
  .setDescription('Envie seu cadastro RP para a DEIC de Travessia')
  .addStringOption(option => option.setName('nome').setDescription('Nome do personagem').setRequired(true).setMaxLength(32))
  .addStringOption(option => option.setName('passaporte').setDescription('Número do passaporte no jogo').setRequired(true).setMaxLength(10))
  .addUserOption(option => option.setName('recrutador').setDescription('Marque quem recrutou você').setRequired(true));

function nickname(tag, name, passport) {
  return `[${tag}] ${name} | ${passport}`;
}

function inChannel(channel, name, category) {
  return channel?.type === ChannelType.GuildText && sameChannelName(channel.name,name) && sameChannelName(channel.parent?.name,category);
}

function isPrivate(channel, guild) {
  return channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel) === false;
}

function hasRole(member, names) {
  return member.roles.cache.some(role => names.includes(role.name));
}

export function handlesIntake(interaction) {
  return (interaction.isChatInputCommand() && interaction.commandName === 'ficha')
    || (interaction.isStringSelectMenu() && interaction.customId === approval)
    || (interaction.isButton() && interaction.customId === rejection);
}

async function submit(interaction) {
  if (!inChannel(interaction.channel, intakeChannel, intakeCategory)) {
    return interaction.reply({ ...privateReply, content: 'Use /ficha no canal 🏷️・solicitar-tag da recepção da DEIC.' });
  }
  return submitIntake(interaction, interaction.options.getString('nome', true),
    interaction.options.getString('passaporte', true), interaction.options.getUser('recrutador', true));
}

export async function submitIntake(interaction, rawName, rawPassport, recruiter) {
  await interaction.deferReply(privateReply);
  const name = rawName.trim().replace(/ +/g, ' ');
  const passport = rawPassport.trim();
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name) || !/^\d{1,10}$/.test(passport)) {
    return interaction.editReply('Informe o nome RP com letras e o passaporte do personagem só com números.');
  }
  if (recruiter.bot || recruiter.id === interaction.user.id) {
    return interaction.editReply('Selecione a pessoa da DEIC que recrutou você.');
  }
  const guild = interaction.guild;
  const recruitingMember = await guild.members.fetch(recruiter.id).catch(() => null);
  if (!recruitingMember || !hasRole(recruitingMember, team.slice(0, 5))) {
    return interaction.editReply('O recrutador precisa ser membro da equipe da DEIC com cargo ativo.');
  }
  if (!jobs.some(job => nickname(job.tag, name, passport).length <= 32)) {
    return interaction.editReply('Abrevie o nome RP para caber no limite de 32 caracteres do apelido.');
  }
  const channels = await guild.channels.fetch();
  const target = channels.find(channel => inChannel(channel, reviewChannel, reviewCategory) && isPrivate(channel, guild));
  if (!target) {
    return interaction.editReply('A triagem reservada ainda não foi configurada. Peça à direção para aplicar o módulo Gabinete.');
  }
  const eligible = jobs.filter(job => nickname(job.tag, name, passport).length <= 32);
  const menu = new StringSelectMenuBuilder().setCustomId(approval)
    .setPlaceholder('Aprovar e escolher cargo')
    .addOptions(eligible.map(job => ({
      label: job.tag, value: job.tag, description: nickname(job.tag, name, passport),
    })));
  const reject = new ButtonBuilder().setCustomId(rejection).setLabel('Recusar ficha').setStyle(ButtonStyle.Danger);
  const card = await target.send({
    allowedMentions: noMentions,
    embeds: [{
      title: '🪪 Ficha de ingresso',
      description: 'DEIC • Travessia RP',
      color: 0xc48c29,
      timestamp: new Date().toISOString(),
      fields: [
        { name: 'Candidato', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Recrutador', value: `<@${recruiter.id}>`, inline: true },
        { name: 'Status', value: 'Em análise', inline: true },
        { name: 'Nome RP', value: name, inline: true },
        { name: 'Passaporte RP', value: passport, inline: true },
      ],
    }],
    components: [new ActionRowBuilder().addComponents(menu), new ActionRowBuilder().addComponents(reject)],
  });
  await interaction.editReply(`🪪 **Ficha enviada para a direção.**\nProtocolo: \`${card.id}\`\nSe a sua DM estiver aberta, você recebe o resultado por lá.`);
}

async function decide(interaction) {
  const { guild, channel, user } = interaction;
  if (!inChannel(channel, reviewChannel, reviewCategory) || !isPrivate(channel, guild)
      || interaction.message.author.id !== interaction.client.user.id) {
    return interaction.reply({ ...privateReply, content: 'Essa ficha precisa estar no canal reservado de triagem.' });
  }
  await interaction.deferReply(privateReply);
  const reviewer = await guild.members.fetch({ user: user.id, force: true });
  if (user.id !== guild.ownerId && !hasRole(reviewer, reviewers)) {
    return interaction.editReply('Apenas a direção e os delegados podem decidir a ficha.');
  }
  const card = await channel.messages.fetch({ message: interaction.message.id, force: true });
  const embed = card.embeds[0]?.toJSON();
  const fields = new Map(embed?.fields?.map(field => [field.name, field.value]));
  const candidate = /^<@(\d+)>$/.exec(fields.get('Candidato') ?? '')?.[1];
  if (!candidate || fields.get('Status') !== 'Em análise' || !card.components.length) {
    return interaction.editReply('Essa ficha já foi decidida ou está incompleta.');
  }
  if (candidate === user.id) return interaction.editReply('Peça a outro responsável para decidir sua ficha.');
  const key = `${guild.id}:${candidate}`;
  if (locks.has(key)) return interaction.editReply('Já existe uma decisão em andamento para esse membro.');
  locks.add(key);
  try {
    const current = await channel.messages.fetch({ message: card.id, force: true });
    if (!current.components.length) return await interaction.editReply('Essa ficha já foi decidida.');
    let appliedNickname;
    const job = jobs.find(entry => entry.tag === interaction.values?.[0]);
    if (interaction.customId === approval) {
      if (!job) return await interaction.editReply('Selecione um cargo válido.');
      const member = await guild.members.fetch({ user: candidate, force: true }).catch(() => null);
      if (!member) return await interaction.editReply('O candidato precisa estar no servidor.');
      const bot = await guild.members.fetchMe();
      const roles = await guild.roles.fetch();
      const matches = roles.filter(role => role.name === job.role && !role.managed);
      const role = matches.size === 1 ? matches.first() : null;
      if (!role?.editable || !member.manageable || !bot.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        return await interaction.editReply('Confira se o cargo existe, se o bot pode gerenciar apelidos e se o cargo dele está acima do candidato e do cargo DEIC.');
      }
      if (role.permissions.bitfield !== 0n) {
        return await interaction.editReply('Este cargo tem permissões gerais no servidor. Use um cargo DEIC de acesso por canal para aprovar pelo bot.');
      }
      if (hasRole(member, team.filter(name => name !== job.role))) {
        return await interaction.editReply('O membro já tem outro cargo interno. A direção precisa resolver a hierarquia pelo Discord.');
      }
      appliedNickname = nickname(job.tag, fields.get('Nome RP'), fields.get('Passaporte RP'));
      if (appliedNickname.length > 32) return await interaction.editReply('O apelido excede 32 caracteres.');
      const oldNickname = member.nickname;
      const reason = `Ficha DEIC ${card.id}, aprovada por ${user.id}`;
      await member.setNickname(appliedNickname, reason);
      try {
        await member.roles.add(role, reason);
      } catch (error) {
        await member.setNickname(oldNickname, 'Reversão da aprovação DEIC').catch(rollback => {
          console.error('Falha na reversão de apelido DEIC.', rollback.code ?? rollback.name);
        });
        throw error;
      }
    }
    const status = appliedNickname ? 'Aprovada' : 'Recusada';
    const resultFields = embed.fields.map(field => field.name === 'Status' ? { ...field, value: status } : field);
    resultFields.push({ name: 'Revisão', value: `<@${user.id}>`, inline: true });
    if (appliedNickname) resultFields.push({ name: 'Apelido aplicado', value: appliedNickname });
    await card.edit({ embeds: [{ ...embed, color: appliedNickname ? 0x208456 : 0xb23b46, fields: resultFields }], components: [], allowedMentions: noMentions });
    const account = await interaction.client.users.fetch(candidate).catch(() => null);
    const delivered = account && await account.send({ allowedMentions: noMentions, content: appliedNickname
      ? `🟢 **DEIC • Travessia RP**\nSua ficha foi aprovada! Bem-vindo(a) à DEIC de Travessia RP.\nCargo de ingresso: **${job.role}**\nSeu apelido no servidor: **${appliedNickname}**`
      : '🔴 **DEIC • Travessia RP**\nSua ficha foi recusada. Procure a recepção se precisar de detalhes.',
    }).then(() => true, () => false);
    const notice = delivered ? 'Mensagem privada enviada.' : 'O Discord não permitiu enviar a mensagem privada.';
    await interaction.editReply((appliedNickname ? `Ficha aprovada. Apelido aplicado: **${appliedNickname}**.` : 'Ficha recusada.') + '\n' + notice);
  } finally {
    locks.delete(key);
  }
}

export async function handleIntake(interaction) {
  if (!interaction.inGuild() || !interaction.guild) return interaction.reply({ ...privateReply, content: 'Use no servidor da DEIC.' });
  try {
    await (interaction.isChatInputCommand() ? submit(interaction) : decide(interaction));
  } catch (error) {
    console.error('Falha no cadastro DEIC.', error.code ?? error.name);
    const content = 'Não foi possível concluir a ficha. Confira a triagem, os cargos e as permissões do bot antes de repetir.';
    if (interaction.deferred || interaction.replied) await interaction.editReply(content).catch(() => {});
    else await interaction.reply({ ...privateReply, content }).catch(() => {});
  }
}



