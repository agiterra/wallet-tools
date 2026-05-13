/**
 * Vault encryption helpers. The extension's vault stores private keys
 * AES-GCM-encrypted at rest. The unlock passphrase derives a key via
 * PBKDF2; encrypted entries hold a per-entry IV + ciphertext.
 *
 * v0 caveat: the unlock passphrase is auto-loaded from chrome.storage.session
 * (RAM-resident, seeded at extension install from env). v1 promotes to
 * OS keychain via native messaging host. The encryption layer here is
 * the same in both cases — what changes is where the passphrase comes
 * from.
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, randomBytes } from "@noble/hashes/utils";

// --- Web Crypto wrappers (works in browser + Bun + recent Node) ---

const enc = new TextEncoder();

// Web Crypto's BufferSource type is strict about Uint8Array<ArrayBuffer>
// vs Uint8Array<ArrayBufferLike>. Casting is the pragmatic fix that
// works in every runtime we target. The behavior is identical.
type AnyBuf = ArrayBuffer | ArrayBufferView;

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase) as AnyBuf as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as AnyBuf as BufferSource, iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// --- Encrypted-entry format ---

/**
 * Stored shape (JSON-stringified into WalletEntry.encrypted_key):
 *   {v: 1, salt: <hex>, iv: <hex>, ct: <hex>}
 * where ct is AES-GCM(plaintext = raw 32-byte secp256k1 private key).
 */
interface EncryptedKeyEnvelope {
  v: 1;
  salt: string; // hex
  iv: string;   // hex
  ct: string;   // hex
}

function bytesToHexLocal(b: Uint8Array): string {
  return bytesToHex(b);
}

function hexToBytesLocal(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// --- Public API ---

/**
 * Generate a fresh secp256k1 private key (32 bytes).
 * Returned as 0x-prefixed hex for downstream use.
 */
export function generatePrivateKey(): string {
  return "0x" + bytesToHexLocal(secp256k1.utils.randomPrivateKey());
}

/**
 * Encrypt a private key for storage. Returns a JSON-stringified envelope
 * suitable to put in WalletEntry.encrypted_key.
 */
export async function encryptPrivateKey(privateKeyHex: string, passphrase: string): Promise<string> {
  const pkHex = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  if (pkHex.length !== 64) throw new Error("private key must be 32 bytes (64 hex chars)");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(passphrase, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as AnyBuf as BufferSource },
      key,
      hexToBytesLocal(pkHex) as AnyBuf as BufferSource,
    ),
  );
  const env: EncryptedKeyEnvelope = {
    v: 1,
    salt: bytesToHexLocal(salt),
    iv: bytesToHexLocal(iv),
    ct: bytesToHexLocal(ct),
  };
  return JSON.stringify(env);
}

/** Decrypt an encrypted-key envelope back to 0x-prefixed private key hex. */
export async function decryptPrivateKey(encrypted: string, passphrase: string): Promise<string> {
  const env = JSON.parse(encrypted) as EncryptedKeyEnvelope;
  if (env.v !== 1) throw new Error(`unsupported vault envelope version: ${env.v}`);
  const salt = hexToBytesLocal(env.salt);
  const iv = hexToBytesLocal(env.iv);
  const ct = hexToBytesLocal(env.ct);
  const key = await deriveAesKey(passphrase, salt);
  const pt = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as AnyBuf as BufferSource },
      key,
      ct as AnyBuf as BufferSource,
    ),
  );
  return "0x" + bytesToHexLocal(pt);
}
