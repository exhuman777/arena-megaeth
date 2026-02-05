/**
 * Privy Configuration for Arena Survival
 *
 * Get your App ID from: https://dashboard.privy.io
 */

// MegaETH chain definitions for Privy
export const megaethTestnet = {
  id: 6343,
  name: 'MegaETH Testnet',
  network: 'megaeth-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://carrot.megaeth.com/rpc'] },
    public: { http: ['https://carrot.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://megaeth-testnet-v2.blockscout.com' },
  },
};

export const megaethMainnet = {
  id: 4326,
  name: 'MegaETH Mainnet',
  network: 'megaeth',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://mainnet.megaeth.com/rpc'] },
    public: { http: ['https://mainnet.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://mega.etherscan.io' },
  },
};

// Privy configuration
export const privyConfig = {
  // Login methods - email, wallet, social
  loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'],

  // Appearance
  appearance: {
    theme: 'dark',
    accentColor: '#ff3333',
    logo: 'https://arena.megaeth.com/assets/icon-192.png', // Update with your logo
    landingHeader: 'Arena Survival',
    loginMessage: 'Sign in to compete on the MegaETH leaderboard',
  },

  // Embedded wallets - create for users without wallets
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    noPromptOnSignature: false,
  },

  // Supported chains
  defaultChain: megaethTestnet,
  supportedChains: [megaethTestnet, megaethMainnet],

  // Legal
  legal: {
    termsAndConditionsUrl: 'https://arena.megaeth.com/terms',
    privacyPolicyUrl: 'https://arena.megaeth.com/privacy',
  },
};

export default privyConfig;
