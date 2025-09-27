import { ethers } from 'ethers';
import { vaultConfig, ETH_PRICE_FEEDS } from '../config';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import PythService from './PythService';
import {
  VaultPosition,
  VaultDeployParams,
  TriggerParams,
  ExecutionParams,
  VaultExecution,
  VaultMonitoringData,
  HermesResponse,
  VaultApiResponse,
  DeployVaultResponse,
  ExecuteVaultResponse,
  VaultPositionResponse,
} from '../types/vault';

// SafeExitVault ABI (essential functions)
const VAULT_ABI = [
  'function deposit() external payable',
  'function setTriggers(uint256 stopLossPrice18, uint256 takeProfitPrice18) external',
  'function updateAndExecute(bytes[] calldata priceUpdate, uint256 maxStaleSecs, uint256 maxConfBps, address user) external payable',
  'function withdraw() external',
  'function cancelTriggers() external',
  'function getPosition(address user) external view returns (tuple(uint256 amountETH, uint256 stopLossPrice18, uint256 takeProfitPrice18, bool active, uint256 depositTime))',
  'function getCurrentPrice(uint256 maxStaleSecs) external view returns (uint256 price18, uint256 conf18)',
  'function getUpdateFee(bytes[] calldata priceUpdate) external view returns (uint256)',
  'event Deposited(address indexed user, uint256 amount, uint256 timestamp)',
  'event TriggersSet(address indexed user, uint256 stopLossPrice18, uint256 takeProfitPrice18, uint256 timestamp)',
  'event Executed(address indexed user, uint256 price18, uint256 amount, string triggerType, uint256 timestamp)',
  'event Withdrawn(address indexed user, uint256 amount, uint256 timestamp)',
  'event PriceUpdated(bytes32 indexed feedId, uint256 price18, uint256 conf18, uint256 timestamp)',
];

export class SafeExitVaultService {
  private pythService: PythService;
  private providers: Map<string, ethers.providers.JsonRpcProvider> = new Map();
  private signers: Map<string, ethers.Wallet> = new Map();

  constructor() {
    this.pythService = new PythService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    Object.entries(vaultConfig.networks).forEach(([network, config]) => {
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      this.providers.set(network, provider);
      
      // Initialize signer if private key is available
      const privateKey = process.env.VAULT_PRIVATE_KEY || process.env.PRIVATE_KEY;
      if (privateKey) {
        const signer = new ethers.Wallet(privateKey, provider);
        this.signers.set(network, signer);
      }
    });
    
    logger.info('Initialized vault service providers', { 
      networks: Object.keys(vaultConfig.networks) 
    });
  }

  /**
   * Deploy a new SafeExitVault contract
   */
  async deployVault(network: string = vaultConfig.defaultNetwork): Promise<DeployVaultResponse> {
    try {
      const signer = this.signers.get(network);
      if (!signer) {
        throw new Error(`No signer available for network: ${network}`);
      }

      const networkConfig = vaultConfig.networks[network as keyof typeof vaultConfig.networks];
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`);
      }

      // For now, we'll return a mock deployment since we need Foundry for actual deployment
      // In production, this would execute the Foundry deployment script
      const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
      
      logger.info('Mock vault deployment', { network, address: mockAddress });
      
      return {
        contractAddress: mockAddress,
        network,
        explorerUrl: `${networkConfig.explorerUrl}/address/${mockAddress}`,
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
      };
    } catch (error: any) {
      logger.error('Vault deployment failed', { network, error: error.message });
      throw error;
    }
  }

  /**
   * Deposit ETH to vault
   */
  async depositETH(
    userAddress: string, 
    amount: string, 
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<string> {
    try {
      const signer = this.signers.get(network);
      if (!signer) {
        throw new Error(`No signer available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const tx = await vault.deposit({ value: ethers.utils.parseEther(amount) });
      
      logger.info('ETH deposited to vault', { 
        userAddress, 
        amount, 
        vaultAddress, 
        txHash: tx.hash 
      });
      
      return tx.hash;
    } catch (error: any) {
      logger.error('Vault deposit failed', { userAddress, amount, error: error.message });
      throw error;
    }
  }

