import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { LibraryManager } from './database/libraries';
import { BankManager } from './database/banks';
import { PatchManager } from './database/patches';
import { PatchSequenceManager } from './database/patch-sequences';
import { importLibrary } from './services/importLibrary';
import { Patch } from './database/types';

const appDbPath = path.join(app.getPath('userData'), 'app.db');
const libraryManager = new LibraryManager(appDbPath);
const bankManager = new BankManager(appDbPath);
const patchManager = new PatchManager(appDbPath);
const patchSequenceManager = new PatchSequenceManager(appDbPath);

// Function to initialize the database
const initializeDatabase = async () => {
  try {
    // Initialize each manager
    await libraryManager.initialize();
    await bankManager.initialize();
    await patchManager.initialize();
    await patchSequenceManager.initialize();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    app.quit(); // Quit the app if initialization fails
  }
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

// This method will be called when Electron has finished initialization
// and is ready to create browser windows.
app.on('ready', async () => {
  await initializeDatabase(); // Initialize the database before creating the window
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Register IPC handlers
ipcMain.handle('import-patches', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (filePaths.length === 0) {
    return [];
  }

  let rootDir = filePaths[0];
  console.log('Selected directory:', rootDir);

  // Check if the selected directory is a library directory
  const libraryPath = path.join(rootDir, 'Library');
  if (fs.existsSync(libraryPath) && fs.statSync(libraryPath).isDirectory()) {
    rootDir = libraryPath;
  }

  return importLibrary(rootDir, libraryManager, bankManager, patchManager, patchSequenceManager);
});

ipcMain.handle('load-patches', async () => {
  return await patchManager.getAll();
});

ipcMain.handle('update-patch', async (_, patchId: string, updates: Partial<Patch>) => {
  const id = parseInt(patchId);
  if (updates.favorited !== undefined) {
    await patchManager.updateFavorite(id, updates.favorited);
  }
  if (updates.tags) {
    await patchManager.updateTags(id, updates.tags);
  }
  return true;
});

ipcMain.handle('load-libraries', async () => {
  return await libraryManager.getAll();
});

ipcMain.handle('load-banks-by-library', async (_, libraryId: number) => {
  return await bankManager.getBanksByLibrary(libraryId);
});

ipcMain.handle('get-patches-by-library', async (_, libraryId: number) => {
  return await patchManager.getPatchesByLibrary(libraryId);
});

// Add new IPC handler for loading banks
ipcMain.handle('load-banks', () => {
  return bankManager.getAll();
});

// Add new IPC handler for getting patches by bank
ipcMain.handle('get-patches-for-bank', (_, bankId: number) => {
  return bankManager.getPatches(bankId);
});

// Clean up database connection when app quits
app.on('before-quit', () => {
  patchManager.close();
  bankManager.close();
  libraryManager.close();
  patchSequenceManager.close();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here. 