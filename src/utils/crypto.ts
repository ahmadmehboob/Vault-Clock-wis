/**
 * Cryptographic security utilities using standard Web Crypto API
 * Compatible with modern browsers and Node 18+ (globalThis.crypto)
 */

export async function hashPin(pin: string, salt: string = 'calc_vault_salt_v1'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(plainText: string, pin: string): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pin, salt);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plainText);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      encoded
    );

    const payload = {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext)),
    };

    return 'ENC:' + btoa(JSON.stringify(payload));
  } catch (err) {
    console.error('Encryption failed, returning raw fallback:', err);
    return plainText;
  }
}

export async function decryptText(encryptedStr: string, pin: string): Promise<string> {
  if (!encryptedStr.startsWith('ENC:')) {
    return encryptedStr; // Unencrypted plain text legacy or fallback
  }

  try {
    const jsonStr = atob(encryptedStr.slice(4));
    const payload = JSON.parse(jsonStr);
    const salt = new Uint8Array(payload.salt);
    const iv = new Uint8Array(payload.iv);
    const ciphertext = new Uint8Array(payload.data);

    const key = await deriveKey(pin, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    return '[Decryption Error: Invalid Passcode or Corrupt Data]';
  }
}

/**
 * Calculates a vault security health score (0 to 100)
 */
export function calculateSecurityScore(config: {
  masterPinLength: number;
  hasDecoyPin: boolean;
  intruderDetection: boolean;
  autoLockMinutes: number;
  lockOnBlur: boolean;
  wipeProtection: boolean;
}): { score: number; level: 'Weak' | 'Moderate' | 'Strong' | 'Military-Grade'; recommendations: string[] } {
  let score = 20; // Base score
  const recommendations: string[] = [];

  if (config.masterPinLength >= 6) {
    score += 25;
  } else if (config.masterPinLength >= 4) {
    score += 15;
    recommendations.push('Increase PIN length to 6+ digits for higher entropy');
  } else {
    recommendations.push('Set at least a 4-digit PIN');
  }

  if (config.hasDecoyPin) {
    score += 15;
  } else {
    recommendations.push('Configure a Decoy Passcode for anti-coercion protection');
  }

  if (config.intruderDetection) {
    score += 15;
  } else {
    recommendations.push('Enable Intruder Break-In Detection');
  }

  if (config.autoLockMinutes > 0 && config.autoLockMinutes <= 2) {
    score += 15;
  } else {
    recommendations.push('Set Auto-Lock to 1-2 minutes or less');
  }

  if (config.lockOnBlur) {
    score += 10;
  } else {
    recommendations.push('Enable Flip-to-Hide (lock when switching tabs/windows)');
  }

  if (config.wipeProtection) {
    score += 5;
  }

  score = Math.min(100, Math.max(0, score));

  let level: 'Weak' | 'Moderate' | 'Strong' | 'Military-Grade' = 'Weak';
  if (score >= 90) level = 'Military-Grade';
  else if (score >= 75) level = 'Strong';
  else if (score >= 50) level = 'Moderate';

  return { score, level, recommendations };
}
