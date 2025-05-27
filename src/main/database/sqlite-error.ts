import { Error } from 'sqlite3';

export class SQLiteError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.code = code;
    this.name = 'SQLiteError';
  }

  static isSQLiteError(error: unknown): error is SQLiteError {
    return error instanceof Error && 'code' in error;
  }
}
