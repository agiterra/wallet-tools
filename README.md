# @agiterra/wallet-tools

Shared primitives for the agent wallet system. Used by:
- `@agiterra/wallet-claude-code` — the CC plugin (channel handler + MCP tools)
- `@agiterra/wallet-extension` — the Chrome extension (vault + EIP-1193 surface)

## Exports

- `./topics` — Wire topic constants (`wallet.sign.request`, `wallet.sign.response`, `wallet.vault.updated`)
- `./types` — EIP-1193 envelope shapes, decider protocol payloads, wallet entry shape
- `./sign` — secp256k1 signing helpers (EIP-191 personal_sign, EIP-1559 typed tx, EIP-712 typed data)
- `./vault` — AES-GCM vault encryption helpers (encrypt/decrypt private keys for storage)
- `./test` — Node-side `WalletTestDriver` for Playwright CI tests

See [agiterra/architecture/agent-wallet-extension.md](https://github.com/agiterra/architecture/blob/main/agent-wallet-extension.md) for the design.

## Versioning

Strict semver. Patch for internal changes; minor for new exports; major for breaking changes to any export.
