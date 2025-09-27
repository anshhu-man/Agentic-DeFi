import { Router, Request, Response } from "express";
import { vaultConfig, ETH_PRICE_FEEDS } from "../config";
import { logger } from "../utils/logger";
import SafeExitVaultService from "../services/SafeExitVaultService";
import PythService from "../services/PythService";

const router = Router();
const vaultService = new SafeExitVaultService();
const pythService = new PythService();

/**
 * POST /api/vault/deploy
 * Deploy a new SafeExitVault contract
 */
router.post("/deploy", async (req: Request, res: Response) => {
  try {
    const { network = vaultConfig.defaultNetwork } = req.body;
    
    const deployment = await vaultService.deployVault(network);
    
    logger.info('Vault deployment requested', { network, address: deployment.contractAddress });
    
    return res.json({
      success: true,
      data: deployment,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Vault deployment failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "DEPLOYMENT_FAILED",
      details: error?.message
    });
  }
});

/**
 * POST /api/vault/deposit
 * Deposit ETH to vault
 */
router.post("/deposit", async (req: Request, res: Response) => {
  try {
    const { userAddress, amount, vaultAddress, network = vaultConfig.defaultNetwork } = req.body;
    
    if (!userAddress || !amount || !vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userAddress, amount, vaultAddress"
      });
    }
    
    const txHash = await vaultService.depositETH(userAddress, amount, vaultAddress, network);
    
    return res.json({
      success: true,
      data: { 
        txHash, 
        amount, 
        userAddress, 
        vaultAddress,
        network 
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Vault deposit failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "DEPOSIT_FAILED",
      details: error?.message
    });
  }
});

/**
 * POST /api/vault/triggers
 * Set stop-loss and take-profit triggers
 */
router.post("/triggers", async (req: Request, res: Response) => {
  try {
    const { 
      userAddress, 
      stopLossPrice, 
      takeProfitPrice, 
      vaultAddress,
      network = vaultConfig.defaultNetwork 
    } = req.body;
    
    if (!userAddress || !stopLossPrice || !takeProfitPrice || !vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userAddress, stopLossPrice, takeProfitPrice, vaultAddress"
      });
    }
    
    // Validate trigger prices
    const stopLoss = parseFloat(stopLossPrice);
    const takeProfit = parseFloat(takeProfitPrice);
    
    if (stopLoss >= takeProfit) {
      return res.status(400).json({
        success: false,
        error: "Stop-loss price must be lower than take-profit price"
      });
    }
    
    const txHash = await vaultService.setTriggers(
      userAddress, 
      stopLossPrice, 
      takeProfitPrice,
      vaultAddress,
      network
    );
    
    return res.json({
      success: true,
      data: { 
        txHash, 
        stopLossPrice, 
        takeProfitPrice,
        userAddress,
        vaultAddress,
        network
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Set triggers failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "TRIGGER_SET_FAILED",
      details: error?.message
    });
  }
});

/**
 * POST /api/vault/execute
 * Execute vault triggers (update price + check conditions)
 */
router.post("/execute", async (req: Request, res: Response) => {
  try {
    const { 
      userAddress, 
      vaultAddress, 
      maxStaleSecs = vaultConfig.maxStalenessSeconds,
      maxConfBps = vaultConfig.maxConfidenceBps,
      network = vaultConfig.defaultNetwork 
    } = req.body;
    
    if (!userAddress || !vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userAddress, vaultAddress"
      });
    }
    
    // Fetch latest price update from Hermes
    const priceUpdates = await pythService.fetchHermesUpdateForOnChain([ETH_PRICE_FEEDS['ETH/USD']]);
    
    // Execute on-chain
    const result = await vaultService.updateAndExecute(
      userAddress,
      vaultAddress,
      priceUpdates,
      maxStaleSecs,
      maxConfBps,
      network
    );
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Vault execution failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "EXECUTION_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/vault/positions/:address
 * Get user's vault positions
 */
router.get("/positions/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { vaultAddress, network = vaultConfig.defaultNetwork } = req.query;
    
    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameter: vaultAddress"
      });
    }
    
    const positionData = await vaultService.getUserPosition(
      address, 
      vaultAddress as string,
      network as string
    );
    
    return res.json({
      success: true,
      data: positionData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Get positions failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "POSITIONS_FETCH_FAILED",
      details: error?.message
    });
  }
});

/**
 * POST /api/vault/withdraw
 * Withdraw from vault
 */
router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { 
      userAddress, 
      vaultAddress,
      network = vaultConfig.defaultNetwork 
    } = req.body;
    
    if (!userAddress || !vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userAddress, vaultAddress"
      });
    }
    
    const txHash = await vaultService.withdraw(userAddress, vaultAddress, network);
    
    return res.json({
      success: true,
      data: { 
        txHash, 
        userAddress, 
        vaultAddress,
        network 
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Vault withdrawal failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "WITHDRAWAL_FAILED",
      details: error?.message
    });
  }
});

