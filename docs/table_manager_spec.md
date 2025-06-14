# Table Manager Implementation Specification

This document outlines the standardized patterns and requirements for implementing table manager classes in our application.

## 1. Class Structure

### Base Class
All table managers must extend `BaseDatabaseManager`:
```typescript
export class [ManagerName] extends BaseDatabaseManager {
```

### SQL Object
All managers must define a private static readonly SQL object with the following structure:
```typescript
  private static readonly SQL = {
    CREATE_TABLE: `CREATE TABLE IF NOT EXISTS [table_name] (...)`,
    CREATE_INDEX: `CREATE INDEX IF NOT EXISTS idx_[table_name]_[column] ON [table_name] ([column])`,
    INSERT: `INSERT INTO [table_name] (...) VALUES (...)`,
    GET_BY_ID: `SELECT ... FROM [table_name] WHERE id = ?`,
    GET_ALL: `SELECT ... FROM [table_name]`,
    UPDATE_[FIELD]: `UPDATE [table_name] SET [field] = ? WHERE id = ?`,
    DELETE: `DELETE FROM [table_name] WHERE id = ?`
  };
```

## 2. Required Methods

### Core Methods
```typescript
  async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.run([ManagerName].SQL.CREATE_TABLE);
    await this.run([ManagerName].SQL.CREATE_INDEX);
  }

  async cleanup(): Promise<void> {
    await this.run('DELETE FROM [table_name]');
  }
```

### CRUD Operations
```typescript
  async create(...args): Promise<number> {
    // Validate unique constraints
    // Execute insert
    // Get last inserted ID
    // Handle errors
  }

  async getById(id: number): Promise<[Type] | undefined> {
    const row = await this.get<[Type]>([ManagerName].SQL.GET_BY_ID, [id]);
    return row;
  }

  async getAll(): Promise<[Type][]> {
    const rows = await this.all<[Type]>([ManagerName].SQL.GET_ALL);
    return rows;
  }

  async update(...args): Promise<void> {
    // Get existing record
    // Check existence
    // Execute update
  }

  async delete(id: number): Promise<void> {
    // Get existing record
    // Check existence
    // Execute delete
  }
```

## 3. Error Handling

All database operations must follow this error handling pattern:
```typescript
try {
  // Database operation
} catch (error) {
  if (error instanceof Error && error.code === 'SQLITE_CONSTRAINT') {
    throw new QueryError(...);
  }
  throw error;
}
```

## 4. Testing Requirements

### Test File Structure
```typescript
describe('[ManagerName]', () => {
  let manager;
  let testDbPath = path.join('/tmp/test-app-data', '[manager].db');

  beforeEach(async () => {
    // Setup test database
    manager = new [ManagerName](testDbPath);
    await manager.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await manager.cleanup();
    await manager.close();
  });

  describe('Initialization', () => {
    it('should initialize database with correct schema', async () => {
      // Verify tables exist
    });
  });

  describe('[ManagerName] Operations', () => {
    // CRUD operation tests
  });
});
```

### Required Test Utilities
All test files must include the custom error matcher:
```typescript
expect.extend({
  toThrowErrorWithMessage(received, expectedErrorType, expectedMessage) {
    // Custom matcher for error types
  }
});
```

## 5. Required Imports

All manager classes must include these imports:
```typescript
import { BaseDatabaseManager } from './base';
import { [Type] } from './types';
import { QueryError, NotFoundError } from './errors';
```

## 6. SQL Statement Requirements

### Table Creation
- All tables must have an `id` column as PRIMARY KEY
- All tables must have proper foreign key constraints where applicable
- All tables should include `created_at` and `updated_at` timestamp columns
- All foreign key constraints should include `ON DELETE CASCADE`

### Index Creation
- Create indexes on frequently queried columns
- Use meaningful index names (prefix with `idx_`)
- Avoid creating indexes on columns that are not frequently queried

### Error Messages
- All error messages must be clear and descriptive
- Include relevant context (e.g., table name, column name)
- Use proper error types (QueryError, NotFoundError)

## 7. Type Safety

- All methods must have proper TypeScript return types
- All SQL queries must be properly typed
- Use generic types where appropriate
- Avoid using `any` type

## 8. Code Organization

- Keep SQL statements in the SQL object
- Group related methods together
- Use consistent naming conventions
- Keep methods focused and single-purpose

## 9. Documentation

- Document all public methods
- Include examples where appropriate
- Document error conditions
- Document any side effects
