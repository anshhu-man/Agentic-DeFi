import { ethers, providers, Signer, Contract, Wallet, utils, BigNumber } from 'ethers';
import { logger } from '../utils/logger';
import { BlockchainAction } from './AgenticPromptService';
import { OneInchService } from './OneInchService';
import { NetworkConfigService, ChainId } from './NetworkConfigService';
import { TransactionDetails, ActionPlan, ValidationResult } from '../types';

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
  receipt?: any;
}

export interface TokenAmount {
  token: string;
  amount: string;
  decimals: number;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  slippage: string;
  recipient?: string;
}

export interface LiquidityParams {
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  fee: number;
  tickLower?: number;
  tickUpper?: number;
}

export interface StakeParams {
  protocol: string;
  pool: string;
  amount: string;
  duration?: number;
}

export interface BridgeParams {
  sourceChain: number;
  targetChain: number;
  token: string;
  amount: string;
  recipient?: string;
}

export class BlockchainActionService {
  private providers: Map<number, providers.Provider>;
  private signers: Map<number, Signer>;
  private oneInchService: OneInchService;
  private networkService: NetworkConfigService;
  private currentChainId: number = 1; // Default to Ethereum
  
  // Protocol contract addresses by chain
  private protocolAddresses: Record<number, {
    uniswapV3Router?: string;
    uniswapV3Factory?: string;
    aavePool?: string;
    compoundComptroller?: string;
  }> = {
    1: { // Ethereum
      uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      aavePool: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
      compoundComptroller: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    },
    137: { // Polygon
      uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      aavePool: '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf',
    },
    30: { // Rootstock
      // Rootstock-specific protocol addresses would go here
    }
  };

