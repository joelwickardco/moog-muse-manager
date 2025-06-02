import { Repository, DataSource } from 'typeorm';
import { Bank } from '../entities/bank.entity';

export class BankRepository {
  private repository: Repository<Bank>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Bank);
  }

  async findByLibraryId(libraryId: number): Promise<Bank[]> {
    try {
      return await this.repository.find({ where: { library_id: libraryId } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding banks by library: ${error.message}`);
      }
      throw new Error('Error finding banks by library: Unknown error');
    }
  }

  async findBySystemName(systemName: string): Promise<Bank | null> {
    try {
      return await this.repository.findOne({ where: { system_name: systemName } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding bank by system name: ${error.message}`);
      }
      throw new Error('Error finding bank by system name: Unknown error');
    }
  }

  async findByFingerprint(fingerprint: string): Promise<Bank | null> {
    try {
      return await this.repository.findOne({ where: { fingerprint } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding bank by fingerprint: ${error.message}`);
      }
      throw new Error('Error finding bank by fingerprint: Unknown error');
    }
  }

  async create(data: Partial<Bank>): Promise<Bank> {
    try {
      const bank = this.repository.create(data);
      return await this.repository.save(bank);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating bank: ${error.message}`);
      }
      throw new Error('Error creating bank: Unknown error');
    }
  }
} 