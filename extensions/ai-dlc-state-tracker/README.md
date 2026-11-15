# AI-DLC State Tracker

Browse the current workspace's `aidlc-docs/aidlc-state.md` as formatted Markdown
in a dedicated VS Code view. The tracker refreshes when the file is created,
changed, or removed and clearly reports when the file is unavailable.

## Features

- Open **AI-DLC State Tracker** from the Explorer view or run **AI-DLC State
  Tracker: Open** from the Command Palette.
- Markdown is rendered as read-only content; raw HTML and remote images are
  not displayed.
- A status bar indicator shows the current phase and overall checklist progress
  when the state file contains trackable checklist items. Click it to open the
  tracker.
- The view follows the active editor's workspace folder, or the first folder
  when the active editor is not in the workspace.
- Configure `ai-dlc-state-tracker.stateFilePath` or run **AI-DLC State
  Tracker: Set State File Path** to use a different file.

## Requirements

Requires VS Code 1.90 or later. No settings or external services are required.

## Usage

Open the **AI-DLC State Tracker** view under Explorer, or run **AI-DLC State
Tracker: Open** from the Command Palette. Add or update
`aidlc-docs/aidlc-state.md` in the workspace to see its current formatted
content and progress.
