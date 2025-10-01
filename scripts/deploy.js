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

  // Update the localhost contract address in networks.js
  const networksJsPath = path.join(__dirname, "../www/js/networks.js");
  let networksJsContent = fs.readFileSync(networksJsPath, 'utf8');

  // Find and replace the contractAddress in the localhost section
  // This regex finds: contractAddress: <value>, within the localhost section
  // Using [\s\S] to match across newlines
  const regex = /(localhost:\s*\{[\s\S]*?contractAddress:\s*)(?:'[^']*'|"[^"]*"|null)(\s*,)/;
  const replacement = `$1'${winCoins.address}'$2`;

  if (networksJsContent.match(regex)) {
    networksJsContent = networksJsContent.replace(regex, replacement);
    fs.writeFileSync(networksJsPath, networksJsContent);
    console.log("Contract address injected into networks.js");
  } else {
    console.error("ERROR: Could not find localhost contractAddress in networks.js");
    console.log("Please update networks.js manually with address:", winCoins.address);
  }

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