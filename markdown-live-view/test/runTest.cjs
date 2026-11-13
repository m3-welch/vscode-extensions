const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, '../out/test/integration');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ['--disable-workspace-trust']
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
