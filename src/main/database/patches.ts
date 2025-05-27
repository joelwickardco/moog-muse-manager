import { BaseDatabaseManager } from './base';
import { Patch } from './types';
import { QueryError, NotFoundError } from './errors';

export class PatchManager extends BaseDatabaseManager {
  private static readonly SQL = {
    CREATE_TABLE: `CREATE TABLE IF NOT EXISTS patches (
      id INTEGER PRIMARY KEY,
      bank_id INTEGER,
      name TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      favorited INTEGER DEFAULT 0,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bank_id) REFERENCES banks(id) ON DELETE CASCADE
    )`,
    CREATE_INDEX: 'CREATE INDEX IF NOT EXISTS idx_patches_fingerprint ON patches (fingerprint)',
    CREATE_INDEX_BANK: 'CREATE INDEX IF NOT EXISTS idx_patches_bank_id ON patches (bank_id)',
    INSERT: 'INSERT INTO patches (bank_id, name, fingerprint, content, favorited, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    GET_BY_ID: 'SELECT id, bank_id, name, fingerprint, content, favorited, tags, created_at, updated_at FROM patches WHERE id = ?',
    GET_ALL: 'SELECT id, bank_id, name, fingerprint, content, favorited, tags, created_at, updated_at FROM patches',
    EXISTS: 'SELECT 1 FROM patches WHERE fingerprint = ?',
    DELETE: 'DELETE FROM patches WHERE id = ?',
    UPDATE_NAME: 'UPDATE patches SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    UPDATE_CONTENT: 'UPDATE patches SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    UPDATE_FAVORITE: 'UPDATE patches SET favorited = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    UPDATE_TAGS: 'UPDATE patches SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ADD_TO_BANK: 'INSERT INTO bank_patches (bank_id, patch_id) VALUES (?, ?)',
    REMOVE_FROM_BANK: 'DELETE FROM bank_patches WHERE bank_id = ? AND patch_id = ?',
    GET_BANK_PATCHES: 'SELECT * FROM bank_patches WHERE patch_id = ? AND bank_id = ?',
  };

