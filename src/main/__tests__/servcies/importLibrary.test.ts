import path from 'path';
import fs from 'fs/promises';
import { importLibrary } from '../../services/importLibrary';
import { LibraryManager } from '../../database/libraries';
import { BankManager } from '../../database/banks';
import { PatchManager } from '../../database/patches';
import { PatchSequenceManager } from '../../database/patch-sequences';

const TEST_DB_PATH = path.join(__dirname, 'test-import.db');
const TEST_ZIP_PATH = path.join(__dirname, '../fixtures', 'sample-library');

describe('importLibrary integration (no mocks)', () => {
  let libraryManager: LibraryManager;
  let bankManager: BankManager;
  let patchManager: PatchManager;
  let patchSequenceManager: PatchSequenceManager;

  beforeAll(async () => {
    // Create a clean SQLite DB
    await fs.rm(TEST_DB_PATH, { force: true });

    // Instantiate real managers
    libraryManager = new LibraryManager(TEST_DB_PATH);
    await libraryManager.initialize();
    bankManager = new BankManager(TEST_DB_PATH);
    await bankManager.initialize();
    patchManager = new PatchManager(TEST_DB_PATH);
    await patchManager.initialize();
    patchSequenceManager = new PatchSequenceManager(TEST_DB_PATH);
    await patchSequenceManager.initialize();
  });

  afterAll(() => {
    libraryManager.close();
    bankManager.close();
    patchManager.close();
    patchSequenceManager.close();
    fs.rm(TEST_DB_PATH, { force: true });
  });

  it('should successfully import the sample library', async () => {
    console.log(TEST_ZIP_PATH);
    const result = await importLibrary(
      TEST_ZIP_PATH,
      libraryManager,
      bankManager,
      patchManager,
      patchSequenceManager
    );

    console.log("result", result);

    expect(result.success).toBe(true);
    expect(result.imported.libraries).toBe(1);
    expect(result.imported.banks).toBeGreaterThanOrEqual(1);
    expect(result.imported.patches).toBeGreaterThanOrEqual(1);
    expect(result.imported.sequences).toBeGreaterThanOrEqual(1);

    const libs = await libraryManager.getAll();
    const banks = await bankManager.getAll();
    const patches = await patchManager.getAll();
    const sequences = await patchSequenceManager.getAll();

    expect(libs.length).toBe(1);
    expect(banks.length).toBeGreaterThanOrEqual(1);
    expect(patches.length).toBeGreaterThanOrEqual(1);
    expect(sequences.length).toBeGreaterThanOrEqual(1);
  });
});