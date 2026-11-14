import { ChangeSet } from '@codemirror/state';

export function rebaseQueuedChanges(
  remote: ChangeSet,
  queuedChanges: ChangeSet[]
): ChangeSet {
  let mappedRemote = remote;
  for (let index = 0; index < queuedChanges.length; index += 1) {
    const local = queuedChanges[index];
    queuedChanges[index] = local.map(mappedRemote, false);
    mappedRemote = mappedRemote.map(local, true);
  }
  return mappedRemote;
}
