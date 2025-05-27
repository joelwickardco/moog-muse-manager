import { PatchManager } from '../../database/patches';
import { LibraryManager } from '../../database/libraries';
import { BankManager } from '../../database/banks';
import { DatabaseError } from '../../database/errors';
import * as path from 'path';
import * as fs from 'fs/promises';

declare global {
  namespace NodeJS {
    interface Global {
      testPatchId: number | undefined;
    }
  }
}

global.testPatchId = undefined;

// Add custom matcher for error types
expect.extend({
  toThrowErrorWithMessage(received, expectedErrorType, expectedMessage) {
    const isCorrectType = received instanceof expectedErrorType;
    const hasCorrectMessage = received.message === expectedMessage;
    
    if (isCorrectType && hasCorrectMessage) {
      return {
        pass: true,
        message: () => `Expected ${received.constructor.name} with message "${received.message}"`
      };
    }

    return {
      pass: false,
      message: () => `Expected ${received.constructor.name} with message "${received.message}" to be ${expectedErrorType.name} with message "${expectedMessage}"`
    };
  }
});

const patchContent = JSON.stringify({
  'parameters': {
    'oscillator1': {
      'waveform': 'sine',
      'frequency': 440
    },
    'filter1': {
      'type': 'lowpass',
      'cutoff': 1000
    }
  }
});