/**
 * POST /api/vault/cancel-triggers
 * Cancel triggers without withdrawing
 */
router.post("/cancel-triggers", async (req: Request, res: Response) => {
  try {
    const { 
      userAddress, 
      vaultAddress,
      network = vaultConfig.defaultNetwork 
    } = req.body;
    
    if (!userAddress || !vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userAddress, vaultAddress"
      });
    }
    
    const txHash = await vaultService.cancelTriggers(userAddress, vaultAddress, network);
    
    return res.json({
      success: true,
      data: { 
        txHash, 
        userAddress, 
        vaultAddress,
        network 
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Cancel triggers failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "CANCEL_TRIGGERS_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/vault/update-fee
 * Calculate fee for price update
 */
router.get("/update-fee", async (req: Request, res: Response) => {
  try {
    const { 
      vaultAddress,
      symbols = 'ETH/USD',
      network = vaultConfig.defaultNetwork 
    } = req.query;
    
    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameter: vaultAddress"
      });
    }
    
    const symbolArray = (symbols as string).split(',');
    const feedIds = symbolArray.map(symbol => ETH_PRICE_FEEDS[symbol as keyof typeof ETH_PRICE_FEEDS]).filter(Boolean);
    
    // Fetch price updates to calculate fee
    const priceUpdates = await pythService.fetchHermesUpdateForOnChain(feedIds);
    const fee = await vaultService.getUpdateFee(priceUpdates, vaultAddress as string, network as string);
    
    return res.json({
      success: true,
      data: {
        fee,
        feeETH: (parseFloat(fee) / 1e18).toFixed(6),
        symbols: symbolArray,
        network,
        updateCount: priceUpdates.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Update fee calculation failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "UPDATE_FEE_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/vault/check-triggers/:address
 * Check if triggers should be executed for a position
 */
router.get("/check-triggers/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { vaultAddress, network = vaultConfig.defaultNetwork } = req.query;
    
    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameter: vaultAddress"
      });
    }
    
    const shouldExecute = await vaultService.checkTriggerConditions(
      address, 
      vaultAddress as string,
      network as string
    );
    
    return res.json({
      success: true,
      data: {
        userAddress: address,
        vaultAddress,
        network,
        shouldExecute,
        status: shouldExecute ? 'READY_TO_EXECUTE' : 'NO_TRIGGER_CONDITIONS_MET',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Check triggers failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "CHECK_TRIGGERS_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/vault/config
 * Get vault configuration
 */
router.get("/config", async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        networks: Object.keys(vaultConfig.networks),
        defaultNetwork: vaultConfig.defaultNetwork,
        maxConfidenceBps: vaultConfig.maxConfidenceBps,
        maxStalenessSeconds: vaultConfig.maxStalenessSeconds,
        ethFeedId: vaultConfig.ethFeedId,
        supportedFeeds: Object.keys(ETH_PRICE_FEEDS),
        monitoringEnabled: vaultConfig.monitoringEnabled,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Get vault config failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "CONFIG_FETCH_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/vault/current-price
 * Read on-chain current price and confidence from the vault
 */
router.get("/current-price", async (req: Request, res: Response) => {
  try {
    const {
      vaultAddress,
      network = vaultConfig.defaultNetwork,
      maxStaleSecs = vaultConfig.maxStalenessSeconds
    } = req.query;

    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameter: vaultAddress"
      });
    }

    const { price18, conf18 } = await vaultService.readCurrentPrice(
      vaultAddress as string,
      network as string,
      Number(maxStaleSecs)
    );

    return res.json({
      success: true,
      data: { price18, conf18 },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Get current price failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "CURRENT_PRICE_FAILED",
      details: error?.message
    });
  }
});

/**
 * GET /api/vault/selectors
 * Returns common function selectors used by the frontend for wallet txs
 */
router.get("/selectors", async (_req: Request, res: Response) => {
  try {
    const depositSelector = vaultService.getDepositSelector();
    return res.json({
      success: true,
      data: { depositSelector },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Fetch selectors failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "SELECTORS_FAILED",
      details: error?.message
    });
  }
});

/**
 * POST /api/vault/encode-set-triggers
 * Returns ABI-encoded calldata for setTriggers(uint256,uint256) given human USD strings
 * body: { stopLossPrice: string, takeProfitPrice: string }
 */
router.post("/encode-set-triggers", async (req: Request, res: Response) => {
  try {
    const { stopLossPrice, takeProfitPrice } = req.body || {};
    if (!stopLossPrice || !takeProfitPrice) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: stopLossPrice, takeProfitPrice"
      });
    }

    const data = vaultService.encodeSetTriggersCalldata(
      String(stopLossPrice),
      String(takeProfitPrice)
    );

    return res.json({
      success: true,
      data: { data },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Encode setTriggers failed", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "ENCODE_SET_TRIGGERS_FAILED",
      details: error?.message
    });
  }
});

export default router;
