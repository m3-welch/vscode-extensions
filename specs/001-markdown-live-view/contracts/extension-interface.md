# Extension Interface Contract

## Editor Contribution

- Register an optional custom text editor for Markdown documents (`.md` and `.markdown`) with a stable contributed view type.
- Keep the standard VS Code text editor available as the plain-source view and do not take over Markdown documents as the default editor.
- Use the same document URI and canonical VS Code `TextDocument` in both views.

## Commands

The extension contributes discoverable commands to open the active Markdown document in each view:

- **Open Markdown Live View**: opens the active Markdown document in the custom editor.
- **Open as Markdown Source**: opens the same document in the standard text editor.

When switching, transfer active selections (including multiple selections) and scroll position where available. Do not write document content, discard edits, or save implicitly.

## Live View Behavior

- Render only supported inactive syntax ranges; reveal source for every active caret and selection.
- Pointer hover alone does not change source visibility.
- Keep rendered output mapped to exact Markdown source ranges so edits affect the original document.
- Leave unsupported or malformed syntax visible and editable; do not block rendering of unaffected ranges.
- Persist only through normal VS Code document save behavior. Do not transmit document content to external services or fetch remote content for rendering. Render local images through the webview's approved local resource mechanism; show alt text without fetching remote images.

## Document Synchronization

- Webview-originated edits are applied to the canonical document through VS Code document-edit APIs.
- Changes from other editors, extensions, undo, redo, and reload are reconciled into the webview.
- Reject or reconcile stale-version transactions rather than overwriting newer document content.
- Treat webview messages and document content as untrusted input; validate message type, URI, version, ranges, and payload size.
