import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { importLibrary } from './services/importLibrary';
import { LibraryManager } from './database/libraries';
import { BankManager } from './database/banks';
import { PatchManager } from './database/patches';
import { PatchSequenceManager } from './database/patch-sequences';

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

// IPC handler for importing patches
ipcMain.handle('import-patches', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  console.log('Selected directory:', filePaths[0]);

  if (filePaths.length === 0) {
    return [];
  }

  let rootDir = filePaths[0];

  try {
    const result = await importLibrary(rootDir, libraryManager, bankManager, patchManager, patchSequenceManager);
    console.log('Import successful:', result);
  } catch (error) {
    console.error('Import failed:', error);
  }

  // If Library/ exists, use it as the root
  const libraryPath = path.join(rootDir, 'Library');
  if (fs.existsSync(libraryPath) && fs.statSync(libraryPath).isDirectory()) {
    rootDir = libraryPath;
    console.log('Using Library/ as root directory:', rootDir);
  }
  
  return patchManager.getAll();
});

// Add new IPC handler for loading banks
ipcMain.handle('load-banks', () => {
  return bankManager.getAll();
});

// Add new IPC handler for getting patches by bank
ipcMain.handle('get-patches-for-bank', (_, bankId: number) => {
  return bankManager.getPatches(bankId);
});

// IPC handler for loading saved patches
ipcMain.handle('load-patches', () => {
  return patchManager.getAll();
});

// IPC handler for loading libraries
ipcMain.handle('load-libraries', async () => {
  try {
    const libraries = await libraryManager.getAll();
    return libraries.map(library => library.name);
  } catch (error) {
    console.error('Error loading libraries:', error);
    throw error;
  }
});

// IPC handler for loading banks by library
ipcMain.handle('load-banks-by-library', async (event, libraryId: number) => {
  try {
    const banks = await bankManager.getBanksByLibrary(libraryId);
    return banks;
  } catch (error) {
    console.error('Error loading banks by library:', error);
    throw error;
  }
});

// IPC handler for updating patch metadata
// ipcMain.handle('update-patch', (_, path: string, updates: Partial<Patch>) => {
//   patchManager.updatePatchMetadata(path, updates);
//   return true;
// });

// Clean up database connection when app quits
app.on('before-quit', () => {
  patchManager.close();
  bankManager.close();
  libraryManager.close();
  patchSequenceManager.close();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here. 