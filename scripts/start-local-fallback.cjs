const { spawn, spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');
const net = require('net');

const projectRoot = join(__dirname, '..');
const defaultPort = 5176;
const maxPort = 5200;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  for (let port = startPort; port <= maxPort; port += 1) {
    if (await checkPort(port)) {
      return port;
    }
  }
  return null;
}

function binPath(name) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  const candidate = join(projectRoot, 'node_modules', '.bin', `${name}${suffix}`);
  return existsSync(candidate) ? candidate : name;
}

function spawnProcess(command, args, env) {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/c', command, ...args], {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });
  }

  return spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    detached: true,
  });
}

function signalChild(child, signal) {
  if (!child) return;

  if (process.platform === 'win32' && child.pid) {
    const result = spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    if (result.status === 0) return;
  }

  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, signal);
      return;
    }
  } catch {
    // Fall back to the direct child.
  }

  try {
    child.kill(signal);
  } catch {
    // The process has already exited.
  }
}

function waitForChildExit(child, timeoutMs = 1500) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;

  signalChild(child, 'SIGTERM');
  await waitForChildExit(child);

  if (child.exitCode === null && child.signalCode === null) {
    signalChild(child, 'SIGKILL');
    await waitForChildExit(child, 500);
  }
}

function normalizeArgs() {
  const portArg = process.argv.slice(2).find((arg) => arg.startsWith('--prefer-port='));
  if (!portArg) return defaultPort;

  const port = Number(portArg.split('=')[1]);
  return Number.isInteger(port) && port > 0 ? port : defaultPort;
}

async function main() {
  const preferredPort = normalizeArgs();
  const freePort = await findFreePort(preferredPort);

  if (!freePort) {
    process.stderr.write(`No available port found between ${preferredPort} and ${maxPort}.\n`);
    process.exit(1);
  }

  const env = {
    ...process.env,
    NODE_DISABLE_COMPILE_CACHE: '1',
    VITE_DEV_SERVER_URL: `http://127.0.0.1:${freePort}/`,
    NODE_ENV: 'development',
    PORT: String(freePort),
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const renderer = spawnProcess(binPath('vite'), ['dev', '--host', '127.0.0.1', '--port', String(freePort)], env);
  const mainProcess = spawnProcess(
    binPath('electron'),
    ['.', '--disable-cache', '--disable-logging', '--log-level=3'],
    env,
  );

  let cleanupCalled = false;
  const cleanup = async (code) => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    await Promise.all([stopChild(renderer), stopChild(mainProcess)]);
    process.exit(code);
  };

  process.on('SIGINT', () => void cleanup(130));
  process.on('SIGTERM', () => void cleanup(143));
  process.on('SIGBREAK', () => void cleanup(130));
  process.on('exit', () => {
    signalChild(renderer, 'SIGKILL');
    signalChild(mainProcess, 'SIGKILL');
  });

  renderer.on('exit', (code) => void cleanup(code ?? 1));
  renderer.on('error', () => void cleanup(1));
  mainProcess.on('exit', (code) => void cleanup(code ?? 0));
  mainProcess.on('error', () => void cleanup(1));
}

main().catch((error) => {
  process.stderr.write(`Failed to start local dev fallback: ${error.message}\n`);
  process.exit(1);
});
