import React, { useEffect, useState, useCallback } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { privyConfig, megaethTestnet } from './privy-config';
import { ethers } from 'ethers';
import RogueASCIIBg from './RogueASCIIBg';

const PRIVY_APP_ID = 'cml9c6av801zil40dnl2gqnhj';

// V4 Contract - PAY BEFORE PLAY
const CONTRACT_ADDRESS = '0x6023678244e0E009B751e418436871dC52378946';
const CONTRACT_ABI = [
  'function startGame() external payable',
  'function submitScore(uint32 score, uint32 wave, uint32 kills, bytes16 name) external',
  'function hasActiveGame(address player) external view returns (bool)',
  'function getTopScores(uint256 count) external view returns (tuple(address player, uint32 score, uint32 wave, uint32 kills, uint32 timestamp, bytes16 name)[])',
  'function getCurrentEpoch() external view returns (uint256 epochId, uint256 startTime, uint256 timeRemaining, uint256 prizePool, address currentLeader, uint32 topScore)',
  'function getPlayerStats(address player) external view returns (uint256 gamesPlayed, uint256 totalEarnings, uint256 bestScoreRank)',
  'function claimPrize(uint256 epochId) external',
  'function getEntryFee() external pure returns (uint256)',
];

const ENTRY_FEE = '0.001';
const RPC_URL = 'https://carrot.megaeth.com/rpc';

// MegaETH Setup Guide Component
function SetupGuide({ onClose }) {
  return (
    <div style={setupStyles.overlay}>
      <div style={setupStyles.modal}>
        <button onClick={onClose} style={setupStyles.closeBtn}>×</button>

        <h1 style={setupStyles.title}>MegaETH Setup</h1>
        <p style={setupStyles.subtitle}>10ms blocks. The fastest EVM chain.</p>

        <div style={setupStyles.section}>
          <h2 style={setupStyles.sectionTitle}>1. Get Testnet ETH</h2>
          <p style={setupStyles.text}>Claim free tokens from the official faucet:</p>
          <a href="https://testnet.megaeth.com/" target="_blank" rel="noopener noreferrer" style={setupStyles.link}>
            testnet.megaeth.com
          </a>
        </div>

        <div style={setupStyles.section}>
          <h2 style={setupStyles.sectionTitle}>2. Add Network</h2>
          <div style={setupStyles.config}>
            <div style={setupStyles.configRow}><span style={setupStyles.label}>Network</span><span style={setupStyles.value}>MegaETH Testnet</span></div>
            <div style={setupStyles.configRow}><span style={setupStyles.label}>Chain ID</span><span style={setupStyles.value}>6343</span></div>
            <div style={setupStyles.configRow}><span style={setupStyles.label}>Symbol</span><span style={setupStyles.value}>ETH</span></div>
            <div style={{...setupStyles.configRow, flexDirection: 'column', alignItems: 'flex-start', gap: '6px'}}>
              <span style={setupStyles.label}>RPC URLs</span>
              <code style={setupStyles.code}>https://carrot.megaeth.com/rpc</code>
              <code style={setupStyles.code}>https://rpc.megaeth.com</code>
              <code style={setupStyles.code}>https://rpc.testnet.megaeth.com</code>
            </div>
          </div>
        </div>

        <div style={setupStyles.section}>
          <h2 style={setupStyles.sectionTitle}>3. Play</h2>
          <ul style={setupStyles.list}>
            <li>Sign in with email or wallet</li>
            <li>Pay 0.001 ETH entry fee</li>
            <li>Survive. Top score wins the daily pool.</li>
          </ul>
        </div>

        <div style={setupStyles.links}>
          <a href="https://docs.megaeth.com" target="_blank" rel="noopener noreferrer" style={setupStyles.linkSmall}>Docs</a>
          <a href="https://megaeth-testnet.explorer.caldera.xyz" target="_blank" rel="noopener noreferrer" style={setupStyles.linkSmall}>Explorer</a>
          <a href="https://twitter.com/megaeth_labs" target="_blank" rel="noopener noreferrer" style={setupStyles.linkSmall}>Twitter</a>
        </div>

        <button onClick={onClose} style={setupStyles.playBtn}>
          GOT IT
        </button>
      </div>
    </div>
  );
}

