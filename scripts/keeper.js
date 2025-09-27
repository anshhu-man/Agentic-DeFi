#!/usr/bin/env node
/**
 * Keeper pusher script
 * - Fetches Hermes payload for ETH/USD
 * - Quotes exact getUpdateFee on Pyth
 * - Calls SafeExitVault.updateAndExecute(updates, 60, 50, user) with fee
 * Usage:
 *   node scripts/keeper.js
 *   (configure via env or defaults below)
 */

const DEFAULTS = {
  RPC_URL: process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  VAULT_ADDR: process.env.VAULT_ADDR || "0xc15Bd67aeDe51B2960e47fFd6Dec9f084646086c",
  PYTH_ADDRESS: process.env.PYTH_ADDRESS || "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
  FEED_ID: process.env.FEED_ID || "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  MAX_STALE_SECS: Number(process.env.MAX_STALE_SECS || "60"),
  MAX_CONF_BPS: Number(process.env.MAX_CONF_BPS || "50"),
  INTERVAL_SEC: Number(process.env.INTERVAL_SEC || "60"),
  LOOP: (process.env.KEEPER_LOOP || "false").toLowerCase() === "true",
};

async function fetchHexUpdate(feedId) {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`);
  const data = await res.json();
  // try several shapes
  const hex = data?.updates?.[0] || data?.binary?.data?.[0];
  if (!hex || typeof hex !== "string") throw new Error("Hermes update payload missing");
  return "0x" + hex.trim();
}

async function runOnce(cfg) {
  const { ethers } = await import("ethers");
  const provider = new ethers.providers.JsonRpcProvider(cfg.RPC_URL);
  const wallet = new ethers.Wallet(cfg.PRIVATE_KEY, provider);
  const user = await wallet.getAddress();

  const pythAbi = [
    "function getUpdateFee(bytes[] updateData) view returns (uint256)"
  ];
  const vaultAbi = [
    "function updateAndExecute(bytes[] priceUpdate,uint256 maxStaleSecs,uint256 maxConfBps,address user) payable"
  ];

  const pyth = new ethers.Contract(cfg.PYTH_ADDRESS, pythAbi, provider);
  const vault = new ethers.Contract(cfg.VAULT_ADDR, vaultAbi, wallet);

  console.log(`[keeper] Using:
  - rpc: ${cfg.RPC_URL}
  - user: ${user}
  - vault: ${cfg.VAULT_ADDR}
  - pyth: ${cfg.PYTH_ADDRESS}
  - feedId: ${cfg.FEED_ID}
  - params: maxStale=${cfg.MAX_STALE_SECS}s, maxConf=${cfg.MAX_CONF_BPS} bps
  `);

  // Fetch Hermes update
  const updateHex = await fetchHexUpdate(cfg.FEED_ID);
  console.log(`[keeper] Hermes update bytes: ${updateHex.length - 2}`);

  // Quote fee and send
  const fee = await pyth.getUpdateFee([updateHex]);
  console.log(`[keeper] getUpdateFee(1 update) = ${fee.toString()} wei`);

  try {
    const tx = await vault.updateAndExecute([updateHex], cfg.MAX_STALE_SECS, cfg.MAX_CONF_BPS, user, { value: fee });
    console.log(`[keeper] updateAndExecute sent: ${tx.hash}`);
    const rcpt = await tx.wait();
    console.log(`[keeper] updateAndExecute status: ${rcpt.status} (1=success) logs=${rcpt.logs?.length ?? 0}`);
    return { ok: true, tx: tx.hash, status: rcpt.status, logs: rcpt.logs?.length ?? 0 };
  } catch (e) {
    const msg = e?.error?.message || e?.reason || e?.message || String(e);
    console.error(`[keeper] updateAndExecute failed: ${msg}`);
    if (msg.toLowerCase().includes("no trigger") || msg.toLowerCase().includes("not met")) {
      console.log("[keeper] NOTE: No trigger condition met — acceptable when current price not crossing thresholds.");
    }
    return { ok: false, error: msg };
  }
}

async function main() {
  const cfg = { ...DEFAULTS };
  if (!cfg.PRIVATE_KEY || !cfg.VAULT_ADDR || !cfg.PYTH_ADDRESS) {
    console.error("[keeper] Missing required env: PRIVATE_KEY, VAULT_ADDR, PYTH_ADDRESS");
    process.exit(1);
  }

  const loop = async () => {
    try {
      await runOnce(cfg);
    } catch (err) {
      console.error("[keeper] runOnce errored:", err?.message || err);
    }
  };

  if (!cfg.LOOP) {
    await loop();
    return;
  }

  console.log(`[keeper] Looping every ${cfg.INTERVAL_SEC}s ...`);
  await loop();
  setInterval(loop, cfg.INTERVAL_SEC * 1000);
}

if (typeof fetch === "undefined") {
  // Node < 18, fallback to dynamic import of node-fetch if available
  globalThis.fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
}

main().catch((e) => {
  console.error("[keeper] fatal:", e?.message || e);
  process.exit(1);
});
