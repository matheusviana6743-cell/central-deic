export const lessons = Object.freeze([
  { id: 'conduta', title: 'Conduta no RP', text: 'Respeite os participantes, as regras do servidor e os limites de cada cena. Separe informações do personagem das informações fora do RP.', question: 'O que fazer ao discordar de uma cena?', options: ['Expor dados pessoais do jogador', 'Conversar com a moderação pelos canais previstos', 'Continuar a discussão fora do jogo'], answer: 1, explanation: 'A moderação é o canal adequado para resolver conflitos sem prejudicar os participantes.' },
  { id: 'relatorios', title: 'Relatórios e documentação', text: 'Organize registros fictícios por data, contexto, participantes do RP e resultado da cena. Diferencie fatos registrados de interpretações. Não inclua dados reais de jogadores.', question: 'Qual informação deve ficar fora de um relatório de RP?', options: ['Data fictícia da cena', 'Resumo da atividade', 'Endereço real de um jogador'], answer: 2, explanation: 'Dados pessoais reais não pertencem aos registros de personagens.' },
  { id: 'equipe', title: 'Comunicação e trabalho em equipe', text: 'Combine responsabilidades, use canais apropriados e mantenha a comunicação respeitosa. Ao receber uma dúvida, consulte as regras e peça ajuda quando necessário.', question: 'Qual é a melhor forma de resolver dúvidas sobre regras?', options: ['Consultar as regras e pedir orientação', 'Inventar uma regra', 'Ignorar as regras'], answer: 0, explanation: 'Consultar as regras oficiais reduz conflitos e ajuda toda a equipe.' },
]);
export function lessonById(id) { return lessons.find(lesson => lesson.id === id); }
export function checkAnswer(id, value) {
  const lesson = lessonById(id);
  if (!lesson || !Number.isInteger(value) || value < 0 || value >= lesson.options.length) return null;
  return { correct: value === lesson.answer, explanation: lesson.explanation };
}
