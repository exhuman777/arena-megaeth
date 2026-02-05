# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Browser-based roguelike survival game with permadeath. Endless monster waves, loot, and global leaderboard. No build step for frontend.

## Commands

### Frontend
Static HTML files. Open `arena.html` directly or serve with any static server.

### Server (optional, in `server/`)
```bash
npm install && npm start   # Express API on port 3001
```

### Trailer (in `trailer/`)
```bash
npm run start              # Remotion studio
npm run render             # Full trailer → out/trailer.mp4
```

### Build Neocities Distribution
```bash
./build-neocities.sh       # Creates dist-neocities/ folder
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ index.html  │  │ arena.html  │  │ hub.html    │  ...pages    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │                  assets/                       │              │
│  ├───────────────────────────────────────────────┤              │
│  │  arena.js    ← Game loop, rendering, combat   │              │
│  │  entity.js   ← Player/monster class, AI       │              │
│  │  item.js     ← Equipment, rarity, drops       │              │
│  │  skill.js    ← Spells, abilities              │              │
│  │  map.js      ← Dungeon gen, pathfinding       │              │
│  │  rot.js      ← ROT.js roguelike library       │              │
│  │  storage.js  ← localStorage fallback          │              │
│  └───────────────────────────────────────────────┘              │
│         │                                                        │
│         │ localStorage (offline) OR fetch (online)               │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼ (optional)
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js)                            │
├─────────────────────────────────────────────────────────────────┤
│  server.js          ← Express REST API                           │
│  ├── /api/auth      ← JWT login/register                         │
│  ├── /api/character ← Save progress, XP, gold                    │
│  ├── /api/inventory ← Persistent items                           │
│  └── /api/leaderboard ← Global rankings                          │
│                                                                  │
│  arena.db           ← SQLite (better-sqlite3)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Options

### 1. Static Only (Neocities, GitHub Pages)
- Run `./build-neocities.sh`
- Upload `dist-neocities/` contents
- Works fully offline, localStorage saves
- No global leaderboard

### 2. Full Stack (VPS, Railway, Render)
```bash
# Backend
cd server && npm install && npm start  # port 3001

# Frontend
# Serve root folder via nginx/caddy
# OR use GitHub Pages + point API_URL to your server
```

### 3. Local Dev
```bash
# Just open arena.html in browser
# Or: npx serve .
```

## Key Patterns

- **Turn-based**: ROT.js Speed scheduler manages action order
- **Rendering**: Canvas 32x32 tiles, tilemap.js handles sprites
- **Combat**: Damage formula in entity.js, floating numbers in arena.js
- **AI**: Behaviors in entity.js (chase, erratic, swarm, flanking, web, poison)
- **Rarity**: common(1x)→uncommon(1.2x)→rare(1.5x)→epic(2x)→legendary(3x)
- **Storage**: Server-first with localStorage fallback (storage.js)

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

## Key Files

| File | Purpose |
|------|---------|
| `assets/arena.js` | Game loop, rendering, combat (~2600 lines) |
| `assets/entity.js` | Player/monster, AI behaviors |
| `assets/item.js` | Equipment, rarity multipliers |
| `assets/items.js` | Item definitions database |
| `assets/skill.js` | Spell mechanics |
| `assets/skills.js` | Skill definitions |
| `assets/storage.js` | localStorage API for offline mode |
| `server/server.js` | Express API, auth, leaderboard |
