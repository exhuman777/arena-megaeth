/**
 * MegaETH Integration for Arena Survival V2
 * King of the Hill mechanics - pay to play, top player earns!
 * Uses eth_sendRawTransactionSync (EIP-7966) for instant receipts
 */

const MegaETH = {
  // Chain configuration
  config: {
    testnet: {
      chainId: 6343,
      chainIdHex: '0x18c7',
      rpc: 'https://carrot.megaeth.com/rpc',
      explorer: 'https://megaeth-testnet-v2.blockscout.com',
      name: 'MegaETH Testnet'
    },
    mainnet: {
      chainId: 4326,
      chainIdHex: '0x10e6',
      rpc: 'https://mainnet.megaeth.com/rpc',
      explorer: 'https://mega.etherscan.io',
      name: 'MegaETH Mainnet'
    }
  },

  // Current network (default testnet)
  network: 'testnet',

  // V2 Contract address
  leaderboardAddress: '0x01acFE50012710202B916886f86100c416578BA7',

  // Entry fee
  ENTRY_FEE: '0.0001',

  // V2 Contract ABI
  leaderboardABI: [
    'function submitScore(uint32 score, uint32 wave, uint32 kills, bytes16 name) external payable',
    'function getTopScores(uint256 count) external view returns (tuple(address player, uint32 score, uint32 wave, uint32 kills, uint32 timestamp, bytes16 name)[])',
    'function wouldMakeLeaderboard(uint32 score) external view returns (bool)',
    'function getEntryFee() external pure returns (uint256)',
    'function getStats() external view returns (uint256 prizePool, uint256 totalGames, uint256 entryCount, uint256 entryFee)',
    'function getKingInfo() external view returns (address king, uint256 score, uint256 earnings)',
    'function getEarnings(address player) external view returns (uint256 pending, uint256 total)',
    'function withdraw() external'
  ],

  // Provider state
  provider: null,
  signer: null,
  contract: null,
  account: null,
  usePrivy: false, // Flag for Privy vs MetaMask

  /**
   * Initialize MegaETH connection
   */
  async init(network = 'testnet', contractAddress = null) {
    this.network = network;
    if (contractAddress) {
      this.leaderboardAddress = contractAddress;
    }

    // Listen for Privy connection
    window.addEventListener('privy-connected', async (e) => {
      console.log('MegaETH: Privy wallet connected', e.detail.address);
      this.usePrivy = true;
      await this.connectPrivy();
    });

    // Check if Privy wallet is already available
    if (window.PrivyWallet) {
      console.log('MegaETH: Privy wallet detected');
      this.usePrivy = true;
      return true;
    }

    // Check if any browser wallet is available
    const provider = this.getProvider();
    if (!provider) {
      console.log('MegaETH: No wallet detected');
      return false;
    }

    console.log('MegaETH: Wallet detected', provider.isMetaMask ? 'MetaMask' : 'Other');
    return true; // Don't auto-connect, wait for user click
  },

  /**
   * Connect using Privy wallet
   */
  async connectPrivy() {
    if (!window.PrivyWallet) {
      throw new Error('Privy wallet not available');
    }

    try {
      this.provider = window.PrivyWallet.provider;
      this.signer = await window.PrivyWallet.getSigner();
      this.account = window.PrivyWallet.address;

      // Set up contract
      if (this.leaderboardAddress) {
        this.contract = new ethers.Contract(
          this.leaderboardAddress,
          this.leaderboardABI,
          this.signer
        );
      }

      console.log('MegaETH: Connected via Privy to', this.config[this.network].name);
      this.updateUI();
      return true;
    } catch (error) {
      console.error('MegaETH: Privy connection error', error);
      throw error;
    }
  },

  /**
   * Get the correct ethereum provider (handles multiple wallets)
   */
  getProvider() {
    try {
      // If multiple wallets, find MetaMask specifically
      if (window.ethereum?.providers?.length) {
        const metamask = window.ethereum.providers.find(p => p.isMetaMask && !p.isRabby);
        if (metamask) return metamask;
      }
      // Single wallet or MetaMask is the only one
      if (window.ethereum?.isMetaMask) {
        return window.ethereum;
      }
      // Fallback to whatever is available
      return window.ethereum || null;
    } catch (e) {
      console.log('MegaETH: Error getting provider', e);
      return null;
    }
  },

  /**
   * Wait for ethereum to be available
   */
  async waitForEthereum(timeout = 3000) {
    return new Promise((resolve) => {
      if (this.getProvider()) {
        resolve(this.getProvider());
        return;
      }

      let waited = 0;
      const interval = setInterval(() => {
        waited += 100;
        const provider = this.getProvider();
        if (provider) {
          clearInterval(interval);
          resolve(provider);
        } else if (waited >= timeout) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
  },

  /**
   * Connect wallet (call on button click)
   */
  async connect() {
    // Wait a bit for MetaMask to inject
    let ethereum = await this.waitForEthereum();

    if (!ethereum) {
      throw new Error('No wallet detected. Install MetaMask!');
    }

    try {
      // Use ethers.js BrowserProvider which handles detection better
      console.log('MegaETH: Creating BrowserProvider...');
      this.provider = new ethers.BrowserProvider(ethereum);

      // This triggers the MetaMask popup
      console.log('MegaETH: Requesting accounts...');
      this.signer = await this.provider.getSigner();
      this.account = await this.signer.getAddress();

      console.log('MegaETH: Got account', this.account);
      this.ethereum = ethereum;

      // Check network
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      const targetChainId = this.config[this.network].chainId;
      console.log('MegaETH: Current chain', chainId, 'target', targetChainId);

      if (chainId !== targetChainId) {
        await this.switchNetwork();
        // Recreate provider after switch
        this.provider = new ethers.BrowserProvider(ethereum);
        this.signer = await this.provider.getSigner();
      }

      // Set up contract
      if (this.leaderboardAddress) {
        this.contract = new ethers.Contract(
          this.leaderboardAddress,
          this.leaderboardABI,
          this.signer
        );
      }

      // Listen for account changes
      ethereum.on('accountsChanged', (accs) => {
        this.account = accs[0];
        this.updateUI();
      });

      console.log('MegaETH: Connected to', this.config[this.network].name);
      this.updateUI();
      return true;
    } catch (innerError) {
      console.error('MegaETH: Connection error', innerError);
      throw innerError;
    }
  },

  /**
   * Switch to MegaETH network
   */
  async switchNetwork() {
    const cfg = this.config[this.network];
    const ethereum = this.ethereum || this.getProvider();

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: cfg.chainIdHex }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: cfg.chainIdHex,
            chainName: cfg.name,
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [cfg.rpc],
            blockExplorerUrls: [cfg.explorer]
          }]
        });
      } else {
        throw switchError;
      }
    }
  },

  /**
   * Submit score - COSTS 0.0001 ETH
   * 70% pool, 20% to king, 10% to house
   */
  async submitScore(score, wave, kills, playerName) {
    if (!this.contract || !this.signer) {
      throw new Error('Not connected to MegaETH');
    }

    // Pack player name as bytes16
    const nameBytes = ethers.encodeBytes32String(playerName.slice(0, 16)).slice(0, 34);

    // Send with entry fee
    const tx = await this.contract.submitScore(
      score,
      wave,
      kills,
      nameBytes,
      { value: ethers.parseEther(this.ENTRY_FEE) }
    );

    const receipt = await tx.wait();
    console.log('MegaETH: Score submitted!', receipt);
    return receipt;
  },

  /**
   * Get game stats
   */
  async getStats() {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getStats', []);

    const response = await fetch(cfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: this.leaderboardAddress, data }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    const decoded = iface.decodeFunctionResult('getStats', result.result);
    return {
      prizePool: ethers.formatEther(decoded[0]),
      totalGames: Number(decoded[1]),
      entryCount: Number(decoded[2]),
      entryFee: ethers.formatEther(decoded[3])
    };
  },

  /**
   * Get current king info
   */
  async getKingInfo() {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getKingInfo', []);

    const response = await fetch(cfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: this.leaderboardAddress, data }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    const decoded = iface.decodeFunctionResult('getKingInfo', result.result);
    return {
      king: decoded[0],
      score: Number(decoded[1]),
      earnings: ethers.formatEther(decoded[2])
    };
  },

  /**
   * Get player earnings
   */
  async getEarnings(address) {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getEarnings', [address]);

    const response = await fetch(cfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: this.leaderboardAddress, data }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    const decoded = iface.decodeFunctionResult('getEarnings', result.result);
    return {
      pending: ethers.formatEther(decoded[0]),
      total: ethers.formatEther(decoded[1])
    };
  },

  /**
   * Withdraw earnings
   */
  async withdraw() {
    if (!this.contract) throw new Error('Not connected');
    const tx = await this.contract.withdraw();
    return await tx.wait();
  },

  /**
   * Get top scores from leaderboard
   */
  async getTopScores(count = 10) {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getTopScores', [count]);

    const response = await fetch(cfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: this.leaderboardAddress, data }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    const decoded = iface.decodeFunctionResult('getTopScores', result.result);
    return decoded[0].map(entry => ({
      player: entry.player,
      score: Number(entry.score),
      wave: Number(entry.wave),
      kills: Number(entry.kills),
      timestamp: Number(entry.timestamp),
      name: this._decodeName(entry.name)
    }));
  },

  /**
   * Check if score would make leaderboard
   */
  async wouldMakeLeaderboard(score) {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('wouldMakeLeaderboard', [score]);

    const response = await fetch(cfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: this.leaderboardAddress, data }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) return true;

    const decoded = iface.decodeFunctionResult('wouldMakeLeaderboard', result.result);
    return decoded[0];
  },

  /**
   * Decode bytes16 name
   */
  _decodeName(nameBytes) {
    try {
      const padded = nameBytes + '0'.repeat(66 - nameBytes.length);
      return ethers.decodeBytes32String(padded).replace(/\0/g, '');
    } catch {
      return 'Anon';
    }
  },

  /**
   * Format address for display
   */
  formatAddress(address) {
    if (!address || address === '0x0000000000000000000000000000000000000000') return 'None';
    return address.slice(0, 6) + '...' + address.slice(-4);
  },

  /**
   * Get explorer URL for address
   */
  getExplorerUrl(address) {
    const cfg = this.config[this.network];
    return `${cfg.explorer}/address/${address}`;
  },

  /**
   * Update UI status
   */
  updateUI() {
    const status = document.getElementById('megaeth-status');
    if (!status) return;

    if (this.account) {
      status.innerHTML = `<span style="color:#0f0">● ${this.formatAddress(this.account)}</span> | <span style="color:#ff0">Fee: ${this.ENTRY_FEE} ETH</span>`;
    } else {
      status.innerHTML = `<button onclick="MegaETH.connect().catch(e=>alert(e.message))" style="background:#f33;border:none;color:#fff;padding:4px 12px;cursor:pointer;font-family:monospace;">Connect Wallet</button> <span style="color:#888">to compete on-chain</span>`;
    }
  }
};

// Auto-init on load
window.addEventListener('load', () => {
  MegaETH.init('testnet');
  MegaETH.updateUI();
});
