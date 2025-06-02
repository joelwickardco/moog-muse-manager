import { DataSource } from 'typeorm';
import { PatchSequenceRepository } from '../../repositories/patch-sequence.repository';
import { BankRepository } from '../../repositories/bank.repository';
import { LibraryRepository } from '../../repositories/library.repository';
import { PatchSequence } from '../../entities/patch-sequence.entity';
import { createTestDataSource, closeTestDataSource, clearDatabase } from '../test-utils';

describe('PatchSequenceRepository', () => {
  let dataSource: DataSource;
  let repository: PatchSequenceRepository;
  let bankRepository: BankRepository;
  let libraryRepository: LibraryRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new PatchSequenceRepository(dataSource);
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
    it('should create a new patch sequence', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'sequence' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const sequenceData = {
        sequence_number: 1,
        bank_id: bank.id,
        name: 'Test Sequence',
        fingerprint: 'test-sequence-fingerprint',
        content: 'test content'
      };

      const sequence = await repository.create(sequenceData);

      expect(sequence).toBeDefined();
      expect(sequence.id).toBeDefined();
      expect(sequence.name).toBe(sequenceData.name);
      expect(sequence.sequence_number).toBe(sequenceData.sequence_number);
      expect(sequence.fingerprint).toBe(sequenceData.fingerprint);
      expect(sequence.content).toBe(sequenceData.content);
    });
  });

  describe('findByBankId', () => {
    it('should find sequences by bank ID', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'sequence' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const sequence1 = await repository.create({
        sequence_number: 1,
        bank_id: bank.id,
        name: 'Sequence 1',
        fingerprint: 'sequence-1-fingerprint',
        content: 'content 1'
      });

      const sequence2 = await repository.create({
        sequence_number: 2,
        bank_id: bank.id,
        name: 'Sequence 2',
        fingerprint: 'sequence-2-fingerprint',
        content: 'content 2'
      });

      const sequences = await repository.findByBankId(bank.id);

      expect(sequences).toHaveLength(2);
      expect(sequences[0].sequence_number).toBe(1);
      expect(sequences[1].sequence_number).toBe(2);
    });

    it('should return empty array when no sequences exist for bank', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'sequence' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const sequences = await repository.findByBankId(bank.id);
      expect(sequences).toHaveLength(0);
    });
  });

  describe('findByFingerprint', () => {
    it('should find a sequence by fingerprint', async () => {
      const library = await libraryRepository.create({
        name: 'Test Library',
        fingerprint: 'test-library-fingerprint'
      });

      const bank = await bankRepository.create({
        bank_number: 1,
        library_id: library.id,
        name: 'Test Bank',
        system_name: 'test-bank',
        type: 'sequence' as const,
        fingerprint: 'test-bank-fingerprint'
      });

      const sequenceData = {
        sequence_number: 1,
        bank_id: bank.id,
        name: 'Test Sequence',
        fingerprint: 'test-sequence-fingerprint',
        content: 'test content'
      };

      await repository.create(sequenceData);
      const found = await repository.findByFingerprint(sequenceData.fingerprint);

      expect(found).toBeDefined();
      expect(found?.fingerprint).toBe(sequenceData.fingerprint);
    });

    it('should return null when sequence is not found', async () => {
      const found = await repository.findByFingerprint('non-existent-fingerprint');
      expect(found).toBeNull();
    });
  });
}); 