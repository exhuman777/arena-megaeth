// Arena Survival - Enhanced Version
var ArenaGame = {
  display: null,
  canvas: null,
  ctx: null,
  screenWidth: 25,
  screenHeight: 18,
  tileSize: 32,
  lastTime: 0,
  deltaTime: 0,
  score: 0,
  kills: 0,
  combo: 0,
  comboTimer: 0,
  gameOver: false,
  paused: false,
  spawnTimer: 0,
  spawnInterval: 2500,
  difficulty: 1,
  keys: {},
  player: null,
  entities: [],
  items: [],
  map: null,
  attackCooldown: 0,
  aoeCooldown: 0,
  gameTime: 0,

  // Backend connection
  token: null,
  user: null,
  savedToBackend: false,

  // Loot system
  collectedLoot: [],
  showLootScreen: false,
  selectedLootIndex: -1,

  // Death recap - track recent damage sources
  recentDamage: [],

  // Potion belt - potions from inventory usable with 1-3 keys
  potionBelt: [], // [{id, name, effect, value, color}, ...]

  // Rarity system
  rarities: {
    common: { name: 'Common', color: '#aaa', multiplier: 1.0, chance: 0.50 },
    uncommon: { name: 'Uncommon', color: '#4f4', multiplier: 1.2, chance: 0.30 },
    rare: { name: 'Rare', color: '#44f', multiplier: 1.5, chance: 0.15 },
    epic: { name: 'Epic', color: '#a4f', multiplier: 2.0, chance: 0.04 },
    legendary: { name: 'Legendary', color: '#fa0', multiplier: 3.0, chance: 0.01 }
  },

  // Particles for effects
  particles: [],
  floatingTexts: [],
  ambientParticles: [],
  screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },

  // Monster definitions with behaviors and special abilities
  monsterDefs: {
    // Basic enemies (Wave 1-2)
    goblin: { hp: 12, damage: 4, speed: 350, xp: 5, behavior: 'chase', color: '#4a4' },
    bat: { hp: 6, damage: 2, speed: 180, xp: 3, behavior: 'erratic', color: '#644' },
    leech: { hp: 10, damage: 5, speed: 250, xp: 6, behavior: 'swarm', color: '#a44' },
    worm: { hp: 8, damage: 3, speed: 220, xp: 4, behavior: 'swarm', color: '#864' },

    // Wave 2-3
    imp: { hp: 15, damage: 6, speed: 300, xp: 8, behavior: 'chase', color: '#f44', ability: 'fireball' },
    skeleton: { hp: 20, damage: 8, speed: 400, xp: 10, behavior: 'cautious', color: '#ddd' },
    snake1: { hp: 18, damage: 10, speed: 200, xp: 10, behavior: 'erratic', color: '#4a4', ability: 'poison' },
    flyingeye: { hp: 14, damage: 7, speed: 240, xp: 9, behavior: 'erratic', color: '#f4f' },

    // Wave 3-4
    scorpion1: { hp: 25, damage: 12, speed: 280, xp: 12, behavior: 'flanking', color: '#a64', ability: 'poison' },
    orc1: { hp: 30, damage: 10, speed: 450, xp: 15, behavior: 'aggressive', color: '#484' },
    spider: { hp: 18, damage: 8, speed: 220, xp: 11, behavior: 'web', color: '#444', ability: 'web' },

    // Wave 4-5
    orc2: { hp: 35, damage: 12, speed: 480, xp: 18, behavior: 'aggressive', color: '#4a4' },
    gorilla: { hp: 45, damage: 16, speed: 350, xp: 22, behavior: 'charge', color: '#654', ability: 'charge' },
    assassin: { hp: 25, damage: 18, speed: 200, xp: 20, behavior: 'teleport', color: '#408', ability: 'teleport' },

    // Wave 5-6
    orc3: { hp: 40, damage: 14, speed: 500, xp: 20, behavior: 'aggressive', color: '#4a4' },
    ogre: { hp: 60, damage: 18, speed: 600, xp: 30, behavior: 'slow', color: '#864', ability: 'slam' },
    necromancer: { hp: 35, damage: 10, speed: 500, xp: 35, behavior: 'ranged', color: '#808', ability: 'summon' },

    // Wave 6-7
    icebeast: { hp: 50, damage: 15, speed: 550, xp: 25, behavior: 'ranged', color: '#4cf', ability: 'freeze' },
    vampire: { hp: 40, damage: 14, speed: 350, xp: 28, behavior: 'chase', color: '#a04', ability: 'lifesteal' },
    fireelemental: { hp: 45, damage: 16, speed: 400, xp: 30, behavior: 'chase', color: '#f80', ability: 'firetrail' },

    // Wave 7-8
    giantzombie: { hp: 80, damage: 22, speed: 700, xp: 40, behavior: 'slow', color: '#686' },
    golem: { hp: 100, damage: 20, speed: 800, xp: 45, behavior: 'slow', color: '#888', ability: 'knockback' },
    icemage: { hp: 35, damage: 12, speed: 450, xp: 35, behavior: 'ranged', color: '#0af', ability: 'icestorm' },

    // Wave 8+
    giant: { hp: 120, damage: 25, speed: 800, xp: 50, behavior: 'slow', color: '#a86' },
    demon: { hp: 70, damage: 22, speed: 400, xp: 55, behavior: 'charge', color: '#f00', ability: 'hellfire' },
    spiderqueen: { hp: 60, damage: 15, speed: 500, xp: 50, behavior: 'summon', color: '#404', ability: 'spawnlings' },

    // Bosses (every 5 waves)
    dragon: { hp: 200, damage: 35, speed: 600, xp: 150, behavior: 'boss', color: '#f40', ability: 'firebreath', isBoss: true },
    lich: { hp: 150, damage: 25, speed: 500, xp: 120, behavior: 'boss', color: '#80f', ability: 'deathwave', isBoss: true },
    titangolem: { hp: 300, damage: 40, speed: 900, xp: 180, behavior: 'boss', color: '#aaa', ability: 'earthquake', isBoss: true },
  },

  // Waves unlock stronger monsters
  waveMonsters: [
    ['goblin', 'bat', 'leech'],
    ['goblin', 'bat', 'imp', 'worm'],
    ['imp', 'skeleton', 'snake1', 'flyingeye'],
    ['skeleton', 'orc1', 'scorpion1', 'spider'],
    ['orc1', 'orc2', 'gorilla', 'assassin'],
    ['orc2', 'orc3', 'ogre', 'necromancer'],
    ['ogre', 'icebeast', 'vampire', 'fireelemental'],
    ['giantzombie', 'golem', 'icemage'],
    ['giant', 'demon', 'spiderqueen'],
    ['demon', 'dragon', 'lich'],
  ],

  // Boss pool for boss waves
  bosses: ['dragon', 'lich', 'titangolem'],

  // Projectiles in flight
  projectiles: [],

  // Hazards on ground (fire, webs, ice)
  hazards: [],

  // Available weapon sprites
  weaponList: [
    { name: 'Knife', symbol: 'knife', damage: 3, color: '#aaa', tier: 1 },
    { name: 'Short Sword', symbol: 'shortsword1', damage: 5, color: '#ccc', tier: 1 },
    { name: 'Long Sword', symbol: 'longsword', damage: 8, color: '#ddd', tier: 2 },
    { name: 'Fire Blade', symbol: 'shortsword5', damage: 10, color: '#f64', effect: 'fire', tier: 2 },
    { name: 'Ice Blade', symbol: 'shortsword7', damage: 8, color: '#4cf', effect: 'ice', tier: 2 },
    { name: 'Poison Dagger', symbol: 'shortsword3', damage: 6, color: '#4f4', effect: 'poison', tier: 2 },
    { name: 'Battle Axe', symbol: 'shortsword8', damage: 14, color: '#c84', tier: 3 },
    { name: 'Flame Staff', symbol: 'staff5', damage: 12, color: '#f80', effect: 'fire', tier: 3 },
    { name: 'Frost Staff', symbol: 'staff7', damage: 10, color: '#0cf', effect: 'ice', tier: 3 },
    { name: 'Glefa', symbol: 'glefa', damage: 16, color: '#ff0', tier: 4 },
    { name: 'Longsword+', symbol: 'longsword2', damage: 18, color: '#faf', tier: 4 },
  ],

  // Available armor sprites
  armorList: [
    { name: 'Cloak', symbol: 'simplecloak', defense: 2, color: '#864', tier: 1 },
    { name: 'Leather', symbol: 'cloak1', defense: 4, color: '#a64', tier: 1 },
    { name: 'Chainmail', symbol: 'chainmail', defense: 6, color: '#aaa', tier: 2 },
    { name: 'Scale Mail', symbol: 'armor1', defense: 8, color: '#8a8', tier: 2 },
    { name: 'Plate Armor', symbol: 'armor2', defense: 12, color: '#ccc', tier: 3 },
    { name: 'Dragon Scale', symbol: 'armor3', defense: 16, color: '#f84', tier: 4 },
  ],

  // Potions
  potionList: [
    { name: 'Health Potion', symbol: 'potion1', effect: 'heal', value: 30, color: '#f44' },
    { name: 'Greater Health', symbol: 'potion2', effect: 'heal', value: 60, color: '#f66' },
    { name: 'Speed Potion', symbol: 'potion5', effect: 'speed', value: 5000, color: '#4cf' },
    { name: 'Strength Potion', symbol: 'potion8', effect: 'strength', value: 8000, color: '#f80' },
    { name: 'Shield Potion', symbol: 'potion11', effect: 'shield', value: 6000, color: '#88f' },
  ],

  // Player buffs
  buffs: { speed: 0, strength: 0, shield: 0 },

  equipment: { weapon: null, armor: null },
  xp: 0,
  level: 1,
  xpToLevel: 50,

  // Raven icon mapping (32x32 grid, 16 icons per row)
  // Icon index to [x, y] position on spritesheet
  ravenIcons: {
    // Weapons (row ~1-5)
    sword: 0, axe: 1, spear: 2, dagger: 3, bow: 4, staff: 5, mace: 6, hammer: 7,
    // Armor (row ~6-10)
    helmet: 80, chest: 81, shield: 82, boots: 83, gloves: 84, cloak: 85,
    // Potions (row ~11-15)
    healthPotion: 160, manaPotion: 161, speedPotion: 162, strengthPotion: 163,
    // Stats icons
    heart: 240, attack: 241, defense: 242, gold: 243, xp: 244, level: 245,
    // Buffs
    fire: 320, ice: 321, poison: 322, lightning: 323, shield2: 324,
    // Misc
    skull: 400, star: 401, gem: 402, coin: 403, key: 404, scroll: 405,
  },

  // Get CSS background position for a raven icon
  getRavenIconStyle: function(iconIndex) {
    let x = (iconIndex % 16) * 32;
    let y = Math.floor(iconIndex / 16) * 32;
    return `background: url('assets/raven-icons.png') -${x}px -${y}px; width:32px; height:32px; display:inline-block; image-rendering:pixelated;`;
  },

  init: async function() {
    // Load user data from session
    this.token = sessionStorage.getItem('gameToken');
    this.user = JSON.parse(sessionStorage.getItem('gameUser') || 'null');

    // Load equipped items from server
    await this.loadEquipment();

    // Create ROT.js display
    this.display = new ROT.Display({
      width: this.screenWidth,
      height: this.screenHeight,
      layout: 'tile',
      tileColorize: true,
      fg: 'transparent',
      bg: 'transparent',
      tileWidth: this.tileSize,
      tileHeight: this.tileSize,
      tileSet: tileSet,
      tileMap: gameTilemap
    });

    // Create effects overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.screenWidth * this.tileSize;
    this.canvas.height = this.screenHeight * this.tileSize;
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;';
    this.ctx = this.canvas.getContext('2d');

    // Create container
    let container = document.createElement('div');
    container.id = 'game-container';
    container.style.cssText = 'position:relative;display:inline-block;';
    container.appendChild(this.display.getContainer());
    container.appendChild(this.canvas);
    document.body.appendChild(container);

    // Check for autostart (from parent dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      // Skip intro, start game immediately
      this.setupInput();
      this.createHUD();
      this.startGame();
    } else {
      // Show intro screen first
      this.showIntroScreen();
      this.setupInput();
      this.createHUD();
    }
  },

  // Simplified game - no server equipment, fresh start each game
  loadEquipment: async function() {
    // Give player basic starting gear (resets each game)
    this.equipment = {
      weapon: { name: 'Rusty Sword', damage: 3, color: '#aaa', rarity: 'common', tier: 1 },
      armor: { name: 'Cloth Tunic', defense: 1, color: '#654', rarity: 'common', tier: 1 }
    };
    this.potionBelt = [
      { name: 'Health Potion', effect: 'heal', value: 30, color: '#f44' }
    ];
  },

  // Biome themes - each is visually distinct
  biomes: [
    { wall: 'dungeonwall', floor: 'dungeonfloor', name: 'Dungeon' },
    { wall: 'sandwall', floor: 'sandfloor', name: 'Desert' },
    { wall: 'junglewall', floor: 'junglefloor', name: 'Jungle' },
    { wall: 'oldmazewall', floor: 'oldmazefloor', name: 'Ancient Maze' },
  ],
  currentBiome: 0,
  biomeTimer: 0,
  biomeInterval: 30000, // Change biome every 30 sec

  generateArena: function() {
    let biome = this.biomes[this.currentBiome];
    this.map = [];

    for (let x = 0; x < this.screenWidth; x++) {
      this.map[x] = [];
      for (let y = 0; y < this.screenHeight; y++) {
        let isWall = (x === 0 || x === this.screenWidth - 1 || y === 0 || y === this.screenHeight - 1);
        this.map[x][y] = {
          blocked: isWall,
          symbol: isWall ? biome.wall : biome.floor
        };
      }
    }
  },

  // Change biome every 30 seconds - big visual change
  updateArenaLayout: function() {
    this.biomeTimer += this.deltaTime;
    if (this.biomeTimer >= this.biomeInterval) {
      this.biomeTimer = 0;
      this.currentBiome = (this.currentBiome + 1) % this.biomes.length;
      this.generateArena();
      let biome = this.biomes[this.currentBiome];
      this.addBigText(this.player.x, this.player.y - 1, biome.name.toUpperCase(), '#4cf');
      this.addCombatLog(`🌍 ${biome.name}!`, '#4cf');
      this.createRingEffect(this.player.x, this.player.y, '#4cf', 60);
      this.triggerShake(8);
    }
  },

  // Also change on boss wave
  changeBiome: function() {
    this.currentBiome = (this.currentBiome + 1) % this.biomes.length;
    this.generateArena();
    let biome = this.biomes[this.currentBiome];
    this.addBigText(this.player.x, this.player.y - 2, biome.name.toUpperCase(), '#4cf');
    this.addCombatLog(`🌍 ${biome.name}!`, '#4cf');
  },

  spawnPlayer: function() {
    let cx = Math.floor(this.screenWidth / 2);
    let cy = Math.floor(this.screenHeight / 2);

    // Base stats
    let baseDamage = 8;
    let baseDefense = 0;

    // Apply equipment bonuses
    if (this.equipment.weapon) {
      baseDamage += this.equipment.weapon.damage || 0;
    }
    if (this.equipment.armor) {
      baseDefense += this.equipment.armor.defense || 0;
    }

    this.player = {
      x: cx, y: cy,
      visualX: cx, visualY: cy,
      hp: 120, maxHp: 120,
      damage: baseDamage,
      defense: baseDefense,
      speed: 80,
      moveTimer: 0,
      symbol: 'human',
      flash: 0,
      trail: []
    };
    // Don't reset equipment - preserve loaded equipment from server
    if (!this.equipment) this.equipment = { weapon: null, armor: null };
    this.buffs = { speed: 0, strength: 0, shield: 0 };
    this.xp = 0;
    this.level = 1;
    this.xpToLevel = 50;
    this.initAmbientParticles();
    this.addFloatingText(cx, cy, 'FIGHT!', '#ff0', 1500);
    this.createBurstParticles(cx, cy, '#ff0', 12, 150);
  },

  initAmbientParticles: function() {
    this.ambientParticles = [];
    // Reduced from 40 to 15 for performance
    for (let i = 0; i < 15; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        size: 1 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.2,
        color: ['#f44', '#44f', '#4f4', '#ff0'][Math.floor(Math.random() * 4)],
        pulse: Math.random() * Math.PI * 2
      });
    }
    this.hudUpdateTimer = 0;
  },

  setupInput: function() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Prevent browser actions on game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyX', 'KeyC', 'KeyV'].includes(e.code)) {
        e.preventDefault();
      }
      if ((e.code === 'Space' || e.code === 'Enter') && this.gameOver) this.restart();
      if (e.code === 'KeyP') this.paused = !this.paused;

      // Potion hotkeys 1, 2, 3
      if (!this.gameOver && !this.paused) {
        if (e.code === 'Digit1') this.usePotionFromBelt(0);
        if (e.code === 'Digit2') this.usePotionFromBelt(1);
        if (e.code === 'Digit3') this.usePotionFromBelt(2);
      }
    });
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);

    // Mobile touch controls
    this.setupTouchControls();
  },

  setupTouchControls: function() {
    // Detect mobile
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    ('ontouchstart' in window) || (window.innerWidth <= 900);

    if (!this.isMobile) return;

    // Create touch controls container
    const controls = document.createElement('div');
    controls.id = 'touch-controls';
    controls.innerHTML = `
      <style>
        #touch-controls {
          position: fixed;
          bottom: 10px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
          z-index: 1000;
          pointer-events: none;
        }
        .touch-dpad {
          display: grid;
          grid-template-columns: repeat(3, 60px);
          grid-template-rows: repeat(3, 60px);
          gap: 5px;
          pointer-events: auto;
        }
        .touch-btn {
          background: rgba(255,255,255,0.15);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          color: white;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }
        .touch-btn:active {
          background: rgba(255,100,100,0.4);
          border-color: #f44;
        }
        .touch-btn.empty { background: transparent; border: none; }
        .touch-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: auto;
        }
        .touch-action-btn {
          width: 70px;
          height: 70px;
          background: rgba(255,68,68,0.3);
          border: 2px solid rgba(255,68,68,0.5);
          border-radius: 50%;
          color: white;
          font-size: 14px;
          font-family: monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          -webkit-user-select: none;
        }
        .touch-action-btn:active {
          background: rgba(255,68,68,0.6);
        }
        @media (min-width: 901px) {
          #touch-controls { display: none; }
        }
      </style>
      <div class="touch-dpad">
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="up">▲</div>
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="left">◀</div>
        <div class="touch-btn" data-dir="wait">●</div>
        <div class="touch-btn" data-dir="right">▶</div>
        <div class="touch-btn empty"></div>
        <div class="touch-btn" data-dir="down">▼</div>
        <div class="touch-btn empty"></div>
      </div>
      <div class="touch-actions">
        <div class="touch-action-btn" data-action="aoe">AOE</div>
        <div class="touch-action-btn" data-action="potion">🧪</div>
      </div>
    `;
    document.body.appendChild(controls);

    // Direction mapping
    const dirMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      wait: 'KeyZ'
    };

    // Touch handlers for d-pad
    controls.querySelectorAll('.touch-btn[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      const keyCode = dirMap[dir];

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys[keyCode] = true;
        btn.style.background = 'rgba(255,100,100,0.4)';
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys[keyCode] = false;
        btn.style.background = 'rgba(255,255,255,0.15)';
      }, { passive: false });
    });

    // Action buttons
    controls.querySelector('[data-action="aoe"]').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.keys['KeyX'] = true;
      setTimeout(() => this.keys['KeyX'] = false, 100);
    }, { passive: false });

    controls.querySelector('[data-action="potion"]').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.usePotionFromBelt(0);
    }, { passive: false });

    // Tap on canvas to attack/move towards tap
    if (this.gameWrapper) {
      this.gameWrapper.addEventListener('touchstart', (e) => {
        if (e.target.closest('#touch-controls')) return;
        const touch = e.touches[0];
        const rect = this.display.getContainer().getBoundingClientRect();
        const x = Math.floor((touch.clientX - rect.left) / this.tileSize);
        const y = Math.floor((touch.clientY - rect.top) / this.tileSize);
        this.handleTapAt(x, y);
      }, { passive: true });
    }
  },

  handleTapAt: function(x, y) {
    if (this.gameOver || this.paused || !this.player) return;

    // Calculate direction to tap
    const dx = x - this.player.x;
    const dy = y - this.player.y;

    // Move one step towards tap
    if (Math.abs(dx) > Math.abs(dy)) {
      this.keys[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
      setTimeout(() => {
        this.keys['ArrowRight'] = false;
        this.keys['ArrowLeft'] = false;
      }, 100);
    } else if (dy !== 0) {
      this.keys[dy > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
      setTimeout(() => {
        this.keys['ArrowDown'] = false;
        this.keys['ArrowUp'] = false;
      }, 100);
    }
  },

  // Use potion from belt and consume from inventory
  usePotionFromBelt: async function(index) {
    if (!this.potionBelt || index >= this.potionBelt.length) return;
    const potion = this.potionBelt[index];
    if (!potion) return;

    // Use the potion
    this.usePotion(potion);

    // Remove from belt
    this.potionBelt.splice(index, 1);

    // Potions consumed locally (no server)
  },

  restart: async function() {
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.difficulty = 1;
    this.spawnInterval = 2500;
    this.gameOver = false;
    this.gameTime = 0;
    this.entities = [];
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];
    this.aoeCooldown = 0;
    this.collectedLoot = [];
    this.selectedLootIndex = -1;
    // Reset equipment and reload from server
    this.equipment = { weapon: null, armor: null };
    await this.loadEquipment();
    this.savedToBackend = false;
    this.recentDamage = [];
    this.generateArena();
    this.spawnPlayer();
  },

  // Create burst particles (radial explosion)
  createBurstParticles: function(x, y, color, count, speed) {
    if (this.particles.length >= this.MAX_PARTICLES) return;
    count = Math.min(count, 12, this.MAX_PARTICLES - this.particles.length);

    let cx = x * this.tileSize + this.tileSize / 2;
    let cy = y * this.tileSize + this.tileSize / 2;

    for (let i = 0; i < count; i++) {
      let angle = (i / count) * Math.PI * 2;
      let spd = speed * (0.6 + Math.random() * 0.4);
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 250 + Math.random() * 100,
        maxLife: 350,
        size: 2 + Math.random() * 2,
        color,
        gravity: false
      });
    }
  },

  // Create ring effect
  createRingEffect: function(x, y, color, radius) {
    this.particles.push({
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
      vx: 0, vy: 0,
      life: 300,
      maxLife: 300,
      size: 5,
      targetRadius: radius,
      currentRadius: 0,
      color,
      type: 'ring'
    });
  },

  // Create trail particle
  addTrailParticle: function(entity, color) {
    this.particles.push({
      x: entity.visualX * this.tileSize + this.tileSize / 2,
      y: entity.visualY * this.tileSize + this.tileSize / 2,
      vx: 0, vy: 0,
      life: 200,
      maxLife: 200,
      size: 6,
      color,
      gravity: false,
      type: 'trail'
    });
  },

  gameLoop: function() {
    let now = performance.now();
    this.deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    // Performance tracking
    this.frameCount = (this.frameCount || 0) + 1;
    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / this.deltaTime);
    }

    if (!this.gameOver && !this.paused) {
      this.update();
    }
    this.draw();

    requestAnimationFrame(() => this.gameLoop());
  },

  // Performance limits
  MAX_PARTICLES: 80, // Reduced for better performance
  MAX_PROJECTILES: 20,
  MAX_HAZARDS: 30,
  MAX_FLOATING_TEXTS: 15,

  update: function() {
    this.handleInput();
    this.updateEntities();
    this.updatePlayer();
    this.handleSpawning();
    this.updateDifficulty();
    this.updateEffects();
    this.updateItems();
    this.updateProjectiles();
    this.updateHazards();
    this.updateArenaLayout();
  },

  // Update projectiles
  updateProjectiles: function() {
    if (!this.projectiles) this.projectiles = [];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let p = this.projectiles[i];
      p.x += p.vx * this.deltaTime / 1000;
      p.y += p.vy * this.deltaTime / 1000;
      p.life -= this.deltaTime;

      // Trail particles (limited)
      if (Math.random() < 0.15 && this.particles.length < this.MAX_PARTICLES) {
        this.particles.push({
          x: p.x, y: p.y, vx: 0, vy: 0,
          life: 150, maxLife: 150, size: 3, color: p.color
        });
      }

      // Check collision with player
      let tileX = Math.floor(p.x / this.tileSize);
      let tileY = Math.floor(p.y / this.tileSize);

      if (tileX === this.player.x && tileY === this.player.y) {
        this.player.hp -= p.damage;
        this.player.flash = 200;
        this.addFloatingText(this.player.x, this.player.y, `-${p.damage}`, p.color);
        this.createBurstParticles(this.player.x, this.player.y, p.color, 12, 100);
        this.triggerShake(8);
        this.trackDamage(p.source || 'projectile', p.damage, 'ranged');

        // Apply effect
        if (p.effect === 'burn') {
          this.player.burning = 2000;
          this.player.burnDamage = 2;
          this.addCombatLog(`🔥 You're burning!`, '#f80');
        } else if (p.effect === 'freeze') {
          this.player.slowed = 2000;
          this.addCombatLog(`❄ You're slowed!`, '#4cf');
        }

        this.projectiles.splice(i, 1);
        continue;
      }

      // Out of bounds or expired
      if (p.life <= 0 || tileX < 0 || tileX >= this.screenWidth || tileY < 0 || tileY >= this.screenHeight) {
        this.projectiles.splice(i, 1);
      }
    }
  },

  // Update ground hazards
  updateHazards: function() {
    if (!this.hazards) this.hazards = [];

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      let h = this.hazards[i];
      h.life -= this.deltaTime;

      // Visual effect
      if (Math.random() < 0.05) {
        this.createParticles(h.x, h.y, h.color, 1);
      }

      // Check player standing on hazard
      if (h.x === this.player.x && h.y === this.player.y) {
        if (h.type === 'fire' && !this.player.fireImmune) {
          this.player.hp -= 1;
          if (Math.random() < 0.1) {
            this.addFloatingText(this.player.x, this.player.y, '-1', '#f80', 300);
            this.trackDamage('fire hazard', 1, 'hazard');
          }
        } else if (h.type === 'web') {
          this.player.slowed = 500;
        } else if (h.type === 'poison') {
          this.player.hp -= 1;
          if (Math.random() < 0.1) {
            this.addFloatingText(this.player.x, this.player.y, '-1', '#4f4', 300);
            this.trackDamage('poison pool', 1, 'hazard');
          }
        } else if (h.type === 'ice') {
          this.player.slowed = 300;
        }
      }

      // Expired
      if (h.life <= 0) {
        this.hazards.splice(i, 1);
      }
    }
  },

  updateItems: function() {
    // Remove expired items
    this.items = this.items.filter(item => {
      let age = this.gameTime - item.spawnTime;
      if (age >= item.lifetime) {
        // Fade out effect
        this.createParticles(item.x, item.y, '#888', 5);
        return false;
      }
      return true;
    });
  },

  updatePlayer: function() {
    if (!this.player) return;

    // Update player debuffs
    if (this.player.burning > 0) {
      this.player.burning -= this.deltaTime;
      if (Math.random() < 0.1) this.createParticles(this.player.x, this.player.y, '#f80', 2);
      if (this.player.burning % 500 < this.deltaTime) {
        let dmg = this.player.burnDamage || 2;
        this.player.hp -= dmg;
        this.addFloatingText(this.player.x, this.player.y, `-${dmg}`, '#f80', 400);
        this.trackDamage('burning', dmg, 'dot');
      }
    }
    if (this.player.poisoned > 0) {
      this.player.poisoned -= this.deltaTime;
      if (Math.random() < 0.08) this.createParticles(this.player.x, this.player.y, '#4f4', 2);
      if (this.player.poisoned % 600 < this.deltaTime) {
        let dmg = this.player.poisonDamage || 1;
        this.player.hp -= dmg;
        this.addFloatingText(this.player.x, this.player.y, `-${dmg}`, '#4f4', 400);
        this.trackDamage('poison', dmg, 'dot');
      }
    }
    if (this.player.slowed > 0) {
      this.player.slowed -= this.deltaTime;
      if (Math.random() < 0.05) this.createParticles(this.player.x, this.player.y, '#4cf', 1);
    }
    if (this.player.stunned > 0) {
      this.player.stunned -= this.deltaTime;
      if (Math.random() < 0.1) this.addFloatingText(this.player.x, this.player.y, '...', '#888', 200);
    }

    // Check player death from DOT
    if (this.player.hp <= 0 && !this.gameOver) {
      this.playerDeath();
      return;
    }

    // Track previous position for trail
    let prevX = this.player.visualX;
    let prevY = this.player.visualY;

    // Smooth visual movement
    this.player.visualX += (this.player.x - this.player.visualX) * 0.25;
    this.player.visualY += (this.player.y - this.player.visualY) * 0.25;

    // Add trail when moving
    let moved = Math.abs(this.player.visualX - prevX) > 0.05 || Math.abs(this.player.visualY - prevY) > 0.05;
    if (moved) {
      this.playerTrailTimer = (this.playerTrailTimer || 0) + this.deltaTime;
      if (this.playerTrailTimer > 50) {
        this.playerTrailTimer = 0;
        this.addPlayerTrail(prevX, prevY);
      }
    }
  },

  // Player movement trail
  addPlayerTrail: function(x, y) {
    let color = '#4af';
    if (this.buffs.speed > 0) color = '#4cf';
    if (this.buffs.strength > 0) color = '#f80';
    if (this.buffs.shield > 0) color = '#88f';

    this.particles.push({
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
      vx: 0, vy: 0,
      life: 300,
      maxLife: 300,
      size: 8,
      color: color,
      type: 'playerTrail',
      alpha: 0.4
    });
  },

  handleInput: function() {
    if (!this.player || this.player.hp <= 0) return;

    // Stunned - can't act
    if (this.player.stunned > 0) return;

    // Calculate effective move speed with buffs and debuffs
    let moveDelay = this.buffs.speed > 0 ? 50 : 80;
    if (this.player.slowed > 0) moveDelay *= 1.8;

    this.player.moveTimer -= this.deltaTime;
    this.attackCooldown -= this.deltaTime;
    this.aoeCooldown -= this.deltaTime;

    let dx = 0, dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy = -1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy = 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx = -1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx = 1;

    // Movement
    if (this.player.moveTimer <= 0 && (dx !== 0 || dy !== 0)) {
      let newX = this.player.x + dx;
      let newY = this.player.y + dy;

      if (newX > 0 && newX < this.screenWidth - 1 && newY > 0 && newY < this.screenHeight - 1) {
        let enemy = this.getEntityAt(newX, newY);
        if (enemy) {
          this.attack(this.player, enemy);
        } else {
          // Add trail when moving fast
          if (this.buffs.speed > 0) {
            this.addTrailParticle(this.player, '#4cf');
          }
          this.player.x = newX;
          this.player.y = newY;
        }
        this.player.moveTimer = moveDelay;
      }
    }

    // Attack: X (arrows) or H (WASD) or Space
    if ((this.keys['KeyX'] || this.keys['KeyH'] || this.keys['Space']) && this.attackCooldown <= 0) {
      this.playerAttack();
      this.attackCooldown = 150;
      this.keys['KeyX'] = false;
      this.keys['KeyH'] = false;
    }

    // AOE: C (arrows) or J (WASD)
    if ((this.keys['KeyC'] || this.keys['KeyJ']) && this.aoeCooldown <= 0) {
      this.aoeAttack();
      this.aoeCooldown = 3000;
      this.keys['KeyC'] = false;
      this.keys['KeyJ'] = false;
    }

    // Pickup: V (arrows) or K (WASD)
    if (this.keys['KeyV'] || this.keys['KeyK']) {
      this.pickupItem();
      this.keys['KeyV'] = false;
      this.keys['KeyK'] = false;
    }

    // Auto-pickup potions when walking over them
    let itemHere = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
    if (itemHere && itemHere.type === 'potion') {
      this.pickupItem();
    }

    // Show AOE range indicator when C/J is held
    if ((this.keys['KeyC'] || this.keys['KeyJ']) && this.aoeCooldown > 0) {
      // Show cooldown indicator
      this.showAoeRange(false);
    } else if (this.keys['KeyC'] || this.keys['KeyJ']) {
      this.showAoeRange(true);
    }
  },

  aoeAttack: function() {
    let hitCount = 0;
    let totalDamage = 0;
    let range = 2;

    // Visual ring effect - optimized
    this.createRingEffect(this.player.x, this.player.y, '#f80', range * this.tileSize);
    this.createBurstParticles(this.player.x, this.player.y, '#f80', 16, 150);
    this.triggerShake(10);

    let killed = [];
    for (let e of this.entities) {
      let dist = Math.abs(e.x - this.player.x) + Math.abs(e.y - this.player.y);
      if (dist <= range) {
        let damage = Math.floor(this.player.damage * 0.6);
        if (this.buffs.strength > 0) damage = Math.floor(damage * 1.5);
        e.hp -= damage;
        e.flash = 200;
        hitCount++;
        totalDamage += damage;
        this.createParticles(e.x, e.y, '#f80', 6);
        this.addFloatingText(e.x, e.y, `-${damage}`, '#f80');

        if (e.hp <= 0) {
          killed.push(e);
        }
      }
    }

    for (let e of killed) {
      this.killEntity(e);
    }

    if (hitCount > 0) {
      this.addBigText(this.player.x, this.player.y - 1, `AOE x${hitCount}!`, '#f80');
      this.addCombatLog(`💥 AOE SLAM! Hit ${hitCount} for ${totalDamage} total!`, '#f80');
      if (killed.length > 0) {
        this.addCombatLog(`   Killed ${killed.length} enemies!`, '#ff0');
      }
    } else {
      this.addFloatingText(this.player.x, this.player.y - 1, 'WHOOSH!', '#888', 600);
    }
  },

  playerAttack: function() {
    let dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    for (let d of dirs) {
      let enemy = this.getEntityAt(this.player.x + d[0], this.player.y + d[1]);
      if (enemy) {
        // Swing animation toward enemy
        this.createSwingEffect(this.player.x, this.player.y, d[0], d[1]);
        this.attack(this.player, enemy);
        return;
      }
    }
    // Miss - swing in facing direction
    this.createSwingEffect(this.player.x, this.player.y, 1, 0);
    this.createParticles(this.player.x, this.player.y, '#888', 3);
  },

  // Sword swing arc effect
  createSwingEffect: function(x, y, dx, dy) {
    let cx = x * this.tileSize + this.tileSize / 2;
    let cy = y * this.tileSize + this.tileSize / 2;
    let baseAngle = Math.atan2(dy, dx);

    // Create arc of particles
    for (let i = 0; i < 8; i++) {
      let angle = baseAngle - 0.8 + (i / 7) * 1.6;
      let dist = 20 + Math.random() * 15;
      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        life: 150,
        maxLife: 150,
        size: 3 + Math.random() * 2,
        color: this.equipment.weapon?.color || '#fff',
        type: 'swing'
      });
    }

    // Weapon effect color trail
    if (this.equipment.weapon?.effect) {
      let effectColor = this.equipment.weapon.effect === 'fire' ? '#f80' :
                       this.equipment.weapon.effect === 'ice' ? '#4cf' : '#4f4';
      for (let i = 0; i < 5; i++) {
        let angle = baseAngle - 0.5 + (i / 4) * 1.0;
        let dist = 25;
        this.particles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: Math.cos(angle) * 40,
          vy: Math.sin(angle) * 40,
          life: 200,
          maxLife: 200,
          size: 5,
          color: effectColor,
          type: 'effectTrail'
        });
      }
    }
  },

  attack: function(attacker, target) {
    let damage = attacker.damage + Math.floor(Math.random() * 4);

    // Crit chance: 15% for player, 8% for monsters (reduced early game difficulty)
    let critChance = attacker === this.player ? 0.15 : 0.08;
    // Further reduce monster crit chance in first 3 waves
    if (attacker !== this.player && this.difficulty <= 3) {
      critChance = 0.05;
    }

    let isCrit = Math.random() < critChance;
    let isDevastating = isCrit && Math.random() < 0.2; // 20% of crits are devastating
    if (isCrit) damage *= 2;
    if (isDevastating) damage = Math.floor(damage * 1.5);

    // Early wave damage reduction (waves 1-3)
    if (target === this.player && this.difficulty <= 3) {
      damage = Math.floor(damage * 0.8);
    }

    // Strength buff
    if (attacker === this.player && this.buffs.strength > 0) {
      damage = Math.floor(damage * 1.5);
    }

    if (target === this.player) {
      // Shield buff reduces damage
      let reduction = this.player.defense + (this.buffs.shield > 0 ? 5 : 0);
      damage = Math.max(1, damage - reduction);
    }

    target.hp -= damage;
    target.flash = isCrit ? 250 : 150;

    // Combat log
    let attackerName = attacker === this.player ? 'You' : attacker.symbol;
    let targetName = target === this.player ? 'You' : target.symbol;

    // Get intensity-based colors for crits
    let critColor = this.getCritColor();
    let intensity = this.getParticleIntensity();

    if (attacker === this.player) {
      if (isDevastating) {
        this.addCombatLog(`💀 DEVASTATING! ${damage} to ${targetName}!`, '#f0f');
      } else if (isCrit) {
        this.addCombatLog(`⚡ CRITICAL! ${damage} to ${targetName}`, critColor);
      } else {
        this.addCombatLog(`⚔ Hit ${targetName} for ${damage}`, '#4f4');
      }
    } else {
      this.addCombatLog(`${attackerName} hits you for ${damage}`, '#f44');
      this.trackDamage(attackerName, damage, 'melee');
    }

    // Effects based on attack type - scaled by combo intensity
    let hitColor = isCrit ? critColor : '#f44';
    let effectCount = isDevastating ? Math.floor(30 * intensity.size) : (isCrit ? intensity.count : 8);
    let effectSpeed = isDevastating ? 200 : (isCrit ? intensity.speed : 80);

    // Weapon effects with bigger particles
    if (attacker === this.player && this.equipment.weapon?.effect) {
      switch (this.equipment.weapon.effect) {
        case 'fire':
          hitColor = '#f80';
          this.createBurstParticles(target.x, target.y, '#f40', isCrit ? 20 : 10, isCrit ? 120 : 80);
          this.createBurstParticles(target.x, target.y, '#ff0', isCrit ? 10 : 5, isCrit ? 80 : 50);
          if (!target.burning) {
            target.burning = 3000;
            target.burnDamage = 2;
            this.addCombatLog(`🔥 ${targetName} is BURNING!`, '#f80');
          }
          break;
        case 'ice':
          hitColor = '#4cf';
          this.createBurstParticles(target.x, target.y, '#0af', isCrit ? 20 : 10, isCrit ? 100 : 60);
          this.createBurstParticles(target.x, target.y, '#fff', isCrit ? 8 : 4, 40);
          target.slowed = 2000;
          this.addCombatLog(`❄ ${targetName} is FROZEN!`, '#4cf');
          break;
        case 'poison':
          hitColor = '#4f4';
          this.createBurstParticles(target.x, target.y, '#0f0', isCrit ? 20 : 10, isCrit ? 100 : 70);
          this.createBurstParticles(target.x, target.y, '#8f0', 6, 50);
          if (!target.poisoned) {
            target.poisoned = 4000;
            target.poisonDamage = 1;
            this.addCombatLog(`☠ ${targetName} is POISONED!`, '#4f4');
          }
          break;
      }
    }

    // Main hit particles - reduced counts
    this.createBurstParticles(target.x, target.y, hitColor, Math.floor(effectCount * 0.6), effectSpeed);

    // Extra effects for crits
    if (isCrit) {
      this.createRingEffect(target.x, target.y, hitColor, 50);
      this.createSlashEffect(target.x, target.y, hitColor);
    }
    if (isDevastating) {
      this.createRingEffect(target.x, target.y, '#f0f', 80);
      this.addBigText(target.x, target.y - 1, 'DEVASTATING!', '#f0f');
    }

    // Floating damage text - bigger for crits, color by intensity
    if (isDevastating) {
      this.addBigText(target.x, target.y, `💀 ${damage}`, '#f0f');
    } else if (isCrit) {
      this.addBigText(target.x, target.y, `CRIT ${damage}!`, critColor);
    } else {
      this.addFloatingText(target.x, target.y, `-${damage}`, '#f44');
    }

    // Screen shake - bigger for crits
    this.triggerShake(isDevastating ? 18 : (isCrit ? 12 : 5));

    // Chain attack on critical (only from player, only if target alive)
    if (isCrit && attacker === this.player && target.hp > 0 && this.entities.length > 1) {
      // Chain to up to 3 other enemies
      setTimeout(() => this.chainAttack(target, damage, 3), 100);
    }

    // Kill check
    if (target.hp <= 0) {
      if (target !== this.player) {
        this.killEntity(target);
      } else {
        this.playerDeath();
      }
    }
  },

  // Big floating text for crits - with offset to avoid overlap
  addBigText: function(x, y, text, color) {
    let baseX = x * this.tileSize + this.tileSize / 2;
    let baseY = y * this.tileSize;

    // Offset based on existing big texts
    let offset = 0;
    for (let t of this.floatingTexts) {
      if (t.big && Math.abs(t.x - baseX) < 50 && Math.abs(t.y - baseY) < 40) {
        offset += 30;
      }
    }

    this.floatingTexts.push({
      x: baseX,
      y: baseY - offset - 10,
      text, color,
      life: 1500,
      maxLife: 1500,
      big: true
    });
  },

  // Get crit color based on combo intensity
  getCritColor: function() {
    if (this.combo >= 30) return '#f0f'; // Purple - legendary
    if (this.combo >= 20) return '#ff0'; // Bright yellow - godlike
    if (this.combo >= 15) return '#fa0'; // Orange-yellow
    if (this.combo >= 10) return '#f80'; // Orange
    if (this.combo >= 5) return '#f60';  // Red-orange
    return '#ff4';  // Base yellow
  },

  // Get particle intensity based on combo
  getParticleIntensity: function() {
    if (this.combo >= 20) return { count: 25, speed: 180, size: 1.5 };
    if (this.combo >= 10) return { count: 18, speed: 150, size: 1.3 };
    if (this.combo >= 5) return { count: 14, speed: 120, size: 1.1 };
    return { count: 10, speed: 100, size: 1.0 };
  },

  // Slash effect for melee hits
  createSlashEffect: function(x, y, color) {
    let cx = x * this.tileSize + this.tileSize / 2;
    let cy = y * this.tileSize + this.tileSize / 2;
    // Create diagonal slash particles
    for (let i = 0; i < 8; i++) {
      let angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
      let dist = 10 + Math.random() * 20;
      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 100,
        vy: Math.sin(angle) * 100,
        life: 200,
        maxLife: 200,
        size: 4 + Math.random() * 4,
        color: color,
        type: 'slash',
        angle: angle
      });
    }
  },

  // Show AOE range indicator
  showAoeRange: function(ready) {
    let px = this.player.x * this.tileSize + this.tileSize / 2;
    let py = this.player.y * this.tileSize + this.tileSize / 2;
    let range = 2 * this.tileSize;
    let color = ready ? '#f80' : '#444';

    // Add pulsing ring
    if (!this.aoeRangeIndicator) {
      this.aoeRangeIndicator = { x: px, y: py, radius: range, color: color, alpha: 0.3 };
    }
    this.aoeRangeIndicator.x = px;
    this.aoeRangeIndicator.y = py;
    this.aoeRangeIndicator.color = color;
    this.aoeRangeIndicator.show = true;
  },

  // Chain lightning effect on critical
  chainAttack: function(startEntity, damage, maxChains) {
    let chains = 0;
    let hitEntities = [startEntity];
    let currentEntity = startEntity;
    let chainDamage = Math.floor(damage * 0.5);

    while (chains < maxChains && chainDamage > 0) {
      // Find nearest enemy not yet hit
      let nearest = null;
      let nearestDist = Infinity;

      for (let e of this.entities) {
        if (hitEntities.includes(e) || e.hp <= 0) continue;
        let dist = Math.abs(e.x - currentEntity.x) + Math.abs(e.y - currentEntity.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = e;
        }
      }

      if (!nearest) break;

      // Draw chain lightning effect
      this.createChainEffect(currentEntity.x, currentEntity.y, nearest.x, nearest.y);

      // Apply damage
      nearest.hp -= chainDamage;
      nearest.flash = 150;
      this.addFloatingText(nearest.x, nearest.y, `-${chainDamage}`, '#ff0', 800);

      if (nearest.hp <= 0) {
        this.killEntity(nearest);
      }

      hitEntities.push(nearest);
      currentEntity = nearest;
      chainDamage = Math.floor(chainDamage * 0.7);
      chains++;
    }

    if (chains > 0) {
      this.addCombatLog(`⚡ Chain hit ${chains} enemies!`, '#ff0');
    }
  },

  // Visual chain lightning between two points
  createChainEffect: function(x1, y1, x2, y2) {
    let px1 = x1 * this.tileSize + this.tileSize / 2;
    let py1 = y1 * this.tileSize + this.tileSize / 2;
    let px2 = x2 * this.tileSize + this.tileSize / 2;
    let py2 = y2 * this.tileSize + this.tileSize / 2;

    // Create chain particles along path
    let steps = 8;
    for (let i = 0; i <= steps; i++) {
      let t = i / steps;
      let x = px1 + (px2 - px1) * t + (Math.random() - 0.5) * 20;
      let y = py1 + (py2 - py1) * t + (Math.random() - 0.5) * 20;
      this.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        life: 300,
        maxLife: 300,
        size: 4 + Math.random() * 3,
        color: '#ff0',
        type: 'chain'
      });
    }
  },

  killEntity: function(entity) {
    // Death explosion - optimized
    this.createBurstParticles(entity.x, entity.y, '#fff', 15, 150);
    this.createBurstParticles(entity.x, entity.y, '#f44', 10, 100);
    this.createRingEffect(entity.x, entity.y, '#f44', 40);

    // Get XP from monster def
    let def = this.monsterDefs[entity.symbol] || { xp: 5 };
    let xpGain = def.xp + Math.floor(this.difficulty * 2);

    // Combat log
    this.addCombatLog(`💀 Killed ${entity.symbol}! +${xpGain}xp`, '#ff0');

    this.entities = this.entities.filter(e => e !== entity);
    this.kills++;
    this.score += 10 * this.difficulty + xpGain;
    this.combo++;
    this.comboTimer = 2500;

    // XP and leveling
    this.xp += xpGain;
    if (this.xp >= this.xpToLevel) {
      this.levelUp();
    }

    // Drop item (higher chance with combo)
    let dropChance = 0.15 + (this.combo * 0.02);
    if (Math.random() < dropChance) {
      this.dropItem(entity.x, entity.y);
    }

    // Combo milestones with names
    let comboNames = {
      5: 'RAMPAGE',
      10: 'KILLING SPREE',
      15: 'DOMINATING',
      20: 'UNSTOPPABLE',
      25: 'GODLIKE',
      30: 'LEGENDARY',
      40: 'BEYOND GODLIKE',
      50: 'IMMORTAL'
    };

    if (comboNames[this.combo]) {
      this.addBigText(this.player.x, this.player.y - 2, comboNames[this.combo] + '!', '#f0f');
      this.addCombatLog(`🔥 ${comboNames[this.combo]}! (${this.combo}x)`, '#f0f');
      this.createRingEffect(this.player.x, this.player.y, '#f0f', 80);
      this.createBurstParticles(this.player.x, this.player.y, '#f0f', 30, 120);
      this.triggerShake(15);
    } else if (this.combo >= 5 && this.combo % 5 === 0) {
      this.addFloatingText(this.player.x, this.player.y - 2, `${this.combo}x COMBO!`, '#f0f', 1500);
      this.createRingEffect(this.player.x, this.player.y, '#f0f', 60);
    }
  },

  levelUp: function() {
    this.level++;
    this.xp = 0;
    this.xpToLevel = Math.floor(this.xpToLevel * 1.5);

    // Stat boosts
    this.player.maxHp += 10;
    this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
    this.player.damage += 2;

    // Effects - optimized
    this.createBurstParticles(this.player.x, this.player.y, '#ff0', 20, 200);
    this.createRingEffect(this.player.x, this.player.y, '#ff0', 100);
    this.addBigText(this.player.x, this.player.y - 1, `LEVEL ${this.level}!`, '#ff0');
    this.addCombatLog(`⬆ LEVEL UP! Now level ${this.level}`, '#ff0');
    this.addCombatLog(`  +10 Max HP, +2 Damage`, '#4f4');
    this.triggerShake(12);
  },

  // Track damage for death recap
  trackDamage: function(source, damage, type) {
    if (!this.recentDamage) this.recentDamage = [];
    this.recentDamage.push({
      source: source,
      damage: damage,
      type: type || 'attack',
      time: this.gameTime
    });
    // Keep only last 8 damage instances
    if (this.recentDamage.length > 8) {
      this.recentDamage.shift();
    }
  },

  playerDeath: function() {
    this.gameOver = true;
    this.createBurstParticles(this.player.x, this.player.y, '#f00', 50, 150);
    this.createBurstParticles(this.player.x, this.player.y, '#fff', 30, 100);
    this.addFloatingText(this.player.x, this.player.y, 'GAME OVER', '#f00', 5000);
    this.triggerShake(20);

    // Collect equipped items as loot options (if not common)
    if (this.equipment.weapon && this.equipment.weapon.rarity && this.equipment.weapon.rarity !== 'common') {
      this.collectedLoot.push({ ...this.equipment.weapon });
    }
    if (this.equipment.armor && this.equipment.armor.rarity && this.equipment.armor.rarity !== 'common') {
      this.collectedLoot.push({ ...this.equipment.armor });
    }

    // Save to backend
    this.saveGameResult();
  },

  saveGameResult: async function() {
    if (this.savedToBackend) return;
    this.savedToBackend = true;

    const timeSeconds = Math.floor(this.gameTime / 1000);
    const goldEarned = Math.floor(this.score / 10) + this.kills * 2;
    const xpEarned = this.score + this.kills * 5;

    // Always save to local storage for leaderboard
    if (typeof Storage !== 'undefined' && Storage.addLeaderboardEntry) {
      Storage.addLeaderboardEntry({
        username: this.playerName || 'Player',
        level: this.playerLevel || 1,
        score: this.score,
        wave: this.difficulty,
        kills: this.kills,
        time_seconds: timeSeconds
      });
      Storage.saveCharacter({
        gold: (Storage.getCharacter().gold || 0) + goldEarned,
        xp: (Storage.getCharacter().xp || 0) + xpEarned,
        gamesPlayed: (Storage.getCharacter().gamesPlayed || 0) + 1,
        highestScore: Math.max(Storage.getCharacter().highestScore || 0, this.score),
        highestWave: Math.max(Storage.getCharacter().highestWave || 0, this.difficulty)
      });
    }

    // If running in iframe from parent dashboard, post score to parent for on-chain submission
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1' && window.parent !== window) {
      this.addCombatLog('⛓️ Submitting score to blockchain...', '#ff0');
      this.addCombatLog('   0.001 ETH entry fee', '#888');

      // Post score to parent window
      window.parent.postMessage({
        type: 'GAME_OVER',
        score: this.score,
        wave: this.difficulty,
        kills: this.kills,
        name: this.playerName || 'Anon'
      }, '*');

      // Listen for response from parent
      const self = this;
      window.addEventListener('message', function handler(event) {
        if (event.data?.type === 'SCORE_SUBMITTED') {
          self.addCombatLog('✅ On-chain! TX: ' + event.data.hash?.slice(0, 10) + '...', '#0f0');
          window.removeEventListener('message', handler);
          // Show game over overlay with leaderboard
          self.showGameOverScreen(event.data);
        } else if (event.data?.type === 'SCORE_ERROR') {
          self.addCombatLog('❌ Submit failed: ' + (event.data.error?.slice(0, 40) || 'Unknown error'), '#f66');
          window.removeEventListener('message', handler);
          // Show error game over screen
          self.showGameOverScreen({ error: event.data.error });
        }
      });
    }
    // Legacy: Try MegaETH on-chain leaderboard if running standalone
    else if (typeof MegaETH !== 'undefined' && MegaETH.account && MegaETH.leaderboardAddress) {
      try {
        this.addCombatLog('👑 Submit to chain for ' + MegaETH.ENTRY_FEE + ' ETH?', '#ff0');
        this.addCombatLog('   20% goes to current KING!', '#f80');
        const receipt = await MegaETH.submitScore(
          this.score,
          this.difficulty,
          this.kills,
          this.playerName || 'Anon'
        );
        this.addCombatLog('⛓️ On-chain! TX: ' + (receipt.hash || receipt.transactionHash)?.slice(0, 10) + '...', '#0f0');

        // Check if became king
        try {
          const kingInfo = await MegaETH.getKingInfo();
          if (kingInfo.king.toLowerCase() === MegaETH.account.toLowerCase()) {
            this.addCombatLog('👑 YOU ARE THE NEW KING! 👑', '#ff0');
          }
        } catch (e) {}
      } catch (err) {
        console.error('MegaETH submit failed:', err);
        if (err.message?.includes('user rejected')) {
          this.addCombatLog('❌ Cancelled by user', '#888');
        } else {
          this.addCombatLog('⚠️ ' + (err.reason || err.message?.slice(0, 40)), '#f80');
        }
      }
    }

    // Stats saved locally only (simplified mode - no server)
    this.addCombatLog(`💀 Final Score: ${this.score}`, '#ff0');
    this.addCombatLog(`🗡️ Kills: ${this.kills} | Wave: ${this.difficulty}`, '#4af');
  },

  saveItemToInventory: async function(item) {
    // Items not saved between games (simplified mode)
    this.addCombatLog(`Found: ${item.name}`, item.color || '#fff');
  },

  canMove: function(x, y) {
    if (x < 0 || x >= this.screenWidth || y < 0 || y >= this.screenHeight) return false;
    return !this.map[x][y].blocked;
  },

  getEntityAt: function(x, y) {
    return this.entities.find(e => e.x === x && e.y === y);
  },

  updateEntities: function() {
    let entitiesToRemove = [];

    for (let e of this.entities) {
      // DOT effects
      if (e.burning > 0) {
        e.burning -= this.deltaTime;
        if (Math.random() < 0.1) this.createParticles(e.x, e.y, '#f80', 2);
        if (e.burning % 500 < this.deltaTime) {
          e.hp -= e.burnDamage;
          this.addFloatingText(e.x, e.y, `-${e.burnDamage}`, '#f80', 500);
          if (e.hp <= 0) { entitiesToRemove.push(e); continue; }
        }
      }
      if (e.poisoned > 0) {
        e.poisoned -= this.deltaTime;
        if (Math.random() < 0.08) this.createParticles(e.x, e.y, '#4f4', 2);
        if (e.poisoned % 600 < this.deltaTime) {
          e.hp -= e.poisonDamage;
          this.addFloatingText(e.x, e.y, `-${e.poisonDamage}`, '#4f4', 500);
          if (e.hp <= 0) { entitiesToRemove.push(e); continue; }
        }
      }
      if (e.slowed > 0) {
        e.slowed -= this.deltaTime;
      }

      // Movement with speed modifications
      let speed = e.slowed > 0 ? e.speed * 1.8 : e.speed;
      e.moveTimer -= this.deltaTime;
      if (e.moveTimer > 0) {
        e.visualX += (e.x - e.visualX) * 0.3;
        e.visualY += (e.y - e.visualY) * 0.3;
        continue;
      }

      // Behavior-based movement
      let dx = 0, dy = 0;
      let behavior = e.behavior || 'chase';
      let dist = Math.abs(this.player.x - e.x) + Math.abs(this.player.y - e.y);

      // Handle special abilities
      if (e.ability && !e.abilityCooldown) {
        this.useMonsterAbility(e);
      }
      if (e.abilityCooldown > 0) e.abilityCooldown -= this.deltaTime;

      switch (behavior) {
        case 'chase':
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
          break;

        case 'erratic':
          if (Math.random() < 0.6) {
            dx = Math.sign(this.player.x - e.x);
            dy = Math.sign(this.player.y - e.y);
          } else {
            dx = Math.floor(Math.random() * 3) - 1;
            dy = Math.floor(Math.random() * 3) - 1;
          }
          break;

        case 'cautious':
          if (dist > 3) {
            dx = Math.sign(this.player.x - e.x);
            dy = Math.sign(this.player.y - e.y);
          } else if (dist <= 1) {
            // Attack range, stay
          } else {
            dx = Math.sign(this.player.y - e.y);
            dy = -Math.sign(this.player.x - e.x);
          }
          break;

        case 'aggressive':
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
          if (Math.random() < 0.3) e.moveTimer -= speed * 0.3;
          break;

        case 'slow':
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
          if (Math.random() < 0.5) dx = 0; else dy = 0;
          break;

        case 'flanking':
          if (Math.abs(this.player.x - e.x) > Math.abs(this.player.y - e.y)) {
            dy = Math.sign(this.player.y - e.y);
            if (dy === 0) dx = Math.sign(this.player.x - e.x);
          } else {
            dx = Math.sign(this.player.x - e.x);
            if (dx === 0) dy = Math.sign(this.player.y - e.y);
          }
          break;

        case 'swarm':
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
          speed *= 0.7;
          break;

        case 'ranged':
          // Stay at range 4-6 and shoot
          if (dist < 4) {
            dx = -Math.sign(this.player.x - e.x);
            dy = -Math.sign(this.player.y - e.y);
          } else if (dist > 6) {
            dx = Math.sign(this.player.x - e.x);
            dy = Math.sign(this.player.y - e.y);
          } else {
            // Strafe
            dx = Math.sign(this.player.y - e.y);
            dy = -Math.sign(this.player.x - e.x);
          }
          break;

        case 'teleport':
          // Move normally but can teleport
          if (dist > 5 && Math.random() < 0.1 && !e.teleportCooldown) {
            this.teleportBehindPlayer(e);
            e.teleportCooldown = 3000;
          }
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
          if (e.teleportCooldown > 0) e.teleportCooldown -= this.deltaTime;
          break;

        case 'charge':
          // Wind up and charge
          if (!e.charging && dist > 3 && dist < 8 && Math.random() < 0.08) {
            e.charging = true;
            e.chargeTarget = { x: this.player.x, y: this.player.y };
            e.chargeWindup = 800;
            this.addFloatingText(e.x, e.y, '!!!', '#f00', 600);
            this.createParticles(e.x, e.y, '#f80', 8);
          }
          if (e.charging) {
            e.chargeWindup -= this.deltaTime;
            if (e.chargeWindup <= 0) {
              this.executeCharge(e);
              e.charging = false;
            }
            dx = 0; dy = 0; // Don't move while winding up
          } else {
            dx = Math.sign(this.player.x - e.x);
            dy = Math.sign(this.player.y - e.y);
          }
          break;

        case 'summon':
          // Stay back and summon minions
          if (dist < 5) {
            dx = -Math.sign(this.player.x - e.x);
            dy = -Math.sign(this.player.y - e.y);
          } else {
            dx = Math.sign(this.player.y - e.y);
            dy = -Math.sign(this.player.x - e.x);
          }
          break;

        case 'web':
          // Spider - place webs and chase
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
          break;

        case 'boss':
          // Boss AI - complex patterns
          if (dist > 4) {
            dx = Math.sign(this.player.x - e.x);
            dy = Math.sign(this.player.y - e.y);
          } else if (dist <= 2) {
            // Close range - attack or retreat
            if (Math.random() < 0.3) {
              dx = -Math.sign(this.player.x - e.x);
              dy = -Math.sign(this.player.y - e.y);
            }
          } else {
            // Circle
            dx = Math.sign(this.player.y - e.y);
            dy = -Math.sign(this.player.x - e.x);
          }
          // Bosses have aura
          if (Math.random() < 0.05) this.createBossAura(e);
          break;

        default:
          dx = Math.sign(this.player.x - e.x);
          dy = Math.sign(this.player.y - e.y);
      }

      // Random movement variation
      if (Math.random() < 0.2) {
        if (Math.random() < 0.5) dx = 0; else dy = 0;
      }

      let newX = e.x + dx;
      let newY = e.y + dy;

      // Attack if adjacent
      if (Math.abs(this.player.x - e.x) <= 1 && Math.abs(this.player.y - e.y) <= 1) {
        this.attack(e, this.player);
        e.moveTimer = speed;
      } else if (this.canMove(newX, newY) && !this.getEntityAt(newX, newY) &&
                 !(newX === this.player.x && newY === this.player.y)) {
        e.x = newX;
        e.y = newY;
        e.moveTimer = speed;
      } else {
        e.moveTimer = speed / 2;
      }

      // Visual lerp
      e.visualX += (e.x - e.visualX) * 0.3;
      e.visualY += (e.y - e.visualY) * 0.3;
    }

    // Remove dead entities from DOT
    for (let e of entitiesToRemove) {
      this.killEntity(e);
    }

    // Update player visual
    this.player.visualX += (this.player.x - this.player.visualX) * 0.3;
    this.player.visualY += (this.player.y - this.player.visualY) * 0.3;
  },

  handleSpawning: function() {
    this.spawnTimer += this.deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnMonster();
    }
  },

  spawnMonster: function() {
    // Limit entities to prevent crashes
    if (this.entities.length >= 25) return;

    // Spawn on edge
    let edge = Math.floor(Math.random() * 4);
    let x, y;
    switch(edge) {
      case 0: x = 1 + Math.floor(Math.random() * (this.screenWidth - 2)); y = 1; break;
      case 1: x = 1 + Math.floor(Math.random() * (this.screenWidth - 2)); y = this.screenHeight - 2; break;
      case 2: x = 1; y = 1 + Math.floor(Math.random() * (this.screenHeight - 2)); break;
      case 3: x = this.screenWidth - 2; y = 1 + Math.floor(Math.random() * (this.screenHeight - 2)); break;
    }

    if (this.getEntityAt(x, y) || (x === this.player.x && y === this.player.y)) return;

    // Pick monster based on wave
    let waveIdx = Math.min(this.difficulty - 1, this.waveMonsters.length - 1);
    let availableMonsters = this.waveMonsters[waveIdx];
    let symbol = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];

    // Get monster stats from definitions
    let def = this.monsterDefs[symbol] || { hp: 15, damage: 5, speed: 350, behavior: 'chase' };

    // Scale with difficulty
    let scaledHp = Math.floor(def.hp * (1 + this.difficulty * 0.15));
    let scaledDamage = Math.floor(def.damage * (1 + this.difficulty * 0.1));
    let scaledSpeed = Math.max(150, def.speed - this.difficulty * 15);

    this.entities.push({
      x, y, visualX: x, visualY: y,
      hp: scaledHp,
      maxHp: scaledHp,
      damage: scaledDamage,
      speed: scaledSpeed,
      moveTimer: 0,
      symbol,
      behavior: def.behavior,
      ability: def.ability,
      color: def.color || '#f44',
      isBoss: def.isBoss,
      flash: 0,
      abilityCooldown: 0
    });

    // Spawn effect - portal animation
    this.createSpawnPortal(x, y, def.color || '#88f', def.isBoss);
  },

  // Spawn portal effect
  createSpawnPortal: function(x, y, color, isBoss) {
    let cx = x * this.tileSize + this.tileSize / 2;
    let cy = y * this.tileSize + this.tileSize / 2;

    // Ring expanding outward
    this.particles.push({
      x: cx, y: cy, vx: 0, vy: 0,
      life: 400, maxLife: 400,
      size: 5, targetRadius: isBoss ? 50 : 30, currentRadius: 0,
      color: color, type: 'ring'
    });

    // Particles swirling in
    for (let i = 0; i < (isBoss ? 20 : 10); i++) {
      let angle = (i / 10) * Math.PI * 2;
      let dist = 40 + Math.random() * 20;
      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 80,
        vy: -Math.sin(angle) * 80,
        life: 300, maxLife: 300,
        size: isBoss ? 5 : 3, color: color
      });
    }

    if (isBoss) {
      this.triggerShake(15);
      this.addBigText(x, y - 1, 'BOSS!', '#f00');
    }
  },

  // Monster uses special ability
  useMonsterAbility: function(e) {
    let dist = Math.abs(this.player.x - e.x) + Math.abs(this.player.y - e.y);

    switch (e.ability) {
      case 'fireball':
        if (dist <= 6 && dist >= 2 && Math.random() < 0.15) {
          this.shootProjectile(e, this.player.x, this.player.y, 'fireball');
          e.abilityCooldown = 2000;
        }
        break;

      case 'freeze':
        if (dist <= 5 && Math.random() < 0.1) {
          this.shootProjectile(e, this.player.x, this.player.y, 'icebolt');
          e.abilityCooldown = 2500;
        }
        break;

      case 'poison':
        // Poison on hit handled in attack
        break;

      case 'web':
        if (Math.random() < 0.05) {
          this.placeHazard(e.x, e.y, 'web');
          e.abilityCooldown = 3000;
        }
        break;

      case 'summon':
        if (this.entities.length < 15 && Math.random() < 0.03) {
          this.summonMinion(e, 'skeleton');
          e.abilityCooldown = 5000;
          this.addCombatLog(`☠ Necromancer summons a skeleton!`, '#808');
        }
        break;

      case 'lifesteal':
        // Handled in attack - heals on hit
        break;

      case 'firetrail':
        if (Math.random() < 0.1) {
          this.placeHazard(e.x, e.y, 'fire');
        }
        break;

      case 'knockback':
        // Handled in attack
        break;

      case 'icestorm':
        if (dist <= 5 && Math.random() < 0.05) {
          this.createIcestorm(e.x, e.y);
          e.abilityCooldown = 4000;
        }
        break;

      case 'hellfire':
        if (dist <= 4 && Math.random() < 0.08) {
          this.createHellfireRing(e.x, e.y);
          e.abilityCooldown = 3000;
        }
        break;

      case 'spawnlings':
        if (this.entities.length < 20 && Math.random() < 0.02) {
          for (let i = 0; i < 3; i++) {
            this.summonMinion(e, 'spider');
          }
          e.abilityCooldown = 6000;
          this.addCombatLog(`🕷 Spider Queen spawns spiderlings!`, '#404');
        }
        break;

      case 'firebreath':
        if (dist <= 5 && Math.random() < 0.1) {
          this.createFireBreath(e);
          e.abilityCooldown = 3000;
        }
        break;

      case 'deathwave':
        if (dist <= 6 && Math.random() < 0.06) {
          this.createDeathWave(e);
          e.abilityCooldown = 4000;
        }
        break;

      case 'earthquake':
        if (Math.random() < 0.04) {
          this.createEarthquake(e);
          e.abilityCooldown = 5000;
        }
        break;
    }
  },

  // Shoot projectile toward target
  shootProjectile: function(shooter, tx, ty, type) {
    if (!this.projectiles) this.projectiles = [];
    if (this.projectiles.length >= this.MAX_PROJECTILES) return;

    let dx = tx - shooter.x;
    let dy = ty - shooter.y;
    let len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    dx /= len; dy /= len;

    let colors = { fireball: '#f80', icebolt: '#4cf', arrow: '#864' };
    let damage = { fireball: 12, icebolt: 8, arrow: 6 };
    let effects = { fireball: 'burn', icebolt: 'freeze', arrow: null };

    this.projectiles.push({
      x: shooter.x * this.tileSize + this.tileSize / 2,
      y: shooter.y * this.tileSize + this.tileSize / 2,
      vx: dx * 250, vy: dy * 250,
      damage: damage[type] || 10,
      effect: effects[type],
      color: colors[type] || '#fff',
      type: type,
      life: 2000
    });

    this.createBurstParticles(shooter.x, shooter.y, colors[type], 6, 60);
    this.addCombatLog(`🔮 ${shooter.symbol} casts ${type}!`, colors[type]);
  },

  // Place ground hazard
  placeHazard: function(x, y, type) {
    if (!this.hazards) this.hazards = [];
    if (this.hazards.length >= this.MAX_HAZARDS) return;

    let colors = { fire: '#f80', web: '#fff', ice: '#4cf', poison: '#4f4' };
    let duration = { fire: 5000, web: 8000, ice: 4000, poison: 6000 };

    this.hazards.push({
      x, y, type,
      color: colors[type],
      life: duration[type],
      damage: type === 'fire' ? 3 : type === 'poison' ? 2 : 0
    });

    this.createParticles(x, y, colors[type], 6);
  },

  // Summon a minion near entity
  summonMinion: function(summoner, minionType) {
    let dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let d of dirs) {
      let nx = summoner.x + d[0];
      let ny = summoner.y + d[1];
      if (this.canMove(nx, ny) && !this.getEntityAt(nx, ny)) {
        let def = this.monsterDefs[minionType];
        this.entities.push({
          x: nx, y: ny, visualX: nx, visualY: ny,
          hp: def.hp, maxHp: def.hp,
          damage: def.damage, speed: def.speed,
          moveTimer: 0, symbol: minionType,
          behavior: def.behavior, color: def.color,
          flash: 0, isSummoned: true
        });
        this.createSpawnPortal(nx, ny, '#808', false);
        return;
      }
    }
  },

  // Teleport assassin behind player
  teleportBehindPlayer: function(e) {
    let behindX = this.player.x - Math.sign(this.player.x - e.x);
    let behindY = this.player.y - Math.sign(this.player.y - e.y);

    if (this.canMove(behindX, behindY) && !this.getEntityAt(behindX, behindY)) {
      // Vanish effect
      this.createBurstParticles(e.x, e.y, '#408', 15, 100);

      e.x = behindX; e.y = behindY;
      e.visualX = behindX; e.visualY = behindY;

      // Appear effect
      this.createBurstParticles(behindX, behindY, '#f0f', 15, 100);
      this.addCombatLog(`⚡ Assassin teleports behind you!`, '#f0f');
      this.triggerShake(8);
    }
  },

  // Execute charge attack
  executeCharge: function(e) {
    let dx = Math.sign(e.chargeTarget.x - e.x);
    let dy = Math.sign(e.chargeTarget.y - e.y);

    // Move up to 5 tiles toward target
    for (let i = 0; i < 5; i++) {
      let nx = e.x + dx;
      let ny = e.y + dy;

      if (!this.canMove(nx, ny)) break;

      // Hit player?
      if (nx === this.player.x && ny === this.player.y) {
        let damage = Math.floor(e.damage * 1.5);
        this.player.hp -= damage;
        this.player.flash = 300;
        this.addBigText(this.player.x, this.player.y, `CHARGED! -${damage}`, '#f80');
        this.createBurstParticles(this.player.x, this.player.y, '#f80', 25, 150);
        this.triggerShake(15);
        this.knockbackPlayer(dx, dy);
        this.trackDamage(e.symbol + ' charge', damage, 'charge');
        break;
      }

      e.x = nx; e.y = ny;
      this.createParticles(e.x, e.y, '#f80', 3);
    }
  },

  // Knockback player
  knockbackPlayer: function(dx, dy) {
    let nx = this.player.x + dx * 2;
    let ny = this.player.y + dy * 2;
    if (this.canMove(nx, ny) && !this.getEntityAt(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
    }
  },

  // Create boss aura effect
  createBossAura: function(e) {
    let cx = e.x * this.tileSize + this.tileSize / 2;
    let cy = e.y * this.tileSize + this.tileSize / 2;

    for (let i = 0; i < 8; i++) {
      let angle = (i / 8) * Math.PI * 2 + this.gameTime * 0.002;
      this.particles.push({
        x: cx + Math.cos(angle) * 25,
        y: cy + Math.sin(angle) * 25,
        vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20,
        life: 400, maxLife: 400, size: 4,
        color: e.color || '#f00'
      });
    }
  },

  // Ice storm area attack
  createIcestorm: function(x, y) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        let tx = x + dx, ty = y + dy;
        if (tx === this.player.x && ty === this.player.y) {
          this.player.hp -= 8;
          this.player.slowed = 2000;
          this.addFloatingText(this.player.x, this.player.y, 'FROZEN!', '#4cf');
        }
        this.createParticles(tx, ty, '#4cf', 3);
      }
    }
    this.createRingEffect(x, y, '#4cf', 80);
    this.addCombatLog(`❄ Ice Mage casts ICESTORM!`, '#4cf');
    this.triggerShake(10);
  },

  // Hellfire ring attack
  createHellfireRing: function(x, y) {
    for (let i = 0; i < 8; i++) {
      let angle = (i / 8) * Math.PI * 2;
      let tx = x + Math.round(Math.cos(angle) * 2);
      let ty = y + Math.round(Math.sin(angle) * 2);
      this.placeHazard(tx, ty, 'fire');
    }
    this.createRingEffect(x, y, '#f40', 70);
    this.addCombatLog(`🔥 Demon unleashes HELLFIRE!`, '#f40');
    this.triggerShake(12);
  },

  // Dragon fire breath cone
  createFireBreath: function(e) {
    let dx = Math.sign(this.player.x - e.x);
    let dy = Math.sign(this.player.y - e.y);

    for (let i = 1; i <= 4; i++) {
      let tx = e.x + dx * i;
      let ty = e.y + dy * i;

      // Spread
      for (let s = -1; s <= 1; s++) {
        let sx = tx + (dy !== 0 ? s : 0);
        let sy = ty + (dx !== 0 ? s : 0);

        if (sx === this.player.x && sy === this.player.y) {
          this.player.hp -= 15;
          this.player.burning = 3000;
          this.player.burnDamage = 3;
          this.addBigText(this.player.x, this.player.y, 'BURNED!', '#f80');
        }
        this.createBurstParticles(sx, sy, '#f80', 5, 80);
        this.createBurstParticles(sx, sy, '#ff0', 3, 50);
      }
    }
    this.addCombatLog(`🐉 Dragon breathes FIRE!`, '#f80');
    this.triggerShake(15);
  },

  // Lich death wave
  createDeathWave: function(e) {
    this.createRingEffect(e.x, e.y, '#80f', 120);

    let dist = Math.abs(this.player.x - e.x) + Math.abs(this.player.y - e.y);
    if (dist <= 5) {
      this.player.hp -= 20;
      this.player.poisoned = 4000;
      this.player.poisonDamage = 2;
      this.addBigText(this.player.x, this.player.y, 'CURSED!', '#80f');
    }

    this.createBurstParticles(e.x, e.y, '#80f', 30, 150);
    this.addCombatLog(`💀 Lich casts DEATH WAVE!`, '#80f');
    this.triggerShake(18);
  },

  // Titan Golem earthquake
  createEarthquake: function(e) {
    // Damage and stun everything nearby
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        let tx = e.x + dx, ty = e.y + dy;
        if (tx === this.player.x && ty === this.player.y) {
          this.player.hp -= 25;
          this.player.stunned = 1000;
          this.addBigText(this.player.x, this.player.y, 'STUNNED!', '#888');
        }
        this.createParticles(tx, ty, '#864', 2);
      }
    }

    this.createRingEffect(e.x, e.y, '#864', 100);
    this.createRingEffect(e.x, e.y, '#642', 80);
    this.addCombatLog(`🗿 Titan Golem causes EARTHQUAKE!`, '#864');
    this.triggerShake(25);
  },

  updateDifficulty: function() {
    let newDiff = 1 + Math.floor(this.kills / 10);
    if (newDiff > this.difficulty) {
      this.difficulty = newDiff;
      this.spawnInterval = Math.max(600, 2500 - this.difficulty * 180);

      // Wave announcement - BIGGER
      this.addBigText(this.player.x, this.player.y - 2, `WAVE ${this.difficulty}`, '#f0f');
      this.createRingEffect(this.player.x, this.player.y, '#f0f', 140);
      this.createRingEffect(this.player.x, this.player.y, '#fff', 100);
      this.createBurstParticles(this.player.x, this.player.y, '#f0f', 40, 130);
      this.triggerShake(14);
      this.addCombatLog(`═══ WAVE ${this.difficulty} ═══`, '#f0f');

      // Get monsters for this wave
      let waveIdx = Math.min(this.difficulty - 1, this.waveMonsters.length - 1);
      let monsters = this.waveMonsters[waveIdx].join(', ');
      this.addCombatLog(`Enemies: ${monsters}`, '#aaa');

      // Boss wave every 5 waves + biome change
      if (this.difficulty % 5 === 0) {
        this.addBigText(this.player.x, this.player.y - 3, 'BOSS WAVE!', '#f00');
        this.createRingEffect(this.player.x, this.player.y, '#f00', 100);
        this.addCombatLog(`⚠ BOSS WAVE! ⚠`, '#f00');
        // Spawn extra strong enemies
        for (let i = 0; i < 3; i++) {
          setTimeout(() => this.spawnMonster(), i * 500);
        }
        // Change biome
        this.changeBiome();
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= this.deltaTime;
      if (this.comboTimer <= 0) {
        if (this.combo >= 10) {
          this.addFloatingText(this.player.x, this.player.y, 'Combo Lost!', '#888', 800);
          this.addCombatLog(`Combo lost at ${this.combo}x`, '#888');
        }
        this.combo = 0;
      }
    }
  },

  rollRarity: function() {
    let roll = Math.random();
    let cumulative = 0;
    for (let [key, rarity] of Object.entries(this.rarities)) {
      cumulative += rarity.chance;
      if (roll < cumulative) return key;
    }
    return 'common';
  },

  dropItem: function(x, y) {
    let roll = Math.random();
    let item;

    // Higher waves = higher minimum tier
    let minTier = Math.min(3, 1 + Math.floor(this.difficulty / 3));
    let maxTier = Math.min(4, 1 + Math.floor(this.difficulty / 2));

    // Roll rarity - higher waves = better rarity chances
    let rarityRoll = this.rollRarity();
    // Bonus rarity chance at higher waves
    if (this.difficulty >= 5 && rarityRoll === 'common' && Math.random() < 0.3) rarityRoll = 'uncommon';
    if (this.difficulty >= 8 && rarityRoll === 'uncommon' && Math.random() < 0.2) rarityRoll = 'rare';
    let rarity = this.rarities[rarityRoll];

    if (roll < 0.35) {
      // Potion (35%) - better potions at higher levels
      let goodPotions = this.difficulty >= 3 ? this.potionList : this.potionList.slice(0, 3);
      item = { ...goodPotions[Math.floor(Math.random() * goodPotions.length)] };
      item.type = 'potion';
    } else if (roll < 0.65) {
      // Weapon (30%) - filter by tier range
      let available = this.weaponList.filter(w => w.tier >= minTier && w.tier <= maxTier);
      if (available.length === 0) available = this.weaponList.filter(w => w.tier <= maxTier);
      item = { ...available[Math.floor(Math.random() * available.length)] };
      item.type = 'weapon';
      // Apply rarity multiplier
      item.damage = Math.floor(item.damage * rarity.multiplier);
    } else {
      // Armor (35%) - filter by tier range
      let available = this.armorList.filter(a => a.tier >= minTier && a.tier <= maxTier);
      if (available.length === 0) available = this.armorList.filter(a => a.tier <= maxTier);
      item = { ...available[Math.floor(Math.random() * available.length)] };
      item.type = 'armor';
      // Apply rarity multiplier
      item.defense = Math.floor(item.defense * rarity.multiplier);
    }

    // Add rarity info
    item.rarity = rarityRoll;
    item.rarityName = rarity.name;
    item.color = rarity.color;
    if (rarityRoll !== 'common') {
      item.name = rarity.name + ' ' + item.name;
    }

    item.x = x;
    item.y = y;
    item.spawnTime = this.gameTime;
    item.lifetime = 5000; // 5 seconds to pick up
    this.items.push(item);

    // Special effects for rare+ items
    if (rarityRoll === 'legendary') {
      this.addBigText(x, y, 'LEGENDARY!', rarity.color);
      this.createBurstParticles(x, y, rarity.color, 25, 100);
      this.triggerShake(8);
    } else if (rarityRoll === 'epic') {
      this.addBigText(x, y, 'EPIC!', rarity.color);
      this.createBurstParticles(x, y, rarity.color, 18, 80);
    } else if (rarityRoll === 'rare') {
      this.addFloatingText(x, y, 'Rare!', rarity.color, 1500);
      this.createBurstParticles(x, y, rarity.color, 12, 60);
    } else {
      this.addFloatingText(x, y, item.name, item.color, 1500);
      this.createBurstParticles(x, y, item.color, 10, 50);
    }
  },

  pickupItem: function() {
    let item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
    if (!item) return;

    // Always pickup - player can decide
    if (item.type === 'weapon') {
      let currentDmg = this.equipment.weapon ? this.equipment.weapon.damage : 0;
      let isBetter = item.damage > currentDmg;
      this.equipment.weapon = item;
      this.player.damage = 8 + item.damage;

      if (isBetter) {
        this.addBigText(this.player.x, this.player.y, item.name + '!', item.color);
      } else {
        this.addFloatingText(this.player.x, this.player.y, item.name, item.color, 800);
      }
      this.addCombatLog(`⚔ Equipped ${item.name} (+${item.damage} dmg)`, item.color);
      if (item.effect) {
        this.addCombatLog(`   Effect: ${item.effect}`, '#aaa');
      }
    } else if (item.type === 'armor') {
      let currentDef = this.equipment.armor ? this.equipment.armor.defense : 0;
      let isBetter = item.defense > currentDef;
      this.equipment.armor = item;
      this.player.defense = item.defense;

      if (isBetter) {
        this.addBigText(this.player.x, this.player.y, item.name + '!', item.color);
      } else {
        this.addFloatingText(this.player.x, this.player.y, item.name, item.color, 800);
      }
      this.addCombatLog(`🛡 Equipped ${item.name} (+${item.defense} def)`, item.color);
    } else if (item.type === 'potion') {
      this.usePotion(item);
    }

    this.items = this.items.filter(i => i !== item);
    this.createParticles(this.player.x, this.player.y, item.color, 10);
  },

  usePotion: function(potion) {
    switch (potion.effect) {
      case 'heal':
        let healAmount = Math.min(potion.value, this.player.maxHp - this.player.hp);
        this.player.hp += healAmount;
        this.addBigText(this.player.x, this.player.y, `+${healAmount} HP`, '#4f4');
        this.createParticles(this.player.x, this.player.y, '#4f4', 10);
        this.addCombatLog(`💚 Healed for ${healAmount} HP!`, '#4f4');
        break;
      case 'speed':
        this.buffs.speed = potion.value;
        this.addBigText(this.player.x, this.player.y, 'SPEED!', '#4cf');
        this.createParticles(this.player.x, this.player.y, '#4cf', 10);
        this.addCombatLog(`⚡ Speed boost for ${potion.value/1000}s!`, '#4cf');
        break;
      case 'strength':
        this.buffs.strength = potion.value;
        this.addBigText(this.player.x, this.player.y, 'POWER!', '#f80');
        this.createParticles(this.player.x, this.player.y, '#f80', 10);
        this.addCombatLog(`💪 Strength boost for ${potion.value/1000}s!`, '#f80');
        break;
      case 'shield':
        this.buffs.shield = potion.value;
        this.addBigText(this.player.x, this.player.y, 'SHIELD!', '#88f');
        this.createParticles(this.player.x, this.player.y, '#88f', 10);
        this.addCombatLog(`🛡 Shield active for ${potion.value/1000}s!`, '#88f');
        break;
    }
  },

  // === EFFECTS ===
  createParticles: function(x, y, color, count) {
    // Strict limit for performance
    if (this.particles.length >= this.MAX_PARTICLES) return;
    count = Math.min(count, 10, this.MAX_PARTICLES - this.particles.length);

    let cx = x * this.tileSize + this.tileSize / 2;
    let cy = y * this.tileSize + this.tileSize / 2;

    for (let i = 0; i < count; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speed = 50 + Math.random() * 80;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 200 + Math.random() * 150,
        maxLife: 350,
        size: 2 + Math.random() * 2,
        color
      });
    }
  },

  addFloatingText: function(x, y, text, color, duration = 1000) {
    // Limit floating texts for performance
    if (this.floatingTexts.length >= this.MAX_FLOATING_TEXTS) return;

    let baseX = x * this.tileSize + this.tileSize / 2;
    let baseY = y * this.tileSize;

    // Check for nearby texts and offset
    let offset = 0;
    for (let t of this.floatingTexts) {
      if (Math.abs(t.x - baseX) < 30 && Math.abs(t.y - baseY) < 25) {
        offset += 18;
      }
    }

    this.floatingTexts.push({
      x: baseX + (Math.random() - 0.5) * 20,
      y: baseY - offset,
      text, color,
      life: duration,
      maxLife: duration
    });
  },

  triggerShake: function(intensity) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = 150;
  },

  updateEffects: function() {
    let dt = this.deltaTime / 1000;
    this.gameTime += this.deltaTime;

    // Particles
    this.particles = this.particles.filter(p => {
      if (p.type === 'ring') {
        p.currentRadius += (p.targetRadius - p.currentRadius) * 0.15;
        p.life -= this.deltaTime;
        return p.life > 0;
      }
      if (p.type === 'trail') {
        p.size *= 0.92;
        p.life -= this.deltaTime;
        return p.life > 0 && p.size > 0.5;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity !== false) p.vy += 150 * dt;
      p.life -= this.deltaTime;
      return p.life > 0;
    });

    // Ambient particles
    for (let ap of this.ambientParticles) {
      ap.x += ap.vx * dt;
      ap.y += ap.vy * dt;
      ap.pulse += dt * 2;

      // Wrap around screen
      if (ap.x < 0) ap.x = this.canvas.width;
      if (ap.x > this.canvas.width) ap.x = 0;
      if (ap.y < 0) ap.y = this.canvas.height;
      if (ap.y > this.canvas.height) ap.y = 0;
    }

    // Floating texts
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.y -= 30 * dt;
      t.life -= this.deltaTime;
      return t.life > 0;
    });

    // Screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.duration -= this.deltaTime;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
    }

    // Flash timers
    if (this.player && this.player.flash > 0) this.player.flash -= this.deltaTime;
    for (let e of this.entities) {
      if (e.flash > 0) e.flash -= this.deltaTime;
    }

    // Buff timers
    if (this.buffs.speed > 0) {
      this.buffs.speed -= this.deltaTime;
      if (Math.random() < 0.1) this.addTrailParticle(this.player, '#4cf');
    }
    if (this.buffs.strength > 0) {
      this.buffs.strength -= this.deltaTime;
      if (Math.random() < 0.05) this.createParticles(this.player.x, this.player.y, '#f80', 1);
    }
    if (this.buffs.shield > 0) {
      this.buffs.shield -= this.deltaTime;
    }
  },

  // === DRAWING ===
  draw: function() {
    // Apply screen shake
    let container = this.display.getContainer();
    container.style.transform = `translate(${this.screenShake.x}px, ${this.screenShake.y}px)`;
    this.canvas.style.transform = `translate(${this.screenShake.x}px, ${this.screenShake.y}px)`;

    // Draw map
    for (let x = 0; x < this.screenWidth; x++) {
      for (let y = 0; y < this.screenHeight; y++) {
        this.display.draw(x, y, this.map[x][y].symbol, '#0000');
      }
    }

    // Draw hazards on ground
    if (this.hazards) {
      for (let h of this.hazards) {
        let alpha = Math.min(1, h.life / 1000);
        let pulse = 0.6 + Math.sin(this.gameTime / 200) * 0.2;
        this.ctx.globalAlpha = alpha * pulse * 0.5;
        this.ctx.fillStyle = h.color;
        this.ctx.beginPath();
        this.ctx.arc(
          h.x * this.tileSize + this.tileSize / 2,
          h.y * this.tileSize + this.tileSize / 2,
          this.tileSize / 2 - 4, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Inner glow
        this.ctx.globalAlpha = alpha * pulse * 0.3;
        this.ctx.beginPath();
        this.ctx.arc(
          h.x * this.tileSize + this.tileSize / 2,
          h.y * this.tileSize + this.tileSize / 2,
          this.tileSize / 3, 0, Math.PI * 2
        );
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1;

    // Draw items with pulsing + fade effect based on lifetime
    for (let item of this.items) {
      let age = this.gameTime - item.spawnTime;
      let remaining = item.lifetime - age;
      let fadeAlpha = remaining < 2000 ? remaining / 2000 : 1; // Fade in last 2 seconds
      let pulse = Math.sin(age / 200) * 0.3 + 0.7;
      let alpha = Math.floor(pulse * fadeAlpha * 15).toString(16);
      // Blink fast when about to expire
      if (remaining < 1500 && Math.floor(age / 150) % 2 === 0) {
        alpha = 'f';
      }
      this.display.draw(item.x, item.y, [this.map[item.x][item.y].symbol, item.symbol], ['#0000', '#fff' + alpha]);
    }

    // Draw entities with effects
    for (let e of this.entities) {
      // Bounds check to prevent crashes
      if (e.x < 0 || e.x >= this.screenWidth || e.y < 0 || e.y >= this.screenHeight) continue;
      if (!this.map[e.x] || !this.map[e.x][e.y]) continue;

      let hpBar = 'hp' + Math.min(8, Math.max(1, Math.ceil((e.hp / e.maxHp) * 8)));
      let flashColor = e.flash > 0 ? '#fff8' : '#0000';
      // Tint based on status
      if (e.burning > 0) flashColor = '#f804';
      if (e.poisoned > 0) flashColor = '#0f04';
      if (e.slowed > 0) flashColor = '#04f4';
      this.display.draw(Math.round(e.visualX), Math.round(e.visualY),
        [this.map[e.x][e.y].symbol, e.symbol, hpBar], ['#0000', flashColor, '#0000']);
    }

    // Draw player with buff aura (or dead player)
    if (this.player && this.player.x >= 0 && this.player.x < this.screenWidth &&
        this.player.y >= 0 && this.player.y < this.screenHeight &&
        this.map[this.player.x] && this.map[this.player.x][this.player.y]) {
      if (this.player.hp > 0) {
        let hpBar = 'hp' + Math.min(8, Math.max(1, Math.ceil((this.player.hp / this.player.maxHp) * 8)));
        let flashColor = this.player.flash > 0 ? '#fff8' : '#0000';
        // Buff color overlay
        if (this.buffs.shield > 0) flashColor = '#44f4';
        else if (this.buffs.strength > 0) flashColor = '#f804';
        else if (this.buffs.speed > 0) flashColor = '#4cf4';
        this.display.draw(Math.round(this.player.visualX), Math.round(this.player.visualY),
          [this.map[this.player.x][this.player.y].symbol, this.player.symbol, hpBar], ['#0000', flashColor, '#0000']);
      } else {
        // Draw dead player (grayed out, no HP bar)
        this.display.draw(Math.round(this.player.visualX), Math.round(this.player.visualY),
          [this.map[this.player.x][this.player.y].symbol, this.player.symbol], ['#0000', '#4448']);
      }
    }

    // Draw effects canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Ambient particles (background)
    for (let ap of this.ambientParticles) {
      let pulseAlpha = ap.alpha * (0.5 + Math.sin(ap.pulse) * 0.5);
      this.ctx.globalAlpha = pulseAlpha;
      this.ctx.fillStyle = ap.color;
      this.ctx.beginPath();
      this.ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Ring effects
    for (let p of this.particles) {
      if (p.type === 'ring') {
        let alpha = p.life / p.maxLife;
        this.ctx.globalAlpha = alpha * 0.6;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 3 * alpha;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.currentRadius, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    // Regular particles (including chain, trail, swing)
    for (let p of this.particles) {
      if (p.type === 'ring') continue;
      let alpha = p.life / p.maxLife;

      // Player trail - fading ghost
      if (p.type === 'playerTrail') {
        this.ctx.globalAlpha = (p.alpha || 0.4) * alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
        this.ctx.fill();
        continue;
      }

      // Swing arc particles
      if (p.type === 'swing') {
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = p.size * alpha;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();
        continue;
      }

      // Effect trail (fire/ice/poison)
      if (p.type === 'effectTrail') {
        this.ctx.globalAlpha = alpha * 0.7;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 8;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        continue;
      }

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;

      if (p.type === 'chain') {
        this.ctx.shadowColor = '#ff0';
        this.ctx.shadowBlur = 10;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.type === 'trail' ? p.size : p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();

      if (p.type === 'chain') {
        this.ctx.shadowBlur = 0;
      }
    }

    // Draw projectiles
    if (this.projectiles) {
      for (let p of this.projectiles) {
        this.ctx.globalAlpha = 0.9;
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Core
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    // Buff aura around player
    if (this.player && !this.gameOver) {
      let px = this.player.visualX * this.tileSize + this.tileSize / 2;
      let py = this.player.visualY * this.tileSize + this.tileSize / 2;

      if (this.buffs.shield > 0) {
        this.ctx.globalAlpha = 0.3 + Math.sin(this.gameTime / 150) * 0.1;
        this.ctx.strokeStyle = '#88f';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 20 + Math.sin(this.gameTime / 200) * 3, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // Player debuff indicators
      if (this.player.burning > 0) {
        this.ctx.globalAlpha = 0.4 + Math.sin(this.gameTime / 80) * 0.2;
        this.ctx.strokeStyle = '#f80';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 18, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      if (this.player.poisoned > 0) {
        this.ctx.globalAlpha = 0.4 + Math.sin(this.gameTime / 100) * 0.2;
        this.ctx.strokeStyle = '#4f4';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 22, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      if (this.player.slowed > 0) {
        this.ctx.globalAlpha = 0.5;
        this.ctx.strokeStyle = '#4cf';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.arc(px, py, 16, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
      if (this.player.stunned > 0) {
        // Spinning stars around head
        for (let i = 0; i < 3; i++) {
          let angle = this.gameTime / 200 + (i / 3) * Math.PI * 2;
          let sx = px + Math.cos(angle) * 20;
          let sy = py - 15 + Math.sin(angle) * 8;
          this.ctx.globalAlpha = 0.8;
          this.ctx.fillStyle = '#ff0';
          this.ctx.font = '12px monospace';
          this.ctx.fillText('★', sx - 4, sy + 4);
        }
      }

      // AOE range indicator when holding J
      if (this.aoeRangeIndicator && this.aoeRangeIndicator.show) {
        let pulse = Math.sin(this.gameTime / 100) * 0.1 + 0.25;
        this.ctx.globalAlpha = pulse;
        this.ctx.strokeStyle = this.aoeRangeIndicator.color;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.arc(px, py, 2 * this.tileSize, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Fill area lightly
        this.ctx.globalAlpha = pulse * 0.3;
        this.ctx.fillStyle = this.aoeRangeIndicator.color;
        this.ctx.fill();

        this.aoeRangeIndicator.show = false; // Reset each frame
      }

      // AOE cooldown pie indicator
      if (this.aoeCooldown > 0) {
        let pct = this.aoeCooldown / 3000;
        this.ctx.globalAlpha = 0.4;
        this.ctx.fillStyle = '#f80';
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.arc(px, py, 15, -Math.PI/2, -Math.PI/2 + (1 - pct) * Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    // Slash effects
    for (let p of this.particles) {
      if (p.type === 'slash') {
        let alpha = p.life / p.maxLife;
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = p.size * alpha;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(p.x - Math.cos(p.angle) * 15, p.y - Math.sin(p.angle) * 15);
        this.ctx.lineTo(p.x + Math.cos(p.angle) * 15, p.y + Math.sin(p.angle) * 15);
        this.ctx.stroke();
      }
    }

    // Floating texts - separate big and normal
    this.ctx.textAlign = 'center';
    for (let t of this.floatingTexts) {
      let alpha = Math.min(1, t.life / (t.maxLife * 0.3));
      let scale = 1 + (1 - alpha) * 0.3;

      if (t.big) {
        // BIG text for crits - much larger, with glow
        this.ctx.font = 'bold 28px monospace';
        scale = 1.5 + (1 - alpha) * 0.8;
        this.ctx.globalAlpha = alpha * 0.5;
        this.ctx.save();
        this.ctx.translate(t.x, t.y);
        this.ctx.scale(scale, scale);
        // Glow effect
        this.ctx.shadowColor = t.color;
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, 0, 0);
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
        // Main text
        this.ctx.globalAlpha = alpha;
        this.ctx.save();
        this.ctx.translate(t.x, t.y);
        this.ctx.scale(scale, scale);
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(t.text, 2, 2);
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, 0, 0);
        this.ctx.restore();
      } else {
        // Normal floating text
        this.ctx.font = 'bold 16px monospace';
        this.ctx.globalAlpha = alpha;
        this.ctx.save();
        this.ctx.translate(t.x, t.y);
        this.ctx.scale(scale, scale);
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(t.text, 2, 2);
        this.ctx.fillStyle = t.color;
        this.ctx.fillText(t.text, 0, 0);
        this.ctx.restore();
      }
    }

    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;

    // Throttle HUD updates (every 100ms instead of every frame)
    this.hudUpdateTimer = (this.hudUpdateTimer || 0) + this.deltaTime;
    if (this.hudUpdateTimer >= 100) {
      this.hudUpdateTimer = 0;
      this.updateHUD();
      this.updateCombatLog();
    }
  },

  createHUD: function() {
    // Main container to center everything
    this.gameWrapper = document.createElement('div');
    this.gameWrapper.style.cssText = 'display:flex;justify-content:center;align-items:flex-start;gap:15px;padding:10px;';

    // Move game container into wrapper
    let gameContainer = document.getElementById('game-container');
    document.body.appendChild(this.gameWrapper);
    this.gameWrapper.appendChild(gameContainer);

    // LEFT PANEL - Stats & Equipment
    this.statsPanel = document.createElement('div');
    this.statsPanel.style.cssText = 'width:200px;color:white;font-family:monospace;font-size:12px;text-shadow:1px 1px black;background:rgba(0,0,0,0.8);padding:12px;border-radius:5px;border:1px solid #333;order:-1;';
    this.gameWrapper.appendChild(this.statsPanel);

    // RIGHT PANEL - Combat log
    this.combatLog = document.createElement('div');
    this.combatLog.style.cssText = 'width:220px;max-height:500px;overflow:hidden;color:white;font-family:monospace;font-size:11px;text-shadow:1px 1px black;background:rgba(0,0,0,0.8);padding:12px;border-radius:5px;border:1px solid #333;';
    this.combatLog.innerHTML = '<div style="color:#f80;font-size:13px;margin-bottom:8px;border-bottom:1px solid #444;padding-bottom:4px;">⚔ COMBAT LOG</div>';
    this.gameWrapper.appendChild(this.combatLog);
    this.logEntries = [];

    // Remove old HUD element (we'll use statsPanel instead)
    this.hudElement = document.createElement('div');
    this.hudElement.style.cssText = 'display:none;';
    document.body.appendChild(this.hudElement);
  },

  addCombatLog: function(text, color = '#fff') {
    this.logEntries.unshift({ text, color, time: this.gameTime });
    if (this.logEntries.length > 12) this.logEntries.pop();
    this.updateCombatLog();
  },

  updateCombatLog: function() {
    let html = '<div style="color:#f80;font-size:14px;margin-bottom:8px;border-bottom:1px solid #444;padding-bottom:4px;">⚔ COMBAT LOG</div>';
    for (let entry of this.logEntries) {
      let age = (this.gameTime - entry.time) / 1000;
      let opacity = Math.max(0.4, 1 - age * 0.1);
      html += `<div style="color:${entry.color};opacity:${opacity};margin:3px 0;">${entry.text}</div>`;
    }
    this.combatLog.innerHTML = html;
  },

  updateHUD: function() {
    if (!this.player || !this.statsPanel) return;

    let hpPct = this.player.hp / this.player.maxHp;
    let hpColor = hpPct > 0.5 ? '#4f4' : hpPct > 0.25 ? '#ff0' : '#f44';
    let xpPct = Math.floor((this.xp / this.xpToLevel) * 100);
    let hpBarWidth = Math.floor(hpPct * 100);
    let xpBarWidth = xpPct;

    // AOE cooldown
    let aoePct = Math.max(0, 100 - (this.aoeCooldown / 3000) * 100);
    let aoeColor = aoePct >= 100 ? '#f80' : '#444';

    // Time survived
    let seconds = Math.floor(this.gameTime / 1000);
    let mins = Math.floor(seconds / 60);
    let secs = seconds % 60;
    let timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Build stats panel HTML - with icons
    let html = `
      <div style="color:#ff0;font-size:14px;margin-bottom:10px;border-bottom:1px solid #f804;padding-bottom:5px;display:flex;align-items:center;gap:8px;">
        <span style="${this.getRavenIconStyle(0)}transform:scale(0.7);"></span>
        <span>PLAYER STATS</span>
      </div>

      <!-- HEALTH BAR -->
      <div style="margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
          <span style="${this.getRavenIconStyle(240)}transform:scale(0.5);margin:-8px;"></span>
          <span style="color:#f44;font-size:10px;">HEALTH</span>
        </div>
        <div style="background:#300;border-radius:3px;height:18px;position:relative;overflow:hidden;border:1px solid #500;">
          <div style="background:linear-gradient(180deg,${hpColor},#400);width:${Math.min(100, hpBarWidth)}%;height:100%;"></div>
          <div style="position:absolute;top:0;left:0;width:100%;text-align:center;line-height:18px;font-size:11px;text-shadow:1px 1px #000;">
            ${this.player.hp} / ${this.player.maxHp}
          </div>
        </div>
      </div>

      <!-- XP BAR -->
      <div style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
          <span style="${this.getRavenIconStyle(244)}transform:scale(0.5);margin:-8px;"></span>
          <span style="color:#48f;font-size:10px;">LEVEL ${this.level}</span>
        </div>
        <div style="background:#113;border-radius:3px;height:14px;position:relative;overflow:hidden;border:1px solid #226;">
          <div style="background:linear-gradient(180deg,#4af,#228);width:${Math.min(100, xpBarWidth)}%;height:100%;"></div>
          <div style="position:absolute;top:0;left:0;width:100%;text-align:center;line-height:14px;font-size:10px;text-shadow:1px 1px #000;">
            ${this.xp} / ${this.xpToLevel}
          </div>
        </div>
      </div>

      <!-- CORE STATS GRID -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;font-size:11px;">
        <div style="background:#211;padding:4px 6px;border-radius:3px;border:1px solid #422;">
          <span style="${this.getRavenIconStyle(241)}transform:scale(0.45);margin:-10px -6px;vertical-align:middle;"></span>
          <span style="color:#f84">${this.player.damage}</span>
        </div>
        <div style="background:#112;padding:4px 6px;border-radius:3px;border:1px solid #224;">
          <span style="${this.getRavenIconStyle(242)}transform:scale(0.45);margin:-10px -6px;vertical-align:middle;"></span>
          <span style="color:#48f">${this.player.defense}</span>
        </div>
        <div style="background:#121;padding:4px 6px;border-radius:3px;border:1px solid #242;">
          <span style="${this.getRavenIconStyle(400)}transform:scale(0.45);margin:-10px -6px;vertical-align:middle;"></span>
          <span style="color:#ff0">${this.kills}</span>
        </div>
        <div style="background:#221;padding:4px 6px;border-radius:3px;border:1px solid #442;">
          <span style="${this.getRavenIconStyle(403)}transform:scale(0.45);margin:-10px -6px;vertical-align:middle;"></span>
          <span style="color:gold">${this.score}</span>
        </div>
      </div>

      <!-- WAVE & TIME -->
      <div style="background:linear-gradient(180deg,#211,#100);padding:8px;border-radius:4px;margin-bottom:10px;text-align:center;border:1px solid #f0f4;">
        <span style="color:#f0f;font-size:16px;text-shadow:0 0 10px #f0f;">WAVE ${this.difficulty}</span>
        <span style="color:#888;font-size:11px;"> | ${timeStr}</span>
        ${this.combo >= 3 ? `<div style="color:#ff0;font-size:14px;margin-top:4px;text-shadow:0 0 8px #ff0;">${this.combo}x COMBO!</div>` : ''}
      </div>

      <!-- EQUIPMENT -->
      <div style="border-top:1px solid #333;padding-top:8px;margin-bottom:8px;">
        <div style="color:#f80;font-size:11px;margin-bottom:6px;display:flex;align-items:center;gap:4px;">
          <span style="${this.getRavenIconStyle(82)}transform:scale(0.5);margin:-8px;"></span>
          EQUIPMENT
        </div>
        <div style="background:linear-gradient(180deg,#1a1a1a,#111);padding:8px;border-radius:4px;margin-bottom:4px;border:1px solid #333;display:flex;align-items:center;gap:8px;">
          <span style="${this.getRavenIconStyle(this.equipment.weapon ? 0 : 3)}transform:scale(0.7);flex-shrink:0;"></span>
          <div>
            ${this.equipment.weapon
              ? `<div style="color:${this.equipment.weapon.color};font-size:12px;">${this.equipment.weapon.name}</div>
                 <div style="color:#666;font-size:10px;">+${this.equipment.weapon.damage} DMG${this.equipment.weapon.effect ? ` • ${this.equipment.weapon.effect}` : ''}</div>`
              : '<div style="color:#666;font-size:11px;">Fists</div>'}
          </div>
        </div>
        <div style="background:linear-gradient(180deg,#1a1a1a,#111);padding:8px;border-radius:4px;border:1px solid #333;display:flex;align-items:center;gap:8px;">
          <span style="${this.getRavenIconStyle(this.equipment.armor ? 81 : 85)}transform:scale(0.7);flex-shrink:0;"></span>
          <div>
            ${this.equipment.armor
              ? `<div style="color:${this.equipment.armor.color};font-size:12px;">${this.equipment.armor.name}</div>
                 <div style="color:#666;font-size:10px;">+${this.equipment.armor.defense} DEF</div>`
              : '<div style="color:#666;font-size:11px;">None</div>'}
          </div>
        </div>
      </div>

      <!-- BUFFS -->
      ${(this.buffs.speed > 0 || this.buffs.strength > 0 || this.buffs.shield > 0) ? `
      <div style="border-top:1px solid #333;padding-top:8px;margin-bottom:8px;">
        <div style="color:#4cf;font-size:11px;margin-bottom:5px;">ACTIVE BUFFS</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${this.buffs.speed > 0 ? `<div style="background:#024;padding:4px 8px;border-radius:3px;border:1px solid #048;display:flex;align-items:center;gap:4px;">
            <span style="${this.getRavenIconStyle(323)}transform:scale(0.5);margin:-8px;"></span>
            <span style="color:#4cf;font-size:10px;">${Math.ceil(this.buffs.speed/1000)}s</span>
          </div>` : ''}
          ${this.buffs.strength > 0 ? `<div style="background:#420;padding:4px 8px;border-radius:3px;border:1px solid #840;display:flex;align-items:center;gap:4px;">
            <span style="${this.getRavenIconStyle(320)}transform:scale(0.5);margin:-8px;"></span>
            <span style="color:#f80;font-size:10px;">${Math.ceil(this.buffs.strength/1000)}s</span>
          </div>` : ''}
          ${this.buffs.shield > 0 ? `<div style="background:#224;padding:4px 8px;border-radius:3px;border:1px solid #448;display:flex;align-items:center;gap:4px;">
            <span style="${this.getRavenIconStyle(324)}transform:scale(0.5);margin:-8px;"></span>
            <span style="color:#88f;font-size:10px;">${Math.ceil(this.buffs.shield/1000)}s</span>
          </div>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- POTION BELT -->
      ${this.potionBelt && this.potionBelt.length > 0 ? `
      <div style="border-top:1px solid #333;padding-top:8px;margin-bottom:8px;">
        <div style="color:#4f4;font-size:11px;margin-bottom:6px;">POTIONS (1-2-3)</div>
        <div style="display:flex;gap:6px;">
          ${[0, 1, 2].map(i => {
            const p = this.potionBelt[i];
            if (p) {
              return `<div style="background:#111;border:1px solid ${p.color};border-radius:4px;padding:6px;text-align:center;flex:1;">
                <div style="color:${p.color};font-size:10px;font-weight:bold;">${i + 1}</div>
                <div style="color:#888;font-size:8px;">${p.name.split(' ')[0]}</div>
              </div>`;
            } else {
              return `<div style="background:#111;border:1px solid #333;border-radius:4px;padding:6px;text-align:center;flex:1;">
                <div style="color:#444;font-size:10px;">${i + 1}</div>
                <div style="color:#333;font-size:8px;">Empty</div>
              </div>`;
            }
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- AOE COOLDOWN -->
      <div style="border-top:1px solid #333;padding-top:8px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
          <span style="${this.getRavenIconStyle(320)}transform:scale(0.5);margin:-8px;"></span>
          <span style="color:#f80;font-size:10px;">AOE ATTACK (J)</span>
        </div>
        <div style="background:#210;border-radius:3px;height:16px;position:relative;overflow:hidden;border:1px solid #430;">
          <div style="background:linear-gradient(180deg,${aoeColor},#420);width:${Math.min(100, aoePct)}%;height:100%;"></div>
          <div style="position:absolute;top:0;left:0;width:100%;text-align:center;line-height:16px;font-size:10px;text-shadow:1px 1px #000;">
            ${aoePct >= 100 ? '⚡ READY!' : Math.ceil(this.aoeCooldown/1000) + 's'}
          </div>
        </div>
      </div>

      <!-- CONTROLS -->
      <div style="border-top:1px solid #333;padding-top:8px;color:#888;font-size:9px;line-height:1.5;">
        <div style="color:#666;margin-bottom:3px;">CONTROLS</div>
        <div><span style="color:#ff0;">WASD</span> + <span style="color:#f44;">H J K</span></div>
        <div><span style="color:#ff0;">Arrows</span> + <span style="color:#f44;">X C V</span></div>
        <div><span style="color:#4f4;">1 2 3</span> = Use Potions</div>
        <div style="color:#666;margin-top:3px;">Attack / AOE / Pickup</div>
      </div>

      <!-- DEBUG INFO -->
      <div style="border-top:1px solid #222;padding-top:6px;margin-top:8px;color:#444;font-size:8px;">
        FPS: ${this.fps || 60} | P:${this.particles.length} | E:${this.entities.length}
      </div>
    `;

    // Game over overlay
    if (this.gameOver) {
      const goldEarned = Math.floor(this.score / 10) + this.kills * 2;
      const xpEarned = this.score + this.kills * 5;

      let lootHtml = '';
      if (this.collectedLoot.length > 0) {
        lootHtml = `
          <div style="margin:15px 0;padding:10px;background:#111;border:1px solid #333;border-radius:6px;">
            <div style="color:#f80;font-size:12px;margin-bottom:8px;">KEEP ONE ITEM:</div>
            ${this.collectedLoot.map((item, i) => `
              <div class="loot-item" data-index="${i}" style="cursor:pointer;padding:8px;margin:4px 0;background:${this.selectedLootIndex === i ? '#333' : '#1a1a1a'};border:1px solid ${this.selectedLootIndex === i ? item.color : '#333'};border-radius:4px;">
                <div style="color:${item.color};font-size:12px;">${item.name}</div>
                <div style="color:#666;font-size:10px;">${item.type === 'weapon' ? '+' + item.damage + ' DMG' : '+' + item.defense + ' DEF'}</div>
              </div>
            `).join('')}
            ${this.selectedLootIndex >= 0 ? `
              <button id="keepLootBtn" style="margin-top:8px;padding:8px 16px;background:#4a4;border:none;color:#fff;border-radius:4px;cursor:pointer;width:100%;">Keep Item</button>
            ` : ''}
          </div>
        `;
      }

      // Death recap
      let deathRecapHtml = '';
      if (this.recentDamage && this.recentDamage.length > 0) {
        let lastDamage = this.recentDamage.slice(-5).reverse();
        deathRecapHtml = `
          <div style="background:#200;border:1px solid #400;border-radius:6px;padding:8px;margin:10px 0;">
            <div style="color:#f44;font-size:11px;margin-bottom:6px;">KILLED BY:</div>
            ${lastDamage.map((d, i) => `
              <div style="color:${i === 0 ? '#f88' : '#888'};font-size:${i === 0 ? '13px' : '11px'};padding:2px 0;">
                ${d.source} dealt ${d.damage} ${d.type}
              </div>
            `).join('')}
          </div>
        `;
      }

      html = `
        <div style="text-align:center;">
          <div style="color:#f00;font-size:24px;margin-bottom:10px;text-shadow:0 0 10px #f00;">GAME OVER</div>
          <div style="color:#ff0;font-size:20px;margin-bottom:8px;">Score: ${this.score}</div>
          <div style="display:flex;justify-content:center;gap:15px;margin-bottom:10px;">
            <div><span style="color:#888;">Level</span> <span style="color:#4af;">${this.level}</span></div>
            <div><span style="color:#888;">Wave</span> <span style="color:#f80;">${this.difficulty}</span></div>
          </div>
          <div style="color:#aaa;margin-bottom:3px;">${this.kills} kills • ${timeStr}</div>
          <div style="color:#aaa;margin-bottom:10px;">Best combo: ${this.combo}x</div>

          ${deathRecapHtml}

          <div style="background:#1a1a0a;border:1px solid #440;border-radius:6px;padding:10px;margin:10px 0;">
            <div style="color:#ff0;font-size:14px;">+${goldEarned} Gold</div>
            <div style="color:#4af;font-size:14px;">+${xpEarned} XP</div>
          </div>

          ${lootHtml}

          <div id="chain-leaderboard" style="margin-top:10px;"></div>

          <div style="margin-top:15px;">
            <button id="restartBtn" onclick="window.ArenaGame.restart()" style="padding:10px 20px;background:#444;border:none;color:#fff;border-radius:4px;cursor:pointer;margin:5px;position:relative;z-index:100;">Play Again</button>
            <button id="hubBtn" onclick="window.location.href='hub.html'" style="padding:10px 20px;background:#f44;border:none;color:#fff;border-radius:4px;cursor:pointer;margin:5px;position:relative;z-index:100;">Return to Hub</button>
          </div>
        </div>
      `;

      // Load on-chain leaderboard after render
      setTimeout(() => this.loadChainLeaderboard(), 100);
    }

    this.statsPanel.innerHTML = html;

    // Attach event listeners for game over buttons
    if (this.gameOver) {
      let restartBtn = document.getElementById('restartBtn');
      let hubBtn = document.getElementById('hubBtn');
      let keepLootBtn = document.getElementById('keepLootBtn');

      if (restartBtn) {
        restartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.restart();
        });
      }
      if (hubBtn) {
        hubBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = 'hub.html';
        });
      }
      if (keepLootBtn) {
        keepLootBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.keepSelectedLoot();
        });
      }

      // Loot item selection
      let lootItems = document.querySelectorAll('.loot-item');
      lootItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          let index = parseInt(item.dataset.index);
          this.selectLoot(index);
        });
      });
    }
  },

  selectLoot: function(index) {
    this.selectedLootIndex = index;
    this.updateHUD();
  },

  keepSelectedLoot: function() {
    if (this.selectedLootIndex >= 0 && this.collectedLoot[this.selectedLootIndex]) {
      this.saveItemToInventory(this.collectedLoot[this.selectedLootIndex]);
      this.addCombatLog(`📦 Saved ${this.collectedLoot[this.selectedLootIndex].name} to inventory!`, this.collectedLoot[this.selectedLootIndex].color);
      this.collectedLoot = [];
      this.selectedLootIndex = -1;
      this.updateHUD();
    }
  },

  returnToHub: function() {
    window.location.href = 'hub.html';
  },

  // Show intro screen with game info
  showIntroScreen: async function() {
    // Create intro overlay
    let overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.95);z-index:1000;
      display:flex;align-items:center;justify-content:center;
      font-family:monospace;
    `;

    let statsHtml = '';
    try {
      if (typeof MegaETH !== 'undefined' && MegaETH.leaderboardAddress) {
        const [stats, kingInfo, scores] = await Promise.all([
          MegaETH.getStats(),
          MegaETH.getKingInfo(),
          MegaETH.getTopScores(5)
        ]);

        statsHtml = `
          <div style="background:#111;border:1px solid #333;border-radius:8px;padding:15px;margin:15px 0;">
            <div style="display:flex;justify-content:space-around;margin-bottom:10px;">
              <div><span style="color:#888;">Prize Pool:</span> <span style="color:#0f0;font-size:18px;">${parseFloat(stats.prizePool).toFixed(4)} ETH</span></div>
              <div><span style="color:#888;">Total Games:</span> <span style="color:#4af;">${stats.totalGames}</span></div>
            </div>
            ${kingInfo.king && kingInfo.king !== '0x0000000000000000000000000000000000000000' ? `
              <div style="background:#220;border:1px solid #ff0;border-radius:4px;padding:10px;text-align:center;">
                <div style="color:#ff0;font-size:16px;">👑 CURRENT KING 👑</div>
                <div style="color:#fff;">${MegaETH.formatAddress(kingInfo.king)}</div>
                <div style="color:#0f0;">Score: ${kingInfo.score} | Earned: ${parseFloat(kingInfo.earnings).toFixed(4)} ETH</div>
              </div>
            ` : `<div style="color:#666;text-align:center;">No king yet - be the first!</div>`}
            ${scores.length > 0 ? `
              <div style="margin-top:10px;">
                <div style="color:#888;font-size:11px;margin-bottom:5px;">LEADERBOARD</div>
                ${scores.map((s, i) => `
                  <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid #222;">
                    <span style="color:${i===0?'#ff0':'#aaa'};">${i===0?'👑':i+1+'.'} ${s.name || MegaETH.formatAddress(s.player)}</span>
                    <span style="color:#fff;">${s.score}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }
    } catch (e) {
      console.log('Could not load chain stats:', e);
    }

    overlay.innerHTML = `
      <div style="max-width:500px;text-align:center;color:#fff;padding:20px;">
        <h1 style="color:#f33;text-shadow:0 0 20px #f00;margin-bottom:5px;">⚔ ARENA SURVIVAL ⚔</h1>
        <div style="color:#888;margin-bottom:20px;">Roguelike Survival on MegaETH</div>

        <div style="background:#1a0a0a;border:1px solid #f33;border-radius:8px;padding:15px;margin-bottom:15px;">
          <div style="color:#ff0;font-size:18px;margin-bottom:10px;">👑 KING OF THE HILL 👑</div>
          <div style="color:#aaa;font-size:13px;line-height:1.6;">
            Fight endless waves of monsters.<br>
            Submit your score on-chain for <span style="color:#0f0;">0.0001 ETH</span>.<br><br>
            <span style="color:#f80;">20% goes to the current KING</span><br>
            <span style="color:#4af;">70% goes to the prize pool</span><br>
            <span style="color:#888;">10% goes to the house</span><br><br>
            <span style="color:#ff0;">Beat the king = become the king = earn from challengers!</span>
          </div>
        </div>

        ${statsHtml}

        <button id="startGameBtn" style="
          padding:15px 40px;font-size:18px;
          background:linear-gradient(180deg,#f44,#a00);
          border:2px solid #f66;color:#fff;
          border-radius:8px;cursor:pointer;
          font-family:monospace;font-weight:bold;
          text-shadow:0 2px #000;
          box-shadow:0 0 20px rgba(255,0,0,0.5);
        ">🦊 CONNECT & PLAY</button>

        <div style="margin-top:10px;">
          <button id="skipWalletBtn" style="
            padding:8px 20px;font-size:12px;
            background:transparent;border:1px solid #444;
            color:#666;border-radius:4px;cursor:pointer;
            font-family:monospace;
          ">Play without wallet</button>
        </div>

        <div style="color:#666;font-size:11px;margin-top:15px;">
          Use arrow keys to move • Kill monsters • Survive
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('startGameBtn').addEventListener('click', async () => {
      const btn = document.getElementById('startGameBtn');
      const originalText = btn.textContent;
      btn.textContent = '⏳ CONNECTING...';
      btn.disabled = true;

      try {
        // Try to connect wallet
        if (typeof MegaETH !== 'undefined' && MegaETH.getProvider()) {
          await MegaETH.connect();
          MegaETH.updateUI();
          overlay.remove();
          this.startGame();
        } else {
          // No wallet available
          btn.textContent = originalText;
          btn.disabled = false;
          alert('MetaMask not detected. Install it or click "Play without wallet"');
        }
      } catch (err) {
        console.log('Wallet connection failed:', err.message);
        btn.textContent = originalText;
        btn.disabled = false;

        if (err.message.includes('rejected') || err.message.includes('denied')) {
          // User cancelled - let them try again
          alert('Connection cancelled. Click again to retry or "Play without wallet"');
        } else {
          alert('Wallet error: ' + err.message);
        }
      }
    });

    // Skip wallet option
    document.getElementById('skipWalletBtn').addEventListener('click', () => {
      overlay.remove();
      this.startGame();
    });
  },

  // Actually start the game
  startGame: function() {
    this.generateArena();
    this.spawnPlayer();
    this.lastTime = performance.now();
    requestAnimationFrame(() => this.gameLoop());
  },

  // Show game over screen with transaction confirmation and leaderboard
  showGameOverScreen: function(data) {
    // Remove any existing overlay
    const existing = document.getElementById('gameover-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gameover-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.95);z-index:2000;
      display:flex;align-items:center;justify-content:center;
      font-family:monospace;
    `;

    const formatAddr = (addr) => {
      if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'Anon';
      return addr.slice(0, 6) + '...' + addr.slice(-4);
    };

    let leaderboardHtml = '';
    if (data.leaderboard && data.leaderboard.length > 0) {
      leaderboardHtml = `
        <div style="margin-top:20px;text-align:left;max-height:200px;overflow-y:auto;">
          <div style="color:#ff0;text-align:center;margin-bottom:10px;">🏆 LEADERBOARD 🏆</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="color:#888;border-bottom:1px solid #333;">
              <th style="padding:5px;text-align:left;">#</th>
              <th style="padding:5px;text-align:left;">Player</th>
              <th style="padding:5px;text-align:right;">Score</th>
              <th style="padding:5px;text-align:right;">Wave</th>
            </tr>
            ${data.leaderboard.map((entry, i) => `
              <tr style="border-bottom:1px solid #222;${entry.score === data.playerScore ? 'background:#030;' : ''}">
                <td style="padding:5px;color:${i === 0 ? '#ff0' : '#888'};">${i === 0 ? '👑' : i + 1}</td>
                <td style="padding:5px;color:#fff;">${entry.name || formatAddr(entry.player)}</td>
                <td style="padding:5px;text-align:right;color:#0f0;">${entry.score}</td>
                <td style="padding:5px;text-align:right;color:#4af;">${entry.wave}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    }

    let txHtml = '';
    if (data.hash) {
      txHtml = `
        <div style="background:#020;border:1px solid #0f0;border-radius:8px;padding:15px;margin:15px 0;">
          <div style="color:#0f0;font-size:16px;">✅ SCORE SAVED ON-CHAIN!</div>
          <div style="color:#888;font-size:11px;margin-top:5px;">
            TX: <a href="https://megaeth-testnet.explorer.caldera.xyz/tx/${data.hash}" target="_blank" style="color:#4af;">${data.hash.slice(0, 20)}...</a>
          </div>
        </div>
      `;
    } else if (data.error) {
      txHtml = `
        <div style="background:#200;border:1px solid #f00;border-radius:8px;padding:15px;margin:15px 0;">
          <div style="color:#f66;font-size:16px;">❌ SUBMISSION FAILED</div>
          <div style="color:#888;font-size:11px;margin-top:5px;">${data.error.slice(0, 60)}</div>
        </div>
      `;
    }

    let epochHtml = '';
    if (data.epoch) {
      const hours = Math.floor(data.epoch.timeRemaining / 3600);
      const mins = Math.floor((data.epoch.timeRemaining % 3600) / 60);
      epochHtml = `
        <div style="color:#888;font-size:12px;margin-top:10px;">
          Prize Pool: <span style="color:#0f0;">${data.epoch.prizePool} ETH</span> •
          Time Left: <span style="color:#ff0;">${hours}h ${mins}m</span>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div style="max-width:450px;text-align:center;color:#fff;padding:20px;">
        <h1 style="color:#f33;text-shadow:0 0 20px #f00;margin-bottom:10px;">💀 GAME OVER 💀</h1>

        <div style="display:flex;justify-content:space-around;margin:20px 0;font-size:18px;">
          <div>
            <div style="color:#888;font-size:12px;">SCORE</div>
            <div style="color:#ff0;font-size:24px;">${this.score}</div>
          </div>
          <div>
            <div style="color:#888;font-size:12px;">WAVE</div>
            <div style="color:#4af;font-size:24px;">${this.difficulty}</div>
          </div>
          <div>
            <div style="color:#888;font-size:12px;">KILLS</div>
            <div style="color:#f80;font-size:24px;">${this.kills}</div>
          </div>
        </div>

        ${txHtml}
        ${epochHtml}
        ${leaderboardHtml}

        <button id="playAgainBtn" style="
          margin-top:20px;padding:15px 40px;font-size:16px;
          background:linear-gradient(180deg,#f44,#a00);
          border:2px solid #f66;color:#fff;
          border-radius:8px;cursor:pointer;
          font-family:monospace;font-weight:bold;
        ">🎮 PLAY AGAIN (0.001 ETH)</button>

        <button id="exitGameBtn" style="
          margin-top:10px;padding:10px 30px;font-size:12px;
          background:transparent;border:1px solid #444;
          color:#888;border-radius:4px;cursor:pointer;
          font-family:monospace;display:block;margin-left:auto;margin-right:auto;
        ">← Back to Dashboard</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      overlay.remove();
      this.restart();
    });

    document.getElementById('exitGameBtn').addEventListener('click', () => {
      window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
    });
  },

  // Load and display on-chain leaderboard
  loadChainLeaderboard: async function() {
    const container = document.getElementById('chain-leaderboard');
    if (!container || typeof MegaETH === 'undefined') return;

    try {
      const [scores, stats, kingInfo] = await Promise.all([
        MegaETH.getTopScores(5),
        MegaETH.getStats(),
        MegaETH.getKingInfo()
      ]);

      let html = `
        <div style="background:#111;border:1px solid #333;border-radius:6px;padding:10px;text-align:left;">
          <div style="color:#ff0;font-size:14px;margin-bottom:8px;text-align:center;">👑 KING OF THE HILL 👑</div>
          <div style="display:flex;justify-content:space-around;margin-bottom:10px;font-size:11px;">
            <div><span style="color:#888;">Pool:</span> <span style="color:#0f0;">${parseFloat(stats.prizePool).toFixed(4)} ETH</span></div>
            <div><span style="color:#888;">Games:</span> <span style="color:#4af;">${stats.totalGames}</span></div>
          </div>
      `;

      if (kingInfo.king && kingInfo.king !== '0x0000000000000000000000000000000000000000') {
        html += `
          <div style="background:#220;border:1px solid #440;border-radius:4px;padding:6px;margin-bottom:8px;text-align:center;">
            <div style="color:#ff0;font-size:12px;">Current King</div>
            <div style="color:#fff;font-size:11px;">${MegaETH.formatAddress(kingInfo.king)}</div>
            <div style="color:#0f0;font-size:11px;">Score: ${kingInfo.score} | Earned: ${parseFloat(kingInfo.earnings).toFixed(4)} ETH</div>
          </div>
        `;
      }

      if (scores.length > 0) {
        html += `<div style="color:#888;font-size:10px;margin-bottom:4px;">TOP 5</div>`;
        scores.forEach((entry, i) => {
          const isKing = i === 0;
          html += `
            <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid #222;">
              <span style="color:${isKing ? '#ff0' : '#888'};">${isKing ? '👑' : (i+1)+'.'} ${entry.name || MegaETH.formatAddress(entry.player)}</span>
              <span style="color:#fff;">${entry.score} <span style="color:#666;">(W${entry.wave})</span></span>
            </div>
          `;
        });
      } else {
        html += `<div style="color:#666;font-size:11px;text-align:center;">No scores yet - be the first king!</div>`;
      }

      html += `
          <div style="color:#666;font-size:9px;margin-top:8px;text-align:center;">
            Entry: ${MegaETH.ENTRY_FEE} ETH → 70% pool, 20% king, 10% house
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      console.error('Failed to load chain leaderboard:', err);
      container.innerHTML = `<div style="color:#666;font-size:11px;">Connect wallet to see on-chain leaderboard</div>`;
    }
  }
};

// Expose functions globally for onclick handlers
window.ArenaGame = ArenaGame;

// Start game when page loads
window.onload = function() {
  ArenaGame.init();
};
