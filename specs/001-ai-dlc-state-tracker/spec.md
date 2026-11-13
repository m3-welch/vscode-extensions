# Feature Specification: AI-DLC State Tracker

**Feature Branch**: `001-ai-dlc-state-tracker`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Create an AI-DLC State Tracker extension. It must be visible in VS Code and show a pretty, rendered summary of the `aidlc-state.md` file. A small X/X (xx%) state tracker in the status bar is optional."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View the AI-DLC state (Priority: P1)

As a user following an AI-DLC workflow, I can discover and open the tracker extension to view a readable, rendered summary of the workspace's `aidlc-state.md` file.

**Why this priority**: Showing the state file in a useful form is the core acceptance criterion and the extension's primary purpose.

**Independent Test**: Install or run the extension in a workspace containing `aidlc-state.md`, open the tracker, and verify that the document's content is presented as formatted content rather than raw Markdown source.

**Acceptance Scenarios**:

1. **Given** a workspace contains `aidlc-state.md`, **When** the user opens the AI-DLC State Tracker, **Then** the file's content is presented in a readable, rendered summary.
2. **Given** the extension is available in VS Code, **When** the user looks for it in the Extensions view, **Then** it is identifiable as the AI-DLC State Tracker.
3. **Given** the state file changes while the tracker is open, **When** the user views the tracker again, **Then** the displayed summary reflects the latest file content.

---

### User Story 2 - Check workflow progress at a glance (Priority: P2)

As a user, I can optionally see a compact completed-versus-total progress indicator in the VS Code status bar without leaving the editor.

**Why this priority**: A status bar indicator is explicitly optional and supplements, rather than replaces, the rendered state summary.

**Independent Test**: In a workspace with trackable state items, verify that the status bar indicator reports completed items, total items, and a matching percentage; verify that it is absent or neutral when progress cannot be determined.

**Acceptance Scenarios**:

1. **Given** the state file contains a determinable set of completed and total items, **When** the extension is active, **Then** the status bar may show completed/total and percentage.
2. **Given** the state file is missing or does not contain determinable progress, **When** the extension is active, **Then** the status bar does not show misleading progress.

## Edge Cases

- The workspace does not contain `aidlc-state.md`; the extension provides a clear empty or unavailable state rather than failing.
- The state file is empty or contains Markdown constructs the summary cannot render; the user can still understand that the content is empty or see the available content.
- The file is updated or removed while the tracker is open; the view remains usable and reflects the current availability and contents.
- The file contains untrusted Markdown content; rendering does not execute embedded scripts or otherwise run content as code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST be identifiable as the AI-DLC State Tracker in VS Code's Extensions view.
- **FR-002**: Users MUST be able to open a tracker view for the current workspace's `aidlc-state.md`.
- **FR-003**: The tracker MUST present the file's Markdown content as readable, formatted content rather than raw source.
- **FR-004**: The tracker MUST reflect updates to the state file while remaining available to the user.
- **FR-005**: When the state file is absent or empty, the tracker MUST communicate that state clearly without an unhandled failure.
- **FR-006**: The tracker MUST NOT execute scripts or code embedded in the state file.
- **FR-007**: The extension MAY provide a status bar indicator showing completed items, total items, and percentage when progress can be determined from the state file.

### Key Entities

- **AI-DLC state file**: The workspace's `aidlc-state.md`, containing the Markdown content used to represent workflow state.
- **Rendered state summary**: The readable presentation of the current state file content.
- **Progress indicator**: An optional compact representation of completed items relative to total trackable items.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a workspace with a readable `aidlc-state.md`, users can open and view its formatted summary within three user actions after opening VS Code.
- **SC-002**: All standard Markdown structures present in the state file are displayed as formatted content, not Markdown syntax, in the summary.
- **SC-003**: When the state file is changed and the summary is reopened or refreshed, the summary reflects the new contents.
- **SC-004**: In a workspace without `aidlc-state.md`, users receive a clear unavailable or empty state and no unhandled error.

## Assumptions

- “Visible in the” means discoverable by name in VS Code's Extensions view.
- The tracker operates on a state file in the currently open workspace. In a multi-root workspace, it uses the active editor's containing folder, or the first workspace folder if the active editor is not in the workspace or there is no active editor.
- “Rendered summary” means a readable formatted presentation of the file's Markdown content, not an AI-generated paraphrase or modification of the source file.
- The status bar indicator is optional and is not required for the initial feature to satisfy its core purpose.
