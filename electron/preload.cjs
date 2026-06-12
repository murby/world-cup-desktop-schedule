const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getMatches: (dateStr) => ipcRenderer.invoke('get-matches', dateStr),
  getPerfMetrics: () => ipcRenderer.invoke('get-perf-metrics'),
  toggleDetach: () => ipcRenderer.send('toggle-detach'),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onModeChange: (callback) => ipcRenderer.on('mode-change', (event, mode) => callback(mode))
});