  /**
   * Set stop-loss and take-profit triggers
   */
  async setTriggers(
    userAddress: string,
    stopLossPrice: string,
    takeProfitPrice: string,
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<string> {
    try {
      const signer = this.signers.get(network);
      if (!signer) {
        throw new Error(`No signer available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      
      // Convert prices to 18 decimals
      const stopLossPrice18 = ethers.utils.parseEther(stopLossPrice);
      const takeProfitPrice18 = ethers.utils.parseEther(takeProfitPrice);
      
      const tx = await vault.setTriggers(stopLossPrice18, takeProfitPrice18);
      
      logger.info('Triggers set for vault position', {
        userAddress,
        stopLossPrice,
        takeProfitPrice,
        vaultAddress,
        txHash: tx.hash,
      });
      
      return tx.hash;
    } catch (error: any) {
      logger.error('Set triggers failed', { userAddress, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch price update data from Hermes
   */
  async fetchHermesUpdate(feedIds: string[]): Promise<string> {
    try {
      const hermesUrl = new URL(`${this.pythService['baseUrl']}/v2/updates/price/latest`);
      
      feedIds.forEach(id => {
        hermesUrl.searchParams.append('ids[]', id);
      });
      hermesUrl.searchParams.append('encoding', 'base64');

      const response = await fetch(hermesUrl.toString());
      const data: HermesResponse = await response.json();
      
      if (!data.binary?.data?.[0]) {
        throw new Error('No price update data received from Hermes');
      }
      
      return `0x${data.binary.data[0]}`;
    } catch (error: any) {
      logger.error('Failed to fetch Hermes update', { feedIds, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate update fee for price feeds
   */
  async getUpdateFee(
    priceUpdates: string[],
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<string> {
    try {
      const provider = this.providers.get(network);
      if (!provider) {
        throw new Error(`No provider available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
      const fee = await vault.getUpdateFee(priceUpdates);
      
      return fee.toString();
    } catch (error: any) {
      logger.error('Failed to get update fee', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute vault triggers (update price + check conditions)
   */
  async updateAndExecute(
    userAddress: string,
    vaultAddress: string,
    priceUpdates: string[],
    maxStaleSecs: number = vaultConfig.maxStalenessSeconds,
    maxConfBps: number = vaultConfig.maxConfidenceBps,
    network: string = vaultConfig.defaultNetwork
  ): Promise<ExecuteVaultResponse> {
    try {
      const signer = this.signers.get(network);
      if (!signer) {
        throw new Error(`No signer available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      
      // Get update fee
      const fee = await vault.getUpdateFee(priceUpdates);
      
      // Execute update and trigger check
      const tx = await vault.updateAndExecute(
        priceUpdates,
        maxStaleSecs,
        maxConfBps,
        userAddress,
        { value: fee }
      );
      
      const receipt = await tx.wait();
      
      // Parse execution event
      const executedEvent = receipt.events?.find(
        (e: any) => e.event === 'Executed'
      );
      
      let triggerType = 'UNKNOWN';
      let price18 = '0';
      let amount = '0';
      
      if (executedEvent) {
        triggerType = executedEvent.args.triggerType;
        price18 = executedEvent.args.price18.toString();
        amount = executedEvent.args.amount.toString();
      }
      
      logger.info('Vault execution completed', {
        userAddress,
        vaultAddress,
        triggerType,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
      });
      
      return {
        txHash: tx.hash,
        executed: true,
        triggerType,
        price18,
        amount,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
      };
    } catch (error: any) {
      logger.error('Vault execution failed', { 
        userAddress, 
        vaultAddress, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get user's vault position
   */
  async getUserPosition(
    userAddress: string,
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<VaultPositionResponse> {
    try {
      const provider = this.providers.get(network);
      if (!provider) {
        throw new Error(`No provider available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
      
      // Get position data
      const positionData = await vault.getPosition(userAddress);
      const position: VaultPosition = {
        amountETH: ethers.utils.formatEther(positionData.amountETH),
        stopLossPrice18: ethers.utils.formatEther(positionData.stopLossPrice18),
        takeProfitPrice18: ethers.utils.formatEther(positionData.takeProfitPrice18),
        active: positionData.active,
        depositTime: positionData.depositTime.toNumber(),
      };
      
      // Get current price
      const [price18, conf18] = await vault.getCurrentPrice(vaultConfig.maxStalenessSeconds);
      const currentPrice = ethers.utils.formatEther(price18);
      const priceConfidence = ethers.utils.formatEther(conf18);
      
      // Check if can execute
      const currentPriceNum = parseFloat(currentPrice);
      const stopLossNum = parseFloat(position.stopLossPrice18);
      const takeProfitNum = parseFloat(position.takeProfitPrice18);
      
      const canExecute = position.active && (
        currentPriceNum <= stopLossNum || 
        currentPriceNum >= takeProfitNum
      );
      
      return {
        position,
        currentPrice,
        priceConfidence,
        canExecute,
        triggerDistance: {
          stopLoss: ((currentPriceNum - stopLossNum) / currentPriceNum * 100).toFixed(2) + '%',
          takeProfit: ((takeProfitNum - currentPriceNum) / currentPriceNum * 100).toFixed(2) + '%',
        },
      };
    } catch (error: any) {
      logger.error('Failed to get user position', { 
        userAddress, 
        vaultAddress, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Check if triggers should be executed for a position
   */
  async checkTriggerConditions(
    userAddress: string,
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<boolean> {
    try {
      const positionData = await this.getUserPosition(userAddress, vaultAddress, network);
      return positionData.canExecute;
    } catch (error: any) {
      logger.error('Failed to check trigger conditions', { 
        userAddress, 
        vaultAddress, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Get all active vault positions (mock implementation)
   */
  async getActiveVaults(): Promise<VaultMonitoringData[]> {
    try {
      // In production, this would query a database or contract events
      // For now, return empty array
      return [];
    } catch (error: any) {
      logger.error('Failed to get active vaults', { error: error.message });
      return [];
    }
  }

  /**
   * Withdraw from vault
   */
  async withdraw(
    userAddress: string,
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<string> {
    try {
      const signer = this.signers.get(network);
      if (!signer) {
        throw new Error(`No signer available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const tx = await vault.withdraw();
      
      logger.info('Withdrawal from vault', {
        userAddress,
        vaultAddress,
        txHash: tx.hash,
      });
      
      return tx.hash;
    } catch (error: any) {
      logger.error('Vault withdrawal failed', { 
        userAddress, 
        vaultAddress, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Cancel triggers without withdrawing
   */
  async cancelTriggers(
    userAddress: string,
    vaultAddress: string,
    network: string = vaultConfig.defaultNetwork
  ): Promise<string> {
    try {
      const signer = this.signers.get(network);
      if (!signer) {
        throw new Error(`No signer available for network: ${network}`);
      }

      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const tx = await vault.cancelTriggers();
      
      logger.info('Triggers cancelled for vault position', {
        userAddress,
        vaultAddress,
        txHash: tx.hash,
      });
      
      return tx.hash;
    } catch (error: any) {
      logger.error('Cancel triggers failed', { 
        userAddress, 
        vaultAddress, 
        error: error.message 
      });
      throw error;
    }
  }
}

export default SafeExitVaultService;
