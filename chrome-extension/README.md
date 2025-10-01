# WinCoins Chrome Extension

Real-time betting extension for live streams. Shows betting widgets when new WinCoins markets are created.

## Features
- 🎯 Real-time market notifications
- ⏱️ Live countdown timers
- 💰 Quick bet presets (0.01, 0.05, 0.1 ETH)
- 📊 Live pool percentages
- 🔗 MetaMask integration
- 🎨 Twitch-themed UI
- 🤖 AI Oracle integration for automated event resolution

## Installation (Development)

1. **Clone and prepare:**
   ```bash
   cd chrome-extension
   ```

2. **Load extension in Chrome:**
   - Open Chrome → Extensions → Developer mode ON
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Configure contract:**
   - Start your WinCoins local deployment (`npm run dev` in main project)
   - Extension will auto-connect to localhost:8545

## Usage

1. **Go to any Twitch stream**
2. **Create a market** (via main WinCoins website)
3. **Extension shows betting widget** with countdown timer
4. **Select outcome + amount → Place bet**
5. **Widget auto-hides** after betting or timeout

## Technical Architecture

- **Service Worker**: Listens to blockchain events via WebSocket
- **Content Script**: Injects betting widget on Twitch
- **Real-time Updates**: Live pool percentages via `PredictionPlaced` events
- **Web3 Integration**: Direct MetaMask transactions

## Files Structure
```
chrome-extension/
├── manifest.json          # Extension config
├── background.js          # Blockchain event listener
├── content.js            # Twitch page injection
├── widget.css            # Twitch-themed styling
├── popup/                # Settings popup
└── assets/               # Icons
```

## Configuration

The extension now supports configurable contract addresses:

1. **Via Extension Popup**: 
   - Click the extension icon in your browser
   - Paste your contract address in the "Contract Address" field
   - Click "Save Contract Address"
   - The extension will automatically reconnect to the new contract

2. **Default Fallback**: 
   - First-time users get the default address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - RPC URL: `ws://localhost:8545` (Hardhat WebSocket endpoint)

## Development Notes

- Uses ethers.js v5.7.2 via CDN
- Pure Web3 solution (no backend required)
- Service worker keeps alive with periodic alarms
- Supports multiple Twitch tabs simultaneously