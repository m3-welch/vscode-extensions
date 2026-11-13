import * as vscode from 'vscode';
import { renderMarkdown } from './markdown-renderer';
import { StateFileMonitor } from './state-file';
import { selectWorkspaceFolder, type StateFileResult } from './state-file-model';

const viewId = 'ai-dlc-state-tracker.stateView';
const contentSecurityPolicy = "default-src 'none'; style-src 'unsafe-inline';";

export class StateViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
	private view: vscode.WebviewView | undefined;
	private readonly monitor = new StateFileMonitor((result) => this.render(result));

	resolveWebviewView(view: vscode.WebviewView): void {
		this.view = view;
		view.webview.options = { enableScripts: false };
		view.webview.html = this.getHtml({ kind: 'loading' });
		view.onDidDispose(() => {
			if (this.view === view) {
				this.view = undefined;
				this.monitor.dispose();
			}
		});
		void this.refreshWorkspace();
	}

	async refreshWorkspace(): Promise<void> {
		if (!this.view) {
			return;
		}

		const folders = vscode.workspace.workspaceFolders ?? [];
		const activeEditorFolder = vscode.window.activeTextEditor
			? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
			: undefined;
		await this.monitor.watch(selectWorkspaceFolder(folders, activeEditorFolder));
	}

	dispose(): void {
		this.monitor.dispose();
		this.view = undefined;
	}

	private render(result: StateFileResult): void {
		if (this.view) {
			this.view.webview.html = this.getHtml(result);
		}
	}

	private getHtml(result: StateFileResult): string {
		let title: string;
		let body: string;

		switch (result.kind) {
			case 'loading':
				title = 'AI-DLC State';
				body = '<p class="message">Loading the workspace state file…</p>';
				break;
			case 'ready':
				title = 'AI-DLC State';
				body = `<article>${renderMarkdown(result.content)}</article>`;
				break;
			case 'empty':
				title = 'AI-DLC State';
				body = '<p class="message">The <code>aidlc-state.md</code> file is empty.</p>';
				break;
			case 'missing':
				title = 'AI-DLC State';
				body = '<p class="message">No <code>aidlc-state.md</code> file was found in the selected workspace folder.</p>';
				break;
			case 'unavailable':
				title = 'AI-DLC State';
				body = '<p class="message">Open a workspace folder to view its <code>aidlc-state.md</code> file.</p>';
				break;
			case 'error':
				title = 'AI-DLC State';
				body = `<p class="message">${escapeHtml(result.message)}</p>`;
				break;
		}

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title}</title>
	<style>
		:root { color-scheme: light dark; }
		body { padding: 0 16px 24px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); line-height: 1.55; }
		h1, h2, h3 { line-height: 1.25; }
		h1 { font-size: 1.45em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.4em; }
		h2 { font-size: 1.2em; margin-top: 1.5em; }
		a { color: var(--vscode-textLink-foreground); }
		code { font-family: var(--vscode-editor-font-family); background: var(--vscode-textCodeBlock-background); padding: 0.1em 0.3em; border-radius: 3px; }
		pre { overflow-x: auto; padding: 12px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; }
		pre code { padding: 0; background: transparent; }
		blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid var(--vscode-textBlockQuote-border); color: var(--vscode-descriptionForeground); }
		table { border-collapse: collapse; display: block; overflow-x: auto; }
		th, td { padding: 5px 9px; border: 1px solid var(--vscode-panel-border); }
		.message { color: var(--vscode-descriptionForeground); }
		.image-placeholder { color: var(--vscode-descriptionForeground); font-style: italic; }
	</style>
</head>
<body><h1>${title}</h1>${body}</body>
</html>`;
	}
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export { viewId };
