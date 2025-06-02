import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.NODE_ENV === 'test' 
    ? ':memory:' 
    : path.join(process.env.APP_DATA || '/tmp/app-data', 'database.sqlite'),
  synchronize: process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, 'entities', '*.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [],
}); 