const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  close: () => ipcRenderer.invoke('app:close'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  quit: () => ipcRenderer.invoke('app:quit'),

  checkAuth: () => ipcRenderer.invoke('auth:check'),
  login: (data) => ipcRenderer.invoke('auth:login', data),
  logout: () => ipcRenderer.invoke('auth:logout'),

  scanNetwork: () => ipcRenderer.invoke('network:scan'),
  testPrinter: (data) => ipcRenderer.invoke('printer:test', data),
  savePrinter: (data) => ipcRenderer.invoke('printer:save', data),

  startConnection: () => ipcRenderer.invoke('connection:start'),
  stopConnection: () => ipcRenderer.invoke('connection:stop'),
  getStatus: () => ipcRenderer.invoke('connection:status'),

  getLogs: () => ipcRenderer.invoke('logs:get'),
  openLogsFolder: () => ipcRenderer.invoke('logs:open-folder'),
  getConfig: () => ipcRenderer.invoke('config:get'),

  on: (channel, callback) => {
    const allowed = [
      'status:changed',
      'scan:progress',
      'scan:found',
      'order:received',
      'auth:expired',
    ];
    if (allowed.includes(channel)) {
      const listener = (_, ...args) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },
});
