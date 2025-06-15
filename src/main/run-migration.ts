import 'reflect-metadata';
import { AppDataSource } from './data-source';

async function runMigration() {
  try {
    await AppDataSource.initialize();
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigration(); 