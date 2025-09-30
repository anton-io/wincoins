# WinCoins - Decentralized Prediction Market

A decentralized prediction solution for managing events with multiple outcomes on the blockchain.

## Overview

The WinCoins contract allows users to:
- Create events with multiple possible outcomes
- Place predictions on different outcomes
- Set prediction deadlines for events
- Resolve events and distribute winnings proportionally to winners

## Features

- **Event Creation**: Anyone can create an event with multiple outcomes and a prediction deadline
- **Proportional Prediction Pools**: Users can bet on any outcome, creating separate pools for each
- **Time-Limited Prediction**: Prediction is only allowed before the specified deadline
- **Proportional Payouts**: Winners receive payouts proportional to their contribution to the winning pool
- **Creator Control**: Only event creators can resolve their events
- **Security**: Built with OpenZeppelin contracts for reentrancy protection

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
- **User Dashboard**: Browse events, place bets, track winnings
- **Admin Panel**: Create events, manage outcomes, resolve events
- **Web3 Integration**: MetaMask wallet connection and blockchain interaction
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Quick Start
1. **Deploy contract to local network:**
   ```bash
   npm run node          # Terminal 1: Start local blockchain
   npm run deploy:localhost  # Terminal 2: Deploy contract
   ```

2. **Start web server:**
   ```bash
   npm run serve         # Serves frontend at http://localhost:8090
   ```

3. **Or run everything together:**
   ```bash
   npm run dev          # Runs blockchain + web server concurrently
   ```

4. **Connect and use:**
   - Open http://localhost:8090 in your browser
   - Connect MetaMask wallet
   - Enter deployed contract address
   - Start creating events or placing bets!

## Testing

The project includes comprehensive tests covering:
- Event creation with validation
- Prediction mechanics and edge cases
- Event resolution and access controls
- Payout distribution and proportional calculations
- Security and reentrancy protection

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

### Mainnet/Testnet Deployment

1. **Configure your network in `hardhat.config.js`**

2. **Deploy:**
   ```bash
   npm run deploy -- --network <network-name>
   ```

## Usage Example

```javascript
// Create an event
const outcomes = ["Team A wins", "Team B wins", "Draw"];
const predictionDuration = 3600; // 1 hour
await winCoins.createEvent("Football Match", outcomes, predictionDuration);

// Place bets
await winCoins.placeBet(eventId, 0, { value: ethers.utils.parseEther("1.0") });

// Resolve event (creator only, after deadline)
await winCoins.resolveEvent(eventId, 0); // Team A wins

// Claim payout (winners only)
await winCoins.claimPayout(eventId);
```

## Interaction Script

Use the included interaction script to test contract functionality:

```bash
CONTRACT_ADDRESS=0x... npm run interact
```

## Security Considerations

- **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
- **Access Control**: Event resolution restricted to creators
- **Input Validation**: Comprehensive validation of all inputs
- **Time Constraints**: Prediction deadlines enforced on-chain
- **Double Claiming Prevention**: Users cannot claim payouts twice

## Gas Optimization

- Efficient storage patterns for events and bets
- Minimal external calls during critical operations
- Batch operations where possible

## Events

The contract emits the following events:
- `EventCreated`: When a new event is created
- `BetPlaced`: When a user places a bet
- `EventResolved`: When an event is resolved
- `PayoutClaimed`: When a user claims their payout

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Known Limitations

- Events must be resolved manually by creators
- No automatic oracle integration
- Minimum bet amount not enforced (could lead to dust)
- No maximum number of outcomes per event

## Future Enhancements

- Oracle integration for automatic event resolution
- Minimum bet amounts
- Event cancellation mechanism
- Multi-token support beyond ETH
- Time-weighted prediction multipliers