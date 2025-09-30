// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
 * ██╗    ██╗██╗███╗   ██╗ ██████╗ ██████╗ ██╗███╗   ██╗███████╗
 * ██║    ██║██║████╗  ██║██╔════╝██╔═══██╗██║████╗  ██║██╔════╝
 * ██║ █╗ ██║██║██╔██╗ ██║██║     ██║   ██║██║██╔██╗ ██║███████╗
 * ██║███╗██║██║██║╚██╗██║██║     ██║   ██║██║██║╚██╗██║╚════██║
 * ╚███╔███╔╝██║██║ ╚████║╚██████╗╚██████╔╝██║██║ ╚████║███████║
 *  ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
 *
 * See it. Predict it. WinCoins.
 */

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WinCoins is ReentrancyGuard, Ownable {
    struct Event {
        uint256 id;
        string name;
        string[] outcomes;
        mapping(uint256 => uint256) poolAmounts;
        mapping(uint256 => mapping(address => uint256)) userPredictions;
        mapping(uint256 => address[]) poolParticipants;
        address creator;
        address oracle;
        uint256 predictionDeadline;
        uint256 winningOutcome;
        bool isResolved;
        bool isCancelled;
        bool payoutClaimed;
        uint256 totalPoolAmount;
        uint256 resolvedTimestamp;
        bool unclaimedWinningsCollected;
    }

    mapping(uint256 => Event) public events;
    uint256 public nextEventId;
    uint256 public platformFeeBalance;
    mapping(address => uint256) public creatorFeeBalances;
    mapping(address => uint256) public totalCreatorFeesEarned;

    // Track all events a user has participated in
    mapping(address => uint256[]) private userEventIds;
    mapping(address => mapping(uint256 => bool)) private userHasParticipated;

    // Track claimed payouts per user per event
    mapping(address => mapping(uint256 => bool)) public hasClaimed;
    mapping(address => mapping(uint256 => uint256)) public claimedAmount;

    // 10 years in seconds (10 * 365 * 24 * 60 * 60).
    uint256 public constant UNCLAIMED_TIMEOUT = 315360000;

    event EventCreated(
        uint256 indexed eventId,
        address indexed creator,
        string name,
        string[] outcomes,
        uint256 predictionDeadline
    );

    event PredictionPlaced(
        uint256 indexed eventId,
        address indexed predictor,
        uint256 outcomeIndex,
        uint256 amount
    );

    event EventResolved(
        uint256 indexed eventId,
        uint256 winningOutcome
    );

    event EventCancelled(
        uint256 indexed eventId,
        address indexed creator
    );

    event PayoutClaimed(
        uint256 indexed eventId,
        address indexed winner,
        uint256 amount
    );

    event PlatformFeeCollected(
        uint256 indexed eventId,
        uint256 platformFeeAmount,
        uint256 creatorFeeAmount
    );

    event PlatformFeeWithdrawn(
        address indexed owner,
        uint256 amount
    );

    event CreatorFeeWithdrawn(
        address indexed creator,
        uint256 amount
    );

    event UnclaimedWinningsCollected(
        uint256 indexed eventId,
        address indexed owner,
        uint256 amount
    );


    modifier onlyEventCreator(uint256 eventId) {
        require(events[eventId].creator == msg.sender, "Only event creator can call this");
        _;
    }

    modifier onlyEventOracle(uint256 eventId) {
        require(events[eventId].oracle == msg.sender, "Only event oracle can call this");
        _;
    }


    modifier eventExists(uint256 eventId) {
        require(eventId < nextEventId, "Event does not exist");
        _;
    }

    modifier predictionOpen(uint256 eventId) {
        require(block.timestamp < events[eventId].predictionDeadline, "Prediction period has ended");
        require(!events[eventId].isResolved, "Event already resolved");
        require(!events[eventId].isCancelled, "Event has been cancelled");
        _;
    }

    modifier eventNotCancelled(uint256 eventId) {
        require(!events[eventId].isCancelled, "Event has been cancelled");
        _;
    }

    modifier eventResolved(uint256 eventId) {
        require(events[eventId].isResolved, "Event not resolved yet");
        _;
    }

    function createEvent(
        string memory name,
        string[] memory outcomes,
        uint256 predictionDuration,
        address oracle
    ) external returns (uint256) {
        require(outcomes.length >= 2, "Must have at least 2 outcomes");
        require(predictionDuration > 0, "Prediction duration must be positive");
        
        // If oracle is zero address, use creator as oracle
        address finalOracle = oracle;
        if (oracle == address(0)) {
            finalOracle = msg.sender;
        }

        uint256 eventId = nextEventId++;
        Event storage newEvent = events[eventId];

        newEvent.id = eventId;
        newEvent.name = name;
        newEvent.outcomes = outcomes;
        newEvent.creator = msg.sender;
        newEvent.oracle = finalOracle;
        newEvent.predictionDeadline = block.timestamp + predictionDuration;
        newEvent.isResolved = false;
        newEvent.isCancelled = false;
        newEvent.payoutClaimed = false;
        newEvent.totalPoolAmount = 0;

        emit EventCreated(eventId, msg.sender, name, outcomes, newEvent.predictionDeadline);

        return eventId;
    }


    function makePrediction(uint256 eventId, uint256 outcomeIndex)
        external
        payable
        eventExists(eventId)
        predictionOpen(eventId)
        nonReentrant
    {
        require(msg.value > 0, "Prediction amount must be greater than 0");
        require(outcomeIndex < events[eventId].outcomes.length, "Invalid outcome index");

        Event storage eventData = events[eventId];

        if (eventData.userPredictions[outcomeIndex][msg.sender] == 0) {
            eventData.poolParticipants[outcomeIndex].push(msg.sender);
        }

        // Track user participation in this event
        if (!userHasParticipated[msg.sender][eventId]) {
            userEventIds[msg.sender].push(eventId);
            userHasParticipated[msg.sender][eventId] = true;
        }

        eventData.userPredictions[outcomeIndex][msg.sender] += msg.value;
        eventData.poolAmounts[outcomeIndex] += msg.value;
        eventData.totalPoolAmount += msg.value;

        emit PredictionPlaced(eventId, msg.sender, outcomeIndex, msg.value);
    }

    function cancelEvent(uint256 eventId)
        external
        eventExists(eventId)
        onlyEventCreator(eventId)
        eventNotCancelled(eventId)
        nonReentrant
    {
        require(!events[eventId].isResolved, "Cannot cancel resolved event");

        Event storage eventData = events[eventId];
        eventData.isCancelled = true;

        emit EventCancelled(eventId, msg.sender);
    }

    function resolveEvent(uint256 eventId, uint256 winningOutcomeIndex)
        external
        eventExists(eventId)
        onlyEventOracle(eventId)
        eventNotCancelled(eventId)
    {
        require(!events[eventId].isResolved, "Event already resolved");
        require(block.timestamp >= events[eventId].predictionDeadline, "Prediction period not ended");
        require(winningOutcomeIndex < events[eventId].outcomes.length, "Invalid winning outcome");

        Event storage eventData = events[eventId];

        // Calculate platform fee only on winnings (profit).
        // Winnings = total pool - winning pool (the profit made by winners).
        uint256 winningPoolAmount = eventData.poolAmounts[winningOutcomeIndex];
        uint256 totalFee = 0;
        uint256 platformFee = 0;
        uint256 creatorFee = 0;

        if (winningPoolAmount > 0 && eventData.totalPoolAmount > winningPoolAmount) {
            // Only charge fee on the profit (losing bets that go to winners)
            uint256 winnings = eventData.totalPoolAmount - winningPoolAmount;
            totalFee = (winnings * 1) / 1000; // 0.1% of winnings only.

            // Split fee 50/50 between platform and creator.
            platformFee = totalFee / 2;
            creatorFee = totalFee - platformFee; // Handle any rounding by giving remainder to creator.

            platformFeeBalance += platformFee;
            creatorFeeBalances[eventData.creator] += creatorFee;
            totalCreatorFeesEarned[eventData.creator] += creatorFee;

            // Reduce total pool amount by total fee.
            eventData.totalPoolAmount -= totalFee;
        }

        eventData.winningOutcome = winningOutcomeIndex;
        eventData.isResolved = true;
        eventData.resolvedTimestamp = block.timestamp;

        emit EventResolved(eventId, winningOutcomeIndex);
        emit PlatformFeeCollected(eventId, platformFee, creatorFee);
    }

    function claimPayout(uint256 eventId)
        external
        eventExists(eventId)
        nonReentrant
    {
        Event storage eventData = events[eventId];

        // Handle refunds for cancelled events.
        if (eventData.isCancelled) {
            _claimRefund(eventId, eventData);
            return;
        }

        // Handle normal payouts for resolved events.
        require(eventData.isResolved, "Event not resolved yet");
        _claimWinnings(eventId, eventData);
    }

    function _claimRefund(uint256 eventId, Event storage eventData) private {
        require(!hasClaimed[msg.sender][eventId], "Already claimed refund");

        uint256 totalRefund = 0;

        // Calculate total refund across all outcomes for this user
        for (uint256 i = 0; i < eventData.outcomes.length; i++) {
            uint256 userPrediction = eventData.userPredictions[i][msg.sender];
            if (userPrediction > 0) {
                totalRefund += userPrediction;
                eventData.userPredictions[i][msg.sender] = 0;
            }
        }

        require(totalRefund > 0, "No refund available");
        require(address(this).balance >= totalRefund, "Insufficient contract balance");

        // Mark as claimed.
        hasClaimed[msg.sender][eventId] = true;
        claimedAmount[msg.sender][eventId] = totalRefund;

        (bool success, ) = payable(msg.sender).call{value: totalRefund}("");
        require(success, "Refund transfer failed");

        emit PayoutClaimed(eventId, msg.sender, totalRefund);
    }

    function _claimWinnings(uint256 eventId, Event storage eventData) private {
        require(!hasClaimed[msg.sender][eventId], "Already claimed payout");

        uint256 winningOutcome = eventData.winningOutcome;
        uint256 userPrediction = eventData.userPredictions[winningOutcome][msg.sender];

        require(userPrediction > 0, "No winning prediction found");

        eventData.userPredictions[winningOutcome][msg.sender] = 0;

        uint256 winningPoolAmount = eventData.poolAmounts[winningOutcome];
        uint256 totalPoolAmount = eventData.totalPoolAmount;

        require(winningPoolAmount > 0, "No winning pool amount");

        uint256 payout = (userPrediction * totalPoolAmount) / winningPoolAmount;

        require(payout > 0, "No payout available");
        require(address(this).balance >= payout, "Insufficient contract balance");

        // Mark as claimed
        hasClaimed[msg.sender][eventId] = true;
        claimedAmount[msg.sender][eventId] = payout;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Payout transfer failed");

        emit PayoutClaimed(eventId, msg.sender, payout);
    }

    function getEventDetails(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (
            string memory name,
            string[] memory outcomes,
            address creator,
            address oracle,
            uint256 predictionDeadline,
            bool isResolved,
            bool isCancelled,
            uint256 winningOutcome,
            uint256 totalPoolAmount,
            uint256 resolvedTimestamp,
            bool unclaimedWinningsCollected
        )
    {
        Event storage eventData = events[eventId];
        return (
            eventData.name,
            eventData.outcomes,
            eventData.creator,
            eventData.oracle,
            eventData.predictionDeadline,
            eventData.isResolved,
            eventData.isCancelled,
            eventData.winningOutcome,
            eventData.totalPoolAmount,
            eventData.resolvedTimestamp,
            eventData.unclaimedWinningsCollected
        );
    }

    function getPoolAmount(uint256 eventId, uint256 outcomeIndex)
        external
        view
        eventExists(eventId)
        returns (uint256)
    {
        require(outcomeIndex < events[eventId].outcomes.length, "Invalid outcome index");
        return events[eventId].poolAmounts[outcomeIndex];
    }

    function getUserPrediction(uint256 eventId, uint256 outcomeIndex, address user)
        external
        view
        eventExists(eventId)
        returns (uint256)
    {
        require(outcomeIndex < events[eventId].outcomes.length, "Invalid outcome index");
        return events[eventId].userPredictions[outcomeIndex][user];
    }

    function getPoolParticipants(uint256 eventId, uint256 outcomeIndex)
        external
        view
        eventExists(eventId)
        returns (address[] memory)
    {
        require(outcomeIndex < events[eventId].outcomes.length, "Invalid outcome index");
        return events[eventId].poolParticipants[outcomeIndex];
    }

    function calculatePotentialPayout(uint256 eventId, uint256 outcomeIndex, address user)
        external
        view
        eventExists(eventId)
        returns (uint256)
    {
        Event storage eventData = events[eventId];
        uint256 userPrediction = eventData.userPredictions[outcomeIndex][user];

        if (userPrediction == 0) return 0;

        uint256 outcomePoolAmount = eventData.poolAmounts[outcomeIndex];
        if (outcomePoolAmount == 0) return 0;

        return (userPrediction * eventData.totalPoolAmount) / outcomePoolAmount;
    }

    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = platformFeeBalance;
        require(amount > 0, "No platform fees to withdraw");

        platformFeeBalance = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Platform fee withdrawal failed");

        emit PlatformFeeWithdrawn(owner(), amount);
    }

    function withdrawCreatorFees() external nonReentrant {
        uint256 amount = creatorFeeBalances[msg.sender];
        require(amount > 0, "No creator fees to withdraw");

        creatorFeeBalances[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Creator fee withdrawal failed");

        emit CreatorFeeWithdrawn(msg.sender, amount);
    }

    function getPlatformFeeBalance() external view returns (uint256) {
        return platformFeeBalance;
    }

    function getCreatorFeeBalance(address creator) external view returns (uint256) {
        return creatorFeeBalances[creator];
    }

    function getTotalCreatorFeesEarned(address creator) external view returns (uint256) {
        return totalCreatorFeesEarned[creator];
    }

    function collectUnclaimedWinnings(uint256 eventId)
        external
        onlyOwner
        eventExists(eventId)
        eventResolved(eventId)
        nonReentrant
    {
        Event storage eventData = events[eventId];

        require(!eventData.unclaimedWinningsCollected, "Unclaimed winnings already collected");
        require(
            block.timestamp >= eventData.resolvedTimestamp + UNCLAIMED_TIMEOUT,
            "Must wait 10 years after event resolution"
        );

        uint256 winningOutcome = eventData.winningOutcome;
        uint256 totalPoolAmount = eventData.totalPoolAmount;

        // If nobody won (no predictions on winning outcome), collect entire pool.
        if (eventData.poolAmounts[winningOutcome] == 0) {
            require(totalPoolAmount > 0, "No unclaimed winnings available");

            eventData.unclaimedWinningsCollected = true;

            (bool success, ) = payable(owner()).call{value: totalPoolAmount}("");
            require(success, "Unclaimed winnings transfer failed");

            emit UnclaimedWinningsCollected(eventId, owner(), totalPoolAmount);
            return;
        }

        // Calculate unclaimed amount by checking remaining user predictions.
        uint256 unclaimedAmount = 0;
        address[] memory participants = eventData.poolParticipants[winningOutcome];

        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 userPrediction = eventData.userPredictions[winningOutcome][participant];

            // If user still has prediction amount > 0, they haven't claimed.
            if (userPrediction > 0) {
                // Calculate what they would be entitled to claim
                uint256 userPayout = (userPrediction * totalPoolAmount) / eventData.poolAmounts[winningOutcome];
                unclaimedAmount += userPayout;

                // Clear their prediction so it can't be claimed later.
                eventData.userPredictions[winningOutcome][participant] = 0;
            }
        }

        require(unclaimedAmount > 0, "No unclaimed winnings available");
        require(address(this).balance >= unclaimedAmount, "Insufficient contract balance");

        eventData.unclaimedWinningsCollected = true;

        (bool success2, ) = payable(owner()).call{value: unclaimedAmount}("");
        require(success2, "Unclaimed winnings transfer failed");

        emit UnclaimedWinningsCollected(eventId, owner(), unclaimedAmount);
    }

    function getEventResolutionInfo(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (
            bool isResolved,
            uint256 resolvedTimestamp,
            bool canCollectUnclaimed,
            bool unclaimedWinningsCollected
        )
    {
        Event storage eventData = events[eventId];

        bool canCollect = eventData.isResolved &&
                         !eventData.unclaimedWinningsCollected &&
                         block.timestamp >= eventData.resolvedTimestamp + UNCLAIMED_TIMEOUT;

        return (
            eventData.isResolved,
            eventData.resolvedTimestamp,
            canCollect,
            eventData.unclaimedWinningsCollected
        );
    }

    // Get all event IDs that a user has participated in.
    function getUserEventIds(address user) external view returns (uint256[] memory) {
        return userEventIds[user];
    }

    // Get user's prediction details for a specific event.
    function getUserEventPredictions(address user, uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (
            uint256[] memory outcomeIndices,
            uint256[] memory amounts
        )
    {
        Event storage eventData = events[eventId];
        uint256 outcomeCount = eventData.outcomes.length;

        // First, count how many outcomes the user predicted on.
        uint256 predictionCount = 0;
        for (uint256 i = 0; i < outcomeCount; i++) {
            if (eventData.userPredictions[i][user] > 0) {
                predictionCount++;
            }
        }

        // Create arrays of the correct size.
        outcomeIndices = new uint256[](predictionCount);
        amounts = new uint256[](predictionCount);

        // Fill the arrays
        uint256 index = 0;
        for (uint256 i = 0; i < outcomeCount; i++) {
            if (eventData.userPredictions[i][user] > 0) {
                outcomeIndices[index] = i;
                amounts[index] = eventData.userPredictions[i][user];
                index++;
            }
        }

        return (outcomeIndices, amounts);
    }

    // Get claim status and amount for a user and event.
    function getUserClaimInfo(address user, uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (bool claimed, uint256 amount)
    {
        return (hasClaimed[user][eventId], claimedAmount[user][eventId]);
    }
}