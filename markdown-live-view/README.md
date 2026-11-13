# Markdown Live View

Markdown Live View is a VS Code extension for reading and editing Markdown in a rendered live view. The document remains Markdown in the normal VS Code text model; rendering changes presentation only.

## Use

Open a `.md` or `.markdown` document and run **Open Markdown Live View** from the Command Palette. Move the text caret or make a selection to reveal the corresponding Markdown source. Moving the pointer alone does not change source visibility.

Run **Open as Markdown Source** to return to the standard text editor. Both views use the same document. Switching views does not save or discard edits.

The view renders headings, paragraphs, emphasis, links, local images, ordered and unordered lists, block quotes, inline and fenced code, and GitHub-flavored Markdown tables. Unsupported or malformed syntax remains source text. Remote images are not loaded; their alt text is shown instead.

## Privacy

Markdown is parsed and rendered locally. The extension does not send document content to external services. Webview scripts and styles are bundled with the extension; local image paths are restricted to the document's workspace and remote image URLs are not requested.

## Development

Requires Node.js supported by the extension's VS Code engine range.

```sh
npm install
npm run compile
npm run test:unit
npm run test:integration
```

The extension-host test downloads VS Code through `@vscode/test-electron` on first run, so network access to the VS Code update service is required. To manually verify the webview, launch this folder in an Extension Development Host and run the commands above on the Markdown fixture at `test/fixtures/markdown.md`.
