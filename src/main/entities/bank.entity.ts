import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Library } from './library.entity';
import { Patch } from './patch.entity';
import { PatchSequence } from './patch-sequence.entity';

@Entity('banks')
export class Bank {
  @PrimaryGeneratedColumn()
    id: number;

  @Column({ type: 'integer' })
    bank_number: number;

  @Column({ type: 'integer' })
    library_id: number;

  @Column({ type: 'varchar' })
    name: string;

  @Column({
    type: 'text',
    enum: ['patch', 'sequence']
  })
    type: 'patch' | 'sequence';

  @Column({ type: 'blob', nullable: true })
    content: Buffer;

  @Column({ type: 'varchar' })
    fingerprint: string;

  @ManyToOne(() => Library, library => library.banks)
  @JoinColumn({ name: 'library_id' })
    library: Library;

  @OneToMany(() => Patch, patch => patch.bank)
    patches: Patch[];

  @OneToMany(() => PatchSequence, sequence => sequence.bank)
    sequences: PatchSequence[];
} 