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
 return {color:status==='Arquivado'?0x64748b:0x245589,author:{name:'CENTRAL DEIC · TRAVESSIA RP'},title:spec.icon+' '+spec.name+' · #'+String(id).padStart(4,'0'),description:'**'+status+'** · Conteúdo exclusivamente fictício do RP',fields:spec.fields.map(([key,label])=>({name:label,value:String(payload[key]??'—').slice(0,700)})),footer:{text:'Registro '+id+' · Não inclua dados pessoais reais'},...(typeof payload.photo==='string'&&payload.photo.startsWith('attachment://')?{image:{url:payload.photo}}:{})};
}

export function characterCatalog(rows){
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cards=rows.map(r=>{
  const p=JSON.parse(r.payload);
  return '<article><small>Ficha #'+escape(r.id)+'</small><h2>'+escape(p.name)+'</h2><p><b>Código fictício:</b> '+escape(p.code)+'</p><p>'+escape(p.description)+'</p><p>'+escape(p.story)+'</p></article>';
 }).join('');
 return '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Personagens fictícios · Travessia RP</title><style>body{background:#111c2c;color:#e9f0fa;max-width:860px;padding:24px;margin:auto;font:16px/1.6 system-ui}article{background:#1d3048;border:1px solid #435876;border-radius:12px;padding:20px;margin:14px 0;overflow-wrap:anywhere}small{color:#a5c7ed}p{white-space:pre-wrap}</style><h1>Catálogo de personagens RP</h1><p>Fichas narrativas fictícias ativas. Não publique dados reais. Até 200 registros recentes. Documento interno.</p>'+(cards||'<p>Nenhuma ficha ativa.</p>')+'</html>';
}
