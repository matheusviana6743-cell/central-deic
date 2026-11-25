import { academyCommand } from './academy.js';
import { wipeCommand } from './wipe.js';
import { panelCommand } from './panel.js';
import { intakeCommand } from './intake.js';
import { ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { presets } from './catalog.js';

const { DISCORD_TOKEN: token, DISCORD_APP_ID: appId, DISCORD_TEST_GUILD_ID: guildId } = process.env;
if (!token || !appId) throw new Error('Preencha DISCORD_TOKEN e DISCORD_APP_ID no arquivo .env.');

const command = new SlashCommandBuilder()
  .setName('montar')
  .setDescription('Monte a estrutura inicial do seu servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(option => option.setName('modelo').setDescription('Proposta inicial')
    .setRequired(true).addChoices(...Object.entries(presets).map(([value, preset]) => ({ name: preset.name, value }))))
  .addStringOption(option => option.setName('categoria').setDescription('Nome de uma categoria própria')
    .setMaxLength(50))
  .addStringOption(option => option.setName('canais').setDescription('Canais próprios, por exemplo teste, novidades')
    .setMaxLength(330));

const legacyWipeCommand = new SlashCommandBuilder()
  .setName('apagar-canais')
  .setDescription('Limpar canais, cargos e registros deste servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const commands = [command, intakeCommand, panelCommand, academyCommand, wipeCommand, legacyWipeCommand];
for (const entry of commands) {
  if (!guildId) {
    entry.setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);
  }
}
const rest = new REST().setToken(token);
const route = guildId ? Routes.applicationGuildCommands(appId, guildId) : Routes.applicationCommands(appId);
try {
  for (const entry of commands) await rest.post(route, { body: entry.toJSON() });
  console.log(guildId ? 'Comando registrado no servidor de teste.' : 'Comando global registrado.');
} catch (error) {
  console.error('Falha no registro.', error.code ?? error.name);
  process.exitCode = 1;
}



