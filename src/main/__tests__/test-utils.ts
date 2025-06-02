import { DataSource } from 'typeorm';
import { Library } from '../entities/library.entity';
import { Bank } from '../entities/bank.entity';
import { Patch } from '../entities/patch.entity';
import { PatchSequence } from '../entities/patch-sequence.entity';

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    logging: false,
    entities: [Library, Bank, Patch, PatchSequence],
    migrations: [],
    subscribers: []
  });

  await dataSource.initialize();
  return dataSource;
}

export async function closeTestDataSource(dataSource: DataSource): Promise<void> {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.query('PRAGMA foreign_keys = OFF');
  await queryRunner.query('DELETE FROM patch_sequences');
  await queryRunner.query('DELETE FROM patches');
  await queryRunner.query('DELETE FROM banks');
  await queryRunner.query('DELETE FROM libraries');
  await queryRunner.query('PRAGMA foreign_keys = ON');
  await queryRunner.release();
} 