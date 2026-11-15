import * as vscode from 'vscode';
import { getStateProgress } from './report-renderer';
import { StateFileMonitor } from './state-file';
import { selectWorkspaceFolder, type StateFileResult } from './state-file-model';

export class StatusBarProgress implements vscode.Disposable {
	private readonly item: Pick<vscode.StatusBarItem, 'text' | 'command' | 'tooltip' | 'show' | 'hide' | 'dispose'>;
	private readonly monitor: Pick<StateFileMonitor, 'watch' | 'dispose'>;

	constructor(
		item: Pick<vscode.StatusBarItem, 'text' | 'command' | 'tooltip' | 'show' | 'hide' | 'dispose'> =
			vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100),
		monitorFactory: (onChange: (result: StateFileResult) => void) => Pick<StateFileMonitor, 'watch' | 'dispose'> =
			(onChange) => new StateFileMonitor(onChange),
	) {
		this.item = item;
		this.monitor = monitorFactory((result) => this.update(result));
		this.item.command = 'ai-dlc-state-tracker.openTracker';
		this.item.tooltip = 'Open AI-DLC State Tracker';
	}

	async refreshWorkspace(): Promise<void> {
		const folders = vscode.workspace.workspaceFolders ?? [];
		const activeEditorFolder = vscode.window.activeTextEditor
			? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
			: undefined;
		await this.monitor.watch(selectWorkspaceFolder(folders, activeEditorFolder));
	}

	dispose(): void {
		this.monitor.dispose();
		this.item.dispose();
	}

	private update(result: StateFileResult): void {
		if (result.kind !== 'ready') {
			this.item.hide();
			return;
		}

		const progress = getStateProgress(result.content);
		if (!progress) {
			this.item.hide();
			return;
		}

		this.item.text = `${progress.stageName} ${progress.completed}/${progress.total} (${progress.percentage}%)`;
		this.item.show();
	}
}
