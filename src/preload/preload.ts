import { contextBridge, ipcRenderer } from 'electron';

interface Patch {
  path: string;
  name: string;
  loved: boolean;
  tags: string[];
  bank: string;
  library: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  importPatches: () => ipcRenderer.invoke('import-patches') as Promise<Patch[]>,
  exportPatches: (patches: string[]) => ipcRenderer.invoke('export-patches', patches),
  loadPatches: () => ipcRenderer.invoke('load-patches') as Promise<Patch[]>,
  updatePatch: (path: string, updates: Partial<Patch>) => ipcRenderer.invoke('update-patch', path, updates)
}); 