import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { MARKDOWN_LIVE_VIEW_TYPE } from '../../src/markdown-live-view-provider';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('m3-welch.markdown-live-view');
  assert.ok(extension, 'extension is registered');
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('markdownLiveView.openLive'));
  assert.ok(commands.includes('markdownLiveView.openSource'));

  const content = '# Smoke test\n\nOriginal Markdown stays canonical.\n';
  const document = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content
  });
  await vscode.commands.executeCommand('vscode.openWith', document.uri, MARKDOWN_LIVE_VIEW_TYPE);
  await delay(500);
  assert.equal(document.getText(), content);

  await vscode.commands.executeCommand('markdownLiveView.openSource');
  await delay(250);
  assert.equal(document.getText(), content);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
