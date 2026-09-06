#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCif, elementCounts, buildPeriodicBonds, sha256 } from './cif-core.mjs';
import { parseArgs, loadMaterialConfig, getProjectRoot, materialPaths } from './material-config.mjs';

const METALS = new Set(['Zr', 'Zn', 'Co', 'Al', 'Fe', 'Cr', 'Ni', 'Ti', 'Cu']);

export function validateStructures(source, prepared, config) {
  const sourceHeavy = source.atoms.filter((atom) => atom.element !== 'H');
  const sourceCounts = elementCounts(sourceHeavy);
  const preparedCounts = elementCounts(prepared.atoms);
  const countMismatch = [...new Set([...Object.keys(sourceCounts), ...Object.keys(preparedCounts)])]
    .filter((element) => (sourceCounts[element] || 0) !== (preparedCounts[element] || 0))
    .map((element) => ({
      element,
      source: sourceCounts[element] || 0,
      prepared: preparedCounts[element] || 0,
    }));

  const bonds = buildPeriodicBonds(prepared.atoms, prepared.cell);
  const degree = Array(prepared.atoms.length).fill(0);
  const neighbors = Array.from({ length: prepared.atoms.length }, () => []);
  const bondsByPair = {};
  for (const bond of bonds) {
    degree[bond.i] += 1;
    degree[bond.j] += 1;
    neighbors[bond.i].push(prepared.atoms[bond.j].element);
    neighbors[bond.j].push(prepared.atoms[bond.i].element);
    bondsByPair[bond.pair] = (bondsByPair[bond.pair] || 0) + 1;
  }

  const isolatedHeavyAtoms = prepared.atoms
    .filter((atom, index) => atom.element !== 'H' && degree[index] === 0)
    .map((atom) => ({ index: atom.index, label: atom.label, element: atom.element }));
  const requiredElements = config.validation?.requiredElements || [];
  const requiredBondPairs = config.validation?.requiredBondPairs || [];
  const missingRequiredElements = requiredElements.filter((element) => !preparedCounts[element]);
  const missingRequiredBondPairs = requiredBondPairs.filter((pair) => !bondsByPair[pair]);

  const metalCoordination = {};
  const presentMetals = [...new Set(prepared.atoms.filter((atom) => METALS.has(atom.element)).map((atom) => atom.element))];
  for (const metal of presentMetals) {
    const indices = prepared.atoms
      .map((atom, index) => atom.element === metal ? index : -1)
      .filter((index) => index >= 0);
    const counts = indices.map((index) => neighbors[index].length);
    const coordinatingElements = [...new Set(indices.flatMap((index) => neighbors[index]))].sort();
    metalCoordination[metal] = {
      atoms: indices.length,
      min: Math.min(...counts),
      max: Math.max(...counts),
      coordinatingElements,
    };
  }
  const unconnectedMetals = Object.entries(metalCoordination)
    .filter(([, value]) => value.min === 0)
    .map(([metal]) => metal);

  const pass = !countMismatch.length
    && !isolatedHeavyAtoms.length
    && !missingRequiredElements.length
    && !missingRequiredBondPairs.length
    && !unconnectedMetals.length;

  return {
    pass,
    sourceHeavyAtomCounts: sourceCounts,
    preparedHeavyAtomCounts: preparedCounts,
    countMismatch,
    totalBonds: bonds.length,
    bondsByPair,
    metalCoordination,
    unconnectedMetals,
    isolatedHeavyAtoms,
    missingRequiredElements,
    missingRequiredBondPairs,
  };
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const args = parseArgs();
  const material = loadMaterialConfig(args.config);
  const root = getProjectRoot(args);
  const paths = materialPaths(root, material);
  const sourceBytes = fs.readFileSync(paths.sourceCif);
  const preparedBytes = fs.readFileSync(paths.preparedCif);
  const report = {
    materialId: material.id,
    sourceSha256: sha256(sourceBytes),
    preparedSha256: sha256(preparedBytes),
    ...validateStructures(
      parseCif(sourceBytes.toString('utf8')),
      parseCif(preparedBytes.toString('utf8')),
      material,
    ),
  };
  fs.writeFileSync(paths.validation, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}
