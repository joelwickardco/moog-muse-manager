import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Library } from './library.entity';
import { Patch } from './patch.entity';
import { PatchSequence } from './patch-sequence.entity';

@Entity('banks')
export class Bank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bank_number: number;

  @Column()
  library_id: number;

  @Column()
  name: string;

  @Column()
  system_name: string;

  @Column({
    type: 'text',
    enum: ['patch', 'sequence']
  })
  type: 'patch' | 'sequence';

  @Column({ type: 'blob', nullable: true })
  content: Buffer;

  @Column({ unique: true })
  fingerprint: string;

  @ManyToOne(() => Library, library => library.banks)
  @JoinColumn({ name: 'library_id' })
  library: Library;

  @OneToMany(() => Patch, patch => patch.bank)
  patches: Patch[];

  @OneToMany(() => PatchSequence, sequence => sequence.bank)
  sequences: PatchSequence[];
} 