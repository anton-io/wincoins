# WinCoins Oracle Service

A Node.js service that automatically resolves prediction market events on the WinCoins smart contract.

## Features

- 🔄 **Automated Polling**: Checks for unresolved events every 30 seconds
- 🎯 **Smart Resolution**: Only resolves events assigned to this oracle after deadline
- 🌐 **Multi-Network**: Works with any EVM-compatible network
- 🔐 **Secure**: Uses private key authentication for transaction signing

## Quick Local Setup & Demo

### 1. Start Hardhat Local Network

```bash
# In the main project directory
npx hardhat node
```

This starts a local Ethereum network at `http://localhost:8545` with pre-funded accounts.

### 2. Deploy Contract & Setup Demo (Optional)

```bash
# Run the demo setup script
npx hardhat run scripts/setup-oracle-demo.js

# This will:
# - Deploy the WinCoins contract
# - Register an oracle
# - Create 3 demo events with different deadlines
# - Place sample bets
# - Create oracle/.env configuration automatically
```

### 3. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Deploy contract
npx hardhat run scripts/deploy.js

# Install oracle dependencies
cd oracle
npm install

# Configure environment
cp .env.example .env
# Edit .env with your local configuration
```

Example `.env` for local development:
```env
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ORACLE_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
POLL_INTERVAL=5000
ORACLE_NAME=local-oracle
```

### 4. Register Oracle (If Not Using Demo Script)

```bash
# In Hardhat console or scripts
npx hardhat console
> const contract = await ethers.getContractAt("WinCoins", "CONTRACT_ADDRESS");
> await contract.registerOracle("local-oracle", "ORACLE_ADDRESS");
```

### 5. Run Oracle Service

```bash
cd oracle
npm start
```

You'll see output like:
```
🔮 WinCoins Oracle Service Started
📡 RPC URL: http://localhost:8545
📝 Contract: 0x5FbDB2...
⏰ Poll Interval: 5000ms
🏷️  Oracle Name: local-oracle
✅ Oracle 0x70997... is authorized
🌐 Connected to network: unknown (chainId: 31337)
🚀 Starting oracle polling every 5000ms
🔍 Polling for unresolved events...
```

### 6. Create Test Events

Create events for the oracle to resolve:

```bash
# In another terminal, use Hardhat console
npx hardhat console
> const [owner, addr1, oracle] = await ethers.getSigners();
> const contract = await ethers.getContractAt("WinCoins", "CONTRACT_ADDRESS");
> 
> // Create event that expires in 10 seconds
> await contract.createEvent("Test Match", ["Team A", "Team B"], 10, oracle.address);
> 
> // Place a bet
> await contract.connect(addr1).makePrediction(0, 0, {value: ethers.utils.parseEther("1.0")});
```

### 7. Watch Automatic Resolution

The oracle will:
- Poll every 5 seconds
- Detect the event after 10 seconds when deadline passes
- Automatically resolve it
- Log the entire process

Expected output:
```
🔍 Polling for unresolved events...
📋 Found 1 events to resolve
🎯 Resolving event 0: "Test Match"
📊 Outcomes: Team A, Team B
🎲 Demo resolution: randomly selected outcome 0
🏆 Selected outcome 0: "Team A"
⛽ Estimated gas: 167,234
📤 Transaction sent: 0x1234...
✅ Event 0 resolved in block 15
```

## Development Commands

```bash
# Start with auto-restart on changes
npm run dev

# Start production service
npm start

# Test integration
node test-integration.js
```

## Configuration

Create a `.env` file with these variables:

```env
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...
POLL_INTERVAL=30000
ORACLE_NAME=my-oracle
```

### Environment Variables

- `RPC_URL`: Ethereum RPC endpoint (Hardhat local, Infura, Alchemy, etc.)
- `CONTRACT_ADDRESS`: Deployed WinCoins contract address
- `ORACLE_PRIVATE_KEY`: Private key of the oracle wallet (must be registered)
- `POLL_INTERVAL`: Polling interval in milliseconds (default: 30000)
- `ORACLE_NAME`: Name used when registering the oracle


## How It Works

1. **Initialization**: Checks if oracle address is authorized on the contract
2. **Polling**: Every 30 seconds, scans all events in the contract
3. **Filtering**: Identifies events where:
   - Oracle is assigned to this service
   - Event is not resolved or cancelled
   - Prediction deadline has passed
4. **Resolution**: Calls contract's `resolveEvent()` with the determined outcome
5. **Logging**: Comprehensive logs for monitoring and debugging

## Resolution Logic

Currently implements simple random resolution for demonstration. In production, extend `getResolutionLogic()` to:

- **API Integration**: Fetch results from external data sources
- **Machine Learning**: Use AI models for prediction outcomes
- **Multi-Source Verification**: Cross-reference multiple data sources
- **Manual Review**: Queue complex events for human review

Example extensions:

```javascript
getResolutionLogic(eventData) {
    if (eventData.name.includes('Chess')) {
        return this.resolveChessMatch(eventData);
    } else if (eventData.name.includes('Weather')) {
        return this.resolveWeatherEvent(eventData);
    }
    // Default random resolution
    return Math.floor(Math.random() * eventData.outcomes.length);
}
```

## Monitoring

The service logs all activities with emojis for easy scanning:

- 🔮 Service startup
- 🔍 Polling activity
- 🎯 Event resolution
- ✅ Success operations
- ❌ Error conditions
- ⛽ Gas usage information

## Security Considerations

- **Private Key**: Store securely, use AWS Secrets Manager in production
- **Gas Management**: Service estimates gas and adds 20% buffer
- **Error Handling**: Continues operation even if individual events fail
- **Rate Limiting**: Adds delays between transactions to avoid nonce conflicts

## Development

```bash
# Watch for changes
npm run dev
```

## Production Checklist

- [ ] Oracle registered on contract
- [ ] Environment variables configured
- [ ] Private key stored securely
- [ ] Gas price monitoring setup
- [ ] Error alerting configured
- [ ] Performance monitoring enabled
- [ ] Backup oracle service (optional)