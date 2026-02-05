# Arena Survival - MegaETH Edition

> Browser roguelike with instant on-chain leaderboard (10ms confirmations)

[![Solidity](https://img.shields.io/badge/Solidity-0.8-363636)](https://soliditylang.org/)
[![MegaETH](https://img.shields.io/badge/MegaETH-Testnet-purple)](https://megaeth.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Browser-based roguelike dungeon crawler with **on-chain leaderboard on MegaETH**.

Features instant score submissions using `eth_sendRawTransactionSync` (EIP-7966) - confirmations in <10ms.

## Quick Start

### Play (No Blockchain)
1. Open `arena.html` in browser
2. Works offline with localStorage

### Play with On-Chain Leaderboard
1. Deploy contract to MegaETH testnet (see below)
2. Set contract address in browser: `localStorage.setItem('ARENA_CONTRACT', '0x...')`
3. Connect MetaMask to MegaETH Testnet
4. Play - scores submit instantly on death!

## MegaETH Integration

### Chain Config

| Network | Chain ID | RPC |
|---------|----------|-----|
| Testnet | 6343 | `https://carrot.megaeth.com/rpc` |
| Mainnet | 4326 | `https://mainnet.megaeth.com/rpc` |

### Deploy Contract

```bash
cd contracts

# Set private key
export PRIVATE_KEY=0x...

# Deploy to testnet (use --skip-simulation for MegaEVM gas differences)
forge script script/Deploy.s.sol \
  --rpc-url https://carrot.megaeth.com/rpc \
  --broadcast \
  --skip-simulation

# Note the deployed address
```

### Get Testnet ETH

Visit: https://faucet.timothy.megaeth.com

### Contract Features

- **Fixed-size leaderboard** (100 entries) - avoids expensive SSTORE costs
- **Binary search insertion** - O(log n) position finding
- **block.timestamp accessed late** - avoids MegaETH volatile data limits
- **Instant receipts** - uses `eth_sendRawTransactionSync`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│  arena.html                                                      │
│    ├── ethers.js (wallet connection)                            │
│    ├── megaeth.js (MegaETH integration)                         │
│    └── arena.js (game logic)                                    │
│                                                                  │
│  On game over:                                                   │
│    1. Check wouldMakeLeaderboard(score)                         │
│    2. If yes → submitScore() via eth_sendRawTransactionSync     │
│    3. Receipt in <10ms!                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MegaETH (Testnet/Mainnet)                    │
├─────────────────────────────────────────────────────────────────┤
│  ArenaLeaderboard.sol                                           │
│    ├── submitScore(score, wave, kills, name)                    │
│    ├── getTopScores(count) → Entry[]                            │
│    ├── getPlayerBest(address) → (Entry, rank)                   │
│    └── wouldMakeLeaderboard(score) → bool                       │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Endless Waves** - Increasingly difficult monster spawns from all angles
- **40+ Monster Types** - Goblins, demons, dragons with unique AI behaviors
- **Loot System** - 5 rarity tiers (common → legendary)
- **Dark Magic** - Spells, hexes, summons, god worship
- **Permadeath** - Each run is unique
- **On-Chain Leaderboard** - Scores stored on MegaETH, instant confirmation
- **Party Mode** - 1-6 players local co-op

## Files

| File | Purpose |
|------|---------|
| `arena.html` | Main game page |
| `assets/arena.js` | Game loop, rendering, combat |
| `assets/megaeth.js` | MegaETH wallet + contract integration |
| `contracts/src/ArenaLeaderboard.sol` | On-chain leaderboard |
| `contracts/script/Deploy.s.sol` | Deployment script |

## MegaETH Optimizations Used

Following [megaeth-ai-developer-skills](https://github.com/0xBreadguy/megaeth-ai-developer-skills):

1. **eth_sendRawTransactionSync** - instant receipts, no polling
2. **Fixed-size arrays** - avoids SSTORE 0→non-zero (2M+ gas)
3. **block.timestamp late** - accessed after computation to avoid 20M gas limit
4. **Hardcoded gas** - 0.001 gwei base fee, skip estimation
5. **Binary search** - O(log n) leaderboard insertion

## Controls

| Key | Action |
|-----|--------|
| Arrows/numpad | Move |
| z/Num5 | Rest |
| a-p | Inventory |
| 1-9 | Skills |
| \ | Pick up |
| >/< | Stairs |
| w | Worship |

## License

MIT

## Demo

Play now: Open `arena.html` in your browser (works offline!)

For on-chain leaderboard, connect to MegaETH testnet.

---

Built by [Exhuman](https://github.com/exhuman777) | Tiles from DCSS
