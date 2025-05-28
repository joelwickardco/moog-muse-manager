import { contextBridge, ipcRenderer } from 'electron';

interface Patch {
  name: string;
  favorited: boolean;
  tags: string[];
  bank: string;
  library: string;
}

// Define the type for the window object with our electron API
declare global {
  interface Window {
    electronAPI: {
      importPatches: () => Promise<{ path: string; bank: string; library: string }[]>;
      loadPatches: () => Promise<Patch[]>;
      updatePatch: (path: string, updates: Partial<Patch>) => Promise<boolean>;
      loadLibraries: () => Promise<string[]>;
    }
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    importPatches: () => ipcRenderer.invoke('import-patches'),
    loadPatches: () => ipcRenderer.invoke('load-patches'),
    updatePatch: (path: string, updates: Partial<Patch>) => ipcRenderer.invoke('update-patch', path, updates),
    loadLibraries: () => ipcRenderer.invoke('load-libraries'),
  }
); 