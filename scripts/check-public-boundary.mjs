#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const privateProductMarker = ['M', 'T', 'X'].join('');
const posixUsersPattern = new RegExp('/' + ['Us', 'ers'].join('') + '/[A-Za-z0-9._-]+/');
const windowsUsersPattern = new RegExp('[A-Za-z]:\\\\' + ['Us', 'ers'].join('') + '\\\\[^\\\\]+\\\\', 'i');

function rules() {
  const denylist = (process.env.PUBLIC_BOUNDARY_DENYLIST || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [
    { name: 'private-product-marker', pattern: new RegExp(privateProductMarker, 'i') },
    { name: 'local-user-path', pattern: posixUsersPattern },
    { name: 'local-user-path', pattern: windowsUsersPattern },
    ...denylist.map((term) => ({
      name: 'local-denylist',
      pattern: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    })),
  ];
}

export function scanEntries(entries) {
  const findings = [];
  for (const entry of entries) {
    const values = [entry.path, entry.text || ''];
    for (const rule of rules()) {
      if (values.some((value) => rule.pattern.test(value))) {
        findings.push({ path: entry.path, rule: rule.name });
      }
    }
  }
  return findings;
}

function trackedEntries() {
  let output = '';
  try {
    output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  } catch {
    return [];
  }
  return output.split('\0').filter(Boolean).flatMap((file) => {
    const bytes = fs.readFileSync(file);
    if (bytes.includes(0)) return [];
    return [{ path: file, text: bytes.toString('utf8') }];
  });
}

function historyEntry() {
  try {
    const count = Number(execFileSync('git', ['rev-list', '--all', '--count'], { encoding: 'utf8' }).trim());
    if (!count) return [];
    return [{
      path: '<git-history>',
      text: execFileSync('git', ['log', '-p', '--all'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }),
    }];
  } catch {
    return [];
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const entries = process.argv.includes('--stdin')
    ? [{ path: '<stdin>', text: await readStdin() }]
    : [...trackedEntries(), ...historyEntry()];
  const findings = scanEntries(entries);
  if (findings.length) {
    for (const finding of findings) console.error(finding.path + ': ' + finding.rule);
    process.exitCode = 1;
    return;
  }
  console.log('Public boundary check passed.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();

