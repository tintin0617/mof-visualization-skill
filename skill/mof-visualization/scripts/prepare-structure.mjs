#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseCif, writePreparedCif, sha256, elementCounts } from './cif-core.mjs';
import { parseArgs, loadMaterialConfig, getProjectRoot, materialPaths } from './material-config.mjs';

const args = parseArgs();
const material = loadMaterialConfig(args.config);
const root = getProjectRoot(args);
const paths = materialPaths(root, material);
const sourceBytes = fs.readFileSync(paths.sourceCif);
const source = parseCif(sourceBytes.toString('utf8'));
const removedAtoms = source.atoms
  .filter((atom) => atom.element === 'H')
  .map((atom) => ({
    sourceIndex: atom.index,
    label: atom.label,
    element: atom.element,
    reason: 'ordinary hydrogen omitted for visualization',
  }));
const preparedAtoms = source.atoms
  .filter((atom) => atom.element !== 'H')
  .map((atom, index) => ({ ...atom, index }));
const preparedText = writePreparedCif({ cell: source.cell, atoms: preparedAtoms });
fs.mkdirSync(path.dirname(paths.preparedCif), { recursive: true });
fs.writeFileSync(paths.preparedCif, preparedText);

const metadata = JSON.parse(fs.readFileSync(paths.metadata, 'utf8'));
Object.assign(metadata, {
  preparedFile: path.relative(root, paths.preparedCif),
  preparedSha256: sha256(Buffer.from(preparedText)),
  preparedAtomCounts: elementCounts(preparedAtoms),
  removedAtoms,
  heavyAtomAllowlist: [],
});
fs.writeFileSync(paths.metadata, JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({
  sourceAtoms: source.atoms.length,
  preparedAtoms: preparedAtoms.length,
  removedHydrogen: removedAtoms.length,
}, null, 2));
