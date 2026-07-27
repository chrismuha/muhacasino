const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bingoApi', {
  appReady: () => ipcRenderer.send('bingo:renderer-ready'),
  openScreen: (screen) => ipcRenderer.send('bingo:open-screen', screen),
  openPlayer: (playerNumber) => ipcRenderer.send('bingo:open-player', playerNumber),
  publishState: (state) => ipcRenderer.send('bingo:state-update', state),
  requestState: () => ipcRenderer.send('bingo:state-request'),
  onState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('bingo:state-sync', handler);
    return () => ipcRenderer.removeListener('bingo:state-sync', handler);
  }
});
