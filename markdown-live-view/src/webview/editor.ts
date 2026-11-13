import { ChangeSet, EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { drawSelection, EditorView, keymap } from '@codemirror/view';
import { createMarkdownRenderingExtension } from '../markdown-renderer';
import { markdownSupport } from '../markdown-language';
import { StoredViewState } from '../view-state';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

interface SyncMessage {
  type: 'sync';
  text: string;
  version: number;
  baseUri: string;
  viewState?: StoredViewState;
  changes?: Array<{ from: number; to: number; insert: string }>;
}

function requestHistory(action: 'undo' | 'redo'): void {
  if (pendingTransaction || queuedChanges.length > 0) {
    pendingHistoryAction = action;
    return;
  }
  vscode.postMessage({ type: action });
}

const vscode = acquireVsCodeApi();
const editorHost = document.getElementById('editor');
if (!editorHost) {
  throw new Error('Editor container was not found.');
}
const editorContainer: HTMLElement = editorHost;

let editor: EditorView | undefined;
let currentVersion = -1;
let currentBaseUri = '';
let currentTransactionId: string | undefined;
let isApplyingRemoteChange = false;
let transactionCounter = 0;
let pendingTransaction = false;
let pendingHistoryAction: 'undo' | 'redo' | undefined;
const queuedChanges: ChangeSet[] = [];
let currentDocumentLength = 0;
let scrollContainer: HTMLElement | undefined;

function sendViewState(): void {
  if (!editor) {
    return;
  }
  vscode.postMessage({
    type: 'selection',
    viewState: {
      selections: editor.state.selection.ranges.map(({ anchor, head }) => ({ anchor, head })),
      primaryIndex: editor.state.selection.mainIndex,
      scrollTop: editor.scrollDOM.scrollTop,
      scrollAnchor: editor.lineBlockAtHeight(editor.scrollDOM.scrollTop).from
    }
  });
}

function sendNextEdit(): void {
  if (pendingTransaction || currentVersion < 0 || !editor) {
    return;
  }
  if (queuedChanges.length === 0) {
    if (pendingHistoryAction) {
      vscode.postMessage({ type: pendingHistoryAction });
      pendingHistoryAction = undefined;
    }
    return;
  }

  pendingTransaction = true;
  const changes = queuedChanges[0];
  currentTransactionId = `cm-${Date.now()}-${transactionCounter++}`;
  vscode.postMessage({
    type: 'edit',
    baseVersion: currentVersion,
    transactionId: currentTransactionId,
    changes: changesToArray(changes)
  });
}

function changesToArray(changes: ChangeSet): Array<{ from: number; to: number; insert: string }> {
  const result: Array<{ from: number; to: number; insert: string }> = [];
  changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    result.push({ from: fromA, to: toA, insert: inserted.toString() });
  });
  return result;
}

function applyExternalChanges(message: SyncMessage): void {
  if (!editor || !message.changes) {
    return;
  }

  let remote = ChangeSet.of(message.changes, currentDocumentLength);
  for (let index = 0; index < queuedChanges.length; index += 1) {
    const local = queuedChanges[index];
    queuedChanges[index] = local.map(remote, true);
    remote = remote.map(local, false);
  }

  isApplyingRemoteChange = true;
  editor.dispatch({
    changes: remote,
    annotations: Transaction.addToHistory.of(false)
  });
  isApplyingRemoteChange = false;
  currentDocumentLength = message.text.length;
  currentVersion = message.version;
  currentBaseUri = message.baseUri;
  sendViewState();
  sendNextEdit();
}

function selectionFromViewState(
  viewState: StoredViewState | undefined,
  documentLength: number
): EditorSelection {
  const ranges = viewState?.selections?.length
    ? viewState.selections.map(({ anchor, head }) => ({
        anchor: Math.min(Math.max(0, anchor), documentLength),
        head: Math.min(Math.max(0, head), documentLength)
      }))
    : [{ anchor: 0, head: 0 }];
  const mainIndex = Math.min(Math.max(0, viewState?.primaryIndex ?? 0), ranges.length - 1);
  return EditorSelection.create(
    ranges.map(({ anchor, head }) => EditorSelection.range(anchor, head)),
    mainIndex
  );
}

