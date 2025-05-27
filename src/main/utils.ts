import crypto from 'crypto';

export function calculateSHA256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
} 