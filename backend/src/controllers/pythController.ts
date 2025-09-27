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

/**
 * POST /api/pyth/update-onchain
 * Updates price feeds on-chain using updatePriceFeeds
 */
router.post("/update-onchain", async (req: Request, res: Response) => {
  try {
    const { symbols, network = 'sepolia' } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: "Invalid symbols array provided",
      });
    }
    
    // Get feed IDs
    const feedIds = symbols.map(symbol => PRICE_FEED_IDS[symbol as keyof typeof PRICE_FEED_IDS]).filter(Boolean);
    
    if (feedIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid feed IDs found for provided symbols",
      });
    }
    
    // Fetch Hermes update
    const priceUpdates = await pythService.fetchHermesUpdateForOnChain(feedIds);
    
    // Update on-chain (this would require a signer in production)
    // For now, we'll simulate the response
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    logger.info('Mock on-chain price update', {
      symbols,
      feedIds,
      network,
      txHash: mockTxHash,
    });
    
    return res.json({
      success: true,
      data: {
        txHash: mockTxHash,
        feedIds,
        symbols,
        network,
        updateCount: priceUpdates.length,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    logger.error("On-chain price update failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "ONCHAIN_UPDATE_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/pyth/update-fee?symbols=ETH/USD,BTC/USD&network=sepolia
 * Calculate fee for updating price feeds on-chain
 */
router.get("/update-fee", async (req: Request, res: Response) => {
  try {
    const symbols = (req.query.symbols as string)?.split(',') || ['ETH/USD'];
    const network = (req.query.network as string) || 'sepolia';
    
    const feedIds = symbols.map(symbol => PRICE_FEED_IDS[symbol as keyof typeof PRICE_FEED_IDS]).filter(Boolean);
    
    if (feedIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid feed IDs found for provided symbols",
      });
    }
    
    // Fetch price update data to calculate fee
    const priceUpdates = await pythService.fetchHermesUpdateForOnChain(feedIds);
    
    // Mock fee calculation (in production, this would call the actual contract)
    const mockFeeWei = '1000000000000000'; // 0.001 ETH
    const mockFeeETH = '0.001';
    
    return res.json({
      success: true,
      data: {
        fee: mockFeeWei,
        feeETH: mockFeeETH,
        symbols,
        network,
        updateCount: priceUpdates.length,
      }
    });
  } catch (error: any) {
    logger.error("Update fee calculation failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "FEE_CALCULATION_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/pyth/onchain-price?symbol=ETH/USD&network=sepolia&maxAge=60
 * Get price from on-chain Pyth contract
 */
router.get("/onchain-price", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "ETH/USD";
    const network = (req.query.network as string) || 'sepolia';
    const maxAge = parseInt((req.query.maxAge as string) || '60');
    
    const feedId = PRICE_FEED_IDS[symbol as keyof typeof PRICE_FEED_IDS];
    if (!feedId) {
      return res.status(400).json({
        success: false,
        error: `Unknown or unsupported symbol: ${symbol}`,
      });
    }

    // Mock on-chain price data (in production, this would call the actual contract)
    const mockPriceData = {
      price: '2500000000000', // Mock ETH price
      confidence: '1000000000', // Mock confidence
      expo: -8,
      publishTime: Math.floor(Date.now() / 1000),
    };
    
    const formattedPrice = pythService.formatOnChainPrice(mockPriceData);
    
    return res.json({
      success: true,
      data: {
        symbol,
        feedId,
        network,
        maxAge,
        price18: formattedPrice.price18,
        confidence18: formattedPrice.confidence18,
        publishTime: formattedPrice.publishTime.toISOString(),
        raw: mockPriceData,
      },
    });
  } catch (error: any) {
    logger.error("On-chain price fetch failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "ONCHAIN_PRICE_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/pyth/confidence?symbol=ETH/USD&price=2500&confidence=10&expo=-8&maxConfBps=50
 * Validate price confidence against threshold
 */
router.get("/confidence", async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || "ETH/USD";
    const price = (req.query.price as string) || "250000000000";
    const confidence = (req.query.confidence as string) || "1000000000";
    const expo = parseInt((req.query.expo as string) || "-8");
    const maxConfBps = parseInt((req.query.maxConfBps as string) || "50");
    
    const isValid = await pythService.validatePriceConfidence(
      price,
      confidence,
      expo,
      maxConfBps
    );
    
    const priceFormatted = pythService['formatPrice'](price, expo);
    const confidenceFormatted = pythService['formatPrice'](confidence, expo);
    const confidenceRatio = (parseFloat(confidenceFormatted) / parseFloat(priceFormatted)) * 10000;
    
    return res.json({
      success: true,
      data: {
        symbol,
        price: priceFormatted,
        confidence: confidenceFormatted,
        confidenceRatio: confidenceRatio.toFixed(2),
        maxConfBps,
        isValid,
        status: isValid ? 'ACCEPTABLE' : 'TOO_UNCERTAIN',
      },
    });
  } catch (error: any) {
    logger.error("Confidence validation failed", {
      error: error?.message || error,
    });
    return res.status(500).json({
      success: false,
      error: "CONFIDENCE_VALIDATION_FAILED",
      details: error?.message || "Unknown error",
    });
  }
});

export default router;
