// storage.js - Local storage fallback when server unavailable
// Provides same API interface, stores data in localStorage

const Storage = {
  API_URL: 'http://localhost:3001',
  useServer: false, // Will be set on init

  async init() {
    try {
      const res = await fetch(`${this.API_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      this.useServer = res.ok;
    } catch {
      this.useServer = false;
    }
    console.log(`Storage mode: ${this.useServer ? 'SERVER' : 'LOCAL'}`);
    return this.useServer;
  },

  // LOCAL STORAGE HELPERS
  _get(key, defaultVal = null) {
    try {
      const val = localStorage.getItem(`arena_${key}`);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  },

  _set(key, val) {
    localStorage.setItem(`arena_${key}`, JSON.stringify(val));
  },

  // CHARACTER
  getCharacter() {
    return this._get('character', {
      level: 1,
      xp: 0,
      gold: 0,
      totalKills: 0,
      highestWave: 0,
      highestScore: 0,
      gamesPlayed: 0
    });
  },

  saveCharacter(data) {
    const char = this.getCharacter();
    Object.assign(char, data);
    this._set('character', char);
  },

  // INVENTORY
  getInventory() {
    return this._get('inventory', []);
  },

  addItem(item) {
    const inv = this.getInventory();
    item.id = Date.now() + Math.random();
    inv.push(item);
    this._set('inventory', inv);
    return item;
  },

  consumeItem(itemId) {
    const inv = this.getInventory();
    const idx = inv.findIndex(i => i.id === itemId);
    if (idx > -1) {
      inv.splice(idx, 1);
      this._set('inventory', inv);
      return true;
    }
    return false;
  },

  // LEADERBOARD (local only)
  getLeaderboard(type = 'score') {
    const entries = this._get('leaderboard', []);
    const sortKey = type === 'wave' ? 'wave' : type === 'kills' ? 'kills' : 'score';
    return entries.sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 100);
  },

  addLeaderboardEntry(entry) {
    const entries = this._get('leaderboard', []);
    entry.id = Date.now();
    entry.date = new Date().toISOString();
    entries.push(entry);
    this._set('leaderboard', entries);
    return entry;
  },

  // STATS
  getStats() {
    const entries = this._get('leaderboard', []);
    const char = this.getCharacter();
    return {
      totalPlayers: 1, // Local = 1 player
      totalGames: entries.length,
      totalKills: entries.reduce((sum, e) => sum + (e.kills || 0), 0),
      topScore: entries.length > 0 ? Math.max(...entries.map(e => e.score || 0)) : 0
    };
  },

  // RESET
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('arena_'))
      .forEach(k => localStorage.removeItem(k));
  }
};

// Auto-init on load
Storage.init();
