import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    bankCount: number;
    patchCount: number;
    sequenceCount: number;
    missingBanks: string[];
    missingPatches: string[];
    missingSequences: string[];
    invalidNames: string[];
  };
}

interface BankValidation {
  bankNumber: number;
  bankName: string;
  hasBankFile: boolean;
  bankFileName: string | null;
  patches: {
    patchNumber: number;
    patchName: string | null;
    hasMmpFile: boolean;
    isDefaultPatch: boolean;
  }[];
}

interface SequenceValidation {
  bankNumber: number;
  sequenceNumber: number;
  sequenceName: string | null;
  hasMmseqFile: boolean;
}

export class LibraryValidator {
  private readonly REQUIRED_BANK_COUNT = 16;
  private readonly REQUIRED_PATCHES_PER_BANK = 16;
  private readonly REQUIRED_SEQUENCES_PER_BANK = 16;
  private readonly BANK_DIR_PATTERN = /^bank(\d{2})$/;
  private readonly PATCH_DIR_PATTERN = /^patch(\d{2})$/;
  private readonly SEQUENCE_DIR_PATTERN = /^seq(\d{2})$/;

  public validateLibrary(libraryPath: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {
        bankCount: 0,
        patchCount: 0,
        sequenceCount: 0,
        missingBanks: [],
        missingPatches: [],
        missingSequences: [],
        invalidNames: []
      }
    };

