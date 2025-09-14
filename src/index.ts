import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';

import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis } from './utils/redis';
import { prisma } from './utils/database';

// Import services
import AlchemyService from './services/AlchemyService';
import PythService from './services/PythService';
import GraphService from './services/GraphService';

// Import agents
import YieldAgent from './agents/YieldAgent';
import RiskAgent from './agents/RiskAgent';
import GovernanceAgent from './agents/GovernanceAgent';
import QueryParserService from './agents/QueryParserService';
import ResponseSynthesizerService from './agents/ResponseSynthesizerService';

// Import controllers
import queryController from './controllers/queryController';
import portfolioController from './controllers/portfolioController';
import alertController from './controllers/alertController';

class AgenticExplorerServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  
  // Services
  private alchemyService!: AlchemyService;
  private pythService!: PythService;
  private graphService!: GraphService;
  
  // AI Agents
  private yieldAgent!: YieldAgent;
  private riskAgent!: RiskAgent;
  private governanceAgent!: GovernanceAgent;
  private queryParser!: QueryParserService;
  private responseSynthesizer!: ResponseSynthesizerService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.initializeServices();
    this.initializeAgents();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private initializeServices(): void {
    logger.info('Initializing services...');
    
    this.alchemyService = new AlchemyService();
    this.pythService = new PythService();
    this.graphService = new GraphService();
    
    logger.info('Services initialized successfully');
  }

  private initializeAgents(): void {
    logger.info('Initializing AI agents...');
    
    this.queryParser = new QueryParserService();
    this.yieldAgent = new YieldAgent(this.graphService, this.pythService);
    this.riskAgent = new RiskAgent(this.alchemyService, this.pythService);
    this.governanceAgent = new GovernanceAgent(this.graphService);
    this.responseSynthesizer = new ResponseSynthesizerService();
    
    logger.info('AI agents initialized successfully');
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.'
      }
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: await this.checkDatabaseHealth(),
            redis: await this.checkRedisHealth(),
            alchemy: await this.checkAlchemyHealth(),
            pyth: await this.checkPythHealth(),
            graph: await this.checkGraphHealth(),
          }
        };

        const allHealthy = Object.values(healthStatus.services).every(status => status);
        
        res.status(allHealthy ? 200 : 503).json(healthStatus);
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    // API routes
    this.app.use('/api/query', queryController);
    this.app.use('/api/portfolio', portfolioController);
    this.app.use('/api/alerts', alertController);

    // Main query endpoint
    this.app.post('/api/query', async (req, res) => {
      try {
        const { query, userAddress, preferences } = req.body;
        
        if (!query) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_QUERY', message: 'Query is required' }
          });
        }

        const startTime = Date.now();
        
        // Parse the natural language query
        const parsedQuery = await this.queryParser.parseNaturalLanguage(query);
        
        // Route to appropriate agents
        const agentTasks = await this.queryParser.routeToAgents(parsedQuery);
        
        // Execute agent tasks
        const agentResults = await Promise.all(
          agentTasks.map(task => this.executeAgentTask(task))
        );
        
        // Synthesize response
        const response = await this.responseSynthesizer.synthesizeResponse(agentResults);
        
        const executionTime = Date.now() - startTime;
        
        res.json({
          success: true,
          data: {
            ...response,
            executionTime,
            query: query,
          },
          meta: {
            timestamp: new Date(),
            executionTime,
            version: '1.0.0'
          }
        });

      } catch (error) {
        logger.error('Query processing failed', { error, query: req.body.query });
        res.status(500).json({
          success: false,
          error: {
            code: 'QUERY_PROCESSING_FAILED',
            message: 'Failed to process query',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        }
      });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', { error, url: req.url, method: req.method });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      socket.on('subscribe', (data) => {
        const { userId, subscriptions } = data;
        
        // Join user-specific room
        socket.join(`user:${userId}`);
        
        // Join subscription-specific rooms
        subscriptions?.forEach((sub: string) => {
          socket.join(sub);
        });
        
        logger.info('Client subscribed', { socketId: socket.id, userId, subscriptions });
      });

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });
  }

  private async executeAgentTask(task: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (task.agentType) {
        case 'yield':
          result = await this.yieldAgent.execute(task);
          break;
        case 'risk':
          result = await this.riskAgent.execute(task);
          break;
        case 'governance':
          result = await this.governanceAgent.execute(task);
          break;
        default:
          throw new Error(`Unknown agent type: ${task.agentType}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        agentType: task.agentType,
        success: true,
        data: result,
        executionTime,
        confidence: 0.8, // Default confidence
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Agent task execution failed', { 
        agentType: task.agentType, 
        error 
      });
      
      return {
        agentType: task.agentType,
        success: false,
        data: null,
        executionTime,
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Health check methods
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      // This will be implemented when we have redis client
      return true;
    } catch {
      return false;
    }
  }

  private async checkAlchemyHealth(): Promise<boolean> {
    try {
      await this.alchemyService.getBlockNumber(1);
      return true;
    } catch {
      return false;
    }
  }

  private async checkPythHealth(): Promise<boolean> {
    try {
      return await this.pythService.isHealthy();
    } catch {
      return false;
    }
  }

  private async checkGraphHealth(): Promise<boolean> {
    try {
      return await this.graphService.isHealthy();
    } catch {
      return false;
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to Redis
      await connectRedis();
      
      // Connect to database
      await prisma.$connect();
      logger.info('Database connected successfully');
      
      // Start server
      this.server.listen(config.server.port, () => {
        logger.info(`🚀 Agentic Meta-Protocol Explorer Backend started`, {
          port: config.server.port,
          environment: config.server.nodeEnv,
          wsPort: config.server.wsPort
        });
      });
      
    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await prisma.$disconnect();
      this.server.close();
      logger.info('Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping server', { error });
    }
  }
}

// Start the server
const server = new AgenticExplorerServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export default server;
