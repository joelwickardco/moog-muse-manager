import { Database as BaseDatabase } from '@vscode/sqlite3';
import { createHash } from 'crypto';
import { Hash } from 'crypto';


// Define the crypto interface for Node.js
declare global {
  interface Crypto {
    createHash(algorithm: string): Hash;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
    randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
  }
}

// Initialize crypto
if (!global.crypto) {
  global.crypto = {
    createHash,
    subtle: require('crypto').webcrypto.subtle,
    getRandomValues: require('crypto').getRandomValues,
    randomUUID: require('crypto').randomUUID
  };
}

export abstract class BaseDatabaseManager {
  protected db: BaseDatabase | undefined;
  protected dbPath: string;
  private initialized = false;

  constructor(dbPath: string) {
    if (!dbPath) {
      throw new Error('Database path is required');
    }
    this.dbPath = dbPath;
    this.db = undefined;
  }

  protected async initializeDatabase(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (!this.dbPath) {
      throw new Error('Database path is not set');
    }
    try {
      const verboseSqlite3 = require('@vscode/sqlite3').verbose();
      this.db = new verboseSqlite3.Database(this.dbPath);
      this.initialized = true;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize database: ${error.message}`);
      }
      throw new Error('Failed to initialize database');
    }
  }

  protected async run(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    const db = this.db as BaseDatabase;
    return new Promise<void>((resolve, reject) => {
      try {
        db.run(sql, params, function(err: Error | null) {
          if (err) {
            reject(new Error(`SQL execution failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to execute SQL: ${error.message}`));
        } else {
          reject(new Error('Failed to execute SQL'));
        }
      }
    });
  }

  protected async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    const db = this.db as BaseDatabase;
    return new Promise<T | undefined>((resolve, reject) => {
      try {
        db.get(sql, params, (err: Error | null, row: T | undefined) => {
          if (err) {
            reject(new Error(`Query failed: ${err.message}`));
          } else {
            resolve(row);
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to execute query: ${error.message}`));
        } else {
          reject(new Error('Failed to execute query'));
        }
      }
    });
  }

  protected async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    const db = this.db as BaseDatabase;
    return new Promise<T[]>((resolve, reject) => {
      try {
        db.all(sql, params, (err: Error | null, rows: T[] | undefined) => {
          if (err) {
            reject(new Error(`Query failed: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to execute query: ${error.message}`));
        } else {
          reject(new Error('Failed to execute query'));
        }
      }
    });
  }

  public async close(): Promise<void> {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }
    const db = this.db as BaseDatabase;
    return new Promise<void>((resolve, reject) => {
      try {
        db.close((err: Error | null) => {
          if (err) {
            reject(new Error(`Failed to close database: ${err.message}`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to close database: ${error.message}`));
        } else {
          reject(new Error('Failed to close database'));
        }
      }
    }).then(() => {
      this.db = undefined;
    });
  }

  protected async transaction<T>(callback: (db: BaseDatabase) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }
    const db = this.db as BaseDatabase;
    return new Promise<T>((resolve, reject) => {
      try {
        db.serialize(() => {
          callback(db)
            .then(resolve)
            .catch(reject);
        });
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Transaction failed: ${error.message}`));
        } else {
          reject(new Error('Transaction failed'));
        }
      }
    });
  }

  public static calculateFingerprint(input: string): string {
    if (!input) {
      throw new Error('Input is required for fingerprint calculation');
    }
    try {
      return createHash('sha256').update(input).digest('hex');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to calculate fingerprint: ${error.message}`);
      }
      throw new Error('Failed to calculate fingerprint');
    }
  }
}
