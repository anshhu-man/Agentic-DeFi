import { GraphQLClient } from 'graphql-request';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';
import { 
  PoolData, 
  LendingRate, 
  GovernanceProposal, 
  DeFiPosition,
  SubgraphQuery 
} from '@/types';

export class GraphService {
  private clients: Map<string, GraphQLClient> = new Map();

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize GraphQL clients for different subgraphs
    this.clients.set('uniswap', new GraphQLClient(config.subgraphs.uniswap));
    this.clients.set('aave', new GraphQLClient(config.subgraphs.aave));
    this.clients.set('compound', new GraphQLClient(config.subgraphs.compound));
    
    logger.info('Initialized Graph service clients', { 
      clientCount: this.clients.size 
    });
  }

  async queryUniswapPools(
    chainId: number, 
    tokenPair?: string,
    limit: number = 50
  ): Promise<PoolData[]> {
    try {
      const cacheKey = `uniswap:pools:${chainId}:${tokenPair || 'all'}`;
      const cached = await cache.get<PoolData[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const client = this.clients.get('uniswap');
      if (!client) {
        throw new Error('Uniswap GraphQL client not initialized');
      }

      let whereClause = '';
      if (tokenPair) {
        const [token0, token1] = tokenPair.split('/');
        whereClause = `where: { 
          or: [
            { token0_: { symbol: "${token0}" }, token1_: { symbol: "${token1}" } },
            { token0_: { symbol: "${token1}" }, token1_: { symbol: "${token0}" } }
          ]
        }`;
      }

      const query = `
        query GetPools {
          pools(
            first: ${limit}
            orderBy: tvlUSD
            orderDirection: desc
            ${whereClause}
          ) {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            feeTier
            liquidity
            sqrtPrice
            tick
            volumeUSD
            tvlUSD
          }
        }
      `;

      const response = await client.request(query);
      const pools: PoolData[] = response.pools;

      // Cache for 5 minutes
      await cache.set(cacheKey, pools, 300);

      logger.info('Retrieved Uniswap pools', { 
        chainId, 
        tokenPair, 
        poolCount: pools.length 
      });

      return pools;
    } catch (error) {
      logger.error('Failed to query Uniswap pools', { chainId, tokenPair, error });
      return [];
    }
  }

  async getAaveLendingRates(chainId: number): Promise<LendingRate[]> {
    try {
      const cacheKey = `aave:rates:${chainId}`;
      const cached = await cache.get<LendingRate[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const client = this.clients.get('aave');
      if (!client) {
        throw new Error('Aave GraphQL client not initialized');
      }

      const query = `
        query GetLendingRates {
          reserves(
            first: 100
            orderBy: totalLiquidity
            orderDirection: desc
          ) {
            symbol
            liquidityRate
            variableBorrowRate
            stableBorrowRate
            totalLiquidity
            totalDebt
            utilizationRate
            underlyingAsset
          }
        }
      `;

      const response = await client.request(query);
      
      const rates: LendingRate[] = response.reserves.map((reserve: any) => ({
        asset: reserve.symbol,
        supplyRate: reserve.liquidityRate,
        borrowRate: reserve.variableBorrowRate,
        totalSupply: reserve.totalLiquidity,
        totalBorrow: reserve.totalDebt,
        utilizationRate: reserve.utilizationRate,
      }));

      // Cache for 10 minutes
      await cache.set(cacheKey, rates, 600);

      logger.info('Retrieved Aave lending rates', { 
        chainId, 
        rateCount: rates.length 
      });

      return rates;
    } catch (error) {
      logger.error('Failed to get Aave lending rates', { chainId, error });
      return [];
    }
  }

  async getCompoundRates(chainId: number): Promise<LendingRate[]> {
    try {
      const cacheKey = `compound:rates:${chainId}`;
      const cached = await cache.get<LendingRate[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const client = this.clients.get('compound');
      if (!client) {
        throw new Error('Compound GraphQL client not initialized');
      }

      const query = `
        query GetCompoundRates {
          markets(
            first: 100
            orderBy: totalSupply
            orderDirection: desc
          ) {
            symbol
            supplyRate
            borrowRate
            totalSupply
            totalBorrows
            underlyingSymbol
            underlyingAddress
          }
        }
      `;

      const response = await client.request(query);
      
      const rates: LendingRate[] = response.markets.map((market: any) => ({
        asset: market.underlyingSymbol || market.symbol,
        supplyRate: market.supplyRate,
        borrowRate: market.borrowRate,
        totalSupply: market.totalSupply,
        totalBorrow: market.totalBorrows,
        utilizationRate: market.totalBorrows && market.totalSupply 
          ? (parseFloat(market.totalBorrows) / parseFloat(market.totalSupply) * 100).toString()
          : '0',
      }));

      // Cache for 10 minutes
      await cache.set(cacheKey, rates, 600);

      logger.info('Retrieved Compound rates', { 
        chainId, 
        rateCount: rates.length 
      });

      return rates;
    } catch (error) {
      logger.error('Failed to get Compound rates', { chainId, error });
      return [];
    }
  }

  async getGovernanceProposals(daoAddress: string): Promise<GovernanceProposal[]> {
    try {
      const cacheKey = cache.keys.governanceProposals(daoAddress);
      const cached = await cache.get<GovernanceProposal[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // This would typically query a governance-specific subgraph
      // For now, we'll return mock data structure
      const proposals: GovernanceProposal[] = [];

      // Cache for 30 minutes
      await cache.set(cacheKey, proposals, 1800);

      logger.info('Retrieved governance proposals', { 
        daoAddress, 
        proposalCount: proposals.length 
      });

      return proposals;
    } catch (error) {
      logger.error('Failed to get governance proposals', { daoAddress, error });
      return [];
    }
  }

  async getUserLPPositions(address: string): Promise<DeFiPosition[]> {
    try {
      const cacheKey = `lp:positions:${address}`;
      const cached = await cache.get<DeFiPosition[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const client = this.clients.get('uniswap');
      if (!client) {
        throw new Error('Uniswap GraphQL client not initialized');
      }

      const query = `
        query GetUserPositions($address: String!) {
          positions(
            where: { owner: $address }
            first: 100
          ) {
            id
            liquidity
            depositedToken0
            depositedToken1
            withdrawnToken0
            withdrawnToken1
            collectedFeesToken0
            collectedFeesToken1
            pool {
              id
              token0 {
                id
                symbol
                decimals
              }
              token1 {
                id
                symbol
                decimals
              }
              feeTier
            }
          }
        }
      `;

      const response = await client.request(query, { address: address.toLowerCase() });
      
      const positions: DeFiPosition[] = response.positions.map((position: any) => ({
        protocol: 'Uniswap V3',
        type: 'liquidity_pool' as const,
        tokenAddress: position.pool.id,
        tokenSymbol: `${position.pool.token0.symbol}/${position.pool.token1.symbol}`,
        amount: position.liquidity,
        valueUSD: '0', // Would need price calculation
        metadata: {
          positionId: position.id,
          token0: position.pool.token0,
          token1: position.pool.token1,
          feeTier: position.pool.feeTier,
          depositedToken0: position.depositedToken0,
          depositedToken1: position.depositedToken1,
          collectedFees: {
            token0: position.collectedFeesToken0,
            token1: position.collectedFeesToken1,
          },
        },
      }));

      // Cache for 5 minutes
      await cache.set(cacheKey, positions, 300);

      logger.info('Retrieved user LP positions', { 
        address, 
        positionCount: positions.length 
      });

      return positions;
    } catch (error) {
      logger.error('Failed to get user LP positions', { address, error });
      return [];
    }
  }

  async getProtocolTVL(protocol: string, chainId: number): Promise<string> {
    try {
      const cacheKey = `tvl:${protocol}:${chainId}`;
      const cached = await cache.get<string>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const client = this.clients.get(protocol.toLowerCase());
      if (!client) {
        throw new Error(`${protocol} GraphQL client not initialized`);
      }

      let query = '';
      let tvlField = '';

      switch (protocol.toLowerCase()) {
        case 'uniswap':
          query = `
            query GetUniswapTVL {
              uniswapDayDatas(
                first: 1
                orderBy: date
                orderDirection: desc
              ) {
                tvlUSD
              }
            }
          `;
          tvlField = 'uniswapDayDatas[0].tvlUSD';
          break;
        
        case 'aave':
          query = `
            query GetAaveTVL {
              protocols(first: 1) {
                totalLiquidityUSD
              }
            }
          `;
          tvlField = 'protocols[0].totalLiquidityUSD';
          break;
        
        default:
          throw new Error(`Unsupported protocol: ${protocol}`);
      }

      const response = await client.request(query);
      const tvl = this.getNestedValue(response, tvlField) || '0';

      // Cache for 15 minutes
      await cache.set(cacheKey, tvl, 900);

      logger.info('Retrieved protocol TVL', { protocol, chainId, tvl });

      return tvl;
    } catch (error) {
      logger.error('Failed to get protocol TVL', { protocol, chainId, error });
      return '0';
    }
  }

  async getTopTokensByVolume(
    chainId: number, 
    timeframe: '24h' | '7d' | '30d' = '24h',
    limit: number = 20
  ): Promise<Array<{ symbol: string; volume: string; price: string }>> {
    try {
      const cacheKey = `tokens:volume:${chainId}:${timeframe}`;
      const cached = await cache.get<Array<{ symbol: string; volume: string; price: string }>>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const client = this.clients.get('uniswap');
      if (!client) {
        throw new Error('Uniswap GraphQL client not initialized');
      }

      const query = `
        query GetTopTokens {
          tokens(
            first: ${limit}
            orderBy: volumeUSD
            orderDirection: desc
          ) {
            symbol
            volumeUSD
            derivedETH
          }
        }
      `;

      const response = await client.request(query);
      
      const tokens = response.tokens.map((token: any) => ({
        symbol: token.symbol,
        volume: token.volumeUSD,
        price: token.derivedETH,
      }));

      // Cache for 10 minutes
      await cache.set(cacheKey, tokens, 600);

      logger.info('Retrieved top tokens by volume', { 
        chainId, 
        timeframe, 
        tokenCount: tokens.length 
      });

      return tokens;
    } catch (error) {
      logger.error('Failed to get top tokens by volume', { chainId, timeframe, error });
      return [];
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  }

  async customQuery(subgraph: string, query: SubgraphQuery): Promise<any> {
    try {
      const client = this.clients.get(subgraph);
      if (!client) {
        throw new Error(`${subgraph} GraphQL client not initialized`);
      }

      const response = await client.request(query.query, query.variables);
      
      logger.info('Executed custom subgraph query', { 
        subgraph, 
        queryLength: query.query.length 
      });

      return response;
    } catch (error) {
      logger.error('Failed to execute custom query', { subgraph, error });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test connectivity to main subgraphs
      const healthChecks = await Promise.allSettled([
        this.queryUniswapPools(1, undefined, 1),
        this.getAaveLendingRates(1),
      ]);

      const successCount = healthChecks.filter(result => result.status === 'fulfilled').length;
      const isHealthy = successCount >= healthChecks.length / 2;

      logger.info('Graph service health check', { 
        successCount, 
        totalChecks: healthChecks.length, 
        isHealthy 
      });

      return isHealthy;
    } catch (error) {
      logger.error('Graph service health check failed', { error });
      return false;
    }
  }
}

export default GraphService;
