const assert = require('node:assert/strict');
const test = require('node:test');
const {
  extractMarkdownElements,
  isElementActive
} = require('../../dist/markdown-renderer.cjs');

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

  assert.equal(isElementActive(element, [{ from: 4, to: 4 }]), true);
  assert.equal(isElementActive(element, [{ from: 10, to: 10 }]), true);
  assert.equal(isElementActive(element, [{ from: 7, to: 7 }]), true);
  assert.equal(isElementActive(element, [{ from: 2, to: 5 }]), true);
  assert.equal(isElementActive(element, [{ from: 10, to: 12 }]), true);
  assert.equal(isElementActive(element, [{ from: 1, to: 3 }]), false);
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
