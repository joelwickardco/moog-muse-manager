import { LibraryManager } from '../../database/libraries';

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
import * as path from 'path';
import * as fs from 'fs/promises';

describe('LibraryManager', () => {
  let libraryManager;
  const testDbPath = path.join('/tmp/test-app-data', 'libraries.db');

  beforeEach(async () => {
    // Create test directory if it doesn't exist
    const testDir = path.dirname(testDbPath);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create the library manager
    libraryManager = new LibraryManager(testDbPath);
    
    // Initialize the database
    await libraryManager.initialize();
  });

  afterEach(async () => {
    // Clean up test data
    await libraryManager.cleanup();
    await libraryManager.close();
  });

  describe('Initialization', () => {
    it('should initialize database with correct schema', async () => {
      await expect(libraryManager.initialize()).resolves.not.toThrow();
      
      // Verify tables exist
      const tables = await libraryManager.all<{ name: string }>(
        'SELECT name FROM sqlite_master WHERE type = "table"'
      );
      expect(tables).toContainEqual({ name: 'libraries' });
    });
  });

  describe('Library Operations', () => {
    it('should create a new library', async () => {
      const fingerprint = 'test-fingerprint';
      const libraryId = await libraryManager.create('Test Library', fingerprint);
      expect(libraryId).toBeGreaterThan(0);

      const library = await libraryManager.getById(libraryId);
      expect(library).toBeDefined();
      expect(library?.id).toBe(libraryId);
      expect(library?.name).toBe('Test Library');
      expect(library?.fingerprint).toBe(fingerprint);
    });

    it('should throw error when creating duplicate library', async () => {
      const fingerprint = 'test-fingerprint';
      await libraryManager.create('Test Library', fingerprint);
      
      await expect(
        libraryManager.create('Test Library', fingerprint)
      ).rejects.toThrowError();
    });

    it('should list all libraries', async () => {
      await libraryManager.create('Library 1', 'fingerprint1');
      await libraryManager.create('Library 2', 'fingerprint2');
      
      const libraries = await libraryManager.getAll();
      expect(libraries).toHaveLength(2);
      expect(libraries[0].name).toBe('Library 1');
      expect(libraries[1].name).toBe('Library 2');
    });

    it('should update library name', async () => {
      const fingerprint = 'test-fingerprint';
      const libraryId = await libraryManager.create('Test Library', fingerprint);
      
      await libraryManager.updateName(libraryId, 'Updated Library');
      const library = await libraryManager.getById(libraryId);
      expect(library?.name).toBe('Updated Library');
    });

    it('should get library by fingerprint', async () => {
      const fingerprint = 'unique-fingerprint';
      const libraryId = await libraryManager.create('Test Library', fingerprint);
      
      const library = await libraryManager.getByFingerprint(fingerprint);
      expect(library).toBeDefined();
      expect(library?.id).toBe(libraryId);
      expect(library?.name).toBe('Test Library');
      expect(library?.fingerprint).toBe(fingerprint);
    });

    it('should return undefined when getting non-existent fingerprint', async () => {
      const library = await libraryManager.getByFingerprint('non-existent-fingerprint');
      expect(library).toBeUndefined();
    });

    it('should throw error when updating non-existent library', async () => {
      await expect(
        libraryManager.updateName(9999, 'New Name')
      ).rejects.toThrowError();
    });

    it('should delete library', async () => {
      const fingerprint = 'test-fingerprint';
      const libraryId = await libraryManager.create('Test Library', fingerprint);
      
      await libraryManager.delete(libraryId);
      const library = await libraryManager.getById(libraryId);
      expect(library).toBeUndefined();
    });

    it('should throw error when deleting non-existent library', async () => {
      await expect(
        libraryManager.delete(9999)
      ).rejects.toThrowError();
    });
  });
});
