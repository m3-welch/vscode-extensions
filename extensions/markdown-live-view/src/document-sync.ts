import * as vscode from 'vscode';
import * as path from 'node:path';
import { classifyLink, EditChange, isWebviewEditMessage, WebviewEditMessage } from './message-validation';
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

  private async openLink(documentUri: vscode.Uri, href: unknown): Promise<void> {
    const target = classifyLink(href);
    if (target?.kind === 'external') {
      await vscode.env.openExternal(vscode.Uri.parse(target.url, true));
    } else if (target?.kind === 'file') {
      await vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.joinPath(documentUri, '..', target.path)
      );
    }
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

    if (message.type === 'openLink') {
      await this.openLink(panelState.document.uri, message.href);
      return;
    }

    if (message.type === 'undo' || message.type === 'redo') {
      await vscode.commands.executeCommand(message.type);
      return;
    }

    const document = panelState.document;
    if (!isWebviewEditMessage(value, document.version, document.getText().length)) {
      const message = value as Partial<WebviewEditMessage>;
      if (
        isWebviewEditMessage(value, message.baseVersion ?? -1, document.getText().length) &&
        message.baseVersion !== document.version
      ) {
        panelState.panel.webview.postMessage({
          type: 'reject',
          transactionId: message.transactionId,
          version: document.version
        });
        return;
      }
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
    const value: unknown = message;
    if (!isWebviewEditMessage(value, document.version, document.getText().length)) {
      if (message.baseVersion !== document.version) {
        panelState.panel.webview.postMessage({
          type: 'reject',
          transactionId: message.transactionId,
          version: document.version
        });
      } else {
        this.sendDocument(panelState);
      }
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

    if (document.version !== message.baseVersion) {
      panelState.panel.webview.postMessage({
        type: 'reject',
        transactionId: message.transactionId,
        version: document.version
      });
      return;
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
      if (document.version !== message.baseVersion) {
        panelState.panel.webview.postMessage({
          type: 'reject',
          transactionId: message.transactionId,
          version: document.version
        });
      } else {
        this.sendDocument(panelState);
      }
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

    const changes = event.contentChanges
      .map(({ rangeOffset, rangeLength, text }) => ({
        from: rangeOffset,
        to: rangeOffset + rangeLength,
        insert: text
      }))
      .sort((a, b) => a.from - b.from);

    for (const panelState of panels) {
      const isOrigin = isOriginEvent && pendingOrigin.panel === panelState.panel;
      if (!isOrigin) {
        const viewState = stateViewState.get(panelState.panel);
        if (viewState) {
          stateViewState.set(panelState.panel, mapViewState(viewState, changes));
        }
        this.sendDocument(panelState, undefined, changes);
      }
    }
  }

  private sendDocument(
    panelState: WebviewPanelState,
    viewState?: StoredViewState,
    changes?: EditChange[]
  ): void {
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
      viewState: viewState ?? stateViewState.get(panelState.panel),
      changes
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

function mapViewState(
  viewState: StoredViewState,
  changes: readonly EditChange[]
): StoredViewState {
  const mapPosition = (position: number, association: -1 | 1): number => {
    let offset = 0;
    for (const change of changes) {
      const removed = change.to - change.from;
      if (position < change.from || (position === change.from && association < 0)) {
        break;
      }
      if (position <= change.to) {
        return change.from + offset + (association < 0 ? 0 : change.insert.length);
      }
      offset += change.insert.length - removed;
    }
    return Math.max(0, position + offset);
  };

  return {
    ...viewState,
    selections: viewState.selections.map(({ anchor, head }) => ({
      anchor: mapPosition(anchor, anchor <= head ? -1 : 1),
      head: mapPosition(head, anchor <= head ? 1 : -1)
    })),
    scrollAnchor: mapPosition(viewState.scrollAnchor ?? 0, -1)
  };
}
