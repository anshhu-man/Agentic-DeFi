import { logger } from '@/utils/logger';
import { cache } from '@/utils/redis';
import GraphService from '@/services/GraphService';
import { 
  GovernanceProposal, 
  AgentTask 
} from '@/types';

export class GovernanceAgent {
  private graphService: GraphService;

  constructor(graphService: GraphService) {
    this.graphService = graphService;
  }

  async execute(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (task.action) {
        case 'getRelevantProposals':
          result = await this.getRelevantProposals(task.parameters);
          break;
        case 'analyzeProposal':
          result = await this.analyzeProposal(task.parameters);
          break;
        case 'getVotingPower':
          result = await this.getVotingPower(task.parameters);
          break;
        case 'trackProposalDeadlines':
          result = await this.trackProposalDeadlines(task.parameters);
          break;
        default:
          throw new Error(`Unknown action: ${task.action}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Governance agent task completed', {
        action: task.action,
        executionTime,
        resultType: typeof result,
      });
      
      return result;
    } catch (error) {
      logger.error('Governance agent task failed', {
        action: task.action,
        parameters: task.parameters,
        error,
      });
      throw error;
    }
  }

  async getRelevantProposals(params: {
    userAddress?: string;
    protocols?: string[];
    chains?: string[];
    status?: string[];
  }): Promise<GovernanceProposal[]> {
    try {
      const { 
        userAddress,
        protocols = ['uniswap', 'aave', 'compound'],
        chains = ['ethereum', 'polygon'],
        status = ['active']
      } = params;

      const cacheKey = `governance:proposals:${JSON.stringify(params)}`;
      const cached = await cache.get<GovernanceProposal[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const proposals: GovernanceProposal[] = [];

      // Mock governance proposals - in real implementation would query actual DAOs
      const mockProposals: GovernanceProposal[] = [
        {
          id: 'uniswap-001',
          daoAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          title: 'Uniswap V4 Fee Structure Proposal',
          description: 'Proposal to update the fee structure for Uniswap V4 to improve capital efficiency and reduce costs for traders.',
          status: 'active',
          startTime: new Date('2024-01-15'),
          endTime: new Date('2024-01-22'),
          votesFor: '15000000',
          votesAgainst: '2000000',
          quorum: '40000000',
          userVotingPower: userAddress ? '1000' : undefined,
          userHasVoted: false,
          impact: 'high',
          summary: 'This proposal aims to optimize trading costs and improve user experience on Uniswap V4.',
        },
        {
          id: 'aave-002',
          daoAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
          title: 'AAVE Risk Parameter Updates',
          description: 'Proposal to adjust risk parameters for USDC and USDT lending markets to maintain protocol stability.',
          status: 'active',
          startTime: new Date('2024-01-10'),
          endTime: new Date('2024-01-20'),
          votesFor: '8500000',
          votesAgainst: '1200000',
          quorum: '20000000',
          userVotingPower: userAddress ? '500' : undefined,
          userHasVoted: false,
          impact: 'medium',
          summary: 'Risk parameter adjustments to ensure protocol safety while maintaining competitive rates.',
        },
        {
          id: 'compound-003',
          daoAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888',
          title: 'Compound Treasury Diversification',
          description: 'Proposal to diversify the Compound treasury by allocating funds to various DeFi protocols and assets.',
          status: 'pending',
          startTime: new Date('2024-01-25'),
          endTime: new Date('2024-02-01'),
          votesFor: '0',
          votesAgainst: '0',
          quorum: '25000000',
          userVotingPower: userAddress ? '750' : undefined,
          userHasVoted: false,
          impact: 'high',
          summary: 'Treasury diversification strategy to reduce risk and improve long-term sustainability.',
        },
      ];

      // Filter proposals based on parameters
      const filteredProposals = mockProposals.filter(proposal => {
        // Filter by status
        if (status.length > 0 && !status.includes(proposal.status)) {
          return false;
        }

        // Filter by protocols (simplified matching)
        if (protocols.length > 0) {
          const proposalProtocol = proposal.title.toLowerCase();
          const hasMatchingProtocol = protocols.some(protocol => 
            proposalProtocol.includes(protocol.toLowerCase())
          );
          if (!hasMatchingProtocol) {
            return false;
          }
        }

        return true;
      });

      // Sort by impact and end date
      filteredProposals.sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
        if (impactDiff !== 0) return impactDiff;
        
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      });

      // Cache for 30 minutes
      await cache.set(cacheKey, filteredProposals, 1800);

      logger.info('Retrieved relevant governance proposals', {
        totalProposals: mockProposals.length,
        filteredCount: filteredProposals.length,
        protocols,
        status,
      });

      return filteredProposals;
    } catch (error) {
      logger.error('Failed to get relevant proposals', { params, error });
      return [];
    }
  }

  async analyzeProposal(params: any): Promise<{
    summary: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: 'for' | 'against' | 'abstain';
    reasoning: string;
    riskAssessment: string;
    timeRemaining: string;
  }> {
    try {
      const { proposalId = '', daoAddress = '' } = params || {};

      const cacheKey = `governance:analysis:${proposalId}`;
      const cached = await cache.get<any>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Mock analysis - in real implementation would use AI to analyze proposal text
      const analysis = {
        summary: 'This proposal introduces significant changes to the protocol fee structure, potentially affecting user costs and protocol revenue.',
        impact: 'high' as const,
        recommendation: 'for' as const,
        reasoning: 'The proposed changes align with community interests and are likely to improve protocol efficiency while maintaining competitive advantages.',
        riskAssessment: 'Medium risk - changes are well-researched but may have unintended consequences on user behavior.',
        timeRemaining: '5 days',
      };

      // Cache for 1 hour
      await cache.set(cacheKey, analysis, 3600);

      logger.info('Analyzed governance proposal', {
        proposalId,
        impact: analysis.impact,
        recommendation: analysis.recommendation,
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze proposal', { params, error });
      return {
        summary: 'Unable to analyze proposal at this time',
        impact: 'medium',
        recommendation: 'abstain',
        reasoning: 'Insufficient data for analysis',
        riskAssessment: 'Unknown risk level',
        timeRemaining: 'Unknown',
      };
    }
  }

  async getVotingPower(params: any): Promise<Array<{
    daoAddress: string;
    daoName: string;
    votingPower: string;
    totalSupply: string;
    percentage: string;
    delegatedTo?: string;
  }>> {
    try {
      const { userAddress = '', daoAddresses = [] } = params || {};

      const votingPowers = [];

      // Mock voting power data
      const mockVotingData = [
        {
          daoAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          daoName: 'Uniswap',
          votingPower: '1000',
          totalSupply: '1000000000',
          percentage: '0.0001',
        },
        {
          daoAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
          daoName: 'Aave',
          votingPower: '500',
          totalSupply: '16000000',
          percentage: '0.003125',
        },
      ];

      for (const daoAddress of daoAddresses) {
        const mockData = mockVotingData.find(d => d.daoAddress === daoAddress);
        if (mockData) {
          votingPowers.push(mockData);
        }
      }

      logger.info('Retrieved voting power', {
        userAddress,
        daoCount: daoAddresses.length,
        totalVotingPower: votingPowers.reduce((sum, vp) => sum + parseFloat(vp.votingPower), 0),
      });

      return votingPowers;
    } catch (error) {
      logger.error('Failed to get voting power', { params, error });
      return [];
    }
  }

  async trackProposalDeadlines(params: {
    userAddress?: string;
    daysAhead?: number;
  }): Promise<Array<{
    proposalId: string;
    title: string;
    daoName: string;
    endTime: Date;
    timeRemaining: string;
    userVotingPower?: string;
    userHasVoted: boolean;
    urgency: 'low' | 'medium' | 'high';
  }>> {
    try {
      const { userAddress, daysAhead = 7 } = params;

      // Get all active proposals
      const proposals = await this.getRelevantProposals({
        userAddress,
        status: ['active'],
      });

      // Filter proposals ending within the specified timeframe
      const now = new Date();
      const deadline = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

      const upcomingDeadlines = proposals
        .filter(proposal => proposal.endTime <= deadline)
        .map(proposal => {
          const timeRemaining = this.calculateTimeRemaining(proposal.endTime);
          const urgency = this.calculateUrgency(proposal.endTime);

          return {
            proposalId: proposal.id,
            title: proposal.title,
            daoName: this.getDaoName(proposal.daoAddress),
            endTime: proposal.endTime,
            timeRemaining,
            userVotingPower: proposal.userVotingPower,
            userHasVoted: proposal.userHasVoted || false,
            urgency,
          };
        })
        .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

      logger.info('Tracked proposal deadlines', {
        userAddress,
        daysAhead,
        upcomingCount: upcomingDeadlines.length,
        urgentCount: upcomingDeadlines.filter(d => d.urgency === 'high').length,
      });

      return upcomingDeadlines;
    } catch (error) {
      logger.error('Failed to track proposal deadlines', { params, error });
      return [];
    }
  }

  async getGovernanceOverview(params: {
    userAddress?: string;
    protocols?: string[];
  }): Promise<{
    activeProposals: number;
    userVotingPower: string;
    upcomingDeadlines: number;
    participationRate: string;
    recommendations: string[];
  }> {
    try {
      const { userAddress, protocols } = params;

      const proposals = await this.getRelevantProposals({
        userAddress,
        protocols,
        status: ['active'],
      });

      const deadlines = await this.trackProposalDeadlines({
        userAddress,
        daysAhead: 7,
      });

      const totalVotingPower = userAddress ? 
        await this.calculateTotalVotingPower(userAddress, protocols || []) : '0';

      const participationRate = userAddress ?
        await this.calculateParticipationRate(userAddress) : '0';

      const recommendations = this.generateGovernanceRecommendations(
        proposals,
        deadlines,
        parseFloat(totalVotingPower)
      );

      return {
        activeProposals: proposals.length,
        userVotingPower: totalVotingPower,
        upcomingDeadlines: deadlines.length,
        participationRate,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to get governance overview', { params, error });
      return {
        activeProposals: 0,
        userVotingPower: '0',
        upcomingDeadlines: 0,
        participationRate: '0',
        recommendations: ['Unable to load governance overview'],
      };
    }
  }

  // Helper methods
  private calculateTimeRemaining(endTime: Date): string {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  private calculateUrgency(endTime: Date): 'low' | 'medium' | 'high' {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    const hoursRemaining = diff / (1000 * 60 * 60);
    
    if (hoursRemaining <= 24) return 'high';
    if (hoursRemaining <= 72) return 'medium';
    return 'low';
  }

  private getDaoName(daoAddress: string): string {
    const daoNames: Record<string, string> = {
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'Uniswap',
      '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'Aave',
      '0xc00e94cb662c3520282e6f5717214004a7f26888': 'Compound',
    };
    
    return daoNames[daoAddress] || 'Unknown DAO';
  }

  private async calculateTotalVotingPower(
    userAddress: string, 
    protocols: string[]
  ): Promise<string> {
    // Mock implementation
    return '2500';
  }

  private async calculateParticipationRate(userAddress: string): Promise<string> {
    // Mock implementation - would calculate based on voting history
    return '75.5';
  }

  private generateGovernanceRecommendations(
    proposals: GovernanceProposal[],
    deadlines: any[],
    votingPower: number
  ): string[] {
    const recommendations: string[] = [];

    if (deadlines.length > 0) {
      const urgentDeadlines = deadlines.filter(d => d.urgency === 'high');
      if (urgentDeadlines.length > 0) {
        recommendations.push(`${urgentDeadlines.length} proposal${urgentDeadlines.length > 1 ? 's' : ''} ending soon - vote now!`);
      }
    }

    if (votingPower > 0) {
      const highImpactProposals = proposals.filter(p => p.impact === 'high');
      if (highImpactProposals.length > 0) {
        recommendations.push(`${highImpactProposals.length} high-impact proposal${highImpactProposals.length > 1 ? 's' : ''} need your attention`);
      }
    }

    if (proposals.length > 5) {
      recommendations.push('High governance activity - stay informed on key decisions');
    }

    if (votingPower === 0) {
      recommendations.push('Consider acquiring governance tokens to participate in protocol decisions');
    }

    return recommendations;
  }
}

export default GovernanceAgent;
