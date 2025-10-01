// WinCoins Smart Contract Interface.
class WinCoinsContract {
  constructor() {
    // Check if ethers is available
    if (typeof ethers === "undefined") {
      throw new Error(
        "Ethers.js library is not loaded. Please check your internet connection."
      );
    }
    this.contractAddress = null;
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.userAddress = null;

    // Contract ABI (matches newly deployed contract with prediction terminology).
    this.contractABI = [
      "function createEvent(string memory name, string[] memory outcomes, uint256 predictionDuration, address oracle) external returns (uint256)",
      "function makePrediction(uint256 eventId, uint256 outcomeIndex) external payable",
      "function resolveEvent(uint256 eventId, uint256 winningOutcomeIndex) external",
      "function cancelEvent(uint256 eventId) external",
      "function claimPayout(uint256 eventId) external",
      "function withdrawCreatorFees() external",
      "function withdrawPlatformFees() external",
      "function collectUnclaimedWinnings(uint256 eventId) external",
      "function getEventDetails(uint256 eventId) external view returns (string memory name, string[] memory outcomes, address creator, address oracle, uint256 predictionDeadline, bool isResolved, bool isCancelled, uint256 winningOutcome, uint256 totalPoolAmount, uint256 resolvedTimestamp, bool unclaimedWinningsCollected)",
      "function getPoolAmount(uint256 eventId, uint256 outcomeIndex) external view returns (uint256)",
      "function getUserPrediction(uint256 eventId, uint256 outcomeIndex, address user) external view returns (uint256)",
      "function getPoolParticipants(uint256 eventId, uint256 outcomeIndex) external view returns (address[] memory)",
      "function calculatePotentialPayout(uint256 eventId, uint256 outcomeIndex, address user) external view returns (uint256)",
      "function getCreatorFeeBalance(address creator) external view returns (uint256)",
      "function getTotalCreatorFeesEarned(address creator) external view returns (uint256)",
      "function getPlatformFeeBalance() external view returns (uint256)",
      "function getEventResolutionInfo(uint256 eventId) external view returns (bool isResolved, uint256 resolvedTimestamp, bool canCollectUnclaimed, bool unclaimedWinningsCollected)",
      "function nextEventId() external view returns (uint256)",
      "function getUserEventIds(address user) external view returns (uint256[] memory)",
      "function getUserEventPredictions(address user, uint256 eventId) external view returns (uint256[] memory outcomeIndices, uint256[] memory amounts)",
      "function getUserClaimInfo(address user, uint256 eventId) external view returns (bool claimed, uint256 amount)",
      "event EventCreated(uint256 indexed eventId, address indexed creator, string name, string[] outcomes, uint256 predictionDeadline)",
      "event PredictionPlaced(uint256 indexed eventId, address indexed predictor, uint256 outcomeIndex, uint256 amount)",
      "event EventResolved(uint256 indexed eventId, uint256 winningOutcome)",
      "event EventCancelled(uint256 indexed eventId, address indexed creator)",
      "event PayoutClaimed(uint256 indexed eventId, address indexed winner, uint256 amount)",
      "event PlatformFeeCollected(uint256 indexed eventId, uint256 platformFeeAmount, uint256 creatorFeeAmount)",
      "event PlatformFeeWithdrawn(address indexed owner, uint256 amount)",
      "event CreatorFeeWithdrawn(address indexed creator, uint256 amount)",
      "event UnclaimedWinningsCollected(uint256 indexed eventId, address indexed owner, uint256 amount)",
    ];
  }

  async initialize() {
    // Always default to first network if no wallet detected
    const firstNetwork = Object.values(NETWORKS)[0];
    this.contractAddress = firstNetwork?.contractAddress || null;

    if (typeof window.ethereum !== "undefined") {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);

      // Get contract address from current network configuration
      try {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        const network = NetworkUtils.getNetworkByChainId(chainId);
        if (network?.contractAddress) {
          this.contractAddress = network.contractAddress;
        }
      } catch (error) {
        console.error("Failed to get current network:", error);
        // Use first network as fallback (already set above)
      }
    } else {
      // No MetaMask, create a read-only provider for first network
      this.provider = new ethers.providers.JsonRpcProvider(
        firstNetwork.rpcUrls[0]
      );
    }

