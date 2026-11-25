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

test('DEIC preset preserves the existing category names and access configuration', () => {
  assert.deepEqual(presets.deic.modules, Object.keys(deicModules));
  const groups = plan(presets.deic.modules);
  for (const [index, key] of presets.deic.modules.entries()) {
    assert.equal(groups[index].name, deicModules[key].name);
    assert.deepEqual(groups[index].access, deicModules[key].access);
    assert.deepEqual(groups[index].channels, deicModules[key].channels);
  }
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
