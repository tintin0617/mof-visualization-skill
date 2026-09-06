#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseCif, sha256, elementCounts } from './cif-core.mjs';
import { parseArgs, loadMaterialConfig, getProjectRoot, materialPaths } from './material-config.mjs';

const args = parseArgs();
const material = loadMaterialConfig(args.config);
const root = getProjectRoot(args);
const paths = materialPaths(root, material);
if (!args.input || !fs.existsSync(path.resolve(args.input))) {
  throw new Error('Provide an existing source with --input /absolute/source.cif');
}
const input = path.resolve(args.input);
const bytes = fs.readFileSync(input);
const structure = parseCif(bytes.toString('utf8'));
fs.mkdirSync(paths.sourceDir, { recursive: true });
fs.mkdirSync(paths.preparedDir, { recursive: true });
fs.copyFileSync(input, paths.sourceCif);

const metadata = {
  materialId: material.id,
  name: material.name,
  acquiredAt: new Date().toISOString(),
  sourceFile: path.relative(root, paths.sourceCif),
  sourceSha256: sha256(bytes),
  sourceAtomCounts: elementCounts(structure.atoms),
  citation: material.source.citation,
  selectionReason: material.source.selectionReason,
};
fs.writeFileSync(paths.metadata, JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify(metadata, null, 2));
