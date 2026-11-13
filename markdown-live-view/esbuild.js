const esbuild = require('esbuild');

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
    })
  ]);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
