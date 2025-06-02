import { Repository, EntityTarget, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../data-source';
import { DatabaseError } from '../database/errors';

export class BaseRepository<T> {
  protected repository: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repository = AppDataSource.getRepository(entity);
  }

  async findOne(id: number): Promise<T | null> {
    try {
      return await this.repository.findOneBy({ id } as FindOptionsWhere<T>);
    } catch (error) {
      throw new DatabaseError(`Error finding entity: ${error.message}`);
    }
  }

  async findAll(): Promise<T[]> {
    try {
      return await this.repository.find();
    } catch (error) {
      throw new DatabaseError(`Error finding all entities: ${error.message}`);
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      throw new DatabaseError(`Error creating entity: ${error.message}`);
    }
  }

  async update(id: number, data: Partial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, data);
      return await this.findOne(id);
    } catch (error) {
      throw new DatabaseError(`Error updating entity: ${error.message}`);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      throw new DatabaseError(`Error deleting entity: ${error.message}`);
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { id } as FindOptionsWhere<T> });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(`Error checking entity existence: ${error.message}`);
    }
  }
} 