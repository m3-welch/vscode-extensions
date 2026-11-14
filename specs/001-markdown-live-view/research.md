# Research: Markdown Live View

## Decisions

### Editable presentation architecture

- **Decision**: Implement a VS Code `CustomTextEditorProvider` whose webview hosts CodeMirror 6. Keep the VS Code `TextDocument` as the canonical source; synchronize CodeMirror transactions to the extension host as minimal edits and apply document changes back to the webview.
- **Rationale**: The feature needs a rendered presentation and an editable surface with multiple selections. VS Code custom text editors expose the standard `TextDocument` model while allowing a custom webview UI. CodeMirror provides multi-range selections and decoration/widget primitives that can show formatted inactive content while retaining Markdown source.
- **Alternatives considered**:
  - Native `TextEditor` decorations: preserve VS Code's editing behavior directly, but public decoration APIs provide styling and limited before/after adornments, not rich, reflowing replacement elements.
  - Built-in Markdown preview: has a separate rendered view and editor synchronization, but is not an editable inline Markdown surface.
  - A plain `contenteditable` webview: can render HTML, but would require implementing source mapping, multi-selection, and synchronization without a suitable editor state model.

### Markdown parsing and rendering

- **Decision**: Use CodeMirror's Markdown language package with a GFM parser configuration, then build rendering decorations/widgets from syntax-tree ranges. Reveal the original source for every active selection and leave malformed or unsupported ranges as editable source.
- **Rationale**: The language package provides a parser and source ranges; GFM is required for the specified table support. Parsing alone does not provide the live rendering, so the extension must define presentation and source-range behavior.
- **Alternatives considered**: Relying on VS Code's built-in Markdown preview or internal parser is not an API for custom inline editor rendering. A separate Markdown renderer would require reconciling its output with CodeMirror source ranges and could duplicate parsing.

### Document synchronization and history

- **Decision**: Treat the VS Code `TextDocument` as the single source of truth. Send user edits from CodeMirror to the extension host as minimal version-checked document edits; reconcile authoritative document-change events in the webview. Route undo/redo through VS Code rather than maintaining an independent CodeMirror history.
- **Rationale**: `CustomTextEditorProvider` requires explicit synchronization for edits from the webview, external editor changes, undo/redo, and multiple views. A single history authority avoids divergent webview and document state.
- **Alternatives considered**: Keeping CodeMirror's independent history as the authority risks disagreement with VS Code undo/redo and external document edits. Replacing the complete document for every keystroke obscures minimal edit ranges and is less suitable for preserving normal history behavior.

### View switching

- **Decision**: Provide explicit live-view and plain-source commands for the same URI. Capture and restore document selections (including multiple ranges) and scroll position as transient extension view state; do not save implicitly or change document text when switching.
- **Rationale**: A `TextDocument` does not own selection state, so selection preservation across a custom editor and the standard text editor must be implemented explicitly.
- **Alternatives considered**: Relying solely on generic “Reopen Editor With” behavior does not establish selection transfer or restoration.

## Evidence and References

- VS Code API, [`TextEditor`](https://code.visualstudio.com/api/references/vscode-api#TextEditor), [`TextEditorDecorationType`](https://code.visualstudio.com/api/references/vscode-api#TextEditorDecorationType), and [`DecorationRenderOptions`](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions): decorations support styling and limited adornments but are not a rich replacement surface.
- VS Code, [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors): custom text editors use a `TextDocument` and require document synchronization with the webview.
- VS Code, [Markdown editor/preview synchronization](https://code.visualstudio.com/docs/languages/markdown#editor-and-preview-synchronization) and [Markdown Extension API](https://code.visualstudio.com/api/extension-guides/markdown-extension): built-in preview is a separate presentation and Markdown preview extensions do not create an editable inline surface.
- CodeMirror, [Reference Manual](https://codemirror.net/docs/ref/): `EditorSelection` supports multiple ranges, and the view package provides decorations and widgets. Multiple selections must be explicitly enabled and drawn.
- CodeMirror, [`@codemirror/lang-markdown`](https://github.com/codemirror/lang-markdown): Markdown language support supplies parsing; select/configure GFM for tables. Parser output does not itself implement live rendering.

## Risks to Validate During Implementation

- Custom webview editing is not automatically equivalent to the native VS Code editor; test navigation, editing, multiple selections, accessibility, and keyboard behavior.
- CodeMirror transactions and VS Code document events can echo or race. Include document versions/origin identifiers and test external edits, multiple views, undo, and redo.
- Replacement and block widgets can affect cursor mapping, selection boundaries, and layout. Test every required Markdown construct and malformed/unsupported examples.
- Selection and scroll transfer on view switches is extension-owned state and must be tested both ways.
- Confirm maintained package versions and current upstreams when dependencies are added; the research run noted the `lang-markdown` repository's upstream location has changed.
