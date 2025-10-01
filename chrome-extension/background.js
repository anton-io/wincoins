// Load ethers.js in service worker
importScripts('ethers.min.js');

class WinCoinsListener {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.isConnected = false;
    this.activeEvents = new Map();
    this.lastCheckedBlock = null;
    this.pollingInterval = null;
    
    // Network configurations
    this.networks = {
      localhost: {
        rpc: 'http://localhost:8545',
        contract: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        name: 'Localhost (Hardhat)'
      },
      moonbaseAlpha: {
        rpc: 'https://rpc.api.moonbase.moonbeam.network',
        contract: '0x6aE9A2b23BCd94876F555532AfD259CeA97e44a3',
        name: 'Moonbase Alpha'
      },
      celo: {
        rpc: 'https://forno.celo.org',
        contract: '0x3a7F8a6a5a6E0E5961CFe699af5C13d608440939', 
        name: 'Celo Mainnet'
      }
    };
    
    // Current network config - will be loaded from storage
    this.currentNetwork = 'celo';
    this.CONTRACT_ADDRESS = null;
    this.RPC_URL = null;
    
    this.CONTRACT_ABI = [
      "function createEvent(string memory name, string[] memory outcomes, uint256 predictionDuration, address oracle) external returns (uint256)",
      "function makePrediction(uint256 eventId, uint256 outcomeIndex) external payable",
      "function resolveEvent(uint256 eventId, uint256 winningOutcomeIndex) external",
      "function cancelEvent(uint256 eventId) external",
      "function claimPayout(uint256 eventId) external",
      "function getEventDetails(uint256 eventId) external view returns (string memory name, string[] memory outcomes, address creator, address oracle, uint256 predictionDeadline, bool isResolved, bool isCancelled, uint256 winningOutcome, uint256 totalPoolAmount, uint256 resolvedTimestamp, bool unclaimedWinningsCollected)",
      "function getPoolAmount(uint256 eventId, uint256 outcomeIndex) external view returns (uint256)",
      "function getUserPrediction(uint256 eventId, uint256 outcomeIndex, address user) external view returns (uint256)",
      "function calculatePotentialPayout(uint256 eventId, uint256 outcomeIndex, address user) external view returns (uint256)",
      "function nextEventId() external view returns (uint256)",
      "event EventCreated(uint256 indexed eventId, address indexed creator, string name, string[] outcomes, uint256 predictionDeadline)",
      "event PredictionPlaced(uint256 indexed eventId, address indexed predictor, uint256 outcomeIndex, uint256 amount)",
      "event EventResolved(uint256 indexed eventId, uint256 winningOutcome)",
      "event EventCancelled(uint256 indexed eventId, address indexed creator)",
      "event PayoutClaimed(uint256 indexed eventId, address indexed winner, uint256 amount)"
    ];
    
