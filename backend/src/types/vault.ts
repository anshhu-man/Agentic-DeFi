export interface VaultPosition {
  amountETH: string;
  stopLossPrice18: string;
  takeProfitPrice18: string;
  active: boolean;
  depositTime: number;
}

export interface VaultDeployParams {
  network: string;
  pythAddress: string;
  feedId: string;
}

export interface TriggerParams {
  stopLossPrice18: string;
  takeProfitPrice18: string;
}

export interface ExecutionParams {
  userAddress: string;
  vaultAddress: string;
  maxStaleSecs: number;
  maxConfBps: number;
}

export interface VaultExecution {
  txHash: string;
  user: string;
  price18: string;
  amount: string;
  triggerType: 'STOP_LOSS' | 'TAKE_PROFIT';
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
}

export interface VaultConfig {
  networks: {
    [key: string]: {
      pythContract: string;
      rpcUrl: string;
      explorerUrl: string;
      chainId: number;
    };
  };
  defaultNetwork: string;
  monitoringEnabled: boolean;
  maxConfidenceBps: number;
  maxStalenessSeconds: number;
  ethFeedId: string;
}

export interface PriceUpdateData {
  feedId: string;
  price18: string;
  conf18: string;
  timestamp: number;
  updateData: string; // Base64 encoded price update from Hermes
}

export interface VaultMonitoringData {
  vaultAddress: string;
  userAddress: string;
  position: VaultPosition;
  currentPrice: string;
  shouldExecute: boolean;
  triggerType?: 'STOP_LOSS' | 'TAKE_PROFIT';
  lastChecked: number;
}

export interface HermesResponse {
  binary: {
    data: string[];
  };
  parsed?: Array<{
    id: string;
    price: {
      price: string;
      conf: string;
      expo: number;
      publish_time: number;
    };
  }>;
}

export interface VaultStats {
  totalDeposits: string;
  totalExecutions: number;
  totalUsers: number;
  averageExecutionTime: number;
  successRate: number;
}

export interface VaultError {
  code: string;
  message: string;
  details?: any;
}

// API Response types
export interface VaultApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  timestamp: string;
}

export interface DeployVaultResponse {
  contractAddress: string;
  network: string;
  explorerUrl: string;
  txHash: string;
}

export interface ExecuteVaultResponse {
  txHash: string;
  executed: boolean;
  triggerType: string;
  price18: string;
  amount: string;
  gasUsed: string;
  gasPrice: string;
}

export interface VaultPositionResponse {
  position: VaultPosition;
  currentPrice: string;
  priceConfidence: string;
  canExecute: boolean;
  triggerDistance: {
    stopLoss: string;
    takeProfit: string;
  };
}
