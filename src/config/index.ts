import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    wsPort: parseInt(process.env.WS_PORT || '3001'),
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  apiKeys: {
    alchemy: process.env.ALCHEMY_API_KEY || '',
    graph: process.env.GRAPH_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    coingecko: process.env.COINGECKO_API_KEY || '',
  },
  blockchain: {
    chains: {
      ethereum: {
        id: parseInt(process.env.ETHEREUM_CHAIN_ID || '1'),
        name: 'Ethereum',
        rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorer: 'https://etherscan.io',
      },
      polygon: {
        id: parseInt(process.env.POLYGON_CHAIN_ID || '137'),
        name: 'Polygon',
        rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18,
        },
        blockExplorer: 'https://polygonscan.com',
      },
      rootstock: {
        id: parseInt(process.env.ROOTSTOCK_CHAIN_ID || '30'),
        name: 'Rootstock',
        rpcUrl: 'https://public-node.rsk.co',
        nativeCurrency: {
          name: 'Smart Bitcoin',
          symbol: 'RBTC',
          decimals: 18,
        },
        blockExplorer: 'https://explorer.rsk.co',
      },
    },
  },
  pyth: {
    endpoint: process.env.PYTH_NETWORK_ENDPOINT || 'https://hermes.pyth.network',
  },
  coingecko: {
    baseUrl: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '24h',
  },
  subgraphs: {
    uniswap: process.env.UNISWAP_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    aave: process.env.AAVE_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
    compound: process.env.COMPOUND_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2',
  },
  hyperlane: {
    environment: process.env.HYPERLANE_ENVIRONMENT || 'testnet',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export const SUPPORTED_CHAINS = Object.values(config.blockchain.chains);

export const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  30: 'rootstock',
};

export const TOKEN_ADDRESSES = {
  ethereum: {
    USDC: '0xA0b86a33E6441b8435b662303c0f098C8c5c0f8e',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  rootstock: {
    RBTC: '0x0000000000000000000000000000000000000000',
    // Add more Rootstock tokens as needed
  },
};

export const PROTOCOL_ADDRESSES = {
  ethereum: {
    aave: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    compound: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  polygon: {
    aave: '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf',
    quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  },
  rootstock: {
    // Add Rootstock protocol addresses
  },
};

export const PRICE_FEED_IDS = {
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'DAI/USD': '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd',
};

export default config;