// How to Play Guide Component
function HowToPlay({ onClose }) {
  return (
    <div style={setupStyles.overlay}>
      <div style={setupStyles.modal}>
        <button onClick={onClose} style={setupStyles.closeBtn}>×</button>

        <h1 style={setupStyles.title}>How to Play</h1>
        <p style={setupStyles.subtitle}>Survive endless waves. Get the highest score.</p>

        <div style={setupStyles.section}>
          <h2 style={setupStyles.sectionTitle}>Movement</h2>
          <div style={howToPlayStyles.controls}>
            <div style={howToPlayStyles.controlGroup}>
              <div style={howToPlayStyles.keys}>
                <span style={howToPlayStyles.key}>W</span>
                <div style={howToPlayStyles.keyRow}>
                  <span style={howToPlayStyles.key}>A</span>
                  <span style={howToPlayStyles.key}>S</span>
                  <span style={howToPlayStyles.key}>D</span>
                </div>
              </div>
              <span style={howToPlayStyles.or}>or</span>
              <div style={howToPlayStyles.keys}>
                <span style={howToPlayStyles.key}>↑</span>
                <div style={howToPlayStyles.keyRow}>
                  <span style={howToPlayStyles.key}>←</span>
                  <span style={howToPlayStyles.key}>↓</span>
                  <span style={howToPlayStyles.key}>→</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={setupStyles.section}>
          <h2 style={setupStyles.sectionTitle}>Combat</h2>
          <div style={howToPlayStyles.actionList}>
            <div style={howToPlayStyles.action}>
              <span style={howToPlayStyles.key}>X</span>
              <span style={howToPlayStyles.actionText}>Attack nearby enemy</span>
            </div>
            <div style={howToPlayStyles.action}>
              <span style={howToPlayStyles.key}>C</span>
              <span style={howToPlayStyles.actionText}>AOE attack (area damage)</span>
            </div>
          </div>
          <p style={howToPlayStyles.hint}>Or just walk into enemies to hit them</p>
        </div>

        <div style={setupStyles.section}>
          <h2 style={setupStyles.sectionTitle}>Goal</h2>
          <ul style={howToPlayStyles.goalList}>
            <li>Kill monsters to earn points</li>
            <li>Survive as many waves as possible</li>
            <li>Pick up loot to get stronger</li>
            <li>Top daily score wins the prize pool!</li>
          </ul>
        </div>

        <button onClick={onClose} style={setupStyles.playBtn}>
          READY
        </button>
      </div>
    </div>
  );
}

const howToPlayStyles = {
  controls: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '12px',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  keys: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  keyRow: {
    display: 'flex',
    gap: '4px',
  },
  key: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    minWidth: '40px',
    textAlign: 'center',
  },
  keySmall: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    minWidth: '40px',
    textAlign: 'center',
  },
  or: {
    color: '#444',
    fontSize: '12px',
  },
  hint: {
    color: '#666',
    fontSize: '12px',
    textAlign: 'center',
    marginTop: '12px',
    marginBottom: 0,
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  actionText: {
    color: '#888',
    fontSize: '13px',
  },
  goalList: {
    color: '#888',
    paddingLeft: '16px',
    margin: 0,
    lineHeight: '1.8',
    fontSize: '13px',
  },
  tip: {
    background: '#111',
    border: '1px solid #1a1a1a',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '20px',
  },
};

const setupStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflowY: 'auto',
  },
  modal: {
    background: '#0a0a0a',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '440px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    color: '#fff',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: '1px solid #333',
    color: '#666',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s',
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: '600',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '24px',
    fontSize: '13px',
  },
  section: {
    marginBottom: '20px',
    padding: '16px',
    background: '#111',
    borderRadius: '8px',
    border: '1px solid #1a1a1a',
  },
  sectionTitle: {
    color: '#fff',
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '500',
  },
  text: {
    color: '#888',
    margin: '0 0 8px 0',
    fontSize: '13px',
  },
  link: {
    color: '#fff',
    fontSize: '13px',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  config: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  configRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#666',
    fontSize: '12px',
  },
  value: {
    color: '#fff',
    fontSize: '13px',
  },
  code: {
    color: '#888',
    fontSize: '11px',
    background: '#0a0a0a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'inherit',
    display: 'block',
    width: '100%',
  },
  list: {
    color: '#888',
    paddingLeft: '16px',
    margin: 0,
    lineHeight: '1.8',
    fontSize: '13px',
  },
  links: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  linkSmall: {
    color: '#666',
    fontSize: '12px',
    textDecoration: 'none',
    borderBottom: '1px solid #333',
    paddingBottom: '2px',
  },
  playBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '13px',
    background: '#fff',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
};

