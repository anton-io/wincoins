const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying WinCoins contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const WinCoins = await ethers.getContractFactory("WinCoins");
  const winCoins = await WinCoins.deploy();

  await winCoins.deployed();

  console.log("WinCoins deployed to:", winCoins.address);
  console.log("Transaction hash:", winCoins.deployTransaction.hash);

  // Wait for deployment to be mined
  console.log("Waiting for deployment to be mined...");
  await winCoins.deployTransaction.wait();
  console.log("Contract deployment confirmed!");

  // Write contract address to .contract-address file
  const contractAddressPath = path.join(__dirname, "../.contract-address");
  fs.writeFileSync(contractAddressPath, winCoins.address);
  console.log("Contract address saved to .contract-address");

  return winCoins.address;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;