import { logger } from '../utils/logger';
import { BlockchainActionService, SwapParams } from './BlockchainActionService';
import { AgenticPromptService } from './AgenticPromptService';
import { NetworkConfigService, ChainId } from './NetworkConfigService';
import { 
  ActionPlan, 
  OrchestrationRequest, 
  OrchestrationResponse, 
  TransactionDetails,
  ValidationResult
} from '../types';
import NetworkSelectionService from './NetworkSelectionService';
import AaveV3Adapter from './protocols/AaveV3Adapter';
import { ethers } from 'ethers';

export class EnhancedAgenticOrchestrator {
  private blockchainService: BlockchainActionService;
  private promptService: AgenticPromptService;
  private networkService: NetworkConfigService;
  private selectionService: NetworkSelectionService;
  private aaveAdapter: AaveV3Adapter;
  
  constructor(
    blockchainService: BlockchainActionService,
    promptService: AgenticPromptService
  ) {
    this.blockchainService = blockchainService;
    this.promptService = promptService;
    this.networkService = new NetworkConfigService();
    this.selectionService = new NetworkSelectionService();
    this.aaveAdapter = new AaveV3Adapter();
  }
  
  async processExecuteWithApprovalRequest(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    try {
      logger.info('Processing execute_with_approval request', {
        intent: request.intent,
        userAddress: request.userAddress,
        mode: request.mode
      });

      // 1. Determine the best network for the actions (Ethereum or Polygon)
      const bestNetwork = await this.determineBestNetwork(request);
      
      // 2. Switch to the appropriate network
      await this.blockchainService.switchNetwork(bestNetwork.chainId);
      
      // 3. Create action plan using AI
      const actionPlan = await this.promptService.planBlockchainActions(
        {
          type: 'yield_optimization',
          confidence: 0.9,
          urgency: 'medium',
          parameters: request.constraints || {},
          reasoning: `User requested: ${request.intent}`
        },
        request.marketContext || {
          volatility: 15,
          gasPrice: '30',
          marketTrend: 'bullish',
          liquidityConditions: 'high',
          protocolHealth: {}
        }
      );
      
      // 4. Enhance action plan with detailed transaction information
      const enhancedPlan = await this.enhanceActionPlanWithDetails(actionPlan, request.userAddress);
      
      // 5. Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(enhancedPlan);
      
      // 6. Calculate total gas costs
      const estimatedGasCosts = this.calculateTotalGasCost(enhancedPlan);
      
      // 7. Return the plan for user approval
      return {
        status: 'awaiting_approval',
        actionPlan: enhancedPlan,
        network: bestNetwork,
        estimatedGasCosts,
        riskAssessment,
        metadata: {
          chainId: bestNetwork.chainId,
          networkName: bestNetwork.name,
          totalActions: enhancedPlan.actions.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to process execute_with_approval request', { error, request });
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  async executeApprovedActions(approvedPlan: ActionPlan, userAddress: string): Promise<OrchestrationResponse> {
    try {
      logger.info('Executing approved actions', {
        userAddress,
        actionCount: approvedPlan.actions.length
      });

      const results = [];
      
      for (const action of approvedPlan.actions) {
        try {
          // Handle different action types
          if (action.type === 'swap') {
            // Check if approval is needed
            const swapParams: SwapParams = {
              tokenIn: action.parameters.fromToken,
              tokenOut: action.parameters.toToken,
              amount: action.parameters.fromAmount,
              slippage: action.parameters.slippage || '1%',
              recipient: userAddress
            };
            
            const approvalTx = await this.blockchainService.checkAndPrepareApproval(
              action.parameters.fromToken,
              userAddress,
              action.parameters.fromAmount
            );
            
            if (approvalTx) {
              // Return approval transaction for user to sign
              results.push({
                type: 'approval',
                status: 'needs_signature',
                transaction: approvalTx,
                description: `Approve ${action.parameters.fromAmount} tokens for swapping`,
                estimatedGas: approvalTx.gas || '50000'
              });
            }
            
            // Build the swap transaction using 1inch
            const swapTx = await this.blockchainService.buildSwapTransaction(swapParams);
            
            results.push({
              type: 'swap',
              status: 'needs_signature',
              transaction: swapTx.tx,
              expectedOutput: swapTx.toTokenAmount,
              route: swapTx.route,
              description: `Swap ${action.parameters.fromAmount} ${action.parameters.fromToken} for ${action.parameters.toToken}`,
              estimatedGas: swapTx.tx.gas || '200000'
            });
          }
          
          // Handle other action types (stake, add_liquidity, etc.)
          else if (action.type === 'stake') {
            // Use protocol adapters when available (Aave V3 as first adapter)
            if (String(action.protocol || '').toLowerCase().includes('aave')) {
              const chainId = this.blockchainService['currentChainId'];
              const asset = action.parameters.pool || action.parameters.asset;
              const amount = action.parameters.amount || '0';
              const amountWei = ethers.utils.parseUnits(String(amount), 18).toString();

              const prepared = await this.aaveAdapter.prepareSupply({
                chainId,
                asset,
                amount: amountWei,
                onBehalfOf: userAddress
              });

              results.push({
                type: 'stake',
                status: 'needs_signature',
                transaction: prepared,
                description: `Supply ${amount} to Aave on chain ${chainId}`,
                estimatedGas: prepared.gas || '150000'
              });
            } else {
              // Fallback stub if adapter not available
              results.push({
                type: 'stake',
                status: 'needs_signature',
                transaction: {
                  to: action.parameters.protocol,
                  data: '0x',
                  value: '0'
                },
                description: `Stake ${action.parameters.amount} tokens in ${action.parameters.protocol}`,
                estimatedGas: '150000'
              });
            }
          }
          
          // Add more action types as needed
          
        } catch (actionError) {
          logger.error('Failed to prepare action', { action, error: actionError });
          results.push({
            type: action.type,
            status: 'error',
            error: actionError instanceof Error ? actionError.message : 'Action preparation failed',
            description: `Failed to prepare ${action.type} action`
          });
        }
      }
      
      return {
        status: 'awaiting_signatures',
        actions: results,
        metadata: {
          totalActions: results.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to execute approved actions', { error, approvedPlan });
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Execution failed',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  // Helper methods
  private async determineBestNetwork(request: OrchestrationRequest): Promise<any> {
    // Use scoring-based selection; fallback to ETH on failure
    try {
      const txSizeUSD = this.estimateTransactionSize(request);
      const choice = await this.selectionService.chooseBestNetwork({ txSizeUSD });
      return this.networkService.getNetworkConfig(choice.chainId);
    } catch {
      return this.networkService.getNetworkConfig(ChainId.ETHEREUM);
    }
  }
  
  private estimateTransactionSize(request: OrchestrationRequest): number {
    // Estimate transaction size in USD based on request parameters
    // This is a simplified implementation
    const amount = request.constraints?.amount || '1000';
    return parseFloat(amount);
  }
  
  private async enhanceActionPlanWithDetails(plan: ActionPlan, userAddress: string): Promise<ActionPlan> {
    // Add detailed transaction information to each action
    const enhancedActions = [];
    
    for (const action of plan.actions) {
      try {
        if (action.type === 'swap') {
          const swapParams: SwapParams = {
            tokenIn: action.parameters.fromToken || 'ETH',
            tokenOut: action.parameters.toToken || 'USDC',
            amount: action.parameters.fromAmount || '1',
            slippage: action.parameters.slippage || '1%',
            recipient: userAddress
          };
          
          const details = await this.blockchainService.getSwapDetails(swapParams);
          
          enhancedActions.push({
            ...action,
            details,
            enhancedParameters: {
              ...action.parameters,
              expectedOutput: details.expectedToAmount,
              minOutput: details.minToAmount,
              priceImpact: details.priceImpact,
              route: details.route
            }
          });
        } else {
          // For non-swap actions, add basic enhancement
          enhancedActions.push({
            ...action,
            details: {
              action: action.type,
              estimatedGas: '150000',
              estimatedGasCost: '0.01',
              chainId: this.blockchainService['currentChainId'],
              networkName: this.networkService.getNetworkName(this.blockchainService['currentChainId'])
            }
          });
        }
      } catch (error) {
        logger.error('Failed to enhance action with details', { action, error });
        // Add action without enhancement if details fail
        enhancedActions.push(action);
      }
    }
    
    return {
      ...plan,
      actions: enhancedActions
    };
  }
  
  private calculateTotalGasCost(plan: ActionPlan): string {
    // Calculate the total gas cost for all actions
    let totalGasCostEth = 0;
    
    for (const action of plan.actions) {
      if (action.details && action.details.estimatedGasCost) {
        totalGasCostEth += parseFloat(action.details.estimatedGasCost);
      }
    }
    
    return totalGasCostEth.toFixed(6);
  }
  
  private async performRiskAssessment(plan: ActionPlan): Promise<any> {
    // Perform risk assessment for the action plan
    let overallRiskScore = 0;
    const riskFactors = [];
    const recommendations = [];
    
    for (const action of plan.actions) {
      // Assess risk based on action type and parameters
      if (action.type === 'swap') {
        const priceImpact = action.details?.priceImpact || 0;
        if (priceImpact > 2) {
          riskFactors.push(`High price impact (${priceImpact.toFixed(2)}%) for swap`);
          overallRiskScore += 20;
        }
        
        const slippage = parseFloat(action.parameters.slippage?.replace('%', '') || '1');
        if (slippage > 3) {
          riskFactors.push(`High slippage tolerance (${slippage}%)`);
          overallRiskScore += 10;
        }
      }
      
      if (action.type === 'stake') {
        riskFactors.push('Smart contract risk from staking protocol');
        overallRiskScore += 15;
      }
    }
    
    // Generate recommendations based on risk factors
    if (overallRiskScore > 50) {
      recommendations.push('Consider reducing position sizes due to high risk');
    }
    if (riskFactors.some(factor => factor.includes('price impact'))) {
      recommendations.push('Consider splitting large trades to reduce price impact');
    }
    
    const riskLevel = overallRiskScore < 20 ? 'low' : 
                     overallRiskScore < 50 ? 'medium' : 'high';
    
    return {
      riskLevel,
      riskScore: Math.min(overallRiskScore, 100),
      factors: riskFactors,
      recommendations,
      shouldProceed: overallRiskScore < 80
    };
  }
  
  // Validation methods
  async validateActionPlan(plan: ActionPlan, userAddress: string): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];
    
    for (const action of plan.actions) {
      // Validate each action
      if (action.type === 'swap') {
        if (!action.parameters.fromToken || !action.parameters.toToken) {
          errors.push(`Invalid swap parameters: missing token addresses`);
        }
        
        if (!action.parameters.fromAmount || parseFloat(action.parameters.fromAmount) <= 0) {
          errors.push(`Invalid swap amount: ${action.parameters.fromAmount}`);
        }
        
        // Check token balance (simplified)
        try {
          const balance = await this.blockchainService.getTokenBalance(
            action.parameters.fromToken,
            userAddress,
            this.blockchainService['currentChainId']
          );
          
          if (parseFloat(balance) < parseFloat(action.parameters.fromAmount)) {
            errors.push(`Insufficient balance for ${action.parameters.fromToken}`);
          }
        } catch (error) {
          warnings.push(`Could not verify balance for ${action.parameters.fromToken}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default EnhancedAgenticOrchestrator;
