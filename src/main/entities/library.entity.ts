import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Bank } from './bank.entity';

@Entity('libraries')
export class Library {
  @PrimaryGeneratedColumn()
    id: number;

  @Column({ type: 'varchar', unique: true })
    name: string;

  @Column({ type: 'varchar', unique: true })
    fingerprint: string;

  @OneToMany(() => Bank, bank => bank.library)
    banks: Bank[];
} 