    this.init();
  }

  async init() {
    try {
      await this.loadNetworkSettings();
      if (this.CONTRACT_ADDRESS && this.RPC_URL) {
        await this.connect();
        console.log('WinCoins listener initialized:', {
          network: this.currentNetwork,
          contract: this.CONTRACT_ADDRESS,
          rpc: this.RPC_URL
        });
      } else {
        console.log('No network configuration. Please configure in the extension popup.');
      }
    } catch (error) {
      console.error('Failed to initialize WinCoins listener:', error);
    }
  }

  async loadNetworkSettings() {
    try {
      const result = await chrome.storage.sync.get(['selectedNetwork', 'contractAddress']);
      
      // Load selected network or default to celo mainnet
      this.currentNetwork = result.selectedNetwork || 'celo';
      
      // Get network configuration
      const networkConfig = this.networks[this.currentNetwork];
      if (networkConfig) {
        this.RPC_URL = networkConfig.rpc;
        this.CONTRACT_ADDRESS = networkConfig.contract;
      } else {
        console.error('Unknown network:', this.currentNetwork);
        // Fallback to celo mainnet
        this.currentNetwork = 'celo';
        this.RPC_URL = this.networks.celo.rpc;
        this.CONTRACT_ADDRESS = this.networks.celo.contract;
      }
      
      // Save current settings
      await chrome.storage.sync.set({ 
        selectedNetwork: this.currentNetwork,
        contractAddress: this.CONTRACT_ADDRESS 
      });
      
    } catch (error) {
      console.error('Error loading network settings:', error);
      // Use celo mainnet fallback
      this.currentNetwork = 'celo';
      this.RPC_URL = this.networks.celo.rpc;
      this.CONTRACT_ADDRESS = this.networks.celo.contract;
    }
  }

  async connect() {
    try {
      console.log('🔌 Connecting to:', this.RPC_URL);
      this.provider = new ethers.providers.JsonRpcProvider(this.RPC_URL);
      
      this.contract = new ethers.Contract(this.CONTRACT_ADDRESS, this.CONTRACT_ABI, this.provider);
      this.isConnected = true;
      
      // Test the connection
      const network = await this.provider.getNetwork();
      console.log('🌐 Connected to network:', network);
      
      // Since we can't use WebSocket events, we'll poll for new events
      this.startEventPolling();
      
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      throw error;
    }
  }

  async updateContractAddress(newAddress) {
    console.log('Updating contract address to:', newAddress);
    this.CONTRACT_ADDRESS = newAddress;
    
    // Stop polling and disconnect existing connection
    this.stopEventPolling();
    if (this.provider) {
      this.provider.removeAllListeners();
    }
    
    // Clear active events
    this.activeEvents.clear();
    
    // Reconnect with new address
    await this.connect();
    
    console.log('Contract address updated and reconnected');
  }

  async switchNetwork(networkName) {
    console.log('Switching network to:', networkName);
    
    const networkConfig = this.networks[networkName];
    if (!networkConfig) {
      throw new Error(`Unknown network: ${networkName}`);
    }
    
    // Update current network settings
    this.currentNetwork = networkName;
    this.RPC_URL = networkConfig.rpc;
    this.CONTRACT_ADDRESS = networkConfig.contract;
    
    // Stop polling and disconnect existing connection
    this.stopEventPolling();
    if (this.provider) {
      this.provider.removeAllListeners();
    }
    
    // Clear active events
    this.activeEvents.clear();
    
    // Reconnect with new network
    await this.connect();
    
    console.log('Network switched successfully:', {
      network: this.currentNetwork,
      contract: this.CONTRACT_ADDRESS,
      rpc: this.RPC_URL
    });
  }

  startEventPolling() {
    console.log('🔄 Starting event polling...');
    
    // Stop any existing polling
    this.stopEventPolling();
    
    // Poll for events every 10 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForNewEvents();
      } catch (error) {
        console.error('❌ Error polling for events:', error);
      }
    }, 10000);
    
    // Also poll immediately
    this.pollForNewEvents();
  }
  
  stopEventPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ Stopped event polling');
    }
  }
  
  async pollForNewEvents() {
    try {
      if (!this.contract || !this.isConnected) return;
      
      const currentBlock = await this.provider.getBlockNumber();
      
      // If this is the first time, start from 100 blocks ago
      if (!this.lastCheckedBlock) {
        this.lastCheckedBlock = Math.max(0, currentBlock - 100);
      }
      
      // Get EventCreated events since last check
      const eventFilter = this.contract.filters.EventCreated();
      const events = await this.contract.queryFilter(eventFilter, this.lastCheckedBlock + 1, currentBlock);
      
      console.log(`📊 Checked blocks ${this.lastCheckedBlock + 1} to ${currentBlock}, found ${events.length} events`);
      
      for (const event of events) {
        await this.handleEventCreated(event);
      }
      
      // Get PredictionPlaced events since last check
      const predictionFilter = this.contract.filters.PredictionPlaced();
      const predictions = await this.contract.queryFilter(predictionFilter, this.lastCheckedBlock + 1, currentBlock);
      
      for (const prediction of predictions) {
        await this.handlePredictionPlaced(prediction);
      }
      
      this.lastCheckedBlock = currentBlock;
      
    } catch (error) {
      console.error('❌ Error in pollForNewEvents:', error);
    }
  }
  
  async handleEventCreated(event) {
    const [eventId, creator, name, outcomes, predictionDeadline] = event.args;
    
    console.log('New event created:', { eventId: eventId.toString(), name, outcomes });
    
    const eventData = {
      eventId: eventId.toString(),
      name,
      outcomes,
      predictionDeadline: predictionDeadline.toString(),
      creator,
      pools: new Array(outcomes.length).fill('0'),
      totalPool: '0'
    };
    
    // Store active event
    this.activeEvents.set(eventId.toString(), eventData);
    
    // Broadcast to all tabs
    await this.broadcastToAllTabs({
      type: 'NEW_EVENT',
      data: eventData
    });
  }
  
  async handlePredictionPlaced(event) {
    const [eventId, predictor, outcomeIndex, amount] = event.args;
    
    console.log('Prediction placed:', { 
      eventId: eventId.toString(), 
      outcomeIndex: outcomeIndex.toString(), 
      amount: ethers.utils.formatEther(amount) 
    });
    
    // Update pools for this event
    await this.updateEventPools(eventId.toString());
  }

  async updateEventPools(eventId) {
    if (!this.activeEvents.has(eventId)) return;
    
    const event = this.activeEvents.get(eventId);
    let totalPool = ethers.BigNumber.from('0');
    
    // Get current pool amounts for each outcome
    for (let i = 0; i < event.outcomes.length; i++) {
      try {
        const poolAmount = await this.contract.getPoolAmount(eventId, i);
        event.pools[i] = poolAmount.toString();
        totalPool = totalPool.add(poolAmount);
      } catch (error) {
        console.error(`Error getting pool amount for outcome ${i}:`, error);
      }
    }
    
    event.totalPool = totalPool.toString();
    
    // Calculate percentages
    const poolPercentages = event.pools.map(pool => {
      if (totalPool.isZero()) return 0;
      return (parseFloat(ethers.utils.formatEther(pool)) / parseFloat(ethers.utils.formatEther(totalPool)) * 100).toFixed(1);
    });
    
    // Broadcast pool update
    await this.broadcastToAllTabs({
      type: 'POOL_UPDATE',
      data: {
        eventId,
        pools: event.pools,
        poolPercentages,
        totalPool: event.totalPool
      }
    });
  }

  async broadcastToAllTabs(message) {
    try {
      // Only get tabs with http/https URLs (skip chrome:// and extension pages)
      const allTabs = await chrome.tabs.query({ 
        status: 'complete',
        url: ['*://*/*'] 
      });
      
      for (const tab of allTabs) {
        try {
          // Skip special pages that can't receive content scripts
          if (tab.url.startsWith('chrome://') || 
              tab.url.startsWith('chrome-extension://') ||
              tab.url.startsWith('moz-extension://') ||
              tab.url.startsWith('edge://')) {
            continue;
          }
          
          await chrome.tabs.sendMessage(tab.id, message);
        } catch (error) {
          // Silently ignore tabs that don't have content script loaded
          // This is normal for pages that just loaded or special pages
        }
      }
    } catch (error) {
      console.error('Error broadcasting to tabs:', error);
    }
  }

  // Clean up expired events
  cleanupExpiredEvents() {
    const now = Math.floor(Date.now() / 1000);
    for (const [eventId, event] of this.activeEvents) {
      if (parseInt(event.predictionDeadline) < now) {
        this.activeEvents.delete(eventId);
      }
    }
  }
}

