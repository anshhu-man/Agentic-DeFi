import { ethers } from 'ethers';
import { NetworkConfigService, ChainId } from './NetworkConfigService';
import { logger } from '../utils/logger';

export type ScoreRationale = {
  chainId: number;
  networkName: string;
  gasGwei?: number;
  liquidityProxy?: number;
  slippageProxy?: number;
  preferenceBoost?: number;
  score: number;
  notes: string[];
};

export type ScoreParams = {
  // Approx tx size in USD; helps bias to cheaper chains for small tx
  txSizeUSD?: number;
  // User preference to bias a specific chain
  userPreferenceChainId?: number;
  // Optional expected route depth (lower is better = higher liquidity)
  routeHops?: number;
  // Optional expected slippage percent (lower is better)
  expectedSlippagePct?: number;
};

export type ScoreWeights = {
  gas: number;
  liquidity: number;
  slippage: number;
  preference: number;
};

export class NetworkSelectionService {
  private networkConfig: NetworkConfigService;
  private defaultWeights: ScoreWeights = { gas: 0.4, liquidity: 0.3, slippage: 0.2, preference: 0.1 };

  constructor() {
    this.networkConfig = new NetworkConfigService();
  }

  private getWeights(): ScoreWeights {
    try {
      const raw = process.env.NETWORK_SCORE_WEIGHTS;
      if (!raw) return this.defaultWeights;
      const parsed = JSON.parse(raw);
      const w: ScoreWeights = {
        gas: Number(parsed.gas ?? this.defaultWeights.gas),
        liquidity: Number(parsed.liquidity ?? this.defaultWeights.liquidity),
        slippage: Number(parsed.slippage ?? this.defaultWeights.slippage),
        preference: Number(parsed.preference ?? this.defaultWeights.preference),
      };
      const sum = w.gas + w.liquidity + w.slippage + w.preference;
      if (sum <= 0) return this.defaultWeights;
      return w;
    } catch {
      return this.defaultWeights;
    }
  }

  // Normalize a value into a 0..1 score where lower is better (e.g., gas, slippage, hops)
  private inverseNormalize(value: number, maxReasonable: number, clampMax = true): number {
    if (!isFinite(value) || value < 0) return 0.5;
    const v = clampMax ? Math.min(value, maxReasonable) : value;
    const score = 1 - (v / maxReasonable);
    return Math.max(0, Math.min(1, score));
  }

  private preferenceScore(chainId: number, preferred?: number): number {
    if (!preferred) return 0.5;
    return chainId === preferred ? 1.0 : 0.4;
  }

  async scoreChains(params: ScoreParams = {}): Promise<ScoreRationale[]> {
    const weights = this.getWeights();
    const chains = [ChainId.ETHEREUM, ChainId.POLYGON, ChainId.ROOTSTOCK];
    const results: ScoreRationale[] = [];

    for (const chainId of chains) {
      try {
        const cfg = this.networkConfig.getNetworkConfig(chainId);
        const provider = new ethers.providers.JsonRpcProvider(cfg.rpcUrl);

        const feeData = await provider.getFeeData().catch(() => ({ gasPrice: null }));
        const gasGwei = feeData.gasPrice ? Number(ethers.utils.formatUnits(feeData.gasPrice, 'gwei')) : 50;

        // Proxies if not provided: assume ETH best liquidity (lower hops), Polygon next, RSK lower
        const liquidityProxy =
          params.routeHops !== undefined
            ? this.inverseNormalize(params.routeHops, 4) // fewer hops -> closer to 1
            : (chainId === ChainId.ETHEREUM ? 0.95 : chainId === ChainId.POLYGON ? 0.8 : 0.5);

        // Slippage proxy (lower slippage -> higher score). If provided, normalize; else assume decent slippage on ETH/Polygon
        const slippageScore =
          params.expectedSlippagePct !== undefined
            ? this.inverseNormalize(params.expectedSlippagePct, 3) // up to 3% slippage considered
            : (chainId === ChainId.ETHEREUM ? 0.9 : chainId === ChainId.POLYGON ? 0.8 : 0.6);

        // Gas score lower gwei -> higher score. Different max per chain (ETH gwei high, Polygon low)
        const gasMax = chainId === ChainId.ETHEREUM ? 100 : 50;
        const gasScore = this.inverseNormalize(gasGwei, gasMax);

        const prefScore = this.preferenceScore(chainId, params.userPreferenceChainId);

        const composite =
          weights.gas * gasScore +
          weights.liquidity * liquidityProxy +
          weights.slippage * slippageScore +
          weights.preference * prefScore;

        const notes: string[] = [];
        notes.push(`gas ~ ${gasGwei.toFixed(2)} gwei (score=${gasScore.toFixed(2)})`);
        notes.push(`liquidity proxy score=${liquidityProxy.toFixed(2)}`);
        notes.push(`slippage proxy score=${slippageScore.toFixed(2)}`);
        notes.push(`preference score=${prefScore.toFixed(2)}`);

        results.push({
          chainId,
          networkName: cfg.name,
          gasGwei,
          liquidityProxy,
          slippageProxy: slippageScore,
          preferenceBoost: prefScore,
          score: Number(composite.toFixed(4)),
          notes,
        });
      } catch (e: any) {
        logger.warn('Failed to score chain', { chainId, error: e?.message || e });
      }
    }

    // Small tx bias: for txSizeUSD < 1000, add a small boost to Polygon (cheap L2/side-chain bias)
    if ((params.txSizeUSD ?? 0) < 1000) {
      const poly = results.find(r => r.chainId === ChainId.POLYGON);
      if (poly) {
        poly.score = Number((poly.score + 0.03).toFixed(4));
        poly.notes.push('small tx bias: +0.03');
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async chooseBestNetwork(params: ScoreParams = {}): Promise<{ chainId: number; rationale: string }> {
    const scores = await this.scoreChains(params);
    if (!scores.length) {
      // Fallback to Ethereum
      return { chainId: ChainId.ETHEREUM, rationale: 'fallback: no scores available' };
    }
    const top = scores[0];
    const rationale = `selected=${top.networkName} (score=${top.score}); ${top.notes.join('; ')}`;
    return { chainId: top.chainId, rationale };
  }
}

export default NetworkSelectionService;
