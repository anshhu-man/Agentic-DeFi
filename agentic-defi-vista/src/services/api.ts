// API Service Layer for Agentic Meta-Protocol Explorer Backend Integration
// This connects the frontend to the AI agent backend without breaking existing code

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';

export interface QueryRequest {
  query: string;
  userAddress?: string;
  preferences?: any;
}

export interface QueryResponse {
  success: boolean;
  data: {
    query: string;
    intent: 'yield_comparison' | 'risk_analysis' | 'governance' | 'portfolio' | 'market_data';
    results: {
      summary: string;
      data: any;
      visualizations?: any[];
      actions?: any[];
    };
    confidence: number;
    executionTime: number;
    recommendations: string[];
    agentResults: Array<{
      agent: string;
      success: boolean;
      confidence: number;
      executionTime: number;
    }>;
  };
  meta: {
    timestamp: string;
    version: string;
    aiModel: string;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  message: string;
  version: string;
  services: {
    queryParser: boolean;
    yieldAgent: boolean;
    riskAgent: boolean;
    governanceAgent: boolean;
    responseSynthesizer: boolean;
    aiModel: string;
  };
}

class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Health check endpoint
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Main query endpoint - connects to AI agents
  async query(request: QueryRequest): Promise<QueryResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  // Specialized query methods for different intents
  async searchYieldOpportunities(query: string): Promise<QueryResponse> {
    return this.query({ query: `Find yield opportunities: ${query}` });
  }

  async analyzeRisk(query: string): Promise<QueryResponse> {
    return this.query({ query: `Analyze risk: ${query}` });
  }

  async getGovernanceProposals(query: string): Promise<QueryResponse> {
    return this.query({ query: `Show governance proposals: ${query}` });
  }

  async analyzePortfolio(query: string, userAddress?: string): Promise<QueryResponse> {
    return this.query({ 
      query: `Analyze portfolio: ${query}`, 
      userAddress 
    });
  }

  // Transform backend data to frontend format
  transformProtocolData(backendData: any): any[] {
    if (!backendData || !Array.isArray(backendData)) {
      return [];
    }

    return backendData.map((item: any) => ({
      name: item.protocol || item.name || 'Unknown Protocol',
      type: item.category || 'DeFi',
      tvl: item.tvl || '$0',
      apy: item.apy || '0%',
      chain: item.chainName || 'Unknown',
      risk: this.mapRiskScore(item.riskScore),
      color: this.getChainColor(item.chainName),
      currentPrice: item.currentPrice,
      priceChange24h: item.priceChange24h,
      volume24h: item.volume24h,
    }));
  }

  // Transform AI insights from backend
  transformAIInsights(agentResults: any[]): string[] {
    if (!agentResults || !Array.isArray(agentResults)) {
      return [];
    }

    const insights: string[] = [];

    agentResults.forEach(result => {
      if (result.success) {
        switch (result.agent) {
          case 'yield':
            insights.push(`💰 Yield Agent: Found opportunities with ${Math.round(result.confidence * 100)}% confidence`);
            break;
          case 'risk':
            insights.push(`⚠️ Risk Agent: Analysis completed in ${result.executionTime}ms`);
            break;
          case 'governance':
            insights.push(`🗳️ Governance Agent: Proposals analyzed with ${Math.round(result.confidence * 100)}% confidence`);
            break;
          default:
            insights.push(`🤖 ${result.agent} Agent: Analysis completed successfully`);
        }
      }
    });

    return insights;
  }

  // Helper methods
  private mapRiskScore(score: number): string {
    if (!score) return 'Unknown';
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Medium';
    return 'High';
  }

  private getChainColor(chainName: string): string {
    const chainColors: Record<string, string> = {
      'Ethereum': 'text-blue-400',
      'Polygon': 'text-purple-400',
      'Rootstock': 'text-orange-400',
      'Bitcoin': 'text-orange-400',
    };
    return chainColors[chainName] || 'text-accent';
  }

  // Error handling helper
  handleAPIError(error: any): string {
    if (error.message?.includes('Failed to fetch')) {
      return 'Backend server is not running. Please start the DeFi server.';
    }
    if (error.message?.includes('404')) {
      return 'API endpoint not found. Please check the backend configuration.';
    }
    if (error.message?.includes('500')) {
      return 'Backend server error. Please check the server logs.';
    }
    return error.message || 'An unexpected error occurred.';
  }
}

// Export singleton instance
export const apiService = new APIService();

// Export individual methods for convenience
export const {
  checkHealth,
  query,
  searchYieldOpportunities,
  analyzeRisk,
  getGovernanceProposals,
  analyzePortfolio,
  transformProtocolData,
  transformAIInsights,
  handleAPIError,
} = apiService;

export default apiService;
