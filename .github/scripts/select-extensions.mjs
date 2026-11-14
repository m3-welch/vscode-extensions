import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function listExtensions(extensionsRoot) {
  const entries = await readdir(extensionsRoot, { withFileTypes: true });
  const extensions = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    try {
      await access(path.join(extensionsRoot, entry.name, 'package.json'));
      extensions.push(entry.name);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return extensions.sort();
}

export function selectExtensions(inputs, available) {
  const selected = available.filter((name) => inputs[name] === true || inputs[name] === 'true');
  const all = inputs.all === true || inputs.all === 'true';

  if (all) {
    if (available.length === 0) {
      throw new Error('No extension packages were found in extensions/.');
    }
    return [...available];
  }

  if (selected.length === 0) {
    throw new Error('Select at least one extension, or select "all".');
  }

  return selected;
}

const START_MARKER = '# BEGIN GENERATED EXTENSION INPUTS';
const END_MARKER = '# END GENERATED EXTENSION INPUTS';

export function renderInputs(available, indent = '      ') {
  const lines = [
    `${indent}all:`,
    `${indent}  description: 'Publish all extensions'`,
    `${indent}  type: boolean`,
    `${indent}  default: false`,
  ];
  for (const name of available) {
    lines.push(
      `${indent}${name}:`,
      `${indent}  description: '${name}'`,
      `${indent}  type: boolean`,
      `${indent}  default: false`,
    );
  }
  return lines.join('\n');
}

export function syncWorkflow(workflow, available) {
  const start = workflow.indexOf(START_MARKER);
  const end = workflow.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Workflow is missing the generated extension inputs markers.');
  }
  const startLineEnd = workflow.indexOf('\n', start) + 1;
  const endLineStart = workflow.lastIndexOf('\n', end) + 1;
  return `${workflow.slice(0, startLineEnd)}${renderInputs(available)}\n${workflow.slice(endLineStart)}`;
}

async function main() {
  const extensionsRoot = fileURLToPath(new URL('../../extensions/', import.meta.url));
  const available = await listExtensions(extensionsRoot);
  const argument = process.argv[2];

  if (argument === '--list') {
    console.log(JSON.stringify(available));
    return;
  }

  if (argument === '--sync-workflow' || argument === '--check-workflow') {
    const workflowPath = fileURLToPath(new URL('../workflows/publish-extensions.yml', import.meta.url));
    const current = await readFile(workflowPath, 'utf8');
    const updated = syncWorkflow(current, available);
    if (argument === '--check-workflow') {
      if (updated !== current) {
        throw new Error('publish-extensions.yml inputs are out of date. Run: node .github/scripts/select-extensions.mjs --sync-workflow');
      }
    } else {
      await writeFile(workflowPath, updated);
    }
    return;
  }

  if (argument === undefined) {
    throw new Error('Pass the workflow inputs as JSON, --list, --sync-workflow, or --check-workflow.');
  }

  console.log(JSON.stringify(selectExtensions(JSON.parse(argument), available)));
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
