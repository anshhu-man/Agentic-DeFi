import MistralService from '../services/MistralService';
import { logger } from '../utils/logger';
import { AgentResult, UnifiedResponse } from '../types';

export class ResponseSynthesizerService {
  private mistral: MistralService;

  constructor() {
    this.mistral = new MistralService();
  }

  async synthesizeResponse(agentResults: AgentResult[]): Promise<UnifiedResponse> {
    try {
      const startTime = Date.now();

      // Filter successful results
      const successfulResults = agentResults.filter(result => result.success);
      const failedResults = agentResults.filter(result => !result.success);

      if (successfulResults.length === 0) {
        return this.createErrorResponse(agentResults);
      }

      // Determine the primary intent based on agent results
      const primaryIntent = this.determinePrimaryIntent(successfulResults);

      // Generate summary using AI
      const summary = await this.generateAISummary(successfulResults, primaryIntent);

      // Combine data from all successful agents
      const combinedData = this.combineAgentData(successfulResults);

      // Generate visualizations based on data type
      const visualizations = this.generateVisualizations(successfulResults, primaryIntent);

      // Generate actionable recommendations
      const recommendations = this.generateRecommendations(successfulResults);

      // Generate possible actions
      const actions = this.generateActions(successfulResults, primaryIntent);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(successfulResults);

      const executionTime = Date.now() - startTime;

      const response: UnifiedResponse = {
        query: '', // Will be set by the main handler
        intent: primaryIntent,
        results: {
          summary,
          data: combinedData,
          visualizations,
          actions,
        },
        confidence,
        executionTime,
        recommendations,
      };

      logger.info('Synthesized unified response', {
        agentCount: agentResults.length,
        successfulCount: successfulResults.length,
        failedCount: failedResults.length,
        primaryIntent,
        confidence,
        executionTime,
      });

      return response;
    } catch (error) {
      logger.error('Failed to synthesize response', { agentResults, error });
      return this.createErrorResponse(agentResults);
    }
  }

  private async generateAISummary(
    results: AgentResult[], 
    intent: string
  ): Promise<string> {
    try {
      // Extract real data from results for better context
      const dataContext = results.map(result => ({
        agent: result.agentType,
        success: result.success,
        dataType: typeof result.data,
        hasData: !!result.data,
        dataPreview: this.extractDataPreview(result.data, result.agentType),
      }));

      const systemPrompt = `
You are a DeFi analysis expert that creates user-friendly summaries of analysis results.

CRITICAL REQUIREMENTS:
- Use ONLY real data provided (no placeholders like [X% APY] or [protocol name])
- Write in clear, accessible language for end users
- Focus on actionable insights and specific opportunities
- Include actual protocol names, APY percentages, and token symbols when available
- Structure the response for maximum readability
- Avoid technical jargon and make DeFi concepts accessible

Context:
- Primary intent: ${intent}
- Agent results: ${JSON.stringify(dataContext)}

Create a comprehensive but concise summary that includes:
1. What was analyzed and found
2. Key opportunities or insights (with specific data points)
3. Important considerations or risks
4. Clear next steps or recommendations

Use a professional but friendly tone that makes DeFi accessible to users.
`;

      const userPrompt = `
Create a user-friendly summary of these DeFi analysis results:

Analysis Type: ${intent}
Successful Agents: ${results.filter(r => r.success).map(r => r.agentType).join(', ')}

Agent Results Summary:
${results.map(r => {
  if (r.success && r.data) {
    const preview = this.extractDataPreview(r.data, r.agentType);
    return `${r.agentType}: Success - ${preview}`;
  }
  return `${r.agentType}: ${r.success ? 'Success' : 'Failed'}`;
}).join('\n')}

Create a 3-4 sentence summary that explains the key findings and recommendations in simple terms.
Use specific data points when available and avoid any placeholder text.
Focus on what the user should know and what actions they might consider.
`;

      const summary = await this.mistral.chatComplete({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.2,
        maxTokens: 300,
      });

      // Validate summary doesn't contain placeholders
      if (summary && !this.containsPlaceholders(summary)) {
        return summary;
      }

      return this.generateFallbackSummary(results, intent);
    } catch (error) {
      logger.error('Failed to generate AI summary', { error });
      return this.generateFallbackSummary(results, intent);
    }
  }

  private extractDataPreview(data: any, agentType: string): string {
    if (!data) return 'No data available';

    try {
      switch (agentType) {
        case 'yield':
          if (Array.isArray(data) && data.length > 0) {
            const topOpp = data[0];
            return `Found ${data.length} opportunities, top: ${topOpp.protocol} ${topOpp.apy}% APY on ${topOpp.tokenSymbol}`;
          }
          break;
        case 'risk':
          if (data.overallRiskScore !== undefined) {
            return `Risk score: ${data.overallRiskScore}/10`;
          }
          break;
        case 'governance':
          if (Array.isArray(data) && data.length > 0) {
            const activeCount = data.filter((p: any) => p.status === 'active').length;
            return `Found ${data.length} proposals, ${activeCount} active`;
          }
          break;
        default:
          if (Array.isArray(data)) {
            return `Found ${data.length} items`;
          }
          return 'Data available';
      }
    } catch (error) {
      return 'Data processing error';
    }

    return 'Data available';
  }

