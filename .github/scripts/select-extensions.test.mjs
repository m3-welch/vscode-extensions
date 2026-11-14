import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { listExtensions, selectExtensions } from './select-extensions.mjs';

test('discovers extension package directories dynamically', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'extensions-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'zeta'));
  await writeFile(path.join(root, 'zeta', 'package.json'), '{}');
  await mkdir(path.join(root, 'alpha'));
  await writeFile(path.join(root, 'alpha', 'package.json'), '{}');
  await mkdir(path.join(root, 'not-an-extension'));

  assert.deepEqual(await listExtensions(root), ['alpha', 'zeta']);
});

test('selects all discovered extensions', () => {
  assert.deepEqual(selectExtensions('all', ['alpha', 'zeta']), ['alpha', 'zeta']);
});

test('selects and trims comma-separated extensions without duplicates', () => {
  assert.deepEqual(selectExtensions(' zeta, alpha, zeta ', ['alpha', 'zeta']), ['zeta', 'alpha']);
});

test('rejects extension names outside the discovered list', () => {
  assert.throws(
    () => selectExtensions('missing', ['alpha']),
    /Unknown extension\(s\): missing\. Available extensions: alpha\./,
  );
});

test('rejects empty selections and an empty extension list', () => {
  assert.throws(() => selectExtensions('alpha,,zeta', ['alpha', 'zeta']), /Provide one or more/);
  assert.throws(() => selectExtensions('all', []), /No extension packages/);
});
