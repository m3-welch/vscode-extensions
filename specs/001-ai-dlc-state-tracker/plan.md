# Implementation Plan: AI-DLC State Tracker

**Branch**: `copilot/create-extension-ai-dlc-state-tracker` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-ai-dlc-state-tracker/spec.md`

## Summary

Create a standalone VS Code extension in `ai-dlc-state-tracker/` that contributes a discoverable sidebar view and renders the current workspace's `aidlc-state.md` as formatted Markdown. Use a `WebviewViewProvider` with content read from the VS Code workspace filesystem, a file watcher for create/change/delete events, and Markdown rendering configured to treat workspace content as untrusted. The required MVP will not include the optional status-bar progress indicator.

## Technical Context

**Language/Version**: TypeScript targeting the Node.js runtime supported by the declared VS Code engine range

**Primary Dependencies**: VS Code extension API; Markdown-It for rendering within the custom view; Yeoman VS Code extension generator for initial scaffolding

**Storage**: No persistent storage; read `aidlc-state.md` through the VS Code workspace filesystem API

**Testing**: Extension unit tests and Extension Development Host integration tests using the VS Code extension testing tools

**Target Platform**: VS Code desktop extension host

**Project Type**: Standalone VS Code extension within this extensions collection

**Performance Goals**: Render the state file promptly on view activation and update the view promptly after a file event; debounce bursts of filesystem events.

**Constraints**: No network access or file writes; render workspace Markdown as untrusted content; support missing, empty, changed, and deleted state files; make no assumptions about a persisted schema.

**Scale/Scope**: One state file per selected workspace folder; no cross-workspace indexing or AI-generated summary.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. User-Focused Extensions**: PASS — the sidebar view is limited to displaying the AI-DLC state file.
- **II. Native VS Code Integration**: PASS — use documented view, command, workspace filesystem, and watcher APIs.
- **III. Privacy and Security by Default**: PASS — no network or writes; workspace content is treated as untrusted and rendered without executing scripts.
- **IV. Verifiable Quality**: PASS — plan includes focused rendering/state tests and extension-host coverage for file lifecycle behavior.
- **V. Simplicity and Compatibility**: PASS — one extension package, narrow activation, only necessary rendering/test dependencies, and a declared VS Code engine range.

No constitution violations are identified; no complexity justification is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-dlc-state-tracker/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md              # Added by /speckit-tasks after plan approval
└── checklists/
    └── requirements.md
```

No `contracts/` directory is needed: the feature exposes no external service or library API. Its user-facing command and view contribution will be declared in the extension manifest.

### Source Code (repository root)

```text
ai-dlc-state-tracker/
├── package.json
├── README.md
├── tsconfig.json
├── src/
│   ├── extension.ts
│   ├── markdown-renderer.ts
│   ├── state-file.ts
│   ├── state-file-model.ts
│   └── state-view-provider.ts
└── test/
    ├── unit/
    └── integration/
```

**Structure Decision**: Keep the extension in its own package directory so the repository can continue to host a collection of extensions. Use the official VS Code extension generator to scaffold the package, then keep file-reading, view presentation, and extension registration responsibilities separated. Add repository-level documentation identifying the extension.

## Design Decisions

- Contribute a sidebar `WebviewView` and an explicit open/refresh command. The view is the primary discoverable entry point; the command provides a direct way to reopen it.
- Read the state file from the workspace folder associated with the active editor; if none is available, use the first workspace folder. This provides deterministic behavior without adding a workspace picker to the initial scope.
- Watch the selected folder's exact `aidlc-state.md` path and reread it on create, change, and delete. Debounce event bursts and dispose watchers with the view/provider lifecycle.
- Disable scripts and raw HTML in the renderer; use a restrictive content security policy and prevent remote images or unsafe resource loading. The view is read-only and does not execute content or modify the source file.
- Show clear loading, missing, empty, and read-error states instead of stale or misleading content.
- Defer the optional status-bar progress indicator. The specification does not define a progress syntax, and the required rendered view is independently complete without one.

## Validation and Quality

- Unit tests cover Markdown rendering safety, file state classification, and workspace-folder selection.
- Extension Development Host tests cover contributed-view activation and file create/change/delete updates, including absent and empty files.
- Run the package's existing compile, unit/integration test, and VSIX packaging scripts after implementation; manually verify the sidebar presentation in the Extension Development Host.
- Recheck the design against the constitution before task generation and implementation.
