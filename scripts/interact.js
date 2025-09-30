const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const contractAddress = process.env.CONTRACT_ADDRESS || "YOUR_CONTRACT_ADDRESS_HERE";

  if (contractAddress === "YOUR_CONTRACT_ADDRESS_HERE") {
    console.log("Please set CONTRACT_ADDRESS environment variable or update the script with your deployed contract address");
    return;
  }

  const WinCoins = await ethers.getContractFactory("WinCoins");
  const winCoins = WinCoins.attach(contractAddress);

  const [owner, addr1, addr2] = await ethers.getSigners();

  console.log("Interacting with WinCoins at:", contractAddress);
  console.log("Owner address:", owner.address);

  try {
    // Create an event
    console.log("\n1. Creating an event...");
    const outcomes = ["Team A wins", "Team B wins", "Draw"];
    const predictionDuration = 3600; // 1 hour

    const createTx = await winCoins.createEvent("Football Match Example", outcomes, predictionDuration);
    const createReceipt = await createTx.wait();

    const eventId = createReceipt.events[0].args.eventId;
    console.log("Event created with ID:", eventId.toString());

    // Get event details
    console.log("\n2. Getting event details...");
    const eventDetails = await winCoins.getEventDetails(eventId);
    console.log("Event name:", eventDetails.name);
    console.log("Outcomes:", eventDetails.outcomes);
    console.log("Creator:", eventDetails.creator);
    console.log("Prediction deadline:", new Date(eventDetails.predictionDeadline.toNumber() * 1000));
    console.log("Is resolved:", eventDetails.isResolved);

    // Place some bets
    console.log("\n3. Placing bets...");

    const bet1Amount = ethers.utils.parseEther("1.0");
    const bet1Tx = await winCoins.connect(addr1).placeBet(eventId, 0, { value: bet1Amount });
    await bet1Tx.wait();
    console.log("Addr1 bet 1 ETH on outcome 0");

    const bet2Amount = ethers.utils.parseEther("2.0");
    const bet2Tx = await winCoins.connect(addr2).placeBet(eventId, 1, { value: bet2Amount });
    await bet2Tx.wait();
    console.log("Addr2 bet 2 ETH on outcome 1");

    // Check pool amounts
    console.log("\n4. Checking pool amounts...");
    for (let i = 0; i < outcomes.length; i++) {
      const poolAmount = await winCoins.getPoolAmount(eventId, i);
      console.log(`Pool ${i} (${outcomes[i]}): ${ethers.utils.formatEther(poolAmount)} ETH`);
    }

    // Check user bets
    console.log("\n5. Checking user bets...");
    const addr1Bet = await winCoins.getUserBet(eventId, 0, addr1.address);
    const addr2Bet = await winCoins.getUserBet(eventId, 1, addr2.address);
    console.log(`Addr1 bet on outcome 0: ${ethers.utils.formatEther(addr1Bet)} ETH`);
    console.log(`Addr2 bet on outcome 1: ${ethers.utils.formatEther(addr2Bet)} ETH`);

    // Calculate potential payouts
    console.log("\n6. Calculating potential payouts...");
    const addr1Payout0 = await winCoins.calculatePotentialPayout(eventId, 0, addr1.address);
    const addr1Payout1 = await winCoins.calculatePotentialPayout(eventId, 1, addr1.address);
    const addr2Payout0 = await winCoins.calculatePotentialPayout(eventId, 0, addr2.address);
    const addr2Payout1 = await winCoins.calculatePotentialPayout(eventId, 1, addr2.address);

    console.log(`If outcome 0 wins, addr1 gets: ${ethers.utils.formatEther(addr1Payout0)} ETH`);
    console.log(`If outcome 1 wins, addr1 gets: ${ethers.utils.formatEther(addr1Payout1)} ETH`);
    console.log(`If outcome 0 wins, addr2 gets: ${ethers.utils.formatEther(addr2Payout0)} ETH`);
    console.log(`If outcome 1 wins, addr2 gets: ${ethers.utils.formatEther(addr2Payout1)} ETH`);

    console.log("\n7. Example complete!");
    console.log("To resolve the event and distribute payouts, the event creator needs to:");
    console.log("1. Wait for the prediction deadline to pass");
    console.log("2. Call resolveEvent(eventId, winningOutcomeIndex)");
    console.log("3. Winners can then call claimPayout(eventId)");

  } catch (error) {
    console.error("Error interacting with contract:", error);
  }
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