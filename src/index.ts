/**
 * @agiterra/wallet-tools — shared primitives for the agent wallet system.
 *
 * Exports re-organized by concern:
 *   ./topics  → Wire topic constants
 *   ./types   → protocol + vault entry shapes
 *   ./sign    → secp256k1 signing helpers
 *   ./vault   → AES-GCM vault encryption
 *   ./test    → Node-side Playwright test driver
 *
 * This root export re-exports the most commonly-used surface for
 * convenience.
 */

export * from "./topics.js";
export * from "./types.js";
export {
  addressFromPrivateKey,
  signDigest,
  personalSign,
  signTypedDataV4Digest,
} from "./sign.js";
export {
  generatePrivateKey,
  encryptPrivateKey,
  decryptPrivateKey,
} from "./vault.js";
