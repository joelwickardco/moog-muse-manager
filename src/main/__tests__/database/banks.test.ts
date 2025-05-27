import { BankManager } from '../../database/banks';
import { LibraryManager } from '../../database/libraries';
import { DatabaseError } from '../../database/errors';
import * as path from 'path';
import * as fs from 'fs/promises';

expect.extend({
  toThrowErrorWithMessage(received, expectedErrorType, expectedMessage) {
    const pass = received instanceof expectedErrorType && received.message === expectedMessage;
    return {
      pass,
      message: () => `
        Expected error ${received.constructor.name} with message "${expectedMessage}"
        ${pass ? 'but got' : 'to be'}: ${received.message}
      `
    };
  }
});

describe('BankManager', () => {
  let bankManager;
  let libraryManager;
  const testDbPath = path.join('/tmp/test-app-data', 'banks.db');

  beforeEach(async () => {
    // Create test directory if it doesn't exist
    const testDir = path.dirname(testDbPath);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create the database managers
    libraryManager = new LibraryManager(testDbPath);
    bankManager = new BankManager(testDbPath);
    
    // Initialize the database
    await libraryManager.initialize();
    await bankManager.initialize();
  });

  afterEach(async () => {
    // Clean up test data
    await bankManager.cleanup();
    await libraryManager.cleanup();
    await bankManager.close();
    await libraryManager.close();
  });

  describe('Initialization', () => {
    it('should initialize database with correct schema', async () => {
      // Verify tables exist
      const tables = await bankManager.all<{ name: string }>(
        'SELECT name FROM sqlite_master WHERE type = "table"'
      );
      expect(tables).toContainEqual({ name: 'banks' });
      
      // Verify index exists
      const indexes = await bankManager.all<{ name: string }>(
        'SELECT name FROM sqlite_master WHERE type = "index"'
      );
      expect(indexes).toContainEqual({ name: 'idx_banks_library_id' });
    });
  });

  describe('Bank Operations', () => {
    let libraryId;
    let bank1Id;
    let bank2Id;

    beforeEach(async () => {
      libraryId = await libraryManager.create('Test Library', 'test-library-fingerprint');
      const fingerprint1 = 'bank1-fingerprint';
      const fingerprint2 = 'bank2-fingerprint';
      bank1Id = await bankManager.create(libraryId, 'Bank 1', 'bank_1', fingerprint1);
      bank2Id = await bankManager.create(libraryId, 'Bank 2', 'bank_2', fingerprint2);
    });

    it('should create a new bank', async () => {
      const fingerprint = 'test-bank-fingerprint';
      const bankId = await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint);
      expect(bankId).toBeGreaterThan(0);

      const bank = await bankManager.getById(bankId);
      expect(bank).toBeDefined();
      expect(bank?.id).toBe(bankId);
      expect(bank?.library_id).toBe(libraryId);
      expect(bank?.name).toBe('Test Bank');
      expect(bank?.system_name).toBe('test_bank');
      expect(bank?.fingerprint).toBe(fingerprint);
    });

    it('should throw error when creating duplicate bank name in same library', async () => {
      const fingerprint = 'test-bank-fingerprint';
      await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint);
      
      await expect(
        bankManager.create(libraryId, 'Test Bank', 'test_bank_2', fingerprint)
      ).rejects.toThrowError(DatabaseError);
    });

    it('should list all banks', async () => {
      const banks = await bankManager.getAll();
      expect(banks).toHaveLength(2);
      expect(banks[0].name).toBe('Bank 1');
      expect(banks[1].name).toBe('Bank 2');
    });

    it('should find bank by system name and library id', async () => {
      // Find existing bank
      const bank1 = await bankManager.getBySystemName(libraryId, 'bank_1');
      expect(bank1).toBeDefined();
      expect(bank1?.id).toBe(bank1Id);
      expect(bank1?.library_id).toBe(libraryId);
      expect(bank1?.system_name).toBe('bank_1');

      // Try to find non-existent bank
      const nonExistentBank = await bankManager.getBySystemName(libraryId, 'non_existent');
      expect(nonExistentBank).toBeUndefined();

      // Try to find bank with correct system name but wrong library
      const bankInDifferentLibrary = await bankManager.getBySystemName(999, 'bank_1');
      expect(bankInDifferentLibrary).toBeUndefined();
    });

    it('should throw error when no banks exist', async () => {
      // Clean up existing banks first
      await bankManager.cleanup();
      await expect(bankManager.getAll()).rejects.toThrowError(DatabaseError);
    });

    it('should update bank name', async () => {
      const fingerprint = 'test-bank-fingerprint';
      const bankId = await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint);
      
      await bankManager.updateName(bankId, 'Updated Bank');
      const bank = await bankManager.getById(bankId);
      expect(bank?.name).toBe('Updated Bank');
    });

    it('should throw error when updating bank name to existing name in same library', async () => {
      const fingerprint2 = 'bank2-fingerprint';
      const bankId1 = await bankManager.create(libraryId, 'Bank 1', 'bank_1', 'unique-fingerprint-1');
      await bankManager.create(libraryId, 'Bank 2', 'bank_2', 'unique-fingerprint-2');
      
      await expect(
        bankManager.updateName(bankId1, 'Bank 2')
      ).rejects.toThrowError(DatabaseError);
    });

    it('should update bank system name', async () => {
      const fingerprint = 'test-bank-fingerprint';
      const bankId = await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint);
      
      await bankManager.updateSystemName(bankId, 'updated_system_name');
      const bank = await bankManager.getById(bankId);
      expect(bank?.system_name).toBe('updated_system_name');
    });
  });
});
