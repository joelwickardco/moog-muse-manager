import { ipcMain } from 'electron';
import { createReadStream } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as unzipper from 'unzipper';
import { LibraryManager } from '../database/libraries';
import { BankManager } from '../database/banks';
import { PatchManager } from '../database/patches';
import { PatchSequenceManager } from '../database/patch-sequences';
import { calculateSHA256 } from '../utils';
import { access } from 'fs/promises';
import fs from 'fs/promises';

// Helper function to convert fs.promises to fs
const fsPromises = {
  mkdir: fs.mkdir,
  readdir: fs.readdir,
  readFile: fs.readFile,
  rmdir: fs.rmdir,
  access: fs.access
} as const;

interface ImportLibraryParams {
  zipPath: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    libraries: number;
    banks: number;
    patches: number;
    sequences: number;
  };
}

export async function importLibrary(libraryPath: string, libraryManager: LibraryManager, bankManager: BankManager, patchManager: PatchManager, patchSequenceManager: PatchSequenceManager): Promise<ImportResult> {
  try {
    // Step 1: Extract zip file to temporary directory
    // const tempDirPath = path.join(os.tmpdir(), 'muse-library-');
    // await fsPromises.mkdir(tempDirPath, { recursive: true });
    // await extractZip(zipPath, tempDirPath);

    console.log("Importing library from: ", libraryPath);

    // Step 2: Validate library structure
    const libraryPathSub = path.join(libraryPath, 'library');
    try {
      await fs.stat(libraryPathSub);
    } catch {
      throw new Error('Invalid library format: Missing library directory');
    }
    console.log("Library directory found: ", libraryPathSub);

    // Step 3: Calculate library fingerprint
    const libraryFingerprint = await calculateSHA256(libraryPathSub);
    const libraryName = path.basename(libraryPath, path.extname(libraryPath));
    console.log(`${libraryName} fingerprint: ${libraryFingerprint}`);

    // Step 4: Check if library exists
    const existingLibrary = await libraryManager.getByFingerprint(libraryFingerprint);
    if (existingLibrary) {
      console.log(`${libraryName} already exists`);
      return {
        success: false,
        message: 'Library already exists',
        imported: {
          libraries: 0,
          banks: 0,
          patches: 0,
          sequences: 0,
        },
      };
    }

    // Step 5: Create library
    const libraryId = await libraryManager.create(libraryName, libraryFingerprint);

    // Step 6: Process banks
    const bankDirs = await fs.readdir(libraryPathSub);
    const imported = {
      libraries: 1,
      banks: 0,
      patches: 0,
      sequences: 0,
    };

    for (const bankDir of bankDirs) {
      if (!bankDir.startsWith('bank')) continue;

      const bankPath = path.join(libraryPathSub, bankDir);
      console.log(`Processing bank: ${bankPath}`);
      const files = await fs.readdir(bankPath);
      const bankFile = files.find(file => file.endsWith('.bank'));
      if (!bankFile) {
        throw new Error(`Invalid bank directory: ${bankDir} is missing .bank file`);
      }
      const bankFilePath = path.join(bankPath, bankFile);

      // Create bank
      const bankName = path.basename(bankFile, '.bank');
      const bankSystemName = bankDir;
      const bankFingerprint = await calculateSHA256(bankFilePath);
      console.log(`Creating bank: ${bankName} (${bankSystemName}) with fingerprint ${bankFingerprint}`);
      const bankId = await bankManager.create(libraryId, bankName, bankSystemName, bankFingerprint);
      imported.banks++;

      // Process patches
      const patchDirs = await fs.readdir(bankPath);
      for (const patchDir of patchDirs) {
        if (!patchDir.startsWith('patch')) continue;

        const patchPath = path.join(bankPath, patchDir);
        const files = await fs.readdir(patchPath);
        const mmpFile = files.find(file => file.endsWith('.mmp'));
        if (!mmpFile) {
          continue;
        }
        const mmpFilePath = path.join(patchPath, mmpFile);

        // Create patch
        const patchName = path.basename(mmpFile, '.mmp');
        const patchContent = await fs.readFile(mmpFilePath, 'utf8');
        const patchFingerprint = await calculateSHA256(mmpFilePath);
        console.log(`Creating patch: ${patchName} with fingerprint ${patchFingerprint}`);
        const patchId = await patchManager.create(bankId, patchName, patchFingerprint, patchContent, 0, []);
        await bankManager.associateWithPatch(bankId, patchId);
        imported.patches++;
      }
    }

    // Step 7: Process sequences
    const sequencesPath = path.join(libraryPathSub, 'sequences');
    try {
      await fsPromises.access(sequencesPath);
    } catch {
      return;
    }
    console.log("Importing sequences from: ", sequencesPath);

    const seqBankDirs = await fs.readdir(sequencesPath);
    for (const seqBankDir of seqBankDirs) {
      if (!seqBankDir.startsWith('bank')) continue;

      console.log(`Processing sequence bank: ${seqBankDir}`);

      const seqBankPath = path.join(sequencesPath, seqBankDir);
      //const bankName = seqBankDir;
      const bankSystemName = seqBankDir;
      //const bankFingerprint = await calculateSHA256(seqBankPath);
      const bank = await bankManager.getBySystemName(libraryId, bankSystemName);
      if (!bank) {
        console.log(`Sequence bank ${bankSystemName} not found`);
        continue;
      }
      
      const seqDirs = await fs.readdir(seqBankPath);
      for (const seqDir of seqDirs) {
        if (!seqDir.startsWith('seq')) continue;
        console.log(`Processing sequence: ${seqDir}`);

        const seqPath = path.join(seqBankPath, seqDir);
        const files = await fs.readdir(seqPath);
        const mmseqFile = files.find(file => file.endsWith('.mmseq'));
        if (!mmseqFile) {
          continue;
        }
        const mmseqFilePath = path.join(seqPath, mmseqFile);

        try {
          const seqContent = await fs.readFile(mmseqFilePath, 'utf8');
          const seqFingerprint = await calculateSHA256(mmseqFilePath);
          const seqName = path.basename(mmseqFile, '.mmseq');
          const seqId = await patchSequenceManager.create(seqName, seqContent, seqFingerprint);
          console.log(`Created sequence: ${seqName} with fingerprint ${seqFingerprint}`);
          await bankManager.associateWithPatchSequence(bank.id, seqId);
          imported.sequences++;
        } catch (error) {
          console.log("Failed to import sequence: ", seqDir, error);
          continue;
        }
      }
    }

    // Clean up
    // await fs.rmdir(tempDirPath, { recursive: true });

    console.log("We're Done!", imported);

    return {
      success: true,
      message: 'Library imported successfully',
      imported,
    };
  } catch (error) {
    console.error('Library import failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      imported: {
        libraries: 0,
        banks: 0,
        patches: 0,
        sequences: 0,
      },
    };
  }
}

// Register IPC handler
export function registerImportLibraryIPC(zipPath: string, libraryManager: LibraryManager, bankManager: BankManager, patchManager: PatchManager, patchSequenceManager: PatchSequenceManager) {
  ipcMain.handle('importLibrary', async (event, params: ImportLibraryParams) => {
    return importLibrary(zipPath, libraryManager, bankManager, patchManager, patchSequenceManager);
  });
}

// Helper function for zip extraction
async function extractZip(zipPath: string, outputPath: string): Promise<void> {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    // Create read stream for zip file
    const source = createReadStream(zipPath);
    
    // Extract zip contents
    const extractStream = unzipper.Extract({ path: outputPath });
    
    // Handle stream events
    await new Promise<void>((resolve, reject) => {
      source.pipe(extractStream)
        .on('finish', () => {
          source.close();
          resolve();
        })
        .on('error', (err: Error) => {
          source.close();
          reject(err);
        });
    });

    console.log('Extracted zip to', outputPath);
  } catch (error) {
    console.error('Error extracting zip:', error);
    throw error;
  }
}
