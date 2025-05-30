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
  let bankManager: BankManager;
  let libraryManager: LibraryManager;
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

  afterAll(async () => {
    // Remove the test database file after all tests
    const fs = require('fs');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Initialization', () => {
    it('should initialize database with correct schema', async () => {
      // Create a test bank to verify schema
      const libraryId = await libraryManager.create('Test Library', 'test-library-fingerprint');
      const bankId = await bankManager.create(libraryId, 'Test Bank', 'test_bank', 'test-fingerprint');
      expect(bankId).toBeGreaterThan(0);

      // Verify bank was created correctly
      const bank = await bankManager.getById(bankId);
      expect(bank).toBeDefined();
      expect(bank?.name).toBe('Test Bank');
    });
  });

  describe('Bank Operations', () => {
    let libraryId: number;
    let bank1Id: number;

    beforeEach(async () => {
      libraryId = await libraryManager.create('Test Library', 'test-library-fingerprint');
      const fingerprint1 = 'bank1-fingerprint';
      const fingerprint2 = 'bank2-fingerprint';
      bank1Id = await bankManager.create(libraryId, 'Bank 1', 'bank_1', fingerprint1);
      await bankManager.create(libraryId, 'Bank 2', 'bank_2', fingerprint2);
    });

    it('should create a new bank', async () => {
      const fingerprint = 'test_bank_fingerprint';
      const mockContent = Buffer.from('mock bank content');
      const bankId = await bankManager.create(libraryId, 'test_bank', 'test_bank', fingerprint, mockContent);
      expect(typeof bankId).toBe('number');
      const bank = await bankManager.getById(bankId);
      expect(bank).toBeDefined();
      expect(bank?.name).toBe('test_bank');
      expect(bank?.system_name).toBe('test_bank');
      expect(bank?.fingerprint).toBe(fingerprint);
      expect(bank?.file_content).toBeInstanceOf(Buffer);
      expect(bank?.file_content?.toString()).toBe('mock bank content');
    });

    it('should create a bank with file content', async () => {
      const fingerprint = 'test-bank-fingerprint';
      const fileContent = Buffer.from('test file content');
      const bankId = await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint, fileContent);
      expect(bankId).toBeGreaterThan(0);

      const bank = await bankManager.getById(bankId);
      expect(bank).toBeDefined();
      expect(bank?.id).toBe(bankId);
      expect(bank?.library_id).toBe(libraryId);
      expect(bank?.name).toBe('Test Bank');
      expect(bank?.system_name).toBe('test_bank');
      expect(bank?.fingerprint).toBe(fingerprint);
      expect(bank?.file_content).toEqual(fileContent);
    });

    it('should throw error when creating bank with duplicate system name in same library', async () => {
      const fingerprint = 'test-bank-fingerprint';
      await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint);
      
      await expect(
        bankManager.create(libraryId, 'Another Bank', 'test_bank', 'different-fingerprint')
      ).rejects.toThrowError(DatabaseError);
    });

    it('should throw error when creating bank with duplicate fingerprint', async () => {
      const fingerprint = 'test-bank-fingerprint';
      await bankManager.create(libraryId, 'Test Bank', 'test_bank', fingerprint);
      
      await expect(
        bankManager.create(libraryId, 'Another Bank', 'another_bank', fingerprint)
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
  });
});
