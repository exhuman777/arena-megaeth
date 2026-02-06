/**
 * MegaETH Integration for Arena Survival V4
 * Pay-Before-Play: startGame() pays, submitScore() is free
 * Daily prize pools - top player claims after 24h epoch
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

  // V4 Contract address - deployed to MegaETH testnet
  leaderboardAddress: '0x6023678244e0E009B751e418436871dC52378946',

  // Entry fee - 0.001 ETH per game
  ENTRY_FEE: '0.001',

  // V4 Contract ABI - Pay-Before-Play with daily epochs
  leaderboardABI: [
    'function startGame() external payable',
    'function submitScore(uint32 score, uint32 wave, uint32 kills, bytes16 name) external',
    'function hasActiveGame(address player) external view returns (bool)',
    'function forfeitGame() external',
    'function claimPrize(uint256 epochId) external',
    'function endEpoch() external',
    'function withdrawHouseFees() external',
    'function getTopScores(uint256 count) external view returns (tuple(address player, uint32 score, uint32 wave, uint32 kills, uint32 timestamp, bytes16 name)[])',
    'function getCurrentEpoch() external view returns (uint256 epochId, uint256 startTime, uint256 timeRemaining, uint256 prizePool, address currentLeader, uint32 topScore)',
    'function getEpoch(uint256 epochId) external view returns (tuple(uint256 startTime, uint256 endTime, uint256 prizePool, address winner, uint32 winningScore, bool claimed))',
    'function getPlayerStats(address player) external view returns (uint256 gamesPlayed, uint256 totalEarnings, uint256 bestScoreRank)',
    'function getStats() external view returns (uint256 prizePool, uint256 totalGames, uint256 entries, uint256 entryFee)',
    'function wouldMakeLeaderboard(uint32 score) external view returns (bool)',
    'function getEntryFee() external pure returns (uint256)'
  ],

  // Provider state
  provider: null,
  signer: null,
  contract: null,
  account: null,
  usePrivy: false,

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
    return true;
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
      if (window.ethereum?.providers?.length) {
        const metamask = window.ethereum.providers.find(p => p.isMetaMask && !p.isRabby);
        if (metamask) return metamask;
      }
      if (window.ethereum?.isMetaMask) {
        return window.ethereum;
      }
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
    let ethereum = await this.waitForEthereum();

    if (!ethereum) {
      throw new Error('No wallet detected. Install MetaMask!');
    }

    try {
      console.log('MegaETH: Creating BrowserProvider...');
      this.provider = new ethers.BrowserProvider(ethereum);

      console.log('MegaETH: Requesting accounts...');
      this.signer = await this.provider.getSigner();
      this.account = await this.signer.getAddress();

      console.log('MegaETH: Got account', this.account);
      this.ethereum = ethereum;

      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      const targetChainId = this.config[this.network].chainId;
      console.log('MegaETH: Current chain', chainId, 'target', targetChainId);

      if (chainId !== targetChainId) {
        await this.switchNetwork();
        this.provider = new ethers.BrowserProvider(ethereum);
        this.signer = await this.provider.getSigner();
      }

      if (this.leaderboardAddress) {
        this.contract = new ethers.Contract(
          this.leaderboardAddress,
          this.leaderboardABI,
          this.signer
        );
      }

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

  // ============ V4 Game Flow ============

  /**
   * Step 1: Pay entry fee and start game (0.001 ETH)
   * Must be called BEFORE playing
   */
  async payAndStart() {
    if (!this.contract || !this.signer) {
      throw new Error('Not connected to MegaETH');
    }

    const tx = await this.contract.startGame({
      value: ethers.parseEther(this.ENTRY_FEE)
    });

    const receipt = await tx.wait();
    console.log('MegaETH: Game started (paid)!', receipt);
    return receipt;
  },

  /**
   * Step 2: Submit score after game ends (FREE - already paid)
   */
  async submitScore(score, wave, kills, playerName) {
    if (!this.contract || !this.signer) {
      throw new Error('Not connected to MegaETH');
    }

    const nameBytes = ethers.encodeBytes32String(playerName.slice(0, 16)).slice(0, 34);

    const tx = await this.contract.submitScore(
      score,
      wave,
      kills,
      nameBytes
    );

    const receipt = await tx.wait();
    console.log('MegaETH: Score submitted!', receipt);
    return receipt;
  },

  /**
   * Check if player has an active (paid) game
   */
  async hasActiveGame(address) {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('hasActiveGame', [address || this.account]);

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
    if (result.error) return false;

    const decoded = iface.decodeFunctionResult('hasActiveGame', result.result);
    return decoded[0];
  },

  /**
   * Forfeit active game (no refund)
   */
  async forfeitGame() {
    if (!this.contract) throw new Error('Not connected');
    const tx = await this.contract.forfeitGame();
    return await tx.wait();
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
   * Trigger epoch end (anyone can call after 24h)
   */
  async endEpoch() {
    if (!this.contract) throw new Error('Not connected');
    const tx = await this.contract.endEpoch();
    return await tx.wait();
  },

  // ============ Read Functions ============

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
   * Get past epoch info (for prize claiming)
   */
  async getEpoch(epochId) {
    const cfg = this.config[this.network];
    const iface = new ethers.Interface(this.leaderboardABI);
    const data = iface.encodeFunctionData('getEpoch', [epochId]);

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

    const decoded = iface.decodeFunctionResult('getEpoch', result.result);
    return {
      startTime: Number(decoded[0][0]),
      endTime: Number(decoded[0][1]),
      prizePool: ethers.formatEther(decoded[0][2]),
      winner: decoded[0][3],
      winningScore: Number(decoded[0][4]),
      claimed: decoded[0][5]
    };
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
   * Check for unclaimed prizes across recent epochs
   */
  async getUnclaimedPrizes() {
    if (!this.account) return [];

    try {
      const epoch = await this.getCurrentEpoch();
      const unclaimed = [];

      // Check last 10 epochs
      for (let i = Math.max(1, epoch.epochId - 10); i < epoch.epochId; i++) {
        try {
          const pastEpoch = await this.getEpoch(i);
          if (pastEpoch.winner &&
              pastEpoch.winner.toLowerCase() === this.account.toLowerCase() &&
              !pastEpoch.claimed &&
              parseFloat(pastEpoch.prizePool) > 0) {
            unclaimed.push({ epochId: i, ...pastEpoch });
          }
        } catch (e) { /* skip invalid epochs */ }
      }

      return unclaimed;
    } catch (e) {
      console.error('Error checking unclaimed prizes:', e);
      return [];
    }
  },

  // ============ Utility Functions ============

  formatTimeRemaining(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  _decodeName(nameBytes) {
    try {
      const padded = nameBytes + '0'.repeat(66 - nameBytes.length);
      return ethers.decodeBytes32String(padded).replace(/\0/g, '');
    } catch {
      return 'Anon';
    }
  },

  formatAddress(address) {
    if (!address || address === '0x0000000000000000000000000000000000000000') return 'None';
    return address.slice(0, 6) + '...' + address.slice(-4);
  },

  getExplorerUrl(address) {
    const cfg = this.config[this.network];
    return `${cfg.explorer}/address/${address}`;
  },

  /**
   * Update UI status bar
   */
  async updateUI() {
    const status = document.getElementById('megaeth-status');
    if (!status) return;

    if (this.account) {
      let epochInfo = '';
      try {
        const epoch = await this.getCurrentEpoch();
        const timeLeft = this.formatTimeRemaining(epoch.timeRemaining);
        epochInfo = ` | <span style="color:#0ff">Pool: ${parseFloat(epoch.prizePool).toFixed(4)} ETH</span> | <span style="color:#f0f">Ends: ${timeLeft}</span>`;
      } catch (e) {
        console.log('Could not fetch epoch info:', e);
      }

      status.innerHTML = `<span style="color:#0f0">&bull; ${this.formatAddress(this.account)}</span> | <span style="color:#ff0">Fee: ${this.ENTRY_FEE} ETH</span>${epochInfo}`;
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
