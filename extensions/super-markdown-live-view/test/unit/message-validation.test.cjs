const assert = require('node:assert/strict');
const test = require('node:test');
const { classifyLink, isWebviewEditMessage } = require('../../dist/unit/message-validation.js');
const { normalizeViewState } = require('../../dist/unit/view-state.js');

test('accepts version-matched non-overlapping edits within the document', () => {
  assert.equal(
    isWebviewEditMessage(
      {
        type: 'edit',
        baseVersion: 4,
        transactionId: 'txn-1',
        changes: [
          { from: 1, to: 2, insert: 'x' },
          { from: 4, to: 4, insert: 'y' }
        ]
      },
      4,
      5
    ),
    true
  );
});

test('rejects stale, invalid, overlapping, and oversized edit messages', () => {
  const valid = {
    type: 'edit',
    baseVersion: 4,
    transactionId: 'txn-1',
    changes: [{ from: 1, to: 2, insert: 'x' }]
  };
  assert.equal(isWebviewEditMessage(valid, 5, 5), false);
  assert.equal(
    isWebviewEditMessage({ ...valid, changes: [{ from: -1, to: 2, insert: 'x' }] }, 4, 5),
    false
  );
  assert.equal(
    isWebviewEditMessage(
      {
        ...valid,
        changes: [
          { from: 1, to: 1, insert: 'first' },
          { from: 1, to: 1, insert: 'second' }
        ]
      },
      4,
      5
    ),
    false
  );
  assert.equal(
    isWebviewEditMessage(
      {
        ...valid,
        changes: [
          { from: 0, to: 3, insert: '' },
          { from: 2, to: 4, insert: '' }
        ]
      },
      4,
      5
    ),
    false
  );
  assert.equal(
    isWebviewEditMessage(
      { ...valid, changes: [{ from: 1, to: 2, insert: 'x'.repeat(1_000_001) }] },
      4,
      5
    ),
    false
  );
});

test('normalizes restored selections and scroll state to current document bounds', () => {
  assert.deepEqual(
    normalizeViewState(
      {
        selections: [
          { anchor: 2, head: 5 },
          { anchor: 100, head: 200 },
          { anchor: -1, head: 3 }
        ],
        primaryIndex: 9,
        scrollTop: -4
      },
      10
    ),
    {
      selections: [
        { anchor: 2, head: 5 },
        { anchor: 10, head: 10 }
      ],
      primaryIndex: 1,
      scrollTop: 0,
      scrollAnchor: 0
    }
  );
});

test('classifies only safe link targets', () => {
  assert.deepEqual(classifyLink('https://example.com/a'), {
    kind: 'external',
    url: 'https://example.com/a'
  });
  assert.deepEqual(classifyLink('mailto:a@b.c'), { kind: 'external', url: 'mailto:a@b.c' });
  assert.deepEqual(classifyLink('../docs/a%20b.md#top'), { kind: 'file', path: '../docs/a b.md' });
  assert.equal(classifyLink('command:workbench.action.reloadWindow'), undefined);
  assert.equal(classifyLink('vscode://file/etc/passwd'), undefined);
  assert.equal(classifyLink('#heading'), undefined);
  assert.equal(classifyLink('/etc/passwd'), undefined);
  assert.equal(classifyLink(42), undefined);
});
