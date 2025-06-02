import { Repository, DataSource } from 'typeorm';
import { Library } from '../entities/library.entity';

export class LibraryRepository {
  private repository: Repository<Library>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Library);
  }

  async findByName(name: string): Promise<Library | null> {
    try {
      return await this.repository.findOne({ where: { name } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding library by name: ${error.message}`);
      }
      throw new Error('Error finding library by name: Unknown error');
    }
  }

  async findByFingerprint(fingerprint: string): Promise<Library | null> {
    try {
      return await this.repository.findOne({ where: { fingerprint } });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error finding library by fingerprint: ${error.message}`);
      }
      throw new Error('Error finding library by fingerprint: Unknown error');
    }
  }

  async create(data: Partial<Library>): Promise<Library> {
    try {
      const library = this.repository.create(data);
      return await this.repository.save(library);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error creating library: ${error.message}`);
      }
      throw new Error('Error creating library: Unknown error');
    }
  }
} 