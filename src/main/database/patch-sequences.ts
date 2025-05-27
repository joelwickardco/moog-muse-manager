import { BaseDatabaseManager } from './base';
import { PatchSequence, BankPatchSequenceRow } from './types';
import { QueryError, NotFoundError } from './errors';

export class PatchSequenceManager extends BaseDatabaseManager {
  private static readonly SQL = {
    CREATE_TABLE: `CREATE TABLE IF NOT EXISTS patch_sequences (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    CREATE_INDEX: 'CREATE INDEX IF NOT EXISTS idx_patch_sequences_fingerprint ON patch_sequences (fingerprint)',
    INSERT: 'INSERT INTO patch_sequences (name, fingerprint, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    GET_BY_ID: 'SELECT id, name, fingerprint, content, created_at, updated_at FROM patch_sequences WHERE id = ?',
    GET_ALL: 'SELECT id, name, fingerprint, content, created_at, updated_at FROM patch_sequences',
    EXISTS: 'SELECT 1 FROM patch_sequences WHERE fingerprint = ?',
    DELETE: 'DELETE FROM patch_sequences WHERE id = ?',
    UPDATE_NAME: 'UPDATE patch_sequences SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    UPDATE_CONTENT: 'UPDATE patch_sequences SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ADD_TO_BANK: 'INSERT INTO bank_patch_sequences (bank_id, patch_sequence_id) VALUES (?, ?)',
    REMOVE_FROM_BANK: 'DELETE FROM bank_patch_sequences WHERE bank_id = ? AND patch_sequence_id = ?',
    GET_BANK_SEQUENCES: 'SELECT * FROM bank_patch_sequences WHERE patch_sequence_id = ? AND bank_id = ?',
  };

  async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.run(PatchSequenceManager.SQL.CREATE_TABLE);
    await this.run(`CREATE TABLE IF NOT EXISTS bank_patch_sequences (
      bank_id INTEGER,
      patch_sequence_id INTEGER,
      PRIMARY KEY (bank_id, patch_sequence_id),
      FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_sequence_id) REFERENCES patch_sequences(id) ON DELETE CASCADE
    )`);
    await this.run(PatchSequenceManager.SQL.CREATE_INDEX);
  }

  async create(name: string, fingerprint: string, content: string): Promise<number> {
    try {
      // Check if sequence with this fingerprint already exists
      const exists = await this.get<{ exists: number }>(PatchSequenceManager.SQL.EXISTS, [fingerprint]);
      if (exists) {
        throw new QueryError(`Sequence with fingerprint ${fingerprint} already exists`, 
          PatchSequenceManager.SQL.EXISTS, [fingerprint]);
      }

      const timestamp = new Date().toISOString();
      await this.run(PatchSequenceManager.SQL.INSERT, [
        name,
        fingerprint,
        content,
        timestamp,
        timestamp
      ]);
      const row = await this.get<{ id: number }>('SELECT last_insert_rowid() as id');
      if (!row) {
        throw new QueryError('Failed to get last inserted ID', 'SELECT last_insert_rowid()');
      }
      return row.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')) {
        throw new QueryError(`Sequence with fingerprint ${fingerprint} already exists`, PatchSequenceManager.SQL.INSERT, [fingerprint]);
      }
      throw error;
    }
  }

  async getById(id: number): Promise<PatchSequence | undefined> {
    return this.get<PatchSequence>(PatchSequenceManager.SQL.GET_BY_ID, [id]);
  }

  async getAll(): Promise<PatchSequence[]> {
    return this.all<PatchSequence>(PatchSequenceManager.SQL.GET_ALL);
  }

  async updateName(id: number, newName: string): Promise<void> {
    const sequence = await this.getById(id);
    if (!sequence) {
      throw new NotFoundError(`Sequence with ID ${id} not found`);
    }

    await this.transaction(async () => {
      await this.run(PatchSequenceManager.SQL.UPDATE_NAME, [newName, id]);
    });
  }

  async updateContent(id: number, newContent: string): Promise<void> {
    const sequence = await this.getById(id);
    if (!sequence) {
      throw new NotFoundError(`Sequence with ID ${id} not found`);
    }

    await this.transaction(async () => {
      await this.run(PatchSequenceManager.SQL.UPDATE_CONTENT, [newContent, id]);
    });
  }

  async delete(id: number): Promise<void> {
    try {
      const sequence = await this.getById(id);
      if (!sequence) {
        throw new NotFoundError(`Sequence with ID ${id} not found`);
      }

      await this.transaction(async () => {
        // Remove from all banks first
        await this.run(PatchSequenceManager.SQL.REMOVE_FROM_BANK, [null, id]);
        await this.run(PatchSequenceManager.SQL.DELETE, [id]);
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')) {
        throw new QueryError(`Failed to delete sequence ${id} due to foreign key constraint`, PatchSequenceManager.SQL.DELETE, [id]);
      }
      throw error;
    }
  }

  async getBankSequences(sequenceId: number, bankId: number): Promise<{ bank_id: number, patch_sequence_id: number }[]> {
    return await this.all<{ bank_id: number, patch_sequence_id: number }>(
      PatchSequenceManager.SQL.GET_BANK_SEQUENCES,
      [sequenceId, bankId]
    );
  }

  async addToBank(sequenceId: number, bankId: number): Promise<void> {
    const sequence = await this.getById(sequenceId);
    if (!sequence) {
      throw new NotFoundError(`Sequence with ID ${sequenceId} not found`);
    }

    const existing = await this.getBankSequences(sequenceId, bankId);
    if (existing.length > 0) {
      throw new NotFoundError(`Sequence ${sequenceId} is already in bank ${bankId}`);
    }

    await this.run(PatchSequenceManager.SQL.ADD_TO_BANK, [bankId, sequenceId]);
  }

  async removeFromBank(sequenceId: number, bankId: number): Promise<void> {
    const sequence = await this.getById(sequenceId);
    if (!sequence) {
      throw new NotFoundError(`Sequence with ID ${sequenceId} not found`);
    }

    await this.run(PatchSequenceManager.SQL.REMOVE_FROM_BANK, [bankId, sequenceId]);
  }

  async getBanks(sequenceId: number): Promise<BankPatchSequenceRow[]> {
    const sequence = await this.getById(sequenceId);
    if (!sequence) {
      throw new NotFoundError(`Sequence with ID ${sequenceId} not found`);
    }

    const sql = `
      SELECT b.id as bank_id, b.name as bank_name, 
      b.system_name as bank_system_name, b.fingerprint as bank_fingerprint 
      FROM banks b 
      JOIN bank_patch_sequences bps ON b.id = bps.bank_id 
      WHERE bps.patch_sequence_id = ?`;
    
    return this.all<BankPatchSequenceRow>(sql, [sequenceId]);
  }

  async getSequencesByBank(bankId: number): Promise<PatchSequence[]> {
    const bank = await this.get<{ id: number }>(
      'SELECT id FROM banks WHERE id = ?',
      [bankId]
    );
    if (!bank) {
      throw new NotFoundError(`Bank with ID ${bankId} not found`);
    }

    const sql = `
      SELECT ps.id, ps.name, ps.fingerprint, ps.content 
      FROM patch_sequences ps 
      JOIN bank_patch_sequences bps ON ps.id = bps.patch_sequence_id 
      WHERE bps.bank_id = ?`;
    
    const rows = await this.all<PatchSequence>(sql, [bankId]);
    if (!rows.length) {
      throw new NotFoundError(`No sequences found for bank ${bankId}`);
    }
    return rows;
  }

  async cleanup(): Promise<void> {
    await this.run('DELETE FROM bank_patch_sequences', []);
    await this.run('DELETE FROM patch_sequences', []);
  }
}
