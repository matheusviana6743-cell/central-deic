export const formKinds=Object.freeze({
 report:{name:'Relatórios',icon:'📝',fields:[['local','Local fictício da cena'],['event','Ocorrido no RP'],['end','Conclusão']]},
 scene:{name:'Cenas RP',icon:'🎬',fields:[['local','Cenário fictício'],['event','Resumo da cena concluída'],['end','Conclusão narrativa']]},
 mesa:{name:'Registros de mesas',icon:'📁',fields:[['local','Local fictício da cena'],['info','Informação de RP']]},
 character:{name:'Personagens RP',icon:'🪪',fields:[['name','Nome do personagem fictício'],['code','Código fictício do jogo'],['description','Descrição narrativa do personagem'],['story','História do personagem']]},
});
export function formPayload(kind,raw){
 const spec=formKinds[kind];if(!spec)return null;
 const result={};
 for(const [key] of spec.fields){
  const value=String(raw[key]??'').trim();
  if(!value||value.length>700)return null;
  result[key]=value;
 }
 return result;
}
export function formCard(kind,id,payload,status='Prévia'){
 const spec=formKinds[kind];if(!spec)throw Error('Categoria inválida');
 return {color:status==='Arquivado'?0x64748b:0x245589,author:{name:'CENTRAL DEIC · TRAVESSIA RP'},title:spec.icon+' '+spec.name+' · #'+String(id).padStart(4,'0'),description:'**'+status+'** · Conteúdo exclusivamente fictício do RP',fields:spec.fields.map(([key,label])=>({name:label,value:String(payload[key]??'—').slice(0,700)})),footer:{text:'Registro '+id+' · Não inclua dados pessoais reais'},...(payload.photo?{image:{url:payload.photo}}:{})};
}
