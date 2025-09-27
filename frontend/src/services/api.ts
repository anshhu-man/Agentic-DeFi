const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';

export interface QueryRequest {
  query: string;
  userAddress?: string;
  preferences?: any;
}

export interface QueryResponse {
  success: boolean;
  data?: any;
  error?: any;
  meta?: any;
}

class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async checkHealth(): Promise<any> {
    const res = await fetch(`${this.baseURL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status}`);
    }
    return res.json();
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const res = await fetch(`${this.baseURL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Query failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  // New: Fetch batch Pyth prices from backend
  async getPythPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number; confidence: number | null; publishTime: string | null }>> {
    const params = new URLSearchParams();
    params.set('symbols', symbols.join(','));
    const res = await fetch(`${this.baseURL}/api/pyth/prices?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Pyth prices failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }

  // New: Fetch batch volatilities from backend (percentage)
  async getPythVolatilities(symbols: string[], period = 24): Promise<Array<{ symbol: string; volatility?: number; error?: string }>> {
    const params = new URLSearchParams();
    params.set('symbols', symbols.join(','));
    params.set('period', String(period));
    const res = await fetch(`${this.baseURL}/api/pyth/volatilities?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Pyth volatilities failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }

  // New: Fetch correlation between two symbols
  async getPythCorrelation(symbol1: string, symbol2: string, period = 30): Promise<{ symbol1: string; symbol2: string; correlation: number }> {
    const params = new URLSearchParams();
    params.set('symbol1', symbol1);
    params.set('symbol2', symbol2);
    params.set('period', String(period));
    const res = await fetch(`${this.baseURL}/api/pyth/correlation?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Pyth correlation failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || { symbol1, symbol2, correlation: 0 };
  }

  // New: Post chat message to backend; optionally include supabase user token for persistence
  async postChat(message: string, userId?: string, supabaseAccessToken?: string): Promise<{ success: boolean; data?: { reply: string; model: string } }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabaseAccessToken) {
      headers['x-supabase-auth'] = `Bearer ${supabaseAccessToken}`;
    }
    const res = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, userId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Chat failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  // New: Get chat history for a user; requires supabase user token for RLS
  async getChatHistory(userId: string, supabaseAccessToken: string, limit = 50): Promise<any[]> {
    const headers: Record<string, string> = {};
    headers['x-supabase-auth'] = `Bearer ${supabaseAccessToken}`;
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', String(limit));
    const res = await fetch(`${this.baseURL}/api/chat/history?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Chat history failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }

  // Hermes API Integration for Vault Operations
  async getHermesPrice(priceId: string): Promise<{
    price: number;
    confidence: number;
    publishTime: string;
    priceId: string;
    expo: number;
  }> {
    const res = await fetch(`${this.baseURL}/api/hermes/price/${priceId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Hermes price fetch failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || {};
  }

  async getHermesPrices(priceIds: string[]): Promise<Array<{
    price: number;
    confidence: number;
    publishTime: string;
    priceId: string;
    expo: number;
  }>> {
    const params = new URLSearchParams();
    params.set('priceIds', priceIds.join(','));
    const res = await fetch(`${this.baseURL}/api/hermes/prices?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Hermes prices fetch failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }

  // Vault Management API
  async createVault(config: {
    asset: string;
    depositAmount: string;
    stopLoss: number;
    takeProfit: number;
    confidenceThreshold: number;
    maxSlippage: number;
    autoReinvest: boolean;
    emergencyExit: boolean;
    userAddress: string;
  }): Promise<{ success: boolean; vaultId?: string; error?: string }> {
    const res = await fetch(`${this.baseURL}/api/vault/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Vault creation failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async getVaults(userAddress: string): Promise<Array<{
    id: string;
    asset: string;
    depositAmount: number;
    currentValue: number;
    entryPrice: number;
    currentPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    status: 'active' | 'triggered' | 'emergency_exit';
    createdAt: string;
    pnl: number;
    pnlPercentage: number;
  }>> {
    const params = new URLSearchParams();
    params.set('userAddress', userAddress);
    const res = await fetch(`${this.baseURL}/api/vault/list?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Vault list failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }

  async executeTrigger(vaultId: string, triggerType: 'stop_loss' | 'take_profit', userAddress: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    const res = await fetch(`${this.baseURL}/api/vault/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, triggerType, userAddress }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Trigger execution failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async emergencyExit(vaultId: string, userAddress: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    const res = await fetch(`${this.baseURL}/api/vault/emergency-exit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, userAddress }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Emergency exit failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  // Confidence and Safety Checks
  async checkTriggerConditions(userAddress: string): Promise<Array<{
    vaultId: string;
    asset: string;
    triggerType: 'stop_loss' | 'take_profit';
    currentPrice: number;
    triggerPrice: number;
    confidence: number;
    shouldExecute: boolean;
    reason: string;
    timestamp: string;
  }>> {
    const params = new URLSearchParams();
    params.set('userAddress', userAddress);
    const res = await fetch(`${this.baseURL}/api/vault/check-triggers?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Trigger check failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }

  async getConfidenceBands(symbols: string[]): Promise<Array<{
    symbol: string;
    upperBound: number;
    lowerBound: number;
    confidence: number;
    timestamp: string;
  }>> {
    const params = new URLSearchParams();
    params.set('symbols', symbols.join(','));
    const res = await fetch(`${this.baseURL}/api/pyth/confidence-bands?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Confidence bands failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json?.data || [];
  }
}

const apiService = new APIService();
export default apiService;
