import { BaseDatabaseManager } from './base';
import { Bank, BankPatchRow, BankPatchSequenceRow } from './types';
import { NotFoundError } from './errors';


export class BankManager extends BaseDatabaseManager {
  private static readonly SQL = {
    CREATE_TABLE: `CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY,
      library_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      system_name TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
    )`,
    CREATE_INDEX: 'CREATE INDEX IF NOT EXISTS idx_banks_library_id ON banks (library_id)',
    CREATE_PATCHES_TABLE: `CREATE TABLE IF NOT EXISTS bank_patches (
      id INTEGER PRIMARY KEY,
      bank_id INTEGER NOT NULL,
      patch_id INTEGER NOT NULL,
      FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
    )`,
    CREATE_PATCH_SEQUENCES_TABLE: `CREATE TABLE IF NOT EXISTS bank_patch_sequences (
      id INTEGER PRIMARY KEY,
      bank_id INTEGER NOT NULL,
      patch_sequence_id INTEGER NOT NULL,
      FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_sequence_id) REFERENCES patch_sequences(id) ON DELETE CASCADE
    )`,
    INSERT: 'INSERT INTO banks (library_id, name, system_name, fingerprint) VALUES (?, ?, ?, ?)',
    GET_BY_ID: 'SELECT * FROM banks WHERE id = ?',
    GET_BY_SYSTEM_NAME: 'SELECT * FROM banks WHERE library_id = ? AND system_name = ?',
    GET_ALL: 'SELECT * FROM banks',
    EXISTS: 'SELECT 1 FROM banks WHERE name = ? AND library_id = ?',
    DELETE: 'DELETE FROM banks WHERE id = ?',
    UPDATE_NAME: 'UPDATE banks SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    UPDATE_SYSTEM_NAME: 'UPDATE banks SET system_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  };

  async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.run(BankManager.SQL.CREATE_TABLE);
    await this.run(BankManager.SQL.CREATE_INDEX);
    await this.run(BankManager.SQL.CREATE_PATCHES_TABLE);
    await this.run(BankManager.SQL.CREATE_PATCH_SEQUENCES_TABLE);
  }

  async cleanup(): Promise<void> {
    // Delete from child tables first to avoid foreign key constraints
    await this.run('DELETE FROM bank_patches');
    await this.run('DELETE FROM bank_patch_sequences');
    await this.run('DELETE FROM banks');
  }

  async create(libraryId: number, name: string, systemName: string, fingerprint: string): Promise<number> {
    try {
      await this.run(BankManager.SQL.INSERT, [libraryId, name, systemName, fingerprint]);
      const row = await this.get<{ id: number }>('SELECT last_insert_rowid() as id');
      if (!row) {
        throw new NotFoundError('Failed to get last inserted ID');
      }
      return row.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')) {
        throw new NotFoundError(`Bank with name ${name} or fingerprint ${fingerprint} already exists`);
      }
      throw error;
    }
  }

  async getById(id: number): Promise<Bank | undefined> {
    const row = await this.get<Bank>(BankManager.SQL.GET_BY_ID, [id]);
    return row;
  }

  async getBySystemName(libraryId: number, systemName: string): Promise<Bank | undefined> {
    const row = await this.get<Bank>(BankManager.SQL.GET_BY_SYSTEM_NAME, [libraryId, systemName]);
    return row;
  }

  async getAll(): Promise<Bank[]> {
    const rows = await this.all<Bank>(BankManager.SQL.GET_ALL);
    if (rows.length === 0) {
      throw new NotFoundError('No banks found');
    }
    return rows;
  }

  async updateName(id: number, newName: string): Promise<void> {
    const bank = await this.getById(id);
    if (!bank) {
      throw new NotFoundError(`Bank with ID ${id} not found`);
    }
    // Check if another bank with this name exists in the same library
    const exists = await this.get<{ exists: number }>(
      'SELECT 1 FROM banks WHERE name = ? AND library_id = ? AND id != ?',
      [newName, bank.library_id, id]
    );
    if (exists) {
      throw new NotFoundError(`Bank with name ${newName} already exists in library ${bank.library_id}`);
    }
    await this.transaction(async () => {
      await this.run(BankManager.SQL.UPDATE_NAME, [newName, id]);
    });
  }

  async updateSystemName(id: number, newSystemName: string): Promise<void> {
    const bank = await this.getById(id);
    if (!bank) {
      throw new NotFoundError(`Bank with ID ${id} not found`);
    }
    await this.transaction(async () => {
      await this.run(BankManager.SQL.UPDATE_SYSTEM_NAME, [newSystemName, id]);
    });
  }

  async associateWithPatch(bankId: number, patchId: number): Promise<void> {
    await this.transaction(async () => {
      await this.run('INSERT INTO bank_patches (bank_id, patch_id) VALUES (?, ?)', [bankId, patchId]);
    });
  }

  async getPatches(bankId: number): Promise<BankPatchRow[]> {
    return this.all<BankPatchRow>('SELECT * FROM bank_patches WHERE bank_id = ?', [bankId]);
  }

  async associateWithPatchSequence(bankId: number, patchSequenceId: number): Promise<void> {
    await this.transaction(async () => {
      await this.run('INSERT INTO bank_patch_sequences (bank_id, patch_sequence_id) VALUES (?, ?)', [bankId, patchSequenceId]);
    });
  }

  async getPatchSequences(bankId: number): Promise<BankPatchSequenceRow[]> {
    return this.all<BankPatchSequenceRow>('SELECT * FROM bank_patch_sequences WHERE bank_id = ?', [bankId]);
  }

  async deleteBankPatchSequence(id: number): Promise<void> {
    await this.transaction(async () => {
      await this.run('DELETE FROM bank_patch_sequences WHERE id = ?', [id]);
    });
  }

  async delete(id: number): Promise<void> {
    const bank = await this.getById(id);
    if (!bank) {
      throw new NotFoundError(`Bank with ID ${id} not found`);
    }
    await this.transaction(async () => {
      await this.run('DELETE FROM bank_patches WHERE bank_id = ?', [id]);
      await this.run('DELETE FROM bank_patch_sequences WHERE bank_id = ?', [id]);
      await this.run(BankManager.SQL.DELETE, [id]);
    });
  }

  async getBanksByLibrary(libraryId: number): Promise<Bank[]> {
    const rows = await this.all<Bank>(
      'SELECT * FROM banks WHERE library_id = ?',
      [libraryId]
    );
    if (!rows.length) {
      throw new NotFoundError(`No banks found for library ${libraryId}`);
    }
    return rows;
  }
}
