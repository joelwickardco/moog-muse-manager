import * as path from 'path';
import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Library } from '../entities/library.entity';
import { Bank } from '../entities/bank.entity';
import { Patch } from '../entities/patch.entity';
import { PatchSequence } from '../entities/patch-sequence.entity';
import { padNumber } from '../utils';

interface ImportResult {
  success: boolean;
  message?: string;
  libraryId?: number;
}

export async function importLibrary(
  rootDir: string,
  dataSource: DataSource
): Promise<ImportResult> {
  try {
    // Initialize repositories
    const libraryRepo = dataSource.getRepository(Library);
    const bankRepo = dataSource.getRepository(Bank);
    const patchRepo = dataSource.getRepository(Patch);
    const sequenceRepo = dataSource.getRepository(PatchSequence);

    // Validate library structure first
    const libraryDir = path.join(rootDir, 'library');
    await validateDirectory(libraryDir);

    // Calculate library fingerprint
    const fingerprint = await calculateDirectoryFingerprint(libraryDir);

    // Check if library already exists
    const existingLibrary = await libraryRepo.findOneBy({ fingerprint: fingerprint });
    if (existingLibrary) {
      return { success: false, message: 'Library already exists' };
    }

    // Validate all bank directories first
    for (let bankNum = 1; bankNum <= 16; bankNum++) {
      const bankDirName = `bank${bankNum.toString().padStart(2, '0')}`;
      const bankDir = path.join(libraryDir, bankDirName);
      await validateDirectory(bankDir);
    }

    // Validate sequence banks directory
    const sequencesDir = path.join(libraryDir, 'sequences');
    await validateDirectory(sequencesDir);

    // Validate all sequence bank directories
    for (let bankNum = 1; bankNum <= 16; bankNum++) {
      const seqBankDirName = `bank${bankNum.toString().padStart(2, '0')}`;
      const seqBankDir = path.join(sequencesDir, seqBankDirName);
      await validateDirectory(seqBankDir);
    }

    // Now validate patches and sequences
    // Create library
    const libraryName = path.basename(rootDir);
    const library = await libraryRepo.create({
      name: libraryName,
      fingerprint
    });

    await libraryRepo.save(library);

    // Process banks
    for (let bankNum = 1; bankNum <= 16; bankNum++) {
      const bankDirName = `bank${padNumber(bankNum)}`;
      const bankDir = path.join(libraryDir, bankDirName);

      const patchBank = await processBank(bankDir, bankNum, bankRepo, 'patch', library);

      // Process patches
      for (let patchNum = 1; patchNum <= 16; patchNum++) {
        const patchDirName = `patch${padNumber(patchNum)}`;
        const patchDir = path.join(bankDir, patchDirName);
        await validateDirectory(patchDir);

        // Find .mmp file
        const patchFiles = await fs.readdir(patchDir);
        const patchFile = patchFiles.find(f => f.endsWith('.mmp'));
        let patch = null;

        if (patchFile) {
          // Read patch file content
          const patchFilePath = path.join(patchDir, patchFile);
          const patchContent = await fs.readFile(patchFilePath, 'utf-8');
          const patchName = path.basename(patchFile, '.mmp');
          const patchFingerprint = createHash('sha256').update(patchContent).digest('hex');
          const tags = getImplicitTags(patchName, patchBank.name);

          // Create patch
          patch = await patchRepo.create({
            patch_number: patchNum,
            bank_id: patchBank.id,
            name: patchName,
            content: patchContent,
            fingerprint: patchFingerprint,
            default_patch: false,
            favorited: false,
            tagsArray: tags
          });
        } else {
          // Create default patch
          patch = await patchRepo.create({
            patch_number: patchNum,
            bank_id: patchBank.id,
            name: 'Default Patch',
            fingerprint: createHash('sha256').update(`${patchBank.id}-${patchNum}`).digest('hex'),
            default_patch: true,
            favorited: false,
            tags: ''
          });
        }
        await patchRepo.save(patch);
      }
    }

    // Process sequences
    if (await fs.stat(sequencesDir).then(s => s.isDirectory()).catch(() => false)) {
      for (let bankNum = 1; bankNum <= 16; bankNum++) {
        const seqBankDirName = `bank${padNumber(bankNum)}`;
        const seqBankDir = path.join(sequencesDir, seqBankDirName);

        const sequenceBank = await processBank(seqBankDir, bankNum, bankRepo, 'sequence', library);
        

        // Process sequences
        for (let seqNum = 1; seqNum <= 16; seqNum++) {
          const seqDirName = `seq${padNumber(seqNum)}`;
          const seqDir = path.join(seqBankDir, seqDirName);
          await validateDirectory(seqDir);

          // Find .mmseq file
          const seqFiles = await fs.readdir(seqDir);
          const seqFile = seqFiles.find(f => f.endsWith('.mmseq'));

          if (seqFile) {
            // Read sequence file content
            const seqFilePath = path.join(seqDir, seqFile);
            const seqContent = await fs.readFile(seqFilePath, 'utf-8');
            const seqName = path.basename(seqFile, '.mmseq');
            const seqFingerprint = createHash('sha256').update(seqContent).digest('hex');

            // Create sequence
            const sequence = await sequenceRepo.create({
              sequence_number: seqNum,
              bank_id: sequenceBank.id,
              name: seqName,
              content: seqContent,
              fingerprint: seqFingerprint
            });
            await sequenceRepo.save(sequence);
          } else {
            throw new Error(`Missing required .mmseq file in sequence directory: ${seqDirName} in sequence bank ${seqBankDirName}`);
          }
        }
      }
    }

    return { success: true, libraryId: library.id };
  } catch (error) {
    console.error('Error importing library:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to calculate directory fingerprint
async function calculateDirectoryFingerprint(dir: string): Promise<string> {
  const hash = createHash('sha256');
  const files = await getAllFiles(dir);
  
  for (const file of files.sort()) {
    const content = await fs.readFile(file);
    hash.update(content);
  }
  
  return hash.digest('hex');
}

// Helper function to get all files in a directory recursively
async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
} 

// Helper function to determine tags based on patch name
const getImplicitTags = (patchName: string, bankName: string): string[] => {
  const tags: string[] = [];

  const name = patchName.toLowerCase();
  const bank = bankName.toLowerCase();

  // Example conditions for adding tags
  if (name.includes('bass') || bank.includes('bass')) {
    tags.push('bass');
  }
  if (name.includes('lead') || bank.includes('lead')) {
    tags.push('lead');
  }
  if (name.includes('pad') || bank.includes('pad')) {
    tags.push('pad');
  }
  if (name.includes('string') || bank.includes('string')) {
    tags.push('strings');
  }
  if (name.includes('pluck') || bank.includes('pluck')) {
    tags.push('pluck');
  }
  // Add more conditions as needed

  return tags;
};

const processBank = async (bankDir: string, bankNum: number, bankRepo: Repository<Bank>, bankType: string,  library: Library): Promise<Bank> => {
  await validateDirectory(bankDir);

  // Find .bank file
  const bankFiles = await fs.readdir(bankDir);
  const bankFile = bankFiles.find(f => f.endsWith('.bank'));
  if (!bankFile) {
    throw new Error(`Missing .bank file in directory: ${bankDir}`);
  }

  // Read bank file content
  const bankFilePath = path.join(bankDir, bankFile);
  const bankContent = await fs.readFile(bankFilePath);
  const bankName = path.basename(bankFile, '.bank');
  const bankFingerprint = await calculateDirectoryFingerprint(bankDir);

  // Create bank
  const bank = await bankRepo.create({
    bank_number: bankNum,
    library_id: library.id,
    name: bankName,
    type: bankType as 'patch' | 'sequence',
    content: bankContent,
    fingerprint: bankFingerprint
  });

  await bankRepo.save(bank);
  return bank;
};

// Helper function to validate directory exists
async function validateDirectory(dir: string): Promise<void> {
  if (!await fs.stat(dir).then(s => s.isDirectory()).catch(() => false)) {
    throw new Error(`Missing required directory: ${dir}`);
  }
}