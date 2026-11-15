import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { StateFileMonitor } from '../state-file';
import { StatusBarProgress } from '../status-bar-progress';
import type { StateFileResult } from '../state-file-model';
import { resolveStateFileUri } from '../state-file-path';

suite('AI-DLC State Tracker', () => {
	test('contributes an identifiable view and an open command', async () => {
		const extension = vscode.extensions.getExtension('m3-welch.ai-dlc-state-tracker');
		assert.ok(extension);
		await extension.activate();

		const contributedViews = extension.packageJSON.contributes.views.explorer;
		assert.ok(contributedViews.some((view: { name: string }) => view.name === 'AI-DLC State Tracker'));

		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('ai-dlc-state-tracker.openTracker'));
		await vscode.commands.executeCommand('ai-dlc-state-tracker.openTracker');
	});

	test('reports an unavailable state when no workspace folder is selected', async () => {
		const states: StateFileResult[] = [];
		const monitor = new StateFileMonitor((state) => states.push(state));

		try {
			await monitor.watch(undefined);
			assert.ok(states.some((state) => state.kind === 'unavailable'));
		} finally {
			monitor.dispose();
		}
	});

	test('shows ready progress, hides unavailable progress, and wires the tracker command', async () => {
		let shown = 0;
		let hidden = 0;
		let update: ((state: StateFileResult) => void) | undefined;
		const item: Pick<vscode.StatusBarItem, 'text' | 'command' | 'tooltip' | 'show' | 'hide' | 'dispose'> = {
			text: '',
			command: undefined,
			tooltip: undefined,
			show: () => shown++,
			hide: () => hidden++,
			dispose: () => {},
		};
		const monitor = { watch: async () => {}, dispose: () => {} };
		const progress = new StatusBarProgress(item, (onChange) => {
			update = onChange;
			return monitor;
		});

		try {
			assert.equal(item.command, 'ai-dlc-state-tracker.openTracker');
			assert.equal(item.tooltip, 'Open AI-DLC State Tracker');

			update?.({ kind: 'ready', content: '## Phase 1: Setup\n- [x] 1.1 Complete\n- [ ] 1.2 Pending' });
			assert.equal(item.text, 'Phase 1: Setup 1/2 (50%)');
			assert.equal(shown, 1);
			assert.equal(hidden, 0);

			update?.({ kind: 'missing' });
			update?.({ kind: 'ready', content: '# No checklist' });
			assert.equal(hidden, 2);

			const extension = vscode.extensions.getExtension('m3-welch.ai-dlc-state-tracker');
			assert.ok(extension);
			await extension.activate();
			assert.equal(typeof item.command, 'string');
			await vscode.commands.executeCommand(item.command as string);
		} finally {
			progress.dispose();
		}
	});

	test('preserves the workspace URI scheme when resolving the state file', () => {
		const folderUri = vscode.Uri.parse('vscode-remote://ssh-remote+host/workspace');
		const folder = { uri: folderUri } as vscode.WorkspaceFolder;

		const stateFileUri = resolveStateFileUri(folder);

		assert.equal(stateFileUri.scheme, folderUri.scheme);
		assert.equal(stateFileUri.authority, folderUri.authority);
		assert.equal(stateFileUri.path, '/workspace/aidlc-docs/aidlc-state.md');
	});

	test('tracks creation, updates, and deletion of the state file', async () => {
		const directory = vscode.Uri.file(path.join(os.tmpdir(), `ai-dlc-state-${Date.now()}`));
		const added = vscode.workspace.updateWorkspaceFolders(0, 0, {
			uri: directory,
			name: 'AI-DLC State Tracker Test',
		});
		assert.ok(added);

		const folder = vscode.workspace.getWorkspaceFolder(directory);
		assert.ok(folder);
		const stateDirectory = vscode.Uri.joinPath(directory, 'aidlc-docs');
		await vscode.workspace.fs.createDirectory(stateDirectory);
		const file = vscode.Uri.joinPath(stateDirectory, 'aidlc-state.md');
		const states: StateFileResult[] = [];
		const monitor = new StateFileMonitor((state) => states.push(state));

		try {
			await monitor.watch(folder);
			assert.ok(states.some((state) => state.kind === 'missing'));

			await vscode.workspace.fs.writeFile(file, new Uint8Array());
			await waitForState(states, (state) => state.kind === 'empty');

			await vscode.workspace.fs.writeFile(file, new TextEncoder().encode('# Initial'));
			await waitForState(states, (state) => state.kind === 'ready' && state.content === '# Initial');

			await vscode.workspace.fs.writeFile(file, new TextEncoder().encode('# Updated'));
			await waitForState(states, (state) => state.kind === 'ready' && state.content === '# Updated');

			await vscode.workspace.fs.delete(file);
			await waitForState(states, (state) => state.kind === 'missing');
		} finally {
			monitor.dispose();
			const index = vscode.workspace.workspaceFolders?.findIndex(
				(candidate) => candidate.uri.toString() === directory.toString(),
			);
			if (index !== undefined && index >= 0) {
				vscode.workspace.updateWorkspaceFolders(index, 1);
			}
			await vscode.workspace.fs.delete(directory, { recursive: true, useTrash: false });
		}
	});
});

function waitForState(
	states: StateFileResult[],
	predicate: (state: StateFileResult) => boolean,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const deadline = Date.now() + 5000;
		const interval = setInterval(() => {
			if (states.some(predicate)) {
				clearInterval(interval);
				resolve();
			} else if (Date.now() >= deadline) {
				clearInterval(interval);
				reject(new Error('Timed out waiting for the expected state file update.'));
			}
		}, 50);
	});
}
