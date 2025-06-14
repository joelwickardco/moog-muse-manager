import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Bank } from './bank.entity';

@Entity('patch_sequences')
export class PatchSequence {
  @PrimaryGeneratedColumn()
    id: number;

  @Column({ type: 'integer' })
    sequence_number: number;

  @Column({ type: 'integer' })
    bank_id: number;

  @Column({ type: 'varchar' })
    name: string;

  @Column({ type: 'varchar' })
    fingerprint: string;

  @Column({ type: 'text' })
    content: string;

  @ManyToOne(() => Bank, bank => bank.sequences)
  @JoinColumn({ name: 'bank_id' })
    bank: Bank;
} 