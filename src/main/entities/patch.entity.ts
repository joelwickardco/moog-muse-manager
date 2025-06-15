import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Bank } from './bank.entity';

@Entity('patches')
export class Patch {
  @PrimaryGeneratedColumn()
    id: number;

  @Column({ type: 'integer' })
    patch_number: number;

  @Column({ type: 'integer' })
    bank_id: number;

  @Column({ type: 'varchar' })
    fingerprint: string;

  @Column({ type: 'text', nullable: true })
    content: string;

  @Column({ type: 'varchar' })
    name: string;

  @Column({ type: 'boolean', default: false })
    default_patch: boolean;

  @Column({ type: 'boolean', default: false })
    favorited: boolean;

  @Column('simple-json') // stored as TEXT in SQLite
    tags: string[];

  @ManyToOne(() => Bank, bank => bank.patches)
  @JoinColumn({ name: 'bank_id' })
    bank: Bank;

} 
