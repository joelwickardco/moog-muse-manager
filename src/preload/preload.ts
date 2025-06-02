import { contextBridge, ipcRenderer } from 'electron';
import { Patch, Library } from '../main/database/types';

// Define the type for the window object with our electron API
declare global {
  interface Window {
    electronAPI: {
      importPatches: () => Promise<{ path: string; bank: string; library: string }[]>;
      exportPatches: (patches: string[]) => Promise<boolean>;
      loadPatches: () => Promise<Patch[]>;
      updatePatch: (path: string, updates: Partial<Patch>) => Promise<boolean>;
      loadLibraries: () => Promise<Library[]>;
      loadBanksByLibrary: (library: number) => Promise<{ name: string }[]>;
      getPatchesByLibrary: (libraryId: number) => Promise<Patch[]>;
      importLibrary: () => Promise<void>;
      exportLibrary: (libraryId: number) => Promise<void>;
    }
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    importPatches: () => ipcRenderer.invoke('import-patches'),
    exportPatches: (patches: string[]) => ipcRenderer.invoke('export-patches', patches),
    loadPatches: () => ipcRenderer.invoke('load-patches'),
    updatePatch: (path: string, updates: Partial<Patch>) => ipcRenderer.invoke('update-patch', path, updates),
    loadLibraries: () => ipcRenderer.invoke('load-libraries'),
    loadBanksByLibrary: (library: number) => ipcRenderer.invoke('load-banks-by-library', library),
    getPatchesByLibrary: (libraryId: number) => ipcRenderer.invoke('get-patches-by-library', libraryId),
    importLibrary: () => ipcRenderer.invoke('import-library'),
    exportLibrary: (libraryId: number) => ipcRenderer.invoke('export-library', libraryId),
  }
); 