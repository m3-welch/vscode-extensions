const assert = require('node:assert/strict');
const test = require('node:test');
const { isWebviewEditMessage } = require('../../dist/unit/message-validation.js');
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
      scrollTop: 0
    }
  );
});
