import { PatchSequenceManager } from '../../database/patch-sequences';
import { LibraryManager } from '../../database/libraries';
import { BankManager } from '../../database/banks';
import { PatchSequence } from '../../database/types';
import * as path from 'path';
import * as fs from 'fs/promises';

declare global {
  var testSequenceId: number | undefined;
}

global.testSequenceId = undefined;

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

describe('PatchSequenceManager', () => {
  let sequenceManager: PatchSequenceManager;
  let libraryManager: LibraryManager;
  let bankManager: BankManager;
  const testDbPath = path.join('/tmp/test-app-data', 'patch-sequences.db');

  beforeEach(async (): Promise<void> => {
    // Create test directory if it doesn't exist
    const testDir = path.dirname(testDbPath);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create the database managers
    libraryManager = new LibraryManager(testDbPath);
    bankManager = new BankManager(testDbPath);
    sequenceManager = new PatchSequenceManager(testDbPath);
    
    // Initialize the database
    await sequenceManager.initialize();
    await bankManager.initialize();
    await libraryManager.initialize();

    // Create a test library
    const libraryId = await libraryManager.create('Test Library', 'test-library-fingerprint');
    
    // Create a test bank in the library
    await bankManager.create(libraryId, 'Test Bank', 'Test Bank', 'test-bank-fingerprint');
  });

  afterEach(async (): Promise<void> => {
    // Clean up test data
    try {
      // Delete sequences
      const sequences = await sequenceManager.getAll();
      for (const sequence of sequences) {
        await sequenceManager.delete(sequence.id);
      }
      
      // Delete banks
      const banks = await bankManager.getAll();
      for (const bank of banks) {
        await bankManager.delete(bank.id);
      }
      
      // Delete libraries
      const libraries = await libraryManager.getAll();
      for (const library of libraries) {
        await libraryManager.delete(library.id);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('Initialization', () => {
    it('should initialize database with correct schema', async () => {
      await expect(sequenceManager.initialize()).resolves.not.toThrow();
      
      // Verify tables exist by checking getAll does not throw and returns an array
      const sequences = await sequenceManager.getAll();
      expect(Array.isArray(sequences)).toBe(true);
    });
  });

  describe('Sequence Operations', () => {
    it('should create a new sequence', async () => {
      const sequenceId = await sequenceManager.create(
        'Test Sequence',
        'test-sequence-fingerprint',
        JSON.stringify({ steps: [1, 2, 3] })
      );
      expect(sequenceId).toBeGreaterThan(0);

      const sequence: PatchSequence | undefined = await sequenceManager.getById(sequenceId);
      expect(sequence).toBeDefined();
      expect(sequence?.id).toBe(sequenceId);
      expect(sequence?.name).toBe('Test Sequence');
      expect(sequence?.fingerprint).toBe('test-sequence-fingerprint');
      expect(sequence?.content).toBeDefined();
    });

    it('should throw error when creating duplicate sequence', async () => {
      const fingerprint = 'test-fingerprint';
      await sequenceManager.create(
        'Test Sequence',
        fingerprint,
        JSON.stringify({ steps: [1, 2, 3] })
      );
      
      await expect(
        sequenceManager.create(
          'Test Sequence',
          fingerprint,
          JSON.stringify({ steps: [1, 2, 3] })
        )
      ).rejects.toThrowError();
    });

    it('should list all sequences', async () => {
      await sequenceManager.create(
        'Sequence 1',
        'fingerprint1',
        JSON.stringify({ steps: [1, 2, 3] })
      );
      await sequenceManager.create(
        'Sequence 2',
        'fingerprint2',
        JSON.stringify({ steps: [4, 5, 6] })
      );
      
      const sequences = await sequenceManager.getAll();
      expect(sequences).toHaveLength(2);
      expect(sequences[0].name).toBe('Sequence 1');
      expect(sequences[1].name).toBe('Sequence 2');
    });

    it('should update sequence name', async () => {
      const sequenceId = await sequenceManager.create(
        'Test Sequence',
        'test-fingerprint',
        JSON.stringify({ steps: [1, 2, 3] })
      );
      
      await sequenceManager.updateName(sequenceId, 'Updated Sequence');
      const sequence = await sequenceManager.getById(sequenceId);
      expect(sequence?.name).toBe('Updated Sequence');
    });

    it('should update sequence content', async () => {
      const sequenceId = await sequenceManager.create(
        'Test Sequence',
        'test-fingerprint',
        JSON.stringify({ steps: [1, 2, 3] })
      );
      
      await sequenceManager.updateContent(sequenceId, JSON.stringify({ steps: [4, 5, 6] }));
      const sequence = await sequenceManager.getById(sequenceId);
      expect(JSON.parse(sequence?.content || '{}')).toEqual({ steps: [4, 5, 6] });
    });

    it('should delete a sequence', async () => {
      const sequenceId = await sequenceManager.create(
        'Test Sequence',
        'test-fingerprint',
        JSON.stringify({ steps: [1, 2, 3] })
      );
      
      await sequenceManager.delete(sequenceId);
      const sequence = await sequenceManager.getById(sequenceId);
      expect(sequence).toBeUndefined();
    });

    it('should throw error when deleting non-existent sequence', async () => {
      await expect(sequenceManager.delete(999999)).rejects.toThrowError();
    });
  });
});
