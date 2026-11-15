# Data Model: AI-DLC State Tracker

The extension reads one workspace state file and derives presentation data in memory. It does not persist state or edit the source document.

## Workspace Selection

- **Fields**:
  - `workspaceFolder`: selected workspace folder URI.
  - `stateFileUri`: URI for `<workspaceFolder>/aidlc-state.md`.
- **Selection rule**: Use the workspace folder containing the active editor's document. If no active editor belongs to a workspace folder, use the first folder in the current workspace. If there are no folders, show an unavailable state.
- **Validation**: The state file must be resolved from the selected folder; do not search outside the workspace folder or select an unrelated matching file.

## State Document

- **Fields**:
  - `uri`: source file URI.
  - `content`: current text read through the VS Code workspace filesystem.
  - `availability`: one of `loading`, `ready`, `missing`, `empty`, `unavailable`, or `error`.
  - `errorMessage`: optional user-safe explanation for `error`.
- **State transitions**:
  - View activation or file event → `loading`.
  - Successful non-empty read → `ready`.
  - Successful empty read → `empty`.
  - Not found or deleted → `missing`.
  - No workspace folder selected → `unavailable`.
  - Any other read failure → `error`.
- **Validation**: Treat the content as untrusted; do not execute it, interpret it as a command, or write changes back to the file.

## Rendered State View

- **Fields**:
  - `availability`: state used to choose the loading, content, missing, empty, or error presentation.
  - `renderedMarkdown`: derived formatted output when the document is `ready`.
- **Relationship**: Derived from the current `State Document`; never independently persisted.
- **Validation**: Raw HTML is disabled; scripts and remote resources are disabled; the generated view uses restrictive webview security policy.

## Progress Indicator

The optional progress indicator is deferred from the required MVP. No progress entity or parsing convention is introduced in this design.
