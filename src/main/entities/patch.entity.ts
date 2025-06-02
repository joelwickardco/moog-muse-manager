import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Bank } from './bank.entity';

@Entity('patches')
export class Patch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patch_number: number;

  @Column()
  bank_id: number;

  @Column({ unique: true })
  fingerprint: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column()
  name: string;

  @Column({ default: false })
  default_patch: boolean;

  @Column({ default: false })
  favorited: boolean;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @ManyToOne(() => Bank, bank => bank.patches)
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;
} 