import { Repository, DataSource } from 'typeorm';
import { PatchSequence } from '../entities/patch-sequence.entity';

export class PatchSequenceRepository {
  private repository: Repository<PatchSequence>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PatchSequence);
  }

  async findByBankId(bankId: number): Promise<PatchSequence[]> {
    try {
      return await this.repository.find({ where: { bank_id: bankId } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding sequences by bank: ${error.message}`);
      }
      throw new Error('Error finding sequences by bank: Unknown error');
    }
  }

  async findByFingerprint(fingerprint: string): Promise<PatchSequence | null> {
    try {
      return await this.repository.findOne({ where: { fingerprint } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding sequence by fingerprint: ${error.message}`);
      }
      throw new Error('Error finding sequence by fingerprint: Unknown error');
    }
  }

  async create(data: Partial<PatchSequence>): Promise<PatchSequence> {
    try {
      const sequence = this.repository.create(data);
      return await this.repository.save(sequence);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating sequence: ${error.message}`);
      }
      throw new Error('Error creating sequence: Unknown error');
    }
  }
} 