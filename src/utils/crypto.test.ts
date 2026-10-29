import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPin,
  encryptText,
  decryptText,
  calculateSecurityScore,
} from './crypto';

test('hashPin returns deterministic 64-char SHA-256 hex string', async () => {
  const hash1 = await hashPin('1234');
  const hash2 = await hashPin('1234');
  const hashOther = await hashPin('4321');

  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashOther);
});

test('encryptText and decryptText roundtrip matches original message', async () => {
  const message = 'Secret confidential diary note with bank codes: #994821';
  const pin = '1234';

  const encrypted = await encryptText(message, pin);
  assert.ok(encrypted.startsWith('ENC:'));
  assert.notEqual(encrypted, message);

  const decrypted = await decryptText(encrypted, pin);
  assert.equal(decrypted, message);

  // Decryption with wrong PIN returns error message
  const wrongDecrypted = await decryptText(encrypted, '0000');
  assert.match(wrongDecrypted, /Decryption Error/);
});

test('calculateSecurityScore provides score and rating level', () => {
  const strong = calculateSecurityScore({
    masterPinLength: 6,
    hasDecoyPin: true,
    intruderDetection: true,
    autoLockMinutes: 1,
    lockOnBlur: true,
    wipeProtection: true,
  });
  assert.ok(strong.score >= 90);
  assert.equal(strong.level, 'Military-Grade');

  const weak = calculateSecurityScore({
    masterPinLength: 3,
    hasDecoyPin: false,
    intruderDetection: false,
    autoLockMinutes: 0,
    lockOnBlur: false,
    wipeProtection: false,
  });
  assert.ok(weak.score < 50);
  assert.equal(weak.level, 'Weak');
});
