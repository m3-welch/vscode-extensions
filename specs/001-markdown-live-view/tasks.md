---

description: "Task list for Markdown Live View implementation"
---

# Tasks: Markdown Live View

**Input**: Design documents from `specs/001-markdown-live-view/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Organization**: Tasks are grouped by user story to enable independent implementation and validation. Automated tests are included as required by the implementation plan and project constitution.

**Path convention**: Extension files are under `markdown-live-view/`; feature design documents are under `specs/001-markdown-live-view/`.

## Phase 1: Setup

**Purpose**: Initialize the isolated VS Code extension project and its build/test workflow.

- [X] T001 Create `markdown-live-view/package.json` with the extension manifest, declared VS Code engine range, Markdown activation, custom-editor contribution, commands, and only the planned CodeMirror/build dependencies.
- [X] T002 Create `markdown-live-view/tsconfig.json` and `markdown-live-view/esbuild.js` to compile the extension host and bundle the webview entry point as separate targets.
- [X] T003 [P] Configure the extension-host runner in `markdown-live-view/test/runTest.cjs` and unit/integration scripts in `markdown-live-view/package.json` using Node's built-in unit test runner.
- [X] T004 [P] Add Markdown and local-image fixtures covering required constructs and malformed/unsupported examples under `markdown-live-view/test/fixtures/`.

---

## Phase 2: Foundational

**Purpose**: Establish the custom-editor shell and canonical-document/webview communication required by all user stories.

- [X] T005 Implement extension activation, custom text editor registration, stable view type, and secure local webview resource/CSP setup in `markdown-live-view/src/extension.ts` and `markdown-live-view/src/markdown-live-view-provider.ts`.
- [X] T006 Implement a CodeMirror editor shell that initializes from provider-supplied Markdown text and posts typed messages to the extension host in `markdown-live-view/src/webview/editor.ts`.
- [X] T007 Implement document-versioned webview message validation and canonical `TextDocument` synchronization for initial content and document-change events in `markdown-live-view/src/document-sync.ts` and `markdown-live-view/src/markdown-live-view-provider.ts`.
- [X] T008 Add extension-host smoke tests for live editor opening, canonical text, save/reopen, source switching, and VS Code undo/redo in `markdown-live-view/test/integration/index.ts`.

**Checkpoint**: Extension host and webview can open one Markdown document and maintain a versioned text mirror; story implementation can begin.

---

## Phase 3: User Story 1 - Read Markdown in a Live View (Priority: P1) 🎯 MVP

**Goal**: Render inactive supported Markdown and reveal source only at text carets/selections.

**Independent Test**: Open the comprehensive fixture, verify supported constructs render while source at the text caret is visible, move the caret to other elements, and confirm pointer movement alone does not change source visibility.

### Tests for User Story 1

- [X] T009 [P] [US1] Add unit tests for source-range extraction and element selection for headings, paragraphs, emphasis, links, images, lists, quotes, inline/fenced code, and tables in `markdown-live-view/test/unit/markdown-renderer.test.cjs`.
- [ ] T010 [P] [US1] Add UI integration tests for caret-driven source reveal, pointer-hover invariance, and malformed/unsupported source fallback in `markdown-live-view/test/integration/index.ts` (webview interaction verification remains unavailable in the sandbox).

### Implementation for User Story 1

- [X] T011 [US1] Parse the document with the configured GFM Markdown language and map supported syntax nodes to version-current source ranges in `markdown-live-view/src/markdown-renderer.ts`.
- [X] T012 [US1] Render inactive supported ranges with CodeMirror decorations/widgets and Markdown presentation styles in `markdown-live-view/src/markdown-renderer.ts` and `markdown-live-view/src/webview/styles.css`.
- [X] T013 [US1] Recompute visible source from every active CodeMirror selection and leave pointer hover out of the rendering state in `markdown-live-view/src/webview/editor.ts`.
- [X] T014 [US1] Ensure empty/plain-text documents, syntax boundaries, overlapping selections, and malformed or unsupported ranges fall back to editable source without suppressing adjacent supported rendering in `markdown-live-view/src/markdown-renderer.ts`.

**Checkpoint**: US1 is independently testable as the first useful release.

---

## Phase 4: User Story 2 - Edit Markdown Without Losing Source (Priority: P2)

**Goal**: Preserve normal editing, selection, multi-cursor, undo/redo, and exact Markdown source through live rendering.

**Independent Test**: Edit rendered content, select across elements, use multiple cursors, and undo/redo; confirm the canonical saved text changes only through user edits and the rendered view follows it.

### Tests for User Story 2

- [ ] T015 [P] [US2] Add UI integration tests for typing, deletion, navigation, and selection across rendered boundaries in `markdown-live-view/test/integration/index.ts` (webview interaction verification remains unavailable in the sandbox).
- [ ] T016 [P] [US2] Add UI integration tests for multiple selections and exact source text in `markdown-live-view/test/integration/index.ts`; VS Code undo/redo is covered by the extension-host test.

### Implementation for User Story 2

- [X] T017 [US2] Configure CodeMirror multiple selections and draw all active ranges while preserving each selection through rendering updates in `markdown-live-view/src/webview/editor.ts`.
- [X] T018 [US2] Convert CodeMirror user transactions into minimal, version-checked edits against the canonical `TextDocument` and reconcile accepted edits back to the webview in `markdown-live-view/src/document-sync.ts`.
- [X] T019 [US2] Route undo/redo through the VS Code document history and prevent duplicate or stale document-change echoes in `markdown-live-view/src/markdown-live-view-provider.ts` and `markdown-live-view/src/document-sync.ts`.
- [X] T020 [US2] Keep rendered decorations/widgets separate from source and test exact parser ranges for inline and block elements in `markdown-live-view/src/markdown-renderer.ts` and `markdown-live-view/src/webview/editor.ts`.

**Checkpoint**: US2 is independently testable with exact source and history behavior.

---

## Phase 5: User Story 3 - Save, Reopen, and Switch Views (Priority: P3)

**Goal**: Preserve saved/unsaved Markdown and editor state when reopening or switching between live and plain-source views.

**Independent Test**: Save, close, and reopen a live document; switch with unsaved edits and multiple selections to plain source and back; verify the same URI, text, dirty state, selections, and scroll position.

### Tests for User Story 3

- [X] T021 [P] [US3] Add extension-host tests for save, close, reopen, and persisted Markdown text in `markdown-live-view/test/integration/index.ts`.
- [ ] T022 [P] [US3] Add UI integration tests for live/source switching with unsaved edits, multiple selections, caret, and scroll; current extension-host test covers unsaved text and dirty state in `markdown-live-view/test/integration/index.ts`.

### Implementation for User Story 3

- [X] T023 [US3] Implement discoverable commands for opening the active URI in live view and standard Markdown source view without saving or changing document text in `markdown-live-view/src/extension.ts` and `markdown-live-view/package.json`.
- [X] T024 [US3] Capture and restore document URI, all selections, primary selection, and scroll position across live/source editor changes in `markdown-live-view/src/view-state.ts` and `markdown-live-view/src/extension.ts`.
- [X] T025 [US3] Restore live-view initialization from the current canonical document contents and dirty state after reopen or webview reload in `markdown-live-view/src/markdown-live-view-provider.ts`.
- [X] T026 [US3] Handle multiple webviews for one document and reconcile external editor/document changes without overwriting newer content in `markdown-live-view/src/document-sync.ts` and `markdown-live-view/src/markdown-live-view-provider.ts`.

**Checkpoint**: All three stories are independently testable and view switches do not alter persistence state.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete cross-story security, compatibility, documentation, and validation.

- [X] T027 [P] Restrict webview resources to bundled assets and approved local image resources; display alt text rather than loading remote images in `markdown-live-view/src/markdown-live-view-provider.ts` and `markdown-live-view/src/markdown-renderer.ts`.
- [X] T028 [P] Validate webview message types, document URI/version binding, edit ranges, and payload sizes before applying edits in `markdown-live-view/src/document-sync.ts` and `markdown-live-view/src/message-validation.ts`.
- [X] T029 Add large-document parsing coverage and use CodeMirror's current syntax tree for selection updates in `markdown-live-view/test/unit/markdown-renderer.test.cjs` and `markdown-live-view/src/markdown-renderer.ts`.
- [X] T030 Document extension purpose, commands, supported Markdown, privacy behavior, and plain-source workflow in `markdown-live-view/README.md`.
- [ ] T031 Run the full extension build and test commands and complete the end-to-end scenarios in `specs/001-markdown-live-view/quickstart.md`; the extension-host run remains blocked by unavailable VS Code download access.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; establishes the extension manifest, build targets, and test fixtures.
- **Foundational (Phase 2)**: Depends on Setup; blocks user stories because it establishes the provider, webview shell, and canonical document synchronization.
- **User Stories (Phases 3–5)**: Depend on Foundational. Each story has its own acceptance tests and can be implemented independently after the shared APIs stabilize.
- **Polish (Phase 6)**: Depends on all desired stories; performs security, performance, documentation, and full quickstart validation.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. Delivers rendering/readability independently and is the MVP.
- **US2 (P2)**: Starts after Phase 2. Uses the shared editor and document-sync interfaces; does not depend on US3.
- **US3 (P3)**: Starts after Phase 2. Uses the shared document/provider interfaces; does not require view switching to save or rewrite document text.

### Parallel Opportunities

- T003 and T004 can run in parallel after T001 because they affect separate setup files/paths.
- T009 and T010 can run in parallel; similarly, each story's independent tests can be prepared in parallel.
- After Phase 2, US1, US2, and US3 can be developed concurrently if interfaces remain stable; review shared-file touches to avoid conflicts.
- T027, T028, and T030 can be done in parallel after their referenced implementation files exist.

## Parallel Example: User Story 1

```text
Task: T009 — Add Markdown source-range and rendering eligibility unit tests in markdown-live-view/test/unit/markdown-renderer.test.ts
Task: T010 — Add caret, pointer, and fallback integration tests in markdown-live-view/test/integration/live-view-rendering.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup and Phase 2 foundational work.
2. Complete Phase 3, writing its tests before rendering implementation.
3. Validate supported syntax rendering, caret reveal, pointer invariance, and source fallback independently.
4. Stop at the US1 checkpoint for an MVP review; proceed to editing and view-switching stories incrementally.

### Incremental Delivery

1. Setup and foundational editor/document bridge.
2. US1 rendered live view as the MVP.
3. US2 reliable editing, selections, and history.
4. US3 persistence and source/live switching.
5. Cross-cutting security, performance, docs, and quickstart validation.

## Notes

- Every task uses the required checkbox, sequential ID, optional `[P]`, story label only within user-story phases, and an explicit file path.
- Automated test tasks are included because the plan specifies unit and extension-host integration tests and the constitution requires automated tests for observable behavior.
- Tests should be written first for their story and verified to fail for the missing behavior before its implementation is completed.
