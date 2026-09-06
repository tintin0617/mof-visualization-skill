import fs from 'node:fs';
import path from 'node:path';

export function parseArgs(argv = process.argv.slice(2)) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    result[key] = next && !next.startsWith('--') ? (index += 1, next) : true;
  }
  return result;
}
function requireText(value, message) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

export function normalizeMaterialConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Material config must be a JSON object.');
  }
  const id = requireText(value.id, 'Material config requires an id.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error('Material config requires a safe id using lowercase letters, digits, and hyphens.');
  }
  const name = requireText(value.name, 'Material config requires a name.');
  const citation = requireText(value.source?.citation, 'Material config requires a source citation.');
  const selectionReason = requireText(value.source?.selectionReason, 'Material config requires a source selection reason.');
  const requiredElements = value.validation?.requiredElements ?? [];
  const requiredBondPairs = value.validation?.requiredBondPairs ?? [];
  if (!Array.isArray(requiredElements) || !requiredElements.every((item) => typeof item === 'string' && item)) {
    throw new Error('validation.requiredElements must be an array of element symbols.');
  }
  if (!Array.isArray(requiredBondPairs) || !requiredBondPairs.every((item) => typeof item === 'string' && item)) {
    throw new Error('validation.requiredBondPairs must be an array of element-pair names.');
  }
  return {
    id,
    slug: id,
    name,
    source: { citation, selectionReason },
    validation: {
      requiredElements: [...requiredElements],
      requiredBondPairs: [...requiredBondPairs],
    },
    render: {
      clusterMode: value.render?.clusterMode || 'cell',
    },
  };
}

export function loadMaterialConfig(file) {
  if (!file) throw new Error('Provide --config /absolute/material.json');
  const resolved = path.resolve(file);
  return normalizeMaterialConfig(JSON.parse(fs.readFileSync(resolved, 'utf8')));
}

export function getProjectRoot(args) {
  return path.resolve(args['project-root'] || process.cwd());
}

export function materialPaths(projectRoot, material) {
  const root = path.resolve(projectRoot);
  const base = path.join(root, 'materials', material.slug);
  return {
    base,
    sourceDir: path.join(base, 'source'),
    preparedDir: path.join(base, 'prepared'),
    sourceCif: path.join(base, 'source', material.slug + '-source.cif'),
    preparedCif: path.join(base, 'prepared', material.slug + '-prepared.cif'),
    metadata: path.join(base, 'metadata.json'),
    validation: path.join(base, 'validation.json'),
    image: path.join(root, 'outputs', 'images', material.slug + '.png'),
    preview: path.join(root, 'outputs', 'previews', material.slug + '-four-views.png'),
    animation: path.join(root, 'outputs', 'animations', material.slug + '.mp4'),
    manifest: path.join(root, 'outputs', 'manifest.json'),
  };
}