  private containsPlaceholders(text: string): boolean {
    const placeholderPatterns = [
      /\[.*?\]/g,  // [placeholder text]
      /\{.*?\}/g,  // {placeholder}
      /X%/g,       // X%
      /\$X/g,      // $X
      /protocol.*?name/gi,
      /top.*?performing/gi,
      /lower.*?yielding/gi,
    ];
    
    return placeholderPatterns.some(pattern => pattern.test(text));
  }

  private generateFallbackSummary(results: AgentResult[], intent: string): string {
    const successfulAgents = results.filter(r => r.success).map(r => r.agentType);
    
    // Try to extract real data for fallback
    const yieldResult = results.find(r => r.agentType === 'yield' && r.success);
    const riskResult = results.find(r => r.agentType === 'risk' && r.success);
    
    switch (intent) {
      case 'yield_comparison':
        if (yieldResult?.data && Array.isArray(yieldResult.data) && yieldResult.data.length > 0) {
          const topOpp = yieldResult.data[0];
          return `Found ${yieldResult.data.length} yield opportunities with ${topOpp.protocol} offering ${topOpp.apy}% APY on ${topOpp.tokenSymbol} as the top option. Analysis includes current rates, risk assessments, and cross-chain comparisons.`;
        }
        return `Found yield opportunities across ${successfulAgents.length} data source${successfulAgents.length > 1 ? 's' : ''}. Analysis includes current rates, risk assessments, and cross-chain comparisons.`;
      
      case 'risk_analysis':
        if (riskResult?.data?.overallRiskScore !== undefined) {
          const riskLevel = riskResult.data.overallRiskScore > 7 ? 'high' : riskResult.data.overallRiskScore > 4 ? 'medium' : 'low';
          return `Completed risk analysis showing ${riskLevel} risk level with score of ${riskResult.data.overallRiskScore}/10. Key risk factors have been identified with actionable recommendations.`;
        }
        return `Completed risk analysis covering portfolio health, liquidation risks, and diversification metrics. Key risk factors have been identified with actionable recommendations.`;
      
      case 'governance':
        return `Retrieved governance information including active proposals, voting power, and upcoming deadlines. Stay informed on important protocol decisions.`;
      
      case 'portfolio':
        return `Analyzed portfolio performance across multiple chains and protocols. Identified optimization opportunities and risk factors for your holdings.`;
      
      default:
        return `Analysis completed using ${successfulAgents.join(', ')} agent${successfulAgents.length > 1 ? 's' : ''}. Key insights and recommendations are available below.`;
    }
  }

  private determinePrimaryIntent(results: AgentResult[]): string {
    // Determine intent based on which agents were successful
    const agentTypes = results.map(r => r.agentType);
    
    if (agentTypes.includes('yield')) return 'yield_comparison';
    if (agentTypes.includes('risk')) return 'risk_analysis';
    if (agentTypes.includes('governance')) return 'governance';
    
    return 'market_data';
  }

  private combineAgentData(results: AgentResult[]): any {
    const combinedData: any = {};

    for (const result of results) {
      if (result.success && result.data) {
        combinedData[result.agentType] = result.data;
      }
    }

    return combinedData;
  }

  private generateVisualizations(
    results: AgentResult[], 
    intent: string
  ): UnifiedResponse['results']['visualizations'] {
    const visualizations: UnifiedResponse['results']['visualizations'] = [];

    for (const result of results) {
      if (!result.success || !result.data) continue;

      switch (result.agentType) {
        case 'yield':
          if (Array.isArray(result.data) && result.data.length > 0) {
            visualizations?.push({
              type: 'chart',
              data: result.data.slice(0, 10), // Top 10 opportunities
              config: {
                chartType: 'bar',
                xAxis: 'protocol',
                yAxis: 'apy',
                title: 'Top Yield Opportunities',
              },
            });
          }
          break;

        case 'risk':
          if (result.data.overallRiskScore !== undefined) {
            visualizations?.push({
              type: 'metric',
              data: {
                value: result.data.overallRiskScore,
                label: 'Risk Score',
                max: 10,
                color: result.data.overallRiskScore > 7 ? 'red' : 
                       result.data.overallRiskScore > 4 ? 'yellow' : 'green',
              },
              config: {
                type: 'gauge',
                title: 'Portfolio Risk Score',
              },
            });
          }
          break;

        case 'governance':
          if (Array.isArray(result.data) && result.data.length > 0) {
            visualizations?.push({
              type: 'table',
              data: result.data.map((proposal: any) => ({
                title: proposal.title,
                status: proposal.status,
                endTime: proposal.endTime,
                impact: proposal.impact,
              })),
              config: {
                title: 'Active Governance Proposals',
                columns: ['title', 'status', 'endTime', 'impact'],
              },
            });
          }
          break;
      }
    }

    return visualizations;
  }

