import { syntaxTree } from '@codemirror/language';
import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { Range, RangeSet, RangeSetBuilder } from '@codemirror/state';
import { markdownSupport } from './markdown-language';

export interface MarkdownElement {
  from: number;
  to: number;
  kind: string;
  imageSrc?: string;
  imageAlt?: string;
  tableSource?: string;
}

export interface TextSelectionRange {
  from: number;
  to: number;
}

interface MarkdownAnalysis {
  elements: MarkdownElement[];
  syntaxRanges: Array<{ from: number; to: number }>;
}

const parser = markdownSupport.language.parser;
const nodeKinds: Record<string, string> = {
  ATXHeading1: 'heading',
  ATXHeading2: 'heading',
  ATXHeading3: 'heading',
  ATXHeading4: 'heading',
  ATXHeading5: 'heading',
  ATXHeading6: 'heading',
  SetextHeading1: 'heading',
  SetextHeading2: 'heading',
  Paragraph: 'paragraph',
  StrongEmphasis: 'strong',
  Emphasis: 'emphasis',
  Strikethrough: 'strikethrough',
  Link: 'link',
  Image: 'image',
  InlineCode: 'inlineCode',
  FencedCode: 'fencedCode',
  BulletList: 'list',
  OrderedList: 'list',
  Blockquote: 'blockquote',
  Table: 'table'
};

function analyzeMarkdown(
  markdown: string,
  tree = parser.parse(markdown)
): MarkdownAnalysis {
  const elements: MarkdownElement[] = [];
  const syntaxRanges: Array<{ from: number; to: number }> = [];

  tree.iterate({
    enter(node: { name: string; from: number; to: number }) {
      const kind = nodeKinds[node.name];
      if (!kind || node.from === node.to) {
        return;
      }

      const element: MarkdownElement = {
        from: node.from,
        to: node.to,
        kind
      };

      if (kind === 'image') {
        const source = markdown.slice(node.from, node.to);
        const match = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/.exec(source);
        if (match) {
          element.imageAlt = match[1];
          element.imageSrc = match[2];
        }
      }
      if (kind === 'table') {
        element.tableSource = markdown.slice(node.from, node.to);
      }

      elements.push(element);
    }
  });

  tree.iterate({
    enter(node: { name: string; from: number; to: number }) {
      if (node.name.endsWith('Mark') || node.name === 'URL') {
        syntaxRanges.push({ from: node.from, to: node.to });
      }
    }
  });

  return { elements, syntaxRanges };
}

export function extractMarkdownElements(markdown: string): MarkdownElement[] {
  return analyzeMarkdown(markdown).elements;
}

export function isElementActive(
  element: TextSelectionRange,
  selections: readonly TextSelectionRange[],
  documentLength?: number
): boolean {
  return selections.some((selection) => {
    if (selection.from === selection.to) {
      return (
        (selection.from >= element.from && selection.from < element.to) ||
        (selection.from === documentLength && element.to === documentLength)
      );
    }
    return selection.from < element.to && selection.to > element.from;
  });
}

class LocalImageWidget extends WidgetType {
  constructor(
    private readonly alt: string,
    private readonly source: string,
    private readonly baseUri: string
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span');
    container.className = 'md-live-image';

    if (!isSafeRelativeImage(this.source)) {
      container.textContent = this.alt || 'Image';
      return container;
    }

    const image = document.createElement('img');
    image.alt = this.alt;
    image.loading = 'lazy';
    try {
      image.src = new URL(this.source, this.baseUri).toString();
    } catch {
      container.textContent = this.alt || 'Image';
      return container;
    }
    container.append(image);
    return container;
  }

