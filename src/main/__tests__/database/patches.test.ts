import { PatchManager } from '../../database/patches';
import { LibraryManager } from '../../database/libraries';
import { BankManager } from '../../database/banks';
import { DatabaseError } from '../../database/errors';
import path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Patch } from '../../database/types';

declare global {
  namespace NodeJS {
    interface Global {
      testPatchId: number | undefined;
    }
  }
}

function getTempDbPath() {
  return path.join(os.tmpdir(), `patches-test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.db`);
}

let testPatchId: number | undefined = undefined;

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
  let testDbPath: string;
  let bankId: number;

  beforeEach(async () => {
    testDbPath = getTempDbPath();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    libraryManager = new LibraryManager(testDbPath);
    bankManager = new BankManager(testDbPath);
    patchManager = new PatchManager(testDbPath);

    await libraryManager.initialize();
    await bankManager.initialize();
    await patchManager.initialize();

    // Create a test library
    const libraryId = await libraryManager.create('Test Library', 'test-library-fingerprint');
    
    // Create a test bank in the library
    bankId = await bankManager.create(libraryId, 'Test Bank', 'Test Bank', 'test-bank-fingerprint');
    
    // Create a test patch
    testPatchId = await patchManager.create(
      bankId,
      'Test Patch',
      'test-patch-fingerprint',
      patchContent
    );
  });

  afterEach(async () => {
    await patchManager.cleanup();
    await bankManager.cleanup();
    await libraryManager.cleanup();
    patchManager.close();
    bankManager.close();
    libraryManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
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
      const patch = await patchManager.getById(testPatchId!);
      
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
      await patchManager.updateName(testPatchId!, newName);
      
      const patch = await patchManager.getById(testPatchId!);
      expect(patch?.name).toBe(newName);
    });

    it('should throw error when updating non-existent patch', async () => {
      const nonExistentId = 999999;
      await expect(() => patchManager.updateName(nonExistentId, 'New Name'))
        .rejects.toThrowError(DatabaseError);
    });

    it('should update patch content', async () => {
      await patchManager.updateContent(testPatchId!, JSON.stringify({
        'parameters': {
          'oscillator1': {
            'waveform': 'sawtooth',
            'frequency': 880
          }
        }
      }));
      
      const patch = await patchManager.getById(testPatchId!);
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
      await patchManager.updateFavorite(testPatchId!, true);
      
      const patch = await patchManager.getById(testPatchId!);
      expect(patch?.favorited).toBe(1);
    });

    it('should update patch tags', async () => {
      await patchManager.updateTags(testPatchId!, ['tag1', 'tag2']);
      
      const patch = await patchManager.getById(testPatchId!);
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
      await patchManager.addToBank(testPatchId!, bankId);
      await patchManager.addToBank(testPatchId!, bankId2);
      
      // Verify bank_patches table entries
      const bankPatches1 = await patchManager.getBankPatches(testPatchId!, bankId);
      const bankPatches2 = await patchManager.getBankPatches(testPatchId!, bankId2);
      
      expect(bankPatches1).toBeDefined();
      expect(bankPatches2).toBeDefined();
      expect(bankPatches1[0]?.bank_id).toBe(bankId);
      expect(bankPatches1[0]?.patch_id).toBe(testPatchId);
      expect(bankPatches2[0]?.bank_id).toBe(bankId2);
      expect(bankPatches2[0]?.patch_id).toBe(testPatchId);
    });

    it('should remove patch from bank', async () => {
      await patchManager.removeFromBank(testPatchId!, bankId);
      
      // Verify patch is no longer in bank
      const patchesInBank = await patchManager.getPatchesByBank(bankId);
      const patch = patchesInBank.find(p => p.id === testPatchId);
      expect(patch).toBeUndefined();
    });
  });

  describe('getPatchesByLibrary', () => {
    it('should return patches for a specific library', async () => {
      // Create a library
      const libraryId = await libraryManager.create('Test Library A', 'test-fingerprint-A');

      // Create a bank in the library
      const bankId = await bankManager.create(libraryId, 'Test Bank A', 'Test Bank A', 'bank-fingerprint-A');

      // Create patches in the bank
      const patch1Id = await patchManager.create(
        bankId,
        'Test Patch 1',
        'patch1-fingerprint',
        'patch1-content',
        1,
        ['test', 'patch1']
      );

      const patch2Id = await patchManager.create(
        bankId,
        'Test Patch 2',
        'patch2-fingerprint',
        'patch2-content',
        0,
        ['test', 'patch2']
      );

      // Create another library and bank
      const otherLibraryId = await libraryManager.create('Other Library B', 'other-fingerprint-B');
      const otherBankId = await bankManager.create(otherLibraryId, 'Other Bank B', 'Other Bank B', 'other-bank-fingerprint-B');

      // Create a patch in the other bank
      await patchManager.create(
        otherBankId,
        'Other Patch',
        'other-patch-fingerprint',
        'other-patch-content',
        0,
        ['other']
      );

      // Get patches for the first library
      const patches = await patchManager.getPatchesByLibrary(libraryId);

      // Verify results
      expect(patches).toHaveLength(2);
      expect(patches.map(p => p.name)).toContain('Test Patch 1');
      expect(patches.map(p => p.name)).toContain('Test Patch 2');
      expect(patches.map(p => p.name)).not.toContain('Other Patch');

      // Verify patch details
      const patch1 = patches.find(p => p.name === 'Test Patch 1');
      expect(patch1).toBeDefined();
      expect(patch1?.favorited).toBe(1);
      expect(patch1?.tags).toEqual(['test', 'patch1']);

      const patch2 = patches.find(p => p.name === 'Test Patch 2');
      expect(patch2).toBeDefined();
      expect(patch2?.favorited).toBe(0);
      expect(patch2?.tags).toEqual(['test', 'patch2']);
    });

    it('should return empty array for non-existent library', async () => {
      const patches = await patchManager.getPatchesByLibrary(999);
      expect(patches).toHaveLength(0);
    });
  });
});
