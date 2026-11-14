# Quickstart: AI-DLC State Tracker

This guide describes validation scenarios for the extension package after implementation.

## Prerequisites

- Node.js and npm versions supported by the extension's generated project configuration.
- Visual Studio Code with the Extension Development Host available.
- A workspace containing an `aidlc-state.md` file with representative Markdown content.

## Build and automated tests

From `ai-dlc-state-tracker/`:

1. Install the package dependencies with `npm install`.
2. Run `npm run compile` for type checking, linting, and bundle generation.
3. Run `npm run test:unit` for isolated unit tests.
4. Run `npm run test:extension-host` for Extension Development Host integration tests.
5. Run `npm run vsix` and verify that the generated package includes the compiled extension and renderer assets.

## Manual validation scenarios

1. Launch the extension in the Extension Development Host and confirm that **AI-DLC State Tracker** is available in the Extensions view and its sidebar view can be opened.
2. Open a workspace containing headings, lists, task-list items, links, and code blocks in `aidlc-state.md`; confirm the view displays formatted content rather than Markdown source.
3. Edit the file while the tracker is open; confirm the view reflects the latest content without reopening VS Code.
4. Remove or rename the file; confirm the view reports that it is unavailable and does not display stale content.
5. Test an empty file and an unreadable file; confirm clear, non-crashing states.
6. Include raw HTML and remote image references in test content; confirm scripts do not run and remote resources are not loaded.
7. Open a multi-root workspace with an active editor in a non-first folder; confirm the tracker uses that editor's containing folder. With no active editor, confirm it uses the first workspace folder.
