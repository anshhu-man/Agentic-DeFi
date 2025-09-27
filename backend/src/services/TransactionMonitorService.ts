import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

/**
 * Status enum emitted to the client.
 */
export type TxStatus =
  | 'submitted'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'replaced'
  | 'dropped';

interface WatchOptions {
  confirmations?: number;
  pollIntervalMs?: number;
}

export class TransactionMonitorService {
  private static _instance: TransactionMonitorService;
  private io?: Server;
  private providers: Map<number, ethers.providers.BaseProvider> = new Map();

  private constructor() {
    /* singleton */
  }

  /**
   * Returns the singleton instance.
   */
  public static getInstance(): TransactionMonitorService {
    if (!TransactionMonitorService._instance) {
      TransactionMonitorService._instance = new TransactionMonitorService();
    }
    return TransactionMonitorService._instance;
  }

  /**
   * Inject socket.io instance from index.ts after server startup.
   */
  public attachIO(io: Server) {
    this.io = io;
  }

  /**
   * Register an ethers provider for the given chainId.
   */
  public registerProvider(chainId: number, provider: ethers.providers.BaseProvider) {
    this.providers.set(chainId, provider);
  }

  /**
   * Begin monitoring a transaction. Emits socket.io events to user room.
   */
  public async watchTx(
    txHash: string,
    chainId: number,
    userId?: string,
    opts: WatchOptions = {}
  ): Promise<void> {
    const { confirmations = 1, pollIntervalMs = 5000 } = opts;
    const provider = this.providers.get(chainId);
    if (!provider) {
      logger.warn('No provider for chainId', { chainId });
      return;
    }

    const room = userId ? `user:${userId}` : null;
    const emit = (status: TxStatus, extra: any = {}) => {
      if (!this.io) return;
      const payload = { txHash, chainId, status, ...extra };
      if (room) {
        this.io.to(room).emit('tx_status_update', payload);
      } else {
        // Broadcast if userId not provided
        this.io.emit('tx_status_update', payload);
      }
    };

    try {
      emit('submitted');
      // Wait until the transaction first appears in a block
      let receipt: ethers.providers.TransactionReceipt | null = null;
      while (!receipt) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
          emit('pending');
          await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
      }

      // Handle replaced/dropped
      if (receipt.status === 0) {
        emit('failed', { reason: 'reverted' });
        return;
      }

      // Wait for desired confirmations
      const targetBlock = receipt.blockNumber + confirmations - 1;
      while ((await provider.getBlockNumber()) < targetBlock) {
        emit('pending', { confirmations: (await provider.getBlockNumber()) - receipt.blockNumber });
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      emit('confirmed', { blockNumber: receipt.blockNumber });
    } catch (e: any) {
      logger.error('Transaction monitor error', { txHash, chainId, error: e?.message || e });
      emit('failed', { reason: e?.message || 'monitoring_error' });
    }
  }
}

export default TransactionMonitorService.getInstance();
