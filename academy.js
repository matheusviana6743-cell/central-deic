import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { lessons, lessonById, checkAnswer } from './curriculum.js';
import { team, intelligence } from './deic.js';
const prefix = 'academy:';
const roles = new Set([...team, intelligence]);
const privateReply = { flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };

export const academyCommand = new SlashCommandBuilder()
  .setName('academia').setDescription('Aulas e exercícios de formação para o RP')
  .addStringOption(option => option.setName('aula').setDescription('Escolha uma aula')
    .addChoices(...lessons.map(lesson => ({ name: lesson.title, value: lesson.id }))));

export function handlesAcademy(interaction) {
  return (interaction.isChatInputCommand() && interaction.commandName === 'academia')
    || (interaction.isButton() && interaction.customId.startsWith(prefix));
}

function allowed(interaction) {
  if (!interaction.inGuild()) return false;
  const cache = interaction.member?.roles?.cache;
  return Boolean(cache?.some(role => roles.has(role.name)));
}
function lessonCard(lesson, user) {
  const buttons = lesson.options.map((option, i) => new ButtonBuilder()
    .setCustomId(prefix + lesson.id + ':' + i + ':' + user)
    .setLabel(option).setStyle(ButtonStyle.Secondary));
  return { embeds: [{ title: 'Academia DEIC · ' + lesson.title,
    description: lesson.text + '\n\n**Exercício:** ' + lesson.question, color: 0x245589,
    footer: { text: 'Formação fictícia · Regras e convivência no RP' } }],
    components: [new ActionRowBuilder().addComponents(buttons)] };
}
export async function handleAcademy(interaction) {
  try {
    if (!allowed(interaction)) return await interaction.reply({ ...privateReply, content: 'A academia está disponível para integrantes da equipe DEIC.' });
    if (interaction.isChatInputCommand()) {
      const id = interaction.options.getString('aula');
      if (!id) return await interaction.reply({ ...privateReply, embeds: [{ title: 'Academia DEIC', description: lessons.map(lesson => '• ' + lesson.title).join('\n') + '\n\nUse /academia e escolha uma aula.', color: 0x245589 }] });
      const lesson = lessonById(id);
      if (!lesson) return await interaction.reply({ ...privateReply, content: 'Aula indisponível.' });
      return await interaction.reply({ ...privateReply, ...lessonCard(lesson, interaction.user.id) });
    }
    const [, id, value, owner] = interaction.customId.split(':');
    const result = /^[0-2]$/.test(value) && checkAnswer(id, Number(value));
    if (owner !== interaction.user.id || !result) return await interaction.reply({ ...privateReply, content: 'Exercício indisponível. Abra sua própria aula.' });
    await interaction.update({ content: (result.correct ? '✅ Resposta correta! ' : '📚 Revise esta resposta. ') + result.explanation,
      embeds: [], components: [], allowedMentions: { parse: [] } });
  } catch (error) {
    console.error('Falha na academia', error.code ?? error.name);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ ...privateReply, content: 'Não foi possível abrir a academia. Tente novamente.' }).catch(() => {});
  }
}
