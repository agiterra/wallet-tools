/**
 * Wallet-directory storage convention (ENG-3313).
 *
 * The directory lives in Wire plugin_settings under the vault's own
 * namespace (default "wallet-vault"). Two generations coexist:
 *
 *   - LEGACY: a single `wallets` key holding the whole WalletDirectory
 *     blob. Whole-object PUTs race — two concurrent writers each
 *     read-modify-write the full roster and the loser's wallets vanish
 *     (proven live in the wallet-vault-3313 harness: 4 wallets created,
 *     2 survived).
 *   - PER-KEY: each wallet under `wallet:<lowercase-address>` with a
 *     WalletMeta value. Concurrent creates touch distinct keys and
 *     cannot clobber each other; no compare-and-swap needed.
 *
 * Until every writer has migrated and the legacy blob is deleted:
 * readers MUST merge both generations (per-key wins per address);
 * writers MUST write per-key only. Editing a legacy-blob wallet
 * per-key migrates it incrementally — the per-key copy shadows the
 * stale blob entry from then on.
 *
 * Other keys in the namespace (e.g. a `__vault_meta` marker) are
 * ignored by the merge — the namespace is shared, not wallet-only.
 */

import type { WalletDirectory, WalletMeta } from "./types.js";

/** Pre-ENG-3313 whole-roster blob key. Read for back-compat; never write. */
export const WALLETS_LEGACY_KEY = "wallets";

/** Per-wallet key prefix: `wallet:<lowercase-address>`. */
export const WALLET_KEY_PREFIX = "wallet:";

/** plugin_settings key for one wallet: `wallet:` + lowercase address. */
export function walletSettingKey(address: string): string {
  return WALLET_KEY_PREFIX + address.toLowerCase();
}

/**
 * Inverse of walletSettingKey. Returns the lowercase address, or null
 * if the key isn't a well-formed per-wallet key.
 */
export function addressFromWalletSettingKey(key: string): string | null {
  if (!key.startsWith(WALLET_KEY_PREFIX)) return null;
  const addr = key.slice(WALLET_KEY_PREFIX.length).toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(addr) ? addr : null;
}

/** Structural check — plugin_settings values are untyped JSON. */
export function isWalletMeta(v: unknown): v is WalletMeta {
  if (v === null || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.name === "string" &&
    typeof m.creator === "string" &&
    typeof m.chain_id === "number" &&
    m.access !== null &&
    typeof m.access === "object" &&
    typeof (m.access as Record<string, unknown>).mode === "string" &&
    Array.isArray((m.access as Record<string, unknown>).agents)
  );
}

/**
 * Build a WalletDirectory from a raw namespace listing
 * (`GET /plugin_settings/<namespace>` → Record<key, value>).
 * Legacy blob entries seed the result; per-key entries overwrite them
 * for the same address. Malformed values and unrelated keys are skipped.
 */
export function mergeWalletDirectory(settings: Record<string, unknown>): WalletDirectory {
  const out: WalletDirectory = {};
  const legacy = settings[WALLETS_LEGACY_KEY];
  if (legacy !== null && typeof legacy === "object") {
    for (const [addr, meta] of Object.entries(legacy as Record<string, unknown>)) {
      if (isWalletMeta(meta)) out[addr.toLowerCase()] = meta;
    }
  }
  for (const [key, value] of Object.entries(settings)) {
    const addr = addressFromWalletSettingKey(key);
    if (addr && isWalletMeta(value)) out[addr] = value;
  }
  return out;
}
