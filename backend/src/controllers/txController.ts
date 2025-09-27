import { Router, Request, Response } from 'express';
import TransactionMonitor from '../services/TransactionMonitorService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/tx/monitor
 * Body: { txHash: string, chainId: number, userId?: string, confirmations?: number, pollIntervalMs?: number }
 * Starts monitoring a transaction and emits socket.io updates to user room (user:{userId}) if provided,
 * otherwise broadcasts globally.
 */
router.post('/monitor', async (req: Request, res: Response) => {
  try {
    const { txHash, chainId, userId, confirmations, pollIntervalMs } = req.body || {};

    if (!txHash || typeof txHash !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TX_HASH', message: 'txHash is required and must be a string' }
      });
    }

    const parsedChainId = Number(chainId);
    if (!parsedChainId || Number.isNaN(parsedChainId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CHAIN_ID', message: 'chainId is required and must be a number' }
      });
    }

    // Fire-and-forget monitor; socket.io will emit status updates
    TransactionMonitor.watchTx(txHash, parsedChainId, userId, {
      confirmations: confirmations ? Number(confirmations) : 1,
      pollIntervalMs: pollIntervalMs ? Number(pollIntervalMs) : 5000
    }).catch((e) => {
      logger.warn('Transaction monitor invocation failed', { txHash, chainId: parsedChainId, error: e?.message || e });
    });

    return res.json({
      success: true,
      data: { txHash, chainId: parsedChainId, userId, status: 'monitoring_started' }
    });
  } catch (error: any) {
    logger.error('POST /api/tx/monitor failed', { error: error?.message || error });
    return res.status(500).json({
      success: false,
      error: { code: 'TX_MONITOR_FAILED', message: 'Failed to start transaction monitoring' }
    });
  }
});

export default router;