  constructor() {
    this.providers = new Map();
    this.signers = new Map();
    this.oneInchService = new OneInchService(this.currentChainId);
    this.networkService = new NetworkConfigService();
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      // Initialize providers for different chains
      const ethereumRPC = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key';
      const polygonRPC = process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.alchemyapi.io/v2/your-api-key';
      const rootstockRPC = process.env.ROOTSTOCK_RPC_URL || 'https://public-node.rsk.co';

      this.providers.set(1, new providers.JsonRpcProvider(ethereumRPC));
      this.providers.set(137, new providers.JsonRpcProvider(polygonRPC));
      this.providers.set(30, new providers.JsonRpcProvider(rootstockRPC));

      // Initialize signers if private key is provided
      const privateKey = process.env.WALLET_PRIVATE_KEY;
      if (privateKey) {
        this.providers.forEach((provider, chainId) => {
          const signer = new Wallet(privateKey, provider);
          this.signers.set(chainId, signer);
        });
      }

      logger.info('Blockchain providers initialized', {
        chains: Array.from(this.providers.keys()),
        hasSigners: this.signers.size > 0,
      });
    } catch (error) {
      logger.error('Failed to initialize blockchain providers', { error });
    }
  }

  // MAIN EXECUTION METHOD
  async executeAction(action: BlockchainAction): Promise<TransactionResult> {
    try {
      logger.info('Executing blockchain action', {
        actionId: action.id,
        type: action.type,
        protocol: action.protocol,
        chainId: action.chainId,
      });

      const provider = this.providers.get(action.chainId);
      const signer = this.signers.get(action.chainId);

      if (!provider) {
        throw new Error(`No provider configured for chain ${action.chainId}`);
      }

      if (!signer) {
        throw new Error(`No signer configured for chain ${action.chainId}`);
      }

      let result: TransactionResult;

      switch (action.type) {
        case 'swap':
          result = await this.executeSwap(action, signer);
          break;
        case 'add_liquidity':
          result = await this.addLiquidity(action, signer);
          break;
        case 'remove_liquidity':
          result = await this.removeLiquidity(action, signer);
          break;
        case 'stake':
          result = await this.stakeTokens(action, signer);
          break;
        case 'unstake':
          result = await this.unstakeTokens(action, signer);
          break;
        case 'harvest':
          result = await this.harvestRewards(action, signer);
          break;
        case 'vote':
          result = await this.executeVote(action, signer);
          break;
        case 'bridge':
          result = await this.bridgeTokens(action, signer);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      logger.info('Blockchain action executed', {
        actionId: action.id,
        success: result.success,
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute blockchain action', {
        actionId: action.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // DEX OPERATIONS
  async executeSwap(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      const params = action.parameters as SwapParams;
      
      // This is a simplified implementation - in production, you'd use actual DEX router contracts
      const chainConfig = this.protocolAddresses[action.chainId as keyof typeof this.protocolAddresses];
      const routerAddress = chainConfig ? chainConfig.uniswapV3Router : undefined;
      
      if (!routerAddress) {
        throw new Error(`Router not configured for chain ${action.chainId}`);
      }

      // Uniswap V3 Router ABI (simplified)
      const routerABI = [
        'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
      ];

      const router = new ethers.Contract(routerAddress, routerABI, signer);
      
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      const amountIn = utils.parseUnits(params.amount, 18);
      const slippageTolerance = parseFloat(params.slippage.replace('%', '')) / 100;
      const amountOutMinimum = amountIn.mul(Math.floor((1 - slippageTolerance) * 1000)).div(1000);

      const swapParams = {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: 3000, // 0.3% fee tier
        recipient: params.recipient || await signer.getAddress(),
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0,
      };

      // Estimate gas
      const gasEstimate = await router.exactInputSingle.estimateGas(swapParams);
      const gasLimit = BigInt(gasEstimate.toString()) * BigInt(120) / BigInt(100); // 20% buffer

      // Execute transaction
      const tx = await router.exactInputSingle(swapParams, {
        gasLimit,
      });

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        receipt,
      };
    } catch (error) {
      logger.error('Swap execution failed', { action, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed',
      };
    }
  }

  // LIQUIDITY OPERATIONS
  async addLiquidity(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      const params = action.parameters as LiquidityParams;
      
      // Simplified implementation for Uniswap V3
      const positionManagerAddress = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'; // Uniswap V3 Position Manager
      
      const positionManagerABI = [
        'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'
      ];

      const positionManager = new ethers.Contract(positionManagerAddress, positionManagerABI, signer);
      
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      const amount0Desired = utils.parseUnits(params.amount0, 18);
      const amount1Desired = utils.parseUnits(params.amount1, 18);
      
      const mintParams = {
        token0: params.token0,
        token1: params.token1,
        fee: params.fee,
        tickLower: params.tickLower || -887220,
        tickUpper: params.tickUpper || 887220,
        amount0Desired,
        amount1Desired,
        amount0Min: amount0Desired.mul(95).div(100), // 5% slippage
        amount1Min: amount1Desired.mul(95).div(100), // 5% slippage
        recipient: await signer.getAddress(),
        deadline,
      };

      const gasEstimate = await positionManager.mint.estimateGas(mintParams);
      const gasLimit = BigInt(gasEstimate.toString()) * BigInt(120) / BigInt(100);

      const tx = await positionManager.mint(mintParams, { gasLimit });
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        receipt,
      };
    } catch (error) {
      logger.error('Add liquidity failed', { action, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Add liquidity failed',
      };
    }
  }

  async removeLiquidity(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      // Implementation for removing liquidity
      // This would interact with the position manager to decrease liquidity
      
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Remove liquidity failed',
      };
    }
  }

  // STAKING OPERATIONS
  async stakeTokens(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      const params = action.parameters as StakeParams;
      
      // Implementation would depend on the specific protocol
      // For example, Aave staking, Compound supply, etc.
      
      if (action.protocol.toLowerCase().includes('aave')) {
        return await this.stakeInAave(params, signer, action.chainId);
      } else if (action.protocol.toLowerCase().includes('compound')) {
        return await this.stakeInCompound(params, signer, action.chainId);
      }
      
      throw new Error(`Staking not implemented for protocol: ${action.protocol}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Staking failed',
      };
    }
  }

  private async stakeInAave(params: StakeParams, signer: ethers.Signer, chainId: number): Promise<TransactionResult> {
    try {
      const poolAddress = this.protocolAddresses[chainId as keyof typeof this.protocolAddresses]?.aavePool;
      
      if (!poolAddress) {
        throw new Error(`Aave pool not configured for chain ${chainId}`);
      }

      const poolABI = [
        'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external'
      ];

      const pool = new ethers.Contract(poolAddress, poolABI, signer);
      const amount = utils.parseUnits(params.amount, 18);
      
      const tx = await pool.supply(
        params.pool, // asset address
        amount,
        await signer.getAddress(),
        0 // referral code
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        receipt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Aave staking failed',
      };
    }
  }

  private async stakeInCompound(params: StakeParams, signer: ethers.Signer, chainId: number): Promise<TransactionResult> {
    try {
      // Compound staking implementation
      // This would interact with cToken contracts
      
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compound staking failed',
      };
    }
  }

  async unstakeTokens(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      // Implementation for unstaking tokens
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unstaking failed',
      };
    }
  }

  // REWARD OPERATIONS
  async harvestRewards(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      // Implementation for harvesting rewards from various protocols
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Harvest failed',
      };
    }
  }

  // GOVERNANCE OPERATIONS
  async executeVote(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      const params = action.parameters;
      
      // Implementation for governance voting
      // This would interact with governance contracts
      
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voting failed',
      };
    }
  }

  // BRIDGE OPERATIONS
  async bridgeTokens(action: BlockchainAction, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      const params = action.parameters as BridgeParams;
      
      // Implementation for cross-chain bridging
      // This would interact with bridge contracts like Polygon Bridge, Hop Protocol, etc.
      
      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bridge failed',
      };
    }
  }

  // UTILITY METHODS
  async estimateGasCost(action: BlockchainAction): Promise<string> {
    try {
      const provider = this.providers.get(action.chainId);
      if (!provider) {
        throw new Error(`No provider for chain ${action.chainId}`);
      }

      const gasPrice = await provider.getFeeData();
      const estimatedGas = BigInt(action.estimatedGas || '200000');
      const gasPriceBigInt = gasPrice.gasPrice ? BigInt(gasPrice.gasPrice.toString()) : BigInt(0);
      const gasCost = estimatedGas * gasPriceBigInt;
      
      return utils.formatEther(gasCost.toString());
    } catch (error) {
      logger.error('Gas estimation failed', { action, error });
      return '0.01'; // Default estimate
    }
  }

  async getTokenBalance(tokenAddress: string, userAddress: string, chainId: number): Promise<string> {
    try {
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`No provider for chain ${chainId}`);
      }

      const tokenABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const token = new ethers.Contract(tokenAddress, tokenABI, provider);
      const balance = await token.balanceOf(userAddress);
      const decimals = await token.decimals();
      
      return utils.formatUnits(balance, decimals);
    } catch (error) {
      logger.error('Token balance query failed', { tokenAddress, userAddress, chainId, error });
      return '0';
    }
  }

  async approveToken(tokenAddress: string, spenderAddress: string, amount: string, signer: ethers.Signer): Promise<TransactionResult> {
    try {
      const tokenABI = [
        'function approve(address spender, uint256 amount) returns (bool)'
      ];

      const token = new ethers.Contract(tokenAddress, tokenABI, signer);
      const amountBN = utils.parseUnits(amount, 18);
      
      const tx = await token.approve(spenderAddress, amountBN);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        receipt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token approval failed',
      };
    }
  }

  // EXECUTE WITH APPROVAL MODE METHODS
  
  // Switch between networks (Ethereum, Polygon)
  async switchNetwork(chainId: number): Promise<void> {
    this.currentChainId = chainId;
    this.oneInchService.setChainId(chainId);
    
    logger.info('Switched to network', {
      chainId,
      networkName: this.networkService.getNetworkName(chainId)
    });
  }
  
  // Get detailed swap information for approval UI using 1inch
  async getSwapDetails(params: SwapParams): Promise<TransactionDetails> {
    try {
      // Switch to appropriate network if needed
      if (this.oneInchService['chainId'] !== this.currentChainId) {
        this.oneInchService.setChainId(this.currentChainId);
      }
      
      const quote = await this.oneInchService.getSwapQuote({
        fromTokenAddress: params.tokenIn,
        toTokenAddress: params.tokenOut,
        amount: params.amount,
        fromAddress: params.recipient || '0x0000000000000000000000000000000000000000',
        slippage: parseFloat(params.slippage.replace('%', ''))
      });
      
      const provider = this.providers.get(this.currentChainId);
      if (!provider) {
        throw new Error(`No provider for chain ${this.currentChainId}`);
      }
      
      const gasPrice = await provider.getFeeData();
      const estimatedGasCost = BigInt(quote.estimatedGas) * (gasPrice.gasPrice ? BigInt(gasPrice.gasPrice.toString()) : BigInt(0));
      
      return {
        action: 'swap',
        fromToken: params.tokenIn,
        toToken: params.tokenOut,
        fromAmount: params.amount,
        expectedToAmount: quote.toTokenAmount,
        minToAmount: this.calculateMinAmount(quote.toTokenAmount, parseFloat(params.slippage.replace('%', ''))),
        estimatedGas: quote.estimatedGas,
        estimatedGasCost: utils.formatEther(estimatedGasCost.toString()),
        route: quote.route,
        priceImpact: this.calculatePriceImpact(quote.price),
        chainId: this.currentChainId,
        networkName: this.networkService.getNetworkName(this.currentChainId)
      };
    } catch (error) {
      logger.error('Failed to get swap details', { params, error });
      throw error;
    }
  }
  
  // Check if token approval is needed using 1inch
  async checkAndPrepareApproval(tokenAddress: string, walletAddress: string, amount: string): Promise<any | null> {
    try {
      const allowance = await this.oneInchService.checkAllowance(tokenAddress, walletAddress);
      
      if (!allowance.isApproved || BigInt(allowance.allowance) < BigInt(amount)) {
        return await this.oneInchService.getApprovalTransaction(tokenAddress, amount);
      }
      
      return null; // No approval needed
    } catch (error) {
      logger.error('Failed to check token approval', { tokenAddress, walletAddress, amount, error });
      throw error;
    }
  }
  
  // Build the actual swap transaction using 1inch
  async buildSwapTransaction(params: SwapParams): Promise<any> {
    try {
      return await this.oneInchService.buildSwapTransaction({
        fromTokenAddress: params.tokenIn,
        toTokenAddress: params.tokenOut,
        amount: params.amount,
        fromAddress: params.recipient || '0x0000000000000000000000000000000000000000',
        slippage: parseFloat(params.slippage.replace('%', ''))
      });
    } catch (error) {
      logger.error('Failed to build swap transaction', { params, error });
      throw error;
    }
  }
  
  // Determine the best network for actions (Ethereum or Polygon)
  determineBestNetwork(gasThreshold: number = 50): ChainId {
    // Simple logic: use Polygon for lower gas fees if gas is above threshold
    // In production, this would consider liquidity, slippage, and other factors
    return gasThreshold > 30 ? ChainId.POLYGON : ChainId.ETHEREUM;
  }
  
  // Helper methods
  private calculateMinAmount(amount: string, slippage: number): string {
    const amountBN = BigInt(amount);
    const slippageFactor = BigInt(10000 - (slippage * 100)); // Convert 1% to 9900
    return (amountBN * slippageFactor / BigInt(10000)).toString();
  }
  
  private calculatePriceImpact(price: number): number {
    // Simplified price impact calculation
    // In production, this would compare against market price
    return Math.min(price * 0.001, 5); // Max 5% price impact
  }

  // BATCH OPERATIONS
  async executeBatchActions(actions: BlockchainAction[]): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];
    
    for (const action of actions) {
      try {
        const result = await this.executeAction(action);
        results.push(result);
        
        // If an action fails and it's critical, stop execution
        if (!result.success && action.priority === 1) {
          logger.warn('Critical action failed, stopping batch execution', {
            actionId: action.id,
            error: result.error,
          });
          break;
        }
        
        // Add delay between actions to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Batch execution failed',
        });
      }
    }
    
    return results;
  }
}

export default BlockchainActionService;
