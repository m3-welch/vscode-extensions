# Research: AI-DLC State Tracker

## Decision: Use a contributed sidebar WebviewView for the formatted state

**Decision**: Provide a sidebar view through VS Code's `WebviewViewProvider` API and render the state file in that view.

**Rationale**: The product needs a purpose-specific view and a discoverable entry point, while a webview can present formatted Markdown without modifying the source document. VS Code documents webview views as sidebar/panel contributions and recommends using them when native views cannot deliver the required experience.

**Alternatives considered**:

- Open the state file in the built-in Markdown preview: this is a useful fallback, but does not provide the dedicated tracker view requested by the feature.
- Use a native tree view: this is suitable for structured lists, but does not render arbitrary Markdown content as a formatted document.

Sources: [Webview API guide](https://code.visualstudio.com/api/extension-guides/webview), [Extension API overview](https://code.visualstudio.com/api/extension-guides/overview), [Markdown extension guide](https://code.visualstudio.com/api/extension-guides/markdown-extension).

## Decision: Render with Markdown-It and restrict untrusted content

**Decision**: Bundle a Markdown parser for the custom view, disable raw HTML, and render content into a script-disabled webview with a restrictive Content Security Policy. Do not load remote images or other remote resources.

**Rationale**: VS Code's built-in Markdown preview provides rendered Markdown, but its extension API extends that preview rather than providing a general Markdown-to-HTML renderer for a custom sidebar. Workspace Markdown is untrusted input, so it must not be interpreted as executable content. A dedicated renderer offers the needed presentation while keeping webview capabilities minimal.

**Alternatives considered**:

- Use the built-in Markdown preview: avoids a parser dependency but does not present the feature as a dedicated tracker view.
- Implement Markdown parsing manually: rejected because a partial parser would be less robust than an established renderer.
- Enable raw HTML or scripts: rejected because the source file is workspace-controlled and the feature is read-only.

Sources: [Markdown extension guide](https://code.visualstudio.com/api/extension-guides/markdown-extension), [Webview security guidance](https://code.visualstudio.com/api/extension-guides/webview).

## Decision: Read and watch through VS Code workspace APIs

**Decision**: Resolve the selected workspace's `aidlc-state.md` with `workspace.fs`; watch its exact path for create, change, and delete events, rereading the file after each debounced event.

**Rationale**: VS Code's workspace filesystem APIs support workspace and virtual filesystem providers, and workspace file-system events support reacting to updates. They avoid assuming that workspace files always reside on the local disk.

**Alternatives considered**:

- Use Node.js filesystem APIs directly: rejected because that unnecessarily assumes local-disk access and bypasses VS Code workspace providers.
- Read only when the view opens: rejected because an open view would become stale after the source file changes.

Sources: [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api).

## Decision: Keep the required MVP independent of progress parsing

**Decision**: Do not add a status-bar progress indicator in the required MVP.

**Rationale**: The issue marks it optional, while the specification does not require a particular checklist syntax or progress calculation. Deferring it keeps the initial extension focused on the required rendered state.

**Alternatives considered**:

- Parse Markdown task-list checkboxes and show completed/total plus a percentage: technically feasible, but would impose a progress convention not established by the feature specification.

## Decision: Use VS Code extension scaffolding and Extension Development Host tests

**Decision**: Scaffold the extension package using the official Yeoman VS Code extension generator. Use focused unit tests and VS Code Extension Development Host tests for contributed-view and file lifecycle behavior.

**Rationale**: The repository has no extension package or test infrastructure. Standard scaffolding provides the manifest, TypeScript build setup, and extension test wiring; the VS Code extension testing guide documents the Extension Development Host approach.

**Alternatives considered**:

- Hand-build the initial package and test harness: rejected because standard scaffolding reduces setup mistakes.
- Unit tests alone: rejected because they cannot verify extension activation and contributed view registration end to end.

Sources: [Testing VS Code extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension), [Publishing extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Security and Workspace Trust

Rendering a Markdown file requires no execution of workspace code, so workspace trust should not be required for the view. The implementation must still honor the webview security guidance, treat workspace content as untrusted, avoid unsafe HTML, and keep network/resource access disabled.
