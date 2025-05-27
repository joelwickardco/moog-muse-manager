export interface DatabaseRow {
  id: number;
}

export interface Library extends DatabaseRow {
  name: string;
  fingerprint: string;
}

export interface Bank extends DatabaseRow {
  library_id: number;
  name: string;
  system_name: string;
  fingerprint: string;
}

export interface Patch extends DatabaseRow {
  bank_id: number;
  name: string;
  fingerprint: string;
  content: string;
  favorited: number;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface PatchSequence extends DatabaseRow {
  name: string;
  fingerprint: string;
  content: string;
}

export interface BankPatch {
  id: number;
  bank_id: number;
  patch_id: number;
}

export interface BankPatchSequence {
  id: number;
  bank_id: number;
  patch_sequence_id: number;
}

// Database Row Types
export interface LibraryRow {
  id: number;
  name: string;
  fingerprint: string;
}

export interface BankRow {
  id: number;
  library_id: number;
  name: string;
  system_name: string;
  fingerprint: string;
}

export interface PatchRow {
  id: number;
  bank_id: number;
  name: string;
  fingerprint: string;
  content: string;
  favorited: number;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface PatchSequenceRow extends DatabaseRow {
  name: string;
  fingerprint: string;
  content: string;
}

export interface BankPatchRow extends DatabaseRow {
  bank_id: number;
  patch_id: number;
}

export interface BankPatchSequenceRow extends DatabaseRow {
  bank_id: number;
  patch_sequence_id: number;
}
