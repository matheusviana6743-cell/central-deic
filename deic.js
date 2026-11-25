export const team = ['DEIC · Diretor', 'DEIC · Delegado', 'DEIC · Investigador', 'DEIC · Escrivão', 'DEIC · Perito', 'DEIC · Agente em formação'];
export const intelligence = 'DEIC · Inteligência';
const section = (name, channels, voice = [], access, roles) => ({ name, channels, voice, access, roles, themed: true });
export const deicModules = {
  deicRecepcao: section('🚪・DEIC | Recepção', ['🖥️・central-de-atendimento', '📢・comunicados', '📖・regras-e-orientacoes'], [], undefined, ['DEIC · Cidadão']),
  deicTickets: section('🎫・DEIC | Atendimento', ['🎫・abrir-ticket']),
  deicInterna: section('🪪・DEIC | Área interna', ['📋・central-de-plantao', '🎯・painel-de-tocaias', '🧩・painel-de-mesas', '📝・painel-de-relatorios', '💬・conversa-da-equipe', '📅・escala-e-presenca', '📣・avisos-internos'], ['📡・Rádio DEIC', '🎙️・Sala da equipe'], team),
  deicInvestigacao: section('🔎・DEIC | Investigação', ['📂・casos-e-atualizacoes', '📸・prints-e-clipes', '📌・demandas-do-plantao'], ['🧩・Discussão de casos'], team.slice(0, 5)),
  deicOperacoes: section('🚔・DEIC | Operações RP', ['📟・chamados-e-apoio', '📍・cenas-em-andamento', '📋・resultados-das-cenas'], ['📡・Coordenação RP', '🚘・Equipe Alfa', '🚘・Equipe Bravo'], team.slice(0, 5)),
  deicFormacao: section('🎓・DEIC | Formação', ['📚・orientacoes-da-equipe', '📝・treinamentos-rp'], ['🎓・Sala de treinamento'], team),
  deicIntel: section('🗂️・DEIC | Inteligência', ['🗂️・arquivo-rp', '🔗・conexoes-rp', '📑・analises-da-equipe'], [], [...team.slice(0, 2), intelligence]),
  deicComando: section('🔐・DEIC | Gabinete', ['🖥️・painel-da-direcao', '🪪・triagem-de-fichas', '📋・decisoes-da-direcao', '📊・acompanhamento-da-equipe'], [], team.slice(0, 2)),
};
export const deicPreset = { name: 'DEIC • Travessia RP', themed: true, modules: Object.keys(deicModules) };

