import { contextBridge, ipcRenderer } from 'electron';
import { Patch } from '../main/entities/patch.entity';
import { Library } from '../main/entities/library.entity';
import { Bank } from '../main/entities/bank.entity';

// Define the type for the window object with our electron API
declare global {
  interface Window {
    electronAPI: {
      updatePatch: (path: string, updates: Partial<Patch>) => Promise<boolean>;
      loadLibraries: () => Promise<Library[]>;
      loadBanksByLibrary: (library: number) => Promise<Bank[]>;
      getPatchesByBank: (libraryId: number, bankId: number) => Promise<Patch[]>;
      importLibrary: () => Promise<void>;
      exportLibrary: (libraryId: number) => Promise<void>;
      deleteLibrary: (libraryId: number) => Promise<boolean>;
      onImportLibrary: (callback: (path: string) => void) => void;
      onExportLibrary: (callback: (path: string) => void) => void;
      onDeleteLibrary: (callback: () => void) => void;
    }
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    updatePatch: (path: string, updates: Partial<Patch>) => ipcRenderer.invoke('update-patch', path, updates),
    loadLibraries: () => ipcRenderer.invoke('load-libraries'),
    loadBanksByLibrary: (library: number) => ipcRenderer.invoke('load-banks-by-library', library),
    getPatchesByBank: (libraryId: number, bankId: number) => ipcRenderer.invoke('get-patches-for-bank', libraryId, bankId),
    importLibrary: () => ipcRenderer.invoke('import-library'),
    exportLibrary: (libraryId: number) => ipcRenderer.invoke('export-library', libraryId),
    deleteLibrary: (libraryId: number) => ipcRenderer.invoke('delete-library', libraryId),
    onImportLibrary: (callback: (path: string) => void) => {
      ipcRenderer.on('import-library', (_event, path) => callback(path));
    },
    onExportLibrary: (callback: (path: string) => void) => {
      ipcRenderer.on('export-library', (_event, path) => callback(path));
    },
    onDeleteLibrary: (callback: () => void) => {
      ipcRenderer.on('delete-library', () => callback());
    }
  }
); 