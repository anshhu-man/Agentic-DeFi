# Agentic Meta-Protocol Explorer Backend

A unified, intelligent backend for Web3 that combines Agentic AI with real-time, cross-protocol data access. This backend powers natural language queries across multiple blockchain protocols and networks.

## 🚀 Features

### Core Capabilities
- **Natural Language Processing**: Convert plain English queries into actionable DeFi insights
- **Multi-Chain Support**: Ethereum, Polygon, Rootstock, and extensible to other chains
- **AI-Powered Agents**: Specialized agents for yield optimization, risk analysis, and governance
- **Real-Time Data**: Live price feeds, protocol data, and market intelligence
- **Cross-Chain Intelligence**: Compare opportunities and execute strategies across multiple chains

### Supported Protocols
- **Lending**: Aave, Compound
- **DEXes**: Uniswap V3, QuickSwap
- **Price Feeds**: Pyth Network
- **Data**: The Graph Protocol
- **Infrastructure**: Alchemy, ENS, Hyperlane

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   AI Agents      │    │   Data Layer    │
│                 │    │                  │    │                 │
│ Natural Language│◄──►│ Query Parser     │◄──►│ Alchemy SDK     │
│ Interface       │    │ Yield Agent      │    │ The Graph       │
│                 │    │ Risk Agent       │    │ Pyth Network    │
│                 │    │ Governance Agent │    │ ENS             │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with Socket.IO for real-time updates
- **Database**: None required for current features
- **AI**: OpenAI GPT for natural language processing
- **Blockchain**: Alchemy SDK, ethers.js
- **Data**: GraphQL clients for The Graph Protocol

## 📋 Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- API Keys for:
  - Alchemy
  - OpenAI
  - The Graph (optional)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd agentic-meta-protocol-explorer-backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# API Keys
ALCHEMY_API_KEY=your_alchemy_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GRAPH_API_KEY=your_graph_api_key_here

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/agentic_explorer"


# JWT Secret
JWT_SECRET=your_secure_jwt_secret_here
```

### 3. Start with Docker (Recommended)

```bash
# Start API
docker-compose up -d

# View logs
docker-compose logs -f api
```

### 4. Manual Setup (Alternative)

If you prefer to run without Docker:

```bash
# Then run:
# Then run:



# Start development server
npm run dev
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Natural Language Query
```http
POST /api/query
Content-Type: application/json

{
  "query": "What's the best USDC yield on Polygon vs Rootstock?",
  "userAddress": "0x...",
  "preferences": {
    "riskTolerance": "medium"
  }
}
```

### Portfolio Analysis
```http
GET /api/portfolio/:address
```

### Alerts Management
```http
POST /api/alerts
GET /api/alerts/:userId
```

## 🤖 AI Agents

### Query Parser Service
Converts natural language into structured queries:
- Intent classification (yield_comparison, risk_analysis, governance, etc.)
- Entity extraction (tokens, chains, protocols, amounts)
- Confidence scoring

### Yield Agent
Finds and compares yield opportunities:
- Cross-protocol yield comparison
- Risk-adjusted return calculations
- Portfolio optimization suggestions

### Risk Agent
Analyzes portfolio and protocol risks:
- Liquidation risk monitoring
- Impermanent loss calculations
- Concentration risk assessment

### Governance Agent
Tracks and summarizes governance activities:
- Relevant proposal identification
- Voting power calculations
- Deadline tracking

## 🔧 Example Queries

The system can handle natural language queries like:

```javascript
// Yield Comparison
"What's the best stablecoin yield on Polygon vs Rootstock?"
"Compare ETH/USDC pools across all chains"
"Show me lending opportunities with less than 5% risk"

// Risk Analysis
"What's my liquidation risk across all positions?"
"Calculate impermanent loss for my LP positions"
"How concentrated is my portfolio?"

// Governance
"What governance proposals can I vote on?"
"Show me Uniswap DAO proposals ending this week"
"Which DAOs have the highest participation rates?"

// Portfolio Management
"Optimize my DeFi portfolio for better yields"
"What's the health status of my positions?"
"Alert me when my collateral ratio drops below 150%"
```

## 🏃‍♂️ Development

### Project Structure

```
src/
├── agents/           # AI agents for different tasks
├── config/           # Configuration and constants
├── controllers/      # API route handlers
├── middleware/       # Express middleware
├── services/         # External service integrations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Main application entry point
```

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
```

### Adding New Agents

1. Create agent class in `src/agents/`
2. Implement the `execute(task: AgentTask)` method
3. Register in `src/index.ts`
4. Add routing logic in `QueryParserService`

### Adding New Data Sources

1. Create service class in `src/services/`
2. Implement data fetching methods
3. Add caching strategies
4. Integrate with relevant agents

## 🔒 Security

- Rate limiting on all API endpoints
- Input validation and sanitization
- Secure headers with Helmet.js
- Environment variable protection
- Database query parameterization

## 📊 Monitoring

### Health Checks
The `/health` endpoint provides status for all services:
- External API availability
- Service-specific health metrics

### Logging
Structured logging with Winston:
- Request/response logging
- Error tracking
- Performance metrics
- Agent execution times

## 🚀 Deployment

### Production Environment

1. Set `NODE_ENV=production`
2. Configure production database
4. Configure load balancer
5. Set up monitoring and alerts

### Environment Variables

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
ALCHEMY_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=...
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review example queries

## 🔮 Roadmap

- [ ] Additional chain support (Arbitrum, Optimism)
- [ ] More DeFi protocols (Curve, Balancer)
- [ ] Advanced risk modeling
- [ ] Automated strategy execution
- [ ] Mobile app support
- [ ] Multi-language support

---

Built with ❤️ for the EthIndia Hackathon
