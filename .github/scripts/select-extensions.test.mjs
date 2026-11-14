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
  assert.deepEqual(selectExtensions({ all: true, alpha: false }, ['alpha', 'zeta']), ['alpha', 'zeta']);
});

test('selects checked extensions in discovery order', () => {
  assert.deepEqual(
    selectExtensions({ all: false, zeta: 'true', alpha: true, beta: false }, ['alpha', 'beta', 'zeta']),
    ['alpha', 'zeta'],
  );
});

test('rejects empty selections and an empty extension list', () => {
  assert.throws(() => selectExtensions({ all: false, alpha: false }, ['alpha']), /Select at least one/);
  assert.throws(() => selectExtensions({ all: true }, []), /No extension packages/);
});
