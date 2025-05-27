export class DatabaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class InitializationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'INIT_ERROR');
    this.name = 'InitializationError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, public readonly query: string, public readonly params?: any[]) {
    super(message, 'QUERY_ERROR');
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string) {
    super(message, 'TRANSACTION_ERROR');
    this.name = 'TransactionError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
