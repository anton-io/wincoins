const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config({ path: "./oracle/.env" });

async function main() {
    console.log("🔮 Registering Oracle...\n");
    
    // Read contract address from file or env
    const contractAddress = process.env.CONTRACT_ADDRESS || 
        fs.readFileSync(".contract-address", "utf8").trim();
    
    // Get oracle config from env or use defaults
    const oracleAddress = process.env.ORACLE_ADDRESS || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Hardhat account #2
    const oracleName = process.env.ORACLE_NAME || "default-oracle";
    
    // Get contract owner (account 0)
    const [owner] = await ethers.getSigners();
    console.log(`👑 Owner: ${owner.address}`);
    console.log(`🔮 Oracle: ${oracleAddress}`);
    console.log(`📝 Contract: ${contractAddress}\n`);
    
    // Connect to contract
    const contract = await ethers.getContractAt("WinCoins", contractAddress);
    
    // Check if oracle is already registered
    const isAuthorized = await contract.isAuthorizedOracle(oracleAddress);
    if (isAuthorized) {
        console.log("✅ Oracle is already registered!");
        return;
    }
    
    // Register oracle
    console.log("📝 Registering oracle...");
    const tx = await contract.registerOracle(oracleName, oracleAddress);
    console.log(`📤 Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Oracle registered in block ${receipt.blockNumber}`);
    
    // Verify registration
    const isNowAuthorized = await contract.isAuthorizedOracle(oracleAddress);
    console.log(`🔍 Verification: ${isNowAuthorized ? "SUCCESS" : "FAILED"}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    });