  eq(other: LocalImageWidget): boolean {
    return this.alt === other.alt && this.source === other.source && this.baseUri === other.baseUri;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class MarkdownTableWidget extends WidgetType {
  constructor(private readonly source: string) {
    super();
  }

  toDOM(): HTMLElement {
    const table = document.createElement('table');
    table.className = 'md-live-table-widget';
    const rows = this.source
      .trim()
      .split(/\r?\n/)
      .map(splitTableRow)
      .filter((cells) => cells.length > 0);
    if (rows.length === 0) {
      return table;
    }

    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const cell of rows[0]) {
      const th = document.createElement('th');
      th.textContent = cell;
      headerRow.append(th);
    }
    header.append(headerRow);
    table.append(header);

    const body = document.createElement('tbody');
    for (const row of rows.slice(2)) {
      const tr = document.createElement('tr');
      for (let index = 0; index < rows[0].length; index++) {
        const td = document.createElement('td');
        td.textContent = row[index] ?? '';
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    return table;
  }

  eq(other: MarkdownTableWidget): boolean {
    return this.source === other.source;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function splitTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  if (!trimmed.includes('|')) {
    return [];
  }
  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  for (const character of trimmed) {
    if (character === '|' && !escaped) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += character;
    escaped = character === '\\' && !escaped;
    if (character !== '\\') {
      escaped = false;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isSafeRelativeImage(source: string): boolean {
  let decodedSource: string;
  try {
    decodedSource = decodeURIComponent(source);
  } catch {
    return false;
  }
  if (
    !source ||
    source.startsWith('/') ||
    source.startsWith('\\') ||
    /^[a-z][a-z\d+.-]*:/i.test(source) ||
    decodedSource.startsWith('/') ||
    decodedSource.startsWith('\\')
  ) {
    return false;
  }
  return !decodedSource.split(/[\\/]/).some((part) => part === '..');
}

function decorationsFor(
  view: EditorView,
  baseUri: string,
  analysis: MarkdownAnalysis
): Range<Decoration>[] {
  const { elements, syntaxRanges } = analysis;
  const selections = view.state.selection.ranges.map(({ from, to }) => ({ from, to }));
  const documentLength = view.state.doc.length;
  const inactiveElements = elements.filter(
    (element) => !isElementActive(element, selections, documentLength)
  );
  const widgetElements = inactiveElements.filter(
    (element) =>
      element.kind === 'table' || (element.kind === 'image' && Boolean(element.imageSrc))
  );
  const decorations: Range<Decoration>[] = [];
  const addedSyntaxRanges = new Set<string>();

  const add = (from: number, to: number, decoration: Decoration) => {
    if (from >= 0 && to > from && to <= view.state.doc.length) {
      decorations.push(decoration.range(from, to));
    }
  };

  for (const element of elements) {
    if (isElementActive(element, selections, documentLength)) {
      continue;
    }

    if (element.kind === 'table' && element.tableSource) {
      add(
        element.from,
        element.to,
        Decoration.replace({
          widget: new MarkdownTableWidget(element.tableSource),
          block: true
        })
      );
      continue;
    }

    if (element.kind === 'image' && element.imageSrc) {
      add(
        element.from,
        element.to,
        Decoration.replace({
          widget: new LocalImageWidget(element.imageAlt ?? '', element.imageSrc, baseUri),
          block: false
        })
      );
      continue;
    }

    add(element.from, element.to, Decoration.mark({ class: `md-live-${element.kind}` }));
  }

  for (const node of syntaxRanges) {
    if (widgetElements.some((element) => node.from >= element.from && node.to <= element.to)) {
      continue;
    }
    const isInactiveSyntax = inactiveElements.some(
      (element) => node.from >= element.from && node.to <= element.to
    );
    if (isInactiveSyntax) {
      const key = `${node.from}:${node.to}`;
      if (!addedSyntaxRanges.has(key)) {
        addedSyntaxRanges.add(key);
        add(node.from, node.to, Decoration.replace({}));
      }
    }
  }

  decorations.sort(
    (a, b) => a.from - b.from || a.value.startSide - b.value.startSide || a.to - b.to
  );
  return decorations;
}

export function createMarkdownRenderingExtension(baseUri: string) {
  return ViewPlugin.fromClass(
    class {
      decorations: RangeSet<Decoration>;
      analysis: MarkdownAnalysis;

      constructor(view: EditorView) {
        this.analysis = analyzeMarkdown(view.state.doc.toString(), syntaxTree(view.state));
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.analysis = analyzeMarkdown(
            update.state.doc.toString(),
            syntaxTree(update.state)
          );
        }
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      private build(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (const range of decorationsFor(view, baseUri, this.analysis)) {
          builder.add(range.from, range.to, range.value);
        }
        return builder.finish();
      }
    },
    {
      decorations: (plugin) => plugin.decorations
    }
  );
}
