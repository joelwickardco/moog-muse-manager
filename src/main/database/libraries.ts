import { BaseDatabaseManager } from './base';
import { Library } from './types';
import { QueryError, NotFoundError } from './errors';


export class LibraryManager extends BaseDatabaseManager {
  private static readonly SQL = {
    CREATE_TABLE: `CREATE TABLE IF NOT EXISTS libraries (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE,
      fingerprint TEXT UNIQUE
    )`,
    CREATE_INDEX: 'CREATE INDEX IF NOT EXISTS idx_libraries_name ON libraries (name)',
    INSERT: 'INSERT INTO libraries (name, fingerprint) VALUES (?, ?)',
    GET_BY_ID: 'SELECT id, name, fingerprint FROM libraries WHERE id = ?',
    GET_BY_FINGERPRINT: 'SELECT id, name, fingerprint FROM libraries WHERE fingerprint = ?',
    GET_ALL: 'SELECT id, name FROM libraries',
    UPDATE_NAME: 'UPDATE libraries SET name = ? WHERE id = ?',
    DELETE: 'DELETE FROM libraries WHERE id = ?'
  };

  async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.run(LibraryManager.SQL.CREATE_TABLE);
    await this.run(LibraryManager.SQL.CREATE_INDEX);
  }

  async cleanup(): Promise<void> {
    await this.run('DELETE FROM libraries');
  }

  async create(name: string, fingerprint: string): Promise<number> {
    try {
      await this.run(LibraryManager.SQL.INSERT, [name, fingerprint]);
      const row = await this.get<{ id: number }>('SELECT last_insert_rowid() as id');
      if (!row) {
        throw new QueryError('Failed to get last inserted ID', 'SELECT last_insert_rowid()');
      }
      return row.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')) {
        throw new QueryError(`Library with name ${name} or fingerprint ${fingerprint} already exists`, LibraryManager.SQL.INSERT, [name, fingerprint]);
      }
      throw error;
    }  
  }

  async getById(id: number): Promise<Library | undefined> {
    const row = await this.get<Library>(LibraryManager.SQL.GET_BY_ID, [id]);
    return row;
  }

  async getByFingerprint(fingerprint: string): Promise<Library | undefined> {
    const row = await this.get<Library>(LibraryManager.SQL.GET_BY_FINGERPRINT, [fingerprint]);
    return row;
  }

  async getAll(): Promise<Library[]> {
    const rows = await this.all<Library>(LibraryManager.SQL.GET_ALL);
    return rows;
  }

  async updateName(id: number, newName: string): Promise<void> {
    const library = await this.getById(id);
    if (!library) {
      throw new NotFoundError(`Library with ID ${id} not found`);
    }
    await this.run(LibraryManager.SQL.UPDATE_NAME, [newName, id]);
  }

  async delete(id: number): Promise<void> {
    const library = await this.getById(id);
    if (!library) {
      throw new NotFoundError(`Library with ID ${id} not found`);
    }
    await this.run(LibraryManager.SQL.DELETE, [id]);
  }
}
