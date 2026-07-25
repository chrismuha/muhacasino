const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const projectRoot = join(__dirname, '..');

function binPath(name) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  const candidate = join(projectRoot, 'node_modules', '.bin', `${name}${suffix}`);
  return existsSync(candidate) ? candidate : name;
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_ENV = 'development';

const result = spawnSync(binPath('electron'), ['.', '--disable-cache'], {
  stdio: 'inherit',
  cwd: projectRoot,
  env,
});

process.exit(result.status ?? 0);
