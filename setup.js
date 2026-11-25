import { ChannelType, OverwriteType, PermissionFlagsBits } from 'discord.js';

const { ManageChannels, ManageRoles, ViewChannel } = PermissionFlagsBits;

function canReusePrivate(channel, overwrites) {
  const actual = channel.permissionOverwrites.cache;
  return actual.size === overwrites.length && overwrites.every(expected => {
    const current = actual.get(expected.id);
    return current?.type === expected.type
      && current.allow.bitfield === (expected.allow?.[0] ?? 0n)
      && current.deny.bitfield === (expected.deny?.[0] ?? 0n);
  });
}

export async function applyPlan(guild, groups, counts) {
  const bot = await guild.members.fetchMe();
  if (!bot.permissions.has(ManageChannels)) {
    throw new Error('O bot precisa da permissão Gerenciar canais.');
  }
  const roleNames = new Set(groups.flatMap(group => [...(group.roles ?? []), ...(group.access ?? [])]));
  if (roleNames.size && !bot.permissions.has(ManageRoles)) {
    throw new Error('O bot precisa da permissão Gerenciar cargos para os módulos escolhidos.');
  }
  if (groups.some(group => group.access) && !bot.permissions.has(ViewChannel)) {
    throw new Error('O bot precisa da permissão Ver canais para criar as áreas reservadas.');
  }

  const [channels, roles] = await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);
  const reason = 'Servidor Base: configuração confirmada por um gestor';
  const roleIds = new Map();
  for (const name of roleNames) {
    const matches = roles.filter(role => role.name === name && !role.managed);
    const isAccessRole = groups.some(group => group.access?.includes(name));
    if (isAccessRole && matches.size > 1) {
      throw new Error(`Há cargos duplicados com o nome ${name}. Renomeie os duplicados antes de continuar.`);
    }
    let role = matches.first();
    if (!role) {
      role = await guild.roles.create({ name, permissions: [], reason });
      counts.roles++;
    }
    roleIds.set(name, role.id);
  }

  const positions = [];
  let categoryPosition = 0;
  for (const group of groups) {
    const permissionOverwrites = group.access?.length ? [
      { id: guild.id, type: OverwriteType.Role, deny: [ViewChannel] },
      { id: bot.id, type: OverwriteType.Member, allow: [ViewChannel] },
      ...group.access.map(name => ({ id: roleIds.get(name), type: OverwriteType.Role, allow: [ViewChannel] })),
    ] : undefined;
    let category = channels.find(channel => channel?.type === ChannelType.GuildCategory && channel.name === group.name);
    if (category && permissionOverwrites && !canReusePrivate(category, permissionOverwrites)) {
      throw new Error(`A categoria ${group.name} já existe com permissões diferentes. Revise-a ou renomeie-a antes de aplicar.`);
    }
    if (!category) {
      category = await guild.channels.create({
        name: group.name, type: ChannelType.GuildCategory, permissionOverwrites, reason,
      });
      channels.set(category.id, category);
      counts.categories++;
    }

    positions.push({ channel: category.id, position: categoryPosition++ });
    const entries = [
      ...group.channels.map(name => ({ name, type: ChannelType.GuildText })),
      ...(group.voice ?? []).map(name => ({ name, type: ChannelType.GuildVoice })),
    ];
    let textPosition = 0;
    let voicePosition = 0;
    for (const { name, type } of entries) {
      const position = type === ChannelType.GuildText ? textPosition++ : voicePosition++;
      const existing = channels.find(channel => channel?.parentId === category.id && channel.type === type && channel.name === name);
      if (existing) {
        if (permissionOverwrites && !canReusePrivate(existing, permissionOverwrites)) {
          throw new Error(`O canal ${name} já existe com permissões diferentes. Revise-o antes de aplicar.`);
        }
        positions.push({ channel: existing.id, position });
        continue;
      }
      const topic = name === '🏷️・solicitar-tag'
        ? '🪪 Cadastro DEIC • Use /ficha com seu nome RP, passaporte do jogo e recrutador.'
        : undefined;
      const channel = await guild.channels.create({ name, type, parent: category.id, permissionOverwrites, reason, topic });
      channels.set(channel.id, channel);
      counts.channels++;
      positions.push({ channel: channel.id, position });
    }
  }
  if (positions.length) await guild.channels.setPositions(positions);
}


