---

description: "Task list for AI-DLC State Tracker implementation"

---

# Tasks: AI-DLC State Tracker

**Input**: Design documents from `/specs/001-ai-dlc-state-tracker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Automated unit and Extension Development Host tests are included because the project constitution requires tests for observable behavior.

**Organization**: Tasks are grouped by user story for incremental implementation. The approved plan defers the optional status-bar progress indicator, so User Story 2 is not part of this implementation.

## Phase 1: Setup

**Purpose**: Scaffold the standalone VS Code extension package.

- [X] T001 Run the official Yeoman VS Code extension generator in `ai-dlc-state-tracker/` and create the initial TypeScript extension manifest at `ai-dlc-state-tracker/package.json` with Extension Development Host test support.
- [X] T002 [P] Set the extension display name, identifier, description, VS Code engine range, and publisher metadata in `ai-dlc-state-tracker/package.json`.
- [X] T003 [P] Add the extension directory and its purpose to the repository overview in `README.md`.

---

## Phase 2: Foundational

**Purpose**: Establish secure rendering and a testable package baseline shared by the required view behavior.

- [X] T004 Configure compile, unit-test, Extension Development Host test, and VSIX packaging scripts in `ai-dlc-state-tracker/package.json`, preserving the generated toolchain.
- [X] T005 Review the current Markdown-It dependency version with the dependency advisory database, then add Markdown-It and its TypeScript types if needed and configure bundling in `ai-dlc-state-tracker/package.json` and `ai-dlc-state-tracker/tsconfig.json`.

**Checkpoint**: Extension scaffolding, scripts, and renderer dependency are ready for the independently testable primary story.

---

## Phase 3: User Story 1 - View the AI-DLC state (Priority: P1) 🎯 MVP

**Goal**: Discover and open a tracker view that presents the selected workspace's current `aidlc-state.md` as formatted Markdown, updates when the file changes, and clearly handles unavailable content.

**Independent Test**: Launch the extension in the Extension Development Host with a workspace containing `aidlc-state.md`; open the AI-DLC State Tracker and verify formatted content, updates after edits, safe handling of untrusted Markdown, and clear states for missing, empty, and unreadable files.

### Tests for User Story 1

- [X] T006 [P] [US1] Add unit tests for active-editor/first-folder selection and ready, missing, empty, and error state classification in `ai-dlc-state-tracker/src/test/unit/state-file.test.ts`.
- [X] T007 [P] [US1] Add unit tests verifying standard Markdown rendering, raw HTML exclusion, and the renderer's restrictive resource policy in `ai-dlc-state-tracker/src/test/unit/markdown-renderer.test.ts`.
- [X] T008 [US1] Add Extension Development Host tests for contributed view availability and file create/change/delete, missing, and empty behavior in `ai-dlc-state-tracker/src/test/extension.test.ts`.

### Implementation for User Story 1

- [X] T009 [US1] Implement selected workspace-folder resolution, `aidlc-state.md` reads, availability states, and create/change/delete watching through VS Code workspace APIs in `ai-dlc-state-tracker/src/state-file.ts`.
- [X] T010 [US1] Implement Markdown rendering with raw HTML disabled and a script-free, restrictive-CSP view template in `ai-dlc-state-tracker/src/state-view-provider.ts`.
- [X] T011 [US1] Register the sidebar `WebviewViewProvider`, open/refresh command, and state updates in `ai-dlc-state-tracker/src/extension.ts` and declare the view and command contributions in `ai-dlc-state-tracker/package.json`.
- [X] T012 [US1] Verify extension activation and add clear loading, missing, empty, and read-error presentations in `ai-dlc-state-tracker/src/state-view-provider.ts`.

**Checkpoint**: User Story 1 is independently functional and passes its unit and Extension Development Host tests.

---

## User Story 2 - Check workflow progress at a glance (Priority: P2)

**Deferred**: The status-bar indicator is optional and excluded from the approved MVP plan. No implementation tasks are generated for this story.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete MVP and its user-facing documentation.

- [X] T013 [P] Document extension installation, opening the tracker, and supported workspace behavior in `ai-dlc-state-tracker/README.md`.
- [X] T014 Run compile, unit tests, dependency audit, and VSIX packaging from `specs/001-ai-dlc-state-tracker/quickstart.md`; resolve any implementation regressions in the corresponding `ai-dlc-state-tracker/` files.
- [X] T015 Review extension permissions, webview security policy, and workspace-content handling against the constitution in `ai-dlc-state-tracker/src/state-view-provider.ts` and `ai-dlc-state-tracker/package.json`.
- [ ] T016 Run Extension Development Host tests and manually verify view rendering and file updates in `ai-dlc-state-tracker/src/test/extension.test.ts`; VS Code download is currently blocked by unavailable network DNS.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; scaffold the extension and establish metadata.
- **Foundational (Phase 2)**: Depends on Setup; blocks User Story 1.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers the MVP.
- **User Story 2 (P2)**: Deferred by the approved plan; not part of this implementation.
- **Polish (Final Phase)**: Depends on the MVP implementation.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2 and is independently testable.
- **User Story 2 (P2)**: Not scheduled; optional status-bar progress remains deferred.

### Within User Story 1

- Complete the unit and Extension Development Host tests before implementation.
- Complete state-file access before the view consumes state updates.
- Complete the renderer and view registration before validating the end-to-end file lifecycle.

### Parallel Opportunities

- T002 and T003 can run independently after scaffolding.
- T006 and T007 can run in parallel because they cover separate unit-test modules.
- T013 can proceed independently from the implementation once package structure exists.
- User stories are not parallelized: the approved plan defers User Story 2.

## Parallel Example: User Story 1

```text
Task: T006 — Add state file selection and availability unit tests in ai-dlc-state-tracker/src/test/unit/state-file.test.ts
Task: T007 — Add Markdown safety tests in ai-dlc-state-tracker/src/test/unit/markdown-renderer.test.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational phases.
2. Add and run User Story 1 tests, then implement the state-file and rendered-view behavior.
3. Validate User Story 1 independently in the Extension Development Host.
4. Complete polish and VSIX validation.

### Incremental Delivery

1. Deliver the standalone extension package.
2. Deliver the required rendered tracker view with file lifecycle handling as the MVP.
3. Consider the optional status-bar progress indicator in a later feature after its parsing convention and scope are specified.

## Notes

- Every task uses the required checkbox, sequential ID, optional parallel marker, story label where applicable, and a concrete file path.
- Workspace Markdown is untrusted: the view must not execute scripts, allow raw HTML, load remote resources, or write to the source file.
- Tests are required by the repository constitution for the observable behavior and failure cases.
- Validation note: `npm run test:extension-host` compiled successfully but could not download VS Code from `update.code.visualstudio.com` in this environment; T016 remains pending.
