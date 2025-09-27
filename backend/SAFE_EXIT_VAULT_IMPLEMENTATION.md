# Safe Exit Vault - On-Chain Price-Triggered Implementation

## Overview

This implementation provides a complete **On-Chain Price-Triggered Safe-Exit Vault** using Pyth Network's pull oracle pattern. Users can deposit ETH, set stop-loss and take-profit triggers, and have positions automatically executed when price conditions are met using real-time Pyth price feeds.

## 🎯 Key Features

### Smart Contract Features
- ✅ **ETH Deposits**: Direct ETH deposits with automatic position tracking
- ✅ **Stop-Loss/Take-Profit Triggers**: User-configurable price triggers
- ✅ **Pyth Pull Oracle Integration**: Uses `updatePriceFeeds` with Hermes data
- ✅ **Confidence-Aware Execution**: Configurable confidence thresholds (basis points)
- ✅ **Gas Optimization**: Batch price updates with automatic fee calculation
- ✅ **Security Features**: Reentrancy guards, pause functionality, access controls
- ✅ **Fee Refunds**: Automatic refund of excess ETH sent for price updates

### Backend API Features
- ✅ **Vault Management**: Deploy, deposit, withdraw, set triggers
- ✅ **Price Updates**: On-chain price feed updates via Hermes
- ✅ **Position Monitoring**: Real-time position tracking and trigger checking
- ✅ **Multi-Network Support**: Ethereum mainnet and Sepolia testnet
- ✅ **Enhanced Pyth Integration**: Both off-chain and on-chain price methods

## 📁 Project Structure

```
backend/
├── contracts/                          # Foundry smart contracts
│   ├── src/
│   │   ├── SafeExitVault.sol           # Main vault contract
│   │   └── lib/PythPriceLib.sol        # Price utility library
│   ├── script/Deploy.s.sol             # Deployment script
│   └── foundry.toml                    # Foundry configuration
├── src/
│   ├── controllers/
│   │   ├── pythController.ts           # Enhanced with on-chain endpoints
│   │   └── vaultController.ts          # New vault API endpoints
│   ├── services/
│   │   ├── SafeExitVaultService.ts     # Vault contract interactions
│   │   └── PythService.ts              # Enhanced with on-chain methods
│   ├── types/vault.ts                  # Vault type definitions
│   └── config/index.ts                 # Enhanced with vault config
```

## 🚀 Implementation Details

### 1. Smart Contracts

#### SafeExitVault.sol
The main vault contract implementing Pyth's pull oracle pattern:

```solidity
function updateAndExecute(
    bytes[] calldata priceUpdate,
    uint256 maxStaleSecs,
    uint256 maxConfBps,
    address user
) external payable nonReentrant whenNotPaused {
    // Step 1: Calculate and validate fee
    uint256 fee = pyth.getUpdateFee(priceUpdate);
    require(msg.value >= fee, "Fee");

    // Step 2: Update price feeds on-chain
    pyth.updatePriceFeeds{value: fee}(priceUpdate);

    // Step 3: Get fresh price data
    PythStructs.Price memory p = pyth.getPriceNoOlderThan(feedId, maxStaleSecs);
    
    // Step 4: Validate confidence and execute triggers
    (uint256 price18, uint256 conf18) = PythPriceLib.getValidatedPrice(p, maxConfBps);
    
    // Step 5: Execute position if triggers are met
    // Step 6: Refund excess ETH
}
```

#### PythPriceLib.sol
Utility library for price scaling and validation:

```solidity
function scaleTo1e18(int64 price, uint64 conf, int32 expo) 
    internal pure returns (uint256 price18, uint256 conf18)

function assertFreshAndCertain(
    PythStructs.Price memory p,
    uint256 maxConfBps
) internal pure
```

### 2. Backend Services

#### SafeExitVaultService.ts
Handles all vault contract interactions:

- **Contract Deployment**: Deploy new vault instances
- **Position Management**: Deposit, withdraw, set triggers
- **Price Updates**: Fetch Hermes data and update on-chain
- **Monitoring**: Check trigger conditions and execute positions

#### Enhanced PythService.ts
Extended with on-chain capabilities:

- **On-Chain Price Updates**: `updatePriceFeedsOnChain()`
- **Fee Calculation**: `getUpdateFeeOnChain()`
- **Price Reading**: `getPriceNoOlderThanOnChain()`
- **Confidence Validation**: `validatePriceConfidence()`

### 3. API Endpoints

#### Vault Controller (`/api/vault/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/deploy` | POST | Deploy new vault contract |
| `/deposit` | POST | Deposit ETH to vault |
| `/triggers` | POST | Set stop-loss/take-profit triggers |
| `/execute` | POST | Execute vault triggers (update + check) |
| `/positions/:address` | GET | Get user's vault positions |
| `/withdraw` | POST | Withdraw from vault |
| `/cancel-triggers` | POST | Cancel triggers without withdrawing |
| `/update-fee` | GET | Calculate price update fee |
| `/check-triggers/:address` | GET | Check if triggers should execute |
| `/config` | GET | Get vault configuration |

