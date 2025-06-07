import * as path from 'path';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import { DataSource } from 'typeorm';
import { importLibrary } from '../../services/importLibrary';
import { Library } from '../../entities/library.entity';
import { Bank } from '../../entities/bank.entity';
import { Patch } from '../../entities/patch.entity';
import { PatchSequence } from '../../entities/patch-sequence.entity';

describe('ImportLibrary Service', () => {
  let dataSource: DataSource;
  let testDir: string;
  let libraryRepo: any;
  let bankRepo: any;
  let patchRepo: any;
  let sequenceRepo: any;

  beforeEach(async () => {
    // Mock DataSource and repositories
    dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Library) {
          return libraryRepo;
        } else if (entity === Bank) {
          return bankRepo;
        } else if (entity === Patch) {
          return patchRepo;
        } else if (entity === PatchSequence) {
          return sequenceRepo;
        }
        return null;
      })
    } as unknown as DataSource;

    // Mock repository methods
    libraryRepo = {
      create: jest.fn().mockReturnValue({ id: 'test-library-id', name: 'test-library' }),
      save: jest.fn().mockResolvedValue({ id: 'test-library-id', name: 'test-library' }),
      findOneBy: jest.fn().mockResolvedValue(null)
    };

    bankRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: `bank-${data.bank_number}`, ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data))
    };

    patchRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: `patch-${data.patch_number}`, ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data))
    };

    sequenceRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: `sequence-${data.sequence_number}`, ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data))
    };

    // Create test directory
    testDir = path.join(__dirname, 'test-library');
    fsSync.mkdirSync(testDir, { recursive: true });
    await createTestLibraryStructure(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('importLibrary', () => {
    it('should successfully import a valid library', async () => {
      const result = await importLibrary(testDir, dataSource);

      expect(result.success).toBe(true);
      expect(result.libraryId).toBe('test-library-id');

      // Verify library was created
      expect(libraryRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test-library'
      }));
      expect(libraryRepo.save).toHaveBeenCalled();

      // Verify banks were created (16 patch banks + 16 sequence banks)
      expect(bankRepo.create).toHaveBeenCalledTimes(32);
      expect(bankRepo.save).toHaveBeenCalledTimes(32);

      // Verify patches were created
      expect(patchRepo.create).toHaveBeenCalled();
      expect(patchRepo.save).toHaveBeenCalled();

      // Verify sequences were created
      expect(sequenceRepo.create).toHaveBeenCalled();
      expect(sequenceRepo.save).toHaveBeenCalled();
    });

    it('should fail when importing an invalid library structure', async () => {
      const invalidDir = path.join(testDir, 'invalid');
      await fs.mkdir(invalidDir);

      const result = await importLibrary(invalidDir, dataSource);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required directory');
    });

    it('should fail when a bank file is missing', async () => {
      // Create a library structure with a bank directory but no .bank file
      const incompleteDir = path.join(testDir, 'incomplete-bank');
      const libraryDir = path.join(incompleteDir, 'library');
      await fs.mkdir(libraryDir, { recursive: true });

      // Create bank01 directory but no .bank file
      const bankDir = path.join(libraryDir, 'bank01');
      await fs.mkdir(bankDir, { recursive: true });

      // Create all other required banks and patches
      for (let bankNum = 2; bankNum <= 16; bankNum++) {
        const otherBankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(otherBankDir, { recursive: true });
        await fs.writeFile(path.join(otherBankDir, 'test.bank'), `test bank content ${bankNum}`);
        for (let patchNum = 1; patchNum <= 16; patchNum++) {
          const patchDir = path.join(otherBankDir, `patch${padNumber(patchNum)}`);
          await fs.mkdir(patchDir, { recursive: true });
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
        }
      }

      // Create sequences directory and all required sequence banks and sequences
      const sequencesDir = path.join(libraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const seqBankDir = path.join(sequencesDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(seqBankDir, { recursive: true });
        for (let seqNum = 1; seqNum <= 16; seqNum++) {
          const seqDir = path.join(seqBankDir, `seq${padNumber(seqNum)}`);
          await fs.mkdir(seqDir, { recursive: true });
          await fs.writeFile(path.join(seqDir, 'test.mmseq'), `test sequence content ${bankNum}-${seqNum}`);
        }
      }

      const result = await importLibrary(incompleteDir, dataSource);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing .bank file in directory');
    });

    it('should fail when a patch directory is missing', async () => {
      // Create a library structure with a missing patch directory
      const incompleteDir = path.join(testDir, 'incomplete-patch');
      const libraryDir = path.join(incompleteDir, 'library');
      await fs.mkdir(libraryDir, { recursive: true });

      // Create bank01 with only patch01, skipping patch02
      const bankDir = path.join(libraryDir, 'bank01');
      await fs.mkdir(bankDir, { recursive: true });
      await fs.writeFile(path.join(bankDir, 'test.bank'), 'test bank content 1');
      const patch1Dir = path.join(bankDir, 'patch01');
      await fs.mkdir(patch1Dir, { recursive: true });
      await fs.writeFile(path.join(patch1Dir, 'test1.mmp'), 'test patch 1 content');

      // Create all other required banks and patches
      for (let bankNum = 2; bankNum <= 16; bankNum++) {
        const otherBankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(otherBankDir, { recursive: true });
        await fs.writeFile(path.join(otherBankDir, 'test.bank'), `test bank content ${bankNum}`);
        for (let patchNum = 1; patchNum <= 16; patchNum++) {
          const patchDir = path.join(otherBankDir, `patch${padNumber(patchNum)}`);
          await fs.mkdir(patchDir, { recursive: true });
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
        }
      }

      // Create sequences directory and all required sequence banks and sequences
      const sequencesDir = path.join(libraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const seqBankDir = path.join(sequencesDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(seqBankDir, { recursive: true });
        for (let seqNum = 1; seqNum <= 16; seqNum++) {
          const seqDir = path.join(seqBankDir, `seq${padNumber(seqNum)}`);
          await fs.mkdir(seqDir, { recursive: true });
          await fs.writeFile(path.join(seqDir, 'test.mmseq'), `test sequence content ${bankNum}-${seqNum}`);
        }
      }

      const result = await importLibrary(incompleteDir, dataSource);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required directory');
    });

    it('should fail when a sequence bank directory is missing', async () => {
      // Create a library structure with a missing sequence bank directory
      const incompleteDir = path.join(testDir, 'incomplete-seq-bank');
      const libraryDir = path.join(incompleteDir, 'library');
      await fs.mkdir(libraryDir, { recursive: true });

      // Create all required banks and patches
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const bankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(bankDir, { recursive: true });
        await fs.writeFile(path.join(bankDir, 'test.bank'), `test bank content ${bankNum}`);
        for (let patchNum = 1; patchNum <= 16; patchNum++) {
          const patchDir = path.join(bankDir, `patch${padNumber(patchNum)}`);
          await fs.mkdir(patchDir, { recursive: true });
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
        }
      }

      // Create sequences directory with only bank01, skipping bank02
      const sequencesDir = path.join(libraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });
      const seqBankDir = path.join(sequencesDir, 'bank01');
      await fs.mkdir(seqBankDir, { recursive: true });
      for (let seqNum = 1; seqNum <= 16; seqNum++) {
        const seqDir = path.join(seqBankDir, `seq${padNumber(seqNum)}`);
        await fs.mkdir(seqDir, { recursive: true });
        await fs.writeFile(path.join(seqDir, 'test.mmseq'), `test sequence content 1-${seqNum}`);
      }

      const result = await importLibrary(incompleteDir, dataSource);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required directory');
    });

    it('should fail when a sequence directory is missing', async () => {
      // Create a library structure with a missing sequence directory
      const incompleteDir = path.join(testDir, 'incomplete-seq');
      const libraryDir = path.join(incompleteDir, 'library');
      await fs.mkdir(libraryDir, { recursive: true });

      // Create all required banks and patches
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const bankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(bankDir, { recursive: true });
        await fs.writeFile(path.join(bankDir, 'test.bank'), `test bank content ${bankNum}`);
        for (let patchNum = 1; patchNum <= 16; patchNum++) {
          const patchDir = path.join(bankDir, `patch${padNumber(patchNum)}`);
          await fs.mkdir(patchDir, { recursive: true });
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
        }
      }

      // Create sequences directory with bank01
      const sequencesDir = path.join(libraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });
      const seqBankDir = path.join(sequencesDir, 'bank01');
      await fs.mkdir(seqBankDir, { recursive: true });

      // Create only seq01, skipping seq02
      const seqDir = path.join(seqBankDir, 'seq01');
      await fs.mkdir(seqDir, { recursive: true });
      await fs.writeFile(path.join(seqDir, 'test.mmseq'), 'test sequence content 1-1');

      const result = await importLibrary(incompleteDir, dataSource);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required directory');
    });

    it('should fail when a sequence file is missing', async () => {
      // Create a library structure with a missing sequence file
      const incompleteDir = path.join(testDir, 'incomplete-seq-file');
      const libraryDir = path.join(incompleteDir, 'library');
      await fs.mkdir(libraryDir, { recursive: true });

      // Create all required banks and patches
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const bankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(bankDir, { recursive: true });
        await fs.writeFile(path.join(bankDir, 'test.bank'), `test bank content ${bankNum}`);
        for (let patchNum = 1; patchNum <= 16; patchNum++) {
          const patchDir = path.join(bankDir, `patch${padNumber(patchNum)}`);
          await fs.mkdir(patchDir, { recursive: true });
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
        }
      }

      // Create sequences directory with all banks
      const sequencesDir = path.join(libraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const seqBankDir = path.join(sequencesDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(seqBankDir, { recursive: true });
        await fs.writeFile(path.join(seqBankDir, 'test.bank'), `test sequence bank content ${bankNum}`);
        
        // Create all sequence directories
        for (let seqNum = 1; seqNum <= 16; seqNum++) {
          const seqDir = path.join(seqBankDir, `seq${padNumber(seqNum)}`);
          await fs.mkdir(seqDir, { recursive: true });
          // Skip creating .mmseq file for seq01 in bank01
          if (!(bankNum === 1 && seqNum === 1)) {
            await fs.writeFile(path.join(seqDir, 'test.mmseq'), `test sequence content ${bankNum}-${seqNum}`);
          }
        }
      }

      const result = await importLibrary(incompleteDir, dataSource);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required .mmseq file');
    });

    it('should not import duplicate libraries', async () => {
      // Mock findOneBy to return an existing library on the second call
      libraryRepo.findOneBy
        .mockResolvedValueOnce(null)  // First call: no existing library
        .mockResolvedValueOnce({ id: 'existing-library-id', name: 'test-library' });  // Second call: library exists

      // First import
      const result1 = await importLibrary(testDir, dataSource);
      expect(result1.success).toBe(true);

      // Second import of the same library
      const result2 = await importLibrary(testDir, dataSource);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('Library already exists');
    });

    it('should handle missing patch files by creating default patches', async () => {
      // Create a library structure with a missing patch file
      const incompleteDir = path.join(testDir, 'incomplete-patch-file');
      const libraryDir = path.join(incompleteDir, 'library');
      await fs.mkdir(libraryDir, { recursive: true });

      // Create bank01 with all patch directories, but patch01 has no .mmp file
      const bankDir = path.join(libraryDir, 'bank01');
      await fs.mkdir(bankDir, { recursive: true });
      await fs.writeFile(path.join(bankDir, 'test.bank'), 'test bank content 1');
      for (let patchNum = 1; patchNum <= 16; patchNum++) {
        const patchDir = path.join(bankDir, `patch${padNumber(patchNum)}`);
        await fs.mkdir(patchDir, { recursive: true });
        if (patchNum !== 1) {
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content 1-${patchNum}`);
        }
      }

      // Create all other required banks and patches
      for (let bankNum = 2; bankNum <= 16; bankNum++) {
        const otherBankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(otherBankDir, { recursive: true });
        await fs.writeFile(path.join(otherBankDir, 'test.bank'), `test bank content ${bankNum}`);
        for (let patchNum = 1; patchNum <= 16; patchNum++) {
          const patchDir = path.join(otherBankDir, `patch${padNumber(patchNum)}`);
          await fs.mkdir(patchDir, { recursive: true });
          await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
        }
      }

      // Create sequences directory and all required sequence banks and sequences
      const sequencesDir = path.join(libraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const seqBankDir = path.join(sequencesDir, `bank${padNumber(bankNum)}`);
        await fs.mkdir(seqBankDir, { recursive: true });
        await fs.writeFile(path.join(seqBankDir, 'test.bank'), `test sequence bank content ${bankNum}`);
        for (let seqNum = 1; seqNum <= 16; seqNum++) {
          const seqDir = path.join(seqBankDir, `seq${padNumber(seqNum)}`);
          await fs.mkdir(seqDir, { recursive: true });
          await fs.writeFile(path.join(seqDir, 'test.mmseq'), `test sequence content ${bankNum}-${seqNum}`);
        }
      }

      // Mock the patchRepo to handle default patch creation
      patchRepo.create.mockImplementationOnce((data: { patch_number: number; default_patch: boolean }) => ({
        id: `patch-${data.patch_number}`,
        ...data,
        default_patch: true
      }));

      const result = await importLibrary(incompleteDir, dataSource);
      expect(result.success).toBe(true);

      // Verify that a default patch was created
      expect(patchRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        patch_number: 1,
        default_patch: true
      }));
    });
  });
});

function padNumber(num: number): string {
  return num.toString().padStart(2, '0');
}

async function createTestLibraryStructure(rootDir: string): Promise<void> {
  const libraryDir = path.join(rootDir, 'library');
  await fs.mkdir(libraryDir, { recursive: true });

  // Create banks and patches
  for (let bankNum = 1; bankNum <= 16; bankNum++) {
    const bankDir = path.join(libraryDir, `bank${padNumber(bankNum)}`);
    await fs.mkdir(bankDir, { recursive: true });
    await fs.writeFile(path.join(bankDir, 'test.bank'), `test bank content ${bankNum}`);
    for (let patchNum = 1; patchNum <= 16; patchNum++) {
      const patchDir = path.join(bankDir, `patch${padNumber(patchNum)}`);
      await fs.mkdir(patchDir, { recursive: true });
      await fs.writeFile(path.join(patchDir, 'test.mmp'), `test patch content ${bankNum}-${patchNum}`);
    }
  }

  // Create sequences
  const sequencesDir = path.join(libraryDir, 'sequences');
  await fs.mkdir(sequencesDir, { recursive: true });
  for (let bankNum = 1; bankNum <= 16; bankNum++) {
    const seqBankDir = path.join(sequencesDir, `bank${padNumber(bankNum)}`);
    await fs.mkdir(seqBankDir, { recursive: true });
    await fs.writeFile(path.join(seqBankDir, 'test.bank'), `test sequence bank content ${bankNum}`);
    for (let seqNum = 1; seqNum <= 16; seqNum++) {
      const seqDir = path.join(seqBankDir, `seq${padNumber(seqNum)}`);
      await fs.mkdir(seqDir, { recursive: true });
      await fs.writeFile(path.join(seqDir, 'test.mmseq'), `test sequence content ${bankNum}-${seqNum}`);
    }
  }
} 