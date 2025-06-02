import * as path from 'path';
import fs from 'fs/promises';
import { LibraryManager } from '../database/libraries';
import { BankManager } from '../database/banks';
import { PatchManager } from '../database/patches';
import { PatchSequenceManager } from '../database/patch-sequences';

export async function exportLibrary(
  libraryId: number,
  exportDir: string,
  libraryManager: LibraryManager,
  bankManager: BankManager,
  patchManager: PatchManager,
  patchSequenceManager: PatchSequenceManager
): Promise<void> {
  try {
    // Get library details
    const library = await libraryManager.getById(libraryId);
    if (!library) {
      throw new Error(`Library with ID ${libraryId} not found`);
    }

    // Create root directory
    const rootDir = path.join(exportDir, library.name);
    await fs.mkdir(rootDir, { recursive: true });

    // Create library directory
    const libraryDir = path.join(rootDir, 'library');
    await fs.mkdir(libraryDir, { recursive: true });

    // Create sequences directory
    const sequencesDir = path.join(libraryDir, 'sequences');
    await fs.mkdir(sequencesDir, { recursive: true });

    // Get all banks for this library
    const banks = await bankManager.getBanksByLibrary(libraryId);
    const bankMap = new Map(banks.map(bank => [bank.system_name, bank]));

    // Create all 16 bank directories
    for (let i = 1; i <= 16; i++) {
      const bankDirName = `bank${padNumber(i)}`;
      const bankDir = path.join(libraryDir, bankDirName);
      await fs.mkdir(bankDir, { recursive: true });

      const bank = bankMap.get(bankDirName);
      if (bank) {
        // Create bank file
        const bankFileName = `${bank.name}.bank`;
        await fs.writeFile(
          path.join(bankDir, bankFileName),
          bank.file_content || Buffer.from('')
        );

        // Get and export patches for this bank
        const patches = await patchManager.getPatchesByBank(bank.id);
        for (let j = 1; j <= 16; j++) {
          const patchDirName = `patch${padNumber(j)}`;
          const patchDir = path.join(bankDir, patchDirName);
          await fs.mkdir(patchDir, { recursive: true });

          const patch = patches[j - 1];
          if (patch) {
            // Create patch file
            const patchFileName = `${patch.name}.mmp`;
            await fs.writeFile(
              path.join(patchDir, patchFileName),
              patch.content
            );
          }
        }
      }
    }

    // Export sequences
    for (let i = 1; i <= 16; i++) {
      const seqBankDirName = `bank${padNumber(i)}`;
      const seqBankDir = path.join(sequencesDir, seqBankDirName);
      await fs.mkdir(seqBankDir, { recursive: true });

      const bank = bankMap.get(seqBankDirName);
      if (bank) {
        const sequences = await patchSequenceManager.getSequencesByBank(bank.id);
        for (let j = 1; j <= 16; j++) {
          const seqDirName = `seq${padNumber(j)}`;
          const seqDir = path.join(seqBankDir, seqDirName);
          await fs.mkdir(seqDir, { recursive: true });

          const sequence = sequences[j - 1];
          if (sequence) {
            // Create sequence file
            const sequenceFileName = `${sequence.name}.mmseq`;
            await fs.writeFile(
              path.join(seqDir, sequenceFileName),
              sequence.content
            );
          }
        }
      }
    }

    console.log(`Library exported successfully to ${rootDir}`);
  } catch (error) {
    console.error('Error exporting library:', error);
    throw error;
  }
}

// Helper function to pad numbers with leading zeros
function padNumber(num: number): string {
  return num.toString().padStart(2, '0');
} 