const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WinCoins", function () {
  let WinCoins;
  let winCoins;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    WinCoins = await ethers.getContractFactory("WinCoins");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    winCoins = await WinCoins.deploy();
    await winCoins.deployed();
  });

  describe("Event Creation", function () {
    it("Should create an event with multiple outcomes", async function () {
      const outcomes = ["Team A wins", "Team B wins", "Draw"];
      const predictionDuration = 3600; // 1 hour.

      const tx = await winCoins.createEvent("Football Match", outcomes, predictionDuration);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("EventCreated");
      expect(receipt.events[0].args.eventId).to.equal(0);
      expect(receipt.events[0].args.creator).to.equal(owner.address);
      expect(receipt.events[0].args.name).to.equal("Football Match");

      const eventDetails = await winCoins.getEventDetails(0);
      expect(eventDetails.name).to.equal("Football Match");
      expect(eventDetails.outcomes).to.deep.equal(outcomes);
      expect(eventDetails.creator).to.equal(owner.address);
      expect(eventDetails.isResolved).to.equal(false);
    });

    it("Should fail to create event with less than 2 outcomes", async function () {
      const outcomes = ["Only one outcome"];
      const predictionDuration = 3600;

      await expect(
        winCoins.createEvent("Invalid Event", outcomes, predictionDuration)
      ).to.be.revertedWith("Must have at least 2 outcomes");
    });

    it("Should fail to create event with zero prediction duration", async function () {
      const outcomes = ["Team A wins", "Team B wins"];
      const predictionDuration = 0;

      await expect(
        winCoins.createEvent("Invalid Event", outcomes, predictionDuration)
      ).to.be.revertedWith("Prediction duration must be positive");
    });
  });

  describe("Predictions", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins", "Draw"];
      const predictionDuration = 3600;

      const tx = await winCoins.createEvent("Football Match", outcomes, predictionDuration);
      const receipt = await tx.wait();
      eventId = receipt.events[0].args.eventId;
    });

    it("Should allow users to place predictions", async function () {
      const predictionAmount = ethers.utils.parseEther("1.0");
      const outcomeIndex = 0;

      const tx = await winCoins.connect(addr1).makePrediction(eventId, outcomeIndex, { value: predictionAmount });
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("PredictionPlaced");
      expect(receipt.events[0].args.eventId).to.equal(eventId);
      expect(receipt.events[0].args.predictor).to.equal(addr1.address);
      expect(receipt.events[0].args.outcomeIndex).to.equal(outcomeIndex);
      expect(receipt.events[0].args.amount).to.equal(predictionAmount);

      const userPrediction = await winCoins.getUserPrediction(eventId, outcomeIndex, addr1.address);
      expect(userPrediction).to.equal(predictionAmount);

      const poolAmount = await winCoins.getPoolAmount(eventId, outcomeIndex);
      expect(poolAmount).to.equal(predictionAmount);
    });

    it("Should accumulate predictions from multiple users", async function () {
      const predictionAmount1 = ethers.utils.parseEther("1.0");
      const predictionAmount2 = ethers.utils.parseEther("2.0");
      const outcomeIndex = 0;

      await winCoins.connect(addr1).makePrediction(eventId, outcomeIndex, { value: predictionAmount1 });
      await winCoins.connect(addr2).makePrediction(eventId, outcomeIndex, { value: predictionAmount2 });

      const poolAmount = await winCoins.getPoolAmount(eventId, outcomeIndex);
      expect(poolAmount).to.equal(predictionAmount1.add(predictionAmount2));

      const participants = await winCoins.getPoolParticipants(eventId, outcomeIndex);
      expect(participants).to.deep.equal([addr1.address, addr2.address]);
    });

    it("Should allow multiple predictions from same user", async function () {
      const predictionAmount1 = ethers.utils.parseEther("1.0");
      const predictionAmount2 = ethers.utils.parseEther("0.5");
      const outcomeIndex = 0;

      await winCoins.connect(addr1).makePrediction(eventId, outcomeIndex, { value: predictionAmount1 });
      await winCoins.connect(addr1).makePrediction(eventId, outcomeIndex, { value: predictionAmount2 });

      const userPrediction = await winCoins.getUserPrediction(eventId, outcomeIndex, addr1.address);
      expect(userPrediction).to.equal(predictionAmount1.add(predictionAmount2));

      const participants = await winCoins.getPoolParticipants(eventId, outcomeIndex);
      expect(participants.length).to.equal(1);
      expect(participants[0]).to.equal(addr1.address);
    });

    it("Should fail to make prediction on non-existent event", async function () {
      const predictionAmount = ethers.utils.parseEther("1.0");
      const nonExistentEventId = 999;

      await expect(
        winCoins.connect(addr1).makePrediction(nonExistentEventId, 0, { value: predictionAmount })
      ).to.be.revertedWith("Event does not exist");
    });

    it("Should fail to make prediction on invalid outcome", async function () {
      const predictionAmount = ethers.utils.parseEther("1.0");
      const invalidOutcomeIndex = 999;

      await expect(
        winCoins.connect(addr1).makePrediction(eventId, invalidOutcomeIndex, { value: predictionAmount })
      ).to.be.revertedWith("Invalid outcome index");
    });

    it("Should fail to make prediction with zero amount", async function () {
      await expect(
        winCoins.connect(addr1).makePrediction(eventId, 0, { value: 0 })
      ).to.be.revertedWith("Prediction amount must be greater than 0");
    });
  });

  describe("Event Resolution", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins", "Draw"];
      const predictionDuration = 3600; // 1 hour for testing.

      const tx = await winCoins.createEvent("Football Match", outcomes, predictionDuration);
      const receipt = await tx.wait();
      eventId = receipt.events[0].args.eventId;

      // Place some predictions.
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });
      await winCoins.connect(addr2).makePrediction(eventId, 1, { value: ethers.utils.parseEther("2.0") });

      // Advance time past predictionting deadline.
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
    });

    it("Should allow event creator to resolve event", async function () {
      const winningOutcome = 0;

      const tx = await winCoins.resolveEvent(eventId, winningOutcome);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("EventResolved");
      expect(receipt.events[0].args.eventId).to.equal(eventId);
      expect(receipt.events[0].args.winningOutcome).to.equal(winningOutcome);

      const eventDetails = await winCoins.getEventDetails(eventId);
      expect(eventDetails.isResolved).to.equal(true);
      expect(eventDetails.winningOutcome).to.equal(winningOutcome);
    });

    it("Should fail if non-creator tries to resolve event", async function () {
      await expect(
        winCoins.connect(addr1).resolveEvent(eventId, 0)
      ).to.be.revertedWith("Only event creator can call this");
    });

    it("Should fail to resolve already resolved event", async function () {
      await winCoins.resolveEvent(eventId, 0);

      await expect(
        winCoins.resolveEvent(eventId, 1)
      ).to.be.revertedWith("Event already resolved");
    });

    it("Should fail to resolve with invalid outcome", async function () {
      await expect(
        winCoins.resolveEvent(eventId, 999)
      ).to.be.revertedWith("Invalid winning outcome");
    });
  });

  describe("Payout Distribution", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins", "Draw"];
      const predictionDuration = 3600;

      const tx = await winCoins.createEvent("Football Match", outcomes, predictionDuration);
      const receipt = await tx.wait();
      eventId = receipt.events[0].args.eventId;
    });

    it("Should distribute payouts proportionally to winners", async function () {
      // Set up predictions:
      // Outcome 0 (winning): addr1 = 1 ETH, addr2 = 2 ETH (total 3 ETH)
      // Outcome 1 (losing): addr3 = 6 ETH
      // Total pool: 9 ETH

      const prediction1 = ethers.utils.parseEther("1.0");
      const prediction2 = ethers.utils.parseEther("2.0");
      const prediction3 = ethers.utils.parseEther("6.0");

      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: prediction1 });
      await winCoins.connect(addr2).makePrediction(eventId, 0, { value: prediction2 });
      await winCoins.connect(addr3).makePrediction(eventId, 1, { value: prediction3 });

      // Advance time and resolve.
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId, 0);

      // Check potential payouts.
      const payout1 = await winCoins.calculatePotentialPayout(eventId, 0, addr1.address);
      const payout2 = await winCoins.calculatePotentialPayout(eventId, 0, addr2.address);

      // Total pool is 9 ETH. Platform fee is only on winnings (profit)
      // Winners bet 3 ETH, losers bet 6 ETH, so winnings = 6 ETH
      // Platform fee = 0.1% of 6 ETH = 0.006 ETH
      const totalPool = ethers.utils.parseEther("9.0");
      const winnings = ethers.utils.parseEther("6.0"); // Losing bets
      const platformFee = winnings.div(1000); // 0.1% of winnings only
      const poolAfterFee = totalPool.sub(platformFee);

      // addr1 should get 1/3 of pool after fee
      // addr2 should get 2/3 of pool after fee
      expect(payout1).to.equal(poolAfterFee.div(3));
      expect(payout2).to.equal(poolAfterFee.mul(2).div(3));

      // Claim payouts.
      const addr1BalanceBefore = await addr1.getBalance();
      const addr2BalanceBefore = await addr2.getBalance();

      const tx1 = await winCoins.connect(addr1).claimPayout(eventId);
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

      const tx2 = await winCoins.connect(addr2).claimPayout(eventId);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

      const addr1BalanceAfter = await addr1.getBalance();
      const addr2BalanceAfter = await addr2.getBalance();

      // Check balances (accounting for gas costs).
      expect(addr1BalanceAfter.add(gasUsed1).sub(addr1BalanceBefore)).to.be.closeTo(
        poolAfterFee.div(3),
        ethers.utils.parseEther("0.001")
      );
      expect(addr2BalanceAfter.add(gasUsed2).sub(addr2BalanceBefore)).to.be.closeTo(
        poolAfterFee.mul(2).div(3),
        ethers.utils.parseEther("0.001")
      );
    });

    it("Should fail to claim payout for unresolved event", async function () {
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });

      await expect(
        winCoins.connect(addr1).claimPayout(eventId)
      ).to.be.revertedWith("Event not resolved yet");
    });

    it("Should fail to claim payout with no winning prediction", async function () {
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId, 1); // addr1 prediction on outcome 0, but outcome 1 won.

      await expect(
        winCoins.connect(addr1).claimPayout(eventId)
      ).to.be.revertedWith("No winning prediction found");
    });

    it("Should prevent double claiming", async function () {
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId, 0);

      await winCoins.connect(addr1).claimPayout(eventId);

      await expect(
        winCoins.connect(addr1).claimPayout(eventId)
      ).to.be.revertedWith("No winning prediction found");
    });
  });

  describe("Platform Fee Management", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins"];
      const predictionDuration = 3600;

      const tx = await winCoins.createEvent("Test Event", outcomes, predictionDuration);
      const receipt = await tx.wait();
      eventId = receipt.events[0].args.eventId;

      // Place predictions totaling 10 ETH
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("6.0") });
      await winCoins.connect(addr2).makePrediction(eventId, 1, { value: ethers.utils.parseEther("4.0") });

      // Advance time past prediction deadline
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
    });

    it("Should collect 0.1% platform fee when event is resolved", async function () {
      const totalPool = ethers.utils.parseEther("10.0");
      const winningPool = ethers.utils.parseEther("6.0"); // Winners bet 6 ETH
      const winnings = totalPool.sub(winningPool); // 4 ETH profit from losers
      const totalFee = winnings.div(1000); // 0.1% of 4 ETH = 0.004 ETH
      const expectedPlatformFee = totalFee.div(2); // 50% to platform = 0.002 ETH
      const expectedCreatorFee = totalFee.sub(expectedPlatformFee); // 50% to creator = 0.002 ETH

      const tx = await winCoins.resolveEvent(eventId, 0);
      const receipt = await tx.wait();

      // Check for PlatformFeeCollected event
      const feeEvent = receipt.events.find(e => e.event === "PlatformFeeCollected");
      expect(feeEvent).to.not.be.undefined;
      expect(feeEvent.args.eventId).to.equal(eventId);
      expect(feeEvent.args.platformFeeAmount).to.equal(expectedPlatformFee);
      expect(feeEvent.args.creatorFeeAmount).to.equal(expectedCreatorFee);

      // Check platform fee balance
      const platformFeeBalance = await winCoins.getPlatformFeeBalance();
      expect(platformFeeBalance).to.equal(expectedPlatformFee);

      // Check creator fee balance
      const creatorFeeBalance = await winCoins.getCreatorFeeBalance(owner.address);
      expect(creatorFeeBalance).to.equal(expectedCreatorFee);

      // Check that total pool amount was reduced by the total fee
      const eventDetails = await winCoins.getEventDetails(eventId);
      expect(eventDetails.totalPoolAmount).to.equal(totalPool.sub(totalFee));
    });

    it("Should allow owner to withdraw platform fees", async function () {
      await winCoins.resolveEvent(eventId, 0);

      const platformFeeBalance = await winCoins.getPlatformFeeBalance();
      const ownerBalanceBefore = await owner.getBalance();

      const tx = await winCoins.withdrawPlatformFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const ownerBalanceAfter = await owner.getBalance();

      // Check balance change (accounting for gas)
      expect(ownerBalanceAfter.add(gasUsed).sub(ownerBalanceBefore)).to.equal(platformFeeBalance);

      // Check platform fee balance is now zero
      expect(await winCoins.getPlatformFeeBalance()).to.equal(0);

      // Check for PlatformFeeWithdrawn event
      const withdrawEvent = receipt.events.find(e => e.event === "PlatformFeeWithdrawn");
      expect(withdrawEvent).to.not.be.undefined;
      expect(withdrawEvent.args.owner).to.equal(owner.address);
      expect(withdrawEvent.args.amount).to.equal(platformFeeBalance);
    });

    it("Should fail to withdraw platform fees if not owner", async function () {
      await winCoins.resolveEvent(eventId, 0);

      await expect(
        winCoins.connect(addr1).withdrawPlatformFees()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail to withdraw platform fees if balance is zero", async function () {
      await expect(
        winCoins.withdrawPlatformFees()
      ).to.be.revertedWith("No platform fees to withdraw");
    });

    it("Should accumulate platform fees from multiple events", async function () {
      // Resolve first event - first event has 4 ETH winnings (10-6), so fee = 0.004 ETH
      await winCoins.resolveEvent(eventId, 0);
      const firstFee = await winCoins.getPlatformFeeBalance();

      // Create and resolve second event
      const outcomes2 = ["Option A", "Option B"];
      const tx2 = await winCoins.createEvent("Second Event", outcomes2, 3600);
      const receipt2 = await tx2.wait();
      const eventId2 = receipt2.events[0].args.eventId;

      await winCoins.connect(addr1).makePrediction(eventId2, 0, { value: ethers.utils.parseEther("5.0") });
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId2, 0);

      const totalFee = await winCoins.getPlatformFeeBalance();

      // Second event has no winnings (only winners bet), so no fee
      // Total fee should be same as first fee
      expect(totalFee).to.equal(firstFee);
    });

    it("Should allow event creator to withdraw creator fees", async function () {
      await winCoins.resolveEvent(eventId, 0);

      const creatorFeeBalance = await winCoins.getCreatorFeeBalance(owner.address);
      const creatorBalanceBefore = await owner.getBalance();

      const tx = await winCoins.withdrawCreatorFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const creatorBalanceAfter = await owner.getBalance();

      // Check balance change (accounting for gas)
      expect(creatorBalanceAfter.add(gasUsed).sub(creatorBalanceBefore)).to.equal(creatorFeeBalance);

      // Check creator fee balance is now zero
      expect(await winCoins.getCreatorFeeBalance(owner.address)).to.equal(0);

      // Check for CreatorFeeWithdrawn event
      const withdrawEvent = receipt.events.find(e => e.event === "CreatorFeeWithdrawn");
      expect(withdrawEvent).to.not.be.undefined;
      expect(withdrawEvent.args.creator).to.equal(owner.address);
      expect(withdrawEvent.args.amount).to.equal(creatorFeeBalance);
    });

    it("Should fail to withdraw creator fees if balance is zero", async function () {
      await expect(
        winCoins.connect(addr1).withdrawCreatorFees()
      ).to.be.revertedWith("No creator fees to withdraw");
    });

    it("Should allow any creator to withdraw their own fees", async function () {
      // addr1 creates an event
      const outcomes = ["Option X", "Option Y"];
      const tx = await winCoins.connect(addr1).createEvent("Creator Test", outcomes, 3600);
      const receipt = await tx.wait();
      const newEventId = receipt.events[0].args.eventId;

      // Place bets on the new event
      await winCoins.connect(addr2).makePrediction(newEventId, 0, { value: ethers.utils.parseEther("3.0") });
      await winCoins.connect(addr3).makePrediction(newEventId, 1, { value: ethers.utils.parseEther("7.0") });

      // Resolve event (addr1 is creator)
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.connect(addr1).resolveEvent(newEventId, 0);

      // Check that addr1 has creator fees
      const addr1CreatorFees = await winCoins.getCreatorFeeBalance(addr1.address);
      expect(addr1CreatorFees).to.be.above(0);

      // addr1 should be able to withdraw their creator fees
      await expect(
        winCoins.connect(addr1).withdrawCreatorFees()
      ).to.not.be.reverted;

      // Check balance is now zero
      expect(await winCoins.getCreatorFeeBalance(addr1.address)).to.equal(0);
    });

    it("Should accumulate creator fees from multiple events for same creator", async function () {
      // Resolve first event
      await winCoins.resolveEvent(eventId, 0);
      const firstCreatorFee = await winCoins.getCreatorFeeBalance(owner.address);

      // Create and resolve second event by same creator
      const outcomes2 = ["Choice A", "Choice B"];
      const tx2 = await winCoins.createEvent("Second Event", outcomes2, 3600);
      const receipt2 = await tx2.wait();
      const eventId2 = receipt2.events[0].args.eventId;

      await winCoins.connect(addr1).makePrediction(eventId2, 0, { value: ethers.utils.parseEther("2.0") });
      await winCoins.connect(addr2).makePrediction(eventId2, 1, { value: ethers.utils.parseEther("8.0") });
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId2, 0);

      const totalCreatorFees = await winCoins.getCreatorFeeBalance(owner.address);

      // Should be first fee plus second fee (8 ETH winnings * 0.1% / 2 = 0.004 ETH)
      const secondEventWinnings = ethers.utils.parseEther("8.0");
      const secondEventTotalFee = secondEventWinnings.div(1000);
      const secondEventCreatorFee = secondEventTotalFee.div(2);

      expect(totalCreatorFees).to.equal(firstCreatorFee.add(secondEventCreatorFee));
    });

    it("Should allow owner transfer functionality", async function () {
      // Transfer ownership to addr1
      await winCoins.transferOwnership(addr1.address);
      expect(await winCoins.owner()).to.equal(addr1.address);

      // Resolve event to generate fees
      await winCoins.resolveEvent(eventId, 0);

      // addr1 should now be able to withdraw platform fees
      await expect(
        winCoins.connect(addr1).withdrawPlatformFees()
      ).to.not.be.reverted;

      // Original owner should no longer be able to withdraw platform fees
      await expect(
        winCoins.withdrawPlatformFees()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // But original owner should still be able to withdraw creator fees
      await expect(
        winCoins.withdrawCreatorFees()
      ).to.not.be.reverted;
    });
  });

  describe("Unclaimed Winnings Collection", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins"];
      const predictionDuration = 3600;

      const tx = await winCoins.createEvent("Test Event", outcomes, predictionDuration);
      const receipt = await tx.wait();
      eventId = receipt.events[0].args.eventId;

      // Place predictions
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("2.0") });
      await winCoins.connect(addr2).makePrediction(eventId, 0, { value: ethers.utils.parseEther("3.0") });
      await winCoins.connect(addr3).makePrediction(eventId, 1, { value: ethers.utils.parseEther("5.0") });

      // Advance time and resolve
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId, 0); // Team A wins
    });

    it("Should track resolution timestamp when event is resolved", async function () {
      const details = await winCoins.getEventDetails(eventId);
      expect(details.resolvedTimestamp).to.be.above(0);
      expect(details.unclaimedWinningsCollected).to.equal(false);
    });

    it("Should return correct resolution info", async function () {
      const resolutionInfo = await winCoins.getEventResolutionInfo(eventId);

      expect(resolutionInfo.isResolved).to.equal(true);
      expect(resolutionInfo.resolvedTimestamp).to.be.above(0);
      expect(resolutionInfo.canCollectUnclaimed).to.equal(false); // Not 10 years yet
      expect(resolutionInfo.unclaimedWinningsCollected).to.equal(false);
    });

    it("Should fail to collect unclaimed winnings before 10 years", async function () {
      await expect(
        winCoins.collectUnclaimedWinnings(eventId)
      ).to.be.revertedWith("Must wait 10 years after event resolution");
    });

    it("Should fail to collect unclaimed winnings if not owner", async function () {
      // Fast forward 10 years
      await ethers.provider.send("evm_increaseTime", [315360001]); // 10 years + 1 second
      await ethers.provider.send("evm_mine");

      await expect(
        winCoins.connect(addr1).collectUnclaimedWinnings(eventId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should collect unclaimed winnings after 10 years from partial claims", async function () {
      // Only addr1 claims their winnings
      await winCoins.connect(addr1).claimPayout(eventId);

      // Fast forward 10 years
      await ethers.provider.send("evm_increaseTime", [315360001]);
      await ethers.provider.send("evm_mine");

      const ownerBalanceBefore = await owner.getBalance();

      // Check that unclaimed winnings can now be collected
      const resolutionInfo = await winCoins.getEventResolutionInfo(eventId);
      expect(resolutionInfo.canCollectUnclaimed).to.equal(true);

      const tx = await winCoins.collectUnclaimedWinnings(eventId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const ownerBalanceAfter = await owner.getBalance();

      // Calculate expected unclaimed amount
      // Total pool: 10 ETH (2+3+5). Winners bet 5 ETH, losers bet 5 ETH, so winnings = 5 ETH
      // Platform fee = 0.1% of 5 ETH = 0.005 ETH
      // Pool after fee = 10 - 0.005 = 9.995 ETH
      // addr2 had 3 ETH out of 5 ETH winning predictions, so should get (3/5) * 9.995 = 5.997 ETH
      // addr1 already claimed (2/5) * 9.995 = 3.998 ETH
      const totalPoolAfterFee = ethers.utils.parseEther("9.995"); // 10 ETH - 0.005 ETH fee
      const addr2ExpectedPayout = totalPoolAfterFee.mul(3).div(5); // 3/5 of pool

      // Check balance change (accounting for gas)
      expect(ownerBalanceAfter.add(gasUsed).sub(ownerBalanceBefore)).to.be.closeTo(
        addr2ExpectedPayout,
        ethers.utils.parseEther("0.001")
      );

      // Check that event is marked as collected
      const updatedDetails = await winCoins.getEventDetails(eventId);
      expect(updatedDetails.unclaimedWinningsCollected).to.equal(true);

      // Check for UnclaimedWinningsCollected event
      const collectEvent = receipt.events.find(e => e.event === "UnclaimedWinningsCollected");
      expect(collectEvent).to.not.be.undefined;
      expect(collectEvent.args.eventId).to.equal(eventId);
      expect(collectEvent.args.owner).to.equal(owner.address);

      // Verify addr2 can no longer claim
      await expect(
        winCoins.connect(addr2).claimPayout(eventId)
      ).to.be.revertedWith("No winning prediction found");
    });

    it("Should collect all winnings if nobody claimed", async function () {
      // Fast forward 10 years without anyone claiming
      await ethers.provider.send("evm_increaseTime", [315360001]);
      await ethers.provider.send("evm_mine");

      const ownerBalanceBefore = await owner.getBalance();

      const tx = await winCoins.collectUnclaimedWinnings(eventId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const ownerBalanceAfter = await owner.getBalance();

      // Should collect entire pool after platform fee
      // Winners bet 5 ETH, losers bet 5 ETH, so winnings = 5 ETH, fee = 0.005 ETH
      const totalPoolAfterFee = ethers.utils.parseEther("9.995"); // 10 - 0.005

      expect(ownerBalanceAfter.add(gasUsed).sub(ownerBalanceBefore)).to.be.closeTo(
        totalPoolAfterFee,
        ethers.utils.parseEther("0.001")
      );
    });

    it("Should handle case where nobody won (collect entire pool)", async function () {
      // Create new event where winning outcome has no predictions
      const outcomes2 = ["Option A", "Option B", "Option C"];
      const tx2 = await winCoins.createEvent("No Winner Event", outcomes2, 3600);
      const receipt2 = await tx2.wait();
      const eventId2 = receipt2.events[0].args.eventId;

      // Place predictions only on options A and B
      await winCoins.connect(addr1).makePrediction(eventId2, 0, { value: ethers.utils.parseEther("3.0") });
      await winCoins.connect(addr2).makePrediction(eventId2, 1, { value: ethers.utils.parseEther("7.0") });

      // Resolve with Option C winning (no one predicted this)
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await winCoins.resolveEvent(eventId2, 2);

      // Fast forward 10 years
      await ethers.provider.send("evm_increaseTime", [315360001]);
      await ethers.provider.send("evm_mine");

      const ownerBalanceBefore = await owner.getBalance();

      const tx = await winCoins.collectUnclaimedWinnings(eventId2);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const ownerBalanceAfter = await owner.getBalance();

      // Should collect entire pool after platform fee
      // When nobody wins, there are no "winnings" to take fee from, so no fee is collected
      const totalPoolAfterFee = ethers.utils.parseEther("10.0"); // No fee when nobody wins

      expect(ownerBalanceAfter.add(gasUsed).sub(ownerBalanceBefore)).to.be.closeTo(
        totalPoolAfterFee,
        ethers.utils.parseEther("0.001")
      );
    });

    it("Should fail to collect unclaimed winnings twice", async function () {
      await ethers.provider.send("evm_increaseTime", [315360001]);
      await ethers.provider.send("evm_mine");

      await winCoins.collectUnclaimedWinnings(eventId);

      await expect(
        winCoins.collectUnclaimedWinnings(eventId)
      ).to.be.revertedWith("Unclaimed winnings already collected");
    });

    it("Should fail to collect if no unclaimed winnings available", async function () {
      // Both winners claim their payouts
      await winCoins.connect(addr1).claimPayout(eventId);
      await winCoins.connect(addr2).claimPayout(eventId);

      await ethers.provider.send("evm_increaseTime", [315360001]);
      await ethers.provider.send("evm_mine");

      await expect(
        winCoins.collectUnclaimedWinnings(eventId)
      ).to.be.revertedWith("No unclaimed winnings available");
    });
  });

  describe("View Functions", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins"];
      const predictionDuration = 3600;

      const tx = await winCoins.createEvent("Test Event", outcomes, predictionDuration);
      const receipt = await tx.wait();
      eventId = receipt.events[0].args.eventId;

      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });
      await winCoins.connect(addr2).makePrediction(eventId, 1, { value: ethers.utils.parseEther("2.0") });
    });

    it("Should return correct event details", async function () {
      const details = await winCoins.getEventDetails(eventId);

      expect(details.name).to.equal("Test Event");
      expect(details.outcomes).to.deep.equal(["Team A wins", "Team B wins"]);
      expect(details.creator).to.equal(owner.address);
      expect(details.isResolved).to.equal(false);
      expect(details.totalPoolAmount).to.equal(ethers.utils.parseEther("3.0"));
      expect(details.resolvedTimestamp).to.equal(0); // Not resolved yet
      expect(details.unclaimedWinningsCollected).to.equal(false);
    });

    it("Should return correct pool amounts", async function () {
      const pool0 = await winCoins.getPoolAmount(eventId, 0);
      const pool1 = await winCoins.getPoolAmount(eventId, 1);

      expect(pool0).to.equal(ethers.utils.parseEther("1.0"));
      expect(pool1).to.equal(ethers.utils.parseEther("2.0"));
    });

    it("Should return correct user predictions", async function () {
      const prediction1 = await winCoins.getUserPrediction(eventId, 0, addr1.address);
      const prediction2 = await winCoins.getUserPrediction(eventId, 1, addr2.address);

      expect(prediction1).to.equal(ethers.utils.parseEther("1.0"));
      expect(prediction2).to.equal(ethers.utils.parseEther("2.0"));
    });

    it("Should return pool participants", async function () {
      const participants0 = await winCoins.getPoolParticipants(eventId, 0);
      const participants1 = await winCoins.getPoolParticipants(eventId, 1);

      expect(participants0).to.deep.equal([addr1.address]);
      expect(participants1).to.deep.equal([addr2.address]);
    });
  });

  describe("Event Cancellation", function () {
    let eventId;

    beforeEach(async function () {
      const outcomes = ["Team A wins", "Team B wins"];
      const predictionDuration = 3600; // 1 hour.

      await winCoins.createEvent("Football Match", outcomes, predictionDuration);
      eventId = 0;

      // Add some predictions
      await winCoins.connect(addr1).makePrediction(eventId, 0, { value: ethers.utils.parseEther("1.0") });
      await winCoins.connect(addr2).makePrediction(eventId, 1, { value: ethers.utils.parseEther("2.0") });
    });

    it("Should allow event creator to cancel event", async function () {
      const tx = await winCoins.cancelEvent(eventId);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("EventCancelled");
      expect(receipt.events[0].args.eventId).to.equal(eventId);
      expect(receipt.events[0].args.creator).to.equal(owner.address);

      const eventDetails = await winCoins.getEventDetails(eventId);
      expect(eventDetails.isCancelled).to.equal(true);
    });

    it("Should not allow non-creator to cancel event", async function () {
      await expect(
        winCoins.connect(addr1).cancelEvent(eventId)
      ).to.be.revertedWith("Only event creator can call this");
    });

    it("Should not allow cancelling already resolved event", async function () {
      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      // Resolve the event
      await winCoins.resolveEvent(eventId, 0);

      await expect(
        winCoins.cancelEvent(eventId)
      ).to.be.revertedWith("Cannot cancel resolved event");
    });

    it("Should not allow cancelling already cancelled event", async function () {
      await winCoins.cancelEvent(eventId);

      await expect(
        winCoins.cancelEvent(eventId)
      ).to.be.revertedWith("Event has been cancelled");
    });

    it("Should prevent predictions on cancelled events", async function () {
      await winCoins.cancelEvent(eventId);

      await expect(
        winCoins.connect(addr3).makePrediction(eventId, 0, { value: ethers.utils.parseEther("0.5") })
      ).to.be.revertedWith("Event has been cancelled");
    });

    it("Should prevent resolving cancelled events", async function () {
      await winCoins.cancelEvent(eventId);

      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(
        winCoins.resolveEvent(eventId, 0)
      ).to.be.revertedWith("Event has been cancelled");
    });

    it("Should allow users to claim full refunds for cancelled events", async function () {
      await winCoins.cancelEvent(eventId);

      const balanceBeforeRefund1 = await ethers.provider.getBalance(addr1.address);
      const balanceBeforeRefund2 = await ethers.provider.getBalance(addr2.address);

      // Addr1 claims refund
      const tx1 = await winCoins.connect(addr1).claimPayout(eventId);
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

      // Addr2 claims refund
      const tx2 = await winCoins.connect(addr2).claimPayout(eventId);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

      const finalBalance1 = await ethers.provider.getBalance(addr1.address);
      const finalBalance2 = await ethers.provider.getBalance(addr2.address);

      // Check that they received their bet amounts minus gas costs
      const expectedBalance1 = balanceBeforeRefund1.add(ethers.utils.parseEther("1.0")).sub(gasUsed1);
      const expectedBalance2 = balanceBeforeRefund2.add(ethers.utils.parseEther("2.0")).sub(gasUsed2);

      expect(finalBalance1).to.be.closeTo(expectedBalance1, ethers.utils.parseEther("0.001"));
      expect(finalBalance2).to.be.closeTo(expectedBalance2, ethers.utils.parseEther("0.001"));

      // Check events
      expect(receipt1.events[0].event).to.equal("PayoutClaimed");
      expect(receipt1.events[0].args.eventId).to.equal(eventId);
      expect(receipt1.events[0].args.winner).to.equal(addr1.address);
      expect(receipt1.events[0].args.amount).to.equal(ethers.utils.parseEther("1.0"));

      expect(receipt2.events[0].event).to.equal("PayoutClaimed");
      expect(receipt2.events[0].args.eventId).to.equal(eventId);
      expect(receipt2.events[0].args.winner).to.equal(addr2.address);
      expect(receipt2.events[0].args.amount).to.equal(ethers.utils.parseEther("2.0"));
    });

    it("Should allow users with multiple predictions to claim full refund", async function () {
      // Addr1 makes additional prediction on different outcome
      await winCoins.connect(addr1).makePrediction(eventId, 1, { value: ethers.utils.parseEther("0.5") });

      await winCoins.cancelEvent(eventId);

      const balanceBeforeRefund = await ethers.provider.getBalance(addr1.address);

      const tx = await winCoins.connect(addr1).claimPayout(eventId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const finalBalance = await ethers.provider.getBalance(addr1.address);

      // Should get back 1.0 + 0.5 = 1.5 ETH minus gas
      const expectedBalance = balanceBeforeRefund.add(ethers.utils.parseEther("1.5")).sub(gasUsed);
      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.utils.parseEther("0.001"));

      // Check event
      expect(receipt.events[0].args.amount).to.equal(ethers.utils.parseEther("1.5"));
    });

    it("Should not allow claiming refund twice", async function () {
      await winCoins.cancelEvent(eventId);

      await winCoins.connect(addr1).claimPayout(eventId);

      await expect(
        winCoins.connect(addr1).claimPayout(eventId)
      ).to.be.revertedWith("No refund available");
    });

    it("Should not allow users with no predictions to claim refunds", async function () {
      await winCoins.cancelEvent(eventId);

      await expect(
        winCoins.connect(addr3).claimPayout(eventId)
      ).to.be.revertedWith("No refund available");
    });
  });
});