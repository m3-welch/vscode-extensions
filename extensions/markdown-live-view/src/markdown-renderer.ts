import { syntaxTree } from '@codemirror/language';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { EditorState, Range, RangeSet, RangeSetBuilder, StateField } from '@codemirror/state';
import { markdownSupport } from './markdown-language';

export interface MarkdownElement {
  from: number;
  to: number;
  kind: string;
  imageSrc?: string;
  imageAlt?: string;
  tableSource?: string;
  mermaidSource?: string;
}

export interface TextSelectionRange {
  from: number;
  to: number;
}

interface MarkdownAnalysis {
  elements: MarkdownElement[];
  syntaxRanges: Array<{ from: number; to: number }>;
  taskMarkers: Array<{ from: number; to: number; checked: boolean }>;
  listMarks: Array<{ from: number; to: number; ordered: boolean; task: boolean }>;
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
  HorizontalRule: 'horizontalRule',
  Table: 'table'
};

function analyzeMarkdown(
  markdown: string,
  tree = parser.parse(markdown)
): MarkdownAnalysis {
  const elements: MarkdownElement[] = [];
  const syntaxRanges: Array<{ from: number; to: number }> = [];
  const taskMarkers: MarkdownAnalysis['taskMarkers'] = [];
  const listMarks: MarkdownAnalysis['listMarks'] = [];

  tree.iterate({
    enter(node: { name: string; from: number; to: number }) {
      if (node.name === 'TaskMarker') {
        taskMarkers.push({
          from: node.from,
          to: node.to,
          checked: /^\[[xX]\]$/.test(markdown.slice(node.from, node.to))
        });
        return;
      }
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
      if (kind === 'fencedCode') {
        const fence = /^(`{3,}|~{3,})[ \t]*mermaid\b[^\n]*\r?\n([\s\S]*?)\r?\n\1[`~]*[ \t]*$/.exec(
          markdown.slice(node.from, node.to)
        );
        if (fence) {
          element.mermaidSource = fence[2];
        }
      }

      elements.push(element);
    }
  });

  tree.iterate({
    enter(node: { name: string; from: number; to: number; node: SyntaxNode }) {
      if (node.name === 'ListMark') {
        const item = node.node.parent;
        listMarks.push({
          from: node.from,
          to: node.to,
          ordered: item?.parent?.name === 'OrderedList',
          task: Boolean(item?.getChild('Task'))
        });
      } else if (node.name.endsWith('Mark') || node.name === 'URL') {
        syntaxRanges.push({ from: node.from, to: node.to });
      }
    }
  });

  return { elements, syntaxRanges, taskMarkers, listMarks };
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

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const bullet = document.createElement('span');
    bullet.className = 'md-live-bullet';
    bullet.textContent = '\u2022';
    return bullet;
  }

  eq(): boolean {
    return true;
  }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'md-live-task-checkbox';
    checkbox.checked = this.checked;
    checkbox.addEventListener('mousedown', (event) => event.preventDefault());
    checkbox.addEventListener('click', (event) => {
      event.preventDefault();
      const from = view.posAtDOM(checkbox);
      if (/^\[[ xX]\]$/.test(view.state.sliceDoc(from, from + 3))) {
        view.dispatch({
          changes: { from: from + 1, to: from + 2, insert: this.checked ? ' ' : 'x' }
        });
      }
    });
    return checkbox;
  }

  eq(other: TaskCheckboxWidget): boolean {
    return this.checked === other.checked;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const rule = document.createElement('hr');
    rule.className = 'md-live-hr';
    return rule;
  }

  eq(): boolean {
    return true;
  }
}

let mermaidCounter = 0;

async function renderMermaid(source: string): Promise<string> {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: document.body.classList.contains('vscode-light') ? 'default' : 'dark'
  });
  const { svg } = await mermaid.render(`md-live-mermaid-${mermaidCounter++}`, source);
  return svg;
}

class MermaidWidget extends WidgetType {
  constructor(private readonly source: string) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'md-live-mermaid';
    renderMermaid(this.source).then(
      (svg) => {
        container.innerHTML = svg;
      },
      () => {
        container.classList.add('md-live-mermaid-error');
        container.textContent = this.source;
      }
    );
    revealSourceOnClick(view, container);
    return container;
  }

  eq(other: MermaidWidget): boolean {
    return this.source === other.source;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function revealSourceOnClick(view: EditorView, dom: HTMLElement): void {
  dom.addEventListener('click', () => {
    view.dispatch({ selection: { anchor: view.posAtDOM(dom) } });
    view.focus();
  });
}

type SyntaxNode = ReturnType<typeof parser.parse>['topNode'];

const inlineTags: Record<string, { tag: string; className?: string }> = {
  StrongEmphasis: { tag: 'strong' },
  Emphasis: { tag: 'em' },
  Strikethrough: { tag: 'del' },
  InlineCode: { tag: 'code', className: 'md-live-inlineCode' },
  Link: { tag: 'span', className: 'md-live-link' }
};

function appendInlineChildren(parent: Node, text: string, node: SyntaxNode): void {
  let position = node.from;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.from > position) {
      parent.appendChild(document.createTextNode(text.slice(position, child.from)));
    }
    const inline = inlineTags[child.name];
    if (inline) {
      const element = document.createElement(inline.tag);
      if (inline.className) {
        element.className = inline.className;
      }
      appendInlineChildren(element, text, child);
      parent.appendChild(element);
    } else if (child.name === 'Escape') {
      parent.appendChild(document.createTextNode(text.slice(child.from + 1, child.to)));
    } else if (!child.name.endsWith('Mark') && child.name !== 'URL' && child.name !== 'LinkTitle') {
      parent.appendChild(document.createTextNode(text.slice(child.from, child.to)));
    }
    position = child.to;
  }
  if (position < node.to) {
    parent.appendChild(document.createTextNode(text.slice(position, node.to)));
  }
}

