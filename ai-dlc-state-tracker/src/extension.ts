import * as vscode from 'vscode';
import { StateViewProvider, viewId } from './state-view-provider';

export function activate(context: vscode.ExtensionContext): void {
	const provider = new StateViewProvider();
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(viewId, provider),
		provider,
		vscode.commands.registerCommand('ai-dlc-state-tracker.openTracker', async () => {
			await vscode.commands.executeCommand('workbench.view.explorer');
			await vscode.commands.executeCommand('workbench.action.focusView', viewId);
		}),
		vscode.window.onDidChangeActiveTextEditor(() => {
			void provider.refreshWorkspace();
		}),
		vscode.workspace.onDidChangeWorkspaceFolders(() => {
			void provider.refreshWorkspace();
		}),
	);
}

export function deactivate(): void {}
