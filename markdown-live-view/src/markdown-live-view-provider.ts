import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { DocumentSync, WebviewPanelState } from './document-sync';
import { StoredViewState } from './view-state';

export const MARKDOWN_LIVE_VIEW_TYPE = 'markdownLiveView.editor';

export class MarkdownLiveViewProvider implements vscode.CustomTextEditorProvider {
  private readonly sync: DocumentSync;
  private readonly viewStates = new Map<string, StoredViewState>();

  constructor(private readonly context: vscode.ExtensionContext) {
    this.sync = new DocumentSync(context);
    context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(MARKDOWN_LIVE_VIEW_TYPE, this, {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: true
      })
    );
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const root = this.getResourceRoot(document);
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'), root]
    };
    panel.webview.html = this.getHtml(panel.webview);

    const panelState: WebviewPanelState = {
      panel,
      document,
      disposables: []
    };
    panelState.disposables.push(
      panel.webview.onDidReceiveMessage((message: unknown) => {
        if (
          message &&
          typeof message === 'object' &&
          (message as { type?: string }).type === 'selection'
        ) {
          const viewState = (message as { viewState?: StoredViewState }).viewState;
          if (viewState) {
            this.viewStates.set(document.uri.toString(), viewState);
          }
        }
      })
    );
    panel.onDidDispose(() => this.rememberState(document.uri, panelState));
    this.sync.attach(panelState, this.viewStates.get(document.uri.toString()));
  }

  async openLive(uri: vscode.Uri, state?: StoredViewState): Promise<void> {
    if (state) {
      this.viewStates.set(uri.toString(), state);
    }
    await vscode.commands.executeCommand('vscode.openWith', uri, MARKDOWN_LIVE_VIEW_TYPE);
  }

  async openSource(uri: vscode.Uri, state?: StoredViewState): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    if (state) {
      const bounded = state.selections.map(({ anchor, head }) => ({
        anchor: Math.min(anchor, document.getText().length),
        head: Math.min(head, document.getText().length)
      }));
      editor.selections = bounded.map(
        ({ anchor, head }) =>
          new vscode.Selection(document.positionAt(anchor), document.positionAt(head))
      );
      if (Number.isSafeInteger(state.scrollAnchor)) {
        const anchorPosition = document.positionAt(state.scrollAnchor!);
        editor.revealRange(
          new vscode.Range(anchorPosition, anchorPosition),
          vscode.TextEditorRevealType.AtTop
        );
      }
      editor.revealRange(
        new vscode.Range(editor.selection.active, editor.selection.active),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport
      );
    }
  }

  currentViewState(uri: vscode.Uri): StoredViewState | undefined {
    return this.viewStates.get(uri.toString()) ?? this.sync.getViewState(uri);
  }

  private rememberState(uri: vscode.Uri, panelState: WebviewPanelState): void {
    const state = this.sync.getViewState(uri);
    if (state) {
      this.viewStates.set(uri.toString(), state);
    }
    panelState.disposables.forEach((disposable) => disposable.dispose());
  }

  private getResourceRoot(document: vscode.TextDocument): vscode.Uri {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder) {
      return workspaceFolder.uri;
    }
    if (document.uri.scheme === 'file') {
      return vscode.Uri.file(path.dirname(document.uri.fsPath));
    }
    return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview');
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = createNonce();
    const script = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'editor.js')
    );
    const styles = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'editor.css')
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styles}">
  <title>Markdown Live View</title>
</head>
<body>
  <main id="editor" aria-label="Markdown Live View editor"></main>
  <script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}

function createNonce(): string {
  return randomBytes(16).toString('base64');
}
