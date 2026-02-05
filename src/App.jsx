import React, { useEffect, useState, useCallback } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { privyConfig, megaethTestnet } from './privy-config';
import { ethers } from 'ethers';

const PRIVY_APP_ID = 'cml9c6av801zil40dnl2gqnhj';

// V4 Contract - PAY BEFORE PLAY
const CONTRACT_ADDRESS = '0x40E63CD7Bf404e00C2E6CE327001c9b5C15e0464';
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

function GameDashboard() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [epoch, setEpoch] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

            // Submit score (NO PAYMENT - already paid in startGame)
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
        <h1 style={styles.title}>⚔ ARENA SURVIVAL ⚔</h1>
        <p style={styles.subtitle}>Roguelike Survival on MegaETH</p>

        <div style={styles.infoBox}>
          <h2 style={styles.prizeTitle}>🏆 DAILY PRIZE POOL 🏆</h2>
          <div style={styles.prizeAmount}>{epoch?.prizePool || '0'} ETH</div>
          <div style={styles.prizeInfo}>
            Time left: {epoch ? formatTime(epoch.timeRemaining) : '--'}
          </div>
          <div style={styles.prizeInfo}>
            Current Leader: {epoch ? formatAddr(epoch.currentLeader) : '--'} ({epoch?.topScore || 0} pts)
          </div>
        </div>

        <button onClick={login} style={styles.playButton}>
          🎮 SIGN IN TO PLAY
        </button>
        <p style={styles.feeText}>0.001 ETH per game • Winner takes the pool every 24h</p>

        <Leaderboard entries={leaderboard} formatAddr={formatAddr} />
      </div>
    );
  }

  if (isPlaying) {
    return (
      <div style={styles.gameContainer}>
        <div style={styles.gameHeader}>
          <span style={{color: '#0f0'}}>● {formatAddr(activeWallet?.address)}</span>
          <span style={{color: '#0f0'}}>✓ PAID {ENTRY_FEE} ETH</span>
          <span style={{color: '#0ff'}}>Pool: {epoch?.prizePool || '0'} ETH</span>
          <button onClick={() => { setIsPlaying(false); window.location.reload(); }} style={styles.backButton}>← Back</button>
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
      <h1 style={styles.title}>⚔ ARENA SURVIVAL ⚔</h1>

      <div style={styles.walletInfo}>
        <span style={{color: '#0f0'}}>● {formatAddr(activeWallet?.address)}</span>
        <button onClick={logout} style={styles.logoutButton}>Logout</button>
      </div>

      <div style={styles.infoBox}>
        <h2 style={styles.prizeTitle}>🏆 DAILY PRIZE POOL 🏆</h2>
        <div style={styles.prizeAmount}>{epoch?.prizePool || '0'} ETH</div>
        <div style={styles.prizeInfo}>
          Epoch #{epoch?.id || 1} • Time left: {epoch ? formatTime(epoch.timeRemaining) : '--'}
        </div>
        <div style={styles.prizeInfo}>
          Leader: {epoch ? formatAddr(epoch.currentLeader) : '--'} ({epoch?.topScore || 0} pts)
        </div>
      </div>

      {playerStats && (
        <div style={styles.statsBox}>
          <div>Games: {playerStats.gamesPlayed}</div>
          <div>Earnings: {playerStats.totalEarnings} ETH</div>
          <div>Best Rank: #{playerStats.bestRank || '--'}</div>
        </div>
      )}

      <button onClick={startGame} disabled={loading} style={styles.playButton}>
        {loading ? '⏳ PAYING ENTRY FEE...' : '🎮 PAY & PLAY (0.001 ETH)'}
      </button>

      {error && <div style={styles.error}>{error}</div>}

      <p style={styles.feeText}>
        95% goes to prize pool • 5% house fee • Top scorer wins daily!
      </p>

      <Leaderboard entries={leaderboard} formatAddr={formatAddr} currentPlayer={activeWallet?.address} />
    </div>
  );
}

function Leaderboard({ entries, formatAddr, currentPlayer }) {
  if (!entries.length) return null;

  return (
    <div style={styles.leaderboard}>
      <h3 style={styles.lbTitle}>📊 LEADERBOARD</h3>
      <table style={styles.lbTable}>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
            <th>Wave</th>
            <th>Kills</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} style={e.player === currentPlayer ? styles.lbHighlight : {}}>
              <td>{i + 1}</td>
              <td>{e.name || formatAddr(e.player)}</td>
              <td style={{color: '#ff0'}}>{e.score}</td>
              <td>{e.wave}</td>
              <td>{e.kills}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    padding: '20px',
    fontFamily: 'monospace',
    color: '#fff',
  },
  gameContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  gameHeader: {
    display: 'flex',
    gap: '20px',
    padding: '10px',
    fontFamily: 'monospace',
    fontSize: '12px',
    alignItems: 'center',
    background: '#111',
  },
  gameIframe: {
    flex: 1,
    width: '100%',
    border: 'none',
  },
  loading: {
    color: '#888',
    fontFamily: 'monospace',
    padding: '50px',
  },
  title: {
    color: '#f33',
    textShadow: '0 0 10px #f00, 2px 2px #000',
    fontSize: '28px',
    margin: '10px 0',
    letterSpacing: '3px',
  },
  subtitle: {
    color: '#888',
    marginBottom: '20px',
  },
  walletInfo: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    marginBottom: '20px',
    fontSize: '14px',
  },
  infoBox: {
    background: 'rgba(255,215,0,0.1)',
    border: '2px solid #ffd700',
    borderRadius: '10px',
    padding: '20px 40px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  prizeTitle: {
    color: '#ffd700',
    margin: '0 0 10px 0',
    fontSize: '18px',
  },
  prizeAmount: {
    color: '#0f0',
    fontSize: '36px',
    fontWeight: 'bold',
    textShadow: '0 0 10px #0f0',
  },
  prizeInfo: {
    color: '#aaa',
    fontSize: '14px',
    marginTop: '5px',
  },
  statsBox: {
    display: 'flex',
    gap: '30px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#888',
  },
  playButton: {
    background: 'linear-gradient(180deg, #f44 0%, #c00 100%)',
    border: 'none',
    color: '#fff',
    padding: '15px 40px',
    fontSize: '18px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: '5px',
    marginBottom: '10px',
    boxShadow: '0 4px 15px rgba(255,0,0,0.4)',
  },
  logoutButton: {
    background: '#333',
    border: '1px solid #555',
    color: '#888',
    padding: '5px 10px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  backButton: {
    background: '#333',
    border: '1px solid #555',
    color: '#fff',
    padding: '5px 15px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  feeText: {
    color: '#666',
    fontSize: '12px',
    marginBottom: '30px',
  },
  error: {
    color: '#f66',
    marginBottom: '10px',
  },
  leaderboard: {
    width: '100%',
    maxWidth: '500px',
    marginTop: '20px',
  },
  lbTitle: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: '10px',
  },
  lbTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  lbHighlight: {
    background: 'rgba(0,255,0,0.2)',
  },
};

// Add table styles
const tableStyles = document.createElement('style');
tableStyles.textContent = `
  table th, table td { padding: 8px; text-align: left; border-bottom: 1px solid #333; }
  table th { color: #888; }
  table td { color: #fff; }
`;
document.head.appendChild(tableStyles);

export default App;
