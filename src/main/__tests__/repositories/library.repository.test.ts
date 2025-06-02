import { DataSource } from 'typeorm';
import { LibraryRepository } from '../../repositories/library.repository';
import { Library } from '../../entities/library.entity';
import { createTestDataSource, closeTestDataSource, clearDatabase } from '../test-utils';

describe('LibraryRepository', () => {
  let dataSource: DataSource;
  let repository: LibraryRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new LibraryRepository(dataSource);
  });

  afterAll(async () => {
    await closeTestDataSource(dataSource);
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  describe('create', () => {
    it('should create a new library', async () => {
      const libraryData = {
        name: 'Test Library',
        fingerprint: 'test-fingerprint'
      };

      const library = await repository.create(libraryData);

      expect(library).toBeDefined();
      expect(library.id).toBeDefined();
      expect(library.name).toBe(libraryData.name);
      expect(library.fingerprint).toBe(libraryData.fingerprint);
    });
  });

  describe('findByName', () => {
    it('should find a library by name', async () => {
      const libraryData = {
        name: 'Test Library',
        fingerprint: 'test-fingerprint'
      };

      await repository.create(libraryData);
      const found = await repository.findByName(libraryData.name);

      expect(found).toBeDefined();
      expect(found?.name).toBe(libraryData.name);
    });

    it('should return null when library is not found', async () => {
      const found = await repository.findByName('Non-existent Library');
      expect(found).toBeNull();
    });
  });

  describe('findByFingerprint', () => {
    it('should find a library by fingerprint', async () => {
      const libraryData = {
        name: 'Test Library',
        fingerprint: 'test-fingerprint'
      };

      await repository.create(libraryData);
      const found = await repository.findByFingerprint(libraryData.fingerprint);

      expect(found).toBeDefined();
      expect(found?.fingerprint).toBe(libraryData.fingerprint);
    });

    it('should return null when library is not found', async () => {
      const found = await repository.findByFingerprint('non-existent-fingerprint');
      expect(found).toBeNull();
    });
  });
}); 