const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const projectRoot = join(__dirname, '..');
const sharedFile = process.argv[2];
const sharedArgs = process.argv.slice(3);

if (!sharedFile) {
  process.stderr.write('ERROR: Missing shared script path argument.\n');
  process.exit(1);
}

function getPreferredPort() {
  const portIndex = sharedArgs.indexOf('--port');
  if (portIndex >= 0 && sharedArgs[portIndex + 1]) {
    return sharedArgs[portIndex + 1];
  }

  const portArg = sharedArgs.find((arg) => arg.startsWith('--port='));
  return portArg ? portArg.split('=')[1] : '5176';
}

const sharedPath = join(projectRoot, sharedFile);
if (!existsSync(sharedPath)) {
  process.stdout.write(`Skipping missing shared helper: ${sharedFile}\n`);
  const helperName = sharedFile.split(/[\\/]/).pop();
  const fallbackCommands = {
    'vite-electron-dev.mjs': [
      process.execPath,
      [join(__dirname, 'start-local-fallback.cjs'), `--prefer-port=${getPreferredPort()}`],
    ],
  };

  const fallback = fallbackCommands[helperName];
  if (fallback) {
    const [command, args] = fallback;
    const result = spawnSync(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    process.exit(result.status ?? 0);
  }

  process.exit(0);
}

const result = spawnSync(process.execPath, [sharedPath, ...sharedArgs], {
  stdio: 'inherit',
  cwd: projectRoot,
});

process.exit(result.status ?? 0);
