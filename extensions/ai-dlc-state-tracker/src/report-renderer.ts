import { renderInlineMarkdown, renderMarkdown } from './markdown-renderer';

export type StepStatus = 'done' | 'active' | 'todo';

interface Step {
	status: StepStatus;
	text: string;
}

type Section =
	| { kind: 'phase'; title: string; steps: Step[] }
	| { kind: 'markdown'; source: string };

const stepPattern = /^\s*[-*]\s+\[([ xX-])\]\s+(.*\S)\s*$/;

function parseSections(source: string): Section[] {
	const sections: Section[] = [];
	let heading: string | undefined;
	let lines: string[] = [];

	const flush = () => {
		const steps: Step[] = [];
		for (const line of lines) {
			const match = stepPattern.exec(line);
			if (match) {
				const mark = match[1].toLowerCase();
				steps.push({ status: mark === 'x' ? 'done' : mark === '-' ? 'active' : 'todo', text: match[2] });
			}
		}

		if (heading !== undefined && steps.length > 0) {
			sections.push({ kind: 'phase', title: heading, steps });
		} else {
			const text = [heading !== undefined ? `## ${heading}` : '', ...lines].join('\n').replace(/^\s*---\s*$/gm, '').trim();
			if (text) {
				sections.push({ kind: 'markdown', source: text });
			}
		}
	};

	for (const line of source.split(/\r?\n/)) {
		const match = /^##\s+(.*\S)\s*$/.exec(line);
		if (match) {
			flush();
			heading = match[1];
			lines = [];
		} else {
			lines.push(line);
		}
	}
	flush();

	return sections;
}

function phaseStatus(steps: Step[]): StepStatus {
	if (steps.every((step) => step.status === 'done')) {
		return 'done';
	}
	return steps.some((step) => step.status !== 'todo') ? 'active' : 'todo';
}

function renderPhase(title: string, steps: Step[]): string {
	const status = phaseStatus(steps);
	const done = steps.filter((step) => step.status === 'done').length;
	const lastCompleted = steps.reduce((last, step, index) => step.status === 'done' ? index : last, -1);
	const items = steps
		.map(
			(step, index) => {
				const stepStatus = step.status === 'todo' && index < lastCompleted ? 'skipped' : step.status;
				const description = stepStatus === 'done' ? 'completed' : stepStatus === 'active' ? 'in progress' : stepStatus === 'skipped' ? 'skipped' : 'not started';
				return `<li class="step ${stepStatus}"><span class="dot" aria-hidden="true"></span><span class="label">${renderInlineMarkdown(step.text)}</span><span class="sr-only"> (${description})</span></li>`;
			},
		)
		.join('');

	return `<section class="phase ${status}"><h2><span class="dot" aria-hidden="true"></span>${renderInlineMarkdown(title)}<span class="count">${done}/${steps.length}</span></h2><ol class="steps">${items}</ol></section>`;
}

export function renderReport(source: string): string {
	const sections = parseSections(source);
	if (!sections.some((section) => section.kind === 'phase')) {
		return renderMarkdown(source);
	}

	const html = sections
		.filter((section): section is Extract<Section, { kind: 'phase' }> => section.kind === 'phase')
		.map((section) => renderPhase(section.title, section.steps))
		.join('');

	return `<div class="report">${html}</div>`;
}

export const reportStyles = `
	.report { padding-bottom: 8px; }
	.notes h1 { display: none; }
	.notes h2 { margin-bottom: 0.3em; }
	.phase { position: relative; margin: 0; padding: 0 0 18px 32px; }
	.phase::before { content: ''; position: absolute; left: 9px; top: 22px; bottom: -4px; width: 2px; background: var(--vscode-panel-border); }
	.phase:last-of-type::before { display: none; }
	.phase.done::before { background: #2ea043; }
	.phase h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 1.1em; position: relative; }
	.phase h2 .dot { position: absolute; left: -32px; top: 50%; transform: translateY(-50%); }
	.count { margin-left: auto; font-size: 0.8em; font-weight: normal; color: var(--vscode-descriptionForeground); }
	.steps { list-style: none; margin: 0; padding: 0 0 0 4px; }
	.step { position: relative; display: flex; align-items: baseline; gap: 8px; padding: 2px 0 2px 26px; }
	.step .dot { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; }
	.step.todo .label { color: var(--vscode-descriptionForeground); }
	.step.active .label { font-weight: 600; }
	.step.skipped { color: var(--vscode-disabledForeground); }
	.step.skipped .dot { border-color: currentColor; }
	.step.skipped .dot::after { content: ''; position: absolute; left: 50%; top: 50%; width: 100%; height: 1px; background: currentColor; transform: translate(-50%, -50%) rotate(-45deg); }
	.dot { display: inline-block; box-sizing: border-box; width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--vscode-foreground); background: transparent; }
	.done > .dot, .done > h2 > .dot, .step.done .dot { background: #2ea043; border-color: #2ea043; }
	.active > h2 > .dot, .step.active .dot { border-color: #2ea043; background: linear-gradient(90deg, #2ea043 50%, transparent 50%); }
	.step .dot { width: 14px; height: 14px; border-width: 1.5px; }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;
