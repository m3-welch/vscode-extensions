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

export function selectExtensions(input, available) {
  const selection = input.trim();
  if (selection === 'all') {
    if (available.length === 0) {
      throw new Error('No extension packages were found in extensions/.');
    }
    return [...available];
  }

  const selected = selection.split(',').map((name) => name.trim());
  if (selected.some((name) => name.length === 0)) {
    throw new Error('Provide one or more extension directory names, or "all".');
  }

  const unknown = selected.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown extension(s): ${unknown.join(', ')}. Available extensions: ${available.join(', ') || '(none)'}.`,
    );
  }

  return [...new Set(selected)];
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
    throw new Error('Pass "all" or a comma-separated list of extension directory names.');
  }

  console.log(JSON.stringify(selectExtensions(argument, available)));
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
