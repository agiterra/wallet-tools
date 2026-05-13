/**
 * Type definitions for the wallet system.
 *
 * Three layers:
 * 1. EIP-1193 — what the dApp sees (window.ethereum.request payload + result).
 * 2. Decider protocol — what the extension sends to its decider (Wire, popup, local RPC)
 *    and what the decider returns.
 * 3. Vault entry shape — how a wallet is stored in the extension's local vault.
 */

// --- EIP-1193 ---

export type Eip1193Method =
  | "eth_requestAccounts"
  | "eth_accounts"
  | "eth_chainId"
  | "eth_sendTransaction"
  | "eth_signTransaction"
  | "personal_sign"
  | "eth_sign"
  | "eth_signTypedData_v4"
  | "wallet_switchEthereumChain"
  | "wallet_addEthereumChain"
  | "wallet_watchAsset"
  | string; // forward-compat for new methods

export interface Eip1193Request {
  method: Eip1193Method;
  params?: unknown[];
}

export interface Eip1193ErrorResponse {
  code: number;
  message: string;
  data?: unknown;
}

// --- Decider protocol ---

/**
 * What the extension publishes to its decider when a dApp calls
 * window.ethereum.request. Same shape regardless of decider transport
 * (Wire, popup UI, local RPC).
 */
export interface SignRequest {
  /** UUID minted by the extension; the decider echoes it back. */
  request_id: string;
  /** The Wire ID of the publishing extension (e.g. "wallet-vault"). */
  source: string;
  /** Address of the wallet the request is targeted at. */
  wallet_address: string;
  /** Human-readable name of the wallet (optional, for UI rendering). */
  wallet_name?: string;
  /** Browser tab the request originated from (claude-in-chrome tab ID, or playwright context id). */
  tab_id?: string;
  /** Page origin (e.g. "https://soil.dev"). */
  origin: string;
  /** Chain ID the request applies to. */
  chain_id: number;
  /** Underlying EIP-1193 method + params. */
  method: Eip1193Method;
  params: unknown[];
  /** ms epoch when the request was published. */
  created_at: number;
}

/**
 * What the decider returns. Four shapes:
 * - approve: sign + submit as requested.
 * - approve_with_override: sign + submit with modified params (test specific edge cases).
 * - refuse: return 4001 User rejected the request.
 * - reject_with_error: return a custom JSON-RPC error to the dApp.
 */
export type SignResponse =
  | { request_id: string; action: "approve" }
  | { request_id: string; action: "approve_with_override"; overrides: Record<string, unknown> }
  | { request_id: string; action: "refuse"; reason?: string }
  | { request_id: string; action: "reject_with_error"; code: number; message: string; data?: unknown };

/** Standard EIP-1193 user-rejection error (4001). */
export const USER_REJECTED_ERROR: Eip1193ErrorResponse = {
  code: 4001,
  message: "User rejected the request.",
};

// --- Vault ---

/**
 * Configuration for which decider an individual wallet uses. Lets the
 * same vault hold production wallets (Wire decider) alongside CI test
 * wallets (local RPC decider) alongside manual-only wallets (popup).
 */
export type DeciderConfig =
  | { mode: "wire" }
  | { mode: "manual" }
  | { mode: "local-rpc"; url: string; auth_token: string };

/** Single wallet entry as stored in the extension's vault. */
export interface WalletEntry {
  name: string;
  address: string;
  /**
   * AES-GCM-encrypted PKCS8 private key. Decrypted only at signing time
   * with the vault's unlock passphrase.
   */
  encrypted_key: string;
  created_at: number;
  /** Optional last-activity tracking; bumped on every sign. */
  last_used_at?: number;
  /**
   * Per-wallet decider. If unset, the vault's default applies.
   */
  decider?: DeciderConfig;
  /**
   * If set, the wallet stops responding to sign requests after this epoch.
   * Used for ephemeral CI wallets to bound their lifetime.
   */
  expires_at?: number;
}

// --- Wallet vault snapshot (for `wallet.vault.updated` payloads) ---

/**
 * Public view of the vault — names + addresses only, no keys.
 * Published on Wire when the vault mutates so dashboards / agents can
 * stay in sync.
 */
export interface VaultSnapshot {
  wallets: { name: string; address: string; created_at: number }[];
  source: string;
  published_at: number;
}
