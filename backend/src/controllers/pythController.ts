import { Router, Request, Response } from "express";
import axios from "axios";
import { config, PRICE_FEED_IDS } from "../config";
import { logger } from "../utils/logger";
import PythService from "../services/PythService";

const router = Router();
const pythService = new PythService();

/**
 * Resolve a human-readable symbol like "ETH/USD" to a Pyth feed id from config.
 */
function resolveFeedId(symbol?: string): string | null {
  if (!symbol) return null;
  const id = PRICE_FEED_IDS[symbol as keyof typeof PRICE_FEED_IDS];
  return id ?? null;
}

/**
 * GET /api/pyth/health
 * Basic health for Pyth Hermes and supported symbols.
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const healthy = await pythService.isHealthy();
    return res.json({
      success: true,
      hermes: healthy,
      supportedSymbols: Object.keys(PRICE_FEED_IDS),
      endpoint: config.pyth.endpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Pyth health failed", { error });
    return res.status(503).json({
      success: false,
      error: "PYTH_UNHEALTHY",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/pyth/price?symbol=ETH/USD
 * Returns latest price data for the given symbol (JSON).
 */
router.get("/price", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "ETH/USD";
    const feedId = resolveFeedId(symbol);
    if (!feedId) {
      return res.status(400).json({
        success: false,
        error: `Unknown or unsupported symbol: ${symbol}`,
      });
    }

    // Use service (Hermes v2 updates/price/latest under the hood)
    const prices = await pythService.getRealTimePrices([symbol]);
    const item = prices.find((p) => p.symbol === symbol);

    if (!item) {
      return res.status(502).json({
        success: false,
        error: "No data from Pyth Hermes",
      });
    }

    return res.json({
      success: true,
      data: {
        symbol,
        feedId,
        price: Number(item.price),
        confidence: null,
        publishTime: item.timestamp ? new Date(item.timestamp).toISOString() : null,
      },
    });
  } catch (error: any) {
    logger.error("Pyth price endpoint failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "PYTH_PRICE_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/pyth/price-update?symbol=ETH/USD&encoding=base64
 * Fetches the latest price update payload from Hermes suitable for EVM contracts (IPyth.updatePriceFeeds).
 * Returns base64-encoded update data and the feed id.
 *
 * Note: The actual Hermes v2 update endpoint supports returning the binary update data.
 * Here we use the documented REST style: /v2/updates/price/latest?ids[]=...&encoding=base64
 */
router.get("/price-update", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "ETH/USD";
    const encoding = (req.query.encoding as string) || "base64";
    const feedId = resolveFeedId(symbol);

    if (!feedId) {
      return res.status(400).json({
        success: false,
        error: `Unknown or unsupported symbol: ${symbol}`,
      });
    }

    const u = new URL(`${config.pyth.endpoint}/v2/updates/price/latest`);
    u.searchParams.append('ids[]', feedId);
    u.searchParams.append('encoding', encoding);
    const hermesResp = await axios.get(u.toString(), {
      timeout: 15000,
    });

    // Hermes v2 response commonly includes an array of updates, each with binary/base64 data.
    // Normalize to a single updateData field for convenience.
    const updates = hermesResp.data?.updates || hermesResp.data || [];
    let updateData: string | null = null;

    if (Array.isArray(updates) && updates.length > 0) {
      // Look for a field commonly named "binary" or "data" with base64 content
      const first = updates[0];
      updateData =
        first?.binary ||
        first?.data ||
        (typeof first === "string" ? first : null);
    } else if (typeof hermesResp.data === "string") {
      updateData = hermesResp.data;
    }

    if (!updateData) {
      return res.status(502).json({
        success: false,
        error: "No update data from Hermes",
      });
    }

    return res.json({
      success: true,
      data: {
        symbol,
        feedId,
        updateData,
        encoding,
        note:
          "Use this base64 string to produce bytes[] for IPyth.updatePriceFeeds. Call IPyth.getUpdateFee(priceUpdate) first and include { value: fee }.",
      },
    });
  } catch (error: any) {
    logger.error("Pyth price-update endpoint failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "PYTH_PRICE_UPDATE_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/pyth/prices?symbols=ETH/USD,BTC/USD,USDC/USD
 * Batch latest prices for multiple Pyth symbols.
 */
router.get("/prices", async (req: Request, res: Response) => {
  try {
    const symbolsParam = (req.query.symbols as string) || '';
    const symbols = symbolsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No symbols provided. Use symbols=ETH/USD,BTC/USD",
      });
    }

    // Fetch via Hermes SDK through service to avoid cluster-specific HTTP quirks
    const priceData = await pythService.getRealTimePrices(symbols);

    const data = priceData.map((item) => ({
      symbol: item.symbol,
      price: Number(item.price),
      confidence: null,
      publishTime: item.timestamp ? new Date(item.timestamp).toISOString() : null,
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error("Pyth batch prices endpoint failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "PYTH_BATCH_PRICES_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/pyth/volatility?symbol=ETH/USD&period=24
 * Returns volatility (%) computed from historical prices for the given symbol.
 */
router.get("/volatility", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "ETH/USD";
    const period = Number(req.query.period || 24);
    const feedId = resolveFeedId(symbol);
    if (!feedId) {
      return res.status(400).json({
        success: false,
        error: `Unknown or unsupported symbol: ${symbol}`,
      });
    }

    const volatility = await pythService.calculateVolatility(symbol, period);
    return res.json({
      success: true,
      data: { symbol, period, volatility },
    });
  } catch (error: any) {
    logger.error("Pyth volatility endpoint failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "PYTH_VOLATILITY_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/pyth/volatilities?symbols=ETH/USD,BTC/USD&period=24
 * Batch volatility (%) for multiple symbols.
 */
router.get("/volatilities", async (req: Request, res: Response) => {
  try {
    const symbolsParam = (req.query.symbols as string) || "";
    const period = Number(req.query.period || 24);
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No symbols provided. Use symbols=ETH/USD,BTC/USD",
      });
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const feedId = resolveFeedId(symbol);
          if (!feedId) {
            return { symbol, error: "UNSUPPORTED_SYMBOL" };
          }
          const vol = await pythService.calculateVolatility(symbol, period);
          return { symbol, volatility: vol };
        } catch (e: any) {
          return { symbol, error: e?.message || "FAILED" };
        }
      })
    );

    return res.json({
      success: true,
      data: results,
      period,
    });
  } catch (error: any) {
    logger.error("Pyth volatilities endpoint failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "PYTH_VOLATILITIES_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/pyth/correlation?symbol1=ETH/USD&symbol2=BTC/USD&period=30
 * Returns correlation between two symbols over the requested period.
 */
router.get("/correlation", async (req: Request, res: Response) => {
  try {
    const symbol1 = (req.query.symbol1 as string) || "ETH/USD";
    const symbol2 = (req.query.symbol2 as string) || "BTC/USD";
    const period = Number(req.query.period || 30);

    const id1 = resolveFeedId(symbol1);
    const id2 = resolveFeedId(symbol2);
    if (!id1 || !id2) {
      return res.status(400).json({
        success: false,
        error: `Unsupported symbols: ${!id1 ? symbol1 : ""} ${!id2 ? symbol2 : ""}`.trim(),
      });
    }

    const correlation = await pythService.getPriceCorrelation(symbol1, symbol2, period);
    return res.json({
      success: true,
      data: { symbol1, symbol2, period, correlation },
    });
  } catch (error: any) {
    logger.error("Pyth correlation endpoint failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "PYTH_CORRELATION_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

export default router;