function appendInlineMarkdown(parent: Node, text: string): void {
  const paragraph = parser.parse(text).topNode.firstChild;
  if (paragraph) {
    appendInlineChildren(parent, text, paragraph);
  } else {
    parent.appendChild(document.createTextNode(text));
  }
}

class MarkdownTableWidget extends WidgetType {
  constructor(private readonly source: string) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const table = document.createElement('table');
    table.className = 'md-live-table-widget';
    revealSourceOnClick(view, table);
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
      appendInlineMarkdown(th, cell);
      headerRow.append(th);
    }
    header.append(headerRow);
    table.append(header);

    const body = document.createElement('tbody');
    for (const row of rows.slice(2)) {
      const tr = document.createElement('tr');
      for (let index = 0; index < rows[0].length; index++) {
        const td = document.createElement('td');
        appendInlineMarkdown(td, row[index] ?? '');
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
  state: EditorState,
  baseUri: string,
  analysis: MarkdownAnalysis
): Range<Decoration>[] {
  const { elements, syntaxRanges, taskMarkers, listMarks } = analysis;
  const selections = state.selection.ranges.map(({ from, to }) => ({ from, to }));
  const documentLength = state.doc.length;
  const inactiveElements = elements.filter(
    (element) => !isElementActive(element, selections, documentLength)
  );
  const widgetElements = inactiveElements.filter(
    (element) =>
      element.kind === 'table' ||
      Boolean(element.mermaidSource) ||
      (element.kind === 'image' && Boolean(element.imageSrc))
  );
  const decorations: Range<Decoration>[] = [];
  const addedSyntaxRanges = new Set<string>();

  const add = (from: number, to: number, decoration: Decoration) => {
    if (from >= 0 && to > from && to <= state.doc.length) {
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

    if (element.mermaidSource) {
      add(
        element.from,
        element.to,
        Decoration.replace({ widget: new MermaidWidget(element.mermaidSource), block: true })
      );
      continue;
    }

    if (element.kind === 'horizontalRule') {
      add(element.from, element.to, Decoration.replace({ widget: new HorizontalRuleWidget() }));
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

  for (const mark of listMarks) {
    if (mark.ordered) {
      continue;
    }
    add(
      mark.from,
      mark.to,
      Decoration.replace(mark.task ? {} : { widget: new BulletWidget() })
    );
  }

  for (const marker of taskMarkers) {
    add(
      marker.from,
      marker.to,
      Decoration.replace({ widget: new TaskCheckboxWidget(marker.checked) })
    );
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

// Block and line-break-spanning decorations are only allowed from a state field, not a view plugin.
export function createMarkdownRenderingExtension(baseUri: string) {
  interface RenderState {
    analysis: MarkdownAnalysis;
    decorations: RangeSet<Decoration>;
  }

  const build = (state: EditorState, analysis: MarkdownAnalysis): RenderState => {
    const builder = new RangeSetBuilder<Decoration>();
    for (const range of decorationsFor(state, baseUri, analysis)) {
      builder.add(range.from, range.to, range.value);
    }
    return { analysis, decorations: builder.finish() };
  };

  return StateField.define<RenderState>({
    create: (state) =>
      build(state, analyzeMarkdown(state.doc.toString(), syntaxTree(state))),
    update(value, transaction) {
      if (!transaction.docChanged && !transaction.selection) {
        return value;
      }
      const analysis = transaction.docChanged
        ? analyzeMarkdown(transaction.state.doc.toString(), syntaxTree(transaction.state))
        : value.analysis;
      return build(transaction.state, analysis);
    },
    provide: (field) => EditorView.decorations.from(field, (value) => value.decorations)
  });
}

export function linkTargetAt(state: EditorState, position: number): string | undefined {
  const tree = syntaxTree(state);
  for (const side of [1, -1] as const) {
    for (let node: SyntaxNode | null = tree.resolveInner(position, side); node; node = node.parent) {
      if (node.name === 'Link' || node.name === 'Autolink' || node.name === 'URL') {
        const url = node.name === 'URL' ? node : node.getChild('URL');
        if (url) {
          return state.sliceDoc(url.from, url.to).replace(/^<(.*)>$/, '$1');
        }
      }
    }
  }
  return undefined;
}
