import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, AfterLoad } from 'typeorm';
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

  // Transient property to hold the parsed tags array
  private _tagsArray: string[] = [];

  // Getter for tags array
  get tagsArray(): string[] {
    return this._tagsArray;
  }

  // Setter for tags array
  set tagsArray(value: string[]) {
    this._tagsArray = value;
    this.tags = JSON.stringify(value);
  }

  @ManyToOne(() => Bank, bank => bank.patches)
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  // Convert string to array before saving to database
  @BeforeInsert()
  @BeforeUpdate()
  convertTagsToString() {
    if (this._tagsArray) {
      this.tags = JSON.stringify(this._tagsArray);
    }
  }

  // Convert string to array after loading from database
  @AfterLoad()
  convertTagsToArray() {
    if (this.tags) {
      try {
        this._tagsArray = JSON.parse(this.tags);
      } catch (e) {
        // If parsing fails, initialize with empty array
        this._tagsArray = [];
      }
    } else {
      this._tagsArray = [];
    }
  }
} 