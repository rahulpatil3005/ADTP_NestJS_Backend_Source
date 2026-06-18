import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '0'.repeat(64), 'hex'); // 32-byte key as hex

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

export function generateSecureToken(): string {
  return crypto.randomUUID();
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