#### Enhanced Pyth Controller (`/api/pyth/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/update-onchain` | POST | Update price feeds on-chain |
| `/update-fee` | GET | Calculate on-chain update fee |
| `/onchain-price` | GET | Get price from on-chain contract |
| `/confidence` | GET | Validate price confidence |

## 🔧 Configuration

### Environment Variables

```bash
# Vault Configuration
VAULT_DEFAULT_NETWORK=sepolia
VAULT_MONITORING_ENABLED=true
VAULT_MAX_CONFIDENCE_BPS=50
VAULT_MAX_STALENESS_SECONDS=60
VAULT_EXECUTION_BOT_ENABLED=true

# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
VAULT_PRIVATE_KEY=your_private_key_here
```

### Network Configuration

```typescript
export const vaultConfig = {
  networks: {
    sepolia: {
      pythContract: '0xDd24F84d36BF92C65F92307595335bdFab5Bbd21',
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      explorerUrl: 'https://sepolia.etherscan.io',
      chainId: 11155111,
    },
    ethereum: {
      pythContract: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      explorerUrl: 'https://etherscan.io',
      chainId: 1,
    },
  },
  ethFeedId: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  maxConfidenceBps: 50,
  maxStalenessSeconds: 60,
};
```

## 🧪 Usage Examples

### 1. Deploy Vault

```bash
curl -X POST http://localhost:3000/api/vault/deploy \
  -H "Content-Type: application/json" \
  -d '{"network": "sepolia"}'
```

### 2. Deposit ETH

```bash
curl -X POST http://localhost:3000/api/vault/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "amount": "1.0",
    "vaultAddress": "0x...",
    "network": "sepolia"
  }'
```

### 3. Set Triggers

```bash
curl -X POST http://localhost:3000/api/vault/triggers \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "stopLossPrice": "2000",
    "takeProfitPrice": "4000",
    "vaultAddress": "0x..."
  }'
```

### 4. Execute Vault (Update Price + Check Triggers)

```bash
curl -X POST http://localhost:3000/api/vault/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "vaultAddress": "0x...",
    "maxStaleSecs": 60,
    "maxConfBps": 50
  }'
```

### 5. Check Position

```bash
curl "http://localhost:3000/api/vault/positions/0x...?vaultAddress=0x...&network=sepolia"
```

## 🔍 Demo Flow for Judges

### Step 1: Setup
1. Deploy vault contract on Sepolia testnet
2. Fund with test ETH
3. Configure price monitoring

### Step 2: User Journey
1. **Connect Wallet** → **Deposit ETH** → **Set Triggers**
   - Stop-loss: $2000, Take-profit: $4000
2. **Show Real-time Price** with confidence bands
3. **Demonstrate Manual Execution** with Hermes pull

### Step 3: Automated Execution
1. **Bot Monitoring**: Show automated trigger checking
2. **Execute When Conditions Met**: Demonstrate one-click execution
3. **Display Results**: Transaction details, gas costs, execution logs

### Step 4: Analytics
1. **Execution History**: Show all vault executions
2. **Performance Comparison**: Vault vs. holding
3. **Confidence-Based Decisions**: Show how confidence guards work

## 🛡️ Security Features

### Smart Contract Security
- ✅ **Reentrancy Guards**: All state-changing functions protected
- ✅ **Access Controls**: Owner-only administrative functions
- ✅ **Pause Mechanism**: Emergency pause functionality
- ✅ **Price Staleness Checks**: Configurable maximum age
- ✅ **Confidence Thresholds**: Prevent execution during high volatility
- ✅ **Fee Validation**: Ensure sufficient fees for price updates

### Backend Security
- ✅ **Input Validation**: All API endpoints validate inputs
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Rate Limiting**: API rate limiting to prevent abuse
- ✅ **Private Key Management**: Environment-based key storage

## 🚀 Deployment

### Smart Contract Deployment

```bash
# Navigate to contracts directory
cd backend/contracts

# Install dependencies (if using Foundry)
forge install

# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# Deploy to Ethereum Mainnet
forge script script/Deploy.s.sol --rpc-url $ETHEREUM_RPC_URL --broadcast --verify
```

### Backend Deployment

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## 📊 Monitoring & Analytics

### Real-time Monitoring
- Position status tracking
- Price confidence monitoring
- Trigger condition checking
- Gas cost optimization

### Analytics Dashboard
- Total deposits and executions
- Success rates and performance metrics
- User adoption and retention
- Gas efficiency analysis

## 🔮 Future Enhancements

### Advanced Features
- **Multi-Asset Support**: Support for other tokens beyond ETH
- **Complex Strategies**: Trailing stops, DCA strategies
- **Cross-Chain Execution**: Multi-chain vault deployment
- **MEV Protection**: Integration with MEV protection services

### Integration Opportunities
- **DeFi Protocols**: Integration with lending/borrowing protocols
- **Portfolio Management**: Advanced portfolio rebalancing
- **Social Features**: Copy trading and strategy sharing
- **Mobile App**: Native mobile application

## 📝 Testing

### Smart Contract Tests
```bash
cd backend/contracts
forge test
```

### Backend Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

This implementation demonstrates Pyth Network's pull oracle capabilities while solving real DeFi problems through automated risk management without requiring off-chain trust. The confidence-aware execution system showcases sophisticated oracle usage that prevents execution during periods of high uncertainty.