// Initialize the listener
const winCoinsListener = new WinCoinsListener();

// Clean up expired events every minute
setInterval(() => {
  winCoinsListener.cleanupExpiredEvents();
}, 60000);

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.type);
  
  if (message.type === 'GET_CONTRACT_ADDRESS') {
    sendResponse({ contractAddress: winCoinsListener.CONTRACT_ADDRESS });
    return;
  }
  
  if (message.type === 'GET_ACTIVE_EVENTS') {
    const events = Array.from(winCoinsListener.activeEvents.values());
    sendResponse({ events });
    return;
  }
  
  if (message.type === 'CONTRACT_ADDRESS_UPDATED') {
    (async () => {
      try {
        await winCoinsListener.updateContractAddress(message.address);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error updating contract address:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'NETWORK_CHANGED') {
    (async () => {
      try {
        await winCoinsListener.switchNetwork(message.network);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error switching network:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'EXECUTE_BET') {
    console.log('🎯 Processing EXECUTE_BET request...');
    
    (async () => {
      try {
        const { eventId, outcomeIndex, amount } = message.data;
        
        console.log('🚀 Executing bet in MAIN world...', { eventId, outcomeIndex, amount });
        
        // Create contract interface to encode function call
        const contractInterface = new ethers.utils.Interface([
          "function makePrediction(uint256 eventId, uint256 outcomeIndex) payable"
        ]);
        
        // Encode function data
        const data = contractInterface.encodeFunctionData('makePrediction', [
          eventId,
          outcomeIndex
        ]);
        
        // Convert amount to wei
        const value = ethers.utils.parseEther(amount).toHexString();
        
        const transaction = {
          to: winCoinsListener.CONTRACT_ADDRESS,
          data: data,
          value: value,
        };
        
        console.log('📄 Prepared transaction:', transaction);
        console.log('📄 Target tab ID:', sender.tab?.id);
        
        if (!sender.tab?.id) {
          throw new Error('No tab ID available for script execution');
        }
        
        // Execute in MAIN world to access window.ethereum
        console.log('🌍 Injecting script into MAIN world...');
        const results = await chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          world: 'MAIN',
          func: async (txData) => {
            console.log('🌍 Executing in MAIN world, MetaMask available:', !!window.ethereum);
            
            if (!window.ethereum) {
              throw new Error('MetaMask not found in MAIN world');
            }
            
            // Request account access and get accounts
            console.log('🦊 Requesting MetaMask accounts...');
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (!accounts || accounts.length === 0) {
              throw new Error('No MetaMask accounts available');
            }
            
            // Add from address to transaction
            const txWithFrom = {
              ...txData,
              from: accounts[0]
            };
            
            console.log('💸 Sending transaction via MetaMask...', txWithFrom);
            
            // Send transaction
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [txWithFrom],
            });
            
            console.log('✅ Transaction sent:', txHash);
            return { success: true, txHash };
          },
          args: [transaction]
        });
        
        const result = results[0].result;
        console.log('✅ MAIN world execution result:', result);
        
        sendResponse({ success: true, txHash: result.txHash });
        
      } catch (error) {
        console.error('❌ Error executing bet:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service worker keepalive');
  }
});