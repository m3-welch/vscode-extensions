import { access, readdir } from 'node:fs/promises';
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

async function main() {
  const extensionsRoot = fileURLToPath(new URL('../../extensions/', import.meta.url));
  const available = await listExtensions(extensionsRoot);
  const argument = process.argv[2];

  if (argument === '--list') {
    console.log(JSON.stringify(available));
    return;
  }

  if (argument === undefined) {
    throw new Error('Pass the workflow inputs as JSON or --list.');
  }

  console.log(JSON.stringify(selectExtensions(JSON.parse(argument), available)));
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
