import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { DataSource } from 'typeorm';
import { LibraryRepository } from './repositories/library.repository';
import { BankRepository } from './repositories/bank.repository';
import { PatchRepository } from './repositories/patch.repository';
import { PatchSequenceRepository } from './repositories/patch-sequence.repository';
import { importLibrary } from './services/importLibrary';
import { exportLibrary } from './services/exportLibrary';
import { Patch } from './entities/patch.entity';
import { AppDataSource } from './data-source';

// Initialize repositories
let libraryRepo: LibraryRepository;
let bankRepo: BankRepository;
let patchRepo: PatchRepository;
let patchSequenceRepo: PatchSequenceRepository;

// Function to initialize the database
const initializeDatabase = async () => {
  try {
    // Initialize TypeORM DataSource
    await AppDataSource.initialize();
    console.log('Database initialized successfully.');

    // Initialize repositories
    libraryRepo = new LibraryRepository(AppDataSource);
    bankRepo = new BankRepository(AppDataSource);
    patchRepo = new PatchRepository(AppDataSource);
    patchSequenceRepo = new PatchSequenceRepository(AppDataSource);
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
ipcMain.handle('export-library', async (_, libraryId: number) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (filePaths.length === 0) {
    return;
  }

  const exportDir = filePaths[0];
  console.log('Selected export directory:', exportDir);

  await exportLibrary(
    libraryId,
    exportDir,
    AppDataSource
  );
});

ipcMain.handle('import-library', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (filePaths.length === 0) {
    return;
  }

  const rootDir = filePaths[0];
  console.log('Selected directory:', rootDir);

  await importLibrary(rootDir, AppDataSource);
});

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

  return importLibrary(rootDir, AppDataSource);
});

ipcMain.handle('update-patch', async (_, patchId: string, updates: Partial<Patch>) => {
  const id = parseInt(patchId);
  if (updates.favorited !== undefined) {
    await patchRepo.update(id, { favorited: updates.favorited });
  }
  if (updates.tags) {
    await patchRepo.update(id, { tags: updates.tags });
  }
  return true;
});

ipcMain.handle('load-libraries', async () => {
  return await libraryRepo.findAll();
});

ipcMain.handle('load-banks-by-library', async (_, libraryId: number) => {
  return await bankRepo.findByLibraryId(libraryId);
});

ipcMain.handle('get-patches-by-library', async (_, libraryId: number) => {
  const banks = await bankRepo.findByLibraryId(libraryId);
  const patches = [];
  for (const bank of banks) {
    const bankPatches = await patchRepo.findByBankId(bank.id);
    patches.push(...bankPatches);
  }
  return patches;
});

// Add new IPC handler for loading banks
ipcMain.handle('load-banks', async () => {
  return await bankRepo.findAll();
});

// Add new IPC handler for getting patches by bank
ipcMain.handle('get-patches-for-bank', async (_, bankId: number) => {
  return await patchRepo.findByBankId(bankId);
});

// Clean up database connection when app quits
app.on('before-quit', async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here. 