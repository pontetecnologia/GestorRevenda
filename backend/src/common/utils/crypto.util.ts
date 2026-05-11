import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'chave_padrao_32_chars_mudar_prod!';
  return Buffer.from(key.padEnd(32).slice(0, 32));
}

export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch {
    return '';
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

export function maskSecret(value: string): string {
  if (!value || value.length < 4) return '****';
  return '*'.repeat(Math.max(value.length - 4, 4)) + value.slice(-4);
}
