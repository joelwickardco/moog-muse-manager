import * as path from 'path';
import * as fs from 'fs/promises';
import { DataSource, In } from 'typeorm';
import { Library } from '../entities/library.entity';
import { Bank } from '../entities/bank.entity';
import { Patch } from '../entities/patch.entity';
import { PatchSequence } from '../entities/patch-sequence.entity';

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
    const libraryRepo = dataSource.getRepository(Library);
    const bankRepo = dataSource.getRepository(Bank);
    const patchRepo = dataSource.getRepository(Patch);
    const sequenceRepo = dataSource.getRepository(PatchSequence);

    // Get library
    const library = await libraryRepo.findOneBy({ id: libraryId });
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
    const banks = await bankRepo.find({ where: { library: { id: libraryId } } });
    if (banks.length !== 32) { // 16 patch banks + 16 sequence banks
      return {
        success: false,
        message: 'Invalid number of banks found'
      };
    }

    // Create bank directories and export patches
    for (const bank of banks) {
      const bankDir = path.join(innerLibraryDir, bank.name);
      await fs.mkdir(bankDir, { recursive: true });

      // Export patches for this bank
      const patches = await patchRepo.find({
        where: { bank_id: bank.id },
        order: { patch_number: 'ASC' }
      });

      if (!bank.content) {
        throw new Error(`Missing bank content for ${bank.name}`);
      }

      // Verify we have the correct number of patches
      if (patches.length !== 16) {
        throw new Error(
          `Invalid number of patches found in bank ${bank.name} (expected 16)`
        );
      }

      // Export each patch
      for (const patch of patches) {
        const patchFile = path.join(bankDir, `${patch.patch_number.toString().padStart(2, '0')}.syx`);
        await fs.writeFile(patchFile, patch.content);
      }
    }

    // Export sequences if any exist
    const sequences = await sequenceRepo.find({
      where: { bank_id: In(banks.map(b => b.id)) }
    });

    if (sequences.length > 0) {
      const sequencesDir = path.join(innerLibraryDir, 'sequences');
      await fs.mkdir(sequencesDir, { recursive: true });

      // Group sequences by bank
      for (const bank of banks) {
        const seqBankDir = path.join(sequencesDir, bank.name);
        await fs.mkdir(seqBankDir, { recursive: true });

        const bankSequences = sequences.filter(s => s.bank_id === bank.id);

        // Verify we have the correct number of sequences
        if (bankSequences.length !== 16) {
          throw new Error(
            `Invalid number of sequences found in bank ${bank.name} (expected 16)`
          );
        }

        // Export each sequence
        for (const sequence of bankSequences) {
          const sequenceFile = path.join(seqBankDir, `${sequence.sequence_number.toString().padStart(2, '0')}.syx`);
          await fs.writeFile(sequenceFile, sequence.content);
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