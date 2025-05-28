import React, { useState, useEffect } from 'react';
import { Patch } from '../main/database/types';

// Define the type for the window object with our electron API
declare global {
  interface Window {
    electronAPI: {
      importPatches: () => Promise<{ path: string; bank: string; library: string }[]>;
      exportPatches: (patches: string[]) => Promise<boolean>;
      loadPatches: () => Promise<Patch[]>;
      updatePatch: (path: string, updates: Partial<Patch>) => Promise<boolean>;
      loadLibraries: () => Promise<string[]>;
      loadBanksByLibrary: (library: number) => Promise<{ name: string }[]>;
    }
  }
}

const App: React.FC = () => {
  const [patches, setPatches] = useState<Patch[]>([]);
  const [filter, setFilter] = useState({ 
    loved: false, 
    tag: '',
    bank: '',
    library: '',
    custom: false
  });
  const [libraries, setLibraries] = useState<string[]>([]);
  const [uniqueBanks, setUniqueBanks] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Load saved patches when component mounts
  useEffect(() => {
    const loadSavedPatches = async () => {
      try {
        const savedPatches = await window.electronAPI.loadPatches();
        console.log('Loaded patches from database:', savedPatches);
        console.log('Patches with custom flag:', savedPatches.filter(p => p.custom).length);
        setPatches(savedPatches);
      } catch (error) {
        console.error('Error loading saved patches:', error);
      }
    };

    loadSavedPatches();
  }, []);

  // Load libraries when component mounts
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const loadedLibraries = await window.electronAPI.loadLibraries();
        setLibraries(loadedLibraries);
      } catch (error) {
        console.error('Error loading libraries:', error);
      }
    };

    loadLibraries();
  }, []);

  const handleImport = async (): Promise<void> => {
    try {
      const importedPatches = await window.electronAPI.importPatches();
      setPatches(importedPatches as Patch[]);
    } catch (error) {
      console.error('Error importing patches:', error);
    }
  };

  const handlePatchEdit = async (index: number, key: string, value: boolean | string | string[]) => {
    const updatedPatches = [...patches];
    const patch = updatedPatches[index];
    const updates = { [key]: value };
    
    // Update local state
    updatedPatches[index] = { ...patch, ...updates };
    setPatches(updatedPatches);

    // Persist changes to database
    try {
      await window.electronAPI.updatePatch(patch.path, updates);
    } catch (error) {
      console.error('Error updating patch:', error);
    }
  };

  // Get unique banks and libraries for filter dropdowns
  const uniqueLibraries = libraries.sort();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Moog Muse Manager
          </h1>
          <div className="relative">
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleImport}
                >
                  Import Library
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Imported Patches</h2>
            <ul className="mt-2 space-y-2">
              {patches.map((patch, index) => (
                <li key={index} className="bg-white p-4 rounded shadow">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={patch.loved}
                      onChange={(e) => handlePatchEdit(index, 'loved', e.target.checked)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="font-medium text-gray-900 min-w-[200px]">{patch.name}</span>
                    <span className="text-gray-500 min-w-[100px]">Bank: {patch.bank}</span>
                    <span className="text-gray-500 min-w-[100px]">Library: {patch.library}</span>
                    {patch.custom && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                    <input
                      type="text"
                      placeholder="Add tags"
                      value={patch.tags.join(', ')}
                      onChange={(e) => handlePatchEdit(index, 'tags', e.target.value.split(',').map(tag => tag.trim()))}
                      className="border rounded px-2 py-1 flex-grow"
                    />
                    <span className="text-gray-500 text-xs font-mono">{patch.checksum}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App; 