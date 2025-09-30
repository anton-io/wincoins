const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const recipientAddress = "0x773c1A59aE833eE7E36AF983379EA0a93a6f4C71";
  const amount = ethers.utils.parseEther("10"); // 10 ETH
  
  console.log("Funding wallet from:", deployer.address);
  console.log("Recipient:", recipientAddress);
  console.log("Amount:", ethers.utils.formatEther(amount), "ETH");
  
  // Check deployer balance
  const deployerBalance = await deployer.getBalance();
  console.log("Deployer balance:", ethers.utils.formatEther(deployerBalance), "ETH");
  
  // Send ETH
  const tx = await deployer.sendTransaction({
    to: recipientAddress,
    value: amount
  });
  
  await tx.wait();
  console.log("✅ Transaction hash:", tx.hash);
  
  // Check recipient balance
  const recipientBalance = await ethers.provider.getBalance(recipientAddress);
  console.log("✅ Recipient new balance:", ethers.utils.formatEther(recipientBalance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });