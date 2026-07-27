const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let mainWindowRevealed = false;
const auxiliaryWindows = new Map();
let sharedGameState = null;

function getAppIconPath() {
  const iconFileNameByPlatform = {
    darwin: 'icon.icns',
    win32: 'icon.ico',
    linux: 'icon.png'
  };

  return path.join(app.getAppPath(), 'build', iconFileNameByPlatform[process.platform] || 'icon.png');
}

function getDockIconImage() {
  const image = nativeImage.createFromPath(path.join(app.getAppPath(), 'build', 'icon.png'));
  return image.isEmpty() ? undefined : image;
}

function revealMainWindow() {
  if (mainWindowRevealed) return;
  mainWindowRevealed = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
}

function createWindow() {
  mainWindowRevealed = false;
  const appIconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1050,
    minHeight: 760,
    backgroundColor: '#ffffff',
    show: false,
    ...(fs.existsSync(appIconPath) ? { icon: appIconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rendererReadyHandler = (event) => {
    if (mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents) {
      revealMainWindow();
    }
  };

  ipcMain.on('bingo:renderer-ready', rendererReadyHandler);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.once('did-fail-load', revealMainWindow);

  mainWindow.on('closed', () => {
    ipcMain.removeListener('bingo:renderer-ready', rendererReadyHandler);
    mainWindow = null;
  });
}

function createScreenWindow(screen) {
  const existing = auxiliaryWindows.get(screen);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }

  const win = new BrowserWindow({
    width: screen === 'audience' ? 1600 : 1500,
    height: screen === 'audience' ? 900 : 950,
    minWidth: 1000,
    minHeight: 700,
    title: screen === 'audience' ? 'Bingo Audience Display' : 'Bingo Dealer Console',
    backgroundColor: screen === 'audience' ? '#08142c' : '#f2f5f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  auxiliaryWindows.set(screen, win);
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}?screen=${screen}`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), { query: { screen } });
  }
  win.webContents.once('did-finish-load', () => {
    if (sharedGameState) win.webContents.send('bingo:state-sync', sharedGameState);
  });
  win.on('closed', () => auxiliaryWindows.delete(screen));
}

function createPlayerWindow(playerNumber) {
  const player = Math.max(1, Math.min(500, Number(playerNumber) || 1));
  const windowKey = `player-${player}`;
  const existing = auxiliaryWindows.get(windowKey);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 1250,
    height: 900,
    minWidth: 980,
    minHeight: 720,
    title: `Bingo Player ${String(player).padStart(3, '0')}`,
    backgroundColor: '#f2f5f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  auxiliaryWindows.set(windowKey, win);
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}?screen=floor&player=${player}`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { screen: 'floor', player: String(player) }
    });
  }
  win.webContents.once('did-finish-load', () => {
    if (sharedGameState) win.webContents.send('bingo:state-sync', sharedGameState);
  });
  win.on('closed', () => auxiliaryWindows.delete(windowKey));
}

ipcMain.on('bingo:open-screen', (_event, screen) => {
  if (screen === 'dealer' || screen === 'audience') createScreenWindow(screen);
});

ipcMain.on('bingo:open-player', (_event, playerNumber) => {
  createPlayerWindow(playerNumber);
});

ipcMain.on('bingo:state-update', (event, state) => {
  sharedGameState = state;
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed() && win.webContents !== event.sender) {
      win.webContents.send('bingo:state-sync', state);
    }
  });
});

ipcMain.on('bingo:state-request', (event) => {
  if (sharedGameState) event.sender.send('bingo:state-sync', sharedGameState);
});

app.whenReady().then(() => {
  const appIcon = getDockIconImage();
  if (process.platform === 'darwin' && appIcon && app.dock) {
    app.dock.setIcon(appIcon);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
