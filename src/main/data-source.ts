import { DataSource } from 'typeorm';
import * as path from 'path';
import { Library } from './entities/library.entity';
import { Bank } from './entities/bank.entity';
import { Patch } from './entities/patch.entity';
import { PatchSequence } from './entities/patch-sequence.entity';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.NODE_ENV === 'test' 
    ? ':memory:' 
    : path.join(process.env.APP_DATA || '/tmp/app-data', 'database.sqlite'),
  synchronize: true, //process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV === 'development',
  entities: [Library, Bank, Patch, PatchSequence],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [],
}); 