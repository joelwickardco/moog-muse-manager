import { DataSource } from 'typeorm';
import { exportLibrary } from '../../services/exportLibrary';
import { Library } from '../../entities/library.entity';
import { Bank } from '../../entities/bank.entity';
import { Patch } from '../../entities/patch.entity';
import { PatchSequence } from '../../entities/patch-sequence.entity';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('exportLibrary', () => {
  let mockDataSource: DataSource;
  let mockLibraryRepo: any;
  let mockBankRepo: any;
  let mockPatchRepo: any;
  let mockSequenceRepo: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock repositories
    mockLibraryRepo = {
      findOneBy: jest.fn(),
      findOne: jest.fn()
    };

    mockBankRepo = {
      find: jest.fn()
    };

    mockPatchRepo = {
      find: jest.fn()
    };

    mockSequenceRepo = {
      find: jest.fn()
    };

    // Setup mock data source
    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Library) return mockLibraryRepo;
        if (entity === Bank) return mockBankRepo;
        if (entity === Patch) return mockPatchRepo;
        if (entity === PatchSequence) return mockSequenceRepo;
        return null;
      })
    } as unknown as DataSource;

    // Mock fs promises
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  it('should successfully export a library', async () => {
    // Mock library data
    const mockLibrary = {
      id: 1,
      name: 'Test Library',
      fingerprint: 'test-fingerprint'
    };

    // Mock banks data
    const mockPatchBanks = Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      bank_number: i + 1,
      library: { id: 1 },
      name: `Bank ${i + 1}`,
      system_name: `bank${(i + 1).toString().padStart(2, '0')}`,
      type: 'patch',
      content: Buffer.from('test bank content'),
      fingerprint: `bank-fingerprint-${i + 1}`
    }));

    const mockSequenceBanks = Array.from({ length: 16 }, (_, i) => ({
      id: i + 17,
      bank_number: i + 1,
      library: { id: 1 },
      name: `Sequence Bank ${i + 1}`,
      system_name: `bank${(i + 1).toString().padStart(2, '0')}`,
      type: 'sequence',
      content: null,
      fingerprint: `seq-bank-fingerprint-${i + 1}`
    }));

    // Mock patches data
    const mockPatches = Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      patch_number: i + 1,
      bank: { id: 1 },
      name: `Patch ${i + 1}`,
      content: i === 0 ? null : 'test patch content',
      default_patch: i === 0,
      fingerprint: `patch-fingerprint-${i + 1}`
    }));

    // Mock sequences data
    const mockSequences = Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      sequence_number: i + 1,
      bank: { id: 17 },
      name: `Sequence ${i + 1}`,
      content: 'test sequence content',
      fingerprint: `sequence-fingerprint-${i + 1}`
    }));

    // Setup repository mocks
    mockLibraryRepo.findOneBy.mockResolvedValue(mockLibrary);
    mockBankRepo.find.mockResolvedValue([...mockPatchBanks, ...mockSequenceBanks]);
    mockPatchRepo.find.mockResolvedValue(mockPatches);
    mockSequenceRepo.find.mockResolvedValue(mockSequences);

    // Execute export
    const result = await exportLibrary(1, '/tmp', mockDataSource);

    // Verify results
    expect(result.success).toBe(true);
    expect(result.exportPath).toBe('/tmp/Test Library');

    // Verify directory creation
    expect(fs.mkdir).toHaveBeenCalledWith('/tmp/Test Library', { recursive: true });
    expect(fs.mkdir).toHaveBeenCalledWith('/tmp/Test Library/library', { recursive: true });

    // Verify file writing
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('bank01/Bank 1.bank'),
      expect.any(Buffer)
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('patch02/Patch 2.mmp'),
      'test patch content'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('sequences/bank01/seq01/Sequence 1.mmseq'),
      'test sequence content'
    );
  });

  it('should return error if library not found', async () => {
    mockLibraryRepo.findOneBy.mockResolvedValue(null);

    const result = await exportLibrary(999, '/tmp', mockDataSource);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Library not found');
  });

  it('should return error if invalid number of banks', async () => {
    mockLibraryRepo.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Test Library',
      fingerprint: 'test-fingerprint'
    });
    mockBankRepo.find.mockResolvedValue([]);

    const result = await exportLibrary(1, '/tmp', mockDataSource);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid number of banks found');
  });

  it('should return error if invalid number of patches', async () => {
    mockLibraryRepo.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Test Library',
      fingerprint: 'test-fingerprint'
    });
    // 16 patch banks, first one will have 0 patches, rest are valid
    const patchBanks = Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      bank_number: i + 1,
      library: { id: 1 },
      name: `Bank ${i + 1}`,
      system_name: `bank${(i + 1).toString().padStart(2, '0')}`,
      type: 'patch',
      content: Buffer.from('test'),
      fingerprint: `patch-fingerprint-${i + 1}`
    }));
    const sequenceBanks = Array.from({ length: 16 }, (_, i) => ({
      id: i + 17,
      bank_number: i + 1,
      library: { id: 1 },
      name: `Sequence Bank ${i + 1}`,
      system_name: `bank${(i + 1).toString().padStart(2, '0')}`,
      type: 'sequence',
      content: null,
      fingerprint: `seq-bank-fingerprint-${i + 1}`
    }));
    mockBankRepo.find.mockResolvedValue([...patchBanks, ...sequenceBanks]);
    // Only the first patch bank returns 0 patches, rest return 16
    mockPatchRepo.find.mockImplementation((options: { where: { bank: { id: number } } }) => {
      if (options.where.bank.id === 1) return Promise.resolve([]);
      return Promise.resolve(Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        patch_number: i + 1,
        bank: { id: options.where.bank.id },
        name: `Patch ${i + 1}`,
        content: 'test patch content',
        default_patch: false,
        fingerprint: `patch-fingerprint-${i + 1}`
      })));
    });
    // Sequences always valid
    mockSequenceRepo.find.mockResolvedValue(Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      sequence_number: i + 1,
      bank: { id: 17 },
      name: `Sequence ${i + 1}`,
      content: 'test sequence content',
      fingerprint: `sequence-fingerprint-${i + 1}`
    })));

    const result = await exportLibrary(1, '/tmp', mockDataSource);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid number of patches found in bank bank01 (expected 16)');
  });

  it('should return error if bank content is missing', async () => {
    mockLibraryRepo.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Test Library',
      fingerprint: 'test-fingerprint'
    });
    // 16 patch banks, first one missing content
    const patchBanks = [
      {
        id: 1,
        bank_number: 1,
        library: { id: 1 },
        name: 'Bank 1',
        system_name: 'bank01',
        type: 'patch',
        content: null,
        fingerprint: 'test'
      },
      ...Array.from({ length: 15 }, (_, i) => ({
        id: i + 2,
        bank_number: i + 2,
        library: { id: 1 },
        name: `Bank ${i + 2}`,
        system_name: `bank${(i + 2).toString().padStart(2, '0')}`,
        type: 'patch',
        content: Buffer.from('test'),
        fingerprint: `patch-fingerprint-${i + 2}`
      }))
    ];
    const sequenceBanks = Array.from({ length: 16 }, (_, i) => ({
      id: i + 17,
      bank_number: i + 1,
      library: { id: 1 },
      name: `Sequence Bank ${i + 1}`,
      system_name: `bank${(i + 1).toString().padStart(2, '0')}`,
      type: 'sequence',
      content: null,
      fingerprint: `seq-bank-fingerprint-${i + 1}`
    }));
    mockBankRepo.find.mockResolvedValue([...patchBanks, ...sequenceBanks]);
    // Patches and sequences always valid
    mockPatchRepo.find.mockResolvedValue(Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      patch_number: i + 1,
      bank: { id: 1 },
      name: `Patch ${i + 1}`,
      content: 'test patch content',
      default_patch: false,
      fingerprint: `patch-fingerprint-${i + 1}`
    })));
    mockSequenceRepo.find.mockResolvedValue(Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      sequence_number: i + 1,
      bank: { id: 17 },
      name: `Sequence ${i + 1}`,
      content: 'test sequence content',
      fingerprint: `sequence-fingerprint-${i + 1}`
    })));

    const result = await exportLibrary(1, '/tmp', mockDataSource);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Missing bank content for bank01');
  });

  it('should handle filesystem errors', async () => {
    mockLibraryRepo.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Test Library',
      fingerprint: 'test-fingerprint'
    });
    (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

    const result = await exportLibrary(1, '/tmp', mockDataSource);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Permission denied');
  });
}); 