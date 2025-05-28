import React, { useState, useEffect, useRef } from 'react';
import { Patch, Library } from '../main/database/types';
import { Accordion, AccordionItemWrapper } from './components/Accordion';

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
  const [openBankIndex, setOpenBankIndex] = useState<number | null>(null);

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

  const handlePatchEdit = async (patchId: string, field: keyof Patch, value: any) => {
    try {
      const success = await window.electronAPI.updatePatch(patchId, { [field]: value });
      if (success) {
        setPatches(patches.map(patch => 
          patch.id.toString() === patchId 
            ? { ...patch, [field]: value }
            : patch
        ));
      }
    } catch (error) {
      console.error('Error updating patch:', error);
    }
  };

  const handleLibraryChange = async (libraryId: string) => {
    setSelectedLibrary(libraryId);
    if (libraryId === 'all') {
      const allPatches = await window.electronAPI.loadPatches();
      setPatches(allPatches);
    } else {
      const libraryPatches = await window.electronAPI.getPatchesByLibrary(parseInt(libraryId));
      setPatches(libraryPatches);
    }
  };

  // Group patches by bank
  const patchesByBank = patches.reduce((acc, patch) => {
    const bank = patch.bank || 'Uncategorized';
    if (!acc[bank]) {
      acc[bank] = [];
    }
    acc[bank].push(patch);
    return acc;
  }, {} as Record<string, Patch[]>);

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
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <select
            value={selectedLibrary}
            onChange={(e) => handleLibraryChange(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
          >
            <option value="all">All Libraries</option>
            {libraries.map((library) => (
              <option key={library.id} value={library.id}>
                {library.name}
              </option>
            ))}
          </select>
        </div>

        {selectedLibrary !== 'all' && (
          <div className="space-y-4">
            {Object.entries(patchesByBank).map(([bank, bankPatches], index) => (
              <div key={bank} className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  className="w-full px-4 py-3 text-left bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    const newOpenIndex = openBankIndex === index ? -1 : index;
                    setOpenBankIndex(newOpenIndex);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-200">
                      {bank} ({bankPatches.length} patches)
                    </span>
                    <svg
                      className={`w-5 h-5 transform transition-transform ${
                        openBankIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openBankIndex === index ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-4 bg-gray-900">
                    <div className="space-y-2">
                      {bankPatches.map((patch) => (
                        <div
                          key={patch.id}
                          className="p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{patch.name}</h3>
                              <p className="text-sm text-gray-400">{patch.path}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={patch.favorited}
                                  onChange={() =>
                                    handlePatchEdit(patch.id.toString(), 'favorited', !patch.favorited)
                                  }
                                  className="form-checkbox h-4 w-4 text-blue-500"
                                />
                                <span className="text-sm">Favorite</span>
                              </label>
                            </div>
                          </div>
                          {patch.tags && patch.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {patch.tags.map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedLibrary === 'all' && (
          <div className="space-y-2">
            {patches.map((patch) => (
              <div
                key={patch.id}
                className="p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{patch.name}</h3>
                    <p className="text-sm text-gray-400">{patch.path}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={patch.favorited}
                        onChange={() =>
                          handlePatchEdit(patch.id.toString(), 'favorited', !patch.favorited)
                        }
                        className="form-checkbox h-4 w-4 text-blue-500"
                      />
                      <span className="text-sm">Favorite</span>
                    </label>
                  </div>
                </div>
                {patch.tags && patch.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {patch.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App; 