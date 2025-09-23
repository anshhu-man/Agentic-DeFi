import axios from 'axios';
import { TokenData, SwapParams, SwapResult, ApprovalData } from '../types';

export class OneInchService {
  private baseUrl = 'https://api.1inch.io/v5.0';
  private chainId: number; // 1 for Ethereum, 137 for Polygon
  
  constructor(chainId: number = 1) {
    this.chainId = chainId;
  }
  
  async getSwapQuote(params: SwapParams): Promise<SwapResult> {
    const { fromTokenAddress, toTokenAddress, amount, fromAddress, slippage } = params;
    
    const response = await axios.get(`${this.baseUrl}/${this.chainId}/quote`, {
      params: {
        fromTokenAddress,
        toTokenAddress,
        amount,
        fromAddress,
        slippage: slippage || 1 // Default 1%
      }
    });
    
    return {
      estimatedGas: response.data.estimatedGas,
      toTokenAmount: response.data.toTokenAmount,
      route: response.data.protocols,
      price: Number(response.data.toTokenAmount) / Number(amount)
    };
  }
  
  async buildSwapTransaction(params: SwapParams): Promise<any> {
    const { fromTokenAddress, toTokenAddress, amount, fromAddress, slippage } = params;
    
    const response = await axios.get(`${this.baseUrl}/${this.chainId}/swap`, {
      params: {
        fromTokenAddress,
        toTokenAddress,
        amount,
        fromAddress,
        slippage: slippage || 1,
        disableEstimate: false
      }
    });
    
    return {
      tx: response.data.tx,
      toTokenAmount: response.data.toTokenAmount,
      route: response.data.protocols
    };
  }
  
  async checkAllowance(tokenAddress: string, walletAddress: string): Promise<ApprovalData> {
    const response = await axios.get(`${this.baseUrl}/${this.chainId}/approve/allowance`, {
      params: {
        tokenAddress,
        walletAddress
      }
    });
    
    return {
      allowance: response.data.allowance,
      isApproved: Number(response.data.allowance) > 0
    };
  }
  
  async getApprovalTransaction(tokenAddress: string, amount: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/${this.chainId}/approve/transaction`, {
      params: {
        tokenAddress,
        amount
      }
    });
    
    return response.data;
  }
  
  // Switch between chains (Ethereum, Polygon, etc.)
  setChainId(chainId: number): void {
    this.chainId = chainId;
  }
}
