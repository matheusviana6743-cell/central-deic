import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { team, intelligence } from './deic.js';
import { communityCheckin, communityProfile, communityRanking, rankingVisibility } from './records.js';
import { lessons } from './curriculum.js';
const roles=new Set([...team,intelligence]);
const reply={ flags: MessageFlags.Ephemeral, allowedMentions: {parse:[]} };
const embed=(title,description)=>({title,description,color:0x245589,footer:{text:'DEIC · Participação comunitária fictícia'}});
export const participationCommands=[
  new SlashCommandBuilder().setName('perfil').setDescription('Veja seu progresso pessoal na academia e na comunidade RP'),
  new SlashCommandBuilder().setName('ranking').setDescription('Veja o ranking semanal voluntário da comunidade RP'),
  new SlashCommandBuilder().setName('participacao').setDescription('Registre presença ou controle sua visibilidade no ranking')
    .addSubcommand(s=>s.setName('presenca').setDescription('Registre uma presença voluntária por dia'))
    .addSubcommand(s=>s.setName('entrar').setDescription('Autorize a exibição do seu perfil no ranking'))
    .addSubcommand(s=>s.setName('sair').setDescription('Retire seu perfil do ranking')),
];
const names=new Set(participationCommands.map(c=>c.name));
export function handlesParticipation(i){return (i.isChatInputCommand()&&names.has(i.commandName))||(i.isButton()&&['community:perfil','community:ranking','community:presenca'].includes(i.customId));}
export async function handleParticipation(i){
  try {
    if(!i.inGuild()||!i.member?.roles?.cache?.some(role=>roles.has(role.name))) return await i.reply({...reply,content:'Este módulo é exclusivo da equipe DEIC.'});
    const guild=i.guildId,user=i.user.id;
    const command=i.isButton()?i.customId.split(':')[1]:i.commandName;
    if(command==='perfil'){
      const p=communityProfile(guild,user);
      const list=lessons.map(l=>(p.lessons.includes(l.id)?'✅ ':'▫️ ')+l.title).join('\n');
      return await i.reply({...reply,embeds:[embed('Meu perfil DEIC',list+'\n\n**Presenças nesta semana:** '+p.checkins+'\n**Aulas concluídas nesta semana:** '+p.weeklyLessons+'\n**Pontos semanais:** '+(p.checkins+p.weeklyLessons)+'\n**Ranking:** '+(p.visible?'Visível':'Privado')+'\n\nUse /participacao para alterar a visibilidade.')]});
    }
    if(command==='ranking'){
      const rows=communityRanking(guild);
      const description=rows.length?rows.map((r,n)=>(n+1)+'. <@'+r.member+'> — '+r.points+' ponto(s)').join('\n'):'Nenhum participante voluntário com pontos nesta semana.';
      return await i.reply({...reply,embeds:[embed('Ranking semanal · Comunidade RP',description+'\n\nCada presença diária ou primeira conclusão de aula vale 1 ponto. Reinício às segundas, 00h de Brasília. Use /participacao entrar ou sair.')]});
    }
    const action=i.isButton()?'presenca':i.options.getSubcommand();
    if(action==='presenca'){
      const added=communityCheckin(guild,user);
      return await i.reply({...reply,content:added?'Presença registrada! +1 ponto semanal.':'Você já registrou presença hoje. Confira /perfil.'});
    }
    rankingVisibility(guild,user,action==='entrar');
    return await i.reply({...reply,content:action==='entrar'?'Seu perfil poderá aparecer no ranking da equipe. Use /participacao sair para ocultá-lo.':'Seu perfil foi ocultado do ranking. Seu progresso pessoal continua disponível.'});
  } catch(error){
    console.error('Falha na participação',error.code??error.name);
    if(!i.replied&&!i.deferred) await i.reply({...reply,content:'Não foi possível acessar a participação. Tente novamente.'}).catch(()=>{});
  }
}
