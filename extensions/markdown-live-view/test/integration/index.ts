import * as assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { MARKDOWN_LIVE_VIEW_TYPE } from '../../src/markdown-live-view-provider';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('m3-welch.markdown-live-view');
  assert.ok(extension, 'extension is registered');
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('markdownLiveView.openLive'));
  assert.ok(commands.includes('markdownLiveView.openSource'));

  const uri = vscode.Uri.file(path.join(os.tmpdir(), `markdown-live-view-${Date.now()}.md`));
  const content = '# Smoke test\n\nOriginal Markdown stays canonical.\n';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
  try {
    let document = await vscode.workspace.openTextDocument(uri);
    await vscode.commands.executeCommand('vscode.openWith', uri, MARKDOWN_LIVE_VIEW_TYPE);
    await delay(500);
    assert.equal(document.getText(), content);

    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.insert(
      uri,
      document.positionAt(document.getText().length),
      '\nAdded through document edit.'
    );
    assert.equal(await vscode.workspace.applyEdit(workspaceEdit), true);
    const editedContent = `${content}\nAdded through document edit.`;
    assert.equal(document.getText(), editedContent);
    await vscode.commands.executeCommand('undo');
    assert.equal(document.getText(), content);
    await vscode.commands.executeCommand('redo');
    assert.equal(document.getText(), editedContent);

    await vscode.commands.executeCommand('markdownLiveView.openSource');
    await delay(250);
    assert.equal(document.isDirty, true);
    assert.equal(document.getText(), editedContent);
    assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), uri.toString());

    await vscode.commands.executeCommand('markdownLiveView.openLive');
    await delay(250);
    assert.equal(document.isDirty, true);
    assert.equal(document.getText(), editedContent);
    assert.equal(await document.save(), true);

    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    document = await vscode.workspace.openTextDocument(uri);
    await vscode.commands.executeCommand('vscode.openWith', uri, MARKDOWN_LIVE_VIEW_TYPE);
    await delay(500);
    assert.equal(document.getText(), editedContent);
  } finally {
    await vscode.workspace.fs.delete(uri, { useTrash: false });
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

void run().catch((error) => {
  console.error(error);
  throw error;
});
