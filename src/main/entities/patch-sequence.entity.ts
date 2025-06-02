import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Bank } from './bank.entity';

@Entity('patch_sequences')
export class PatchSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sequence_number: number;

  @Column()
  bank_id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  fingerprint: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Bank, bank => bank.sequences)
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;
} 