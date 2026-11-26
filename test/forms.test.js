import test from 'node:test';import assert from 'node:assert/strict';
import {formKinds,formPayload,formCard} from '../form-model.js';
process.env.DEIC_DATABASE=':memory:';
const db=await import('../records.js');
const {mesaName}=await import('../mesa-panel.js');
test('closed mesa uses lock icon',()=>assert.match(mesaName(5,'Teste',true),/^🔒/u));
test('four separate form types require all fields',()=>{
 assert.equal(Object.keys(formKinds).length,4);
 for(const [kind,spec] of Object.entries(formKinds)){
 const input=Object.fromEntries(spec.fields.map(([k])=>[k,'RP fictício']));
 assert.deepEqual(formPayload(kind,input),input);
 assert.equal(formPayload(kind,{}),null);
 assert.ok(formCard(kind,1,input).fields.length<=5);
 }
});
test('draft publication and archive state are guild scoped',()=>{
 const id=db.formStart('a','owner','report','channel');
 assert.equal(db.formGet('b',id),undefined);
 assert.equal(db.formSave('a',id,{local:'RP'}),true);
 assert.equal(db.formTransition('a',id,'draft','publishing'),true);
 assert.equal(db.formTransition('a',id,'draft','publishing'),false);
 assert.equal(db.formPublish('a',id,'pub','msg'),true);
 assert.equal(db.formList('a','report').length,1);
 assert.equal(db.formTransition('a',id,'published','archiving'),true);
 assert.equal(db.formArchive('a',id,'arc','msg2'),true);
 assert.equal(db.formList('a','report').length,0);
});

test('all twelve permanent channel names differ and categories keep the requested names',async()=>{
 const {formLayout,selectFormCategory}=await import('../form-model.js');
 const {sameChannelName}=await import('../deic.js');
 const labels=Object.values(formLayout).flatMap(x=>[x.entry,x.published,x.archived]);
 assert.equal(new Set(labels).size,12);
 assert.match(formLayout.scene.category,/Tocaias RP/);
 assert.match(formLayout.character.category,/Procurados RP/);
 const old={id:'old',name:formLayout.scene.oldCategory,type:4};
 const current={id:'existing',name:'🎯・DEIC | Tocaias RP',type:4};
 assert.equal(selectFormCategory([old,current],'scene','old',sameChannelName,c=>c.type===4).id,'existing');
 assert.equal(selectFormCategory([old],'scene','old',sameChannelName,c=>c.type===4).id,'old');
 assert.throws(()=>selectFormCategory([current,{...current,id:'duplicate'}],'scene','old',sameChannelName,c=>c.type===4));
});

test('legacy cleanup only selects listed obsolete report channels, preserves current panels and desks',async()=>{
 const {legacyCleanupCandidates}=await import('../form-model.js');
 const {sameChannelName}=await import('../deic.js');
 const ch=(id,name,parent)=>({id,name,parent:{name:parent},type:0});
 const entries=[ch('a','📝・painel-de-relatorios','📝・DEIC | Relatórios'),ch('b','📋・relatos-de-ocorrencia','📝・DEIC | Relatórios'),ch('c','🎯・painel-de-tocaias','🎯・DEIC | Tocaias RP'),ch('d','🧩・painel-de-mesas','🧩・DEIC | Mesas'),ch('e','🔒・mesa-0005-teste','🧩・DEIC | Mesas'),ch('f','relatos-de-ocorrencia','Outra categoria')];
 assert.deepEqual(legacyCleanupCandidates(entries,['b'],sameChannelName,c=>c.type===0).map(c=>c.id),['a','c']);
});
test('character card emphasizes name and status without new tracking fields',()=>{
 const payload={name:'Marcelo',code:'RP-001',description:'Enredo fictício',story:'Observação'};
 const card=formCard('character',1,payload,'Publicado');
 assert.equal(card.title,'Marcelo');
 assert.equal(card.fields[1].value,'🟢 Ativa');
 assert.equal(formCard('character',1,payload,'Arquivado').fields[1].value,'🔒 Arquivada');
});
