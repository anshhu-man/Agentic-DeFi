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

    // Use Hermes latest_price_feeds directly to include confidence and publish_time
    const url = `${config.pyth.endpoint}/api/latest_price_feeds`;
    const hermesResp = await axios.get(url, {
      params: { ids: [feedId] },
      timeout: 10000,
    });

    if (!Array.isArray(hermesResp.data) || hermesResp.data.length === 0) {
      return res.status(502).json({
        success: false,
        error: "No data from Pyth Hermes",
      });
    }

    const feed = hermesResp.data[0];
    const priceObj = feed?.price;
    const conf = priceObj?.conf;
    const price = priceObj?.price;
    const expo = priceObj?.expo;
    const publishTime = priceObj?.publish_time;

    const value =
      typeof price === "string" || typeof price === "number"
        ? Number(price) * Math.pow(10, expo || 0)
        : null;
    const confidence =
      typeof conf === "string" || typeof conf === "number"
        ? Number(conf) * Math.pow(10, expo || 0)
        : null;

    return res.json({
      success: true,
      data: {
        symbol,
        feedId,
        price: value,
        confidence,
        publishTime: publishTime ? new Date(publishTime * 1000).toISOString() : null,
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

    const url = `${config.pyth.endpoint}/v2/updates/price/latest`;
    const hermesResp = await axios.get(url, {
      params: {
        ids: [feedId],
        encoding,
      },
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

    const prices = await pythService.getRealTimePrices(symbols);

    const data = prices.map((p) => ({
      symbol: p.symbol,
      price: Number(p.price),
      confidence: null as number | null, // Hermes confidence not exposed here; available via /price if needed
      publishTime: p.timestamp ? new Date(p.timestamp).toISOString() : null,
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

export default router;