function initialize(message: SyncMessage): void {
  if (editor && message.changes) {
    applyExternalChanges(message);
    return;
  }

  currentVersion = message.version;
  currentBaseUri = message.baseUri;
  queuedChanges.length = 0;
  pendingTransaction = false;
  pendingHistoryAction = undefined;
  currentDocumentLength = message.text.length;

  if (!editor) {
    editor = new EditorView({
      state: EditorState.create({
        doc: message.text,
        selection: selectionFromViewState(message.viewState, message.text.length),
        extensions: [
          markdownSupport,
          EditorState.allowMultipleSelections.of(true),
          drawSelection(),
          createMarkdownRenderingExtension(currentBaseUri),
          keymap.of([
            {
              key: 'Mod-z',
              run: () => {
                requestHistory('undo');
                return true;
              }
            },
            {
              key: 'Mod-Shift-z',
              run: () => {
                requestHistory('redo');
                return true;
              }
            },
            {
              key: 'Mod-y',
              run: () => {
                requestHistory('redo');
                return true;
              }
            }
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isApplyingRemoteChange) {
              queuedChanges.push(update.changes);
              sendNextEdit();
            }
            if (update.selectionSet) {
              sendViewState();
            }
          })
        ]
      }),
      parent: editorContainer
    });
    editor.focus();
    scrollContainer = editor.scrollDOM;
    scrollContainer.addEventListener('scroll', sendViewState, { passive: true });
  } else {
    isApplyingRemoteChange = true;
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: message.text
      },
      selection: selectionFromViewState(message.viewState, message.text.length),
      annotations: Transaction.addToHistory.of(false)
    });
    currentBaseUri = message.baseUri;
    isApplyingRemoteChange = false;
  }

  editor.scrollDOM.scrollTop = Math.max(0, message.viewState?.scrollTop ?? 0);
  if (Number.isSafeInteger(message.viewState?.scrollAnchor)) {
    editor.dispatch({
      effects: EditorView.scrollIntoView(message.viewState!.scrollAnchor!, { y: 'start' })
    });
  }
  sendViewState();
}

window.addEventListener('message', (event: MessageEvent<SyncMessage | Record<string, unknown>>) => {
  const message = event.data;
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.type === 'sync') {
    const sync = message as SyncMessage;
    if (Number.isSafeInteger(sync.version) && typeof sync.text === 'string') {
      initialize(sync);
    }
  } else if (message.type === 'ack') {
    const ack = message as { version?: number; transactionId?: string };
    if (Number.isSafeInteger(ack.version) && ack.transactionId === currentTransactionId) {
      currentVersion = ack.version!;
      queuedChanges.shift();
      pendingTransaction = false;
      currentTransactionId = undefined;
      sendNextEdit();
    }
  } else if (message.type === 'reject') {
    const rejected = message as { version?: number; transactionId?: string };
    if (Number.isSafeInteger(rejected.version) && rejected.transactionId === currentTransactionId) {
      currentVersion = rejected.version!;
      pendingTransaction = false;
      currentTransactionId = undefined;
      sendNextEdit();
    }
  } else if (message.type === 'restoreViewState' && editor) {
    const restore = message as { viewState?: StoredViewState };
    editor.dispatch({
      selection: selectionFromViewState(restore.viewState, editor.state.doc.length)
    });
    if (restore.viewState) {
      editor.scrollDOM.scrollTop = Math.max(0, restore.viewState.scrollTop);
      if (Number.isSafeInteger(restore.viewState.scrollAnchor)) {
        editor.dispatch({
          effects: EditorView.scrollIntoView(restore.viewState.scrollAnchor!, { y: 'start' })
        });
      }
    }
  }
});

window.addEventListener(
  'unload',
  () => scrollContainer?.removeEventListener('scroll', sendViewState),
  { once: true }
);

vscode.postMessage({ type: 'ready' });
