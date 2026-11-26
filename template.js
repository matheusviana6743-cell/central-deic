import {deicModules,team,intelligence} from './deic.js';
import {formLayout} from './form-model.js';
const section=(name,channels,voice=[],access,roles=[])=>({name,channels,voice,access,roles,themed:true});
const archiveSection=(kind,extra=[],access=team)=>{const s=formLayout[kind];return section(s.category,[...extra,s.entry,s.published,s.archived],[],access);};
export const templateRoles=Object.freeze(['DEIC',...team,intelligence,'DEIC · Cidadão']);
export const investigativeTemplate=Object.freeze({
 baseDeicRecepcao:{...deicModules.deicRecepcao},
 baseDeicAtendimento:{...deicModules.deicTickets},
 baseDeicInterna:section(deicModules.deicInterna.name,
 ['📋・central-de-plantao','💬・conversa-da-equipe','📅・escala-e-presenca','📣・avisos-internos','📸・fotos-da-equipe','🏛️・hierarquia-deic'],
 ['📡・Rádio DEIC','🎙️・Sala da equipe','💬・Conversa da equipe 02','📚・Sala de estudos'],team,['DEIC']),
 baseDeicMesas:archiveSection('mesa',['🧩・painel-de-mesas']),
 baseDeicTocaias:archiveSection('scene'),
 baseDeicRelatorios:archiveSection('report'),
 baseDeicPersonagens:archiveSection('character',[],[...team.slice(0,2),intelligence]),
 baseDeicInvestigacao:{...deicModules.deicInvestigacao},
 baseDeicOperacoes:{...deicModules.deicOperacoes},
 baseDeicFormacao:section(deicModules.deicFormacao.name,['📚・material-de-formacao','📅・agenda-de-aulas'],['🎓・Sala de treinamento','🎙️・Aula 01','🎙️・Aula 02','💬・Dúvidas e orientação'],team),
 baseDeicIntel:{...deicModules.deicIntel},
 baseDeicGabinete:section(deicModules.deicComando.name,[...deicModules.deicComando.channels],['🔐・Reunião da direção','🎙️・Atendimento interno'],team.slice(0,2)),
});
export const investigativePreset={name:'Polícia Investigativa RP · Base DEIC',themed:true,customizable:true,modules:Object.keys(investigativeTemplate)};
export function channelChoices(group){
 return [...group.channels.map((name,index)=>({value:'t'+index,label:name})),...(group.voice??[]).map((name,index)=>({value:'v'+index,label:name}))];
}
export function restrictChannels(group,choices){
 if(!Array.isArray(choices))return {...group};
 const keep=new Set(choices);
 return {...group,channels:group.channels.filter((_,i)=>keep.has('t'+i)),voice:(group.voice??[]).filter((_,i)=>keep.has('v'+i))};
}
export function templatePlan(groups,optionalRoles){
 if(!groups.length)return groups;
 const required=new Set(groups.flatMap(g=>g.access??[]));
 const chosen=templateRoles.filter(r=>required.has(r)||(optionalRoles??templateRoles).includes(r));
 return groups.map((g,i)=>({...g,roles:i===0?chosen:[]}));
}
