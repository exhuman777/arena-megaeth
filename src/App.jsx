import React, { useEffect, useState } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { privyConfig, megaethTestnet } from './privy-config';

// Your Privy App ID from https://dashboard.privy.io
const PRIVY_APP_ID = 'cml9c6av801zil40dnl2gqnhj';

function WalletStatus() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [gameStarted, setGameStarted] = useState(false);

  // Get the active wallet
  const activeWallet = wallets?.[0];

  // Pass wallet to game when authenticated
  useEffect(() => {
    if (authenticated && activeWallet && !gameStarted) {
      // Switch to MegaETH network
      activeWallet.switchChain(megaethTestnet.id).then(() => {
        // Get ethers provider from Privy wallet
        activeWallet.getEthersProvider().then((provider) => {
          // Expose wallet to global MegaETH object
          window.PrivyWallet = {
            address: activeWallet.address,
            provider: provider,
            getSigner: () => provider.getSigner(),
          };

          // Trigger custom event for the game
          window.dispatchEvent(new CustomEvent('privy-connected', {
            detail: { address: activeWallet.address }
          }));

          console.log('Privy: Wallet connected', activeWallet.address);
        });
      }).catch(console.error);
    }
  }, [authenticated, activeWallet, gameStarted]);

  if (!ready) {
    return (
      <div style={styles.status}>
        <span style={{ color: '#888' }}>Loading...</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={styles.status}>
        <button onClick={login} style={styles.loginButton}>
          Sign In to Play
        </button>
        <span style={{ color: '#888', marginLeft: '10px' }}>
          Email, wallet, or social
        </span>
      </div>
    );
  }

  const displayAddress = activeWallet?.address
    ? `${activeWallet.address.slice(0, 6)}...${activeWallet.address.slice(-4)}`
    : 'Loading wallet...';

  return (
    <div style={styles.status}>
      <span style={{ color: '#0f0' }}>● {displayAddress}</span>
      <span style={{ color: '#ff0', marginLeft: '10px' }}>Fee: 0.0001 ETH</span>
      <button onClick={logout} style={styles.logoutButton}>
        Logout
      </button>
    </div>
  );
}

function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={privyConfig}
    >
      <div style={styles.container}>
        <h1 style={styles.title}>⚔ ARENA SURVIVAL ⚔</h1>
        <WalletStatus />

        {/* Game container - the actual game JS will render here */}
        <div id="game-container"></div>
      </div>
    </PrivyProvider>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1010 50%, #0a0a0a 100%)',
    padding: '10px',
  },
  title: {
    color: '#f33',
    fontFamily: 'monospace',
    textShadow: '0 0 10px #f00, 2px 2px #000',
    margin: '8px 0 10px 0',
    fontSize: '24px',
    letterSpacing: '3px',
  },
  status: {
    fontFamily: 'monospace',
    fontSize: '12px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  loginButton: {
    background: '#f33',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '14px',
    borderRadius: '4px',
  },
  logoutButton: {
    background: '#333',
    border: '1px solid #555',
    color: '#888',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '10px',
    marginLeft: '10px',
  },
};

export default App;
