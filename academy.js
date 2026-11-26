import { completeLesson } from './records.js';
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
function menuCard(user) {
  return { embeds: [{ title: 'Academia DEIC', description: 'Escolha uma aula abaixo para começar. Cada conclusão é registrada no seu perfil.', color: 0x245589 }],
    components: [new ActionRowBuilder().addComponents(lessons.map(lesson => new ButtonBuilder().setCustomId(prefix+'open:'+lesson.id+':'+user).setLabel(lesson.title).setStyle(ButtonStyle.Primary)))] };
}
export async function handleAcademy(interaction) {
  try {
    if (!allowed(interaction)) return await interaction.reply({ ...privateReply, content: 'A academia está disponível para integrantes da equipe DEIC.' });
    if (interaction.isChatInputCommand()) {
      const id = interaction.options.getString('aula');
      if (!id) return await interaction.reply({ ...privateReply, ...menuCard(interaction.user.id) });
      const lesson = lessonById(id);
      if (!lesson) return await interaction.reply({ ...privateReply, content: 'Aula indisponível.' });
      return await interaction.reply({ ...privateReply, ...lessonCard(lesson, interaction.user.id) });
    }
    if (interaction.customId === prefix+'menu') return await interaction.reply({...privateReply,...menuCard(interaction.user.id)});
    if (interaction.customId.startsWith(prefix+'open:')) {
      const [, , id, owner] = interaction.customId.split(':');
      const lesson=lessonById(id);
      if(owner!==interaction.user.id||!lesson) return await interaction.reply({...privateReply,content:'Abra sua própria aula.'});
      return await interaction.update({...lessonCard(lesson,interaction.user.id),allowedMentions:{parse:[]}});
    }
    const [, id, value, owner] = interaction.customId.split(':');
    const result = /^[0-2]$/.test(value) && checkAnswer(id, Number(value));
    if (owner !== interaction.user.id || !result) return await interaction.reply({ ...privateReply, content: 'Exercício indisponível. Abra sua própria aula.' });
    const first = result.correct && completeLesson(interaction.guildId, interaction.user.id, id);
    await interaction.update({ content: (result.correct ? '✅ Resposta correta! ' : '📚 Revise esta resposta. ') + result.explanation + (first ? '\n+1 ponto pela primeira conclusão da aula.' : ''),
      embeds: [], components: [], allowedMentions: { parse: [] } });
  } catch (error) {
    console.error('Falha na academia', error.code ?? error.name);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ ...privateReply, content: 'Não foi possível abrir a academia. Tente novamente.' }).catch(() => {});
  }
}
