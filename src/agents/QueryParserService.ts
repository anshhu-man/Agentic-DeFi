import OpenAI from 'openai';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { ParsedQuery, AgentTask } from '@/types';

export class QueryParserService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.apiKeys.openai,
    });
  }

  async parseNaturalLanguage(query: string): Promise<ParsedQuery> {
    try {
      const systemPrompt = `
You are an AI assistant specialized in parsing natural language queries about DeFi, blockchain, and Web3 protocols. 
Your job is to extract structured information from user queries.

Extract the following information:
1. Intent: What the user wants to do (yield_comparison, risk_analysis, governance, portfolio, market_data)
2. Entities: Specific tokens, chains, protocols, timeframes, amounts mentioned
3. Parameters: Additional context like risk tolerance, preferences
4. Confidence: How confident you are in your parsing (0-1)

Respond with a JSON object matching this structure:
{
  "intent": "yield_comparison" | "risk_analysis" | "governance" | "portfolio" | "market_data",
  "entities": {
    "tokens": ["ETH", "USDC"],
    "chains": ["ethereum", "polygon"],
    "protocols": ["uniswap", "aave"],
    "timeframe": "24h",
    "amount": "1000",
    "riskTolerance": "medium"
  },
  "parameters": {},
  "confidence": 0.9
}

Examples:
- "What's the best USDC yield on Polygon vs Rootstock?" → intent: yield_comparison, tokens: ["USDC"], chains: ["polygon", "rootstock"]
- "Show me governance proposals I can vote on" → intent: governance
- "What's my portfolio risk?" → intent: risk_analysis
- "Compare ETH/USDC pools across chains" → intent: yield_comparison, tokens: ["ETH", "USDC"]
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(response) as ParsedQuery;
      
      // Validate and set defaults
      const result: ParsedQuery = {
        intent: parsed.intent || 'market_data',
        entities: {
          tokens: parsed.entities?.tokens || [],
          chains: parsed.entities?.chains || [],
          protocols: parsed.entities?.protocols || [],
          timeframe: parsed.entities?.timeframe || '24h',
          amount: parsed.entities?.amount,
          riskTolerance: parsed.entities?.riskTolerance || 'medium',
        },
        parameters: parsed.parameters || {},
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
      };

      logger.info('Parsed natural language query', {
        originalQuery: query,
        parsedIntent: result.intent,
        confidence: result.confidence,
        entities: result.entities,
      });

      return result;
    } catch (error) {
      logger.error('Failed to parse natural language query', { query, error });
      
      // Return a fallback parsed query
      return {
        intent: 'market_data',
        entities: {
          tokens: [],
          chains: [],
          protocols: [],
          timeframe: '24h',
          riskTolerance: 'medium',
        },
        parameters: { originalQuery: query },
        confidence: 0.1,
      };
    }
  }

  async routeToAgents(parsedQuery: ParsedQuery): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];

    try {
      switch (parsedQuery.intent) {
        case 'yield_comparison':
          tasks.push({
            agentType: 'yield',
            action: 'findBestYields',
            parameters: {
              tokens: parsedQuery.entities.tokens,
              chains: parsedQuery.entities.chains,
              protocols: parsedQuery.entities.protocols,
              amount: parsedQuery.entities.amount,
              riskTolerance: parsedQuery.entities.riskTolerance,
            },
            priority: 1,
          });
          break;

        case 'risk_analysis':
          tasks.push({
            agentType: 'risk',
            action: 'analyzePortfolioRisk',
            parameters: {
              chains: parsedQuery.entities.chains,
              tokens: parsedQuery.entities.tokens,
              timeframe: parsedQuery.entities.timeframe,
            },
            priority: 1,
          });
          break;

        case 'governance':
          tasks.push({
            agentType: 'governance',
            action: 'getRelevantProposals',
            parameters: {
              protocols: parsedQuery.entities.protocols,
              chains: parsedQuery.entities.chains,
            },
            priority: 1,
          });
          break;

        case 'portfolio':
          // Portfolio queries might need multiple agents
          tasks.push({
            agentType: 'yield',
            action: 'analyzePortfolioYield',
            parameters: {
              chains: parsedQuery.entities.chains,
              tokens: parsedQuery.entities.tokens,
            },
            priority: 2,
          });
          
          tasks.push({
            agentType: 'risk',
            action: 'analyzePortfolioRisk',
            parameters: {
              chains: parsedQuery.entities.chains,
              tokens: parsedQuery.entities.tokens,
            },
            priority: 1,
          });
          break;

        case 'market_data':
          // Market data queries can involve multiple agents
          if (parsedQuery.entities.tokens?.length > 0) {
            tasks.push({
              agentType: 'yield',
              action: 'getMarketOverview',
              parameters: {
                tokens: parsedQuery.entities.tokens,
                chains: parsedQuery.entities.chains,
                timeframe: parsedQuery.entities.timeframe,
              },
              priority: 1,
            });
          }
          break;

        default:
          logger.warn('Unknown intent, defaulting to market data', { 
            intent: parsedQuery.intent 
          });
          tasks.push({
            agentType: 'yield',
            action: 'getMarketOverview',
            parameters: {
              tokens: ['ETH', 'USDC'],
              chains: ['ethereum', 'polygon'],
              timeframe: '24h',
            },
            priority: 1,
          });
      }

      // Sort tasks by priority
      tasks.sort((a, b) => a.priority - b.priority);

      logger.info('Routed query to agents', {
        intent: parsedQuery.intent,
        taskCount: tasks.length,
        agents: tasks.map(t => t.agentType),
      });

      return tasks;
    } catch (error) {
      logger.error('Failed to route query to agents', { parsedQuery, error });
      
      // Return a default task
      return [{
        agentType: 'yield',
        action: 'getMarketOverview',
        parameters: {},
        priority: 1,
      }];
    }
  }

  async enhanceQuery(query: string, context?: any): Promise<string> {
    try {
      if (!context) {
        return query;
      }

      const systemPrompt = `
You are helping to enhance a DeFi query with additional context. 
The user has provided a query and some context about their portfolio or preferences.
Enhance the query to be more specific and actionable while maintaining the user's original intent.

Context provided: ${JSON.stringify(context)}
Original query: ${query}

Return an enhanced version of the query that incorporates the context.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const enhancedQuery = completion.choices[0]?.message?.content || query;
      
      logger.info('Enhanced query with context', {
        originalQuery: query,
        enhancedQuery,
        contextKeys: Object.keys(context),
      });

      return enhancedQuery;
    } catch (error) {
      logger.error('Failed to enhance query', { query, context, error });
      return query;
    }
  }

  async extractEntities(text: string): Promise<{
    tokens: string[];
    protocols: string[];
    chains: string[];
    amounts: string[];
  }> {
    try {
      const systemPrompt = `
Extract specific entities from this DeFi/Web3 text:
- Tokens: cryptocurrency symbols (ETH, USDC, BTC, etc.)
- Protocols: DeFi protocol names (Uniswap, Aave, Compound, etc.)
- Chains: blockchain names (Ethereum, Polygon, Rootstock, etc.)
- Amounts: numerical values with units ($1000, 5 ETH, etc.)

Return JSON format:
{
  "tokens": ["ETH", "USDC"],
  "protocols": ["Uniswap"],
  "chains": ["Ethereum"],
  "amounts": ["$1000"]
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const entities = JSON.parse(response);
      
      return {
        tokens: entities.tokens || [],
        protocols: entities.protocols || [],
        chains: entities.chains || [],
        amounts: entities.amounts || [],
      };
    } catch (error) {
      logger.error('Failed to extract entities', { text, error });
      return {
        tokens: [],
        protocols: [],
        chains: [],
        amounts: [],
      };
    }
  }

  async classifyQueryComplexity(query: string): Promise<'simple' | 'medium' | 'complex'> {
    try {
      const entityCount = (await this.extractEntities(query));
      const totalEntities = Object.values(entityCount).flat().length;
      
      if (totalEntities <= 2) return 'simple';
      if (totalEntities <= 5) return 'medium';
      return 'complex';
    } catch (error) {
      logger.error('Failed to classify query complexity', { query, error });
      return 'medium';
    }
  }
}

export default QueryParserService;
