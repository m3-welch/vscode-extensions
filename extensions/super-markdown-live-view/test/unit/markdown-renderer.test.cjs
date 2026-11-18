const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  extractMarkdownElements,
  isElementActive
} = require('../../dist/markdown-renderer.cjs');

test('caps and wraps rendered Markdown lines and table content', () => {
  const editor = fs.readFileSync(
    path.join(__dirname, '../../src/webview/editor.ts'),
    'utf8'
  );
  const styles = fs.readFileSync(
    path.join(__dirname, '../../src/webview/styles.css'),
    'utf8'
  );

  assert.match(editor, /EditorView\.lineWrapping/);
  assert.match(styles, /\.cm-line\s*\{[^}]*max-width:\s*80ch;[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(
    styles,
    /\.md-live-table-widget\s*\{[^}]*max-width:\s*80ch;[^}]*table-layout:\s*fixed;/s
  );
  assert.match(
    styles,
    /\.md-live-table-widget td\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*normal;/s
  );
});

test('extracts all required supported Markdown element kinds and exact ranges', () => {
  const markdown = [
    '# Heading',
    '',
    'Paragraph with **bold**, *italic*, [link](https://example.com), ![alt](image.png), and `code`.',
    '',
    '- list item',
    '',
    '> quote',
    '',
    '```js',
    'const answer = 42;',
    '```',
    '',
    '| A | B |',
    '| --- | --- |',
    '| 1 | 2 |'
  ].join('\n');

  const elements = extractMarkdownElements(markdown);
  const kinds = new Set(elements.map((element) => element.kind));

  for (const kind of [
    'heading',
    'paragraph',
    'strong',
    'emphasis',
    'link',
    'image',
    'inlineCode',
    'list',
    'blockquote',
    'fencedCode',
    'table'
  ]) {
    assert.ok(kinds.has(kind), `expected parser to find ${kind}`);
  }

  for (const element of elements) {
    assert.ok(element.from >= 0);
    assert.ok(element.to > element.from);
    assert.equal(markdown.slice(element.from, element.to).length, element.to - element.from);
  }
  const image = elements.find((element) => element.kind === 'image');
  const table = elements.find((element) => element.kind === 'table');
  assert.equal(image.imageAlt, 'alt');
  assert.equal(image.imageSrc, 'image.png');
  assert.match(table.tableSource, /\| A \| B \|/);
});

test('marks all selected or caret-containing elements active, including boundaries', () => {
  const element = { from: 4, to: 10, kind: 'heading' };
  const nextElement = { from: 10, to: 15, kind: 'paragraph' };
  const gapElement = { from: 12, to: 15, kind: 'paragraph' };

  assert.equal(isElementActive(element, [{ from: 4, to: 4 }]), true);
  assert.equal(isElementActive(element, [{ from: 10, to: 10 }]), false);
  assert.equal(isElementActive(nextElement, [{ from: 10, to: 10 }]), true);
  assert.equal(isElementActive(element, [{ from: 10, to: 10 }], 10), true);
  assert.equal(isElementActive(element, [{ from: 7, to: 7 }]), true);
  assert.equal(isElementActive(gapElement, [{ from: 11, to: 11 }]), false);
  assert.equal(isElementActive(element, [{ from: 2, to: 5 }]), true);
  assert.equal(isElementActive(element, [{ from: 10, to: 12 }]), false);
  assert.equal(isElementActive(element, [{ from: 1, to: 3 }]), false);
  assert.equal(isElementActive(element, [{ from: 11, to: 11 }]), false);
});

test('leaves empty and plain-text content without invented elements', () => {
  assert.deepEqual(extractMarkdownElements(''), []);
  assert.equal(
    extractMarkdownElements('plain text').some((element) => element.kind !== 'paragraph'),
    false
  );
});

test('parses a large document into independently addressable blocks', () => {
  const markdown = Array.from({ length: 1000 }, (_, index) => `## Section ${index}\n\nText ${index}.`).join(
    '\n\n'
  );
  const elements = extractMarkdownElements(markdown);
  assert.equal(elements.filter((element) => element.kind === 'heading').length, 1000);
  assert.equal(elements.filter((element) => element.kind === 'paragraph').length, 1000);
});

test('replaces ordered list source markers with number-preserving widgets', () => {
  const { EditorState } = require('@codemirror/state');
  const { markdownSupport } = require('../../out/src/markdown-language.js');
  const { createMarkdownRenderingExtension } = require('../../out/src/markdown-renderer.js');
  const markdown = 'Outside\n\n3. first\n4) second\n   12. nested\n5. [x] task';
  const rendering = createMarkdownRenderingExtension('');
  const state = EditorState.create({
    doc: markdown,
    selection: { anchor: 0 },
    extensions: [markdownSupport, rendering]
  });
  const markers = [];
  state.field(rendering).decorations.between(0, markdown.length, (from, to, decoration) => {
    if (decoration.spec.widget?.constructor.name === 'OrderedListMarkerWidget') {
      markers.push({ from, to, widget: decoration.spec.widget });
    }
  });

  assert.deepEqual(markers.map(({ from, to }) => markdown.slice(from, to)), [
    '3.', '4)', '12.', '5.'
  ]);
  assert.equal(state.doc.toString(), markdown);
  const activeState = state.update({ selection: { anchor: markdown.indexOf('first') } }).state;
  assert.ok(activeState.field(rendering).decorations.iter(markdown.indexOf('3.')).value.spec.widget);
  const originalDocument = global.document;
  try {
    global.document = { createElement: () => ({}) };
    assert.deepEqual(markers.map(({ widget }) => widget.toDOM().textContent), [
      '3.', '4.', '12.', '5.'
    ]);
  } finally {
    global.document = originalDocument;
  }
});
