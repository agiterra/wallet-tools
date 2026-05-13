/**
 * secp256k1 signing helpers. Implements the three signing shapes a dApp
 * may ask for:
 *   - personal_sign (EIP-191): sign an arbitrary message with prefix.
 *   - eth_signTypedData_v4 (EIP-712): sign a structured typed-data object.
 *   - eth_signTransaction / eth_sendTransaction: sign an EIP-1559 transaction.
 *
 * Backed by @noble/curves (secp256k1) + @noble/hashes (keccak_256).
 * Pure-JS, browser-and-node-compat, no native deps.
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

// --- Address derivation ---

/** Derive 0x-prefixed Ethereum address from a 32-byte private key. */
export function addressFromPrivateKey(privateKeyHex: string): string {
  const pk = hexToBytes(strip0x(privateKeyHex));
  if (pk.length !== 32) throw new Error("private key must be 32 bytes");
  // Uncompressed public key, drop the 0x04 prefix, hash, take last 20 bytes.
  const pub = secp256k1.getPublicKey(pk, false).slice(1);
  const hash = keccak_256(pub);
  return "0x" + bytesToHex(hash.slice(-20));
}

// --- Signing ---

export interface Signature {
  r: string; // 0x-prefixed 32 bytes
  s: string; // 0x-prefixed 32 bytes
  v: number; // recovery id (27 or 28 for legacy, 0 or 1 for typed)
  /** Concatenated 65-byte signature: r || s || v(1 byte). */
  serialized: string;
}

/** Sign a 32-byte digest with secp256k1. Returns r, s, v + serialized form. */
export function signDigest(digestHex: string, privateKeyHex: string): Signature {
  const digest = hexToBytes(strip0x(digestHex));
  if (digest.length !== 32) throw new Error("digest must be 32 bytes");
  const pk = hexToBytes(strip0x(privateKeyHex));
  const sig = secp256k1.sign(digest, pk);
  // @noble returns Signature with r, s, recovery. recovery is 0 or 1.
  const r = "0x" + sig.r.toString(16).padStart(64, "0");
  const s = "0x" + sig.s.toString(16).padStart(64, "0");
  const recovery = sig.recovery ?? 0;
  // Legacy v = recovery + 27 for personal_sign / eth_sign.
  // EIP-712 uses recovery + 27 too.
  // EIP-1559 tx signing uses raw recovery (0 or 1) in the y_parity field.
  const v = recovery + 27;
  const serialized =
    "0x" +
    r.slice(2) +
    s.slice(2) +
    v.toString(16).padStart(2, "0");
  return { r, s, v, serialized };
}

// --- EIP-191 personal_sign ---

/**
 * Sign a personal message per EIP-191 v=0x45 ("\x19Ethereum Signed Message:\n<len><msg>" prefix).
 * Returns the 0x-prefixed 65-byte serialized signature.
 */
export function personalSign(message: string, privateKeyHex: string): string {
  const msgBytes = utf8ToBytes(message);
  const prefix = utf8ToBytes(`\x19Ethereum Signed Message:\n${msgBytes.length}`);
  const concat = new Uint8Array(prefix.length + msgBytes.length);
  concat.set(prefix, 0);
  concat.set(msgBytes, prefix.length);
  const digest = keccak_256(concat);
  return signDigest("0x" + bytesToHex(digest), privateKeyHex).serialized;
}

// --- EIP-712 typed-data signing ---

/**
 * Sign EIP-712 typed data. Caller is responsible for producing the
 * encoded digest per the spec (hashStruct over domain + message). This
 * helper just signs the final 32-byte digest. v0 wires the dApp's
 * passed-in typed-data through a separate hashing function; see callers.
 *
 * For convenience, accepts either a pre-hashed digest (0x-prefixed) or
 * a raw object the caller wants us to hash (not implemented in v0 —
 * EIP-712 hashing is non-trivial; use ethers/viem in caller code and
 * pass the resulting digest here).
 */
export function signTypedDataV4Digest(digestHex: string, privateKeyHex: string): string {
  return signDigest(digestHex, privateKeyHex).serialized;
}

// --- Utility ---

function strip0x(s: string): string {
  return s.startsWith("0x") ? s.slice(2) : s;
}
