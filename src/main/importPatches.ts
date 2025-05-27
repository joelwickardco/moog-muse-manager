import path from 'path';
import fs from 'fs/promises';
import { Patch, DatabaseManager, calculateChecksum } from './database';

export async function importPatchesFromDirectory(rootDir: string, libraryName: string, dbManager: DatabaseManager): Promise<Patch[]> {
  // If library/ exists, use it as the root
  const libraryPath = path.join(rootDir, 'library');
  const libraryExists = await fs.stat(libraryPath).catch(() => false);
  if (libraryExists && (await fs.stat(libraryPath)).isDirectory()) {
    rootDir = libraryPath;
  }

  const patches: Patch[] = [];
  // Get all directories that contain a .bank file
  const bankDirs = await fs.readdir(rootDir);
  const bankDirsWithBank = await Promise.all(
    bankDirs.map(async (file) => {
      const fullPath = path.join(rootDir, file);
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) return null;
      const contents = await fs.readdir(fullPath);
      return contents.some(f => f.endsWith('.bank')) ? file : null;
    })
  ).then(results => results.filter(Boolean) as string[])
    .then(results => results.sort());

  for (const bankDir of bankDirsWithBank) {
    const bankPath = path.join(rootDir, bankDir);
    // Get the bank name from the .bank file instead of the directory
    const bankFiles = await fs.readdir(bankPath);
    const bankFile = bankFiles.find(f => f.endsWith('.bank'));
    if (!bankFile) {
      continue;
    }
    const bankName = bankFile.replace('.bank', '');
    const isCustom = bankName.toLowerCase().startsWith('user');

    // Create or get bank
    await dbManager.saveBank({
      name: bankName,
      library: libraryName,
      custom: isCustom
    });

    const patchDirs = await fs.readdir(bankPath);
    const patchDirsFiltered = patchDirs.filter(dir => dir.startsWith('patch'));

    for (const patchDir of patchDirsFiltered) {
      const patchPath = path.join(bankPath, patchDir);
      const patchFiles = await fs.readdir(patchPath);
      const mmpFiles = patchFiles.filter(file => file.endsWith('.mmp'));

      for (const patchFile of mmpFiles) {
        const fullPath = path.join(patchPath, patchFile);
        const checksum = calculateChecksum(fullPath);
        // Skip if patch already exists
        if (await dbManager.patchExists(checksum)) {
          continue;
        }
        const patch = {
          path: fullPath,
          name: path.basename(patchFile, '.mmp'),
          loved: false,
          category: '',
          tags: [bankName],
          bank: bankName,
          library: libraryName,
          checksum,
          custom: isCustom
        };
        patches.push(patch);
      }
    }
  }

  // Save patches to database
  if (patches.length > 0) {
    dbManager.savePatches(patches);
    // Associate patches with their banks after saving
    for (const patch of patches) {
      const banks = await dbManager.getBanks();
      const bank = banks.find(b => b.name === patch.bank && b.library === patch.library);
      if (bank?.id) {
        await dbManager.associatePatchWithBank!(patch.path, bank.id);
      }
    }
  }

  return patches;
} 