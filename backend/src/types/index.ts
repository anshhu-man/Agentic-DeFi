export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  valueUSD: string;
}

export interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'borrowing' | 'liquidity_pool' | 'staking';
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  valueUSD: string;
  apy?: string;
  healthFactor?: string;
  metadata: Record<string, any>;
}

export interface NFTHolding {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  floorPrice?: string;
  lastSalePrice?: string;
}

export interface ParsedQuery {
  intent: 'yield_comparison' | 'risk_analysis' | 'governance' | 'portfolio' | 'market_data';
  entities: {
    tokens?: string[];
    chains?: string[];
    protocols?: string[];
    timeframe?: string;
    amount?: string;
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  parameters: Record<string, any>;
  confidence: number;
}

export interface AgentTask {
  agentType: 'yield' | 'risk' | 'governance';
  action: string;
  parameters: Record<string, any>;
  priority: number;
}

export interface YieldOpportunity {
  protocol: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  apy: string;
  tvl: string;
  riskScore: number;
  category: 'lending' | 'liquidity_pool' | 'staking';
  minimumDeposit?: string;
  lockupPeriod?: string;
  impermanentLossRisk?: string;
  metadata: Record<string, any>;
}

export interface RiskAnalysis {
  overallRiskScore: number;
  liquidationRisk: {
    positions: Array<{
      protocol: string;
      healthFactor: string;
      liquidationPrice: string;
      timeToLiquidation?: string;
    }>;
  };
  impermanentLossRisk: {
    lpPositions: Array<{
      protocol: string;
      pair: string;
      currentIL: string;
      projectedIL: string;
    }>;
  };
  concentrationRisk: {
    topHoldings: Array<{
      symbol: string;
      percentage: string;
    }>;
  };
  recommendations: string[];
}

export interface GovernanceProposal {
  id: string;
  daoAddress: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'pending';
  startTime: Date;
  endTime: Date;
  votesFor: string;
  votesAgainst: string;
  quorum: string;
  userVotingPower?: string;
  userHasVoted?: boolean;
  impact: 'high' | 'medium' | 'low';
  summary: string;
}

export interface PriceData {
  symbol: string;
  price: string;
  change24h: string;
  volume24h: string;
  marketCap?: string;
  timestamp: Date;
}

export interface CrossChainComparison {
  opportunities: Array<{
    chainId: number;
    chainName: string;
    protocol: string;
    apy: string;
    tvl: string;
    riskScore: number;
    bridgeCost?: string;
    gasCost?: string;
    netApy?: string;
  }>;
  recommendation: {
    bestOption: any;
    reasoning: string;
  };
}

export interface TransactionRequest {
  type: 'swap' | 'lend' | 'borrow' | 'governance' | 'bridge';
  chainId: number;
  to: string;
  data: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
  metadata: Record<string, any>;
}

export interface AlertConfig {
  type: 'liquidation' | 'yield_change' | 'governance' | 'price';
  conditions: {
    threshold?: string;
    comparison?: 'above' | 'below' | 'equals';
    tokens?: string[];
    protocols?: string[];
  };
  notifications: {
    email?: boolean;
    push?: boolean;
    webhook?: string;
  };
}

export interface AgentResult {
  agentType: string;
  success: boolean;
  data: any;
  executionTime: number;
  confidence: number;
  recommendations?: string[];
  errors?: string[];
}

export interface UnifiedResponse {
  query: string;
  intent: string;
  results: {
    summary: string;
    data: any;
    visualizations?: Array<{
      type: 'chart' | 'table' | 'metric';
      data: any;
      config: Record<string, any>;
    }>;
    actions?: Array<{
      type: string;
      label: string;
      description: string;
      parameters: Record<string, any>;
    }>;
  };
  confidence: number;
  executionTime: number;
  recommendations: string[];
}

export interface WebSocketMessage {
  type: 'price_update' | 'alert_triggered' | 'transaction_update' | 'portfolio_update';
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    executionTime: number;
    version: string;
  };
}

// Alchemy SDK Types
export interface AlchemyBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

export interface AlchemyTransaction {
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed?: string;
  status?: string;
}

// The Graph Types
export interface SubgraphQuery {
  query: string;
  variables?: Record<string, any>;
}

export interface PoolData {
  id: string;
  token0: {
    id: string;
    symbol: string;
    decimals: string;
  };
  token1: {
    id: string;
    symbol: string;
    decimals: string;
  };
  feeTier: string;
  liquidity: string;
  sqrtPrice: string;
  tick: string;
  volumeUSD: string;
  tvlUSD: string;
}

export interface LendingRate {
  asset: string;
  supplyRate: string;
  borrowRate: string;
  totalSupply: string;
  totalBorrow: string;
  utilizationRate: string;
}

// Pyth Network Types
export interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
  emaPrice: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
}

// ENS Types
export interface ENSProfile {
  name: string;
  address: string;
  avatar?: string;
  description?: string;
  email?: string;
  url?: string;
  twitter?: string;
  github?: string;
}

export interface GovernanceActivity {
  proposalId: string;
  daoName: string;
  vote: 'for' | 'against' | 'abstain';
  votingPower: string;
  timestamp: Date;
}

// 1inch Service Types
export interface TokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  slippage?: number;
  disableEstimate?: boolean;
}

export interface SwapResult {
  estimatedGas: string;
  toTokenAmount: string;
  route: any[];
  price: number;
}

export interface ApprovalData {
  allowance: string;
  isApproved: boolean;
}

export interface TransactionDetails {
  action: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  expectedToAmount: string;
  minToAmount: string;
  estimatedGas: string;
  estimatedGasCost: string;
  route: any[];
  priceImpact: number;
  chainId: number;
  networkName: string;
}

export interface ActionPlan {
  actions: any[];
  estimatedGasCost?: string;
  riskLevel?: string;
  expectedOutcome?: string;
  [key: string]: any;
}

export interface MultiStepPlan {
  steps: ActionPlan[];
  dependencies: Record<string, string[]>;
}

export interface ExecutionGraph {
  nodes: any[];
  edges: any[];
}

export interface OptimizedActions {
  actions: any[];
  gasEstimate: string;
  executionOrder: number[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SimulationResult {
  success: boolean;
  expectedOutcome: any;
  potentialIssues: string[];
  gasUsed: string;
}

export interface OrchestrationRequest {
  intent: string;
  userAddress: string;
  mode: 'analyze_only' | 'execute_with_approval' | 'autonomous';
  marketContext: any;
  constraints?: Record<string, any>;
}

export interface OrchestrationResponse {
  status: string;
  actionPlan?: ActionPlan;
  network?: any;
  estimatedGasCosts?: string;
  riskAssessment?: any;
  actions?: any[];
  [key: string]: any;
}
