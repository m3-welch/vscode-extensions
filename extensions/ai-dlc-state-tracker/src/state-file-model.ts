import * as path from 'path';

export const defaultStateFilePath = 'aidlc-docs/aidlc-state.md';

export type StateFileResult =
	| { kind: 'loading' }
	| { kind: 'ready'; content: string }
	| { kind: 'empty' }
	| { kind: 'missing' }
	| { kind: 'unavailable' }
	| { kind: 'error'; message: string };

export function selectWorkspaceFolder<T>(
	folders: readonly T[],
	activeEditorFolder: T | undefined,
): T | undefined {
	if (activeEditorFolder !== undefined && folders.includes(activeEditorFolder)) {
		return activeEditorFolder;
	}

	return folders[0];
}

export function classifyFileRead(
	content: Uint8Array | undefined,
	error?: unknown,
): StateFileResult {
	if (content !== undefined) {
		const text = new TextDecoder().decode(content);
		return text.trim().length === 0 ? { kind: 'empty' } : { kind: 'ready', content: text };
	}

	if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'FileNotFound') {
		return { kind: 'missing' };
	}

	return {
		kind: 'error',
		message: error instanceof Error ? error.message : 'The state file could not be read.',
	};
}

export function resolveStatePath(folderPath: string, configured: string | undefined): string {
	const value = configured?.trim() || defaultStateFilePath;
	const relativePath = normalizeStateFilePath(value);
	if (!relativePath) {
		throw new Error('The state file path must be relative to and contained within the workspace folder.');
	}

	return path.join(folderPath, ...relativePath.split('/'));
}

export function normalizeStateFilePath(configured: string | undefined): string | undefined {
	const value = configured?.trim() || defaultStateFilePath;
	if (
		value.startsWith('/') ||
		value.startsWith('\\') ||
		/^[A-Za-z]:/.test(value) ||
		/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)
	) {
		return undefined;
	}

	const segments: string[] = [];
	for (const segment of value.replace(/\\/g, '/').split('/')) {
		if (!segment || segment === '.') {
			continue;
		}
		if (segment === '..') {
			if (segments.length === 0) {
				return undefined;
			}
			segments.pop();
		} else {
			segments.push(segment);
		}
	}

	return segments.length > 0 ? segments.join('/') : undefined;
}
