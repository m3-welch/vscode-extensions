import * as vscode from 'vscode';
import { resolveStateFileUri } from './state-file-path';
import { classifyFileRead, type StateFileResult } from './state-file-model';

export class StateFileMonitor implements vscode.Disposable {
	private folder: vscode.WorkspaceFolder | undefined;
	private target: vscode.Uri | undefined;
	private watcher: vscode.FileSystemWatcher | undefined;
	private watcherSubscriptions: vscode.Disposable[] = [];
	private debounceTimer: NodeJS.Timeout | undefined;
	private generation = 0;
	private readSequence = 0;
	private initialized = false;

	constructor(private readonly onChange: (result: StateFileResult) => void) {}

	async watch(folder: vscode.WorkspaceFolder | undefined): Promise<void> {
		const target = folder ? resolveStateFileUri(folder) : undefined;
		if (this.initialized && this.target?.toString() === target?.toString()) {
			this.folder = folder;
			await this.refresh();
			return;
		}

		this.initialized = true;
		this.clearWatcher();
		this.folder = folder;
		this.target = target;
		const generation = ++this.generation;

		if (!folder || !target) {
			this.readSequence++;
			this.onChange({ kind: 'unavailable' });
			return;
		}

		this.watcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(vscode.Uri.joinPath(target, '..'), basename(target)),
			false,
			false,
			false,
		);
		const scheduleRefresh = () => {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}
			this.debounceTimer = setTimeout(() => {
				this.debounceTimer = undefined;
				if (generation === this.generation) {
					void this.refresh();
				}
			}, 75);
		};

		this.watcherSubscriptions = [
			this.watcher.onDidCreate(scheduleRefresh),
			this.watcher.onDidChange(scheduleRefresh),
			this.watcher.onDidDelete(scheduleRefresh),
		];

		await this.refresh();
	}

	async refresh(): Promise<void> {
		const folder = this.folder;
		const sequence = ++this.readSequence;

		if (!folder) {
			this.onChange({ kind: 'unavailable' });
			return;
		}

		this.onChange({ kind: 'loading' });

		try {
			const uri = resolveStateFileUri(folder);
			const content = await vscode.workspace.fs.readFile(uri);
			if (sequence === this.readSequence) {
				this.onChange(classifyFileRead(content));
			}
		} catch (error) {
			if (sequence === this.readSequence) {
				this.onChange(classifyFileRead(undefined, error));
			}
		}
	}

	dispose(): void {
		this.generation++;
		this.readSequence++;
		this.clearWatcher();
		this.folder = undefined;
		this.target = undefined;
	}

	private clearWatcher(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}

		this.watcherSubscriptions.forEach((subscription) => subscription.dispose());
		this.watcherSubscriptions = [];
		this.watcher?.dispose();
		this.watcher = undefined;
	}
}

function basename(uri: vscode.Uri): string {
	return uri.path.slice(uri.path.lastIndexOf('/') + 1);
}
