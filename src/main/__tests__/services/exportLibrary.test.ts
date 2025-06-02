import { ExportLibraryService } from '../../services/exportLibrary';
import { importLibrary } from '../../services/importLibrary';
import { LibraryManager } from '../../database/libraries';
import { BankManager } from '../../database/banks';
import { PatchManager } from '../../database/patches';
import { PatchSequenceManager } from '../../database/patch-sequences';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('ExportLibraryService Integration', () => {
  const testDbPath = path.join('/tmp/test-app-data', 'export-library-test.db');
  const exportDir = path.join(process.cwd(), 'export-test');
  const importDir = path.join(process.cwd(), 'MUSE-LIB-CUSTOM-001');
  
  let exportService: ExportLibraryService;
  let libraryManager: LibraryManager;
  let bankManager: BankManager;
  let patchManager: PatchManager;
  let sequenceManager: PatchSequenceManager;
  let libraryId: number;

  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });
    await fs.mkdir(exportDir, { recursive: true });

    // Initialize managers
    libraryManager = new LibraryManager(testDbPath);
    bankManager = new BankManager(testDbPath);
    patchManager = new PatchManager(testDbPath);
    sequenceManager = new PatchSequenceManager(testDbPath);
    exportService = new ExportLibraryService(testDbPath, exportDir);

    // Initialize database
    await libraryManager.initialize();
    await bankManager.initialize();
    await patchManager.initialize();
    await sequenceManager.initialize();

    // Import initial library
    const result = await importLibrary(importDir, libraryManager, bankManager, patchManager, sequenceManager);
    if (!result.success) {
      throw new Error(`Failed to import library: ${result.message}`);
    }
    libraryId = result.libraryId;
  });

  afterAll(async () => {
    // Clean up test data
    await fs.rm(path.dirname(testDbPath), { recursive: true, force: true });
  });

  it('should export library structure correctly', async () => {
    // Export the library
    await exportService.exportLibrary(libraryId);

    // Verify root directory structure
    const rootDir = path.join(exportDir, 'MUSE-LIB-CUSTOM-001');
    const libraryDir = path.join(rootDir, 'library');
    const sequencesDir = path.join(libraryDir, 'sequences');

    // Verify library directory exists
    await expect(fs.access(libraryDir)).resolves.not.toThrow();

    // Verify sequences directory exists
    await expect(fs.access(sequencesDir)).resolves.not.toThrow();

    // Verify all 16 bank directories exist
    for (let i = 1; i <= 16; i++) {
      const bankDir = path.join(libraryDir, `bank${i.toString().padStart(2, '0')}`);
      await expect(fs.access(bankDir)).resolves.not.toThrow();

      // Verify bank file exists if bank exists
      const bankFiles = await fs.readdir(bankDir);
      if (bankFiles.length > 0) {
        const bankFile = bankFiles.find(file => file.endsWith('.bank'));
        expect(bankFile).toBeDefined();
      }

      // Verify all 16 patch directories exist
      for (let j = 1; j <= 16; j++) {
        const patchDir = path.join(bankDir, `patch${j.toString().padStart(2, '0')}`);
        await expect(fs.access(patchDir)).resolves.not.toThrow();

        // Verify patch file exists if patch exists
        const patchFiles = await fs.readdir(patchDir);
        if (patchFiles.length > 0) {
          const patchFile = patchFiles.find(file => file.endsWith('.mmp'));
          expect(patchFile).toBeDefined();
        }
      }

      // Verify corresponding sequence bank directory exists
      const seqBankDir = path.join(sequencesDir, `bank${i.toString().padStart(2, '0')}`);
      await expect(fs.access(seqBankDir)).resolves.not.toThrow();

      // Verify all 16 sequence directories exist
      for (let j = 1; j <= 16; j++) {
        const seqDir = path.join(seqBankDir, `seq${j.toString().padStart(2, '0')}`);
        await expect(fs.access(seqDir)).resolves.not.toThrow();

        // Verify sequence file exists if sequence exists
        const seqFiles = await fs.readdir(seqDir);
        if (seqFiles.length > 0) {
          const seqFile = seqFiles.find(file => file.endsWith('.mmseq'));
          expect(seqFile).toBeDefined();
        }
      }
    }
  });
}); 