  private generateRecommendations(results: AgentResult[]): string[] {
    const recommendations: string[] = [];

    for (const result of results) {
      if (result.success && result.recommendations) {
        recommendations.push(...result.recommendations);
      }
    }

    // Remove duplicates and limit to top 5
    const uniqueRecommendations = [...new Set(recommendations)];
    return uniqueRecommendations.slice(0, 5);
  }

  private generateActions(
    results: AgentResult[], 
    intent: string
  ): UnifiedResponse['results']['actions'] {
    const actions: UnifiedResponse['results']['actions'] = [];

    switch (intent) {
      case 'yield_comparison':
        const yieldResult = results.find(r => r.agentType === 'yield' && r.success);
        if (yieldResult?.data && Array.isArray(yieldResult.data) && yieldResult.data.length > 0) {
          const topOpportunity = yieldResult.data[0];
          actions?.push({
            type: 'invest',
            label: `Invest in ${topOpportunity.protocol}`,
            description: `Start earning ${topOpportunity.apy}% APY on ${topOpportunity.tokenSymbol}`,
            parameters: {
              protocol: topOpportunity.protocol,
              token: topOpportunity.tokenSymbol,
              apy: topOpportunity.apy,
            },
          });
        }
        break;

      case 'risk_analysis':
        const riskResult = results.find(r => r.agentType === 'risk' && r.success);
        if ((riskResult?.data?.overallRiskScore ?? 0) > 7) {
          actions?.push({
            type: 'rebalance',
            label: 'Rebalance Portfolio',
            description: 'Reduce risk by diversifying your holdings',
            parameters: {
              currentRisk: (riskResult?.data?.overallRiskScore ?? 0),
              targetRisk: 5,
            },
          });
        }
        break;

      case 'governance':
        const govResult = results.find(r => r.agentType === 'governance' && r.success);
        if (govResult?.data && Array.isArray(govResult.data) && govResult.data.length > 0) {
          const activeProposals = govResult.data.filter((p: any) => p.status === 'active');
          if (activeProposals.length > 0) {
            actions?.push({
              type: 'vote',
              label: 'Vote on Proposals',
              description: `${activeProposals.length} active proposal${activeProposals.length > 1 ? 's' : ''} need your attention`,
              parameters: {
                proposalCount: activeProposals.length,
              },
            });
          }
        }
        break;
    }

    return actions;
  }

  private calculateOverallConfidence(results: AgentResult[]): number {
    if (results.length === 0) return 0;

    const totalConfidence = results.reduce((sum, result) => {
      return sum + (result.success ? result.confidence : 0);
    }, 0);

    const successfulCount = results.filter(r => r.success).length;
    if (successfulCount === 0) return 0;

    const avgConfidence = totalConfidence / successfulCount;
    
    // Adjust confidence based on success rate
    const successRate = successfulCount / results.length;
    
    return Math.min(avgConfidence * successRate, 1);
  }

  private createErrorResponse(agentResults: AgentResult[]): UnifiedResponse {
    const failedAgents = agentResults.filter(r => !r.success);
    const errors = failedAgents.flatMap(r => r.errors || []);

    return {
      query: '',
      intent: 'error',
      results: {
        summary: 'Unable to process your request at this time. Please try again or rephrase your query.',
        data: {
          errors,
          failedAgents: failedAgents.map(r => r.agentType),
        },
      },
      confidence: 0,
      executionTime: 0,
      recommendations: [
        'Try rephrasing your query with more specific details',
        'Check if the requested data sources are available',
        'Contact support if the issue persists',
      ],
    };
  }

  async enhanceResponseWithContext(
    response: UnifiedResponse,
    userContext?: any
  ): Promise<UnifiedResponse> {
    try {
      if (!userContext) return response;

      // Add user-specific context to recommendations
      const contextualRecommendations = await this.generateContextualRecommendations(
        response,
        userContext
      );

      return {
        ...response,
        recommendations: [...response.recommendations, ...contextualRecommendations],
      };
    } catch (error) {
      logger.error('Failed to enhance response with context', { error });
      return response;
    }
  }

  private async generateContextualRecommendations(
    response: UnifiedResponse,
    userContext: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Add recommendations based on user's risk tolerance
    if (userContext.riskTolerance === 'low' && response.intent === 'yield_comparison') {
      recommendations.push('Consider stablecoin yields for lower risk exposure');
    }

    // Add recommendations based on user's portfolio size
    if (userContext.portfolioSize === 'large' && response.intent === 'risk_analysis') {
      recommendations.push('Consider professional portfolio management services');
    }

    return recommendations;
  }
}

export default ResponseSynthesizerService;
