import React, { useState, useEffect, useRef } from 'react';
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
    }
  }
}

const App: React.FC = () => {
  const [patches, setPatches] = useState<Patch[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('all');
  const menuRef = useRef<HTMLDivElement>(null);

  // Only load libraries on mount
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
      await window.electronAPI.importPatches();
      const loadedPatches = await window.electronAPI.loadPatches();
      setPatches(loadedPatches);
      setMenuOpen(false);
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
      await window.electronAPI.updatePatch(patch.id.toString(), updates);
    } catch (error) {
      console.error('Error updating patch:', error);
    }
  };

  const handleLibraryChange = async (libraryId: string) => {
    setSelectedLibrary(libraryId);
    try {
      if (libraryId === 'all') {
        const allPatches = await window.electronAPI.loadPatches();
        setPatches(allPatches);
      } else {
        const libraryPatches = await window.electronAPI.getPatchesByLibrary(parseInt(libraryId));
        setPatches(libraryPatches);
      }
    } catch (error) {
      console.error('Error loading patches:', error);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Moog Muse Manager
          </h1>
          <div className="relative" ref={menuRef}>
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
            <div className="mb-4">
              <label htmlFor="library-filter" className="block text-sm font-medium text-gray-700">
                Filter by Library
              </label>
              <select
                id="library-filter"
                value={selectedLibrary}
                onChange={(e) => handleLibraryChange(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Libraries</option>
                {libraries.map((library) => (
                  <option key={library.id} value={library.id.toString()}>
                    {library.name}
                  </option>
                ))}
              </select>
            </div>
            <ul className="mt-2 space-y-2">
              {patches.map((patch, index) => (
                <li key={index} className="bg-white p-4 rounded shadow">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={Boolean(patch.favorited)}
                      onChange={(e) => handlePatchEdit(index, 'favorited', e.target.checked)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="font-medium text-gray-900 min-w-[200px]">{patch.name}</span>
                    <input
                      type="text"
                      placeholder="Add tags"
                      value={Array.isArray(patch.tags) ? patch.tags.join(', ') : ''}
                      onChange={(e) => handlePatchEdit(index, 'tags', e.target.value.split(',').map(tag => tag.trim()))}
                      className="border rounded px-2 py-1 flex-grow"
                    />
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