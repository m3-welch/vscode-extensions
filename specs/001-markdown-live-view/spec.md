# Feature Specification: Markdown Live View

**Feature Branch**: `copilot/add-markdown-live-view-feature`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "New extension: Markdown Live View. I want a vscode extension that behaves in a similar way to obsidian where the markdown is rendered until the cursor goes over an element where it then shows the markdown that powers the view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read Markdown in a Live View (Priority: P1)

As a person reading a Markdown document, I want its inactive content to appear formatted in the editor so I can read the document without source syntax obscuring it.

**Why this priority**: Rendering inactive content is the core value of the feature and makes a viable first release.

**Independent Test**: Open a Markdown document containing headings, paragraphs, emphasis, links, lists, quotes, images, tables, and fenced code blocks; verify that supported content is rendered while the document remains editable.

**Acceptance Scenarios**:

1. **Given** a Markdown document with supported syntax and the text caret in a heading, **When** the document is shown in the live view, **Then** the heading's Markdown source is visible and other supported inactive content is rendered.
2. **Given** the same document, **When** the text caret moves from the heading into a paragraph and then a list, **Then** source is revealed at the new caret location and the previously inactive content is rendered again.
3. **Given** the pointer is over a rendered element while the text caret is elsewhere, **When** the pointer moves across the element, **Then** the revealed source location does not change.

---

### User Story 2 - Edit Markdown Without Losing Source (Priority: P2)

As a person editing a Markdown document, I want to work with the original Markdown behind the rendered content so normal text editing, selection, and history continue to work.

**Why this priority**: A readable view is only useful as an editor if users can safely make and review their changes.

**Independent Test**: Edit supported Markdown in the live view, select text, use multiple cursors, and undo and redo changes; verify both the rendered result and the exact saved Markdown text.

**Acceptance Scenarios**:

1. **Given** rendered inactive content, **When** the user places the text caret in a Markdown element and types, **Then** the source for that element is available for normal editing and the rendered result reflects the edit.
2. **Given** a selection within or across Markdown elements, **When** the selection is active, **Then** the source covering the selection is visible and the selected text and document content are unchanged until the user edits.
3. **Given** multiple active selections or cursors, **When** the user edits, **Then** all selections remain available for the same editing action and the live view reveals source at each active selection.
4. **Given** the user has edited the document, **When** they undo and then redo the edit, **Then** the document returns to the corresponding prior and subsequent content and the live rendering follows each state.

---

### User Story 3 - Save, Reopen, and Switch Views (Priority: P3)

As a person working across sessions or choosing a source-oriented workflow, I want saved Markdown to remain intact and to be able to move between the live view and a plain source view.

**Why this priority**: Reliable persistence and a clear way to use plain source make the feature fit into varied editing workflows.

**Independent Test**: Save edits in the live view, close and reopen the document, then switch between live and plain source views; verify that the same Markdown content is available and no view switch changes it.

**Acceptance Scenarios**:

1. **Given** a document edited and saved in the live view, **When** the document is closed and reopened in the live view, **Then** the saved Markdown content is preserved and inactive supported content is rendered.
2. **Given** a document in the live view, **When** the user switches to plain source and back, **Then** the same document content, caret, and selections are preserved, and the live view resumes rendering inactive content.
3. **Given** unsaved edits, **When** the user switches views, **Then** the edits remain present and are neither discarded nor silently saved by the switch.

### Edge Cases

- When syntax is unsupported, the affected content remains readable and editable as source; surrounding supported content continues to render.
- When syntax is malformed or incomplete, the affected text remains visible and editable without losing or rewriting its source; the rest of the document continues to behave normally.
- When the caret is at a Markdown element boundary, the element containing the caret is treated as active; if no element contains it, the nearest applicable text remains normally editable.
- When a selection spans multiple elements, source for all selected content is visible without changing the selection.
- When active selections overlap, source is revealed once for the covered text and each selection remains usable.
- When the document is empty or contains only plain text, the live view remains usable and does not invent Markdown formatting.
- When a document has unsaved changes, changing views or encountering unsupported syntax does not discard or silently alter those changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST provide an editable live view for Markdown documents in which supported inactive content is rendered and the document's underlying Markdown remains available for editing.
- **FR-002**: The location of revealed source MUST be determined by the text caret and active text selections, not by the mouse pointer's hover position.
- **FR-003**: The live view MUST reveal Markdown source at the current text caret and for active selections, and render eligible content outside those active locations.
- **FR-004**: When the text caret moves, the live view MUST update the revealed source to the new location and return no-longer-active content to its rendered presentation.
- **FR-005**: The live view MUST support normal text entry, deletion, navigation, selection, and multi-cursor editing without changing document content except as a result of the user's edit.
- **FR-006**: For multiple cursors or selections, the live view MUST reveal source at each active location while preserving the selections and applying user edits to them according to normal editor behavior.
- **FR-007**: The live view MUST preserve the original Markdown for saving, reopening, editing, and undoing or redoing changes; rendering or switching views alone MUST NOT rewrite document content.
- **FR-008**: The live view MUST support rendering common Markdown constructs, including headings, paragraphs, emphasis, links, images, ordered and unordered lists, block quotes, inline code, fenced code blocks, and tables.
- **FR-009**: Unsupported or malformed syntax MUST remain visible and editable without loss of source content, and MUST NOT prevent unaffected portions of the document from rendering and being edited.
- **FR-010**: Users MUST be able to switch between the live view and a plain source view of the same document without losing edits; the switch MUST NOT implicitly save or discard unsaved changes.
- **FR-011**: The extension MUST NOT send document content to external services as part of live rendering.

### Key Entities *(include if feature involves data)*

- **Markdown document**: The user's editable text, including its original Markdown source, saved content, and current unsaved edits.
- **Rendered element**: A supported Markdown construct presented in formatted form while inactive, with a corresponding source range in the document.
- **Caret and selection**: The user's active text insertion point and selected source ranges that determine which content is revealed for editing.
- **View mode**: The presentation of the same document as either a live rendered view or plain Markdown source.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all acceptance tests for the listed common Markdown constructs, inactive supported content is rendered and source at each active caret or selection is revealed.
- **SC-002**: In all caret-movement tests, source visibility follows the text caret and is unchanged by pointer movement alone.
- **SC-003**: Across save/reopen, view-switching, undo, and redo tests, 100% of document content not explicitly changed by the user remains identical to its original or saved Markdown.
- **SC-004**: In tests containing unsupported or malformed syntax, 100% of the affected source remains visible and recoverable, and unaffected supported content remains usable.
- **SC-005**: Users can complete reading, editing, saving, reopening, and switching to plain source view without losing a selection or unsaved change as a result of rendering or changing views.

## Assumptions

- The feature is for Markdown documents edited in VS Code; it does not include a separate knowledge base, synchronization, backlinks, or a plugin ecosystem.
- “Cursor” means the text caret or active text selection, not the mouse pointer. When multiple cursors or selections are present, each is an active source location.
- Common Markdown support includes the constructs listed in FR-008. Other syntax may remain as source without blocking supported constructs around it.
- The live view and plain source view represent the same document; view changes do not create or convert document content.
- Rendering is local to the editor and does not require network access or external processing.
- No unresolved decisions are required for this specification; unsupported syntax behavior and selection behavior use the safe defaults stated above.
