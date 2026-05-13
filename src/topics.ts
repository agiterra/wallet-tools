/**
 * Wire topic constants for the wallet system.
 *
 * The wallet uses its own topic namespace. It does NOT route through
 * the wire-ipc plugin's `webhook.ipc` family. Wire's role here is
 * transport + auth + audit; the wallet defines its own protocol on top.
 */

export const WALLET_SIGN_REQUEST = "wallet.sign.request";
export const WALLET_SIGN_RESPONSE = "wallet.sign.response";
export const WALLET_VAULT_UPDATED = "wallet.vault.updated";

/** Glob for querying any wallet-family topic (e.g. dashboard message log). */
export const WALLET_FAMILY_GLOB = "wallet.%";
