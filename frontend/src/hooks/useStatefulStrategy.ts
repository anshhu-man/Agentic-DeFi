import { useCallback, useState } from "react";
import { StatefulSwapStrategy, TradeRecord, TradeSide, makeSeededRng } from "@/lib/strategy/statefulSwap";

export interface SimulationParams {
  iterations: number;
  observeCycles: number;
  rebalanceThreshold: number;
  sleepMs?: number;
  initialEth: number;
  initialUsdc: number;
  seed?: number;
}

export interface SimulationProgress {
  step: number;
  total: number;
}

export interface SimulationResult {
  trades: TradeRecord[];
  finalEth: number;
  finalUsdc: number;
  insights: string;
  successRates: Record<TradeSide, number>;
  avgPnl: Record<TradeSide, number>;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function useStatefulStrategy() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SimulationProgress>({ step: 0, total: 0 });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async (params: SimulationParams) => {
    if (running) return;
    setError(null);
    setResult(null);
    setRunning(true);
    setProgress({ step: 0, total: params.iterations });

    try {
      const rng = makeSeededRng(params.seed);
      const priceFn = () => 3000 + (rng() * 60 - 30); // ~3000 +/- 30

      const strategy = new StatefulSwapStrategy({
        rebalanceThreshold: params.rebalanceThreshold,
        observeCyclesBeforeTrade: params.observeCycles,
        maxTradesKept: 200,
      });

      let portfolioEth = params.initialEth;
      let portfolioUsdc = params.initialUsdc;

      let entrySide: TradeSide | null = null;
      let entryPrice: number | null = null;
      let entrySizeEth = 0;

      for (let i = 0; i < params.iterations; i++) {
        const price = priceFn();

        // Warmup observations
        if (i < params.observeCycles) {
          strategy.observe(price);
        }

        // Realize PnL from previous entry on the next tick
        if (entrySide !== null && entryPrice !== null) {
          strategy.recordTradeOutcome(entrySide, entryPrice, price, entrySizeEth);
          entrySide = null;
          entryPrice = null;
          entrySizeEth = 0;
        }

        const side = strategy.decide(
          price,
          portfolioEth,
          portfolioUsdc,
          undefined
        );

        if (side === "USDC_TO_ETH" && portfolioUsdc > 0) {
          // buy ETH with all USDC
          const ethBought = price > 0 ? portfolioUsdc / price : 0;
          entrySide = side;
          entryPrice = price;
          entrySizeEth = ethBought;

          portfolioEth += ethBought;
          portfolioUsdc = 0;
        } else if (side === "ETH_TO_USDC" && portfolioEth > 0) {
          // sell all ETH
          const usdcReceived = portfolioEth * price;
          entrySide = side;
          entryPrice = price;
          entrySizeEth = portfolioEth;

          portfolioUsdc += usdcReceived;
          portfolioEth = 0;
        }

        setProgress({ step: i + 1, total: params.iterations });
        if (params.sleepMs && params.sleepMs > 0) {
          await sleep(params.sleepMs);
        }
      }

      // Finalize (no additional PnL realization on last tick to match runner style)
      const insights = strategy.performanceInsights();

      const res: SimulationResult = {
        trades: strategy.memory.trades.slice(),
        finalEth: portfolioEth,
        finalUsdc: portfolioUsdc,
        insights,
        successRates: strategy.memory.successRates,
        avgPnl: strategy.memory.avgPnl,
      };

      setResult(res);
      return res;
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      return null;
    } finally {
      setRunning(false);
    }
  }, [running]);

  return { running, progress, result, error, runSimulation, setResult };
}
