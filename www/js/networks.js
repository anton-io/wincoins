// Network Configuration for WinCoins DApp
const NETWORKS = {
  // Celo Mainnet
  celo: {
    chainId: "0xa4ec", // 42220 in hex
    chainName: "Celo Mainnet",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
    rpcUrls: [
      "https://forno.celo.org",
      "https://celo-json-rpc.stakely.io",
      "https://celo.drpc.org",
      "wss://forno.celo.org/ws",
      "wss://celo.drpc.org",
    ],
    blockExplorerUrls: ["https://explorer.celo.org", "https://celoscan.io"],
    contractAddress: "0x131B0A5622640A00052E14DBB92b2f0BA1037A80",
    faucetUrl: null,
    testnet: false,
  },
  // Celo Sepolia Testnet.
  celoSepolia: {
    chainId: "0xaa044c", // 11142220 in hex.
    chainName: "Celo Sepolia",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
    rpcUrls: [
      "https://forno.celo-sepolia.celo-testnet.org",
      "https://rpc.ankr.com/celo_sepolia",
      "https://celo-sepolia.drpc.org",
      "wss://celo-sepolia.drpc.org",
    ],
    blockExplorerUrls: [
      "https://celo-sepolia.blockscout.com",
      "https://sepolia.celoscan.io",
    ],
    contractAddress: "0x1120396991A9eB527a886D4025F6E7A82471F537",
    faucetUrl: "https://faucet.celo.org/sepolia",
    testnet: true,
  },
  // Moonbeam Mainnet.
  moonbeam: {
    chainId: "0x504", // 1284 in hex.
    chainName: "Moonbeam Mainnet",
    nativeCurrency: {
      name: "Glimmer",
      symbol: "GLMR",
      decimals: 18,
    },
    rpcUrls: [
      "https://rpc.api.moonbeam.network",
      "https://moonbeam.public.blastapi.io",
      "wss://wss.api.moonbeam.network",
    ],
    blockExplorerUrls: ["https://moonscan.io"],
    contractAddress: "0x131B0A5622640A00052E14DBB92b2f0BA1037A80",
    faucetUrl: null,
    testnet: false,
  },
  // Moonbase Alpha Testnet.
  moonbaseAlpha: {
    chainId: "0x507", // 1287 in hex.
    chainName: "Moonbase Alpha",
    nativeCurrency: {
      name: "DEV",
      symbol: "DEV",
      decimals: 18,
    },
    rpcUrls: [
      "https://rpc.api.moonbase.moonbeam.network",
      "https://moonbase-alpha.public.blastapi.io",
      "wss://wss.api.moonbase.moonbeam.network",
    ],
    blockExplorerUrls: ["https://moonbase.moonscan.io"],
    contractAddress: "0x6aE9A2b23BCd94876F555532AfD259CeA97e44a3",
    faucetUrl: "https://apps.moonbeam.network/moonbase-alpha/faucet",
    testnet: true,
  },
  // Local Development.
  localhost: {
    chainId: "0x539", // 1337 in hex.
    chainName: "Hardhat Local",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["http://localhost:8545"],
    blockExplorerUrls: null,
    contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Set during deployment or web-modal.
    faucetUrl: null,
    testnet: true,
  },
};

// Network utilities.
const NetworkUtils = {
  /**
   * Get network configuration by chain ID.
   * @param {string} chainId - Chain ID in hex format (e.g., '0x1').
   * @returns {object|null} Network configuration or null if not found.
   */
  getNetworkByChainId(chainId) {
    return (
      Object.values(NETWORKS).find((network) => network.chainId === chainId) ||
      null
    );
  },

  /**
   * Get network configuration by name.
   * @param {string} name - Network name (e.g., 'mainnet', 'sepolia').
   * @returns {object|null} Network configuration or null if not found.
   */
  getNetworkByName(name) {
    return NETWORKS[name] || null;
  },

  /**
   * Get all testnet configurations.
   * @returns {object[]} Array of testnet configurations.
   */
  getTestnets() {
    return Object.entries(NETWORKS)
      .filter(([_, config]) => config.testnet)
      .map(([name, config]) => ({ name, ...config }));
  },

  /**
   * Get all mainnet configurations.
   * @returns {object[]} Array of mainnet configurations.
   */
  getMainnets() {
    return Object.entries(NETWORKS)
      .filter(([_, config]) => !config.testnet)
      .map(([name, config]) => ({ name, ...config }));
  },

  /**
   * Check if a chain ID is supported.
   * @param {string} chainId - Chain ID in hex format.
   * @returns {boolean} True if supported, false otherwise.
   */
  isSupported(chainId) {
    return this.getNetworkByChainId(chainId) !== null;
  },

  /**
   * Get current network from MetaMask.
   * @returns {Promise<object|null>} Current network configuration or null.
   */
  async getCurrentNetwork() {
    if (typeof window.ethereum === "undefined") return null;

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      return this.getNetworkByChainId(chainId);
    } catch (error) {
      console.error("Failed to get current network:", error);
      return null;
    }
  },

  /**
   * Switch to a specific network.
   * @param {string} networkName - Network name (e.g., 'mainnet', 'sepolia').
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async switchNetwork(networkName) {
    const network = this.getNetworkByName(networkName);
    if (!network) {
      console.error(`Network '${networkName}' not found`);
      return false;
    }

    if (typeof window.ethereum === "undefined") {
      console.error("MetaMask not installed");
      return false;
    }

    try {
      // Try to switch to the network.
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      });
      return true;
    } catch (switchError) {
      // If the network doesn't exist in MetaMask, add it.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.chainId,
                chainName: network.chainName,
                nativeCurrency: network.nativeCurrency,
                rpcUrls: network.rpcUrls,
                blockExplorerUrls: network.blockExplorerUrls,
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add network:", addError);
          return false;
        }
      } else {
        console.error("Failed to switch network:", switchError);
        return false;
      }
    }
  },

  /**
   * Set contract address for a specific network.
   * @param {string} networkName - Network name.
   * @param {string} contractAddress - Contract address.
   */
  setContractAddress(networkName, contractAddress) {
    if (NETWORKS[networkName]) {
      NETWORKS[networkName].contractAddress = contractAddress;
    }
  },

  /**
   * Get contract address for a specific network.
   * @param {string} networkName - Network name.
   * @returns {string|null} Contract address or null if not set.
   */
  getContractAddress(networkName) {
    const network = this.getNetworkByName(networkName);
    return network ? network.contractAddress : null;
  },
};

// Export for use in other files.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NETWORKS, NetworkUtils };
} else {
  window.NETWORKS = NETWORKS;
  window.NetworkUtils = NetworkUtils;
}