    if (this.contractAddress) {
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.provider
      );
      return true;
    }
    return false;
  }

  async connectWallet() {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      this.signer = this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.signer
      );
      return this.userAddress;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  async getBalance() {
    if (this.userAddress) {
      const balance = await this.provider.getBalance(this.userAddress);
      return ethers.utils.formatEther(balance);
    }
    return "0";
  }

  async createEvent(
    name,
    outcomes,
    predictionDurationMinutes,
    oracleAddress = null
  ) {
    try {
      const predictionDuration = predictionDurationMinutes * 60; // Convert minutes to seconds.
      console.log(
        `Creating event: ${name}, duration: ${predictionDurationMinutes} minutes (${predictionDuration} seconds)`
      );
      console.log(
        `Current timestamp: ${Math.floor(
          Date.now() / 1000
        )}, Expected deadline: ${
          Math.floor(Date.now() / 1000) + predictionDuration
        }`
      );

      // Use creator address if no oracle provided (null/undefined means creator resolves)
      const oracle =
        oracleAddress || "0x0000000000000000000000000000000000000000"; // Zero address = creator resolves
      console.log(
        `Using oracle: ${
          oracle === "0x0000000000000000000000000000000000000000"
            ? "creator (self-resolve)"
            : oracle
        }`
      );

      const tx = await this.contract.createEvent(
        name,
        outcomes,
        predictionDuration,
        oracle
      );
      const receipt = await tx.wait();

      // Find the EventCreated event to get the event ID.
      const eventCreatedEvent = receipt.events.find(
        (e) => e.event === "EventCreated"
      );
      return eventCreatedEvent
        ? eventCreatedEvent.args.eventId.toNumber()
        : null;
    } catch (error) {
      console.error("Failed to create event:", error);
      throw error;
    }
  }

  async makePrediction(eventId, outcomeIndex, predictionAmount) {
    try {
      const tx = await this.contract.makePrediction(eventId, outcomeIndex, {
        value: ethers.utils.parseEther(predictionAmount.toString()),
      });
      return await tx.wait();
    } catch (error) {
      console.error("Failed to make prediction:", error);
      throw error;
    }
  }

  async resolveEvent(eventId, winningOutcomeIndex) {
    try {
      const tx = await this.contract.resolveEvent(eventId, winningOutcomeIndex);
      return await tx.wait();
    } catch (error) {
      console.error("Failed to resolve event:", error);
      throw error;
    }
  }

  async cancelEvent(eventId) {
    try {
      const tx = await this.contract.cancelEvent(eventId);
      return await tx.wait();
    } catch (error) {
      console.error("Failed to cancel event:", error);
      throw error;
    }
  }

  async getCreatorFeeBalance(creatorAddress = null) {
    try {
      const address = creatorAddress || this.userAddress;
      const balance = await this.contract.getCreatorFeeBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Failed to get creator fee balance:", error);
      return "0";
    }
  }

  async getTotalCreatorFeesEarned(creatorAddress = null) {
    try {
      const address = creatorAddress || this.userAddress;
      const total = await this.contract.getTotalCreatorFeesEarned(address);
      return ethers.utils.formatEther(total);
    } catch (error) {
      console.error("Failed to get total creator fees earned:", error);
      return "0";
    }
  }

  async withdrawCreatorFees() {
    try {
      const tx = await this.contract.withdrawCreatorFees();
      return await tx.wait();
    } catch (error) {
      console.error("Failed to withdraw creator fees:", error);
      throw error;
    }
  }

  async claimPayout(eventId) {
    try {
      const tx = await this.contract.claimPayout(eventId);
      return await tx.wait();
    } catch (error) {
      console.error("Failed to claim payout:", error);
      throw error;
    }
  }

  async getEventDetails(eventId) {
    try {
      const details = await this.contract.getEventDetails(eventId);
      return {
        name: details[0],
        outcomes: details[1],
        creator: details[2],
        oracle: details[3],
        predictionDeadline: details[4].toNumber(),
        isResolved: details[5],
        isCancelled: details[6],
        winningOutcome: details[7].toNumber(),
        totalPoolAmount: ethers.utils.formatEther(details[8]),
        resolvedTimestamp: details[9].toNumber(),
        unclaimedWinningsCollected: details[10],
      };
    } catch (error) {
      console.error("Failed to get event details:", error);
      return null;
    }
  }

  async getPoolAmount(eventId, outcomeIndex) {
    try {
      const amount = await this.contract.getPoolAmount(eventId, outcomeIndex);
      return ethers.utils.formatEther(amount);
    } catch (error) {
      console.error("Failed to get pool amount:", error);
      return "0";
    }
  }

  async getUserPrediction(eventId, outcomeIndex, userAddress = null) {
    try {
      const address = userAddress || this.userAddress;
      const prediction = await this.contract.getUserPrediction(
        eventId,
        outcomeIndex,
        address
      );
      return ethers.utils.formatEther(prediction);
    } catch (error) {
      console.error("Failed to get user prediction:", error);
      return "0";
    }
  }

  async calculatePotentialPayout(eventId, outcomeIndex, userAddress = null) {
    try {
      const address = userAddress || this.userAddress;
      const payout = await this.contract.calculatePotentialPayout(
        eventId,
        outcomeIndex,
        address
      );
      return ethers.utils.formatEther(payout);
    } catch (error) {
      console.error("Failed to calculate potential payout:", error);
      return "0";
    }
  }

  async getNextEventId() {
    try {
      const nextId = await this.contract.nextEventId();
      return nextId.toNumber();
    } catch (error) {
      console.error("Failed to get next event ID:", error);
      return 0;
    }
  }

  async getAllEvents() {
    try {
      const nextEventId = await this.getNextEventId();
      const events = [];

      for (let i = 0; i < nextEventId; i++) {
        const eventDetails = await this.getEventDetails(i);
        if (eventDetails) {
          eventDetails.id = i;
          events.push(eventDetails);
        }
      }

      return events;
    } catch (error) {
      console.error("Failed to get all events:", error);
      return [];
    }
  }

  async getUserPredictionsForAllEvents() {
    try {
      // Get all event IDs the user has participated in (no event log scanning needed!).
      const userEventIds = await this.contract.getUserEventIds(
        this.userAddress
      );
      const userPredictions = [];

      // Iterate only through events the user participated in
      for (const eventIdBN of userEventIds) {
        const eventId = eventIdBN.toNumber();
        const event = await this.getEventDetails(eventId);
        if (!event) continue;

        event.id = eventId;

        // Get user's predictions and claim status for this event
        const [outcomeIndices, amounts] =
          await this.contract.getUserEventPredictions(
            this.userAddress,
            eventId
          );
        const [hasClaimed, claimedAmountBN] =
          await this.contract.getUserClaimInfo(this.userAddress, eventId);
        const claimedAmount = hasClaimed
          ? ethers.utils.formatEther(claimedAmountBN)
          : "0";

        // Check if user claimed refund for cancelled event
        const refundClaimed = event.isCancelled && hasClaimed;

        // For cancelled events, aggregate all predictions
        if (event.isCancelled && !refundClaimed) {
          let totalUserPrediction = new Decimal(0);
          for (const amount of amounts) {
            totalUserPrediction = totalUserPrediction.add(
              new Decimal(ethers.utils.formatEther(amount))
            );
          }

          if (totalUserPrediction.gt(0)) {
            userPredictions.push({
              eventId: event.id,
              eventName: event.name,
              outcomeIndex: -1,
              outcomeName: "Event Cancelled - Refund Available",
              predictionAmount: totalUserPrediction.toString(),
              potentialPayout: totalUserPrediction.toString(),
              actualPayout: "0",
              isResolved: false,
              isCancelled: true,
              isWinner: false,
              isClaimed: false,
              isRefundable: true,
            });
          }
        } else if (event.isCancelled && refundClaimed) {
          userPredictions.push({
            eventId: event.id,
            eventName: event.name,
            outcomeIndex: -1,
            outcomeName: "Event Cancelled - Refunded",
            predictionAmount: "Refunded",
            potentialPayout: "0",
            actualPayout: claimedAmount,
            isResolved: false,
            isCancelled: true,
            isWinner: false,
            isClaimed: true,
            isRefunded: true,
          });
        } else {
          // Handle normal resolved/unresolved events
          // If user has claimed, we need to show the winning prediction even if amount is 0
          if (hasClaimed && event.isResolved) {
            // User claimed - show the winning prediction
            const winningOutcome = event.winningOutcome;
            userPredictions.push({
              eventId: event.id,
              eventName: event.name,
              outcomeIndex: winningOutcome,
              outcomeName: event.outcomes[winningOutcome],
              predictionAmount: "Claimed",
              potentialPayout: "0",
              actualPayout: claimedAmount,
              isResolved: event.isResolved,
              isCancelled: false,
              isWinner: true,
              isClaimed: true,
            });
          } else {
            // User hasn't claimed yet - show all their predictions
            for (let i = 0; i < outcomeIndices.length; i++) {
              const outcomeIndex = outcomeIndices[i].toNumber();
              const predictionAmount = ethers.utils.formatEther(amounts[i]);

              // Skip predictions with 0 amount (shouldn't happen for unclaimed)
              if (new Decimal(predictionAmount).eq(0)) {
                continue;
              }

              // Check if this is a winning outcome
              const isWinner =
                event.isResolved && event.winningOutcome === outcomeIndex;

              const potentialPayout = await this.calculatePotentialPayout(
                event.id,
                outcomeIndex
              );

              userPredictions.push({
                eventId: event.id,
                eventName: event.name,
                outcomeIndex,
                outcomeName: event.outcomes[outcomeIndex],
                predictionAmount: predictionAmount,
                potentialPayout,
                actualPayout: "0",
                isResolved: event.isResolved,
                isCancelled: false,
                isWinner: isWinner,
                isClaimed: false,
              });
            }
          }
        }
      }

      return userPredictions;
    } catch (error) {
      console.error("Failed to get user predictions:", error);
      return [];
    }
  }

  formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
  }

  isEventOpen(predictionDeadline) {
    return Date.now() < predictionDeadline * 1000;
  }
}

// Global contract instance
const winCoinsContract = new WinCoinsContract();
