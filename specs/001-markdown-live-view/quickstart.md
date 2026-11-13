# Quickstart: Markdown Live View

This guide describes validation scenarios for the extension after its implementation and scaffold are created in `markdown-live-view/`.

## Prerequisites

- VS Code desktop with Extension Development Host support.
- Node.js and npm versions supported by the extension's declared VS Code engine range.

## Build and test

From `markdown-live-view/`:

1. Run `npm install` to install the declared extension and test dependencies.
2. Run `npm test` and confirm unit and extension-host integration tests pass.
3. Run `npm run compile` and confirm the extension and webview bundle compile.
4. Launch the Extension Development Host with the repository's configured debug task.

## End-to-end scenarios

1. **Render and reveal source**: Open the Markdown fixture containing headings, paragraphs, emphasis, links, images, ordered/unordered lists, block quotes, inline/fenced code, and tables in Markdown Live View. Confirm supported inactive elements render, then move the text caret through several elements and confirm source follows the caret. Move the pointer without moving the caret and confirm visibility is unchanged.
2. **Editing and selections**: Edit rendered text, select across elements, use multiple carets, and verify only user edits change the saved Markdown. Confirm all active source ranges remain visible.
3. **History and external changes**: Edit, undo, and redo; make a change in another editor session; confirm the live view matches the canonical document and undo history.
4. **Switch and persistence**: Switch between live and plain-source commands with unsaved edits and multiple selections. Confirm the same URI, content, caret/selections, and dirty state are retained; save, close, reopen, and confirm content and rendering.
5. **Fallback behavior**: Include malformed and unsupported syntax next to valid constructs. Confirm source remains visible/editable and adjacent supported constructs still render.
6. **Privacy and local rendering**: With network access unavailable, confirm local rendering and editing work and that the webview makes no document-content network requests.

Expected outcomes for required syntax and source preservation are defined in [spec.md](spec.md); entity and synchronization rules are in [data-model.md](data-model.md).
