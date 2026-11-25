import { ChannelType } from 'discord.js';
import { deicModules } from './deic.js';
import { panelId, savePanel } from './records.js';

const cards = [
  ['deicRecepcao', 1, '📢  COMUNICADOS DA DEIC', 'Este canal reúne os anúncios públicos da DEIC em Travessia RP. Acompanhe por aqui novidades sobre recrutamento, horários de atendimento e eventos da cidade.\n\n**Quer ingressar?** A ficha fica no painel da recepção. **Precisa de ajuda?** Abra um atendimento pelo painel de tickets.\n\nA direção publica novos comunicados abaixo desta mensagem.'],
  ['deicRecepcao', 2, '📖  REGRAS E ORIENTAÇÕES', '**Bem-vindo à DEIC de Travessia RP.** Esta é uma equipe de investigação dentro da cidade. Respeite o RP e as regras gerais de Travessia.\n\n**01 · Informação da cena**  Use somente dados que seu personagem obteve dentro do jogo.\n**02 · Evidências**  Apresente prints e clipes com contexto e referência à cena. Não altere registros para mudar o resultado.\n**03 · Conduta**  Trate os demais personagens com respeito e siga a orientação da equipe responsável pela cena.\n**04 · Canais privados**  Compartilhe casos e dossiês apenas com quem tem acesso ao setor.\n**05 · Ingresso**  Clique em **Registrar** na recepção e informe o nome RP, o passaporte do personagem e seu recrutador.\n\nEm caso de dúvida, use o painel de tickets. A direção pode complementar estas orientações conforme as regras da cidade.'],
  ['deicInterna', 4, '💬  CONVERSA DA EQUIPE', 'Espaço para conversar com a equipe sobre o plantão e combinar cenas de Travessia RP.\n\nPara que uma decisão não se perca no chat, registre o resultado no **caso** pelo painel de plantão. Dados de personagens e evidências devem ficar no histórico da investigação.'],
  ['deicInterna', 5, '📅  ESCALA E PRESENÇA', 'Organize aqui as disponibilidades e trocas de plantão da equipe no RP.\n\n**Modelo de mensagem**\n> Personagem e cargo · Dia e horário · Atividade prevista · Quem assume a troca\n\nQuando um caso mudar de responsável, use **Passar caso** no registro da investigação.'],
  ['deicInterna', 6, '📣  AVISOS INTERNOS', 'A direção usa este canal para comunicar decisões que afetam o trabalho da equipe no RP.\n\n**Modelo**\n> Assunto · Vigência · Equipe envolvida · Onde tirar dúvidas\n\nMantenha as discussões na conversa da equipe e os casos no painel de plantão.'],
  ['deicInvestigacao', 0, '📂  CASOS E ATUALIZAÇÕES', 'Acompanhe as investigações em andamento e combine os próximos passos da cena. O registro oficial de cada caso fica no **painel de plantão**, com número, responsável, relatos, evidências e desfecho.\n\n**Ao atualizar um caso**\n> Nº do caso · O que aconteceu no RP · Próximo passo · Responsável\n\nUse o número do caso para manter a conversa ligada ao registro correto.'],
  ['deicInvestigacao', 1, '📸  PRINTS E CLIPES', 'Envie capturas de cenas de Travessia RP com contexto suficiente para a equipe entender o que aconteceu.\n\n**Ao publicar**\n> Nº do caso · Data da cena · Personagem que registrou · O que o arquivo mostra\n\nDepois vincule o link da mensagem ao caso pelo botão **Vincular evidência**.'],
  ['deicInvestigacao', 2, '📌  DEMANDAS DO PLANTÃO', 'Use este espaço para dividir tarefas relacionadas aos casos da DEIC.\n\n**Modelo**\n> Caso nº · Tarefa no RP · Integrante responsável · Prazo combinado · Situação\n\nSe outro integrante assumir a investigação, atualize o responsável no painel do caso.'],
  ['deicOperacoes', 0, '📟  CHAMADOS E APOIO', 'Coordene aqui os pedidos de apoio da equipe dentro de Travessia RP.\n\n**Modelo de chamado**\n> Cena ou caso nº · Equipe solicitante · Tipo de apoio · Situação atual\n\nPedidos feitos no painel da cidade podem ser referenciados no caso pelo botão **Registrar QRR**.'],
  ['deicOperacoes', 1, '📍  CENAS EM ANDAMENTO', 'A equipe pode informar aqui quais cenas RP estão em curso para facilitar a coordenação do plantão.\n\n**Modelo**\n> Caso nº · Equipe na cena · Início · Sala de voz usada · Estado atual\n\nUse os painéis de mesa e tocaia para abrir as salas de voz ligadas ao caso.'],
  ['deicOperacoes', 2, '📋  RESULTADOS DAS CENAS', 'Depois de uma cena, registre o que ocorreu e o próximo passo para a equipe.\n\n**Modelo**\n> Caso nº · Participantes · Resumo da cena RP · Evidências · Pendências\n\nInclua o resultado no histórico do caso pelo painel de relatórios.'],
  ['deicFormacao', 0, '📚  ORIENTAÇÕES DA EQUIPE', 'Bem-vindo à formação da DEIC. Conheça os painéis antes de participar de uma investigação.\n\n**Percurso inicial**\n1. Leia as regras e orientações da recepção.\n2. Consulte a central de plantão e observe como um caso é registrado.\n3. Acompanhe uma mesa ou cena autorizada com a equipe.\n4. Registre seu relato no caso correspondente após a atividade.\n\nSeu acesso aos setores acompanha o cargo recebido no servidor.'],
  ['deicFormacao', 1, '📝  TREINAMENTOS RP', 'Organize aqui as atividades de formação dos personagens da DEIC.\n\n**Modelo de sessão**\n> Tema · Instrutor · Dia e horário · Participantes · Cena de treinamento · Resultado\n\nRegistre as decisões relevantes no caso usado durante a simulação.'],
  ['deicIntel', 1, '🔗  CONEXÕES RP', 'Espaço de análise reservado à inteligência. Relacione personagens, organizações e casos **apenas com base nas cenas de Travessia RP**.\n\n**Modelo**\n> Dossiê ou caso nº · Personagens envolvidos · Relação observada · Cena que sustenta a anotação · Pendência\n\nAtualize também o dossiê pesquisável no painel do arquivo.'],
  ['deicIntel', 2, '📑  ANÁLISES DA EQUIPE', 'Reúna hipóteses e encaminhamentos de inteligência para as investigações do RP.\n\n**Modelo**\n> Dossiê nº · Fatos registrados · Hipótese da equipe · Próxima cena necessária · Responsável\n\nDiferencie observações da cena das hipóteses do personagem.'],
  ['deicComando', 2, '📋  DECISÕES DA DIREÇÃO', 'Registro interno das decisões da direção sobre o funcionamento da DEIC em Travessia RP.\n\n**Modelo**\n> Assunto · Decisão · Responsável · Data de início · Casos ou integrantes envolvidos\n\nUse a triagem para aprovar fichas e o painel da direção para acompanhar os registros.'],
  ['deicComando', 3, '📊  ACOMPANHAMENTO DA EQUIPE', 'Este espaço organiza o acompanhamento do trabalho da equipe dentro do RP. O **painel da direção** mostra os registros feitos nos últimos sete dias.\n\n**Ao avaliar uma atividade**\n> Integrante · Casos assumidos · Cenas realizadas · Relatórios registrados · Próximo objetivo\n\nConsidere as informações do próprio caso e o contexto das cenas.'],
];

export async function publishGuides(guild, groups) {
  const channels = await guild.channels.fetch();
  for (const [key, index, title, description] of cards) {
    const section = deicModules[key];
    if (!groups.some(group => group.name === section.name)) continue;
    const channel = channels.find(candidate => candidate?.type === ChannelType.GuildText
      && candidate.name === section.channels[index] && candidate.parent?.name === section.name);
    if (!channel) continue;

    const card = {
      embeds: [{ color: 0x204c64, author: { name: 'POLÍCIA CIVIL  •  TRAVESSIA RP' }, title,
        description, footer: { text: 'DEIC  •  Orientação de setor' } }],
      allowedMentions: { parse: [] },
    };
    const previousId = panelId(guild.id, channel.id);
    let message = previousId ? await channel.messages.fetch(previousId).catch(error => {
      if (error.code !== 10008) throw error;
      return null;
    }) : null;
    if (!message) {
      const recent = await channel.messages.fetch({ limit: 50 });
      message = recent.find(item => item.author.id === guild.client.user.id && item.embeds[0]?.title === title);
    }
    message = message ? await message.edit(card) : await channel.send(card);
    savePanel(guild.id, channel.id, message.id);
  }
}
