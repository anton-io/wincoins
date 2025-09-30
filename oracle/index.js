const { ethers } = require("ethers");
const fs = require("fs");
const OpenAI = require("openai");
require("dotenv").config();

class WinCoinsOracle {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(
      process.env.ORACLE_PRIVATE_KEY,
      this.provider
    );

    const contractABI = JSON.parse(
      fs.readFileSync("./WinCoins.json", "utf8")
    ).abi;
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      this.wallet
    );

    this.pollInterval = parseInt(process.env.POLL_INTERVAL) || 30000;
    this.oracleName = process.env.ORACLE_NAME || "default-oracle";

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`🔮 WinCoins AI Oracle Service Started`);
    console.log(`📡 RPC URL: ${process.env.RPC_URL}`);
    console.log(`📝 Contract: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`⏰ Poll Interval: ${this.pollInterval}ms`);
    console.log(`🏷️  Oracle Name: ${this.oracleName}`);
  }

  async init() {
    try {
      console.log(`✅ Oracle ${this.wallet.address} is ready to resolve events`);

      const network = await this.provider.getNetwork();
      console.log(
        `🌐 Connected to network: ${network.name} (chainId: ${network.chainId})`
      );
    } catch (error) {
      console.error("❌ Initialization failed:", error.message);
      process.exit(1);
    }
  }

  async getUnresolvedEvents() {
    try {
      const nextEventId = await this.contract.nextEventId();
      const unresolvedEvents = [];

      for (let i = 0; i < nextEventId.toNumber(); i++) {
        const eventDetails = await this.contract.getEventDetails(i);
        const [
          name,
          outcomes,
          creator,
          oracle,
          predictionDeadline,
          isResolved,
          isCancelled,
        ] = eventDetails;

        // Check if this oracle should handle this event and it's ready to resolve
        if (
          oracle === this.wallet.address &&
          !isResolved &&
          !isCancelled &&
          Date.now() > predictionDeadline.toNumber() * 1000
        ) {
          unresolvedEvents.push({
            id: i,
            name,
            outcomes,
            creator,
            predictionDeadline: new Date(predictionDeadline.toNumber() * 1000),
          });
        }
      }

      return unresolvedEvents;
    } catch (error) {
      console.error("❌ Error fetching unresolved events:", error.message);
      return [];
    }
  }

  async resolveEvent(eventId, eventData) {
    try {
      console.log(`🎯 Resolving event ${eventId}: "${eventData.name}"`);
      console.log(`📊 Outcomes: ${eventData.outcomes.join(", ")}`);

      // AI-powered resolution logic
      const winningOutcome = await this.getAIResolution(eventData);

      console.log(
        `🏆 Selected outcome ${winningOutcome}: "${eventData.outcomes[winningOutcome]}"`
      );

      // Estimate gas before sending transaction
      const gasEstimate = await this.contract.estimateGas.resolveEvent(
        eventId,
        winningOutcome
      );
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

      const tx = await this.contract.resolveEvent(eventId, winningOutcome, {
        gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
      });

      console.log(`📤 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(
        `✅ Event ${eventId} resolved in block ${receipt.blockNumber}`
      );
      return receipt;
    } catch (error) {
      console.error(`❌ Failed to resolve event ${eventId}:`, error.message);
      throw error;
    }
  }

  async getAIResolution(eventData) {
    try {
      console.log(`🤖 Using AI to resolve event: "${eventData.name}"`);
      
      const prompt = `You are an AI oracle for a prediction market. You need to determine the outcome of a prediction event.

Event Title: "${eventData.name}"
Event Created: ${eventData.predictionDeadline.toISOString()}
Possible Outcomes: ${eventData.outcomes.map((outcome, i) => `${i}: ${outcome}`).join(', ')}

Please analyze this event and determine which outcome is most likely to be correct based on:
1. Current real-world information and trends
2. Logical reasoning about the event
3. Available public data and common knowledge

Respond ONLY with the number (index) of the correct outcome. For example, if outcome 1 is correct, respond with just "1".

Important: You must respond with only a single number corresponding to the outcome index.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise AI oracle that responds only with the outcome index number."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      const aiResponse = response.choices[0].message.content.trim();
      console.log(`🤖 AI Response: "${aiResponse}"`);
      
      // Parse the response to get the outcome index
      const outcomeIndex = parseInt(aiResponse);
      
      // Validate the outcome index
      if (isNaN(outcomeIndex) || outcomeIndex < 0 || outcomeIndex >= eventData.outcomes.length) {
        console.log(`⚠️  AI response "${aiResponse}" is invalid, falling back to random selection`);
        return Math.floor(Math.random() * eventData.outcomes.length);
      }
      
      console.log(`✅ AI selected outcome ${outcomeIndex}: "${eventData.outcomes[outcomeIndex]}"`);
      return outcomeIndex;
      
    } catch (error) {
      console.error(`❌ AI resolution failed:`, error.message);
      console.log(`🎲 Falling back to random selection`);
      return Math.floor(Math.random() * eventData.outcomes.length);
    }
  }

  async poll() {
    console.log(`🔍 Polling for unresolved events...`);

    try {
      const unresolvedEvents = await this.getUnresolvedEvents();

      if (unresolvedEvents.length === 0) {
        console.log(`📭 No unresolved events found`);
        return;
      }

      console.log(`📋 Found ${unresolvedEvents.length} events to resolve`);

      for (const event of unresolvedEvents) {
        try {
          await this.resolveEvent(event.id, event);

          // Add delay between resolutions to avoid nonce issues
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(
            `⚠️  Skipping event ${event.id} due to error:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("❌ Polling error:", error.message);
    }
  }

  start() {
    console.log(`🚀 Starting oracle polling every ${this.pollInterval}ms`);

    // Initial poll
    this.poll();

    // Set up recurring polling
    setInterval(() => {
      this.poll();
    }, this.pollInterval);
  }

}

module.exports = { WinCoinsOracle };

// Run as standalone service if executed directly
if (require.main === module) {
  const oracle = new WinCoinsOracle();

  oracle
    .init()
    .then(() => {
      oracle.start();
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Oracle service shutting down...");
    process.exit(0);
  });
}
