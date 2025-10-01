class WinCoinsBettingWidget {
  constructor() {
    this.currentEvent = null;
    this.widget = null;
    this.countdownInterval = null;
    this.isVisible = false;

    this.init();
  }

  init() {
    this.setupMessageListener();
    this.requestActiveEvents();
    console.log("WinCoins content script loaded on", window.location.hostname);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case "NEW_EVENT":
          this.showNewEvent(message.data);
          break;
        case "POOL_UPDATE":
          this.updatePools(message.data);
          break;
      }
    });
  }

  async requestActiveEvents() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_ACTIVE_EVENTS",
      });
      if (response && response.events && response.events.length > 0) {
        // Show the most recent active event
        const latestEvent = response.events[response.events.length - 1];
        this.showNewEvent(latestEvent);
      }
    } catch (error) {
      console.log("No active events or service worker not ready");
    }
  }

  showNewEvent(eventData) {
    // Don't show if we already have this event visible
    if (this.currentEvent && this.currentEvent.eventId === eventData.eventId)
      return;

    const now = Math.floor(Date.now() / 1000);
    const deadline = parseInt(eventData.predictionDeadline);

    // Don't show if event has already expired
    if (deadline <= now) return;

    this.currentEvent = eventData;
    this.createWidget();
    this.startCountdown();
  }

  createWidget() {
    console.log(
      "🏗️ Creating betting widget for event:",
      this.currentEvent.name
    );

    // Remove existing widget if any
    this.removeWidget();

    const widget = document.createElement("div");
    widget.id = "wincoins-betting-widget";
    widget.innerHTML = this.getWidgetHTML();

    console.log(
      "🏗️ Widget HTML created, outcomes:",
      this.currentEvent.outcomes
    );

    // Inject into page - for MVP just append to body
    document.body.appendChild(widget);
    console.log("🏗️ Widget injected into page");

    this.widget = widget;
    this.isVisible = true;

    // Setup event listeners
    this.setupWidgetEventListeners();

    // Animate in
    setTimeout(() => {
      widget.classList.add("show");
      console.log("✨ Widget animation started");
    }, 100);
  }

  getWidgetHTML() {
    const event = this.currentEvent;
    const outcomes = event.outcomes || [];

    let outcomesHTML = outcomes
      .map((outcome, index) => {
        const percentage = event.poolPercentages
          ? event.poolPercentages[index]
          : "0";
        return `
        <div class="outcome" data-outcome="${index}">
          <span class="outcome-name">${outcome}</span>
          <span class="outcome-percentage">${percentage}%</span>
        </div>
      `;
      })
      .join("");

    return `
      <div class="widget-header">
        <div class="event-title">🎯 ${event.name}</div>
        <button class="close-btn" id="close-widget">×</button>
      </div>
      
      <div class="countdown-container">
        <div class="countdown-bar">
          <div class="countdown-fill" id="countdown-fill"></div>
        </div>
        <div class="countdown-text" id="countdown-text">Loading...</div>
      </div>
      
      <div class="outcomes-container">
        ${outcomesHTML}
      </div>
      
      <div class="bet-controls">
        <div class="bet-amounts">
          <button class="bet-btn" data-amount="0.01">0.01 CELO</button>
          <button class="bet-btn" data-amount="0.05">0.05 CELO</button>
          <button class="bet-btn" data-amount="0.1">0.1 CELO</button>
        </div>
        <div class="selected-outcome" id="selected-outcome">Select an outcome</div>
        <button class="place-bet-btn" id="place-bet" disabled>Place Bet</button>
      </div>
    `;
  }

  setupWidgetEventListeners() {
    console.log("🔧 Setting up widget event listeners");
    const widget = this.widget;
    let selectedOutcome = null;
    let selectedAmount = null;

    // Close button
    const closeBtn = widget.querySelector("#close-widget");
    console.log("🔧 Close button found:", !!closeBtn);
    closeBtn.addEventListener("click", () => {
      console.log("❌ Close button clicked");
      this.hideWidget();
    });

    // Outcome selection
    const outcomes = widget.querySelectorAll(".outcome");
    console.log("🔧 Outcome elements found:", outcomes.length);
    outcomes.forEach((outcomeEl, index) => {
      outcomeEl.addEventListener("click", () => {
        console.log(
          "🎯 Outcome clicked:",
          index,
          this.currentEvent.outcomes[index]
        );

        // Remove previous selection
        widget
          .querySelectorAll(".outcome")
          .forEach((el) => el.classList.remove("selected"));

        // Select this outcome
        outcomeEl.classList.add("selected");
        selectedOutcome = index;

        // Update UI
        widget.querySelector("#selected-outcome").textContent =
          this.currentEvent.outcomes[index];
        this.updatePlaceBetButton(selectedOutcome, selectedAmount);

        console.log("🎯 Selected outcome:", selectedOutcome);
      });
    });

    // Amount selection
    const betBtns = widget.querySelectorAll(".bet-btn");
    console.log("🔧 Bet amount buttons found:", betBtns.length);
    betBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        console.log("💰 Amount button clicked:", btn.dataset.amount);

        // Remove previous selection
        widget
          .querySelectorAll(".bet-btn")
          .forEach((el) => el.classList.remove("selected"));

        // Select this amount
        btn.classList.add("selected");
        selectedAmount = btn.dataset.amount;

        this.updatePlaceBetButton(selectedOutcome, selectedAmount);

        console.log("💰 Selected amount:", selectedAmount);
      });
    });

    // Place bet
    const placeBetBtn = widget.querySelector("#place-bet");
    console.log("🔧 Place bet button found:", !!placeBetBtn);
    placeBetBtn.addEventListener("click", async () => {
      console.log("🚀 Place bet button clicked!");
      console.log(
        "🚀 Current selections - Outcome:",
        selectedOutcome,
        "Amount:",
        selectedAmount
      );

      if (selectedOutcome !== null && selectedAmount) {
        console.log("🚀 Starting bet placement...");
        await this.placeBet(selectedOutcome, selectedAmount);
      } else {
        console.log("❌ Cannot place bet - missing selection:", {
          outcome: selectedOutcome,
          amount: selectedAmount,
        });
      }
    });

    console.log("✅ All event listeners attached");
  }

  updatePlaceBetButton(outcome, amount) {
    const btn = this.widget.querySelector("#place-bet");
    if (outcome !== null && amount) {
      btn.disabled = false;
      btn.textContent = `Bet ${amount} CELO`;
    } else {
      btn.disabled = true;
      btn.textContent = "Place Bet";
    }
  }

  async placeBet(outcomeIndex, amount) {
    console.log("💸 placeBet called with:", { outcomeIndex, amount });

    try {
      // Send bet request to background script (which will execute in MAIN world)
      console.log("🚀 Sending bet request to background script...");
      
      const betResult = await chrome.runtime.sendMessage({
        type: "EXECUTE_BET",
        data: {
          eventId: this.currentEvent.eventId,
          outcomeIndex: outcomeIndex,
          amount: amount,
        },
      });

      console.log("📨 Received response from background:", betResult);

      if (!betResult) {
        throw new Error("No response from background script");
      }

      if (!betResult.success) {
        throw new Error(betResult.error || "Unknown error from background script");
      }

      console.log("✅ Bet executed successfully:", betResult.txHash);

      // Show confirmation
      this.showBetConfirmation(betResult.txHash);

      // Don't auto-hide widget after successful bet
      // User can manually close it if they want

    } catch (error) {
      console.error("❌ Error placing bet:", error);
      console.error("❌ Error details:", error);
      alert("Failed to place bet: " + (error.message || error));
    }
  }

  showBetConfirmation(txHash) {
    const confirmationEl = document.createElement("div");
    confirmationEl.className = "bet-confirmation";
    confirmationEl.innerHTML = `
      <div>✅ Bet placed!</div>
      <div class="tx-hash">TX: ${txHash.substring(0, 10)}...</div>
    `;

    this.widget.appendChild(confirmationEl);
  }

  updatePools(data) {
    if (
      !this.isVisible ||
      !this.currentEvent ||
      this.currentEvent.eventId !== data.eventId
    )
      return;

    // Update percentages in the widget
    const outcomes = this.widget.querySelectorAll(".outcome");
    outcomes.forEach((outcome, index) => {
      const percentageEl = outcome.querySelector(".outcome-percentage");
      if (percentageEl && data.poolPercentages[index]) {
        percentageEl.textContent = `${data.poolPercentages[index]}%`;
      }
    });
  }

  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);

    this.updateCountdown();
  }

  updateCountdown() {
    if (!this.currentEvent || !this.widget) return;

    const now = Math.floor(Date.now() / 1000);
    const deadline = parseInt(this.currentEvent.predictionDeadline);
    const timeLeft = deadline - now;

    if (timeLeft <= 0) {
      this.hideWidget();
      return;
    }

    // Update countdown text
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const countdownText = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")} left`;

    const countdownEl = this.widget.querySelector("#countdown-text");
    if (countdownEl) {
      countdownEl.textContent = countdownText;
    }

    // Update progress bar (assuming 5 minutes max for demo)
    const totalTime = 300; // 5 minutes in seconds
    const elapsed = totalTime - timeLeft;
    const progress = Math.min((elapsed / totalTime) * 100, 100);

    const fillEl = this.widget.querySelector("#countdown-fill");
    if (fillEl) {
      fillEl.style.width = `${progress}%`;
    }
  }

  hideWidget() {
    if (this.widget) {
      this.widget.classList.remove("show");
      setTimeout(() => this.removeWidget(), 300);
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  removeWidget() {
    if (this.widget) {
      this.widget.remove();
      this.widget = null;
      this.isVisible = false;
      this.currentEvent = null;
    }
  }
}

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new WinCoinsBettingWidget();
  });
} else {
  new WinCoinsBettingWidget();
}

// Content script ready - no need to load ethers.js here!
console.log("🚀 WinCoins content script ready - MetaMask only approach");
