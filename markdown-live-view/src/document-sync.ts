import * as vscode from 'vscode';
import * as path from 'node:path';
import { EditChange, isWebviewEditMessage, WebviewEditMessage } from './message-validation';
import { StoredViewState } from './view-state';

export interface WebviewPanelState {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  disposables: vscode.Disposable[];
}

export class DocumentSync {
  private readonly panels = new Map<string, Set<WebviewPanelState>>();
  private readonly editQueues = new Map<string, Promise<void>>();
  private readonly pendingOrigins = new Map<
    string,
    {
      panel: vscode.WebviewPanel;
      transactionId: string;
      changes: EditChange[];
    }
  >();

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => this.onDocumentChanged(event))
    );
  }

  attach(panelState: WebviewPanelState, initialViewState?: StoredViewState): void {
    const key = panelState.document.uri.toString();
    const documentPanels = this.panels.get(key) ?? new Set<WebviewPanelState>();
    documentPanels.add(panelState);
    this.panels.set(key, documentPanels);

    panelState.disposables.push(
      panelState.panel.webview.onDidReceiveMessage((message: unknown) =>
        this.onMessage(panelState, message)
      ),
      panelState.panel.onDidDispose(() => this.detach(panelState))
    );
    this.sendDocument(panelState, initialViewState);
  }

  getViewState(uri: vscode.Uri): StoredViewState | undefined {
    const panels = this.panels.get(uri.toString());
    for (const state of panels ?? []) {
      if (state.panel.active) {
        return stateViewState.get(state.panel);
      }
    }
    return panels ? [...panels].map(({ panel }) => stateViewState.get(panel)).find(Boolean) : undefined;
  }

  setViewState(uri: vscode.Uri, state: StoredViewState): void {
    const panels = this.panels.get(uri.toString());
    for (const panelState of panels ?? []) {
      panelState.panel.webview.postMessage({ type: 'restoreViewState', viewState: state });
    }
  }

  forget(uri: vscode.Uri): void {
    this.panels.delete(uri.toString());
  }

  private async onMessage(panelState: WebviewPanelState, value: unknown): Promise<void> {
    if (!value || typeof value !== 'object') {
      return;
    }

    const message = value as Record<string, unknown>;
    if (message.type === 'ready') {
      this.sendDocument(panelState);
      return;
    }

    if (message.type === 'selection') {
      const state = parseViewState(message.viewState, panelState.document.getText().length);
      if (state) {
        stateViewState.set(panelState.panel, state);
      }
      return;
    }

    if (message.type === 'undo' || message.type === 'redo') {
      await vscode.commands.executeCommand(message.type);
      return;
    }

    const document = panelState.document;
    if (!isWebviewEditMessage(value, document.version, document.getText().length)) {
      this.sendDocument(panelState);
      return;
    }

    await this.enqueueEdit(panelState, value);
  }

  private enqueueEdit(panelState: WebviewPanelState, message: WebviewEditMessage): Promise<void> {
    const key = panelState.document.uri.toString();
    const previous = this.editQueues.get(key) ?? Promise.resolve();
    const queued = previous
      .catch(() => undefined)
      .then(() => this.applyEdit(panelState, message))
      .catch(() => this.sendDocument(panelState));
    this.editQueues.set(key, queued);
    return queued.finally(() => {
      if (this.editQueues.get(key) === queued) {
        this.editQueues.delete(key);
      }
    });
  }

  private async applyEdit(panelState: WebviewPanelState, message: WebviewEditMessage): Promise<void> {
    const document = panelState.document;
    if (!isWebviewEditMessage(message, document.version, document.getText().length)) {
      this.sendDocument(panelState);
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const change of message.changes) {
      edit.replace(
        document.uri,
        new vscode.Range(document.positionAt(change.from), document.positionAt(change.to)),
        change.insert
      );
    }

    const transactionKey = document.uri.toString();
    const pendingOrigin = {
      panel: panelState.panel,
      transactionId: message.transactionId,
      changes: message.changes
    };
    this.pendingOrigins.set(transactionKey, pendingOrigin);

    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      if (this.pendingOrigins.get(transactionKey) === pendingOrigin) {
        this.pendingOrigins.delete(transactionKey);
      }
      this.sendDocument(panelState);
      return;
    }

    if (this.pendingOrigins.get(transactionKey) === pendingOrigin) {
      this.pendingOrigins.delete(transactionKey);
      panelState.panel.webview.postMessage({
        type: 'ack',
        transactionId: message.transactionId,
        version: document.version
      });
    }
  }

  private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
    const panels = this.panels.get(event.document.uri.toString());
    if (!panels) {
      return;
    }

    const docKey = event.document.uri.toString();
    const pendingOrigin = this.pendingOrigins.get(docKey);
    const isOriginEvent =
      pendingOrigin !== undefined && matchesChange(event, pendingOrigin.changes);
    if (isOriginEvent) {
      pendingOrigin.panel.webview.postMessage({
        type: 'ack',
        transactionId: pendingOrigin.transactionId,
        version: event.document.version
      });
      this.pendingOrigins.delete(docKey);
    }

    for (const panelState of panels) {
      const isOrigin = isOriginEvent && pendingOrigin.panel === panelState.panel;
      if (!isOrigin) {
        this.sendDocument(panelState);
      }
    }
  }

  private sendDocument(panelState: WebviewPanelState, viewState?: StoredViewState): void {
    const document = panelState.document;
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    const resourceRoot =
      folder?.uri ??
      (document.uri.scheme === 'file'
        ? vscode.Uri.file(path.dirname(document.uri.fsPath))
        : vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'));
    const imageBase =
      document.uri.scheme === 'file'
        ? vscode.Uri.file(path.dirname(document.uri.fsPath))
        : resourceRoot;
    const baseUri = panelState.panel.webview
      .asWebviewUri(vscode.Uri.joinPath(imageBase, '__markdown_live_view_base__.md'))
      .toString();

    panelState.panel.webview.postMessage({
      type: 'sync',
      text: document.getText(),
      version: document.version,
      baseUri,
      viewState: viewState ?? stateViewState.get(panelState.panel)
    });
  }

  private detach(panelState: WebviewPanelState): void {
    const key = panelState.document.uri.toString();
    const panels = this.panels.get(key);
    panels?.delete(panelState);
    if (panels?.size === 0) {
      this.panels.delete(key);
    }
    panelState.disposables.forEach((disposable) => disposable.dispose());
  }
}

