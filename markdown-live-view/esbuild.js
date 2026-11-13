const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

async function build() {
  await Promise.all([
    esbuild.build({
      entryPoints: ['src/extension.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      external: ['vscode'],
      outfile: 'dist/extension.js',
      sourcemap: true
    }),
    esbuild.build({
      entryPoints: ['src/webview/editor.ts'],
      bundle: true,
      platform: 'browser',
      format: 'iife',
      target: 'es2022',
      outfile: 'dist/webview/editor.js',
      sourcemap: true
    }),
    esbuild.build({
      entryPoints: ['src/markdown-renderer.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      outfile: 'dist/markdown-renderer.cjs'
    }),
    esbuild.build({
      entryPoints: ['src/message-validation.ts', 'src/view-state.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      outdir: 'dist/unit'
    })
  ]);
  fs.mkdirSync('dist/webview', { recursive: true });
  fs.copyFileSync(
    path.join('src', 'webview', 'styles.css'),
    path.join('dist', 'webview', 'editor.css')
  );
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
