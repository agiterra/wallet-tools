/**
 * WalletTestDriver — Node-side library for Playwright tests.
 *
 * Drives the wallet extension via the LocalRpcDecider transport (no
 * Wire required). See design doc §CI mode (no Wire, no agent) at
 * github.com/agiterra/architecture/blob/main/agent-wallet-extension.md
 * for the architecture.
 *
 * v0 STUB: this file scaffolds the public API but doesn't implement
 * the HTTP server yet. Implementation lands alongside wallet-extension
 * v0.5 when the LocalRpcDecider ships. The shape below is the
 * contract that tests will write against.
 */

import type { SignRequest, SignResponse } from "./types.js";

export type SignRequestHandler = (
  req: SignRequest,
) => SignResponse | Promise<SignResponse> | Omit<SignResponse, "request_id"> | Promise<Omit<SignResponse, "request_id">>;

export interface WalletTestDriverSetupOptions {
  /** Funding strategy for the test wallet. */
  fundingMode: "anvil" | "master-drip" | "preconfigured";
  /** Chain IDs the test wallet should accept signs for. */
  chainIds: number[];
  /** Optional: a friendly name for the wallet (default: "ci-test-<uuid>"). */
  walletName?: string;
  /** RPC URL for the chain (defaults to localhost:8545 for anvil). */
  rpcUrl?: string;
  /** For master-drip mode: the funding source's private key. */
  masterPrivateKey?: string;
  /** Initial funding amount in wei. */
  fundingAmountWei?: bigint;
}

export class WalletTestDriver {
  /**
   * Set up the driver: start local HTTP server, configure extension,
   * create + fund wallet, register handler. Call from Playwright fixture's
   * `use()` boundary.
   *
   * STUB: implementation pending wallet-extension v0.5.
   */
  static async setup(_opts: WalletTestDriverSetupOptions): Promise<WalletTestDriver> {
    throw new Error("WalletTestDriver.setup not yet implemented (pending wallet-extension v0.5)");
  }

  /** Register a handler for ALL incoming sign requests. Overrides any previous default. */
  onSignRequest(_handler: SignRequestHandler): this {
    throw new Error("not yet implemented");
  }

  /**
   * Register a one-shot handler that consumes the next matching sign
   * request. Stacks like jest's mockImplementationOnce.
   */
  onceSignRequest(_handler: SignRequestHandler): this {
    throw new Error("not yet implemented");
  }

  /**
   * Queue a pre-baked response for the next sign request, in order.
   * Equivalent to `onceSignRequest(() => response)`.
   */
  queueResponse(_response: Omit<SignResponse, "request_id">): this {
    throw new Error("not yet implemented");
  }

  /**
   * Return all sign requests this driver has received so far. Useful
   * for post-hoc assertions about what the dApp asked the wallet to
   * sign during the test.
   */
  getSignRequests(): SignRequest[] {
    throw new Error("not yet implemented");
  }

  /** Wallet address this driver is bound to. */
  get address(): string {
    throw new Error("not yet implemented");
  }

  /** Tear down: stop server, delete wallet, clean up config. */
  async teardown(): Promise<void> {
    throw new Error("not yet implemented");
  }
}
