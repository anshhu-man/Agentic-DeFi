export type TradeSide = "ETH_TO_USDC" | "USDC_TO_ETH" | "HOLD";

export interface TradeRecord {
  timestamp: number;
  side: TradeSide;
  ethPrice: number;
  sizeEth: number;
  pnlPct: number;
}

export interface StrategyMemory {
  trades: TradeRecord[];
  successRates: Record<TradeSide, number>;
  avgPnl: Record<TradeSide, number>;
  maxTradesKept: number;
  lastSummaryAt: number;
  summaryCooldownSec: number;
}

function defaultMemory(maxTradesKept = 100): StrategyMemory {
  return {
    trades: [],
    successRates: { ETH_TO_USDC: 0, USDC_TO_ETH: 0, HOLD: 0 },
    avgPnl: { ETH_TO_USDC: 0, USDC_TO_ETH: 0, HOLD: 0 },
    maxTradesKept,
    lastSummaryAt: 0,
    summaryCooldownSec: 120,
  };
}

export class StatefulSwapStrategy {
  private rebalanceThreshold: number;
  private observeCyclesBeforeTrade: number;
  private observedCycles: number;
  private _lastPrice: number | null;
  public memory: StrategyMemory;

  constructor(params?: {
    rebalanceThreshold?: number;
    observeCyclesBeforeTrade?: number;
    maxTradesKept?: number;
  }) {
    this.rebalanceThreshold = params?.rebalanceThreshold ?? 0;
    this.observeCyclesBeforeTrade = params?.observeCyclesBeforeTrade ?? 0;
    this.observedCycles = 0;
    this._lastPrice = null;
    this.memory = defaultMemory(params?.maxTradesKept ?? 100);
  }

  observe(ethPrice: number, _marketVolatility?: number) {
    this.observedCycles += 1;
    this._lastPrice = ethPrice;
  }

  private marketSignal(ethPrice: number): number {
    if (this._lastPrice == null) return 0;
    const delta = ethPrice - this._lastPrice;
    const rel = this._lastPrice > 0 ? delta / this._lastPrice : 0;
    // Clamp to [-0.02, 0.02]
    return Math.max(Math.min(rel, 0.02), -0.02);
  }

  decide(ethPrice: number, portfolioEth: number, portfolioUsdc: number, recentMarketSignal?: number): TradeSide {
    // Warmup
    if (this.observedCycles < this.observeCyclesBeforeTrade) {
      this._lastPrice = ethPrice;
      return "HOLD";
    }

    const ethToUsdcScore = this.memory.avgPnl["ETH_TO_USDC"];
    const usdcToEthScore = this.memory.avgPnl["USDC_TO_ETH"];
    const marketBias = recentMarketSignal == null ? this.marketSignal(ethPrice) : recentMarketSignal;

    const scoreBuyEth = usdcToEthScore + marketBias;
    const scoreSellEth = ethToUsdcScore - marketBias;

    if (this.rebalanceThreshold <= 0) {
      if (scoreBuyEth > scoreSellEth && portfolioUsdc > 0) {
        this._lastPrice = ethPrice;
        return "USDC_TO_ETH";
      }
      if (scoreSellEth > scoreBuyEth && portfolioEth > 0) {
        this._lastPrice = ethPrice;
        return "ETH_TO_USDC";
      }
      this._lastPrice = ethPrice;
      return "HOLD";
    }

    const diff = Math.abs(scoreBuyEth - scoreSellEth);
    if (diff < this.rebalanceThreshold) {
      this._lastPrice = ethPrice;
      return "HOLD";
    }
    this._lastPrice = ethPrice;
    return scoreBuyEth > scoreSellEth ? "USDC_TO_ETH" : "ETH_TO_USDC";
  }

  recordTradeOutcome(side: TradeSide, entryPrice: number, exitPrice: number, sizeEth: number) {
    let pnlPct = 0;
    if (side === "USDC_TO_ETH") {
      pnlPct = entryPrice > 0 ? (exitPrice - entryPrice) / entryPrice : 0;
    } else if (side === "ETH_TO_USDC") {
      pnlPct = entryPrice > 0 ? (entryPrice - exitPrice) / entryPrice : 0;
    } else {
      pnlPct = 0;
    }

    this.memory.trades.push({
      timestamp: Date.now() / 1000,
      side,
      ethPrice: exitPrice,
      sizeEth,
      pnlPct,
    });

    this.updateMetrics();
    this.summarizeIfNeeded();
  }

  performanceInsights(): string {
    const sr = this.memory.successRates;
    const ap = this.memory.avgPnl;
    return (
      `ETH->USDC success: ${sr["ETH_TO_USDC"].toFixed(2)}, avg PnL: ${ap["ETH_TO_USDC"].toFixed(3)}; ` +
      `USDC->ETH success: ${sr["USDC_TO_ETH"].toFixed(2)}, avg PnL: ${ap["USDC_TO_ETH"].toFixed(3)}`
    );
  }

  private updateMetrics() {
    const trades = this.memory.trades;
    if (!trades.length) {
      this.memory.successRates = { ETH_TO_USDC: 0, USDC_TO_ETH: 0, HOLD: 0 };
      this.memory.avgPnl = { ETH_TO_USDC: 0, USDC_TO_ETH: 0, HOLD: 0 };
      return;
    }

    const bySide: Record<TradeSide, number[]> = {
      ETH_TO_USDC: [],
      USDC_TO_ETH: [],
      HOLD: [],
    };

    for (const t of trades) bySide[t.side].push(t.pnlPct);

    (Object.keys(bySide) as TradeSide[]).forEach((side) => {
      const arr = bySide[side];
      if (arr.length) {
        const wins = arr.filter((x) => x > 0).length;
        this.memory.successRates[side] = wins / arr.length;
        this.memory.avgPnl[side] = arr.reduce((a, b) => a + b, 0) / arr.length;
      } else {
        this.memory.successRates[side] = 0;
        this.memory.avgPnl[side] = 0;
      }
    });
  }

  private summarizeIfNeeded() {
    const now = Date.now() / 1000;
    if (this.memory.trades.length <= this.memory.maxTradesKept) return;
    if (now - this.memory.lastSummaryAt < this.memory.summaryCooldownSec) return;

    // Keep last 10 and best trade by PnL (if not already included)
    const recent = this.memory.trades.slice(-10);
    let bestTrade: TradeRecord | undefined;
    for (const t of this.memory.trades) {
      if (!bestTrade || t.pnlPct > bestTrade.pnlPct) bestTrade = t;
    }
    const kept = recent.slice();
    if (bestTrade && !recent.includes(bestTrade)) kept.push(bestTrade);
    this.memory.trades = kept;
    this.updateMetrics();
    this.memory.lastSummaryAt = now;
  }
}

// Utility: seeded RNG for reproducible simulations
export function makeSeededRng(seed: number | undefined) {
  // Mulberry32
  let s = (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0;
  return function rand() {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
