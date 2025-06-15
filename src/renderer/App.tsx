import React, { useState, useEffect } from 'react';
import { Patch } from '../main/entities/patch.entity';
import { Library } from '../main/entities/library.entity';
import { Bank } from '../main/entities/bank.entity';
import { PatchGrid } from './components/PatchGrid';
import { CopyToDrawer } from './components/CopyToDrawer';

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

const App: React.FC = () => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [selectedPatches, setSelectedPatches] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopyDrawerOpen, setIsCopyDrawerOpen] = useState(false);

  // Load libraries on mount
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const loadedLibraries = await window.electronAPI.loadLibraries();
        setLibraries(loadedLibraries);
        if (loadedLibraries.length > 0) {
          setSelectedLibrary(loadedLibraries[0]);
        }
      } catch (error) {
        console.error('Error loading libraries:', error);
        setError('Failed to load libraries');
      }
    };
    loadLibraries();
  }, []);

  // Load banks when library changes
  useEffect(() => {
    const loadBanks = async () => {
      if (selectedLibrary) {
        try {
          setIsLoading(true);
          const libraryBanks = await window.electronAPI.loadBanksByLibrary(selectedLibrary.id);
          setBanks(libraryBanks);
          if (libraryBanks.length > 0) {
            setSelectedBank(libraryBanks[0]);
          } else {
            setSelectedBank(null);
          }
        } catch (error) {
          console.error('Error loading banks:', error);
          setError('Failed to load banks');
        } finally {
          setIsLoading(false);
        }
      } else {
        setBanks([]);
        setSelectedBank(null);
      }
    };
    loadBanks();
  }, [selectedLibrary]);

  // Load patches when bank changes
  useEffect(() => {
    const loadPatches = async () => {
      if (selectedLibrary && selectedBank) {
        try {
          setIsLoading(true);
          const bankPatches = await window.electronAPI.getPatchesByBank(selectedLibrary.id, selectedBank.id);
          setPatches(bankPatches);
          setSelectedPatches(new Set()); // Clear selection when bank changes
        } catch (error) {
          console.error('Error loading patches:', error);
          setError('Failed to load patches');
        } finally {
          setIsLoading(false);
        }
      } else {
        setPatches([]);
        setSelectedPatches(new Set());
      }
    };
    loadPatches();
  }, [selectedLibrary, selectedBank]);

  // Listen for import-library event from the main process
  useEffect(() => {
    window.electronAPI.onImportLibrary(async (dirPath: string) => {
      await window.electronAPI.importLibrary();
      // Reload libraries after import
      const loadedLibraries = await window.electronAPI.loadLibraries();
      setLibraries(loadedLibraries);
      if (loadedLibraries.length > 0) {
        setSelectedLibrary(loadedLibraries[0]);
      }
    });
  }, []);

  const handleLibraryChange = (libraryId: string) => {
    const library = libraries.find(l => l.id.toString() === libraryId);
    setSelectedLibrary(library || null);
  };

  const handleBankChange = (bankId: string) => {
    const bank = banks.find(b => b.id.toString() === bankId);
    setSelectedBank(bank || null);
  };

  const handlePatchSelect = (patchId: string) => {
    setSelectedPatches(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(patchId)) {
        newSelection.delete(patchId);
      } else {
        newSelection.add(patchId);
      }
      return newSelection;
    });
  };

  const handlePatchToggleFavorite = async (patchId: string) => {
    const patch = patches.find(p => p.id.toString() === patchId);
    if (patch) {
      try {
        await window.electronAPI.updatePatch(patchId, { favorited: !patch.favorited });
        setPatches(patches.map(p => {
          if (p.id.toString() === patchId) {
            const updatedPatch = new Patch();
            Object.assign(updatedPatch, p, { favorited: !p.favorited });
            return updatedPatch;
          }
          return p;
        }));
      } catch (error) {
        console.error('Error updating patch:', error);
      }
    }
  };

  const handlePatchTagRemove = async (patchId: string, tagToRemove: string) => {
    const patch = patches.find(p => p.id.toString() === patchId);
    if (patch) {
      const currentTags = JSON.parse(patch.tags || '[]');
      const updatedTags = currentTags.filter((tag: string) => tag !== tagToRemove);
      try {
        await window.electronAPI.updatePatch(patchId, { tags: JSON.stringify(updatedTags) });
        setPatches(patches.map(p => {
          if (p.id.toString() === patchId) {
            const updatedPatch = new Patch();
            Object.assign(updatedPatch, p, { tags: JSON.stringify(updatedTags) });
            return updatedPatch;
          }
          return p;
        }));
      } catch (error) {
        console.error('Error updating patch:', error);
      }
    }
  };

  const handlePatchTagAdd = async (patchId: string, newTag: string) => {
    const patch = patches.find(p => p.id.toString() === patchId);
    if (patch) {
      const currentTags = JSON.parse(patch.tags || '[]');
      if (!currentTags.includes(newTag)) {
        const updatedTags = [...currentTags, newTag];
        try {
          await window.electronAPI.updatePatch(patchId, { tags: JSON.stringify(updatedTags) });
          setPatches(patches.map(p => {
            if (p.id.toString() === patchId) {
              const updatedPatch = new Patch();
              Object.assign(updatedPatch, p, { tags: JSON.stringify(updatedTags) });
              return updatedPatch;
            }
            return p;
          }));
        } catch (error) {
          console.error('Error updating patch:', error);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Moog Muse Manager</h1>
          <div className="flex gap-4">
            <select
              value={selectedLibrary?.id.toString() || ''}
              onChange={(e) => handleLibraryChange(e.target.value)}
              className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              {libraries.map((library) => (
                <option key={library.id} value={library.id.toString()}>
                  {library.name}
                </option>
              ))}
            </select>
            <select
              value={selectedBank?.id.toString() || ''}
              onChange={(e) => handleBankChange(e.target.value)}
              className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id.toString()}>
                  Bank {bank.id}: {bank.name}
                </option>
              ))}
            </select>
            {selectedPatches.size > 0 && (
              <button
                onClick={() => setIsCopyDrawerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
              >
                Copy {selectedPatches.size} Patches
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <span className="text-gray-500">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        ) : (
          <PatchGrid
            patches={patches.map(patch => ({
              id: patch.id.toString(),
              name: patch.name,
              tags: JSON.parse(patch.tags || '[]'),
              favorited: patch.favorited,
              selected: selectedPatches.has(patch.id.toString())
            }))}
            onToggleFavorite={handlePatchToggleFavorite}
            onSelect={handlePatchSelect}
            onTagRemove={handlePatchTagRemove}
            onTagAdd={handlePatchTagAdd}
          />
        )}

        <CopyToDrawer
          isOpen={isCopyDrawerOpen}
          onClose={() => setIsCopyDrawerOpen(false)}
          libraries={libraries.map(l => l.name)}
          selectedLibrary={selectedLibrary?.name || ''}
          selectedBank={selectedBank?.name || ''}
          slots={Array.from({ length: 16 }, (_, i) => ({
            index: i,
            occupied: false, // TODO: Implement slot occupation check
            selected: false
          }))}
          onLibraryChange={(value) => {
            const library = libraries.find(l => l.name === value);
            if (library) setSelectedLibrary(library);
          }}
          onBankChange={(value) => {
            const bank = banks.find(b => b.name === value);
            if (bank) setSelectedBank(bank);
          }}
          onSlotToggle={(_index) => {
            // TODO: Implement slot selection logic
          }}
          onConfirm={() => {
            // TODO: Implement copy confirmation logic
            setIsCopyDrawerOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default App; 