    try {
      // Check if directory exists
      if (!fs.existsSync(libraryPath)) {
        result.errors.push(`Library directory does not exist: ${libraryPath}`);
        return result;
      }

      // Validate bank structure
      const bankValidation = this.validateBanks(libraryPath);
      result.details.bankCount = bankValidation.length;
      
      // Check for missing banks
      const foundBankNumbers = bankValidation.map(b => b.bankNumber);
      for (let i = 1; i <= this.REQUIRED_BANK_COUNT; i++) {
        if (!foundBankNumbers.includes(i)) {
          result.details.missingBanks.push(`bank${i.toString().padStart(2, '0')}`);
        }
      }

      // Validate each bank
      bankValidation.forEach(bank => {
        // Check bank file
        if (!bank.hasBankFile) {
          result.errors.push(`Bank ${bank.bankNumber} is missing its .bank file`);
        }

        // Check bank name format
        if (bank.bankFileName && !this.isValidBankFileName(bank.bankFileName)) {
          result.errors.push(`Invalid bank file name in bank ${bank.bankNumber}: ${bank.bankFileName}`);
        }

        // Check patches
        const patchCount = bank.patches.length;
        result.details.patchCount += patchCount;

        if (patchCount < this.REQUIRED_PATCHES_PER_BANK) {
          result.warnings.push(`Bank ${bank.bankNumber} has only ${patchCount} patches (expected ${this.REQUIRED_PATCHES_PER_BANK})`);
        }

        // Validate each patch
        bank.patches.forEach(patch => {
          if (!patch.hasMmpFile && !patch.isDefaultPatch) {
            result.errors.push(`Patch ${patch.patchNumber} in bank ${bank.bankNumber} is missing its .mmp file and is not marked as default`);
          }
        });
      });

      // Validate sequences
      const sequenceValidation = this.validateSequences(libraryPath);
      result.details.sequenceCount = sequenceValidation.length;

      // Check for missing sequences
      const foundSequenceNumbers = sequenceValidation.map(s => s.sequenceNumber);
      for (let i = 1; i <= this.REQUIRED_SEQUENCES_PER_BANK; i++) {
        if (!foundSequenceNumbers.includes(i)) {
          result.details.missingSequences.push(`seq${i.toString().padStart(2, '0')}`);
        }
      }

      // Validate each sequence
      sequenceValidation.forEach(seq => {
        if (!seq.hasMmseqFile) {
          result.errors.push(`Sequence ${seq.sequenceNumber} in bank ${seq.bankNumber} is missing its .mmseq file`);
        }
      });

      // Update overall validity
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Error validating library: ${error instanceof Error ? error.message : String(error)}`);
      result.isValid = false;
    }

    console.log(result);

    return result;
  }

  private validateBanks(libraryPath: string): BankValidation[] {
    const banks: BankValidation[] = [];
    const bankDirs = fs.readdirSync(libraryPath)
      .filter(dir => this.BANK_DIR_PATTERN.test(dir))
      .sort();

    bankDirs.forEach(bankDir => {
      const bankNumber = parseInt(bankDir.match(this.BANK_DIR_PATTERN)![1]);
      const bankPath = path.join(libraryPath, bankDir);
      
      // Find .bank file
      const bankFiles = fs.readdirSync(bankPath)
        .filter(file => file.endsWith('.bank'));
      
      const bankName = bankFiles.length > 0 ? bankFiles[0].replace('.bank', '') : null;

      // Validate patches
      const patches = this.validatePatches(bankPath);

      banks.push({
        bankNumber,
        bankName: bankName || '',
        hasBankFile: bankFiles.length > 0,
        bankFileName: bankName,
        patches
      });
    });

    return banks;
  }

  private validatePatches(bankPath: string): Array<{
    patchNumber: number;
    patchName: string | null;
    hasMmpFile: boolean;
    isDefaultPatch: boolean;
  }> {
    const patches: Array<{
      patchNumber: number;
      patchName: string | null;
      hasMmpFile: boolean;
      isDefaultPatch: boolean;
    }> = [];
    const patchDirs = fs.readdirSync(bankPath)
      .filter(dir => this.PATCH_DIR_PATTERN.test(dir))
      .sort();

    patchDirs.forEach(patchDir => {
      const patchNumber = parseInt(patchDir.match(this.PATCH_DIR_PATTERN)![1]);
      const patchPath = path.join(bankPath, patchDir);
      
      // Find .mmp file
      const mmpFiles = fs.readdirSync(patchPath)
        .filter(file => file.endsWith('.mmp'));
      
      const patchName = mmpFiles.length > 0 ? mmpFiles[0].replace('.mmp', '') : null;

      patches.push({
        patchNumber,
        patchName,
        hasMmpFile: mmpFiles.length > 0,
        isDefaultPatch: mmpFiles.length === 0
      });
    });

    return patches;
  }

  private validateSequences(libraryPath: string): SequenceValidation[] {
    const sequences: SequenceValidation[] = [];
    const sequencesPath = path.join(libraryPath, 'sequences');

    if (!fs.existsSync(sequencesPath)) {
      return sequences;
    }

    const bankDirs = fs.readdirSync(sequencesPath)
      .filter(dir => this.BANK_DIR_PATTERN.test(dir))
      .sort();

    bankDirs.forEach(bankDir => {
      const bankNumber = parseInt(bankDir.match(this.BANK_DIR_PATTERN)![1]);
      const bankPath = path.join(sequencesPath, bankDir);

      const seqDirs = fs.readdirSync(bankPath)
        .filter(dir => this.SEQUENCE_DIR_PATTERN.test(dir))
        .sort();

      seqDirs.forEach(seqDir => {
        const sequenceNumber = parseInt(seqDir.match(this.SEQUENCE_DIR_PATTERN)![1]);
        const seqPath = path.join(bankPath, seqDir);

        // Find .mmseq file
        const mmseqFiles = fs.readdirSync(seqPath)
          .filter(file => file.endsWith('.mmseq'));
        
        const sequenceName = mmseqFiles.length > 0 ? mmseqFiles[0].replace('.mmseq', '') : null;

        sequences.push({
          bankNumber,
          sequenceNumber,
          sequenceName,
          hasMmseqFile: mmseqFiles.length > 0
        });
      });
    });

    return sequences;
  }

  private isValidBankFileName(name: string): boolean {
    // Add any specific bank file naming rules here
    return name.length > 0 && !name.includes('/') && !name.includes('\\');
  }

  private calculateFingerprint(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
} 