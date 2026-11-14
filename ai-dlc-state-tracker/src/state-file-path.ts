import * as vscode from 'vscode';
import { defaultStateFilePath, resolveStatePath } from './state-file-model';

export const stateFilePathSetting = 'ai-dlc-state-tracker.stateFilePath';

export function resolveStateFileUri(folder: vscode.WorkspaceFolder): vscode.Uri {
	const configured = vscode.workspace
		.getConfiguration(undefined, folder.uri)
		.get<string>(stateFilePathSetting);
	return vscode.Uri.file(resolveStatePath(folder.uri.fsPath, configured));
}

// Returns true when the setting was updated.
export async function pickStateFilePath(): Promise<boolean> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders?.length) {
		void vscode.window.showWarningMessage('Open a workspace folder to set the AI-DLC state file path.');
		return false;
	}

	const config = vscode.workspace.getConfiguration();
	const current = config.get<string>(stateFilePathSetting) ?? defaultStateFilePath;
	const value = await vscode.window.showInputBox({
		title: 'AI-DLC State File Path',
		prompt: 'Absolute path, or path relative to the workspace folder. Leave empty to restore the default.',
		value: current,
		placeHolder: defaultStateFilePath,
	});
	if (value === undefined) {
		return false;
	}

	const trimmed = value.trim();
	await config.update(
		stateFilePathSetting,
		trimmed === '' || trimmed === defaultStateFilePath ? undefined : trimmed,
		vscode.ConfigurationTarget.Workspace,
	);
	return true;
}
