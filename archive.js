import { ChannelType, OverwriteType, PermissionFlagsBits as P } from 'discord.js';
import { archiveRows, rememberChannel, forgetArchive } from './records.js';


// Only channels from the previous DEIC release qualify. Match both category and channel.
const old = {
  '🚪・DEIC | Recepção':['👋・entrada','📢・anuncios','📖・regras-rp','🏷️・solicitar-tag','📨・como-abrir-atendimento','🪑・Aguarde atendimento'],
  '👥・DEIC | Área civil':['📣・comunicados-civis','💬・chat-civil','📋・orientacoes-ocorrencias','📝・recrutamento','💬・Conversa civil'],
  '🪪・DEIC | Área interna':['📌・avisos-internos','📅・escala-de-plantao','🧭・procedimentos-rp','📝・relatorios-de-servico','🎙️・Plantão DEIC'],
  '📁・DEIC | Casos e evidências':['🗃️・registro-de-casos','🔎・casos-em-andamento','📸・evidencias-do-rp','🧾・depoimentos-rp','✅・casos-arquivados','🔬・Análise de evidências'],
  '🧩・DEIC | Mesas de investigação':['📌・agenda-das-mesas','🧠・cena-sob-analise','📝・atas-e-proximos-passos','🧩・Mesa 01','🧩・Mesa 02','🧩・Mesa 03'],
  '👁️・DEIC | Tocaias RP':['📅・agenda-de-tocaias','📍・registro-de-cenas-rp','📋・encerramento-da-cena','👁️・Tocaia 01','👁️・Tocaia 02','👁️・Tocaia 03'],
  '📡・DEIC | Operações RP':['📟・despacho','🚨・registro-qrr','📑・briefing-rp','📝・debriefing-rp','📡・Rádio DEIC','🎙️・Equipe Alfa','🎙️・Equipe Bravo'],
  '🎓・DEIC | Academia':['📚・material-de-formacao','📝・avaliacoes','🎭・simulacoes-rp','🎓・Sala de treinamento'],
  '🔐・DEIC | Gabinete':['📋・decisoes-da-direcao','📑・revisao-de-casos','⭐・promocoes-e-avaliacoes','🔐・Reunião da direção'],
};
const busy=new Set();
export async function migrate(guild,mode) {
  if(busy.has(guild.id)) return 'Uma alteração já está em andamento.';
  busy.add(guild.id);
  try {
    const channels=await guild.channels.fetch();
    const known=archiveRows(guild.id);
    const targets=channels.filter(c=>old[c?.parent?.name]?.includes(c.name) && [ChannelType.GuildVoice,ChannelType.GuildText].includes(c.type));
    if(mode==='preview')return targets.size+' canais da versão anterior encontrados. '+known.length+' com permissões salvas. Arquivar restringe o acesso aos administradores e ao bot. Salas ocupadas são puladas. Restaurar reaplica as permissões salvas.';
    let done=0;
    if(mode==='restore'){
      for(const item of known){
        const ch=channels.get(item.channel);
        if(!ch)continue;
        const perms=JSON.parse(item.snapshot).map(o=>({...o,allow:BigInt(o.allow),deny:BigInt(o.deny)}));
        await ch.permissionOverwrites.set(perms,'Restaurar acesso anterior da DEIC');
        forgetArchive(guild.id,ch.id);done++;
      }
    } else {
      for(const ch of targets.values()){
        if(ch.type===ChannelType.GuildVoice && ch.members.size)continue;
        const perms=ch.permissionOverwrites.cache.map(o=>({id:o.id,type:o.type,allow:o.allow.bitfield.toString(),deny:o.deny.bitfield.toString()}));
        rememberChannel(guild.id,ch.id,JSON.stringify(perms));
        await ch.permissionOverwrites.set([{id:guild.id,type:OverwriteType.Role,deny:[P.ViewChannel]},{id:guild.client.user.id,type:OverwriteType.Member,allow:[P.ViewChannel]}],'Arquivar canal anterior da DEIC');
        done++;
      }
    }
    return done+' canais processados.';
  } finally {busy.delete(guild.id);}
}

