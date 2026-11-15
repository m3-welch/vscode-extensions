import * as vscode from 'vscode';
import { pickStateFilePath, stateFilePathSetting } from './state-file-path';
import { StatusBarProgress } from './status-bar-progress';
import { StateViewProvider, viewId } from './state-view-provider';

export function activate(context: vscode.ExtensionContext): void {
	const provider = new StateViewProvider();
	const statusBarProgress = new StatusBarProgress();
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(viewId, provider),
		provider,
		statusBarProgress,
		vscode.commands.registerCommand('ai-dlc-state-tracker.openTracker', async () => {
			await vscode.commands.executeCommand('workbench.view.explorer');
			await vscode.commands.executeCommand('workbench.action.focusView', viewId);
		}),
		vscode.commands.registerCommand('ai-dlc-state-tracker.setStateFilePath', async () => {
			if (await pickStateFilePath()) {
				await provider.refreshWorkspace();
			}
		}),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(stateFilePathSetting)) {
				void provider.refreshWorkspace();
				void statusBarProgress.refreshWorkspace();
			}
		}),
		vscode.window.onDidChangeActiveTextEditor(() => {
			void provider.refreshWorkspace();
			void statusBarProgress.refreshWorkspace();
		}),
		vscode.workspace.onDidChangeWorkspaceFolders(() => {
			void provider.refreshWorkspace();
			void statusBarProgress.refreshWorkspace();
		}),
	);
	void statusBarProgress.refreshWorkspace();
}

export function deactivate(): void {}
