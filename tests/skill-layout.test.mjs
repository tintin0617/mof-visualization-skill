import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../skill/mof-visualization/', import.meta.url);

test('public Skill contains the required package files', () => {
  for (const relative of [
    'SKILL.md',
    'agents/openai.yaml',
    'references/source-policy.md',
    'references/element-style.yaml',
    'scripts/acquire-structure.mjs',
    'scripts/prepare-structure.mjs',
    'scripts/validate-structure.mjs',
    'scripts/render-material.mjs',
    'scripts/render-batch.mjs',
  ]) {
    assert.equal(fs.existsSync(new URL(relative, root)), true, relative);
  }
});

test('public Skill describes configuration-driven MOF visualization', () => {
  const text = fs.readFileSync(new URL('SKILL.md', root), 'utf8');
  assert.match(text, /^---\nname: mof-visualization\n/);
  assert.match(text, /--config/);
  assert.doesNotMatch(text, /built-in material mapping/i);
});
