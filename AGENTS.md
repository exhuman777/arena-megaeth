# AGENTS.md

## Overview

Browser-based roguelike survival game with permadeath. Endless monster waves, loot, and global leaderboard. No build step for frontend.

## Commands

```bash
# Frontend - static files, no build
open arena.html
# or: npx serve .

# Server (optional)
cd server && npm install && npm start  # port 3001

# Build for Neocities
./build-neocities.sh  # creates dist-neocities/
```

## Architecture

```
arena-megaeth/
  *.html           # Static pages (arena, hub, about)
  assets/
    arena.js       # Game loop, rendering, combat (~2600 lines)
    entity.js      # Player/monster, AI behaviors
    item.js        # Equipment, rarity, drops
    skill.js       # Spells, abilities
    map.js         # Dungeon gen, pathfinding
    rot.js         # ROT.js roguelike library
    storage.js     # localStorage fallback
  server/          # Optional Node.js backend
  contracts/       # On-chain components (if any)
```

## Key Patterns

- Turn-based: ROT.js Speed scheduler
- Rendering: Canvas 32x32 tiles
- AI behaviors: chase, erratic, swarm, flanking, web, poison
- Rarity: common(1x) → legendary(3x)
- Storage: Server-first with localStorage fallback

## Code Style

- Vanilla JS (no framework)
- ES6+ features OK
- Comment complex game logic

## Don't Touch

- `rot.js` (external library)
- Deployed contract addresses

## Deployment

- Static: Neocities, GitHub Pages (offline mode)
- Full: VPS with server/ running on port 3001
