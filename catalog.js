import { investigativeTemplate, investigativePreset } from './template.js';
import { deicModules, deicPreset } from './deic.js';

export const modules = {
  ...deicModules,
  ...investigativeTemplate,
  hospitalEntrada: { name: '🏥・Recepção hospitalar', themed: true, channels: ['🚪・entrada', '📢・avisos-do-hospital', '📋・solicitar-atendimento'], voice: ['🪑・Sala de espera'], roles: ['Paciente'] },
  hospitalAtendimento: { name: '🩺・Atendimento', themed: true, channels: ['📋・triagem', '📅・consultas', '🚑・chamados-ems'], voice: ['🩺・Consultório 01', '🚑・Central EMS'], roles: ['Médico', 'Enfermagem', 'Socorrista'] },
  hospitalPlantao: { name: '🕒・Plantão', themed: true, channels: ['📅・escalas', '🔄・passagem-de-plantao', '📣・comunicados-da-equipe'], voice: ['🎙️・Rádio hospitalar'], roles: ['Chefe de plantão'] },
  hospitalDirecao: { name: '📌・Direção e treinamento', themed: true, channels: ['📕・protocolos', '📚・treinamentos', '📝・recrutamento'], voice: ['💬・Reunião da direção'], roles: ['Direção hospitalar'] },
  policiaEntrada: { name: '🚔・Recepção policial', themed: true, channels: ['🚪・entrada', '🏷️・solicitar-tag', '📖・regras-da-corporacao'], voice: ['🪑・Aguarde atendimento'] },
  policiaCidadaos: { name: '👥・Cidadãos', themed: true, channels: ['📢・anuncios-civis', '💬・chat-civil', '📋・registrar-ocorrencia'], voice: ['🔊・Conversando 01', '🔊・Conversando 02'], roles: ['Cidadão'] },
  policiaOperacoes: { name: '📡・Operações', themed: true, channels: ['📟・despacho', '🚓・patrulhas', '📋・relatorios-de-servico'], voice: ['📡・Rádio central', '🚔・Patrulha 01'], roles: ['Oficial', 'Despachante'] },
  policiaComando: { name: '📌・Comando e academia', themed: true, channels: ['📣・avisos-internos', '🎓・treinamento', '📝・recrutamento'], voice: ['💬・Reunião do comando'], roles: ['Comando policial', 'Recruta'] },
  policiaSuporte: { name: '📮・Suporte policial', themed: true, channels: ['🎫・pedir-ajuda', '💡・sugestoes'], voice: ['🎧・Suporte'] },
  recepcao: { name: 'Recepção', channels: ['boas-vindas', 'regras', 'avisos'] },
  comunidade: { name: 'Comunidade', channels: ['bate-papo', 'apresentacoes', 'sugestoes'], voice: ['Sala geral'] },
  jogos: { name: 'Jogos', channels: ['partidas', 'procurando-grupo', 'clipes'], voice: ['Equipe 1', 'Equipe 2'], roles: ['Jogador'] },
  estudos: { name: 'Estudos', channels: ['duvidas', 'materiais', 'simulados'], voice: ['Sala de estudos'], roles: ['Estudante'] },
  criadores: { name: 'Criadores', channels: ['divulgacao', 'ideias', 'colaboracoes'], roles: ['Criador'] },
  rp: { name: 'Roleplay', channels: ['fichas', 'cenas', 'fora-do-personagem'], voice: ['Mesa de RP'], roles: ['Participante RP'] },
  projetos: { name: 'Projetos', channels: ['tarefas', 'andamento', 'entregas'], voice: ['Reunião'], roles: ['Colaborador'] },
  suporte: { name: 'Suporte', channels: ['perguntas-frequentes', 'pedir-ajuda', 'problemas-resolvidos'] },
  eventos: { name: 'Eventos', channels: ['agenda', 'inscricoes', 'resultados'], voice: ['Sala de eventos'] },
};

export const presets = {
  deic: investigativePreset,
  hospital: { name: 'Hospital', themed: true, modules: ['hospitalEntrada', 'hospitalAtendimento', 'hospitalPlantao', 'hospitalDirecao'] },
  policia: { name: 'Polícia', themed: true, modules: ['policiaEntrada', 'policiaCidadaos', 'policiaOperacoes', 'policiaComando', 'policiaSuporte'] },
  comunidade: { name: 'Comunidade', modules: ['recepcao', 'comunidade', 'eventos'] },
  jogos: { name: 'Jogos', modules: ['recepcao', 'comunidade', 'jogos', 'eventos'] },
  estudos: { name: 'Estudos', modules: ['recepcao', 'estudos', 'eventos'] },
  criadores: { name: 'Criadores de conteúdo', modules: ['recepcao', 'comunidade', 'criadores'] },
  rp: { name: 'Roleplay', modules: ['recepcao', 'rp', 'suporte'] },
  projetos: { name: 'Equipe ou projeto', modules: ['recepcao', 'projetos', 'suporte'] },
  livre: { name: 'Personalizado', modules: ['recepcao'] },
};

export function plan(selected, custom) {
  const result = selected.map(key => {
    const module = modules[key];
    return { ...module, name: module.themed ? module.name : `Base · ${module.name}` };
  });
  if (custom) result.push(custom);
  return result;
}

export function customModule(category, input) {
  if (!category && !input) return undefined;
  if (!category?.trim() || !input?.trim()) {
    throw new Error('Preencha o nome da categoria e os canais personalizados juntos.');
  }
  const names = input.split(',').map(value => value.trim());
  if (names.length > 8 || names.some(name => !/^[a-z0-9-]{1,40}$/.test(name))) {
    throw new Error('Use até 8 canais separados por vírgula, com letras minúsculas sem acento, números ou hífens.');
  }
  const name = `Base · ${category.trim()}`;
  if (Object.values(modules).some(module => `Base · ${module.name}`.toLowerCase() === name.toLowerCase())) {
    throw new Error('Escolha um nome de categoria diferente dos módulos prontos.');
  }
  return { name, channels: [...new Set(names)] };
}



