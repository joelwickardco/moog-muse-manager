import { Repository, DataSource } from 'typeorm';
import { Patch } from '../entities/patch.entity';

export class PatchRepository {
  private repository: Repository<Patch>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Patch);
  }

  async findByBankId(bankId: number): Promise<Patch[]> {
    try {
      return await this.repository.find({ where: { bank_id: bankId } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding patches by bank: ${error.message}`);
      }
      throw new Error('Error finding patches by bank: Unknown error');
    }
  }

  async findByFingerprint(fingerprint: string): Promise<Patch | null> {
    try {
      return await this.repository.findOne({ where: { fingerprint } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding patch by fingerprint: ${error.message}`);
      }
      throw new Error('Error finding patch by fingerprint: Unknown error');
    }
  }

  async findFavorites(): Promise<Patch[]> {
    try {
      return await this.repository.find({ where: { favorited: true } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding favorite patches: ${error.message}`);
      }
      throw new Error('Error finding favorite patches: Unknown error');
    }
  }

  async create(data: Partial<Patch>): Promise<Patch> {
    try {
      const patch = this.repository.create(data);
      return await this.repository.save(patch);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating patch: ${error.message}`);
      }
      throw new Error('Error creating patch: Unknown error');
    }
  }
} 