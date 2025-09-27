import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import PythService from '../services/PythService';
import { vaultConfig, PRICE_FEED_IDS } from '../config';

const router = Router();
const pythService = new PythService();

// Env-driven addresses (prefer explicit env, fallback to vault defaults for Pyth)
const COINS_ADDRESS = process.env.COINS_ADDRESS || '';
const ORDER_MANAGER_ADDRESS = process.env.ORDER_MANAGER_ADDRESS || '';
const PYTH_CONTRACT =
  process.env.PYTH_CONTRACT ||
  (vaultConfig.networks as any)[vaultConfig.defaultNetwork]?.pythContract ||
  '';
const ETH_USD_FEED_ID =
  process.env.ETH_USD_FEED_ID || PRICE_FEED_IDS['ETH/USD'];

// Resolve RPC URL from env or vault defaults
const RPC_URL =
  process.env.RPC_URL ||
  (vaultConfig.networks as any)[vaultConfig.defaultNetwork]?.rpcUrl;

// Minimal ABIs
const pythAbi = [
  'function getUpdateFee(bytes[] updateData) external view returns (uint256)',
];

const orderManagerAbi = [
  'function executeOrder(uint256 id, bytes[] priceUpdateData) external payable',
  'function getCurrentEthPrice18() external view returns (uint256 price18, uint256 conf18, uint64 publishTime)',
  'function orders(uint256) view returns (address user,uint256 amount,uint256 stopLossPrice18,uint256 takeProfitPrice18,uint256 executorTipBps,bool open)',
];

// Utilities
function requireAddress(name: string, value: string) {
  if (!value || !ethers.utils.isAddress(value)) {
    throw new Error(`${name} is missing or invalid: ${value || 'empty'}`);
  }
}

/**
 * GET /api/orders/config
 * Returns contract addresses and ETH/USD feed id the frontend should use.
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        coins: COINS_ADDRESS,
        orderManager: ORDER_MANAGER_ADDRESS,
        pyth: PYTH_CONTRACT,
        ethUsdFeedId: ETH_USD_FEED_ID,
        rpcUrl: RPC_URL,
        network: vaultConfig.defaultNetwork,
      },
    });
  } catch (error: any) {
    logger.error('orders/config failed', { error: error?.message || error });
    return res.status(500).json({ success: false, error: 'ORDERS_CONFIG_FAILED' });
  }
});

/**
 * GET /api/orders/hermes-update
 * Returns latest Hermes price update for ETH/USD (base64 string array).
 */
router.get('/hermes-update', async (_req: Request, res: Response) => {
  try {
    const updates = await pythService.fetchHermesUpdateForOnChain([ETH_USD_FEED_ID]);
    return res.json({
      success: true,
      data: {
        symbol: 'ETH/USD',
        feedId: ETH_USD_FEED_ID,
        updates, // base64 strings
      },
    });
  } catch (error: any) {
    logger.error('orders/hermes-update failed', { error: error?.message || error });
    return res.status(500).json({ success: false, error: 'HERMES_UPDATE_FAILED' });
  }
});

/**
 * POST /api/orders/execute
 * Executes an order using server-side keeper (optional) if EXECUTOR_PRIVATE_KEY is set.
 * Body: { orderId: number, updatesBase64?: string[] }
 *
 * - If updatesBase64 is omitted, the server will fetch Hermes update for ETH/USD.
 * - The server computes the required Pyth fee via getUpdateFee and sends the executeOrder tx with { value: fee }.
 */
router.post('/execute', async (req: Request, res: Response) => {
  const { orderId, updatesBase64 } = req.body || {};
  try {
    if (typeof orderId !== 'number') {
      return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID' });
    }
    if (!RPC_URL) {
      return res.status(500).json({ success: false, error: 'MISSING_RPC_URL' });
    }
    if (!process.env.EXECUTOR_PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'KEEPER_DISABLED',
        message: 'Server execution requires EXECUTOR_PRIVATE_KEY to be configured',
      });
    }
    requireAddress('ORDER_MANAGER_ADDRESS', ORDER_MANAGER_ADDRESS);
    requireAddress('PYTH_CONTRACT', PYTH_CONTRACT);

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY as string, provider);

    const pyth = new ethers.Contract(PYTH_CONTRACT, pythAbi, provider);
    const orderManager = new ethers.Contract(ORDER_MANAGER_ADDRESS, orderManagerAbi, wallet);

    // Acquire update data
    let updates: string[] = Array.isArray(updatesBase64) ? updatesBase64 : [];
    if (updates.length === 0) {
      updates = await pythService.fetchHermesUpdateForOnChain([ETH_USD_FEED_ID]);
    }
    if (updates.length === 0) {
      return res.status(502).json({ success: false, error: 'NO_HERMES_UPDATES' });
    }

    // Convert base64 strings to bytes (0x-prefixed hex)
    const updateBytesArray: string[] = updates.map((u) => '0x' + Buffer.from(u, 'base64').toString('hex'));

    // Query Pyth fee and execute
    const fee: ethers.BigNumber = await pyth.getUpdateFee(updateBytesArray);
    const tx = await orderManager.executeOrder(orderId, updateBytesArray, { value: fee });
    logger.info('Order execute submitted', { orderId, txHash: tx.hash });

    const receipt = await tx.wait(1);
    return res.json({
      success: true,
      data: {
        orderId,
        txHash: tx.hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        fee: fee.toString(),
      },
    });
  } catch (error: any) {
    logger.error('orders/execute failed', {
      error: error?.reason || error?.message || String(error),
      orderId,
    });
    return res.status(500).json({
      success: false,
      error: 'ORDER_EXECUTE_FAILED',
      details: error?.reason || error?.message || 'unknown',
    });
  }
});

export default router;
