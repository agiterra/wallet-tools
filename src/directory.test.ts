import { describe, expect, test } from "bun:test";
import {
  addressFromWalletSettingKey,
  isWalletMeta,
  mergeWalletDirectory,
  walletSettingKey,
} from "./directory.js";
import type { WalletMeta } from "./types.js";

const ADDR_A = "0x9aa78e34fa45f1359c5d6c47e9d28b09c2f0e9a1";
const ADDR_B = "0x4cd45247cf4a26e0ae1b89e72f7b9f1f1a47474c";

function meta(name: string, creator = "fondant"): WalletMeta {
  return {
    name,
    creator,
    created_at: 1765000000000,
    chain_id: 11155111,
    access: { mode: "specific", agents: [creator] },
  };
}

describe("walletSettingKey", () => {
  test("lowercases the address", () => {
    expect(walletSettingKey(ADDR_A.toUpperCase().replace("0X", "0x"))).toBe(`wallet:${ADDR_A}`);
  });

  test("round-trips through addressFromWalletSettingKey", () => {
    expect(addressFromWalletSettingKey(walletSettingKey(ADDR_A))).toBe(ADDR_A);
  });
});

describe("addressFromWalletSettingKey", () => {
  test("rejects non-wallet keys", () => {
    expect(addressFromWalletSettingKey("wallets")).toBeNull();
    expect(addressFromWalletSettingKey("__vault_meta")).toBeNull();
    expect(addressFromWalletSettingKey(`vault:${ADDR_A}`)).toBeNull();
  });

  test("rejects malformed addresses", () => {
    expect(addressFromWalletSettingKey("wallet:nonsense")).toBeNull();
    expect(addressFromWalletSettingKey("wallet:0x1234")).toBeNull();
    expect(addressFromWalletSettingKey("wallet:")).toBeNull();
  });

  test("normalizes checksummed addresses to lowercase", () => {
    const checksummed = "wallet:0x9Aa78E34Fa45F1359c5D6c47E9d28B09c2F0e9A1";
    expect(addressFromWalletSettingKey(checksummed)).toBe(ADDR_A);
  });
});

describe("isWalletMeta", () => {
  test("accepts a well-formed meta", () => {
    expect(isWalletMeta(meta("e2e"))).toBe(true);
  });

  test("rejects junk", () => {
    expect(isWalletMeta(null)).toBe(false);
    expect(isWalletMeta("string")).toBe(false);
    expect(isWalletMeta({})).toBe(false);
    expect(isWalletMeta({ name: "x", creator: "y", chain_id: "not-a-number", access: { mode: "all", agents: [] } })).toBe(false);
    expect(isWalletMeta({ name: "x", creator: "y", chain_id: 1, access: { mode: "all" } })).toBe(false);
  });
});

describe("mergeWalletDirectory", () => {
  test("reads legacy blob alone", () => {
    const dir = mergeWalletDirectory({ wallets: { [ADDR_A]: meta("legacy-a") } });
    expect(Object.keys(dir)).toEqual([ADDR_A]);
    expect(dir[ADDR_A]!.name).toBe("legacy-a");
  });

  test("reads per-key entries alone", () => {
    const dir = mergeWalletDirectory({ [walletSettingKey(ADDR_B)]: meta("perkey-b") });
    expect(Object.keys(dir)).toEqual([ADDR_B]);
    expect(dir[ADDR_B]!.name).toBe("perkey-b");
  });

  test("per-key wins over legacy for the same address", () => {
    const dir = mergeWalletDirectory({
      wallets: { [ADDR_A]: meta("stale-blob-copy") },
      [walletSettingKey(ADDR_A)]: meta("migrated"),
    });
    expect(Object.keys(dir)).toEqual([ADDR_A]);
    expect(dir[ADDR_A]!.name).toBe("migrated");
  });

  test("merges disjoint generations", () => {
    const dir = mergeWalletDirectory({
      wallets: { [ADDR_A]: meta("legacy-a") },
      [walletSettingKey(ADDR_B)]: meta("perkey-b"),
    });
    expect(Object.keys(dir).sort()).toEqual([ADDR_B, ADDR_A].sort());
  });

  test("ignores unrelated namespace keys and malformed values", () => {
    const dir = mergeWalletDirectory({
      __vault_meta: { kind: "browser-instance", label: "tims-chrome" },
      "wallet:garbage": meta("bad-key"),
      [walletSettingKey(ADDR_A)]: { not: "a wallet" },
      wallets: "not-an-object",
    });
    expect(dir).toEqual({});
  });

  test("normalizes legacy blob addresses to lowercase", () => {
    const checksummed = "0x9Aa78E34Fa45F1359c5D6c47E9d28B09c2F0e9A1";
    const dir = mergeWalletDirectory({ wallets: { [checksummed]: meta("legacy-mixed-case") } });
    expect(Object.keys(dir)).toEqual([ADDR_A]);
  });
});
