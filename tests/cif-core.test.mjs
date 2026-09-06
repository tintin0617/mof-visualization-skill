import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCif, elementCounts, writePreparedCif, buildPeriodicBonds, buildSymmetricCellCluster } from '../skill/mof-visualization/scripts/cif-core.mjs';

const cif = fs.readFileSync(new URL('../fixtures/synthetic-zinc-framework.cif', import.meta.url), 'utf8');

test('CIF core parses a generated periodic structure', () => {
  const structure = parseCif(cif);
  assert.deepEqual(elementCounts(structure.atoms), { Zn: 1, N: 2, C: 2, H: 2 });
  const bonds = buildPeriodicBonds(structure.atoms.filter((atom) => atom.element !== 'H'), structure.cell);
  assert.equal(bonds.filter((bond) => bond.pair === 'N-Zn').length, 2);
  assert.equal(bonds.filter((bond) => bond.pair === 'C-N').length, 2);
});

test('CIF core writes a prepared structure without changing heavy atoms', () => {
  const source = parseCif(cif);
  const heavy = source.atoms.filter((atom) => atom.element !== 'H');
  const prepared = parseCif(writePreparedCif({ cell: source.cell, atoms: heavy }));
  assert.deepEqual(elementCounts(prepared.atoms), { Zn: 1, N: 2, C: 2 });
});

test('CIF core creates a centered three-dimensional cell cluster', () => {
  const source = parseCif(cif);
  const heavy = source.atoms.filter((atom) => atom.element !== 'H');
  const cluster = buildSymmetricCellCluster(heavy, source.cell);
  assert.equal(cluster.atoms.length, 5);
  assert.equal(cluster.bonds.length, 4);
  assert.ok(cluster.atoms.some((atom) => atom.p[0] > 0));
  assert.ok(cluster.atoms.some((atom) => atom.p[0] < 0));
});
