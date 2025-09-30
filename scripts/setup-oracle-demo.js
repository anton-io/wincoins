const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🚀 Setting up Oracle Demo Environment\n');
    
    // Get signers
    const [owner, addr1, oracle] = await ethers.getSigners();
    
    console.log('📋 Accounts:');
    console.log(`👤 Owner: ${owner.address}`);
    console.log(`👤 User: ${addr1.address}`);
    console.log(`🔮 Oracle: ${oracle.address}\n`);
    
    // Deploy contract
    console.log('📝 Deploying WinCoins contract...');
    const WinCoins = await ethers.getContractFactory('WinCoins');
    const contract = await WinCoins.deploy();
    await contract.deployed();
    
    console.log(`✅ Contract deployed to: ${contract.address}\n`);
    
    // Register oracle
    console.log('🔮 Registering oracle...');
    await contract.registerOracle('demo-oracle', oracle.address);
    console.log('✅ Oracle registered\n');
    
    // Create demo events
    console.log('📅 Creating demo events...');
    
    // Event 1: Quick resolution (10 seconds)
    const outcomes1 = ['Bulls Win', 'Bears Win', 'Tie'];
    await contract.createEvent('Demo Basketball Game', outcomes1, 10, oracle.address);
    console.log('✅ Created Event 0: Basketball (10s deadline)');
    
    // Event 2: Medium resolution (30 seconds)  
    const outcomes2 = ['Sunny', 'Rainy', 'Cloudy'];
    await contract.createEvent('Weather Prediction', outcomes2, 30, oracle.address);
    console.log('✅ Created Event 1: Weather (30s deadline)');
    
    // Event 3: Longer resolution (60 seconds)
    const outcomes3 = ['Red', 'Black', 'Green'];
    await contract.createEvent('Roulette Spin', outcomes3, 60, oracle.address);
    console.log('✅ Created Event 2: Roulette (60s deadline)\n');
    
    // Place some demo bets
    console.log('💰 Placing demo bets...');
    await contract.connect(addr1).makePrediction(0, 0, { value: ethers.utils.parseEther('1.0') });
    await contract.connect(addr1).makePrediction(1, 1, { value: ethers.utils.parseEther('0.5') });
    await contract.connect(addr1).makePrediction(2, 2, { value: ethers.utils.parseEther('2.0') });
    console.log('✅ Demo bets placed\n');
    
    // Create oracle .env file
    const envContent = `# Oracle Service Configuration
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=${contract.address}
ORACLE_PRIVATE_KEY=${oracle.privateKey}
POLL_INTERVAL=5000
ORACLE_NAME=demo-oracle`;
    
    const envPath = path.join(__dirname, '../oracle/.env');
    fs.writeFileSync(envPath, envContent);
    console.log('⚙️  Created oracle/.env configuration\n');
    
    // Show instructions
    console.log('🎯 Demo Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start Hardhat node: npx hardhat node');
    console.log('2. Open new terminal and run: cd oracle && npm start');
    console.log('3. Watch the oracle automatically resolve events!\n');
    
    console.log('📊 Event Timeline:');
    console.log('⏰ 10s: Basketball game resolves');
    console.log('⏰ 30s: Weather prediction resolves');
    console.log('⏰ 60s: Roulette spin resolves\n');
    
    console.log('🔍 Monitor logs to see:');
    console.log('- Oracle polling every 5 seconds');
    console.log('- Automatic event resolution');
    console.log('- Gas estimation and transaction details');
    console.log('- Winner payouts\n');
    
    return {
        contractAddress: contract.address,
        oracleAddress: oracle.address,
        events: [
            { id: 0, name: 'Demo Basketball Game', deadline: '10s' },
            { id: 1, name: 'Weather Prediction', deadline: '30s' },
            { id: 2, name: 'Roulette Spin', deadline: '60s' }
        ]
    };
}

main()
    .then((result) => {
        console.log('🎉 Setup completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });