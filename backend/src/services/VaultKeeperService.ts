import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

/**
 * VaultKeeperService
 * - Periodically fetches Hermes update for a feedId
 * - Quotes exact fee via IPyth.getUpdateFee(bytes[])
 * - Calls SafeExitVault.updateAndExecute(updates, maxStaleSecs, maxConfBps, user) with the fee
 * - The vault then consumes IPyth.getPriceNoOlderThan(feedId, maxStaleSecs) inside to check triggers
 */
export type VaultKeeperConfig = {
  rpcUrl: string;
  privateKey: string;
  vaultAddress: string;
  pythAddress: string;
  feedId: string;
  intervalSec?: number;     // default 60
  maxStaleSecs?: number;    // default 60
  maxConfBps?: number;      // default 50
  users?: string[];         // addresses to monitor; will iterate these per tick
};

const PYTH_ABI = [
  'function getUpdateFee(bytes[] updateData) view returns (uint256)',
  // 'function getValidTimePeriod() view returns (uint256)' // optional (not all IPyth versions expose)
];

const VAULT_ABI = [
  'function updateAndExecute(bytes[] priceUpdate,uint256 maxStaleSecs,uint256 maxConfBps,address user) payable',
  'function getCurrentPrice(uint256 maxStaleSecs) view returns (uint256 price18, uint256 conf18)',
  'event PriceUpdated(bytes32 indexed feedId, uint256 price18, uint256 conf18, uint256 timestamp)',
  'event Executed(address indexed user, uint256 price18, uint256 amount, string triggerType, uint256 timestamp)'
];

export default class VaultKeeperService {
  private cfg: Required<VaultKeeperConfig>;
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private pyth: ethers.Contract;
  private vault: ethers.Contract;
  private timer: NodeJS.Timeout | null = null;

  private lastTickAt: number | null = null;
  private lastTxHash: string | null = null;
  private lastError: string | null = null;

  constructor(cfg: VaultKeeperConfig) {
    this.cfg = {
      intervalSec: 60,
      maxStaleSecs: 60,
      maxConfBps: 50,
      users: [],
      ...cfg
    };

    this.provider = new ethers.providers.JsonRpcProvider(this.cfg.rpcUrl);
    this.signer = new ethers.Wallet(this.cfg.privateKey, this.provider);
    this.pyth = new ethers.Contract(this.cfg.pythAddress, PYTH_ABI, this.provider);
    this.vault = new ethers.Contract(this.cfg.vaultAddress, VAULT_ABI, this.signer);

    logger.info('VaultKeeperService initialized', {
      rpcUrl: this.cfg.rpcUrl,
      vault: this.cfg.vaultAddress,
      pyth: this.cfg.pythAddress,
      feedId: this.cfg.feedId,
      intervalSec: this.cfg.intervalSec,
      maxStaleSecs: this.cfg.maxStaleSecs,
      maxConfBps: this.cfg.maxConfBps,
      users: this.cfg.users.length
    });
  }

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        const msg = e?.message || String(e);
        this.lastError = msg;
        logger.error('VaultKeeper tick failed', { error: msg });
      });
    }, this.cfg.intervalSec * 1000);
    // run immediately once
    this.tick().catch((e) => {
      const msg = e?.message || String(e);
      this.lastError = msg;
      logger.error('VaultKeeper immediate run failed', { error: msg });
    });
    logger.info('VaultKeeperService started');
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('VaultKeeperService stopped');
    }
  }

  public health() {
    return {
      lastTickAt: this.lastTickAt,
      lastTxHash: this.lastTxHash,
      lastError: this.lastError
    };
  }

  private async tick() {
    this.lastTickAt = Date.now();
    const userList = this.cfg.users && this.cfg.users.length > 0
      ? this.cfg.users
      : [await this.signer.getAddress()]; // fallback demo: signer itself

    // Fetch Hermes update once per tick and reuse for all users
    const updateHex = await this.fetchHermesUpdateHex(this.cfg.feedId);
    const fee: ethers.BigNumber = await this.pyth.getUpdateFee([updateHex]);

    logger.info('VaultKeeper tick', {
      users: userList.length,
      updateBytes: (updateHex as string).length - 2,
      feeWei: fee.toString()
    });

    for (const user of userList) {
      try {
        const tx = await this.vault.updateAndExecute(
          [updateHex],
          this.cfg.maxStaleSecs,
          this.cfg.maxConfBps,
          user,
          { value: fee }
        );
        logger.info('updateAndExecute sent', { user, txHash: tx.hash });
        const rcpt = await tx.wait();
        logger.info('updateAndExecute receipt', { user, status: rcpt.status, logs: rcpt.logs?.length || 0 });
        this.lastTxHash = tx.hash;
      } catch (e: any) {
        const msg: string = e?.error?.message || e?.reason || e?.message || String(e);
        // Expected benign case: No trigger condition
        if (/trigger/i.test(msg) || /not met/i.test(msg)) {
          logger.debug('No trigger condition met', { user, message: msg });
        } else {
          logger.warn('updateAndExecute failed', { user, error: msg });
          this.lastError = msg;
        }
      }
    }
  }

  private async fetchHermesUpdateHex(feedId: string): Promise<string> {
    const urlHex = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`;
    const res = await axios.get(urlHex, { timeout: 15000, headers: { Accept: 'application/json' } });
    const hex = res.data?.updates?.[0] || res.data?.binary?.data?.[0];
    if (!hex || typeof hex !== 'string') {
      throw new Error('Hermes update hex not available');
    }
    return '0x' + hex.trim();
  }
}
