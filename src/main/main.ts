import 'reflect-metadata';
import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { Repository } from 'typeorm';
import { importLibrary } from './services/importLibrary';
import { exportLibrary } from './services/exportLibrary';
import { Library } from './entities/library.entity';
import { Patch } from './entities/patch.entity';
import { Bank } from './entities/bank.entity';
import { PatchSequence } from './entities/patch-sequence.entity';
import { AppDataSource } from './data-source';
import { LibraryValidator } from './services/validateLibrary';

// Initialize repositories
let libraryRepo: Repository<Library>;
let bankRepo: Repository<Bank>;
let patchRepo: Repository<Patch>;
let patchSequenceRepo: Repository<PatchSequence>;

// Function to initialize the database
const initializeDatabase = async (): Promise<void> => {
  try {
    // Initialize TypeORM DataSource
    await AppDataSource.initialize();
    console.log('Database initialized successfully.');

    // Initialize repositories
    libraryRepo = AppDataSource.getRepository(Library);
    bankRepo = AppDataSource.getRepository(Bank);
    patchRepo = AppDataSource.getRepository(Patch);
    patchSequenceRepo = AppDataSource.getRepository(PatchSequence);
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

  // Create the application menu
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Library',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Library Directory'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('import-library', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Export Library',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Export Directory'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('export-library', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Validate Library',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Library Directory to Validate'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const validator = new LibraryValidator();
              const validationResult = validator.validateLibrary(result.filePaths[0]);
              
              // Format the validation results
              const message = validationResult.isValid 
                ? 'Library validation passed successfully!'
                : 'Library validation failed.';
              
              const detail = [
                `Banks found: ${validationResult.details.bankCount}`,
                `Patches found: ${validationResult.details.patchCount}`,
                `Sequences found: ${validationResult.details.sequenceCount}`,
                '',
                'Errors:',
                ...validationResult.errors.map((error: string) => `• ${error}`),
                '',
                'Warnings:',
                ...validationResult.warnings.map((warning: string) => `• ${warning}`),
                '',
                'Missing Items:',
                ...validationResult.details.missingBanks.map((bank: string) => `• ${bank}`),
                ...validationResult.details.missingPatches.map((patch: string) => `• ${patch}`),
                ...validationResult.details.missingSequences.map((seq: string) => `• ${seq}`)
              ].join('\n');

              await dialog.showMessageBox(mainWindow, {
                type: validationResult.isValid ? 'info' : 'warning',
                title: 'Library Validation Results',
                message,
                detail,
                buttons: ['OK'],
                defaultId: 0
              });
            }
          }
        },
        {
          label: 'Delete Selected Library',
          click: async () => {
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: 'Delete Library',
              message: 'Are you sure you want to delete the selected library?',
              detail: 'This action cannot be undone.',
              buttons: ['Cancel', 'Delete'],
              defaultId: 0,
              cancelId: 0
            });
            
            if (result.response === 1) { // User clicked Delete
              mainWindow.webContents.send('delete-library');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: async () => {
            await dialog.showMessageBox(mainWindow, {
              title: 'About Moog Muse Manager',
              message: 'Moog Muse Manager',
              detail: 'Version 1.0.0\nA tool for managing Moog Muse libraries and patches.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

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
ipcMain.handle('export-library', async (_: unknown, libraryId: number): Promise<void> => {
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

ipcMain.handle('import-library', async (): Promise<void> => {
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

ipcMain.handle('update-patch', async (_: unknown, patchId: string, updates: Partial<Patch>): Promise<boolean> => {
  const id = parseInt(patchId);
  if (updates.favorited !== undefined) {
    await patchRepo.update(id, { favorited: updates.favorited });
  }
  if (updates.tags) {
    await patchRepo.update(id, { tags: updates.tags });
  }
  return true;
});

ipcMain.handle('load-libraries', async (): Promise<Library[]> => {
  return await libraryRepo.find();
});

ipcMain.handle('load-banks-by-library', async (_: unknown, libraryId: number): Promise<Bank[]> => {
  return await bankRepo.find({ where: { type: 'patch', library: { id: libraryId } } });
});

// Add new IPC handler for getting patches by bank
ipcMain.handle('get-patches-for-bank', async (_: unknown, libraryId: number, bankId: number): Promise<Patch[]> => {
  // Verify the bank belongs to the specified library
  const bank = await bankRepo.findOne({
    where: { 
      id: bankId,
      library: { id: libraryId }
    }
  });

  if (!bank) {
    throw new Error('Bank not found in the specified library');
  }

  // Get all patches for the specified bank
  return await patchRepo.find({
    where: { bank: { id: bankId } },
    order: { patch_number: 'ASC' }
  });
});

// Add new IPC handler for deleting a library
ipcMain.handle('delete-library', async (_: unknown, libraryId: number): Promise<boolean> => {
  try {
    // First delete all related patches and sequences
    const banks = await bankRepo.find({ where: { library: { id: libraryId } } });
    for (const bank of banks) {
      await patchRepo.delete({ bank: { id: bank.id } });
      await patchSequenceRepo.delete({ bank: { id: bank.id } });
    }
    
    // Then delete all banks
    await bankRepo.delete({ library: { id: libraryId } });
    
    // Finally delete the library
    await libraryRepo.delete(libraryId);
    
    return true;
  } catch (error) {
    console.error('Error deleting library:', error);
    return false;
  }
});

// Clean up database connection when app quits
app.on('before-quit', async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here. 