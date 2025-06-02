import { DataSource } from 'typeorm';
import { BankRepository } from '../../repositories/bank.repository';
import { LibraryRepository } from '../../repositories/library.repository';
import { Bank } from '../../entities/bank.entity';
import { createTestDataSource, closeTestDataSource, clearDatabase } from '../test-utils';

describe('BankRepository', () => {
  let dataSource: DataSource;
  let repository: BankRepository;
  let libraryRepository: LibraryRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new BankRepository(dataSource);
    libraryRepository = new LibraryRepository(dataSource);
  });

  afterAll(async () => {
    await closeTestDataSource(dataSource);
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  describe('create', () => {
    it('should create a new bank', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bankData = {
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      };

      const bank = await repository.create(bankData);

      expect(bank).toBeDefined();
      expect(bank.id).toBeDefined();
      expect(bank.name).toBe(bankData.name);
      expect(bank.system_name).toBe(bankData.system_name);
      expect(bank.type).toBe(bankData.type);
      expect(bank.fingerprint).toBe(bankData.fingerprint);
    });
  });

  describe('findByLibraryId', () => {
    it('should find banks by library ID', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank1 = await repository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Bank 1',
        system_name: 'bank-1',
        type: 'patch' as const,
        fingerprint: 'bank-1-fingerprint'
      });

      const bank2 = await repository.create({
        bank_number: 2,
        library_id: library.id,
        name: 'Bank 2',
        system_name: 'bank-2',
        type: 'patch' as const,
        fingerprint: 'bank-2-fingerprint'
      });

      const banks = await repository.findByLibraryId(library.id);

      expect(banks).toHaveLength(2);
      expect(banks[0].bank_number).toBe(1);
      expect(banks[1].bank_number).toBe(2);
    });

    it('should return empty array when no banks exist for library', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const banks = await repository.findByLibraryId(library.id);
      expect(banks).toHaveLength(0);
    });
  });

  describe('findBySystemName', () => {
    it('should find a bank by system name', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bankData = {
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      };

      await repository.create(bankData);
      const found = await repository.findBySystemName(bankData.system_name);

      expect(found).toBeDefined();
      expect(found?.system_name).toBe(bankData.system_name);
    });

    it('should return null when bank is not found', async () => {
      const found = await repository.findBySystemName('non-existent-bank');
      expect(found).toBeNull();
    });
  });

  describe('findByFingerprint', () => {
    it('should find a bank by fingerprint', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bankData = {
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      };

      await repository.create(bankData);
      const found = await repository.findByFingerprint(bankData.fingerprint);

      expect(found).toBeDefined();
      expect(found?.fingerprint).toBe(bankData.fingerprint);
    });

    it('should return null when bank is not found', async () => {
      const found = await repository.findByFingerprint('non-existent-fingerprint');
      expect(found).toBeNull();
    });
  });
}); 