describe('PatchManager', () => {
  let patchManager: PatchManager;
  let libraryManager: LibraryManager;
  let bankManager: BankManager;
  const testDbPath = path.join('/tmp/test-app-data', 'patches.db');
  let bankId: number;

  beforeEach(async (): Promise<void> => {
    // Create test directory if it doesn't exist
    const testDir = path.dirname(testDbPath);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create the database managers
    libraryManager = new LibraryManager(testDbPath);
    bankManager = new BankManager(testDbPath);
    patchManager = new PatchManager(testDbPath);
    
    // Initialize the database
    await patchManager.initialize();
    await bankManager.initialize();
    await libraryManager.initialize();

    // Create a test library
    const libraryId = await libraryManager.create('Test Library', 'test-library-fingerprint');
    
    // Create a test bank in the library
    bankId = await bankManager.create(libraryId, 'Test Bank', 'Test Bank', 'test-bank-fingerprint');
    
    // Create a test patch
    global.testPatchId = await patchManager.create(
      bankId,
      'Test Patch',
      'test-patch-fingerprint',
      patchContent
    );
  });

  afterEach(async (): Promise<void> => {
    // Clean up test data
    try {
      // Delete patch associations with banks
      const patches = await patchManager.getAll();
      const banks = await bankManager.getAll();
      for (const patch of patches) {
        for (const bank of banks) {
          await patchManager.removeFromBank(patch.id, bank.id);
        }
      }
      
      // Delete patches
      for (const patch of patches) {
        await patchManager.delete(patch.id);
      }
      
      // Delete banks
      for (const bank of banks) {
        await bankManager.delete(bank.id);
      }
      
      // Delete libraries
      const libraries = await libraryManager.getAll();
      for (const library of libraries) {
        await libraryManager.delete(library.id);
      }
      
      // Verify all tables are empty
      const patchCount = (await patchManager.getAll()).length;
      const bankCount = (await bankManager.getAll()).length;
      const libraryCount = (await libraryManager.getAll()).length;
      const bankPatchCount = (await patchManager.getAll()).length;
      
      if (patchCount || bankCount || libraryCount || bankPatchCount) {
        throw new Error('Failed to clean up test database');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Close the database connections
    await patchManager.close();
    await bankManager.close();
    await libraryManager.close();

    // Delete the test database file
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('Initialization', () => {
    it('should initialize database with correct schema', async () => {
      // Verify schema by creating a patch and ensuring fingerprint uniqueness
      const patchId = await patchManager.create(bankId, 'test', 'test-fingerprint', '{}');
      expect(patchId).toBeGreaterThan(0);
      await expect(patchManager.create(bankId, 'test2', 'test-fingerprint', '{}')).rejects.toThrowError(DatabaseError);
    });
  });

  describe('Patch Operations', () => {
    const patchContent = JSON.stringify({
      'parameters': {
        'oscillator1': {
          'waveform': 'sine',
          'frequency': 440
        },
        'filter1': {
          'type': 'lowpass',
          'cutoff': 1000
        }
      }
    });

    it('should create and retrieve a patch', async () => {
      const patch = await patchManager.getById(global.testPatchId);
      
      expect(patch).toBeDefined();
      expect(patch?.name).toBe('Test Patch');
      expect(patch?.fingerprint).toBe('test-patch-fingerprint');
      expect(patch?.content).toBe(patchContent);
      expect(patch?.favorited).toBe(0);
      expect(patch?.tags).toEqual([]);
    });

    it('should throw error when creating duplicate patch fingerprint', async () => {
      const fingerprint = 'test-patch-fingerprint';
      await expect(() => patchManager.create(bankId, 'Test Patch 2', fingerprint, patchContent))
        .rejects.toThrowError(DatabaseError);
    });

    it('should list all patches', async () => {
      const fingerprint1 = 'test-patch-1';
      const fingerprint2 = 'test-patch-2';
      await patchManager.create(bankId, 'Patch 1', fingerprint1, patchContent);
      await patchManager.create(bankId, 'Patch 2', fingerprint2, patchContent);
      
      const patches = await patchManager.getAll();
      expect(patches).toHaveLength(3);
      expect(patches[0].fingerprint).toBe('test-patch-fingerprint');
      expect(patches[1].fingerprint).toBe(fingerprint1);
      expect(patches[2].fingerprint).toBe(fingerprint2);
    });

    it('should update patch name', async () => {
      const newName = 'Updated Patch Name';
      await patchManager.updateName(global.testPatchId, newName);
      
      const patch = await patchManager.getById(global.testPatchId);
      expect(patch?.name).toBe(newName);
    });

    it('should throw error when updating non-existent patch', async () => {
      const nonExistentId = 999999;
      await expect(() => patchManager.updateName(nonExistentId, 'New Name'))
        .rejects.toThrowError(DatabaseError);
    });

    it('should update patch content', async () => {
      await patchManager.updateContent(global.testPatchId, JSON.stringify({
        'parameters': {
          'oscillator1': {
            'waveform': 'sawtooth',
            'frequency': 880
          }
        }
      }));
      
      const patch = await patchManager.getById(global.testPatchId);
      expect(patch?.content).toBe(JSON.stringify({
        'parameters': {
          'oscillator1': {
            'waveform': 'sawtooth',
            'frequency': 880
          }
        }
      }));
    });

    it('should update patch favorite status', async () => {
      await patchManager.updateFavorite(global.testPatchId, true);
      
      const patch = await patchManager.getById(global.testPatchId);
      expect(patch?.favorited).toBe(1);
    });

    it('should update patch tags', async () => {
      await patchManager.updateTags(global.testPatchId, ['tag1', 'tag2']);
      
      const patch = await patchManager.getById(global.testPatchId);
      expect(patch?.tags).toEqual(['tag1', 'tag2']);
    });

    it('should add patch to bank', async () => {
      // Get the libraryId from the original bank
      const originalBank = await bankManager.getById(bankId);
      if (!originalBank) {
        throw new Error('Original bank not found');
      }
      
      // Create a new bank with the same library
      const bankId2 = await bankManager.create(originalBank.library_id, 'Test Bank 2', 'Test Bank 2', 'test-bank-fingerprint-2');
      
      // Add patch to both banks
      await patchManager.addToBank(global.testPatchId, bankId);
      await patchManager.addToBank(global.testPatchId, bankId2);
      
      // Verify bank_patches table entries
      const bankPatches1 = await patchManager.getBankPatches(global.testPatchId, bankId);
      const bankPatches2 = await patchManager.getBankPatches(global.testPatchId, bankId2);
      
      expect(bankPatches1).toBeDefined();
      expect(bankPatches2).toBeDefined();
      expect(bankPatches1[0]?.bank_id).toBe(bankId);
      expect(bankPatches1[0]?.patch_id).toBe(global.testPatchId);
      expect(bankPatches2[0]?.bank_id).toBe(bankId2);
      expect(bankPatches2[0]?.patch_id).toBe(global.testPatchId);
    });

    it('should remove patch from bank', async () => {
      await patchManager.removeFromBank(global.testPatchId, bankId);
      
      // Verify patch is no longer in bank
      const patchesInBank = await patchManager.getPatchesByBank(bankId);
      const patch = patchesInBank.find(p => p.id === global.testPatchId);
      expect(patch).toBeUndefined();
    });
  });
});
