import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCif } from '../skill/mof-visualization/scripts/cif-core.mjs';
import { validateStructures } from '../skill/mof-visualization/scripts/validate-structure.mjs';

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
