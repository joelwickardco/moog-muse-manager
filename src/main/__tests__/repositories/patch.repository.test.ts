import { DataSource } from 'typeorm';
import { PatchRepository } from '../../repositories/patch.repository';
import { BankRepository } from '../../repositories/bank.repository';
import { LibraryRepository } from '../../repositories/library.repository';
import { Patch } from '../../entities/patch.entity';
import { createTestDataSource, closeTestDataSource, clearDatabase } from '../test-utils';

describe('PatchRepository', () => {
  let dataSource: DataSource;
  let repository: PatchRepository;
  let bankRepository: BankRepository;
  let libraryRepository: LibraryRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new PatchRepository(dataSource);
    bankRepository = new BankRepository(dataSource);
    libraryRepository = new LibraryRepository(dataSource);
  });

  afterAll(async () => {
    await closeTestDataSource(dataSource);
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  describe('create', () => {
    it('should create a new patch', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const patchData = {
        patch_number: 1,
        bank_id: bank.id,
        name: 'Test Patch',
        fingerprint: 'test-patch-fingerprint',
        content: 'test content',
        default_patch: false,
        favorited: false,
        tags: 'test,tags'
      };

      const patch = await repository.create(patchData);

      expect(patch).toBeDefined();
      expect(patch.id).toBeDefined();
      expect(patch.name).toBe(patchData.name);
      expect(patch.patch_number).toBe(patchData.patch_number);
      expect(patch.fingerprint).toBe(patchData.fingerprint);
      expect(patch.content).toBe(patchData.content);
      expect(patch.default_patch).toBe(patchData.default_patch);
      expect(patch.favorited).toBe(patchData.favorited);
      expect(patch.tags).toBe(patchData.tags);
    });
  });

  describe('findByBankId', () => {
    it('should find patches by bank ID', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const patch1 = await repository.create({
        patch_number: 1,
        bank_id: bank.id,
        name: 'Patch 1',
        fingerprint: 'patch-1-fingerprint',
        content: 'content 1'
      });

      const patch2 = await repository.create({
        patch_number: 2,
        bank_id: bank.id,
        name: 'Patch 2',
        fingerprint: 'patch-2-fingerprint',
        content: 'content 2'
      });

      const patches = await repository.findByBankId(bank.id);

      expect(patches).toHaveLength(2);
      expect(patches[0].patch_number).toBe(1);
      expect(patches[1].patch_number).toBe(2);
    });

    it('should return empty array when no patches exist for bank', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const patches = await repository.findByBankId(bank.id);
      expect(patches).toHaveLength(0);
    });
  });

  describe('findByFingerprint', () => {
    it('should find a patch by fingerprint', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const patchData = {
        patch_number: 1,
        bank_id: bank.id,
        name: 'Test Patch',
        fingerprint: 'test-patch-fingerprint',
        content: 'test content'
      };

      await repository.create(patchData);
      const found = await repository.findByFingerprint(patchData.fingerprint);

      expect(found).toBeDefined();
      expect(found?.fingerprint).toBe(patchData.fingerprint);
    });

    it('should return null when patch is not found', async () => {
      const found = await repository.findByFingerprint('non-existent-fingerprint');
      expect(found).toBeNull();
    });
  });

  describe('findFavorites', () => {
    it('should find all favorited patches', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'patch' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      await repository.create({
        patch_number: 1,
        bank_id: bank.id,
        name: 'Favorite Patch',
        fingerprint: 'favorite-patch-fingerprint',
        content: 'content',
        favorited: true
      });

      await repository.create({
        patch_number: 2,
        bank_id: bank.id,
        name: 'Non-Favorite Patch',
        fingerprint: 'non-favorite-patch-fingerprint',
        content: 'content',
        favorited: false
      });

      const favorites = await repository.findFavorites();

      expect(favorites).toHaveLength(1);
      expect(favorites[0].name).toBe('Favorite Patch');
    });

    it('should return empty array when no favorites exist', async () => {
      const favorites = await repository.findFavorites();
      expect(favorites).toHaveLength(0);
    });
  });
}); 