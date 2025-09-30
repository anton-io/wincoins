const { ethers } = require("hardhat");

async function main() {
    const address = "0x773c1A59aE833eE7E36AF983379EA0a93a6f4C71";
    const balance = await ethers.provider.getBalance(address);
    console.log(`💰 Address: ${address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
}

main().catch(console.error);