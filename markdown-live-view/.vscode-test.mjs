import { defineConfig } from '@vscode/test-electron';

export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  mocha: {
    timeout: 30000
  }
});
