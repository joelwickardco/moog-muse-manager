import * as path from 'path';
import * as fs from 'fs/promises';
import { DataSource } from 'typeorm';
import { LibraryRepository } from '../repositories/library.repository';
import { BankRepository } from '../repositories/bank.repository';
import { PatchRepository } from '../repositories/patch.repository';
import { PatchSequenceRepository } from '../repositories/patch-sequence.repository';

interface ExportResult {
  success: boolean;
  message?: string;
  exportPath?: string;
}

export async function exportLibrary(
  libraryId: number,
  targetDir: string,
  dataSource: DataSource
): Promise<ExportResult> {
  try {
    // Initialize repositories
    const libraryRepo = new LibraryRepository(dataSource);
    const bankRepo = new BankRepository(dataSource);
    const patchRepo = new PatchRepository(dataSource);
    const sequenceRepo = new PatchSequenceRepository(dataSource);

    // Get library
    const library = await libraryRepo.findOne(libraryId);
    if (!library) {
      return {
        success: false,
        message: 'Library not found'
      };
    }

    // Create library directory
    const libraryDir = path.join(targetDir, library.name);
    await fs.mkdir(libraryDir, { recursive: true });

    // Create library/library directory
    const innerLibraryDir = path.join(libraryDir, 'library');
    await fs.mkdir(innerLibraryDir, { recursive: true });

    // Get all banks
    const banks = await bankRepo.findByLibraryId(libraryId);
    if (banks.length !== 32) { // 16 patch banks + 16 sequence banks
      return {
        success: false,
        message: 'Invalid number of banks found'
      };
    }

    // Process patch banks
    const patchBanks = banks.filter(bank => bank.type === 'patch');
    for (const bank of patchBanks) {
      const bankDir = path.join(innerLibraryDir, bank.system_name);
      await fs.mkdir(bankDir, { recursive: true });

      // Write bank file
      if (!bank.content) {
        return {
          success: false,
          message: `Missing bank content for ${bank.system_name}`
        };
      }
      const bankFilePath = path.join(bankDir, `${bank.name}.bank`);
      await fs.writeFile(bankFilePath, bank.content);

      // Get patches for this bank
      const patches = await patchRepo.findByBankId(bank.id);
      if (patches.length !== 16) {
        return {
          success: false,
          message: `Invalid number of patches found in bank ${bank.system_name}`
        };
      }

      // Process patches
      for (const patch of patches) {
        const patchDir = path.join(bankDir, `patch${padNumber(patch.patch_number)}`);
        await fs.mkdir(patchDir, { recursive: true });

        // Write patch file if not default
        if (!patch.default_patch && patch.content) {
          const patchFilePath = path.join(patchDir, `${patch.name}.mmp`);
          await fs.writeFile(patchFilePath, patch.content);
        }
      }
    }

    // Process sequence banks
    const sequenceBanks = banks.filter(bank => bank.type === 'sequence');
    const sequencesDir = path.join(innerLibraryDir, 'sequences');
    await fs.mkdir(sequencesDir, { recursive: true });

    for (const bank of sequenceBanks) {
      const seqBankDir = path.join(sequencesDir, bank.system_name);
      await fs.mkdir(seqBankDir, { recursive: true });

      // Get sequences for this bank
      const sequences = await sequenceRepo.findByBankId(bank.id);
      if (sequences.length !== 16) {
        return {
          success: false,
          message: `Invalid number of sequences found in bank ${bank.system_name}`
        };
      }

      // Process sequences
      for (const sequence of sequences) {
        const seqDir = path.join(seqBankDir, `seq${padNumber(sequence.sequence_number)}`);
        await fs.mkdir(seqDir, { recursive: true });

        // Write sequence file
        if (sequence.content) {
          const seqFilePath = path.join(seqDir, `${sequence.name}.mmseq`);
          await fs.writeFile(seqFilePath, sequence.content);
        } else {
          return {
            success: false,
            message: `Missing sequence content in ${seqDir}`
          };
        }
      }
    }

    return {
      success: true,
      exportPath: libraryDir
    };
  } catch (error) {
    console.error('Error exporting library:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to pad numbers with leading zeros
function padNumber(num: number): string {
  return num.toString().padStart(2, '0');
} 