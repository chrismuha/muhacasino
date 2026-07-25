const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const projectRoot = join(__dirname, '..');
const repairFile = join(projectRoot, '../../PRACTICE SOFTWARE SUITE/_shared/repair.mjs');

if (!existsSync(repairFile)) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [repairFile, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: projectRoot,
});

process.exit(result.status ?? 0);
