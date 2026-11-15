import assert from 'node:assert/strict';
import test from 'node:test';
import { getStateProgress, renderReport } from '../../report-renderer';

const source = [
	'# State',
	'## Project Metadata',
	'- **Name:** demo',
	'## Phase 1: A',
	'- [x] 1.1 One',
	'- [x] 1.2 Two',
	'## Phase 2: B',
	'- [x] 2.1 Three',
	'- [-] 2.2 Four `code`',
	'- [ ] 2.3 Five',
	'## Phase 3: C',
	'- [ ] 3.1 Six',
].join('\n');

test('renders phases with step statuses', () => {
	const html = renderReport(source);

	assert.equal((html.match(/class="phase done"/g) ?? []).length, 1);
	assert.equal((html.match(/class="phase active"/g) ?? []).length, 1);
	assert.equal((html.match(/class="phase todo"/g) ?? []).length, 1);
	assert.equal((html.match(/class="step done"/g) ?? []).length, 3);
	assert.equal((html.match(/class="step active"/g) ?? []).length, 1);
	assert.match(html, /<code>code<\/code>/);
	assert.match(html, /1\/2|2\/2/);
});

test('excludes non-checklist sections from the stage report', () => {
	const html = renderReport(source);

	assert.doesNotMatch(html, /Project Metadata|demo/);
	assert.match(html, /Phase 1: A/);
});

test('marks unchecked steps before a later completed step in the same phase as skipped', () => {
	const html = renderReport([
		'## Phase 3',
		'- [ ] 3.1 Skipped',
		'- [-] 3.2 Active',
		'- [x] 3.3 Complete',
		'- [ ] 3.4 Pending',
		'## Phase 4',
		'- [ ] 4.1 Pending',
		'## Phase 5',
		'- [x] 5.1 Complete',
	].join('\n'));

	assert.match(html, /class="step skipped">(?:(?!<\/li>)[^])*3\.1 Skipped(?:(?!<\/li>)[^])*\(skipped\)/);
	assert.match(html, /class="step active">(?:(?!<\/li>)[^])*3\.2 Active/);
	assert.match(html, /class="step done">(?:(?!<\/li>)[^])*3\.3 Complete/);
	assert.match(html, /class="step todo">(?:(?!<\/li>)[^])*3\.4 Pending/);
	assert.match(html, /class="step todo">(?:(?!<\/li>)[^])*4\.1 Pending/);
});

test('falls back to Markdown without checklists and escapes HTML', () => {
	const html = renderReport('# T\n\n<script>x</script>');

	assert.doesNotMatch(html, /<script/i);
	assert.doesNotMatch(html, /class="report"/);
});

test('calculates overall progress and selects the explicitly active phase', () => {
	assert.deepEqual(getStateProgress(source), {
		stageName: 'Phase 2: B',
		completed: 3,
		total: 6,
		percentage: 50,
	});
});

test('uses the next incomplete phase or last phase as the current stage', () => {
	assert.deepEqual(getStateProgress('## Phase 1\n- [x] Done\n## Phase 2\n- [ ] Next'), {
		stageName: 'Phase 2',
		completed: 1,
		total: 2,
		percentage: 50,
	});
	assert.deepEqual(getStateProgress('## Phase 1\n- [x] Done'), {
		stageName: 'Phase 1',
		completed: 1,
		total: 1,
		percentage: 100,
	});
	assert.equal(getStateProgress('# No checklist'), undefined);
});