  async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.run(PatchManager.SQL.CREATE_TABLE);
    await this.run(`CREATE TABLE IF NOT EXISTS bank_patches (
      bank_id INTEGER,
      patch_id INTEGER,
      PRIMARY KEY (bank_id, patch_id),
      FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
    )`);
    await this.run(PatchManager.SQL.CREATE_INDEX);
    await this.run(PatchManager.SQL.CREATE_INDEX_BANK);
  }

  async getBankPatches(patchId: number, bankId: number): Promise<{ bank_id: number, patch_id: number }[]> {
    return await this.all<{ bank_id: number, patch_id: number }>(
      PatchManager.SQL.GET_BANK_PATCHES,
      [patchId, bankId]
    );
  }

  async cleanup(): Promise<void> {
    // Delete from child tables first to avoid foreign key constraints
    await this.run('DELETE FROM bank_patches');
    await this.run('DELETE FROM patches');
  }

  async create(bankId: number, name: string, fingerprint: string, content: string,
    favorited: number = 0, tags: string[] = []): Promise<number> {
    try {
      // Check if patch with this fingerprint already exists
      const exists = await this.get<{ exists: number }>(PatchManager.SQL.EXISTS, [fingerprint]);
      if (exists) {
        throw new QueryError(`Patch with fingerprint ${fingerprint} already exists`, 
          PatchManager.SQL.EXISTS, [fingerprint]);
      }

      const timestamp = new Date().toISOString();
      await this.run(PatchManager.SQL.INSERT, [
        bankId,
        name,
        fingerprint,
        content,
        favorited,
        JSON.stringify(tags),
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
        throw new QueryError(`Patch with fingerprint ${fingerprint} already exists`, PatchManager.SQL.INSERT, [fingerprint]);
      }
      throw error;
    }
  }

  async getById(id: number): Promise<Patch | undefined> {
    const row = await this.get<Patch>(PatchManager.SQL.GET_BY_ID, [id]);
    if (!row) {
      throw new NotFoundError(`Patch with ID ${id} not found`);
    }
    return {
      ...row,
      favorited: row.favorited === 1 ? 1 : 0,
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  async getAll(): Promise<Patch[]> {
    const rows = await this.all<Patch>(PatchManager.SQL.GET_ALL);
    return rows.map(row => ({
      ...row,
      favorited: row.favorited === 1 ? 1 : 0,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
  }

  async updateName(id: number, newName: string): Promise<void> {
    const patch = await this.getById(id);
    if (!patch) {
      throw new NotFoundError(`Patch with ID ${id} not found`);
    }

    await this.transaction(async () => {
      await this.run(PatchManager.SQL.UPDATE_NAME, [newName, id]);
    });
  }

  async updateContent(id: number, newContent: string): Promise<void> {
    const patch = await this.getById(id);
    if (!patch) {
      throw new NotFoundError(`Patch with ID ${id} not found`);
    }

    await this.transaction(async () => {
      await this.run(PatchManager.SQL.UPDATE_CONTENT, [newContent, id]);
    });
  }

  async updateFavorite(id: number, favorited: boolean): Promise<void> {
    const patch = await this.getById(id);
    if (!patch) {
      throw new NotFoundError(`Patch with ID ${id} not found`);
    }

    await this.transaction(async () => {
      await this.run(PatchManager.SQL.UPDATE_FAVORITE, [favorited ? 1 : 0, id]);
    });
  }

  async updateTags(id: number, newTags: string[]): Promise<void> {
    const patch = await this.getById(id);
    if (!patch) {
      throw new NotFoundError(`Patch with ID ${id} not found`);
    }

    await this.transaction(async () => {
      await this.run(PatchManager.SQL.UPDATE_TAGS, [JSON.stringify(newTags), id]);
    });
  }

  async delete(id: number): Promise<void> {
    const patch = await this.getById(id);
    if (!patch) {
      throw new NotFoundError(`Patch with ID ${id} not found`);
    }

    await this.transaction(async () => {
      // Remove from all banks first
      await this.run('DELETE FROM bank_patches WHERE patch_id = ?', [id]);
      await this.run(PatchManager.SQL.DELETE, [id]);
    });
  }

  async addToBank(patchId: number, bankId: number): Promise<void> {
    const patch = await this.getById(patchId);
    if (!patch) {
      throw new NotFoundError(`Patch with ID ${patchId} not found`);
    }

    const bank = await this.get<{ id: number }>(
      'SELECT id FROM banks WHERE id = ?',
      [bankId]
    );
    if (!bank) {
      throw new NotFoundError(`Bank with ID ${bankId} not found`);
    }

    await this.transaction(async () => {
      // Check if patch is already in this bank
      const exists = await this.get<{ exists: number }>(
        'SELECT 1 FROM bank_patches WHERE bank_id = ? AND patch_id = ?',
        [bankId, patchId]
      );
      if (exists) {
        throw new QueryError(`Patch ${patchId} is already in bank ${bankId}`,
          'SELECT 1 FROM bank_patches WHERE bank_id = ? AND patch_id = ?',
          [bankId, patchId]);
      }

      await this.run(PatchManager.SQL.ADD_TO_BANK, [bankId, patchId]);
    });
  }

  async removeFromBank(patchId: number, bankId: number): Promise<void> {
    await this.transaction(async () => {
      await this.run(PatchManager.SQL.REMOVE_FROM_BANK, [bankId, patchId]);
    });
  }

  async getPatchesByBank(bankId: number): Promise<Patch[]> {
    const rows = await this.all<Patch>(
      'SELECT patches.* FROM patches JOIN bank_patches ON patches.id = bank_patches.patch_id WHERE bank_patches.bank_id = ?',
      [bankId]
    );
    return rows.map(row => ({
      ...row,
      favorited: row.favorited === 1 ? 1 : 0,
      tags: row.tags ? JSON.parse(row.tags) : [],
      bank_id: bankId
    }));
  }
}
