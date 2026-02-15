```
 █████╗ ██████╗ ███████╗███╗   ██╗ █████╗ 
██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗
███████║██████╔╝█████╗  ██╔██╗ ██║███████║
██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║
██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝
```

<p align="center">
  <strong>Arena Survival</strong>
</p>

<p align="center">
  <em>Browser Roguelike with On-Chain Leaderboard on MegaETH</em>
</p>

<p align="center">
  <a href="arena.html">Play</a> &middot;
  <a href="leaderboard.html">Leaderboard</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/chain-MegaETH-purple" alt="MegaETH" />
  <img src="https://img.shields.io/badge/blocks-10ms-brightgreen" alt="10ms" />
  <img src="https://img.shields.io/badge/genre-Roguelike-blue" alt="Roguelike" />
  <img src="https://img.shields.io/badge/auth-Privy-orange" alt="Privy" />
</p>

---

**Pay 0.001 ETH to play. Highest score wins the pool.**

Browser-based roguelike survival game. Explore procedurally generated dungeons, fight enemies, collect loot. Top scores written to MegaETH (10ms blocks). Daily prize pool distributed to top players.

---

## File Map

```
  arena-megaeth/
  AGENTS.md
  CHANGELOG.md
  CLAUDE.md
  PROMO.md
  README.md
  SESSION_NOTES.md
  about.html
  admin.html
  arena-game.html
  arena.html
  build-neocities.sh
  generate-icons.html
  guides.html
  help.css
  help.html
  hub.html
  index-old.html
  index.html
  indexextreme.html
  leaderboard.html
  manifest.json
  package-lock.json
  package.json
  party-game.html
  party.html
  promo.html
  styles.css
  sw.js
  vite.config.js
  assets/
    arena.js
    config.js
    configextreme.js
    entities.js
    entity.js
    icon-192.png
    icon-512.png
    index.js
    item.js
    items.js
  ... (6738 more files)
```

---

Roguelike survival game with on-chain leaderboards on MegaETH.

**[Play Now](https://arena-megaeth.vercel.app)**

---

## What is this?

A browser-based survival game where you fight endless waves of monsters. Pay 0.001 ETH to play, and if you get the highest score of the day, you win the entire prize pool.

- Turn-based roguelike gameplay
- 40+ monster types with unique AI
- Loot and equipment system
- Scores recorded permanently on MegaETH
- Daily prize pools (95% of entry fees)

## How to Play

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| E / Enter | Pick up item |
| X / H / Space | Attack |
| C / J | AOE Attack |
| Z | Wait |
| 1-9 | Use skills |

Move into enemies to attack. The game is turn-based—take your time.

### Goal

1. Survive as many waves as possible
2. Kill monsters for points
3. Collect loot to get stronger
4. Top daily score wins the prize pool

## Setup

### Get Testnet ETH

1. Visit [testnet.megaeth.com](https://testnet.megaeth.com)
2. Connect wallet and claim free ETH

### Add MegaETH Network

```
Network: MegaETH Testnet
Chain ID: 6343
RPC: https://carrot.megaeth.com/rpc
Symbol: ETH
Explorer: megaeth-testnet.explorer.caldera.xyz
```

## Smart Contract

Deployed on MegaETH Testnet (V4):

```
0x6023678244e0E009B751e418436871dC52378946
```

### Pay-Before-Play Flow

```solidity
// 1. Player pays 0.001 ETH to start
function startGame() external payable;

// 2. After game over, submit score (free)
function submitScore(uint32 score, uint32 wave, uint32 kills, bytes16 name) external;
```

### Prize Distribution

- 95% of entry fees → Daily prize pool
- 5% → Platform fee
- Top scorer at 24h epoch end wins the pool

## Development

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build
```

### Deploy Contract

```bash
cd contracts
cp .env.example .env
# Add your private key to .env

forge script script/DeployV4.s.sol \
  --rpc-url https://carrot.megaeth.com/rpc \
  --broadcast \
  --gas-price 1000001 \
  --gas-limit 150000000
```

## Tech Stack

- **Frontend:** React, Vite
- **Auth:** Privy (email + wallet)
- **Blockchain:** MegaETH (10ms blocks)
- **Contract:** Solidity, Foundry

## License

MIT

---

Built on [MegaETH](https://megaeth.com)
