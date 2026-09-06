import test from 'node:test';
import assert from 'node:assert/strict';
import { scanEntries } from '../scripts/check-public-boundary.mjs';

test('public boundary rejects private product markers', () => {
  const privateCode = ['M', 'T', 'X'].join('') + '-001';
  const findings = scanEntries([{ path: 'config.json', text: privateCode }]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'private-product-marker');
});

test('public boundary rejects local absolute paths', () => {
  const posixPath = ['', 'Us' + 'ers', 'example', 'private.cif'].join('/');
  const windowsPath = ['C:', 'Us' + 'ers', 'example', 'private.cif'].join('\\');
  const findings = scanEntries([
    { path: 'notes.txt', text: posixPath },
    { path: 'notes-win.txt', text: windowsPath },
  ]);
  assert.equal(findings.length, 2);
  assert.ok(findings.every((finding) => finding.rule === 'local-user-path'));
});

test('public boundary accepts public MOF content', () => {
  assert.deepEqual(
    scanEntries([{ path: 'README.md', text: 'Render UiO-66 from a traceable CIF.' }]),
    [],
  );
});
