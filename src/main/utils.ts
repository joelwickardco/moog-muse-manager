import crypto from 'crypto';

export function calculateSHA256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function padNumber(num: number): string {
  return num.toString().padStart(2, '0');
} 