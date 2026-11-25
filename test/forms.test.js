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
