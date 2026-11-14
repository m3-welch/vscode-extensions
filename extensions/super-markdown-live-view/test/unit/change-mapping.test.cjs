const assert = require('node:assert/strict');
const test = require('node:test');
const { ChangeSet, Text } = require('@codemirror/state');
const { rebaseQueuedChanges } = require('../../out/src/webview/change-mapping.js');

test('rebases same-position remote edits before queued local edits', () => {
  const base = Text.of(['ab']);
  const local = ChangeSet.of([{ from: 1, to: 1, insert: 'L' }], base.length);
  const remote = ChangeSet.of([{ from: 1, to: 1, insert: 'R' }], base.length);
  const queuedChanges = [local];

  const mappedRemote = rebaseQueuedChanges(remote, queuedChanges);

  assert.equal(mappedRemote.apply(local.apply(base)).toString(), 'aRLb');
  assert.equal(queuedChanges[0].apply(remote.apply(base)).toString(), 'aRLb');
});
