// WinCoins Smart Contract Interface.
class WinCoinsContract {
    constructor() {
        // Check if ethers is available
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers.js library is not loaded. Please check your internet connection.');
        }
        this.contractAddress = null;
        this.contract = null;
        this.provider = null;
        this.signer = null;
        this.userAddress = null;

        // Contract ABI (matches newly deployed contract with prediction terminology).
        this.contractABI = [
            "function createEvent(string memory name, string[] memory outcomes, uint256 predictionDuration) external returns (uint256)",
            "function makePrediction(uint256 eventId, uint256 outcomeIndex) external payable",
            "function resolveEvent(uint256 eventId, uint256 winningOutcomeIndex) external",
            "function cancelEvent(uint256 eventId) external",
            "function claimPayout(uint256 eventId) external",
            "function withdrawCreatorFees() external",
            "function getEventDetails(uint256 eventId) external view returns (string memory name, string[] memory outcomes, address creator, uint256 predictionDeadline, bool isResolved, bool isCancelled, uint256 winningOutcome, uint256 totalPoolAmount, uint256 resolvedTimestamp, bool unclaimedWinningsCollected)",
            "function getPoolAmount(uint256 eventId, uint256 outcomeIndex) external view returns (uint256)",
            "function getUserPrediction(uint256 eventId, uint256 outcomeIndex, address user) external view returns (uint256)",
            "function getPoolParticipants(uint256 eventId, uint256 outcomeIndex) external view returns (address[] memory)",
            "function calculatePotentialPayout(uint256 eventId, uint256 outcomeIndex, address user) external view returns (uint256)",
            "function getCreatorFeeBalance(address creator) external view returns (uint256)",
            "function nextEventId() external view returns (uint256)",
            "event EventCreated(uint256 indexed eventId, address indexed creator, string name, string[] outcomes, uint256 predictionDeadline)",
            "event PredictionPlaced(uint256 indexed eventId, address indexed predictor, uint256 outcomeIndex, uint256 amount)",
            "event EventResolved(uint256 indexed eventId, uint256 winningOutcome)",
            "event EventCancelled(uint256 indexed eventId, address indexed creator)",
            "event PayoutClaimed(uint256 indexed eventId, address indexed winner, uint256 amount)",
            "event PlatformFeeCollected(uint256 indexed eventId, uint256 platformFeeAmount, uint256 creatorFeeAmount)",
            "event CreatorFeeWithdrawn(address indexed creator, uint256 amount)"
        ];
    }

    async initialize() {
        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);

            // Get default contract address from first network entry
            const firstNetwork = Object.values(NETWORKS)[0];
            const defaultAddress = firstNetwork?.contractAddress || null;

            // Try to get contract address from localStorage or use default from networks.js
            this.contractAddress = localStorage.getItem('wincoins_contract_address') || defaultAddress;

            if (this.contractAddress) {
                localStorage.setItem('wincoins_contract_address', this.contractAddress);
                this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.provider);
                return true;
            }
        }
        return false;
    }

    async connectWallet() {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.signer = this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
            return this.userAddress;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    }

    async getBalance() {
        if (this.userAddress) {
            const balance = await this.provider.getBalance(this.userAddress);
            return ethers.utils.formatEther(balance);
        }
        return '0';
    }

    async createEvent(name, outcomes, predictionDurationMinutes) {
        try {
            const predictionDuration = predictionDurationMinutes * 60; // Convert minutes to seconds.
            console.log(`Creating event: ${name}, duration: ${predictionDurationMinutes} minutes (${predictionDuration} seconds)`);
            console.log(`Current timestamp: ${Math.floor(Date.now() / 1000)}, Expected deadline: ${Math.floor(Date.now() / 1000) + predictionDuration}`);
            const tx = await this.contract.createEvent(name, outcomes, predictionDuration);
            const receipt = await tx.wait();

            // Find the EventCreated event to get the event ID.
            const eventCreatedEvent = receipt.events.find(e => e.event === 'EventCreated');
            return eventCreatedEvent ? eventCreatedEvent.args.eventId.toNumber() : null;
        } catch (error) {
            console.error('Failed to create event:', error);
            throw error;
        }
    }

    async makePrediction(eventId, outcomeIndex, predictionAmount) {
        try {
            const tx = await this.contract.makePrediction(eventId, outcomeIndex, {
                value: ethers.utils.parseEther(predictionAmount.toString())
            });
            return await tx.wait();
        } catch (error) {
            console.error('Failed to make prediction:', error);
            throw error;
        }
    }

    async resolveEvent(eventId, winningOutcomeIndex) {
        try {
            const tx = await this.contract.resolveEvent(eventId, winningOutcomeIndex);
            return await tx.wait();
        } catch (error) {
            console.error('Failed to resolve event:', error);
            throw error;
        }
    }

    async cancelEvent(eventId) {
        try {
            const tx = await this.contract.cancelEvent(eventId);
            return await tx.wait();
        } catch (error) {
            console.error('Failed to cancel event:', error);
            throw error;
        }
    }

    async getCreatorFeeBalance(creatorAddress = null) {
        try {
            const address = creatorAddress || this.userAddress;
            const balance = await this.contract.getCreatorFeeBalance(address);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('Failed to get creator fee balance:', error);
            return '0';
        }
    }

    async withdrawCreatorFees() {
        try {
            const tx = await this.contract.withdrawCreatorFees();
            return await tx.wait();
        } catch (error) {
            console.error('Failed to withdraw creator fees:', error);
            throw error;
        }
    }

    async claimPayout(eventId) {
        try {
            const tx = await this.contract.claimPayout(eventId);
            return await tx.wait();
        } catch (error) {
            console.error('Failed to claim payout:', error);
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
                predictionDeadline: details[3].toNumber(),
                isResolved: details[4],
                isCancelled: details[5],
                winningOutcome: details[6].toNumber(),
                totalPoolAmount: ethers.utils.formatEther(details[7]),
                resolvedTimestamp: details[8].toNumber(),
                unclaimedWinningsCollected: details[9]
            };
        } catch (error) {
            console.error('Failed to get event details:', error);
            return null;
        }
    }

    async getPoolAmount(eventId, outcomeIndex) {
        try {
            const amount = await this.contract.getPoolAmount(eventId, outcomeIndex);
            return ethers.utils.formatEther(amount);
        } catch (error) {
            console.error('Failed to get pool amount:', error);
            return '0';
        }
    }

    async getUserPrediction(eventId, outcomeIndex, userAddress = null) {
        try {
            const address = userAddress || this.userAddress;
            const prediction = await this.contract.getUserPrediction(eventId, outcomeIndex, address);
            return ethers.utils.formatEther(prediction);
        } catch (error) {
            console.error('Failed to get user prediction:', error);
            return '0';
        }
    }

    async calculatePotentialPayout(eventId, outcomeIndex, userAddress = null) {
        try {
            const address = userAddress || this.userAddress;
            const payout = await this.contract.calculatePotentialPayout(eventId, outcomeIndex, address);
            return ethers.utils.formatEther(payout);
        } catch (error) {
            console.error('Failed to calculate potential payout:', error);
            return '0';
        }
    }

    async getNextEventId() {
        try {
            const nextId = await this.contract.nextEventId();
            return nextId.toNumber();
        } catch (error) {
            console.error('Failed to get next event ID:', error);
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
            console.error('Failed to get all events:', error);
            return [];
        }
    }

    async queryFilterInBatches(filter, batchSize = 1000) {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            const allEvents = [];

            // Get deployment block from network config
            let fromBlock = 0;
            try {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const network = NetworkUtils.getNetworkByChainId(chainId);
                if (network && network.deploymentBlock !== null && network.deploymentBlock !== undefined) {
                    fromBlock = network.deploymentBlock;
                } else {
                    // Fallback: start from 100k blocks ago to avoid scanning entire chain
                    fromBlock = Math.max(0, currentBlock - 100000);
                }
            } catch (error) {
                console.warn('Could not get deployment block, using fallback', error);
                fromBlock = Math.max(0, currentBlock - 100000);
            }

            // Query in batches
            while (fromBlock <= currentBlock) {
                const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);

                try {
                    const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
                    allEvents.push(...events);
                } catch (error) {
                    console.warn(`Failed to query blocks ${fromBlock}-${toBlock}, trying smaller batch`, error);
                    // If batch fails, try with smaller batch size
                    if (batchSize > 100) {
                        const smallerBatch = await this.queryFilterInBatches(filter, Math.floor(batchSize / 2));
                        return smallerBatch;
                    }
                    throw error;
                }

                fromBlock = toBlock + 1;
            }

            return allEvents;
        } catch (error) {
            console.error('Failed to query events in batches:', error);
            // Fallback to querying without block range (may fail on some networks)
            try {
                return await this.contract.queryFilter(filter);
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
                return [];
            }
        }
    }

    async getUserPredictionsForAllEvents() {
        try {
            const events = await this.getAllEvents();
            const userPredictions = [];

            // Get PayoutClaimed events for this user in batches to avoid block range limits
            const payoutFilter = this.contract.filters.PayoutClaimed(null, this.userAddress);
            const payoutEvents = await this.queryFilterInBatches(payoutFilter);

            for (const event of events) {
                // Check if user claimed refund for cancelled event
                const refundClaimed = event.isCancelled && payoutEvents.some(pe => pe.args.eventId.toNumber() === event.id);

                // For cancelled events, we need to check all outcomes for this user
                if (event.isCancelled && !refundClaimed) {
                    // Check if user has any predictions on this event
                    let totalUserPrediction = new Decimal(0);
                    for (let i = 0; i < event.outcomes.length; i++) {
                        const amount = await this.getUserPrediction(event.id, i);
                        totalUserPrediction = totalUserPrediction.add(new Decimal(amount));
                    }

                    if (totalUserPrediction.gt(0)) {
                        // Show as single refundable entry
                        const refundEvent = payoutEvents.find(pe => pe.args.eventId.toNumber() === event.id);
                        const refundAmount = refundEvent ? ethers.utils.formatEther(refundEvent.args.amount) : '0';
                        userPredictions.push({
                            eventId: event.id,
                            eventName: event.name,
                            outcomeIndex: -1, // Special indicator for refund
                            outcomeName: 'Event Cancelled - Refund Available',
                            predictionAmount: totalUserPrediction.toString(),
                            potentialPayout: totalUserPrediction.toString(),
                            actualPayout: refundAmount,
                            isResolved: false,
                            isCancelled: true,
                            isWinner: false,
                            isClaimed: false,
                            isRefundable: true
                        });
                    }
                } else if (event.isCancelled && refundClaimed) {
                    // Show refunded status
                    const refundEvent = payoutEvents.find(pe => pe.args.eventId.toNumber() === event.id);
                    const refundAmount = refundEvent ? ethers.utils.formatEther(refundEvent.args.amount) : '0';

                    userPredictions.push({
                        eventId: event.id,
                        eventName: event.name,
                        outcomeIndex: -1, // Special indicator for refund
                        outcomeName: 'Event Cancelled - Refunded',
                        predictionAmount: 'Refunded',
                        potentialPayout: '0',
                        actualPayout: refundAmount,
                        isResolved: false,
                        isCancelled: true,
                        isWinner: false,
                        isClaimed: true,
                        isRefunded: true
                    });
                } else {
                    // Handle normal resolved/unresolved events
                    for (let outcomeIndex = 0; outcomeIndex < event.outcomes.length; outcomeIndex++) {
                        const predictionAmount = await this.getUserPrediction(event.id, outcomeIndex);
                        const isClaimed = payoutEvents.some(pe =>
                            pe.args.eventId.toNumber() === event.id &&
                            event.isResolved &&
                            event.winningOutcome === outcomeIndex
                        );

                        // Show prediction if user has/had a bet, or if they claimed from this event.
                        if (new Decimal(predictionAmount).gt(0) || isClaimed) {
                            const potentialPayout = await this.calculatePotentialPayout(event.id, outcomeIndex);

                            // For claimed predictions, get the actual payout amount from the event.
                            let actualPayout = '0';
                            if (isClaimed) {
                                const claimedEvent = payoutEvents.find(pe =>
                                    pe.args.eventId.toNumber() === event.id &&
                                    pe.args.winner === this.userAddress
                                );
                                if (claimedEvent) {
                                    actualPayout = ethers.utils.formatEther(claimedEvent.args.amount);
                                }
                            }

                            userPredictions.push({
                                eventId: event.id,
                                eventName: event.name,
                                outcomeIndex,
                                outcomeName: event.outcomes[outcomeIndex],
                                predictionAmount: isClaimed && new Decimal(predictionAmount).eq(0) ? 'Claimed' : predictionAmount,
                                potentialPayout,
                                actualPayout,
                                isResolved: event.isResolved,
                                isCancelled: false,
                                isWinner: event.isResolved && event.winningOutcome === outcomeIndex,
                                isClaimed: isClaimed
                            });
                        }
                    }
                }
            }

            return userPredictions;
        } catch (error) {
            console.error('Failed to get user predictions:', error);
            return [];
        }
    }

    formatTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleString();
    }

    isEventOpen(predictionDeadline) {
        return Date.now() < (predictionDeadline * 1000);
    }
}

// Global contract instance
const winCoinsContract = new WinCoinsContract();