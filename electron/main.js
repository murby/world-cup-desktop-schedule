const startupStart = performance.now();
import { app, BrowserWindow, Tray, nativeImage, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM helper for paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
dotenv.config();

// Import utilities from our existing World Cup schedule engine
import { getMatchesData } from '../src/utils.js';

let mainWindow = null;
let tray = null;
let isDetached = false;

// Standard Dimensions
const TRAY_WIDTH = 380;
const TRAY_HEIGHT = 550;
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 600;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: TRAY_WIDTH,
    height: TRAY_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.on('blur', () => {
    if (!isDetached) {
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'trayIconTemplate.png');
  const img = nativeImage.createFromPath(iconPath);
  img.setTemplateImage(true);

  tray = new Tray(img);
  tray.setToolTip('World Cup Cyberpunk Schedule');

  tray.on('click', () => {
    if (isDetached) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      toggleTrayWindow();
    }
  });
}

function toggleTrayWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    positionWindowAtTray();
    mainWindow.show();
    mainWindow.focus();
  }
}

function positionWindowAtTray() {
  if (!tray || !mainWindow) return;

  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();
  const screenBounds = screen.getDisplayMatching(trayBounds).bounds;

  // Center window horizontally below the tray icon
  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  let y = Math.round(trayBounds.y + trayBounds.height);

  // Bounds safety checks
  if (x < screenBounds.x) x = screenBounds.x;
  if (x + windowBounds.width > screenBounds.x + screenBounds.width) {
    x = screenBounds.x + screenBounds.width - windowBounds.width;
  }
  if (y + windowBounds.height > screenBounds.y + screenBounds.height) {
    y = Math.round(trayBounds.y - windowBounds.height);
  }

  mainWindow.setPosition(x, y, false);
}

function toggleDetachMode() {
  if (!mainWindow) return;

  isDetached = !isDetached;

  if (isDetached) {
    // Transform into standard desktop window
    if (app.dock) app.dock.show();
    
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSize(WINDOW_WIDTH, WINDOW_HEIGHT, true);
    mainWindow.center();
    
    mainWindow.webContents.send('mode-change', 'window');
  } else {
    // Restore back to tray popup window
    if (app.dock) app.dock.hide();
    
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setSize(TRAY_WIDTH, TRAY_HEIGHT, true);
    positionWindowAtTray();
    
    mainWindow.webContents.send('mode-change', 'tray');
  }
}

app.whenReady().then(() => {
  // Hide dock icon initially for menu bar mode
  if (app.dock) app.dock.hide();

  createWindow();
  createTray();

  // Auto-show window on startup near the tray so it doesn't launch silently
  mainWindow.once('ready-to-show', () => {
    console.log(`[PERF] Main process initialized and window ready-to-show in ${(performance.now() - startupStart).toFixed(2)}ms`);
    setTimeout(() => {
      if (mainWindow) {
        positionWindowAtTray();
        mainWindow.show();
        mainWindow.focus();
      }
    }, 500); // 500ms delay to ensure tray bounds are calculated correctly by OS
  });

  // IPC Event Handlers
  ipcMain.handle('get-matches', (event, dateStr) => {
    return getMatchesData(dateStr);
  });

  ipcMain.handle('get-perf-metrics', async () => {
    try {
      const mainMem = await process.getProcessMemoryInfo();
      let rendererMem = { private: 0 };
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          rendererMem = await mainWindow.webContents.getProcessMemoryInfo();
        } catch (e) {
          // ignore
        }
      }
      const cpu = process.getCPUUsage();
      return {
        success: true,
        mainMemMB: (mainMem.private / 1024).toFixed(1),
        rendererMemMB: (rendererMem.private / 1024).toFixed(1),
        cpuPercent: (cpu.percentCPUUsage).toFixed(1),
        uptimeSeconds: Math.floor(process.uptime())
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('toggle-detach', () => {
    toggleDetachMode();
  });

  ipcMain.on('close-app', () => {
    app.quit();
  });

  ipcMain.on('minimize-app', () => {
    mainWindow.minimize();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
