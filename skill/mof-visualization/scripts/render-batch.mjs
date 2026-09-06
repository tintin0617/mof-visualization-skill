#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './material-config.mjs';

const args = parseArgs();
const configs = String(args.configs || args.config || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (!configs.length) throw new Error('Provide --configs path/to/one.json,path/to/two.json');

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'render-material.mjs');
for (const config of configs) {
  const childArgs = [script, '--config', config];
  if (args['project-root']) childArgs.push('--project-root', args['project-root']);
  if (args['skip-video']) childArgs.push('--skip-video');
  const result = spawnSync(process.execPath, childArgs, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