function matchesChange(
  event: vscode.TextDocumentChangeEvent,
  changes: readonly EditChange[]
): boolean {
  const expected = changes
    .map(({ from, to, insert }) => `${from}:${to - from}:${insert}`)
    .sort();
  const actual = event.contentChanges
    .map(({ rangeOffset, rangeLength, text }) => `${rangeOffset}:${rangeLength}:${text}`)
    .sort();
  return expected.length === actual.length && expected.every((change, index) => change === actual[index]);
}

const stateViewState = new WeakMap<vscode.WebviewPanel, StoredViewState>();

function parseViewState(value: unknown, documentLength: number): StoredViewState | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const state = value as Partial<StoredViewState>;
  if (
    !Array.isArray(state.selections) ||
    state.selections.length === 0 ||
    state.selections.length > 1000 ||
    !Number.isSafeInteger(state.primaryIndex) ||
    typeof state.scrollTop !== 'number'
  ) {
    return undefined;
  }
  const selections = state.selections.filter(
    (selection): selection is { anchor: number; head: number } =>
      !!selection &&
      Number.isSafeInteger(selection.anchor) &&
      Number.isSafeInteger(selection.head) &&
      selection.anchor >= 0 &&
      selection.head >= 0 &&
      selection.anchor <= documentLength &&
      selection.head <= documentLength
  );
  if (selections.length !== state.selections.length || selections.length === 0) {
    return undefined;
  }
  return {
    selections,
    primaryIndex: Math.min(Math.max(state.primaryIndex ?? 0, 0), selections.length - 1),
    scrollTop: Number.isFinite(state.scrollTop) ? Math.max(0, state.scrollTop) : 0,
    scrollAnchor:
      Number.isSafeInteger(state.scrollAnchor) && state.scrollAnchor! >= 0
        ? Math.min(state.scrollAnchor!, documentLength)
        : 0
  };
}
