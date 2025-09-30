# WinCoins - Decentralized Prediction Market

A decentralized prediction solution for managing events with multiple outcomes on the blockchain.

## Overview

The WinCoins contract allows users to:
- Create events with multiple possible outcomes.
- Place predictions on different outcomes.
- Set prediction deadlines for events.
- Resolve events and distribute winnings proportionally to winners.

## Features

- **Event Creation**: Anyone can create an event with multiple outcomes and a prediction deadline.
- **Proportional Prediction Pools**: Users can predict on any outcome, creating separate pools for each.
- **Time-Limited Prediction**: Prediction is only allowed before the specified deadline.
- **Proportional Payouts**: Winners receive payouts proportional to their contribution to the winning pool.
- **Creator Control**: Only event creators can resolve their events.
- **Security**: Built with OpenZeppelin contracts for reentrancy protection.

## Smart Contract Architecture

### Main Contract: `WinCoins.sol`

The contract manages multiple events, each with:
- Unique ID and metadata (name, outcomes).
- Separate prediction pools for each outcome.
- Prediction deadline and resolution status.
- Creator address and winning outcome.

### Key Functions

- `createEvent()`: Create a new prediction event.
- `makePrediction()`: Make a prediction on a specific outcome.
- `resolveEvent()`: Resolve an event (creator only).
- `claimPayout()`: Claim winnings after event resolution.
- `calculatePotentialPayout()`: Preview potential winnings.

## Setup and Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Compile contracts:**
   ```bash
   npm run compile
   ```

3. **Run tests:**
   ```bash
   npm run test
   ```

## Web Frontend

The project includes a complete web frontend located in the `www/` directory with:

### Features
- **User Dashboard**: Browse events, place predictions, track winnings.
- **Admin Panel**: Create events, manage outcomes, resolve events.
- **Web3 Integration**: MetaMask wallet connection and blockchain interaction.
- **Multi-Network Support**: Celo, Celo Alfajores, Moonbeam, Moonbase Alpha, and localhost.
- **Responsive Design**: Works on desktop, tablet, and mobile devices.

### Quick Start - Development Mode

**Option 1: Automated startup (recommended)**
```bash
./_start              # Starts Hardhat node, deploys contract, and serves frontend
```

**Option 2: Manual setup**
1. **Start local blockchain:**
   ```bash
   npm run node          # Terminal 1: Start Hardhat node at localhost:8545
   ```

2. **Deploy contract:**
   ```bash
   npm run deploy:localhost  # Terminal 2: Deploy contract (address saved to .contract-address)
   ```

3. **Start development server:**
   ```bash
   npm run serve         # Serves frontend at http://localhost:8090 (binds to 0.0.0.0)
   ```

**Option 3: All-in-one development mode**
```bash
npm run dev          # Runs Hardhat node + web server concurrently
```

### Production Mode

To run the web server in production mode (binds to localhost only):

```bash
npm start            # or npm run serve:prod
```

### Connecting to the Frontend

1. Open http://localhost:8090 in your browser.
2. Connect MetaMask wallet.
3. Select network from the network selector:
   - For localhost: Contract address will be requested (auto-saved in `.contract-address`).
   - For other networks: Default contract address `0x1120396991A9eB527a886D4025F6E7A82471F537`.
4. Start creating events or placing predictions!

### Network Configuration

Supported networks are configured in `www/js/networks.js`:
- **Celo Mainnet**: Default contract pre-configured.
- **Celo Alfajores** (testnet): Default contract pre-configured.
- **Moonbeam Mainnet**: Default contract pre-configured.
- **Moonbase Alpha** (testnet): Default contract pre-configured.
- **Hardhat Local**: Contract address set during deployment.

### Clean URLs

The web server supports clean URLs - both `/about` and `/about.html` will work.

## Testing

The project includes comprehensive tests covering:
- Event creation with validation.
- Prediction mechanics and edge cases.
- Event resolution and access controls.
- Payout distribution and proportional calculations.
- Security and reentrancy protection.

Run tests with:
```bash
npm run test
```

## Deployment

### Local Development

1. **Start local Hardhat node:**
   ```bash
   npm run node
   ```

2. **Deploy to local network:**
   ```bash
   npm run deploy:localhost
   ```

   The contract address will be automatically saved to `.contract-address` file in the project root.

### Mainnet/Testnet Deployment

1. **Configure your network in `hardhat.config.js`**

2. **Deploy:**
   ```bash
   npm run deploy -- --network <network-name>
   ```

   The contract address will be automatically saved to `.contract-address` file.

### Contract Address Management

After deployment, the contract address is:
- Saved to `.contract-address` file (gitignored).
- Automatically loaded by the frontend for localhost network.
- Can be manually set via the UI modal when switching to localhost network.

## Usage Example

```javascript
// Create an event.
const outcomes = ["Team A wins", "Team B wins", "Draw"];
const predictionDuration = 3600; // 1 hour.
await winCoins.createEvent("Football Match", outcomes, predictionDuration);

// Place predictions.
await winCoins.makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });

// Resolve event (creator only, after deadline).
await winCoins.resolveEvent(eventId, 0); // Team A wins.

// Claim payout (winners only).
await winCoins.claimPayout(eventId);
```

## Interaction Script

Use the included interaction script to test contract functionality:

```bash
CONTRACT_ADDRESS=0x... npm run interact
```

## Security Considerations

- **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard.
- **Access Control**: Event resolution restricted to creators.
- **Input Validation**: Comprehensive validation of all inputs.
- **Time Constraints**: Prediction deadlines enforced on-chain.
- **Double Claiming Prevention**: Users cannot claim payouts twice.

## Gas Optimization

- Efficient storage patterns for events and predictions.
- Minimal external calls during critical operations.
- Batch operations where possible.

## Events

The contract emits the following events:
- `EventCreated`: When a new event is created.
- `PredictionPlaced`: When a user places a prediction.
- `EventResolved`: When an event is resolved.
- `PayoutClaimed`: When a user claims their payout.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Add tests for new functionality.
4. Ensure all tests pass.
5. Submit a pull request.

## Known Limitations

- No automatic oracle integration.
- Events must be resolved manually by creators.
- Minimum prediction amount not enforced (could lead to dust).

## Future Enhancements

- Oracle integration for automatic event resolution.
- Minimum prediction amounts.
- Multi-token support.