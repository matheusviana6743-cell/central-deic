import test from 'node:test';
import assert from 'node:assert/strict';
import { modules, presets, plan, customModule } from '../catalog.js';
import { deicModules } from '../deic.js';

test('all presets reference existing modules without duplicates', () => {
  for (const preset of Object.values(presets)) {
    assert.equal(new Set(preset.modules).size, preset.modules.length);
    for (const key of preset.modules) assert.ok(modules[key], key);
  }
});

test('DEIC preset contains the current reusable RP category template',async()=>{
 const {investigativeTemplate,templateRoles,channelChoices,restrictChannels,templatePlan}=await import('../template.js');
 assert.deepEqual(presets.deic.modules,Object.keys(investigativeTemplate));
 const groups=plan(presets.deic.modules);
 assert.equal(groups.length,12);
 assert.ok(groups.some(g=>g.name.includes('Mesas')&&g.channels.includes('🧩・painel-de-mesas')));
 assert.ok(groups.some(g=>g.name.includes('Formação')&&g.voice.includes('🎙️・Aula 02')));
 const selected=restrictChannels(groups[0],['t0']);
 assert.equal(selected.channels.length,1);
 assert.equal(channelChoices(groups[0]).length,groups[0].channels.length+(groups[0].voice??[]).length);
 const result=templatePlan(groups,[]);
 for(const role of new Set(groups.flatMap(g=>g.access??[])))assert.ok(result[0].roles.includes(role));
 assert.ok(templateRoles.includes('DEIC'));
 assert.equal(result.some(g=>g.channels.some(c=>/mesa-0005|rascunho-|ticket-\d/.test(c))),false);
});

test('every module defines unique channel names within its category', () => {
  for (const [key, module] of Object.entries(modules)) {
    assert.ok(module.name, key);
    assert.ok(Array.isArray(module.channels), key);
    const names = [...module.channels, ...(module.voice ?? [])];
    assert.equal(new Set(names).size, names.length, key);
  }
});

test('custom categories validate input and deduplicate channels', () => {
  assert.equal(customModule(undefined, undefined), undefined);
  assert.throws(() => customModule('Clube', ''));
  assert.throws(() => customModule('Clube', 'Canal inválido'));
  assert.throws(() => customModule('Recepção', 'geral'));
  assert.throws(() => customModule('Clube', 'a,b,c,d,e,f,g,h,i'));
  assert.deepEqual(customModule('Clube', 'geral, avisos, geral'), {
    name: 'Base · Clube', channels: ['geral', 'avisos'],
  });
});

test('generic plans preserve the Base prefix and append custom modules', () => {
  const custom = customModule('Clube', 'geral');
  const groups = plan(['recepcao'], custom);
  assert.equal(groups[0].name, 'Base · Recepção');
  assert.deepEqual(groups[1], custom);
});
