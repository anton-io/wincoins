# 🧪 WinCoins Testing Guide

Complete guide to test the WinCoins web interface with local blockchain backend.

## 🚀 Current Setup (Ready to Test!)

### ✅ Services Running:
- **Blockchain Node**: `http://localhost:8545`
- **Web Frontend**: `http://localhost:8090`
- **Smart Contract**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

## 📱 MetaMask Setup

### 1. Install MetaMask
- Download from [metamask.io](https://metamask.io/)
- Create account or import existing wallet

### 2. Add Local Network
1. Open MetaMask
2. Click network dropdown (usually "Ethereum Mainnet")
3. Click "Add Network" → "Add Network Manually"
4. Enter these details:
   ```
   Network Name: Hardhat Local
   New RPC URL: http://localhost:8545
   Chain ID: 1337
   Currency Symbol: ETH
   ```
5. Click "Save"

### 3. Import Test Account
Use one of these pre-funded test accounts:
```
Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance: ~10,000 ETH
```

**Import Steps:**
1. MetaMask → Account menu → "Import Account"
2. Paste private key above
3. Account will appear with ~10,000 ETH

## 🎮 Testing the Web Interface

### Step 1: Connect to DApp
1. Open `http://localhost:8090` in browser
2. Click "Connect Wallet"
3. Approve MetaMask connection
4. Enter contract address: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

### Step 2: Test Admin Functions
1. Click "Admin Panel" tab
2. Create a test event:
   ```
   Event Name: Test Football Match
   Outcomes:
   Team A wins
   Team B wins
   Draw
   Prediction Duration: 1 hour
   ```
3. Click "Create Event" → Confirm MetaMask transaction
4. Wait for confirmation (should be instant on local network)

### Step 3: Test User Functions
1. Click "User Dashboard" tab
2. You should see your created event
3. Click on the event to open prediction modal
4. Place a test prediction:
   - Select outcome (e.g., "Team A wins")
   - Enter amount (e.g., 0.1 ETH)
   - Click "Predict" → Confirm transaction

### Step 4: Test Event Resolution
1. Wait for prediction deadline to pass (or advance time)
2. Go back to "Admin Panel"
3. Find your event → Select winning outcome
4. Click "Resolve Event" → Confirm transaction

### Step 5: Test Payout Claims
1. Go to "User Dashboard"
2. Check "My Predictions" section
3. If you predicted a winning outcome, click "Claim Payout"
4. Confirm transaction → Receive winnings!

## 🔧 Advanced Testing

### Multiple Users
To test with multiple users:
1. Import additional test accounts:
   ```
   Account 2: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

   Account 3: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
   Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   ```
2. Switch between accounts in MetaMask
3. Test different users predictions on different outcomes

### Time Manipulation
To test time-based features:
```bash
# In separate terminal, advance blockchain time
npx hardhat console --network localhost

# Then run:
await network.provider.send("evm_increaseTime", [3600]); // 1 hour
await network.provider.send("evm_mine");
```

## 🐛 Troubleshooting

### MetaMask Issues
- **"Nonce too high"**: Reset account in MetaMask settings
- **"Gas estimation failed"**: Check contract address is correct
- **"Wrong network"**: Ensure you're on "Hardhat Local" network

### Frontend Issues
- **"Ethers not defined"**: Check internet connection, refresh page
- **"Contract not found"**: Verify contract address in prompt
- **"No events loading"**: Check browser console for errors

### Blockchain Issues
- **Node not responding**: Restart with `npm run node`
- **Contract not deployed**: Run `npm run deploy:localhost`
- **Out of gas**: Use higher gas limit in MetaMask

## 📊 Expected Gas Costs
- Create Event: ~200,000 gas
- Place Prediction: ~100,000 gas
- Resolve Event: ~150,000 gas
- Claim Payout: ~100,000 gas

## 🎯 Test Scenarios

### Scenario 1: Simple Prediction
1. Admin creates "Coin Flip" event (Heads/Tails, 30 min)
2. User A predicts 1 ETH on Heads
3. User B predicts 2 ETH on Tails
4. Admin resolves with "Heads" winning
5. User A claims 3 ETH payout

### Scenario 2: Multiple Outcomes
1. Create "Dice Roll" (1,2,3,4,5,6 outcomes)
2. Multiple users predict on different numbers
3. Resolve with winning number
4. Only winners can claim proportional payouts

### Scenario 3: No Winners
1. Create event with 3 outcomes
2. Users predict only on outcomes 1 and 2
3. Resolve with outcome 3 winning
4. No payouts available (edge case testing)

## 📝 Manual Test Checklist

- [ ] MetaMask connects successfully
- [ ] Contract address accepted
- [ ] Event creation works
- [ ] Event appears in dashboard
- [ ] Predicting interface functions
- [ ] Transaction confirmations work
- [ ] Pool amounts update correctly
- [ ] Event resolution works
- [ ] Payout calculations correct
- [ ] Claim payout functions
- [ ] Error handling works
- [ ] Mobile responsiveness
- [ ] Multiple user testing

## 🔄 Restart Everything
If you need to restart the testing environment:
```bash
# Kill all processes
pkill -f "hardhat node"
pkill -f "node www/serve.js"

# Restart blockchain and redeploy
npm run node &
sleep 3
npm run deploy:localhost

# Restart web server
npm run serve &
```

---

**🎉 You're now ready to test the complete WinCoins platform!**

Open `http://localhost:8090` and start testing with the contract address:
`0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`