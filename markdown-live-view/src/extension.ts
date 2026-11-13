import * as vscode from 'vscode';
import { MarkdownLiveViewProvider } from './markdown-live-view-provider';
import { StoredViewState } from './view-state';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new MarkdownLiveViewProvider(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('markdownLiveView.openLive', async () => {
      const uri = getActiveMarkdownUri();
      if (!uri) {
        void vscode.window.showInformationMessage('Open a Markdown document first.');
        return;
      }
      const editor = vscode.window.activeTextEditor;
      const state = editor ? stateFromEditor(editor) : provider.currentViewState(uri);
      await provider.openLive(uri, state);
    }),
    vscode.commands.registerCommand('markdownLiveView.openSource', async () => {
      const uri = getActiveMarkdownUri();
      if (!uri) {
        void vscode.window.showInformationMessage('Open a Markdown document first.');
        return;
      }
      await provider.openSource(uri, provider.currentViewState(uri));
    })
  );
}

export function deactivate(): void {}

function getActiveMarkdownUri(): vscode.Uri | undefined {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (input && typeof input === 'object' && 'uri' in input) {
    const uri = (input as { uri?: unknown }).uri;
    if (uri instanceof vscode.Uri && isMarkdownUri(uri)) {
      return uri;
    }
  }
  const editor = vscode.window.activeTextEditor;
  if (editor && isMarkdownUri(editor.document.uri)) {
    return editor.document.uri;
  }
  return undefined;
}

function isMarkdownUri(uri: vscode.Uri): boolean {
  return /\.(md|markdown)$/i.test(uri.path);
}

function stateFromEditor(editor: vscode.TextEditor): StoredViewState {
  const textLength = editor.document.getText().length;
  return {
    selections: editor.selections.map((selection) => ({
      anchor: Math.min(editor.document.offsetAt(selection.anchor), textLength),
      head: Math.min(editor.document.offsetAt(selection.active), textLength)
    })),
    primaryIndex: Math.max(0, editor.selections.indexOf(editor.selection)),
    scrollTop: 0,
    scrollAnchor: editor.document.offsetAt(editor.visibleRanges[0]?.start ?? new vscode.Position(0, 0))
  };
}
