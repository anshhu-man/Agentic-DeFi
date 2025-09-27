import { NetworkConfig } from '../types';

export enum ChainId {
  ETHEREUM = 1,
  POLYGON = 137,
  ROOTSTOCK = 30
}

export class NetworkConfigService {
  private networks: Map<number, NetworkConfig>;
  
  constructor() {
    this.networks = new Map();
    
    // Ethereum Mainnet
    this.networks.set(ChainId.ETHEREUM, {
      chainId: ChainId.ETHEREUM,
      name: 'Ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-infura-key',
      blockExplorer: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      }
    });
    
    // Polygon Mainnet
    this.networks.set(ChainId.POLYGON, {
      chainId: ChainId.POLYGON,
      name: 'Polygon',
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      blockExplorer: 'https://polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      }
    });

    // Rootstock Mainnet
    this.networks.set(ChainId.ROOTSTOCK, {
      chainId: ChainId.ROOTSTOCK,
      name: 'Rootstock',
      rpcUrl: process.env.ROOTSTOCK_RPC_URL || 'https://public-node.rsk.co',
      blockExplorer: 'https://explorer.rsk.co',
      nativeCurrency: {
        name: 'Rootstock Bitcoin',
        symbol: 'RBTC',
        decimals: 18
      }
    });
  }
  
  getNetworkConfig(chainId: number): NetworkConfig {
    const config = this.networks.get(chainId);
    if (!config) {
      throw new Error(`Network configuration not found for chainId: ${chainId}`);
    }
    return config;
  }
  
  getAllNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }
  
  isSupportedNetwork(chainId: number): boolean {
    return this.networks.has(chainId);
  }
  
  getNetworkName(chainId: number): string {
    const config = this.networks.get(chainId);
    return config ? config.name : 'Unknown Network';
  }
  
  getNetworkRpcUrl(chainId: number): string {
    const config = this.getNetworkConfig(chainId);
    return config.rpcUrl;
  }
  
  getBlockExplorer(chainId: number): string {
    const config = this.getNetworkConfig(chainId);
    return config.blockExplorer;
  }
}
