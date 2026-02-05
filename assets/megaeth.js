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

  // V3 Contract address (deploy and update this)
  leaderboardAddress: '0x01acFE50012710202B916886f86100c416578BA7', // TODO: Update after V3 deploy

  // Entry fee - 0.001 ETH per game
  ENTRY_FEE: '0.001',

  // V3 Contract ABI - Daily prize pool mechanics
  leaderboardABI: [
    'function playGame(uint32 score, uint32 wave, uint32 kills, bytes16 name) external payable',
    'function getTopScores(uint256 count) external view returns (tuple(address player, uint32 score, uint32 wave, uint32 kills, uint32 timestamp, bytes16 name)[])',
    'function wouldMakeLeaderboard(uint32 score) external view returns (bool)',
    'function getEntryFee() external pure returns (uint256)',
    'function getStats() external view returns (uint256 prizePool, uint256 totalGames, uint256 entries, uint256 entryFee)',
    'function getCurrentEpoch() external view returns (uint256 epochId, uint256 startTime, uint256 timeRemaining, uint256 prizePool, address currentLeader, uint32 topScore)',
    'function getEpoch(uint256 epochId) external view returns (tuple(uint256 startTime, uint256 endTime, uint256 prizePool, address winner, uint32 winningScore, bool claimed))',
    'function getPlayerStats(address player) external view returns (uint256 gamesPlayed, uint256 totalEarnings, uint256 bestScoreRank)',
    'function claimPrize(uint256 epochId) external',
    'function endEpoch() external'
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
   * Submit score - COSTS 0.001 ETH
   * 95% goes to daily prize pool, 5% house fee
   * Top player at end of 24h epoch wins the pool
   */
  async submitScore(score, wave, kills, playerName) {
    if (!this.contract || !this.signer) {
      throw new Error('Not connected to MegaETH');
    }

    // Pack player name as bytes16
    const nameBytes = ethers.encodeBytes32String(playerName.slice(0, 16)).slice(0, 34);

    // Send with entry fee (0.001 ETH)
    const tx = await this.contract.playGame(
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
   * Get current epoch info (daily prize pool)
   */
  async getCurrentEpoch() {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getCurrentEpoch', []);

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

    const decoded = iface.decodeFunctionResult('getCurrentEpoch', result.result);
    return {
      epochId: Number(decoded[0]),
      startTime: Number(decoded[1]),
      timeRemaining: Number(decoded[2]),
      prizePool: ethers.formatEther(decoded[3]),
      currentLeader: decoded[4],
      topScore: Number(decoded[5])
    };
  },

  /**
   * Claim prize for a completed epoch
   */
  async claimPrize(epochId) {
    if (!this.contract) throw new Error('Not connected');
    const tx = await this.contract.claimPrize(epochId);
    return await tx.wait();
  },

  /**
   * Get player stats
   */
  async getPlayerStats(address) {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getPlayerStats', [address]);

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

    const decoded = iface.decodeFunctionResult('getPlayerStats', result.result);
    return {
      gamesPlayed: Number(decoded[0]),
      totalEarnings: ethers.formatEther(decoded[1]),
      bestScoreRank: Number(decoded[2])
    };
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
   * Format time remaining as HH:MM:SS
   */
  formatTimeRemaining(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
  async updateUI() {
    const status = document.getElementById('megaeth-status');
    if (!status) return;

    if (this.account) {
      // Try to get epoch info
      let epochInfo = '';
      try {
        const epoch = await this.getCurrentEpoch();
        const timeLeft = this.formatTimeRemaining(epoch.timeRemaining);
        epochInfo = ` | <span style="color:#0ff">Pool: ${parseFloat(epoch.prizePool).toFixed(4)} ETH</span> | <span style="color:#f0f">Ends: ${timeLeft}</span>`;
      } catch (e) {
        console.log('Could not fetch epoch info:', e);
      }

      status.innerHTML = `<span style="color:#0f0">● ${this.formatAddress(this.account)}</span> | <span style="color:#ff0">Fee: ${this.ENTRY_FEE} ETH</span>${epochInfo}`;
    } else {
      status.innerHTML = `<button onclick="MegaETH.connect().catch(e=>alert(e.message))" style="background:#f33;border:none;color:#fff;padding:4px 12px;cursor:pointer;font-family:monospace;">Connect Wallet</button> <span style="color:#888">to compete on-chain (0.001 ETH/game, daily prizes!)</span>`;
    }
  }
};

// Auto-init on load
window.addEventListener('load', () => {
  MegaETH.init('testnet');
  MegaETH.updateUI();
});
