import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCif } from '../skill/mof-visualization/scripts/cif-core.mjs';
import { validateStructures } from '../skill/mof-visualization/scripts/validate-structure.mjs';
import { resolveClusterMode } from '../skill/mof-visualization/scripts/render-material.mjs';

const cif = fs.readFileSync(new URL('../fixtures/synthetic-zinc-framework.cif', import.meta.url), 'utf8');
const source = parseCif(cif);
const prepared = { ...source, atoms: source.atoms.filter((atom) => atom.element !== 'H') };
const config = {
  validation: {
    requiredElements: ['Zn', 'N', 'C'],
    requiredBondPairs: ['N-Zn', 'C-N'],
  },
};

test('workflow validates heavy atoms and metal coordination from public config', () => {
  const result = validateStructures(source, prepared, config);
  assert.equal(result.pass, true);
  assert.deepEqual(result.sourceHeavyAtomCounts, { Zn: 1, N: 2, C: 2 });
  assert.deepEqual(result.preparedHeavyAtomCounts, result.sourceHeavyAtomCounts);
  assert.equal(result.metalCoordination.Zn.min, 2);
  assert.deepEqual(result.metalCoordination.Zn.coordinatingElements, ['N']);
});

test('workflow fails when a required bond pair is absent', () => {
  const result = validateStructures(source, prepared, {
    validation: {
      requiredElements: ['Zn', 'N', 'C'],
      requiredBondPairs: ['C-O'],
    },
  });
  assert.equal(result.pass, false);
  assert.deepEqual(result.missingRequiredBondPairs, ['C-O']);
});

test('workflow fails when a metal has no coordination connection', () => {
  const disconnected = {
    ...prepared,
    atoms: prepared.atoms.map((atom) => atom.element === 'Zn' ? { ...atom, f: [0.5, 0.8, 0.5] } : atom),
  };
  const result = validateStructures(source, disconnected, config);
  assert.equal(result.pass, false);
  assert.deepEqual(result.unconnectedMetals, ['Zn']);
});

test('render command accepts only public cluster modes', () => {
  assert.equal(resolveClusterMode({}), 'cell');
  assert.equal(resolveClusterMode({ render: { clusterMode: 'spherical' } }), 'spherical');
  assert.throws(() => resolveClusterMode({ render: { clusterMode: 'custom-cage' } }), /Unsupported cluster mode/);
});

test('render command creates a still and four-view inspection image', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mof-visualization-'));
  const configPath = path.join(projectRoot, 'material.json');
  const inputPath = new URL('../fixtures/synthetic-zinc-framework.cif', import.meta.url);
  const configValue = {
    id: 'synthetic-zinc',
    name: 'Synthetic zinc framework',
    source: { citation: 'Generated test fixture.', selectionReason: 'Automated public workflow test.' },
    validation: { requiredElements: ['Zn', 'N', 'C'], requiredBondPairs: ['N-Zn', 'C-N'] },
    render: { clusterMode: 'cell' },
  };
  fs.writeFileSync(configPath, JSON.stringify(configValue));
  const scripts = new URL('../skill/mof-visualization/scripts/', import.meta.url);
  const commands = [
    ['acquire-structure.mjs', '--input', inputPath.pathname],
    ['prepare-structure.mjs'],
    ['validate-structure.mjs'],
    ['render-material.mjs', '--skip-video', '--still-size', '256', '--preview-size', '256'],
  ];
  try {
    for (const [script, ...extra] of commands) {
      const result = spawnSync(process.execPath, [new URL(script, scripts).pathname, '--config', configPath, '--project-root', projectRoot, ...extra], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }
    const signature = '89504e470d0a1a0a';
    assert.equal(fs.readFileSync(path.join(projectRoot, 'outputs/images/synthetic-zinc.png')).subarray(0, 8).toString('hex'), signature);
    assert.equal(fs.readFileSync(path.join(projectRoot, 'outputs/previews/synthetic-zinc-four-views.png')).subarray(0, 8).toString('hex'), signature);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
