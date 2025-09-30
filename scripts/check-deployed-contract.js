const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 Checking Deployed Contract\n');
    
    const contractAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    
    // Check if there's code at the address
    const code = await provider.getCode(contractAddress);
    console.log(`📝 Contract Address: ${contractAddress}`);
    console.log(`🔗 Has Code: ${code !== '0x' ? 'YES' : 'NO'}`);
    
    if (code !== '0x') {
        try {
            // Try to connect to the WinCoins contract
            const WinCoins = await ethers.getContractFactory('WinCoins');
            const contract = WinCoins.attach(contractAddress);
            
            // Test basic contract functions
            const nextEventId = await contract.nextEventId();
            const owner = await contract.owner();
            
            console.log(`👑 Contract Owner: ${owner}`);
            console.log(`🆔 Next Event ID: ${nextEventId.toString()}`);
            
            // Check if any oracles are registered
            console.log('\n🔮 Oracle Status:');
            const accounts = await ethers.getSigners();
            for (let i = 0; i < 3; i++) {
                const isAuthorized = await contract.isAuthorizedOracle(accounts[i].address);
                console.log(`   Account ${i} (${accounts[i].address}): ${isAuthorized ? 'AUTHORIZED' : 'Not authorized'}`);
            }
            
            // Check if there are any events
            if (nextEventId.gt(0)) {
                console.log('\n📅 Events:');
                for (let i = 0; i < nextEventId.toNumber(); i++) {
                    const eventDetails = await contract.getEventDetails(i);
                    console.log(`   Event ${i}: ${eventDetails.name}`);
                    console.log(`     Oracle: ${eventDetails.oracle}`);
                    console.log(`     Resolved: ${eventDetails.isResolved}`);
                    console.log(`     Total Pool: ${ethers.utils.formatEther(eventDetails.totalPoolAmount)} ETH`);
                }
            }
            
            console.log('\n✅ WinCoins contract is deployed and working!');
            
        } catch (error) {
            console.log('❌ Could not interact with WinCoins contract:', error.message);
            console.log('💡 This might not be a WinCoins contract or ABI mismatch');
        }
    } else {
        console.log('❌ No contract deployed at this address');
    }
    
    // Check your address balance
    const yourAddress = '0x773c1A59aE833eE7E36AF983379EA0a93a6f4C71';
    const balance = await provider.getBalance(yourAddress);
    console.log(`\n💰 Your Address Balance: ${ethers.utils.formatEther(balance)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });