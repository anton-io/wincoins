// Minimal debug script to isolate the ethers issue
console.log("Starting debug...");

try {
  console.log("1. Loading ethers...");
  const { ethers } = require("ethers");
  console.log("✅ Ethers loaded successfully");
  
  console.log("2. Loading dotenv...");
  require("dotenv").config();
  console.log("✅ Dotenv loaded successfully");
  
  console.log("3. Creating provider...");
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");
  console.log("✅ Provider created successfully");
  
  console.log("4. Creating wallet...");
  const wallet = new ethers.Wallet(
    process.env.ORACLE_PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    provider
  );
  console.log("✅ Wallet created successfully");
  
  console.log("5. Testing basic operations...");
  console.log("Wallet address:", wallet.address);
  
  console.log("6. Loading contract ABI...");
  const fs = require("fs");
  const contractABI = JSON.parse(fs.readFileSync("./WinCoins.json", "utf8")).abi;
  console.log("✅ ABI loaded successfully");
  
  console.log("7. Creating contract instance...");
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    contractABI,
    wallet
  );
  console.log("✅ Contract created successfully");
  
  console.log("8. Testing contract call...");
  contract.nextEventId().then(result => {
    console.log("✅ Contract call successful, nextEventId:", result.toString());
  }).catch(error => {
    console.error("❌ Contract call failed:", error.message);
  });
  
} catch (error) {
  console.error("❌ Error at step:", error.message);
  console.error("Stack trace:", error.stack);
}