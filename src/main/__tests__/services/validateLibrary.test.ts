import fs from 'fs';
import path from 'path';
import { LibraryValidator } from '../../services/validateLibrary';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('LibraryValidator', () => {
  let validator: LibraryValidator;
  const mockLibraryPath = '/mock/library/path';

  beforeEach(() => {
    validator = new LibraryValidator();
    jest.clearAllMocks();
  });

  describe('validateLibrary', () => {
    it('should return error if library directory does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Library directory does not exist: ${mockLibraryPath}`);
    });

    it('should validate a complete and correct library structure', () => {
      // Mock a complete library structure
      (fs.existsSync as jest.Mock).mockImplementation((_path: string) => true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === mockLibraryPath) {
          return Array.from({ length: 16 }, (_, i) => `bank${(i + 1).toString().padStart(2, '0')}`);
        }
        if (dirPath.includes('bank')) {
          return [
            'test.bank',
            ...Array.from({ length: 16 }, (_, i) => `patch${(i + 1).toString().padStart(2, '0')}`)
          ];
        }
        if (dirPath.includes('patch')) {
          return ['test.mmp'];
        }
        if (dirPath === path.join(mockLibraryPath, 'sequences')) {
          return Array.from({ length: 16 }, (_, i) => `bank${(i + 1).toString().padStart(2, '0')}`);
        }
        if (dirPath.includes('sequences/bank')) {
          return Array.from({ length: 16 }, (_, i) => `seq${(i + 1).toString().padStart(2, '0')}`);
        }
        if (dirPath.includes('seq')) {
          return ['test.mmseq'];
        }
        return [];
      });

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.bankCount).toBe(16);
      expect(result.details.patchCount).toBe(256); // 16 banks * 16 patches
      expect(result.details.sequenceCount).toBe(256); // 16 banks * 16 sequences
    });

    it('should detect missing banks', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['bank01', 'bank02']); // Only 2 banks

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(false);
      expect(result.details.missingBanks).toHaveLength(14); // Missing 14 banks
      expect(result.details.missingBanks).toContain('bank03');
    });

    it('should detect missing bank files', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === mockLibraryPath) {
          return ['bank01'];
        }
        return []; // Empty bank directory (no .bank file)
      });

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bank 1 is missing its .bank file');
    });

    it('should validate default patches', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === mockLibraryPath) {
          return ['bank01'];
        }
        if (dirPath.includes('bank')) {
          return ['test.bank', 'patch01'];
        }
        return []; // Empty patch directory (default patch)
      });

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing sequence files', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === mockLibraryPath) {
          return ['bank01'];
        }
        if (dirPath.includes('bank')) {
          return ['test.bank', 'patch01'];
        }
        if (dirPath === path.join(mockLibraryPath, 'sequences')) {
          return ['bank01'];
        }
        if (dirPath.includes('sequences/bank')) {
          return ['seq01'];
        }
        return []; // Empty sequence directory (no .mmseq file)
      });

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sequence 1 in bank 1 is missing its .mmseq file');
    });

    it('should detect invalid bank file names', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === mockLibraryPath) {
          return ['bank01'];
        }
        if (dirPath.includes('bank')) {
          return ['invalid/name.bank', 'patch01'];
        }
        return ['test.mmp'];
      });

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid bank file name in bank 1: invalid/name');
    });

    it('should handle filesystem errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = validator.validateLibrary(mockLibraryPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Error validating library: Filesystem error');
    });
  });
}); 