import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { normalizeMaterialConfig, materialPaths } from '../skill/mof-visualization/scripts/material-config.mjs';

const validConfig = {
  id: 'uio-66-demo',
  name: 'UiO-66',
  source: {
    citation: 'Cavka et al., JACS 2008',
    selectionReason: 'Public example.',
  },
  validation: {
    requiredElements: ['Zr', 'O', 'C'],
    requiredBondPairs: ['O-Zr', 'C-O', 'C-C'],
  },
  render: { clusterMode: 'cell' },
};

test('material config normalizes a public material definition', () => {
  const material = normalizeMaterialConfig(validConfig);
  assert.equal(material.slug, 'uio-66-demo');
  assert.equal(material.name, 'UiO-66');
  assert.deepEqual(material.validation.requiredElements, ['Zr', 'O', 'C']);
  assert.equal(material.render.clusterMode, 'cell');
});
test('material config rejects unsafe or incomplete input', () => {
  assert.throws(() => normalizeMaterialConfig({ id: '../escape', name: 'bad' }), /safe id/);
  assert.throws(() => normalizeMaterialConfig({ id: 'safe-id', name: 'bad' }), /source citation/);
  assert.throws(
    () => normalizeMaterialConfig({
      id: 'safe-id',
      name: 'bad',
      source: { citation: 'citation', selectionReason: '' },
    }),
    /selection reason/,
  );
});

test('material config paths remain inside the project root', () => {
  const root = path.resolve('/tmp/mof-public-test');
  const paths = materialPaths(root, normalizeMaterialConfig(validConfig));
  for (const value of Object.values(paths)) {
    assert.equal(path.resolve(value).startsWith(root + path.sep), true, value);
  }
});