function GameDashboard() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [epoch, setEpoch] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [countdown, setCountdown] = useState('--');

  const activeWallet = wallets?.[0];

  // Fetch epoch and leaderboard data
  const fetchData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Get current epoch
      const epochData = await contract.getCurrentEpoch();
      setEpoch({
        id: Number(epochData[0]),
        startTime: Number(epochData[1]),
        timeRemaining: Number(epochData[2]),
        prizePool: ethers.formatEther(epochData[3]),
        currentLeader: epochData[4],
        topScore: Number(epochData[5]),
      });

      // Get leaderboard
      const scores = await contract.getTopScores(10);
      setLeaderboard(scores.map(s => ({
        player: s.player,
        score: Number(s.score),
        wave: Number(s.wave),
        kills: Number(s.kills),
        name: decodeName(s.name),
      })));

      // Get player stats if connected
      if (activeWallet?.address) {
        const stats = await contract.getPlayerStats(activeWallet.address);
        setPlayerStats({
          gamesPlayed: Number(stats[0]),
          totalEarnings: ethers.formatEther(stats[1]),
          bestRank: Number(stats[2]),
        });
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
  }, [activeWallet?.address]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Live countdown timer
  useEffect(() => {
    if (!epoch) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() / 1000) - (epoch.startTime + (epoch.timeRemaining > 0 ? 0 : 0)));
      const remaining = Math.max(0, epoch.timeRemaining - Math.floor((Date.now() / 1000) - (Date.now() / 1000 - epoch.timeRemaining + epoch.timeRemaining)));
      // Simpler: just use epoch.timeRemaining and decrement locally
      setCountdown(formatTime(Math.max(0, epoch.timeRemaining)));
    };
    tick();
    // Decrement every second based on when we fetched
    let localRemaining = epoch.timeRemaining;
    const timer = setInterval(() => {
      localRemaining = Math.max(0, localRemaining - 1);
      setCountdown(formatTime(localRemaining));
    }, 1000);
    return () => clearInterval(timer);
  }, [epoch]);

  // Claim prize
  const claimPrize = async () => {
    if (!activeWallet || !epoch) return;
    setClaiming(true);
    setClaimSuccess(null);
    try {
      await activeWallet.switchChain(megaethTestnet.id);
      const eip1193Provider = await activeWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(eip1193Provider);
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.claimPrize(epoch.id);
      await tx.wait();
      setClaimSuccess(`Claimed ${epoch.prizePool} ETH!`);
      fetchData();
    } catch (e) {
      console.error('Claim failed:', e);
      setError(e.message);
    } finally {
      setClaiming(false);
    }
  };

  // Check if current user can claim
  const canClaim = epoch &&
    epoch.timeRemaining === 0 &&
    activeWallet?.address &&
    epoch.currentLeader?.toLowerCase() === activeWallet.address.toLowerCase() &&
    parseFloat(epoch.prizePool) > 0;

  // Decode bytes16 name
  function decodeName(nameBytes) {
    try {
      const padded = nameBytes + '0'.repeat(66 - nameBytes.length);
      return ethers.decodeBytes32String(padded).replace(/\0/g, '') || 'Anon';
    } catch {
      return 'Anon';
    }
  }

  // Format time
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  // Format address
  function formatAddr(addr) {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'None';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // Start game (PAY FIRST, then play)
  const startGame = async () => {
    if (!activeWallet) return;

    setLoading(true);
    setError(null);

    try {
      // Switch to MegaETH
      await activeWallet.switchChain(megaethTestnet.id);

      // Get the EIP-1193 provider from Privy wallet
      const eip1193Provider = await activeWallet.getEthereumProvider();

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(eip1193Provider);
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // PAY FIRST: Call startGame() with 0.001 ETH
      console.log('Paying entry fee...');
      const payTx = await contract.startGame({
        value: ethers.parseEther(ENTRY_FEE)
      });
      console.log('Payment TX sent:', payTx.hash);

      // Wait for payment confirmation
      await payTx.wait();
      console.log('Payment confirmed! Starting game...');

      // Store contract for score submission later
      window.gameWallet = {
        address: activeWallet.address,
        signer: signer,
        contract: contract,
      };

      // Listen for messages from game iframe
      const handleGameMessage = async (event) => {
        if (event.data?.type === 'EXIT_GAME') {
          setIsPlaying(false);
          fetchData(); // Refresh leaderboard
          return;
        }
        if (event.data?.type === 'GAME_OVER') {
          const { score, wave, kills, name } = event.data;
          console.log('Game over! Submitting score:', score, wave, kills, name);

          try {
            // Encode name as bytes16
            const nameBytes = ethers.encodeBytes32String(name.slice(0, 16)).slice(0, 34);

            // Submit score (NO PAYMENT - already paid)
            const tx = await contract.submitScore(score, wave, kills, nameBytes);
            console.log('Score TX sent:', tx.hash);

            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('Score submitted on-chain!', receipt.hash);

            // Fetch updated leaderboard
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const scores = await readContract.getTopScores(10);
            const leaderboardData = scores.map(s => ({
              player: s.player,
              score: Number(s.score),
              wave: Number(s.wave),
              kills: Number(s.kills),
              name: decodeName(s.name),
            }));

            // Get updated epoch info
            const epochData = await readContract.getCurrentEpoch();
            const epochInfo = {
              prizePool: ethers.formatEther(epochData[3]),
              timeRemaining: Number(epochData[2]),
            };

            // Notify iframe of success with leaderboard
            const iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.contentWindow.postMessage({
                type: 'SCORE_SUBMITTED',
                hash: tx.hash,
                leaderboard: leaderboardData,
                epoch: epochInfo,
                playerScore: score,
                playerWave: wave,
                playerKills: kills,
              }, '*');
            }
          } catch (err) {
            console.error('Failed to submit score:', err);
            const iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.contentWindow.postMessage({ type: 'SCORE_ERROR', error: err.message }, '*');
            }
          }
        }
      };

      window.removeEventListener('message', window._gameMessageHandler);
      window._gameMessageHandler = handleGameMessage;
      window.addEventListener('message', handleGameMessage);

      setIsPlaying(true);

    } catch (e) {
      console.error('Failed to start game:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div style={styles.container}>
        <RogueASCIIBg />
        {showSetup && <SetupGuide onClose={() => setShowSetup(false)} />}
        {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}

        <div style={styles.header}>
          <h1 style={styles.title}>ARENA</h1>
          <span style={styles.badge}>MegaETH</span>
        </div>
        <p style={styles.subtitle}>Roguelike survival. On-chain scores. Daily prizes.</p>

        <div style={styles.prizeCard}>
          <div style={styles.prizeLabel}>DAILY POOL · EPOCH {epoch?.id || 1}</div>
          <div style={styles.prizeAmount}>{epoch?.prizePool || '0'} ETH</div>
          <div style={styles.prizeMeta}>
            <span>{countdown} left</span>
            <span style={styles.separator}>·</span>
            <span>Leader: {epoch?.topScore || 0} pts</span>
          </div>
        </div>

        <button onClick={login} style={styles.primaryBtn}>
          SIGN IN TO PLAY
        </button>
        <p style={styles.feeText}>0.001 ETH entry · Winner takes pool</p>

        <div style={styles.btnRow}>
          <button onClick={() => setShowHowToPlay(true)} style={styles.secondaryBtn}>
            How to Play
          </button>
          <button onClick={() => setShowSetup(true)} style={styles.secondaryBtn}>
            Setup Guide
          </button>
        </div>

        <Leaderboard entries={leaderboard} formatAddr={formatAddr} />
      </div>
    );
  }

  if (isPlaying) {
    return (
      <div style={styles.gameContainer}>
        <div style={styles.gameHeader}>
          <div style={styles.gameHeaderLeft}>
            <span style={styles.walletDot}>{formatAddr(activeWallet?.address)}</span>
            <span style={styles.paidBadge}>PAID</span>
          </div>
          <div style={styles.gameHeaderRight}>
            <span style={styles.poolInfo}>{epoch?.prizePool || '0'} ETH pool</span>
            <button onClick={() => { setIsPlaying(false); window.location.reload(); }} style={styles.exitBtn}>Exit</button>
          </div>
        </div>
        <iframe
          src="/arena-game.html?autostart=1"
          style={styles.gameIframe}
          title="Arena Survival"
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <RogueASCIIBg />
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}

      <div style={styles.header}>
        <h1 style={styles.title}>ARENA</h1>
        <span style={styles.badge}>MegaETH</span>
      </div>

      <div style={styles.walletBar}>
        <span style={styles.walletDot}>{formatAddr(activeWallet?.address)}</span>
        <button onClick={logout} style={styles.logoutBtn}>Sign out</button>
      </div>

      <div style={styles.prizeCard}>
        <div style={styles.prizeLabel}>DAILY POOL · EPOCH {epoch?.id || 1}</div>
        <div style={styles.prizeAmount}>{epoch?.prizePool || '0'} ETH</div>
        <div style={styles.prizeMeta}>
          <span>{countdown} left</span>
          <span style={styles.separator}>·</span>
          <span>Leader: {epoch?.topScore || 0} pts ({epoch ? formatAddr(epoch.currentLeader) : '...'})</span>
        </div>
      </div>

      {canClaim && (
        <button onClick={claimPrize} disabled={claiming} style={{
          ...styles.primaryBtn,
          background: '#00d26a',
          color: '#000',
          boxShadow: '0 0 30px rgba(0,210,106,0.4)',
          marginBottom: '16px',
        }}>
          {claiming ? 'CLAIMING...' : `CLAIM ${epoch.prizePool} ETH`}
        </button>
      )}

      {claimSuccess && (
        <div style={{ color: '#00d26a', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
          {claimSuccess}
        </div>
      )}

      {playerStats && (
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{playerStats.gamesPlayed}</span>
            <span style={styles.statLabel}>games</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>{playerStats.totalEarnings}</span>
            <span style={styles.statLabel}>ETH won</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>#{playerStats.bestRank || '-'}</span>
            <span style={styles.statLabel}>best</span>
          </div>
        </div>
      )}

      <button onClick={startGame} disabled={loading} style={styles.primaryBtn}>
        {loading ? 'PROCESSING...' : 'PLAY · 0.001 ETH'}
      </button>

      {error && <div style={styles.error}>{error}</div>}

      <p style={styles.feeText}>95% to pool · 5% fee · Top score wins daily</p>

      <button onClick={() => setShowHowToPlay(true)} style={styles.linkBtn}>
        How to Play
      </button>

      <Leaderboard entries={leaderboard} formatAddr={formatAddr} currentPlayer={activeWallet?.address} />
    </div>
  );
}

function Leaderboard({ entries, formatAddr, currentPlayer }) {
  if (!entries.length) return null;

  return (
    <div style={styles.leaderboard}>
      <div style={styles.lbHeader}>
        <h3 style={styles.lbTitle}>LEADERBOARD</h3>
        <span style={styles.lbCount}>{entries.length} players</span>
      </div>
      <div style={styles.lbList}>
        {entries.map((e, i) => (
          <div key={i} style={{
            ...styles.lbRow,
            ...(e.player === currentPlayer ? styles.lbHighlight : {}),
            ...(i === 0 ? styles.lbFirst : {})
          }}>
            <div style={styles.lbRank}>{i + 1}</div>
            <div style={styles.lbPlayer}>
              <span style={styles.lbName}>{e.name || formatAddr(e.player)}</span>
              <span style={styles.lbStats}>W{e.wave} · {e.kills} kills</span>
            </div>
            <div style={styles.lbScore}>{e.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <GameDashboard />
    </PrivyProvider>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '32px 20px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    color: '#fff',
    background: '#000',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  title: {
    color: '#fff',
    fontSize: '32px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-1px',
  },
  badge: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '32px',
    fontSize: '14px',
  },
  prizeCard: {
    background: 'rgba(10,10,10,0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #1a1a1a',
    borderRadius: '12px',
    padding: '24px 48px',
    textAlign: 'center',
    marginBottom: '24px',
    position: 'relative',
    zIndex: 2,
  },
  prizeLabel: {
    color: '#444',
    fontSize: '11px',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  prizeAmount: {
    color: '#fff',
    fontSize: '40px',
    fontWeight: '700',
    letterSpacing: '-2px',
  },
  prizeMeta: {
    color: '#555',
    fontSize: '12px',
    marginTop: '8px',
  },
  separator: {
    margin: '0 8px',
  },
  walletBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '24px',
    fontSize: '13px',
  },
  walletDot: {
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statsRow: {
    display: 'flex',
    gap: '32px',
    marginBottom: '24px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
  },
  statLabel: {
    color: '#555',
    fontSize: '11px',
  },
  primaryBtn: {
    background: '#fff',
    border: 'none',
    color: '#000',
    padding: '16px 48px',
    fontSize: '14px',
    fontFamily: 'inherit',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '8px',
    marginBottom: '12px',
    letterSpacing: '0.5px',
    transition: 'all 0.2s',
    position: 'relative',
    zIndex: 2,
    boxShadow: '0 0 20px rgba(255,255,255,0.3)',
  },
  secondaryBtn: {
    background: 'rgba(30,30,30,0.9)',
    border: '1px solid #444',
    color: '#ccc',
    padding: '12px 24px',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
    position: 'relative',
    zIndex: 2,
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    position: 'relative',
    zIndex: 2,
  },
  linkBtn: {
    background: 'rgba(30,30,30,0.9)',
    border: '1px solid #444',
    color: '#ccc',
    padding: '10px 20px',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    borderRadius: '6px',
    position: 'relative',
    zIndex: 2,
    textDecoration: 'none',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #222',
    color: '#555',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '12px',
    borderRadius: '4px',
  },
  feeText: {
    color: '#444',
    fontSize: '12px',
    marginBottom: '8px',
  },
  error: {
    color: '#e55',
    fontSize: '13px',
    marginBottom: '12px',
  },
  // Game playing state
  gameContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#000',
  },
  gameHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    background: '#0a0a0a',
    borderBottom: '1px solid #1a1a1a',
  },
  gameHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  gameHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  paidBadge: {
    background: '#1a2f1a',
    color: '#4a4',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  poolInfo: {
    color: '#666',
  },
  exitBtn: {
    background: '#111',
    border: '1px solid #222',
    color: '#888',
    padding: '6px 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '12px',
    borderRadius: '4px',
  },
  gameIframe: {
    flex: 1,
    width: '100%',
    border: 'none',
  },
  loading: {
    color: '#666',
    fontFamily: "'JetBrains Mono', monospace",
    padding: '50px',
    background: '#000',
    minHeight: '100vh',
  },
  // Leaderboard
  leaderboard: {
    width: '100%',
    maxWidth: '400px',
    marginTop: '24px',
    position: 'relative',
    zIndex: 2,
  },
  lbHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  lbTitle: {
    color: '#fff',
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
  },
  lbCount: {
    color: '#444',
    fontSize: '12px',
  },
  lbList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(10,10,10,0.8)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    gap: '12px',
  },
  lbFirst: {
    background: 'rgba(17,17,17,0.9)',
    border: '1px solid #333',
  },
  lbHighlight: {
    background: '#0f1a0f',
    border: '1px solid #1a2f1a',
  },
  lbRank: {
    color: '#555',
    fontSize: '14px',
    fontWeight: '600',
    width: '24px',
    textAlign: 'center',
  },
  lbPlayer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  lbName: {
    color: '#fff',
    fontSize: '13px',
  },
  lbStats: {
    color: '#444',
    fontSize: '11px',
  },
  lbScore: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
  },
};

// Add global styles
const globalStyles = document.createElement('style');
globalStyles.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #000; }
  button:hover { opacity: 0.85; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  a { transition: opacity 0.2s; }
  a:hover { opacity: 0.7; }
`;
document.head.appendChild(globalStyles);

export default App;
