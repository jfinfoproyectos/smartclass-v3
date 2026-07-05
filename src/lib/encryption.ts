import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-ctr';
const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'default-secret-key-change-this-in-prod';

export async function encrypt(text: string): Promise<string> {
    const iv = randomBytes(16);
    const key = (await promisify(scrypt)(SECRET_KEY, 'salt', 32)) as Buffer;
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export async function decrypt(text: string): Promise<string> {
    const [ivPart, encryptedPart] = text.split(':');
    if (!ivPart || !encryptedPart) throw new Error('Invalid encrypted text format');

    const iv = Buffer.from(ivPart, 'hex');
    const encryptedText = Buffer.from(encryptedPart, 'hex');
    const key = (await promisify(scrypt)(SECRET_KEY, 'salt', 32)) as Buffer;
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString();
}
