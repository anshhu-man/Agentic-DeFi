import { Alchemy, Network, AlchemySubscription } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { config, CHAIN_ID_TO_NAME } from '@/config';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';
import { 
  TokenBalance, 
  DeFiPosition, 
  AlchemyBalance, 
  AlchemyTransaction,
  ChainConfig 
} from '@/types';

export class AlchemyService {
  private clients: Map<number, Alchemy> = new Map();
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    const chains = config.blockchain.chains;
    
    // Initialize Alchemy clients for each supported chain
    Object.entries(chains).forEach(([chainName, chainConfig]) => {
      try {
        const network = this.getAlchemyNetwork(chainConfig.id);
        if (network) {
          const alchemy = new Alchemy({
            apiKey: config.apiKeys.alchemy,
            network,
          });
          
          this.clients.set(chainConfig.id, alchemy);
          
          // Also create ethers provider
          const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
          this.providers.set(chainConfig.id, provider);
          
          logger.info(`Initialized Alchemy client for ${chainName}`, { chainId: chainConfig.id });
        }
      } catch (error) {
        logger.error(`Failed to initialize Alchemy client for ${chainName}`, { error });
      }
    });
  }

  private getAlchemyNetwork(chainId: number): Network | null {
    switch (chainId) {
      case 1:
        return Network.ETH_MAINNET;
      case 137:
        return Network.MATIC_MAINNET;
      case 11155111:
        return Network.ETH_SEPOLIA;
      case 80001:
        return Network.MATIC_MUMBAI;
      default:
        return null;
    }
  }

  async getMultiChainBalances(address: string): Promise<Map<number, TokenBalance[]>> {
    const balances = new Map<number, TokenBalance[]>();
    
    for (const [chainId, client] of this.clients) {
      try {
        const cacheKey = cache.keys.userPortfolio(address, chainId);
        const cached = await cache.get<TokenBalance[]>(cacheKey);
        
        if (cached) {
          balances.set(chainId, cached);
          continue;
        }

        const chainBalances = await this.getTokenBalances(address, chainId);
        balances.set(chainId, chainBalances);
        
        // Cache for 5 minutes
        await cache.set(cacheKey, chainBalances, 300);
        
      } catch (error) {
        logger.error(`Failed to get balances for chain ${chainId}`, { address, error });
        balances.set(chainId, []);
      }
    }
    
    return balances;
  }

  async getTokenBalances(address: string, chainId: number): Promise<TokenBalance[]> {
    const client = this.clients.get(chainId);
    if (!client) {
      throw new Error(`No Alchemy client for chain ${chainId}`);
    }

    try {
      // Get native token balance
      const nativeBalance = await client.core.getBalance(address);
      const chainConfig = this.getChainConfig(chainId);
      
      const balances: TokenBalance[] = [{
        address: '0x0000000000000000000000000000000000000000',
        symbol: chainConfig.nativeCurrency.symbol,
        name: chainConfig.nativeCurrency.name,
        balance: ethers.formatEther(nativeBalance),
        decimals: chainConfig.nativeCurrency.decimals,
        valueUSD: '0', // Will be populated by price service
      }];

      // Get ERC-20 token balances
      const tokenBalances = await client.core.getTokenBalances(address);
      
      for (const tokenBalance of tokenBalances.tokenBalances) {
        if (tokenBalance.tokenBalance && tokenBalance.tokenBalance !== '0x0') {
          try {
            const metadata = await client.core.getTokenMetadata(tokenBalance.contractAddress);
            
            balances.push({
              address: tokenBalance.contractAddress,
              symbol: metadata.symbol || 'UNKNOWN',
              name: metadata.name || 'Unknown Token',
              balance: ethers.formatUnits(
                tokenBalance.tokenBalance, 
                metadata.decimals || 18
              ),
              decimals: metadata.decimals || 18,
              valueUSD: '0', // Will be populated by price service
            });
          } catch (error) {
            logger.warn(`Failed to get metadata for token ${tokenBalance.contractAddress}`, { error });
          }
        }
      }

      return balances;
    } catch (error) {
      logger.error('Failed to get token balances', { address, chainId, error });
      throw error;
    }
  }

  async executeTransaction(
    chainId: number, 
    txData: {
      to: string;
      data: string;
      value?: string;
      gasLimit?: string;
      gasPrice?: string;
    }
  ): Promise<string> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }

    try {
      // This would typically require a wallet/signer
      // For now, we'll return the transaction data that would be sent
      logger.info('Transaction prepared for execution', { chainId, txData });
      
      // In a real implementation, you would:
      // 1. Create a signer from the user's wallet
      // 2. Send the transaction
      // 3. Return the transaction hash
      
      return 'mock-tx-hash'; // Placeholder
    } catch (error) {
      logger.error('Failed to execute transaction', { chainId, txData, error });
      throw error;
    }
  }

  async monitorWallet(address: string): Promise<void> {
    for (const [chainId, client] of this.clients) {
      try {
        // Set up webhook or polling for address activity
        logger.info(`Setting up monitoring for address ${address} on chain ${chainId}`);
        
        // In a real implementation, you would set up Alchemy webhooks
        // or use their subscription service for real-time updates
        
      } catch (error) {
        logger.error(`Failed to set up monitoring for ${address} on chain ${chainId}`, { error });
      }
    }
  }

  async getTransactionHistory(
    address: string, 
    chainId: number, 
    limit: number = 100
  ): Promise<AlchemyTransaction[]> {
    const client = this.clients.get(chainId);
    if (!client) {
      throw new Error(`No Alchemy client for chain ${chainId}`);
    }

    try {
      const history = await client.core.getAssetTransfers({
        fromAddress: address,
        category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
        maxCount: limit,
        order: 'desc',
      });

      return history.transfers.map(transfer => ({
        hash: transfer.hash,
        blockNumber: transfer.blockNum.toString(),
        from: transfer.from,
        to: transfer.to || '',
        value: transfer.value?.toString() || '0',
        gas: '0', // Not available in asset transfers
        gasPrice: '0', // Not available in asset transfers
      }));
    } catch (error) {
      logger.error('Failed to get transaction history', { address, chainId, error });
      throw error;
    }
  }

  async getGasPrice(chainId: number): Promise<string> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }

    try {
      const gasPrice = await provider.getFeeData();
      return gasPrice.gasPrice?.toString() || '0';
    } catch (error) {
      logger.error('Failed to get gas price', { chainId, error });
      throw error;
    }
  }

  async estimateGas(
    chainId: number,
    txData: {
      to: string;
      data: string;
      value?: string;
    }
  ): Promise<string> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }

    try {
      const gasEstimate = await provider.estimateGas({
        to: txData.to,
        data: txData.data,
        value: txData.value || '0',
      });
      
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Failed to estimate gas', { chainId, txData, error });
      throw error;
    }
  }

  private getChainConfig(chainId: number): ChainConfig {
    const chainName = CHAIN_ID_TO_NAME[chainId];
    if (!chainName) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    return config.blockchain.chains[chainName as keyof typeof config.blockchain.chains];
  }

  async getBlockNumber(chainId: number): Promise<number> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }

    try {
      return await provider.getBlockNumber();
    } catch (error) {
      logger.error('Failed to get block number', { chainId, error });
      throw error;
    }
  }

  async isContractAddress(address: string, chainId: number): Promise<boolean> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }

    try {
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      logger.error('Failed to check if address is contract', { address, chainId, error });
      return false;
    }
  }
}

export default AlchemyService;
