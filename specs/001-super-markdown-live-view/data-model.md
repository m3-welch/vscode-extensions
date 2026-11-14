# Data Model: Markdown Live View

## Markdown Document

The canonical VS Code `TextDocument` for a Markdown URI.

- **Fields**: URI, document version, complete Markdown text, dirty/saved state.
- **Relationships**: One document can have one or more live-view sessions and can also be opened in the standard source editor.
- **Rules**: All user edits are applied to this document. Rendering and switching views never rewrite or save its text. External edits and undo/redo update every live-view session.

## Live-View Session

A webview editor session bound to one Markdown document.

- **Fields**: document URI/version, CodeMirror editor state, active selections, scroll position, pending transaction identifier.
- **Relationships**: References one Markdown document; its editor state contains one or more selections and a rendered representation.
- **Rules**: Only apply a transaction when it is based on the current document version or can be safely rebased. Ignore/reconcile echoed document events using transaction identity and version. Disposing a session does not discard document edits.

## Markdown Source Range

A half-open source interval identified by offsets in one document version.

- **Fields**: start offset, end offset, syntax-node kind, parse status.
- **Relationships**: Belongs to a document version and may map to a rendered element; may overlap an active selection.
- **Rules**: Invalid or unsupported ranges remain visible as source. Range offsets are recomputed after edits and must never be applied across mismatched document versions.

## Rendered Element

A supported Markdown construct rendered through CodeMirror decorations or widgets.

- **Fields**: source range, element kind, rendered presentation, source-visibility status.
- **Relationships**: Maps back to the exact source range; is active if it contains a caret or intersects an active selection.
- **Rules**: Active source is shown and remains editable. Inactive supported source may be visually replaced or styled; the underlying Markdown text is unchanged. Caret boundaries follow the specification's containing-element/nearest-applicable rule. An unsupported or malformed construct falls back to visible source without blocking adjacent elements.

## Selection and View State

Transient state used to determine source visibility and restore the user's position when switching editors.

- **Fields**: one or more anchor/head ranges, primary selection, scroll position.
- **Relationships**: Owned by an editor view, associated with a document URI, and transferred between the live and standard source editors by extension commands.
- **Rules**: Pointer hover does not alter source visibility. Selection movement alone does not edit content. Switching views does not discard edits or implicitly save.

## State Transitions

1. **Open live view**: bind a session to the current document version and initialize CodeMirror from the canonical text.
2. **Edit in live view**: create source-preserving CodeMirror transaction, apply its minimal edit to the VS Code document, then reconcile the document event.
3. **Document changed externally / undo / redo**: apply the authoritative text change to each session, reparse affected ranges, and retain valid selections.
4. **Move caret or selection**: update active source ranges and redraw only the corresponding presentation state; do not change document text.
5. **Switch view**: transfer selection and scroll state, open the same URI in the other editor, and leave dirty/save status unchanged.
6. **Close view**: dispose session state; preserve document text and normal VS Code save behavior.
