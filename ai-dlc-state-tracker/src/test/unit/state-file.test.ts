import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyFileRead, resolveStatePath, selectWorkspaceFolder } from '../../state-file-model';

test('selects the active editor folder when it belongs to the workspace', () => {
	const folders = [{ name: 'first' }, { name: 'active' }];

	assert.equal(selectWorkspaceFolder(folders, folders[1]), folders[1]);
});

test('falls back to the first folder when there is no active editor folder', () => {
	const folders = [{ name: 'first' }, { name: 'second' }];

	assert.equal(selectWorkspaceFolder(folders, undefined), folders[0]);
	assert.equal(selectWorkspaceFolder([], undefined), undefined);
});

test('classifies non-empty file content as ready', () => {
	assert.deepEqual(classifyFileRead(new TextEncoder().encode('# State')), {
		kind: 'ready',
		content: '# State',
	});
});

test('classifies empty and whitespace-only content as empty', () => {
	assert.deepEqual(classifyFileRead(new Uint8Array()), { kind: 'empty' });
	assert.deepEqual(classifyFileRead(new TextEncoder().encode(' \n\t')), { kind: 'empty' });
});

test('distinguishes a missing file from other read errors', () => {
	assert.deepEqual(classifyFileRead(undefined, { code: 'FileNotFound' }), { kind: 'missing' });
	assert.deepEqual(classifyFileRead(undefined, new Error('Permission denied')), {
		kind: 'error',
		message: 'Permission denied',
	});
});

test('resolves the default, relative, and absolute state file paths', () => {
	assert.equal(resolveStatePath('/ws', undefined), '/ws/aidlc-docs/aidlc-state.md');
	assert.equal(resolveStatePath('/ws', '  '), '/ws/aidlc-docs/aidlc-state.md');
	assert.equal(resolveStatePath('/ws', 'docs/state.md'), '/ws/docs/state.md');
	assert.equal(resolveStatePath('/ws', '/other/state.md'), '/other/state.md');
});
