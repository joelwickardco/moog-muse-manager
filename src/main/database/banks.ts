import { BaseDatabaseManager } from './base';
import { Bank, BankPatchRow, BankPatchSequenceRow } from './types';
import { NotFoundError, QueryError } from './errors';


export class BankManager extends BaseDatabaseManager {
  private static readonly SQL = {
    CREATE_TABLE: `
      CREATE TABLE IF NOT EXISTS banks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        library_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        system_name TEXT NOT NULL,
        fingerprint TEXT NOT NULL UNIQUE,
        file_content BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES libraries(id),
        UNIQUE(library_id, system_name)
      )
    `,
    CREATE_INDEX: `
      CREATE INDEX IF NOT EXISTS idx_banks_library_id ON banks(library_id)
    `,
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
    INSERT: `
      INSERT INTO banks (library_id, name, system_name, fingerprint, file_content)
      VALUES (?, ?, ?, ?, ?)
    `,
    GET_BY_ID: 'SELECT * FROM banks WHERE id = ?',
    GET_BY_SYSTEM_NAME: 'SELECT * FROM banks WHERE library_id = ? AND system_name = ?',
    GET_ALL: 'SELECT * FROM banks',
    EXISTS: 'SELECT 1 FROM banks WHERE system_name = ? AND library_id = ?',
    DELETE: 'DELETE FROM banks WHERE id = ?'
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

  async create(libraryId: number, name: string, systemName: string, fingerprint: string, fileContent?: Buffer): Promise<number> {
    try {
      const result = await this.run(
        BankManager.SQL.INSERT,
        [libraryId, name, systemName, fingerprint, fileContent]
      );
      const row = await this.get<{ id: number }>('SELECT last_insert_rowid() as id');
      if (!row) {
        throw new NotFoundError('Failed to get last inserted ID');
      }
      return row.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')) {
        if (error.message.includes('fingerprint')) {
          throw new QueryError(`Bank with fingerprint ${fingerprint} already exists`, BankManager.SQL.INSERT, [libraryId, name, systemName, fingerprint, fileContent]);
        } else {
          throw new QueryError(`Bank with system name ${systemName} already exists in this library`, BankManager.SQL.INSERT, [libraryId, name, systemName, fingerprint, fileContent]);
        }
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
