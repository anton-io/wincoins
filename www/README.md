# WinCoins Web Frontend

A modern, responsive web interface for the WinCoins decentralized prediction platform.

## Features

### 🎯 User Dashboard
- **Browse Events**: View all available prediction events with real-time data.
- **Make Predictions**: Predict event outcomes.
- **Track Predictions**: Monitor your active predictions and claim winnings.
- **Live Updates**: Real-time pool amounts and event status.

### ⚙️ Admin Panel
- **Create Events**: Set up new prediction events with multiple outcomes.
- **Event Management**: View and manage your created events.
- **Resolve Events**: Determine winning outcomes after events conclude.
- **Analytics**: Track total pools and participant data.

### 🔗 Web3 Integration
- **MetaMask Support**: Connect using MetaMask or compatible wallets.
- **Real-time Balance**: Live balance updates.
- **Transaction Handling**: Smooth blockchain interaction with user feedback.
- **Network Detection**: Automatic network and account change handling.

## Setup Instructions

### Prerequisites
- Modern web browser with MetaMask extension.
- WinCoins smart contract deployed on blockchain.
- Local web server (for development).

### Local Development

1. **Simple HTTP Server** (Python):
   ```bash
   cd www
   python3 -m http.server 8090
   ```

2. **Node.js HTTP Server**:
   ```bash
   cd www
   npx http-server -p 8090
   ```

3. **PHP Development Server**:
   ```bash
   cd www
   php -S localhost:8090
   ```

### Accessing the Application
1. Open `http://localhost:8090` in your browser.
2. Connect your MetaMask wallet.
3. Enter your deployed WinCoins contract address when prompted.
4. Start creating events or making predictions!

## File Structure

```
www/
├── index.html          # Main application HTML
├── css/
│   └── style.css       # Complete styling and responsive design
├── js/
│   ├── contract.js     # Smart contract interaction logic
│   └── app.js          # Main application logic and UI management
└── assets/             # Images and other static assets
```

## Configuration

### Contract Address
The application will prompt for the contract address on first use. You can also:
- Set it in localStorage: `wincoins_contract_address`.
- Modify the default in `js/contract.js`.

### Network Configuration
The application works with any Ethereum-compatible network. Ensure your MetaMask is connected to the same network where the contract is deployed.

## Usage Guide

### For Users
1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection.
2. **Browse Events**: View available events in the User Dashboard.
3. **Make Predictions**: Click on events to see details and prediction options.
4. **Monitor Predictions**: Check "My Predictions" section for your active predictions.
5. **Claim Winnings**: Click "Claim Payout" for winning predictions after resolution.

### For Admins/Event Creators
1. **Switch to Admin Panel**: Click the "Admin Panel" tab.
2. **Create Events**: Fill out the event creation form with:
   - Event name (e.g., "Manchester vs Liverpool").
   - Outcomes (one per line, e.g., "Team A wins", "Team B wins", "Draw").
   - Prediction duration in hours.
3. **Manage Events**: View your created events in the admin section.
4. **Resolve Events**: After prediction deadline passes, select winning outcome and resolve.

## Features in Detail

### Event States
- **Open**: Users can make predictions (before deadline).
- **Predictions Closed**: Deadline passed, waiting for resolution.
- **Resolved**: Winner determined, payouts available.

### Prediction Mechanics
- Minimum prediction: 0.01
- Multiple predictions per user per outcome allowed.
- Proportional payout system based on pool contribution.

### Security Features
- Client-side validation.
- Transaction confirmation prompts.
- Error handling and user feedback.
- Wallet connection status monitoring.

## Responsive Design
- **Desktop**: Full-featured interface with grid layouts.
- **Tablet**: Optimized for touch interaction.
- **Mobile**: Stack layout with touch-friendly buttons.

## Browser Compatibility
- Chrome/Chromium (recommended).
- Firefox.
- Safari.
- Edge.
- Any browser with MetaMask support.

## Troubleshooting

### Common Issues
1. **"Failed to initialize contract"**
   - Check contract address is correct.
   - Ensure you're on the right network.
   - Verify contract is deployed.

2. **Transaction Failures**
   - Check gas fees and wallet balance.
   - Ensure prediction deadline hasn't passed.
   - Verify you're the event creator (for admin actions).

3. **MetaMask Connection Issues**
   - Refresh page and reconnect.
   - Check MetaMask is unlocked.
   - Verify network selection.

### Gas Optimization
- Event creation: ~200,000 gas.
- Making predictions: ~100,000 gas.
- Resolving events: ~150,000 gas.
- Claiming payouts: ~100,000 gas.

## Development Notes

### Adding New Features
1. Update contract interaction in `js/contract.js`.
2. Add UI components in `index.html`.
3. Implement logic in `js/app.js`.
4. Style with `css/style.css`.

### Code Structure
- **Modular Design**: Separate contract logic from UI.
- **Event-Driven**: Uses event listeners for user interactions.
- **Async/Await**: Modern JavaScript for blockchain calls.
- **Responsive CSS**: Mobile-first design approach.

## Security Considerations
- Never store private keys in frontend code.
- Always validate user inputs.
- Use HTTPS in production.
- Keep dependencies updated.
- Verify all transactions before signing.