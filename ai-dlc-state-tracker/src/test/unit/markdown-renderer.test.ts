import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../../markdown-renderer';

test('renders standard Markdown structures as formatted HTML', () => {
	const html = renderMarkdown('# State\n\n**Ready**\n\n- First\n- Second\n\n`code`');

	assert.match(html, /<h1>State<\/h1>/);
	assert.match(html, /<strong>Ready<\/strong>/);
	assert.match(html, /<li>First<\/li>/);
	assert.match(html, /<code>code<\/code>/);
});

test('does not render raw HTML from the workspace file', () => {
	const html = renderMarkdown('<script>alert(1)</script><b>unsafe</b>');

	assert.doesNotMatch(html, /<script/i);
	assert.doesNotMatch(html, /<b>/i);
	assert.match(html, /&lt;script&gt;/i);
});

test('does not emit image elements that could load remote resources', () => {
	const html = renderMarkdown('![diagram](https://example.test/diagram.png)');

	assert.doesNotMatch(html, /<img\b/i);
	assert.match(html, /diagram/);
});
