import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
	html: false,
	linkify: false,
	typographer: false,
});

markdown.renderer.rules.image = (tokens, index) => {
	const token = tokens[index];
	const alt = token.content || token.attrGet('alt') || 'Image';
	return `<span class="image-placeholder">${markdown.utils.escapeHtml(`[Image: ${alt}]`)}</span>`;
};

export function renderMarkdown(source: string): string {
	return markdown.render(source);
}
