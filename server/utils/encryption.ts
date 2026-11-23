import crypto from 'crypto';
import dotenv from 'dotenv';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';
dotenv.config({ path: envFile });

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IP_HASH_SECRET = process.env.IP_HASH_SECRET;

// Upstream format: 128 chars (first 32 bytes used as the key). Any other
// secret of 32+ chars (e.g. Render's generateValue) is hashed to a 32-byte key.
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('DB_ENCRYPTION_KEY must be at least 32 characters long');
}

if (!IP_HASH_SECRET) {
  throw new Error('IP_HASH_SECRET env var is required');
}

const key =
  ENCRYPTION_KEY.length === 128
    ? Buffer.from(ENCRYPTION_KEY, 'utf8').subarray(0, 32)
    : crypto.createHash('sha256').update(ENCRYPTION_KEY, 'utf8').digest();

export function hashIp(plaintextIp: string): string {
  return crypto
    .createHmac('sha256', IP_HASH_SECRET!)
    .update(plaintextIp)
    .digest('hex');
}

export function encrypt(text: unknown) {
  if (!text) return null;

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(JSON.stringify(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

export function decrypt(encryptedData: {
  iv: string;
  data: string;
  authTag: string;
}) {
  if (
    !encryptedData ||
    typeof encryptedData !== 'object' ||
    !encryptedData.iv ||
    !encryptedData.data ||
    !encryptedData.authTag
  ) {
    return null;
  }

  try {
    const { iv, data, authTag } = encryptedData;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}
