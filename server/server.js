const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'arena-survival-secret-key-change-in-production';

// Database setup
const db = new Database(path.join(__dirname, 'arena.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 0,
    max_hp INTEGER DEFAULT 100,
    base_damage INTEGER DEFAULT 8,
    base_defense INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    best_wave INTEGER DEFAULT 0,
    playtime_seconds INTEGER DEFAULT 0,
    free_rounds_used INTEGER DEFAULT 0,
    last_played_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_data TEXT,
    quantity INTEGER DEFAULT 1,
    equipped INTEGER DEFAULT 0,
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    wave INTEGER NOT NULL,
    kills INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    reward_type TEXT NOT NULL,
    reward_data TEXT,
    min_score INTEGER DEFAULT 0,
    min_wave INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS claimed_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
  );
`);

// Migrate existing characters - add free rounds columns
try {
  db.exec(`ALTER TABLE characters ADD COLUMN free_rounds_used INTEGER DEFAULT 0`);
} catch (e) { /* column exists */ }
try {
  db.exec(`ALTER TABLE characters ADD COLUMN last_played_date TEXT`);
} catch (e) { /* column exists */ }

// Create default admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)').run('admin', hashedPassword);
  console.log('Default admin created: admin / admin123');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(username, hashedPassword, email || null);

    // Create default character
    db.prepare('INSERT INTO characters (user_id, name) VALUES (?, ?)').run(result.lastInsertRowid, username);

    res.json({ success: true, message: 'Account created' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
});

// ==================== CHARACTER ROUTES ====================

// Get character
app.get('/api/character', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const inventory = db.prepare('SELECT * FROM inventory WHERE character_id = ?').all(character.id);

  res.json({ character, inventory });
});

// Update character after game
app.post('/api/character/update', authMiddleware, (req, res) => {
  const { score, wave, kills, time_seconds, gold_earned, xp_earned } = req.body;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  // Update stats
  const newXp = character.xp + (xp_earned || 0);
  const newGold = character.gold + (gold_earned || 0);
  const newKills = character.total_kills + (kills || 0);
  const newGames = character.total_games + 1;
  const newPlaytime = character.playtime_seconds + (time_seconds || 0);
  const bestScore = Math.max(character.best_score, score || 0);
  const bestWave = Math.max(character.best_wave, wave || 0);

  // Check level up
  let level = character.level;
  let xpNeeded = level * 100;
  let xp = newXp;
  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    xpNeeded = level * 100;
  }

  db.prepare(`
    UPDATE characters SET
      xp = ?, gold = ?, level = ?,
      total_kills = ?, total_games = ?, playtime_seconds = ?,
      best_score = ?, best_wave = ?
    WHERE id = ?
  `).run(xp, newGold, level, newKills, newGames, newPlaytime, bestScore, bestWave, character.id);

  // Add to leaderboard
  db.prepare('INSERT INTO leaderboard (user_id, character_id, score, wave, kills, time_seconds) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, character.id, score || 0, wave || 0, kills || 0, time_seconds || 0);

  res.json({ success: true, level_up: level > character.level, new_level: level });
});

// ==================== GAME ACCESS ROUTES ====================

const FREE_ROUNDS_PER_DAY = 3;
const GOLD_PER_GAME = 50;

// Check if user can play
app.get('/api/game/canPlay', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const today = new Date().toISOString().split('T')[0];

  // Reset free rounds if new day
  let freeRoundsUsed = character.free_rounds_used || 0;
  if (character.last_played_date !== today) {
    freeRoundsUsed = 0;
  }

  const freeRoundsLeft = FREE_ROUNDS_PER_DAY - freeRoundsUsed;
  const canPlayFree = freeRoundsLeft > 0;
  const canPayGold = character.gold >= GOLD_PER_GAME;

  res.json({
    canPlay: canPlayFree || canPayGold,
    freeRoundsLeft,
    freeRoundsTotal: FREE_ROUNDS_PER_DAY,
    gold: character.gold,
    goldCost: GOLD_PER_GAME,
    canPlayFree,
    canPayGold
  });
});

// Start a game (consume free round or gold)
app.post('/api/game/start', authMiddleware, (req, res) => {
  const { useGold } = req.body;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const today = new Date().toISOString().split('T')[0];

  // Reset free rounds if new day
  let freeRoundsUsed = character.free_rounds_used || 0;
  if (character.last_played_date !== today) {
    freeRoundsUsed = 0;
  }

  const freeRoundsLeft = FREE_ROUNDS_PER_DAY - freeRoundsUsed;

  // Prefer free rounds unless explicitly paying gold
  if (!useGold && freeRoundsLeft > 0) {
    db.prepare('UPDATE characters SET free_rounds_used = ?, last_played_date = ? WHERE id = ?')
      .run(freeRoundsUsed + 1, today, character.id);
    return res.json({
      success: true,
      method: 'free',
      freeRoundsLeft: freeRoundsLeft - 1,
      gold: character.gold
    });
  }

  // Pay with gold
  if (character.gold >= GOLD_PER_GAME) {
    db.prepare('UPDATE characters SET gold = gold - ?, last_played_date = ? WHERE id = ?')
      .run(GOLD_PER_GAME, today, character.id);
    return res.json({
      success: true,
      method: 'gold',
      goldSpent: GOLD_PER_GAME,
      freeRoundsLeft,
      gold: character.gold - GOLD_PER_GAME
    });
  }

  res.status(400).json({ error: 'No free rounds left and not enough gold' });
});

// ==================== LEADERBOARD ROUTES ====================

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type || 'score'; // score, wave, kills
  let orderBy = 'score';
  if (type === 'wave') orderBy = 'wave';
  if (type === 'kills') orderBy = 'kills';

  const entries = db.prepare(`
    SELECT l.*, u.username, c.level
    FROM leaderboard l
    JOIN users u ON l.user_id = u.id
    JOIN characters c ON l.character_id = c.id
    ORDER BY l.${orderBy} DESC
    LIMIT 100
  `).all();

  res.json(entries);
});

// Get user's best scores
app.get('/api/leaderboard/me', authMiddleware, (req, res) => {
  const entries = db.prepare(`
    SELECT * FROM leaderboard
    WHERE user_id = ?
    ORDER BY score DESC
    LIMIT 10
  `).all(req.user.id);

  res.json(entries);
});

// ==================== ADMIN ROUTES ====================

// Get all users
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, email, is_admin, created_at FROM users').all();
  res.json(users);
});

// Get all rewards
app.get('/api/admin/rewards', authMiddleware, adminMiddleware, (req, res) => {
  const rewards = db.prepare('SELECT * FROM rewards').all();
  res.json(rewards);
});

// Create reward
app.post('/api/admin/rewards', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, reward_type, reward_data, min_score, min_wave } = req.body;
  const result = db.prepare('INSERT INTO rewards (name, description, reward_type, reward_data, min_score, min_wave) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, description, reward_type, JSON.stringify(reward_data), min_score || 0, min_wave || 0);
  res.json({ success: true, id: result.lastInsertRowid });
});

// Delete reward
app.delete('/api/admin/rewards/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM rewards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get stats
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalGames = db.prepare('SELECT SUM(total_games) as sum FROM characters').get().sum || 0;
  const totalKills = db.prepare('SELECT SUM(total_kills) as sum FROM characters').get().sum || 0;
  const topScore = db.prepare('SELECT MAX(score) as max FROM leaderboard').get().max || 0;
  const topWave = db.prepare('SELECT MAX(wave) as max FROM leaderboard').get().max || 0;

  res.json({ totalUsers, totalGames, totalKills, topScore, topWave });
});

// ==================== REWARDS ROUTES ====================

// Get available rewards
app.get('/api/rewards', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const claimed = db.prepare('SELECT reward_id FROM claimed_rewards WHERE user_id = ?').all(req.user.id).map(r => r.reward_id);

  const rewards = db.prepare('SELECT * FROM rewards WHERE active = 1').all();
  const available = rewards.filter(r =>
    !claimed.includes(r.id) &&
    character.best_score >= r.min_score &&
    character.best_wave >= r.min_wave
  );

  res.json({ available, claimed: rewards.filter(r => claimed.includes(r.id)) });
});

// Claim reward
app.post('/api/rewards/claim/:id', authMiddleware, (req, res) => {
  const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  // Check eligibility
  if (character.best_score < reward.min_score || character.best_wave < reward.min_wave) {
    return res.status(400).json({ error: 'Not eligible for this reward' });
  }

  // Check if already claimed
  const alreadyClaimed = db.prepare('SELECT id FROM claimed_rewards WHERE user_id = ? AND reward_id = ?').get(req.user.id, reward.id);
  if (alreadyClaimed) {
    return res.status(400).json({ error: 'Reward already claimed' });
  }

  // Apply reward
  const rewardData = JSON.parse(reward.reward_data || '{}');
  if (rewardData.gold) {
    db.prepare('UPDATE characters SET gold = gold + ? WHERE id = ?').run(rewardData.gold, character.id);
  }
  if (rewardData.item) {
    db.prepare('INSERT INTO inventory (character_id, item_type, item_name, item_data) VALUES (?, ?, ?, ?)')
      .run(character.id, rewardData.item.type, rewardData.item.name, JSON.stringify(rewardData.item));
  }

  // Mark as claimed
  db.prepare('INSERT INTO claimed_rewards (user_id, reward_id) VALUES (?, ?)').run(req.user.id, reward.id);

  res.json({ success: true, message: `Claimed: ${reward.name}` });
});

// ==================== INVENTORY ROUTES ====================

// Get all inventory items
app.get('/api/inventory', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  if (!character) return res.json({ success: true, inventory: [] });

  const inventory = db.prepare('SELECT * FROM inventory WHERE character_id = ?').all(character.id);

  // Parse item_data for each item
  const items = inventory.map(item => ({
    ...item,
    item_data: item.item_data ? JSON.parse(item.item_data) : {}
  }));

  res.json({ success: true, inventory: items });
});

// Add item from game
app.post('/api/inventory/add', authMiddleware, (req, res) => {
  const { item_type, item_name, item_data } = req.body;
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  db.prepare('INSERT INTO inventory (character_id, item_type, item_name, item_data) VALUES (?, ?, ?, ?)')
    .run(character.id, item_type, item_name, JSON.stringify(item_data));

  res.json({ success: true });
});

// Equip item
app.post('/api/inventory/equip/:id', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND character_id = ?').get(req.params.id, character.id);

  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Unequip other items of same type
  db.prepare('UPDATE inventory SET equipped = 0 WHERE character_id = ? AND item_type = ?').run(character.id, item.item_type);

  // Equip this item
  db.prepare('UPDATE inventory SET equipped = 1 WHERE id = ?').run(item.id);

  res.json({ success: true });
});

// Unequip item
app.post('/api/inventory/unequip/:id', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND character_id = ?').get(req.params.id, character.id);

  if (!item) return res.status(404).json({ error: 'Item not found' });

  db.prepare('UPDATE inventory SET equipped = 0 WHERE id = ?').run(item.id);

  res.json({ success: true });
});

// Sell item
app.post('/api/inventory/sell/:id', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND character_id = ?').get(req.params.id, character.id);

  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.equipped) return res.status(400).json({ error: 'Cannot sell equipped item' });

  const itemData = JSON.parse(item.item_data || '{}');
  const sellPrice = Math.floor((itemData.tier || 1) * 25);

  db.prepare('DELETE FROM inventory WHERE id = ?').run(item.id);
  db.prepare('UPDATE characters SET gold = gold + ? WHERE id = ?').run(sellPrice, character.id);

  res.json({ success: true, gold: sellPrice });
});

// Consume potion (used in arena)
app.post('/api/inventory/consume/:id', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND character_id = ?').get(req.params.id, character.id);

  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.item_type !== 'potion') return res.status(400).json({ error: 'Can only consume potions' });

  db.prepare('DELETE FROM inventory WHERE id = ?').run(item.id);
  res.json({ success: true });
});

// ==================== TRAINING ROUTES ====================

// Get upgrade costs
app.get('/api/training', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  const upgrades = {
    max_hp: { current: character.max_hp, cost: Math.floor(character.max_hp * 2), increase: 10 },
    base_damage: { current: character.base_damage, cost: Math.floor(character.base_damage * 15), increase: 2 },
    base_defense: { current: character.base_defense, cost: Math.floor((character.base_defense + 1) * 20), increase: 1 }
  };

  res.json({ gold: character.gold, upgrades });
});

// Purchase upgrade
app.post('/api/training/upgrade', authMiddleware, (req, res) => {
  const { stat } = req.body;
  if (!['max_hp', 'base_damage', 'base_defense'].includes(stat)) {
    return res.status(400).json({ error: 'Invalid stat' });
  }

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  let cost, increase;
  if (stat === 'max_hp') {
    cost = Math.floor(character.max_hp * 2);
    increase = 10;
  } else if (stat === 'base_damage') {
    cost = Math.floor(character.base_damage * 15);
    increase = 2;
  } else {
    cost = Math.floor((character.base_defense + 1) * 20);
    increase = 1;
  }

  if (character.gold < cost) {
    return res.status(400).json({ error: 'Not enough gold' });
  }

  db.prepare(`UPDATE characters SET gold = gold - ?, ${stat} = ${stat} + ? WHERE id = ?`).run(cost, increase, character.id);

  res.json({ success: true, newValue: character[stat] + increase });
});

// ==================== SHOP ROUTES ====================

const shopItems = [
  { id: 1, name: 'Health Potion', type: 'potion', price: 50, data: { effect: 'heal', value: 30 } },
  { id: 2, name: 'Greater Health Potion', type: 'potion', price: 100, data: { effect: 'heal', value: 60 } },
  { id: 3, name: 'Speed Elixir', type: 'potion', price: 75, data: { effect: 'speed', value: 5000 } },
  { id: 4, name: 'Strength Tonic', type: 'potion', price: 80, data: { effect: 'strength', value: 8000 } },
  { id: 5, name: 'Iron Sword', type: 'weapon', price: 200, data: { damage: 10, tier: 2 } },
  { id: 6, name: 'Steel Blade', type: 'weapon', price: 400, data: { damage: 14, tier: 3 } },
  { id: 7, name: 'Chainmail', type: 'armor', price: 250, data: { defense: 6, tier: 2 } },
  { id: 8, name: 'Plate Armor', type: 'armor', price: 500, data: { defense: 12, tier: 3 } },
];

app.get('/api/shop', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT gold FROM characters WHERE user_id = ?').get(req.user.id);
  res.json({ gold: character.gold, items: shopItems });
});

app.post('/api/shop/buy', authMiddleware, (req, res) => {
  const { itemId } = req.body;
  const shopItem = shopItems.find(i => i.id === itemId);

  if (!shopItem) return res.status(404).json({ error: 'Item not found' });

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  if (character.gold < shopItem.price) {
    return res.status(400).json({ error: 'Not enough gold' });
  }

  db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ?').run(shopItem.price, character.id);
  db.prepare('INSERT INTO inventory (character_id, item_type, item_name, item_data) VALUES (?, ?, ?, ?)')
    .run(character.id, shopItem.type, shopItem.name, JSON.stringify(shopItem.data));

  res.json({ success: true });
});

// ==================== ACHIEVEMENTS ====================

const achievements = [
  { id: 1, name: 'First Blood', desc: 'Kill your first enemy', check: c => c.total_kills >= 1, reward: 50 },
  { id: 2, name: 'Warrior', desc: 'Kill 100 enemies', check: c => c.total_kills >= 100, reward: 200 },
  { id: 3, name: 'Slayer', desc: 'Kill 500 enemies', check: c => c.total_kills >= 500, reward: 500 },
  { id: 4, name: 'Legend', desc: 'Kill 1000 enemies', check: c => c.total_kills >= 1000, reward: 1000 },
  { id: 5, name: 'Survivor', desc: 'Reach wave 5', check: c => c.best_wave >= 5, reward: 100 },
  { id: 6, name: 'Veteran', desc: 'Reach wave 10', check: c => c.best_wave >= 10, reward: 300 },
  { id: 7, name: 'Champion', desc: 'Reach wave 15', check: c => c.best_wave >= 15, reward: 600 },
  { id: 8, name: 'Score Hunter', desc: 'Score 1000 points', check: c => c.best_score >= 1000, reward: 150 },
  { id: 9, name: 'High Scorer', desc: 'Score 5000 points', check: c => c.best_score >= 5000, reward: 400 },
  { id: 10, name: 'Dedicated', desc: 'Play 10 games', check: c => c.total_games >= 10, reward: 100 },
  { id: 11, name: 'Addict', desc: 'Play 50 games', check: c => c.total_games >= 50, reward: 300 },
  { id: 12, name: 'Leveled Up', desc: 'Reach level 5', check: c => c.level >= 5, reward: 200 },
  { id: 13, name: 'Experienced', desc: 'Reach level 10', check: c => c.level >= 10, reward: 500 },
];

// Initialize achievements table
db.exec(`
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, achievement_id)
  );
`);

app.get('/api/achievements', authMiddleware, (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);
  const claimed = db.prepare('SELECT achievement_id FROM achievements WHERE user_id = ?').all(req.user.id).map(a => a.achievement_id);

  const result = achievements.map(a => ({
    ...a,
    unlocked: a.check(character),
    claimed: claimed.includes(a.id)
  }));

  res.json(result);
});

app.post('/api/achievements/claim/:id', authMiddleware, (req, res) => {
  const achId = parseInt(req.params.id);
  const achievement = achievements.find(a => a.id === achId);

  if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

  const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.id);

  if (!achievement.check(character)) {
    return res.status(400).json({ error: 'Achievement not unlocked' });
  }

  const alreadyClaimed = db.prepare('SELECT id FROM achievements WHERE user_id = ? AND achievement_id = ?').get(req.user.id, achId);
  if (alreadyClaimed) {
    return res.status(400).json({ error: 'Already claimed' });
  }

  db.prepare('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)').run(req.user.id, achId);
  db.prepare('UPDATE characters SET gold = gold + ? WHERE id = ?').run(achievement.reward, character.id);

  res.json({ success: true, gold: achievement.reward });
});

// Start server
app.listen(PORT, () => {
  console.log(`Arena Survival API running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
