const dotenv = require('dotenv');
dotenv.config();
const { callAI } = require('./aiProvider');

const CODEX_GAME_SYSTEM_PROMPT = `
You are a senior game architect. Analyze the user's prompt and generate a complete, playable staged game blueprint in JSON.
Determine the main character, character type, vehicles, weapons, location, and the game genre.
Do not force everything into a platformer! Choose the genre that matches the user's request.

SUPPORTED GENRES (use ONLY these exact values):
- platformer, driving, bike_racing, racing, endless_runner, shooter, battle_royale, survival, puzzle

Do NOT output open_world, rpg, adventure, sports, or simulation — map those concepts into the closest supported genre above.

Return ONLY valid JSON matching the schema precisely. Do not wrap in markdown or include code blocks.
`.trim();

const BLUEPRINT_SCHEMA_PROMPT = `
Generate a JSON object matching this exact schema:
{
  "title": "A unique game title",
  "theme": "Details about the location and style",
  "genre": "One of: platformer, driving, bike_racing, racing, endless_runner, shooter, battle_royale, survival, puzzle",
  "intent": {
    "character": "Main character name/description",
    "characterType": "human | vehicle | robot | animal | monster | custom",
    "vehicle": "Vehicle name if present, otherwise null",
    "location": "City or setting name",
    "weapons": ["Weapon 1", "Weapon 2"],
    "actions": ["Action 1", "Action 2"]
  },
  "player": {
    "name": "Hero name",
    "type": "human | vehicle | robot | animal | monster | custom",
    "appearance": "Visual description",
    "hp": 100,
    "maxHp": 100,
    "speed": 220,
    "jumpForce": -350,
    "gravity": 300,
    "colors": {
      "bg": "Background hex color",
      "accent": "Laser/UI accent hex color",
      "secondary": "Collectible hex color",
      "hazard": "Hazard hex color",
      "player": "Player sprite hex color",
      "text": "UI text hex color"
    }
  },
  "stages": [
    {
      "stageNumber": 1,
      "environment": "Name of environment",
      "objective": "Missions to accomplish in this stage",
      "blocks": [
        {
          "id": "b_1_1",
          "x": 400,
          "y": 420,
          "width": 256,
          "height": 30,
          "type": "ground | solid | hazard | collectible | puzzle_piece"
        }
      ],
      "enemies": [
        {
          "id": "e_1_1",
          "name": "Enemy name",
          "x": 600,
          "y": 380,
          "hp": 100,
          "maxHp": 100,
          "damage": 10,
          "type": "traffic | zombie | patrol | chase",
          "alive": true,
          "defeated": false
        }
      ],
      "boss": {
        "id": "boss_1",
        "name": "Boss name",
        "x": 2600,
        "y": 200,
        "hp": 200,
        "maxHp": 200,
        "phases": ["Phase 1 mechanic"],
        "alive": true,
        "defeated": false
      },
      "completionCondition": "What triggers stage completion"
    }
  ],
  "winCondition": "Victory condition text",
  "loseCondition": "Failure condition text"
}

GENRE SPECIFIC BLUEPRINT RULES:
1. Driving / Racing / Bike Racing:
   - Gravity = 0. Physics speed = 250.
   - Ground blocks should be typed 'ground' and drawn as flat road lanes at y=360, height=80. No gaps or floating solid platforms.
   - Enemies must have type 'traffic' or 'chase' and represent cars, trucks, or police. Set their x between 500 and 2400, y matching the road lanes (e.g. 330, 360, 390).
   - Collectibles should be fuel or nitro canisters.
2. Endless Runner:
   - Gravity = 0.
   - Render 3 horizontal tracks at y=150, y=250, y=350. Blocks array should define these tracks as 'solid' lines and specify hurdles ('hazard') and coins ('collectible') along them.
   - Enemies are not required, focus on obstacles (hurdles/barriers).
3. Battle Royale:
   - Include weapon crates as collectibles.
   - Spawns several rival NPCs ('patrol') across the map.
4. Shooter / Zombie Survival:
   - Spawns zombie waves ('zombie') chasing the player.
   - Weapons and ammo crates as collectibles.
`.trim();

// ============================================================
// GENRE / LOCATION CLASSIFIERS (kept from original)
// ============================================================

const GENRE_KEYWORDS = {
  driving: [
    'drive',
    'car',
    'ferrari',
    'lamborghini',
    'tesla',
    'police',
    'traffic',
    'chase',
    'mumbai',
    'street',
    'highway',
    'truck',
    'taxi',
  ],
  bike_racing: ['bike', 'motorcycle', 'moto', 'racing', 'race', 'tokyo', 'rider', 'cycle'],
  racing: ['race', 'racing', 'laps', 'speedway', 'track', 'opponents', 'f1', 'kart'],
  endless_runner: [
    'surfers',
    'runner',
    'subway',
    'run',
    'coin',
    'dash',
    'temple',
    'lane',
    'switch',
    'obstacle',
    'hyderabad',
  ],
  battle_royale: [
    'battle',
    'royale',
    'dubai',
    'free fire',
    'pubg',
    'fortnite',
    'loot',
    'zone',
    'shrinking',
    'circle',
    'survival',
  ],
  survival: ['survival', 'zombie', 'apocalypse', 'infect', 'hospital', 'undead', 'outbreak', 'survive'],
  shooter: ['shooter', 'fps', 'tps', 'gun', 'shoot', 'bullet', 'soldier', 'military', 'war'],
  open_world: ['open world', 'swing', 'spider-man', 'new york', 'city', 'sandbox', 'explore', 'npc', 'missions'],
  rpg: ['rpg', 'quest', 'level up', 'character', 'inventory', 'stats'],
  adventure: ['adventure', 'explore', 'treasure', 'island', 'cavern', 'pirate', 'map', 'chest'],
  platformer: ['platformer', 'jump', 'blocks', 'ninja', 'naruto', 'shinobi', 'leaf village', 'adventure', 'rpg', 'open world', 'explore', 'quest'],
  puzzle: ['puzzle', 'riddle', 'maze', 'logic', 'solve', 'clue', 'brain', 'cryptic', ' labyrinth'],
};

function classifyGenre(text) {
  const t = text.toLowerCase();
  let bestGenre = 'platformer';
  let maxMatches = -1;

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const matches = keywords.filter((kw) => t.includes(kw)).length;
    if (matches > maxMatches && matches > 0) {
      maxMatches = matches;
      bestGenre = genre;
    }
  }

  if (t.includes('ferrari') || t.includes('car') || t.includes('police') || t.includes('traffic')) {
    bestGenre = 'driving';
  }
  if (t.includes('bike') || t.includes('motorcycle')) {
    bestGenre = 'bike_racing';
  }
  if (t.includes('surfers') || t.includes('endless') || (t.includes('run') && t.includes('coin'))) {
    bestGenre = 'endless_runner';
  }
  if (t.includes('royale') || t.includes('free fire') || t.includes('battle')) {
    bestGenre = 'battle_royale';
  }
  if (t.includes('zombie') || t.includes('apocalypse')) {
    bestGenre = 'survival';
  }
  if (t.includes('puzzle') || t.includes('riddle') || t.includes('maze') || t.includes('logic')) {
    bestGenre = 'puzzle';
  }

  return normalizeGenre(bestGenre);
}

function extractLocation(text) {
  const t = text.toLowerCase();
  if (t.includes('mumbai')) return 'Mumbai';
  if (t.includes('tokyo')) return 'Tokyo';
  if (t.includes('dubai')) return 'Dubai';
  if (t.includes('hyderabad')) return 'Hyderabad';
  if (t.includes('new york') || t.includes('ny')) return 'New York';
  if (t.includes('london')) return 'London';
  if (t.includes('paris')) return 'Paris';
  if (t.includes('bangkok')) return 'Bangkok';
  if (t.includes('seoul')) return 'Seoul';
  if (t.includes('delhi')) return 'Delhi';
  if (t.includes('space') || t.includes('galaxy') || t.includes('planet')) return 'Deep Space';
  if (t.includes('ocean') || t.includes('sea')) return 'Ocean Realm';
  if (t.includes('jungle') || t.includes('forest')) return 'Jungle Depths';
  if (t.includes('desert')) return 'Desert Wasteland';
  if (t.includes('city') || t.includes('urban')) return 'Metro City';
  return 'Surreal Void';
}

// ============================================================
// THEME RESOLVER
// ============================================================

const THEME_KEYWORDS = {
  city: [
    'city',
    'street',
    'downtown',
    'urban',
    'crime',
    'mafia',
    'gang',
    'traffic',
    'highway',
    'mumbai',
    'dubai',
    'tokyo',
    'london',
    'metro',
  ],
  zombie: [
    'zombie',
    'undead',
    'apocalypse',
    'infected',
    'walker',
    'outbreak',
    'viral',
    'mutation',
    'plague',
    'dead',
    'survivor',
  ],
  space: [
    'space',
    'alien',
    'galaxy',
    'planet',
    'spacecraft',
    'star',
    'ufo',
    'cosmos',
    'nebula',
    'astronaut',
    'orbit',
    'sci-fi',
  ],
  ninja: [
    'ninja',
    'shinobi',
    'katana',
    'samurai',
    'martial',
    'shadow',
    'stealth',
    'naruto',
    'sensei',
    'dojo',
    'feudal',
  ],
  military: [
    'soldier',
    'military',
    'army',
    'war',
    'gun',
    'rifle',
    'combat',
    'sniper',
    'grenade',
    'tactical',
    'operation',
    'platoon',
  ],
  fantasy: [
    'magic',
    'dragon',
    'wizard',
    'elf',
    'dwarf',
    'castle',
    'kingdom',
    'sword',
    'sorcery',
    'dungeon',
    'quest',
    'rpg',
  ],
  pirate: ['pirate', 'corsair', 'ship', 'sea', 'treasure', 'island', 'cannon', 'sail', 'buccaneer', 'ocean'],
  racing: [
    'race',
    'racing',
    'ferrari',
    'lambo',
    'car',
    'bike',
    'motorcycle',
    'drift',
    'turbo',
    'nitro',
    'lap',
    'circuit',
  ],
  superhero: ['superhero', 'spider-man', 'spiderman', 'batman', 'hero', 'power', 'cape', 'web', 'super', 'villain'],
  western: ['cowboy', 'western', 'wild west', 'gunslinger', 'sheriff', 'outlaw', 'saloon', 'desert'],
  underwater: ['underwater', 'submarine', 'mermaid', 'deep sea', 'shark', 'coral', 'ocean depths'],
  battle_royale: ['royale', 'pubg', 'fortnite', 'free fire', 'zone', 'shrink', 'loot', 'squad'],
};

function resolveTheme(text) {
  const t = text.toLowerCase();
  let bestTheme = 'city';
  let maxMatches = 0;

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const matches = keywords.filter((kw) => t.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestTheme = theme;
    }
  }

  // High-priority overrides
  if (t.includes('zombie') || t.includes('undead')) return 'zombie';
  if (t.includes('ninja') || t.includes('shinobi')) return 'ninja';
  if (t.includes('space') || t.includes('alien') || t.includes('galaxy')) return 'space';
  if (t.includes('pirate')) return 'pirate';
  if (t.includes('battle') && t.includes('royale')) return 'battle_royale';
  if (t.includes('spider-man') || t.includes('spiderman')) return 'superhero';

  return bestTheme;
}

// ============================================================
// HERO RESOLVER
// ============================================================

function resolveHero(text, genre, theme) {
  const t = text.toLowerCase();

  // --- Vehicle heroes (checked first) ---
  if (t.includes('ferrari')) {
    return {
      name: 'Ferrari Pilot',
      type: 'vehicle',
      subType: 'car',
      appearance: 'Blazing red Ferrari sports car',
      abilities: ['Nitro Boost', 'Handbrake Drift', 'Ram'],
    };
  }
  if (t.includes('lamborghini') || t.includes('lambo')) {
    return {
      name: 'Lambo Driver',
      type: 'vehicle',
      subType: 'car',
      appearance: 'Matte black Lamborghini supercar',
      abilities: ['Nitro Boost', 'Drift Slide', 'Ram'],
    };
  }
  if (t.includes('tesla')) {
    return {
      name: 'Tesla Ace',
      type: 'vehicle',
      subType: 'car',
      appearance: 'Sleek electric Tesla Model S',
      abilities: ['EV Burst', 'Autopilot Dodge', 'Ram'],
    };
  }
  if (t.includes('truck') || t.includes('lorry')) {
    return {
      name: 'Truck Commander',
      type: 'vehicle',
      subType: 'car',
      appearance: 'Heavy armored truck',
      abilities: ['Ram Drive', 'Horn Blast', 'Turbo Push'],
    };
  }
  if (t.includes('bike') || t.includes('motorcycle') || t.includes('moto')) {
    return {
      name: 'Moto Rider',
      type: 'vehicle',
      subType: 'motorcycle',
      appearance: 'High-performance racing motorcycle',
      abilities: ['Wheelie Thrust', 'Nitro Surge', 'Draft Dodge'],
    };
  }
  if (t.includes('plane') || t.includes('aircraft') || t.includes('jet')) {
    return {
      name: 'Ace Pilot',
      type: 'vehicle',
      subType: 'aircraft',
      appearance: 'Twin-engine fighter jet',
      abilities: ['Fly', 'Missile Strike', 'Barrel Roll'],
    };
  }
  if (t.includes('spaceship') || t.includes('spacecraft') || t.includes('rocket')) {
    return {
      name: 'Starfighter',
      type: 'vehicle',
      subType: 'spacecraft',
      appearance: 'Sleek sci-fi spacecraft',
      abilities: ['Hyperdrive', 'Laser Volley', 'Warp Dodge'],
    };
  }
  if (
    (genre === 'driving' || genre === 'racing') &&
    !t.includes('human') &&
    !t.includes('man') &&
    !t.includes('person')
  ) {
    return {
      name: 'Street Racer',
      type: 'vehicle',
      subType: 'car',
      appearance: 'Sleek custom race car',
      abilities: ['Nitro Boost', 'Handbrake Drift', 'Ram'],
    };
  }
  if (genre === 'bike_racing') {
    return {
      name: 'Moto Racer',
      type: 'vehicle',
      subType: 'motorcycle',
      appearance: 'Racing motorcycle',
      abilities: ['Wheelie Thrust', 'Nitro Surge', 'Draft Dodge'],
    };
  }

  // --- Human archetypes ---
  if (t.includes('naruto')) {
    return {
      name: 'Naruto Uzumaki',
      type: 'human',
      subType: 'ninja',
      appearance: 'Orange jumpsuit with headband and spiky blonde hair',
      abilities: ['Rasengan', 'Shadow Clone', 'Nine-Tails Burst'],
    };
  }
  if (t.includes('ninja') || t.includes('shinobi')) {
    return {
      name: 'Shadow Ninja',
      type: 'human',
      subType: 'ninja',
      appearance: 'Dark hooded ninja with katana and mask',
      abilities: ['Wall Jump', 'Shuriken Throw', 'Shadow Dash'],
    };
  }
  if (t.includes('samurai')) {
    return {
      name: 'Ronin Samurai',
      type: 'human',
      subType: 'ninja',
      appearance: 'Armored samurai with katana and red clan markings',
      abilities: ['Blade Slash', 'Parry', 'Iaijutsu Strike'],
    };
  }
  if (t.includes('spider-man') || t.includes('spiderman')) {
    return {
      name: 'Spider Hero',
      type: 'human',
      subType: 'superhero',
      appearance: 'Red and blue spider suit with web shooters',
      abilities: ['Web Swing', 'Wall Crawl', 'Spider Sense'],
    };
  }
  if (t.includes('batman')) {
    return {
      name: 'Dark Knight',
      type: 'human',
      subType: 'superhero',
      appearance: 'Dark armored bat suit with cape',
      abilities: ['Batarang Throw', 'Grapple Hook', 'Cape Glide'],
    };
  }
  if (t.includes('superhero') || t.includes('super hero') || (t.includes('hero') && t.includes('power'))) {
    return {
      name: 'Apex Hero',
      type: 'human',
      subType: 'superhero',
      appearance: 'Bold caped superhero suit with glowing emblem',
      abilities: ['Super Punch', 'Shield Blast', 'Flight Dash'],
    };
  }
  if (t.includes('soldier') || t.includes('military') || t.includes('army') || t.includes('marine')) {
    return {
      name: 'Combat Soldier',
      type: 'human',
      subType: 'soldier',
      appearance: 'Digital camouflage tactical gear with helmet and rifle',
      abilities: ['Fire Rifle', 'Grenade Throw', 'Roll Dodge'],
    };
  }
  if (t.includes('sniper')) {
    return {
      name: 'Elite Sniper',
      type: 'human',
      subType: 'soldier',
      appearance: 'Ghillie suit with long-range rifle',
      abilities: ['Precision Shot', 'Cloak', 'Tactical Sprint'],
    };
  }
  if (t.includes('pirate') || t.includes('corsair')) {
    return {
      name: 'Sea Corsair',
      type: 'human',
      subType: 'human_male',
      appearance: 'Classic pirate coat with hat and curved cutlass',
      abilities: ['Sword Slash', 'Pistol Shot', 'Grapple Hook'],
    };
  }
  if (t.includes('wizard') || t.includes('mage') || t.includes('sorcerer') || t.includes('warlock')) {
    return {
      name: 'Arcane Mage',
      type: 'human',
      subType: 'superhero',
      appearance: 'Robed wizard with glowing staff and arcane runes',
      abilities: ['Fireball', 'Frost Nova', 'Teleport'],
    };
  }
  if (t.includes('zombie') && (t.includes('survivor') || t.includes('slayer') || t.includes('fighter'))) {
    return {
      name: 'Undead Slayer',
      type: 'human',
      subType: 'soldier',
      appearance: 'Ragged survivor gear with machete and shotgun',
      abilities: ['Slash', 'Shotgun Blast', 'Roll Dodge'],
    };
  }
  if (t.includes('zombie') || t.includes('apocalypse')) {
    return {
      name: 'Last Survivor',
      type: 'human',
      subType: 'soldier',
      appearance: 'Torn clothes, survivor pack, armed with a rifle',
      abilities: ['Fire Weapon', 'Dodge', 'Melee Strike'],
    };
  }
  if (t.includes('police') || t.includes('cop') || t.includes('officer')) {
    return {
      name: 'Officer Chase',
      type: 'human',
      subType: 'soldier',
      appearance: 'Police uniform with badge and pistol holster',
      abilities: ['Fire Pistol', 'Tackle', 'Call Backup'],
    };
  }
  if (t.includes('assassin') || t.includes('hitman')) {
    return {
      name: 'Phantom Assassin',
      type: 'human',
      subType: 'ninja',
      appearance: 'Sleek black assassin suit, dual blades',
      abilities: ['Silent Kill', 'Shadow Step', 'Poison Blade'],
    };
  }
  if (t.includes('dragon')) {
    return {
      name: 'Dragon Rider',
      type: 'animal',
      subType: 'creature',
      appearance: 'Armored rider atop a massive fire-breathing dragon',
      abilities: ['Fire Breath', 'Wing Dash', 'Dragon Roar'],
    };
  }
  if (t.includes('woman') || t.includes('girl') || t.includes('female')) {
    return {
      name: 'Swift Heroine',
      type: 'human',
      subType: 'human_female',
      appearance: 'Athletic woman in sleek combat suit with energy pistol',
      abilities: ['Dash Strike', 'Double Jump', 'Kunai Throw'],
    };
  }
  if (t.includes('man') || t.includes('guy') || t.includes('boy') || t.includes('male')) {
    return {
      name: 'Street Runner',
      type: 'human',
      subType: 'human_male',
      appearance: 'Young man in urban street wear with sneakers',
      abilities: ['Sprint', 'Double Jump', 'Power Punch'],
    };
  }

  // Fallback by theme
  const themeDefaults = {
    zombie: {
      name: 'Survivor',
      type: 'human',
      subType: 'soldier',
      appearance: 'Ragged survivor with machete',
      abilities: ['Slash', 'Shoot', 'Dodge'],
    },
    space: {
      name: 'Cosmic Drifter',
      type: 'human',
      subType: 'superhero',
      appearance: 'Space suit with jet pack',
      abilities: ['Laser Blast', 'Jet Thrust', 'Shield Bubble'],
    },
    ninja: {
      name: 'Shadow Ninja',
      type: 'human',
      subType: 'ninja',
      appearance: 'Dark ninja suit with katana',
      abilities: ['Wall Jump', 'Shuriken', 'Shadow Dash'],
    },
    military: {
      name: 'Combat Soldier',
      type: 'human',
      subType: 'soldier',
      appearance: 'Tactical gear with rifle',
      abilities: ['Fire Rifle', 'Grenade', 'Roll'],
    },
    fantasy: {
      name: 'Brave Knight',
      type: 'human',
      subType: 'human_male',
      appearance: 'Armored knight with sword and shield',
      abilities: ['Sword Slash', 'Shield Block', 'Charge'],
    },
    pirate: {
      name: 'Sea Corsair',
      type: 'human',
      subType: 'human_male',
      appearance: 'Pirate coat and hat',
      abilities: ['Sword Slash', 'Pistol Shot', 'Grapple'],
    },
    superhero: {
      name: 'Apex Hero',
      type: 'human',
      subType: 'superhero',
      appearance: 'Caped superhero suit',
      abilities: ['Super Punch', 'Shield Blast', 'Flight'],
    },
    racing: {
      name: 'Street Racer',
      type: 'vehicle',
      subType: 'car',
      appearance: 'Sleek race car',
      abilities: ['Nitro Boost', 'Drift', 'Ram'],
    },
  };

  return (
    themeDefaults[theme] || {
      name: 'Dream Explorer',
      type: 'human',
      subType: 'human_male',
      appearance: 'Traveler in casual adventure gear',
      abilities: ['Dash', 'Double Jump', 'Throw'],
    }
  );
}

// ============================================================
// ENEMY DESIGN SYSTEM
// ============================================================

const ENEMY_BANKS = {
  city: [
    { name: 'Gang Member', type: 'patrol', hp: 80, maxHp: 80, damage: 10 },
    { name: 'Police Officer', type: 'chase', hp: 100, maxHp: 100, damage: 15 },
    { name: 'Security Guard', type: 'patrol', hp: 90, maxHp: 90, damage: 12 },
    { name: 'Crime Boss Bodyguard', type: 'chase', hp: 150, maxHp: 150, damage: 20 },
  ],
  zombie: [
    { name: 'Walker', type: 'zombie', hp: 60, maxHp: 60, damage: 10 },
    { name: 'Runner', type: 'chase', hp: 80, maxHp: 80, damage: 15 },
    { name: 'Mutant', type: 'zombie', hp: 120, maxHp: 120, damage: 20 },
    { name: 'Infected Beast', type: 'chase', hp: 150, maxHp: 150, damage: 25 },
  ],
  space: [
    { name: 'Alien Soldier', type: 'patrol', hp: 80, maxHp: 80, damage: 12 },
    { name: 'Attack Drone', type: 'chase', hp: 60, maxHp: 60, damage: 10 },
    { name: 'Mech Robot', type: 'patrol', hp: 130, maxHp: 130, damage: 18 },
    { name: 'Space Hunter', type: 'chase', hp: 100, maxHp: 100, damage: 15 },
  ],
  ninja: [
    { name: 'Shadow Assassin', type: 'chase', hp: 80, maxHp: 80, damage: 15 },
    { name: 'Ronin Guard', type: 'patrol', hp: 100, maxHp: 100, damage: 12 },
    { name: 'Shuriken Scout', type: 'patrol', hp: 60, maxHp: 60, damage: 10 },
    { name: 'Oni Warrior', type: 'chase', hp: 150, maxHp: 150, damage: 22 },
  ],
  military: [
    { name: 'Foot Soldier', type: 'patrol', hp: 100, maxHp: 100, damage: 15 },
    { name: 'Sniper', type: 'patrol', hp: 80, maxHp: 80, damage: 25 },
    { name: 'Tank Trooper', type: 'patrol', hp: 160, maxHp: 160, damage: 20 },
    { name: 'Assault Mech', type: 'chase', hp: 200, maxHp: 200, damage: 30 },
  ],
  fantasy: [
    { name: 'Dark Elf', type: 'patrol', hp: 80, maxHp: 80, damage: 12 },
    { name: 'Wraith', type: 'chase', hp: 70, maxHp: 70, damage: 15 },
    { name: 'Stone Golem', type: 'patrol', hp: 200, maxHp: 200, damage: 20 },
    { name: 'Shadow Knight', type: 'chase', hp: 150, maxHp: 150, damage: 25 },
  ],
  racing: [
    { name: 'Traffic Sedan', type: 'traffic', hp: 80, maxHp: 80, damage: 25 },
    { name: 'Police Patrol Car', type: 'traffic', hp: 100, maxHp: 100, damage: 30 },
    { name: 'Road Blocker Truck', type: 'traffic', hp: 120, maxHp: 120, damage: 35 },
    { name: 'Speed Rival', type: 'traffic', hp: 90, maxHp: 90, damage: 25 },
  ],
  battle_royale: [
    { name: 'Rival Sniper', type: 'patrol', hp: 100, maxHp: 100, damage: 20 },
    { name: 'Assault Trooper', type: 'chase', hp: 120, maxHp: 120, damage: 15 },
    { name: 'Apex Hunter', type: 'chase', hp: 150, maxHp: 150, damage: 18 },
    { name: 'Recon Agent', type: 'patrol', hp: 80, maxHp: 80, damage: 12 },
  ],
  pirate: [
    { name: 'Corsair Sailor', type: 'patrol', hp: 80, maxHp: 80, damage: 10 },
    { name: 'Sea Serpent', type: 'chase', hp: 120, maxHp: 120, damage: 18 },
    { name: 'Cannoneer', type: 'patrol', hp: 90, maxHp: 90, damage: 20 },
    { name: 'Ghost Sailor', type: 'chase', hp: 100, maxHp: 100, damage: 15 },
  ],
  superhero: [
    { name: 'Henchman', type: 'patrol', hp: 80, maxHp: 80, damage: 10 },
    { name: 'Armored Villain', type: 'chase', hp: 130, maxHp: 130, damage: 20 },
    { name: 'Mercenary', type: 'patrol', hp: 90, maxHp: 90, damage: 15 },
    { name: 'Cyborg Agent', type: 'chase', hp: 150, maxHp: 150, damage: 22 },
  ],
  western: [
    { name: 'Outlaw Gunman', type: 'patrol', hp: 80, maxHp: 80, damage: 15 },
    { name: 'Bandit Rider', type: 'chase', hp: 90, maxHp: 90, damage: 12 },
    { name: 'Wanted Renegade', type: 'patrol', hp: 100, maxHp: 100, damage: 18 },
    { name: 'Gang Enforcer', type: 'chase', hp: 120, maxHp: 120, damage: 20 },
  ],
};

function resolveEnemies(theme, genre) {
  if (genre === 'driving' || genre === 'racing' || genre === 'bike_racing') return ENEMY_BANKS.racing;
  if (genre === 'battle_royale') return ENEMY_BANKS.battle_royale;
  if (genre === 'survival') return ENEMY_BANKS.zombie;
  return ENEMY_BANKS[theme] || ENEMY_BANKS.city;
}

// ============================================================
// BOSS DESIGN SYSTEM
// ============================================================

const BOSS_REGISTRY = {
  city: { baseName: 'Street King', specialMove: 'Nitro Storm', abilities: ['Ram Drive', 'Call Reinforcements'] },
  zombie: { baseName: 'Mutant Titan', specialMove: 'Ground Smash', abilities: ['Zombie Summon', 'Toxic Roar'] },
  space: { baseName: 'Cosmic Overlord', specialMove: 'Laser Grid', abilities: ['Black Hole Pull', 'Drone Fleet'] },
  ninja: { baseName: 'Shadow Master', specialMove: 'Shadow Clone Strike', abilities: ['Teleport', 'Shuriken Storm'] },
  military: {
    baseName: 'General Iron',
    specialMove: 'Airstrike Call',
    abilities: ['Grenade Barrage', 'Armored Charge'],
  },
  fantasy: { baseName: 'Lich King', specialMove: 'Soul Drain', abilities: ['Undead Army', 'Death Nova'] },
  pirate: { baseName: "Davy's Wrath", specialMove: 'Cannonball Barrage', abilities: ['Sea Tempest', 'Ghost Crew'] },
  racing: { baseName: 'Apex Predator', specialMove: 'Nitro Overdrive', abilities: ['Ram Blitz', 'Oil Slick Trail'] },
  battle_royale: {
    baseName: 'Warlord X',
    specialMove: 'Minigun Rain',
    abilities: ['Rocket Launcher', 'Airdrop Bombs'],
  },
  superhero: { baseName: 'Crimson Tyrant', specialMove: 'Energy Beam', abilities: ['Gravity Control', 'Minion Army'] },
  western: { baseName: 'The Undertaker', specialMove: 'Rapid Gunfire', abilities: ['Lasso Pull', 'Dynamite Throw'] },
};

function resolveBoss(theme, genre, location, stageNumber) {
  let registry = BOSS_REGISTRY[theme] || BOSS_REGISTRY.city;
  if (genre === 'driving' || genre === 'racing' || genre === 'bike_racing') registry = BOSS_REGISTRY.racing;
  if (genre === 'battle_royale') registry = BOSS_REGISTRY.battle_royale;
  if (genre === 'survival') registry = BOSS_REGISTRY.zombie;

  const suffix = stageNumber > 1 ? ` Mk.${stageNumber}` : '';
  return {
    name: `${registry.baseName}${suffix}`,
    specialMove: registry.specialMove,
    phases: ['Phase 1: HP 200-140', 'Phase 2: HP 139-70', 'Phase 3: HP 69-0'],
    hp: 200,
    maxHp: 200,
    alive: true,
    defeated: false,
  };
}

// ============================================================
// SCORE LABEL RESOLVER
// ============================================================

function resolveScoreLabel(theme, genre) {
  if (genre === 'driving' || genre === 'racing' || genre === 'bike_racing') return 'SPEED';
  if (genre === 'endless_runner') return 'COINS';
  if (theme === 'zombie' || genre === 'survival') return 'KILLS';
  if (theme === 'space') return 'ENERGY';
  if (theme === 'pirate') return 'GOLD';
  if (theme === 'fantasy') return 'MANA';
  if (theme === 'ninja') return 'CHI';
  if (theme === 'military' || genre === 'battle_royale') return 'KILLS';
  if (theme === 'city' || theme === 'racing') return 'CASH';
  return 'SHARDS';
}

// ============================================================
// COLORS BY LOCATION & THEME
// ============================================================

function resolveColors(location, theme, genre) {
  const palettes = {
    Mumbai: {
      bg: '#172554',
      accent: '#f97316',
      secondary: '#facc15',
      hazard: '#dc2626',
      player: '#dc2626',
      text: '#ffffff',
    },
    Tokyo: {
      bg: '#030712',
      accent: '#ec4899',
      secondary: '#06b6d4',
      hazard: '#ef4444',
      player: '#10b981',
      text: '#f3f4f6',
    },
    Dubai: {
      bg: '#451a03',
      accent: '#eab308',
      secondary: '#10b981',
      hazard: '#ea580c',
      player: '#fbbf24',
      text: '#fef08a',
    },
    Hyderabad: {
      bg: '#0f172a',
      accent: '#a855f7',
      secondary: '#06b6d4',
      hazard: '#ef4444',
      player: '#3b82f6',
      text: '#ffffff',
    },
    'New York': {
      bg: '#0f172a',
      accent: '#facc15',
      secondary: '#f97316',
      hazard: '#ef4444',
      player: '#22c55e',
      text: '#ffffff',
    },
    London: {
      bg: '#1a1a2e',
      accent: '#60a5fa',
      secondary: '#a78bfa',
      hazard: '#f43f5e',
      player: '#38bdf8',
      text: '#ffffff',
    },
    Paris: {
      bg: '#1e1b4b',
      accent: '#f9a8d4',
      secondary: '#c4b5fd',
      hazard: '#fb7185',
      player: '#e879f9',
      text: '#ffffff',
    },
    'Deep Space': {
      bg: '#020817',
      accent: '#818cf8',
      secondary: '#06b6d4',
      hazard: '#a855f7',
      player: '#6366f1',
      text: '#e2e8f0',
    },
    'Ocean Realm': {
      bg: '#0c4a6e',
      accent: '#22d3ee',
      secondary: '#34d399',
      hazard: '#f87171',
      player: '#38bdf8',
      text: '#e0f2fe',
    },
    'Jungle Depths': {
      bg: '#052e16',
      accent: '#4ade80',
      secondary: '#facc15',
      hazard: '#ef4444',
      player: '#86efac',
      text: '#dcfce7',
    },
    'Desert Wasteland': {
      bg: '#292524',
      accent: '#fb923c',
      secondary: '#facc15',
      hazard: '#ef4444',
      player: '#fbbf24',
      text: '#fff7ed',
    },
    'Metro City': {
      bg: '#0f172a',
      accent: '#7c3aed',
      secondary: '#06b6d4',
      hazard: '#f43f5e',
      player: '#22c55e',
      text: '#ffffff',
    },
  };

  if (palettes[location]) return palettes[location];

  // Theme-based fallbacks
  const themePalettes = {
    zombie: {
      bg: '#14532d',
      accent: '#4ade80',
      secondary: '#86efac',
      hazard: '#7c3aed',
      player: '#22c55e',
      text: '#f0fdf4',
    },
    ninja: {
      bg: '#030712',
      accent: '#6366f1',
      secondary: '#818cf8',
      hazard: '#f43f5e',
      player: '#4f46e5',
      text: '#e2e8f0',
    },
    space: {
      bg: '#020817',
      accent: '#818cf8',
      secondary: '#06b6d4',
      hazard: '#a855f7',
      player: '#6366f1',
      text: '#e2e8f0',
    },
    pirate: {
      bg: '#1e1b4b',
      accent: '#f59e0b',
      secondary: '#34d399',
      hazard: '#ef4444',
      player: '#d97706',
      text: '#fef3c7',
    },
    military: {
      bg: '#1c1917',
      accent: '#4ade80',
      secondary: '#facc15',
      hazard: '#f43f5e',
      player: '#84cc16',
      text: '#fafaf9',
    },
    fantasy: {
      bg: '#1e1b4b',
      accent: '#c084fc',
      secondary: '#f0abfc',
      hazard: '#f43f5e',
      player: '#a855f7',
      text: '#faf5ff',
    },
    superhero: {
      bg: '#0f172a',
      accent: '#facc15',
      secondary: '#f97316',
      hazard: '#ef4444',
      player: '#eab308',
      text: '#ffffff',
    },
    racing: {
      bg: '#0f172a',
      accent: '#f43f5e',
      secondary: '#facc15',
      hazard: '#7c3aed',
      player: '#e11d48',
      text: '#ffffff',
    },
  };

  return (
    themePalettes[theme] || {
      bg: '#0a0b10',
      accent: '#8b5cf6',
      secondary: '#06b6d4',
      hazard: '#f43f5e',
      player: '#22c55e',
      text: '#ffffff',
    }
  );
}

// ============================================================
// UTILITY
// ============================================================

function capitalizeWords(str) {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.substring(1))
    .join(' ');
}

// ============================================================
// LOCAL DREAM ANALYZER
// ============================================================

function analyzeDreamLocally(title = '', description = '') {
  const text = (title + ' ' + description).toLowerCase();

  const genre = classifyGenre(text);
  const location = extractLocation(text);
  const theme = resolveTheme(text);
  const hero = resolveHero(text, genre, theme);
  const colors = resolveColors(location, theme, genre);
  const scoreLabel = resolveScoreLabel(theme, genre);

  const enemyBank = resolveEnemies(theme, genre);

  const stages = [1, 2, 3].map((stageNumber) => {
    const blocks = [];
    const enemies = [];
    let blockIndex = 1;
    let enemyIndex = 0;

    // -- Stage environment naming --
    const stageEnvironments = {
      1: `${location} — Opening Grounds`,
      2: `${location} — Midfield Assault`,
      3: `${location} — Final Stronghold`,
    };
    const environmentName = stageEnvironments[stageNumber] || `${location} Stage ${stageNumber}`;
    const objectiveNames = {
      driving: `Outrun ${stageNumber * 3} rivals and reach the checkpoint!`,
      bike_racing: `Dodge traffic and complete ${stageNumber} lap circuits.`,
      racing: `Win against ${stageNumber + 2} opponents on the circuit.`,
      endless_runner: `Collect ${stageNumber * 15} coins while dodging hurdles!`,
      battle_royale: `Eliminate all ${stageNumber + 2} rivals and stay inside the zone.`,
      survival: `Survive the zombie horde and clear ${stageNumber * 4} walkers.`,
      shooter: `Neutralise all hostiles and secure the area.`,
      puzzle: `Collect all ${4 + stageNumber * 2} puzzle pieces scattered across platforms!`,
    };
    const objectiveName = objectiveNames[genre] || `Scale the heights and defeat the stage boss!`;
    const compCond = `All enemies defeated and boss destroyed.`;

    // ── DRIVING / RACING / BIKE ──────────────────────────────────────────
    if (genre === 'driving' || genre === 'racing' || genre === 'bike_racing') {
      const lanes = [320, 360, 400];

      for (let rx = 0; rx < 5000; rx += 400) {
        blocks.push({
          id: `b_${stageNumber}_road_${blockIndex++}`,
          x: rx + 200,
          y: 370,
          width: 400,
          height: 90,
          type: 'ground',
        });
      }

      for (let tx = 700; tx < 4400; tx += 420 + stageNumber * 40) {
        const laneY = lanes[enemyIndex % lanes.length];
        const eData = enemyBank[enemyIndex % enemyBank.length];
        enemies.push({
          id: `e_${stageNumber}_${enemyIndex + 1}`,
          name: eData.name,
          x: tx,
          y: laneY,
          hp: eData.hp,
          maxHp: eData.maxHp,
          damage: eData.damage,
          type: eData.type,
          alive: true,
          defeated: false,
        });
        enemyIndex++;
      }

      for (let cx = 500; cx < 4400; cx += 500) {
        blocks.push({
          id: `b_${stageNumber}_fuel_${blockIndex++}`,
          x: cx,
          y: lanes[blockIndex % lanes.length],
          width: 20,
          height: 20,
          type: 'collectible',
        });
      }

      // ── ENDLESS RUNNER ───────────────────────────────────────────────────
    } else if (genre === 'endless_runner') {
      const tracksY = [150, 250, 350];
      tracksY.forEach((ty) => {
        for (let rx = 0; rx < 5000; rx += 500) {
          blocks.push({
            id: `b_${stageNumber}_track_${ty}_${blockIndex++}`,
            x: rx + 250,
            y: ty,
            width: 500,
            height: 10,
            type: 'solid',
          });
        }
      });

      for (let hx = 500; hx < 4400; hx += 350 + stageNumber * 30) {
        const trackY = tracksY[blockIndex % tracksY.length];
        blocks.push({
          id: `b_${stageNumber}_hurdle_${blockIndex++}`,
          x: hx,
          y: trackY - 20,
          width: 30,
          height: 38,
          type: 'hazard',
        });
        blocks.push({
          id: `b_${stageNumber}_coin_${blockIndex++}`,
          x: hx - 140,
          y: trackY - 25,
          width: 20,
          height: 20,
          type: 'collectible',
        });
      }

      // ── BATTLE ROYALE ────────────────────────────────────────────────────
    } else if (genre === 'battle_royale') {
      for (let rx = 0; rx < 5000; rx += 400) {
        blocks.push({
          id: `b_${stageNumber}_ground_${blockIndex++}`,
          x: rx + 200,
          y: 420,
          width: 400,
          height: 30,
          type: 'ground',
        });
      }
      for (let ex = 800; ex < 4400; ex += 580) {
        const eData = enemyBank[enemyIndex % enemyBank.length];
        enemies.push({
          id: `e_${stageNumber}_${enemyIndex + 1}`,
          name: eData.name,
          x: ex,
          y: 390,
          hp: eData.hp,
          maxHp: eData.maxHp,
          damage: eData.damage,
          type: eData.type,
          alive: true,
          defeated: false,
        });
        enemyIndex++;
      }
      for (let lx = 600; lx < 4400; lx += 700) {
        blocks.push({
          id: `b_${stageNumber}_loot_${blockIndex++}`,
          x: lx,
          y: 395,
          width: 30,
          height: 30,
          type: 'collectible',
        });
      }

      // ── SURVIVAL / ZOMBIE ────────────────────────────────────────────────
    } else if (genre === 'survival') {
      for (let rx = 0; rx < 5000; rx += 400) {
        blocks.push({
          id: `b_${stageNumber}_ground_${blockIndex++}`,
          x: rx + 200,
          y: 420,
          width: 400,
          height: 30,
          type: 'ground',
        });
      }
      for (let zx = 500; zx < 4400; zx += 350 + stageNumber * 20) {
        const eData = enemyBank[enemyIndex % enemyBank.length];
        enemies.push({
          id: `e_${stageNumber}_${enemyIndex + 1}`,
          name: eData.name,
          x: zx,
          y: 390,
          hp: eData.hp,
          maxHp: eData.maxHp,
          damage: eData.damage,
          type: eData.type,
          alive: true,
          defeated: false,
        });
        enemyIndex++;
      }
      for (let vx = 700; vx < 4400; vx += 600) {
        blocks.push({
          id: `b_${stageNumber}_medkit_${blockIndex++}`,
          x: vx,
          y: 395,
          width: 20,
          height: 20,
          type: 'collectible',
        });
      }

      // ── PUZZLE ───────────────────────────────────────────────────────────
    } else if (genre === 'puzzle') {
      const platforms = [
        { x: 300, y: 420 },
        { x: 700, y: 380 },
        { x: 1100, y: 340 },
        { x: 1500, y: 300 },
        { x: 1900, y: 360 },
        { x: 2300, y: 320 },
        { x: 2700, y: 380 },
        { x: 3100, y: 340 },
      ];

      platforms.forEach((plat, idx) => {
        blocks.push({
          id: `b_${stageNumber}_p_${blockIndex++}`,
          x: plat.x,
          y: plat.y,
          width: 180,
          height: 24,
          type: 'solid',
        });
        blocks.push({
          id: `b_${stageNumber}_piece_${blockIndex++}`,
          x: plat.x + (idx % 2 === 0 ? 40 : -30),
          y: plat.y - 35,
          width: 22,
          height: 22,
          type: 'puzzle_piece',
        });
      });

      blocks.push({
        id: `b_${stageNumber}_ground_${blockIndex++}`,
        x: 400,
        y: 420,
        width: 320,
        height: 30,
        type: 'ground',
      });

      // ── PLATFORMER / ADVENTURE / RPG ─────────────────────────────────────
    } else {
      let currentX = 0;
      while (currentX < 4800) {
        const isStart = currentX < 350;
        const isEnd = currentX > 4400;

        if (!isStart && !isEnd && Math.random() < 0.12) {
          blocks.push({
            id: `b_${stageNumber}_spike_${blockIndex++}`,
            x: currentX + 64,
            y: 435,
            width: 32,
            height: 32,
            type: 'hazard',
          });
          currentX += 128;
          continue;
        }

        const platWidth = isStart || isEnd ? 420 : 256;
        blocks.push({
          id: `b_${stageNumber}_g_${blockIndex++}`,
          x: currentX + platWidth / 2,
          y: 420,
          width: platWidth,
          height: 30,
          type: 'ground',
        });

        if (!isStart && !isEnd && Math.random() < 0.6) {
          const floatX = currentX + platWidth / 2;
          const floatY = 270 - Math.random() * 70;
          blocks.push({
            id: `b_${stageNumber}_f_${blockIndex++}`,
            x: floatX,
            y: floatY,
            width: 128,
            height: 20,
            type: 'solid',
          });
          blocks.push({
            id: `b_${stageNumber}_coin_${blockIndex++}`,
            x: floatX,
            y: floatY - 25,
            width: 20,
            height: 20,
            type: 'collectible',
          });

          if (Math.random() < 0.45) {
            const eData = enemyBank[enemyIndex % enemyBank.length];
            enemies.push({
              id: `e_${stageNumber}_${enemyIndex + 1}`,
              name: eData.name,
              x: floatX,
              y: floatY - 30,
              hp: eData.hp,
              maxHp: eData.maxHp,
              damage: eData.damage,
              type: eData.type,
              alive: true,
              defeated: false,
            });
            enemyIndex++;
          }
        }

        currentX += platWidth + 64;
      }
    }

    // ── BOSS (unique per theme+stage) ─────────────────────────────────────
    const bossData = resolveBoss(theme, genre, location, stageNumber);
    const boss =
      genre === 'puzzle'
        ? null
        : {
            id: `boss_${stageNumber}`,
            x: 4500,
            y: genre === 'driving' || genre === 'endless_runner' ? 360 : 200,
            ...bossData,
          };

    return {
      stageNumber,
      environment: environmentName,
      objective: objectiveName,
      blocks,
      enemies,
      boss,
      completionCondition: compCond,
    };
  });

  const finalStage = stages[stages.length - 1];

  const rawBlueprint = {
    title: title || `${capitalizeWords(theme)} ${capitalizeWords(genre)} — ${location}`,
    theme: `${capitalizeWords(theme)} in ${location}`,
    genre,
    intent: {
      character: hero.name,
      characterType: hero.type,
      vehicle: hero.type === 'vehicle' ? hero.name : null,
      location,
      weapons: hero.abilities.filter(
        (a) =>
          a.toLowerCase().includes('shoot') ||
          a.toLowerCase().includes('fire') ||
          a.toLowerCase().includes('blast') ||
          a.toLowerCase().includes('gun')
      ),
      actions: hero.abilities,
      scoreLabel,
      subType: hero.subType,
    },
    player: {
      name: hero.name,
      type: hero.type,
      subType: hero.subType,
      appearance: hero.appearance,
      hp: 100,
      maxHp: 100,
      speed: genre === 'driving' || genre === 'racing' || genre === 'bike_racing' ? 250 : 220,
      jumpForce: -350,
      gravity: genre.includes('driving') || genre.includes('racing') || genre.includes('runner') ? 0 : 300,
      colors,
      abilities: hero.abilities,
    },
    stages,
    winCondition:
      genre === 'puzzle'
        ? `Collect all puzzle pieces and clear every stage in ${location}!`
        : `Complete all missions in ${location} and defeat ${finalStage.boss?.name || 'the final boss'}!`,
    loseCondition: `Fail to survive — health reaches zero.`,
  };

  return validateAndNormalizeBlueprint(rawBlueprint, { mood: 'Adventure', difficulty: 'Medium', colors });
}

// ============================================================
// THEMATIC VALIDATION
// ============================================================

function checkThematicValidation(blueprint, promptText) {
  const p = promptText.toLowerCase();
  const genre = (blueprint.genre || '').toLowerCase();
  const location = (blueprint.intent?.location || '').toLowerCase();
  const theme = (blueprint.theme || '').toLowerCase();

  if (p.includes('mumbai') && !location.includes('mumbai') && !theme.includes('mumbai')) {
    throw new Error(
      'Theme Validation Failed: Request specified "Mumbai", but generated blueprint does not place the game in Mumbai.'
    );
  }
  if (p.includes('tokyo') && !location.includes('tokyo') && !theme.includes('tokyo')) {
    throw new Error(
      'Theme Validation Failed: Request specified "Tokyo", but generated blueprint does not place the game in Tokyo.'
    );
  }
  if (p.includes('dubai') && !location.includes('dubai') && !theme.includes('dubai')) {
    throw new Error(
      'Theme Validation Failed: Request specified "Dubai", but generated blueprint does not place the game in Dubai.'
    );
  }
  if (p.includes('ferrari') && !p.includes('platformer')) {
    if (!genre.includes('driving') && !genre.includes('racing')) {
      throw new Error(
        'Theme Validation Failed: Request specified Ferrari but generated game is not a driving/racing genre.'
      );
    }
  }
  if (p.includes('bike') || p.includes('motorcycle')) {
    if (!genre.includes('bike_racing') && !genre.includes('racing')) {
      throw new Error(
        'Theme Validation Failed: Request specified motorcycle/bike but generated game is not a racing genre.'
      );
    }
  }

  // Reject obvious generic placeholders that were not requested
  const allStages = blueprint.stages || [];
  const enemies = allStages.flatMap((s) => (s.enemies || []).map((e) => e.name.toLowerCase()));
  const bosses = allStages.map((s) => (s.boss?.name || '').toLowerCase());
  const generics = ['slime', 'goblin', 'stone platform', 'security defender'];

  for (const item of [...enemies, ...bosses]) {
    for (const gen of generics) {
      if (item.includes(gen) && !p.includes(gen)) {
        throw new Error(`Theme Validation Failed: Found generic placeholder "${item}" which was not requested.`);
      }
    }
  }
}

// ============================================================
// NORMALIZE BLUEPRINT
// ============================================================

function normalizeGenre(genre) {
  const playable = [
    'platformer',
    'driving',
    'bike_racing',
    'racing',
    'endless_runner',
    'shooter',
    'battle_royale',
    'survival',
    'puzzle',
  ];
  const g = String(genre || 'platformer')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (playable.includes(g)) return g;
  if (['open_world', 'rpg', 'adventure', 'simulation', 'sports'].includes(g)) return 'platformer';
  return 'platformer';
}

function validateAndNormalizeBlueprint(rawBlueprint, themeData = {}) {
  if (!rawBlueprint || typeof rawBlueprint !== 'object') {
    throw new Error('Blueprint must be a JSON object.');
  }

  const lang = themeData.lang || 'en';

  const title = localTranslate(rawBlueprint.title || 'Untitled Dream Game', lang);
  const theme = localTranslate(rawBlueprint.theme || 'Dream Realm', lang);
  const genre = normalizeGenre(rawBlueprint.genre || 'platformer');

  const intent = rawBlueprint.intent || {
    character: 'Hero Explorer',
    characterType: 'human',
    vehicle: null,
    location: 'Surreal Void',
    weapons: [],
    actions: ['Dash', 'Double Jump'],
    scoreLabel: 'SHARDS',
    subType: 'human_male',
  };

  intent.character = localTranslate(intent.character, lang);
  intent.location = localTranslate(intent.location, lang);
  if (intent.vehicle) intent.vehicle = localTranslate(intent.vehicle, lang);

  const player = rawBlueprint.player || {};
  const normalizedPlayer = {
    name: localTranslate(player.name || intent.character || 'Explorer', lang),
    type: player.type || intent.characterType || 'human',
    subType: player.subType || intent.subType || 'human_male',
    appearance: localTranslate(player.appearance || 'Standard appearance', lang),
    hp: Number.isFinite(player.hp) ? player.hp : 100,
    maxHp: Number.isFinite(player.maxHp) ? player.maxHp : 100,
    speed: Number.isFinite(player.speed) ? player.speed : 220,
    jumpForce: Number.isFinite(player.jumpForce) ? player.jumpForce : -350,
    gravity: Number.isFinite(player.gravity)
      ? player.gravity
      : genre.includes('driving') || genre.includes('racing') || genre.includes('runner')
        ? 0
        : 300,
    colors: player.colors ||
      themeData.colors || {
        bg: '#0a0b10',
        accent: '#8b5cf6',
        secondary: '#06b6d4',
        hazard: '#f43f5e',
        player: '#22c55e',
        text: '#ffffff',
      },
    abilities:
      Array.isArray(player.abilities) && player.abilities.length
        ? player.abilities
        : intent.actions || ['Dash', 'Double Jump'],
  };

  const stages = Array.isArray(rawBlueprint.stages) ? rawBlueprint.stages : [];
  if (stages.length < 1) throw new Error('Blueprint must contain at least 1 stage.');

  const normalizedStages = stages.map((stage, idx) => {
    const stageNumber = stage.stageNumber || idx + 1;

    const blocks = (Array.isArray(stage.blocks) ? stage.blocks : []).map((b, bidx) => ({
      id: b.id || `b_${stageNumber}_${bidx}`,
      x: Number.isFinite(b.x) ? b.x : 100 + bidx * 150,
      y: Number.isFinite(b.y) ? b.y : 420,
      width: Number.isFinite(b.width) ? b.width : 128,
      height: Number.isFinite(b.height) ? b.height : 20,
      type: b.type || 'ground',
    }));

    const enemies = (Array.isArray(stage.enemies) ? stage.enemies : []).map((e, eidx) => ({
      id: e.id || `e_${stageNumber}_${eidx}`,
      name: localTranslate(e.name || 'Shadow Scout', lang),
      x: Number.isFinite(e.x) ? e.x : 300 + eidx * 400,
      y: Number.isFinite(e.y) ? e.y : 390,
      hp: Number.isFinite(e.hp) ? e.hp : 100,
      maxHp: Number.isFinite(e.maxHp) ? e.maxHp : 100,
      damage: Number.isFinite(e.damage) ? e.damage : 10,
      type: e.type || 'patrol',
      alive: e.alive !== undefined ? e.alive : true,
      defeated: e.defeated !== undefined ? e.defeated : false,
    }));

    const rawBoss = stage.boss || null;
    const boss = rawBoss
      ? {
          id: rawBoss.id || `boss_${stageNumber}`,
          name: localTranslate(rawBoss.name || 'Stage Overlord', lang),
          x: Number.isFinite(rawBoss.x) ? rawBoss.x : 2650,
          y: Number.isFinite(rawBoss.y) ? rawBoss.y : 200,
          hp: 200,
          maxHp: 200,
          phases: ['Phase 1: HP 200-140', 'Phase 2: HP 139-70', 'Phase 3: HP 69-0'],
          alive: rawBoss.alive !== undefined ? rawBoss.alive : true,
          defeated: rawBoss.defeated !== undefined ? rawBoss.defeated : false,
        }
      : null;

    return {
      stageNumber,
      environment: localTranslate(stage.environment || `${intent.location} Stage ${stageNumber}`, lang),
      objective: localTranslate(stage.objective || (boss ? `Survive and defeat ${boss.name}.` : 'Complete the stage objective.'), lang),
      blocks,
      enemies,
      boss,
      completionCondition: localTranslate(stage.completionCondition || 'Defeat the boss and exit.', lang),
    };
  });

  const finalStage = normalizedStages[normalizedStages.length - 1];
  const allEnemyNames = normalizedStages.flatMap((s) => s.enemies.map((e) => e.name));
  const scoreLabel = intent.scoreLabel || resolveScoreLabel(resolveTheme(title + ' ' + theme), genre);

  const translatedPlayerName = normalizedPlayer.name;
  const translatedLocation = intent.location;
  const translatedObjective = finalStage.objective;
  const translatedBossName = finalStage.boss?.name || (genre === 'puzzle' ? 'Puzzle Guardian' : 'Stage Overlord');

  let intro = `You deploy as ${translatedPlayerName}. The battle begins in ${translatedLocation}.`;
  let mission =
    genre === 'puzzle'
      ? `Mission: ${translatedObjective}`
      : `Mission: ${translatedObjective} Defeat the fearsome ${translatedBossName}!`;
  let ending =
    genre === 'puzzle'
      ? `${translatedPlayerName} solved every puzzle in ${translatedLocation}!`
      : `${translatedBossName} falls. ${translatedPlayerName} has conquered ${translatedLocation}!`;

  if (lang === 'hi') {
    intro = `आप ${translatedPlayerName} के रूप में तैनात होते हैं। लड़ाई ${translatedLocation} में शुरू होती है।`;
    mission =
      genre === 'puzzle'
        ? `मिशन: ${translatedObjective}`
        : `मिशन: ${translatedObjective} भयानक ${translatedBossName} को हराएं!`;
    ending =
      genre === 'puzzle'
        ? `${translatedPlayerName} ने ${translatedLocation} में हर पहेली को हल कर दिया!`
        : `${translatedBossName} हार गया। ${translatedPlayerName} ने ${translatedLocation} पर विजय प्राप्त कर ली है!`;
  } else if (lang === 'te') {
    intro = `మీరు ${translatedPlayerName}గా రంగంలోకి దిగారు. యుద్ధం ${translatedLocation}లో ప్రారంభమవుతుంది.`;
    mission =
      genre === 'puzzle'
        ? `లక్ష్యం: ${translatedObjective}`
        : `లక్ష్యం: ${translatedObjective} భయంకరమైన ${translatedBossName}ని ఓడించండి!`;
    ending =
      genre === 'puzzle'
        ? `${translatedPlayerName} ${translatedLocation}లోని ప్రతి పజిల్‌ను పరిష్కరించారు!`
        : `${translatedBossName} ఓడిపోయాడు. ${translatedPlayerName} ${translatedLocation}ను జయించారు!`;
  }

  return {
    title,
    theme,
    genre,
    intent: { ...intent, scoreLabel },
    player: normalizedPlayer,
    stages: normalizedStages,
    winCondition: localTranslate(
      rawBlueprint.winCondition ||
      (genre === 'puzzle'
        ? `Clear all ${normalizedStages.length} puzzle stages.`
        : `Defeat ${finalStage.boss?.name || 'the boss'} and clear all ${normalizedStages.length} stages.`),
      lang
    ),
    loseCondition: localTranslate(rawBlueprint.loseCondition || 'Player health reduces to 0.', lang),

    // UI compatibility
    hero: normalizedPlayer.name,
    world: theme,
    enemies: [...new Set(allEnemyNames)].slice(0, 4),
    boss: finalStage.boss?.name || (genre === 'puzzle' ? 'Puzzle Guardian' : 'Stage Overlord'),
    objective: finalStage.objective,
    powerups: normalizedPlayer.abilities.slice(0, 3),
    mood: themeData.mood || 'Adventure',
    difficulty: themeData.difficulty || 'Medium',
    colors: normalizedPlayer.colors,
    physics: {
      gravity: normalizedPlayer.gravity,
      speed: normalizedPlayer.speed,
      jump: normalizedPlayer.jumpForce,
      bounce: 0.1,
    },
    stories: { intro, mission, ending },
  };
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function analyzeDream(title, description, aiConfig = {}, lang = 'en') {
  // Backwards compat: if a bare string key was passed, wrap it
  if (typeof aiConfig === 'string') {
    aiConfig = { provider: 'openai', apiKey: aiConfig || process.env.OPENAI_API_KEY };
  }
  const { provider = 'openai', apiKey = process.env.OPENAI_API_KEY, model, endpoint } = aiConfig;

  const combinedText = `${title} ${description}`;

  // No key and not a keyless provider (ollama/local) → use local analyzer
  const needsKey = provider === 'openai' || provider === 'anthropic' || provider === 'gemini';
  if (needsKey && !apiKey) {
    console.log(`[AI] No API key for provider '${provider}'. Using local analyzer.`);
    return analyzeDreamLocally(title, description, lang);
  }

  try {
    let systemPrompt = CODEX_GAME_SYSTEM_PROMPT;
    if (lang === 'hi') {
      systemPrompt += '\nIMPORTANT: Generate all user-facing strings (such as "title", "theme", "intent.character", "player.name", "player.appearance", "stages[].environment", "stages[].objective", "stages[].boss.name", "stages[].completionCondition", "winCondition", "loseCondition", and all storylines/descriptions) in Hindi (using Devanagari script). JSON keys and other structural fields must remain exactly in English as defined in the schema.';
    } else if (lang === 'te') {
      systemPrompt += '\nIMPORTANT: Generate all user-facing strings (such as "title", "theme", "intent.character", "player.name", "player.appearance", "stages[].environment", "stages[].objective", "stages[].boss.name", "stages[].completionCondition", "winCondition", "loseCondition", and all storylines/descriptions) in Telugu (using Telugu script). JSON keys and other structural fields must remain exactly in English as defined in the schema.';
    }

    const prompt = `
      User Prompt:
      Dream Title: "${title}"
      Dream Description: "${description}"

      ${BLUEPRINT_SCHEMA_PROMPT}
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    console.log(`[AI] Calling provider: ${provider}, model: ${model || 'default'}`);
    let rawContent = await callAI({ provider, apiKey, model, endpoint }, messages);

    // Strip markdown code fences if present
    if (rawContent.startsWith('```json')) rawContent = rawContent.substring(7);
    if (rawContent.startsWith('```')) rawContent = rawContent.substring(3);
    if (rawContent.endsWith('```')) rawContent = rawContent.substring(0, rawContent.length - 3);

    const parsed = JSON.parse(rawContent.trim());
    checkThematicValidation(parsed, combinedText);

    // Inject dynamic fields the LLM might miss
    const text = combinedText.toLowerCase();
    const genre = classifyGenre(text);
    const theme = resolveTheme(text);
    const hero = resolveHero(text, genre, theme);
    const scoreLabel = resolveScoreLabel(theme, genre);

    if (parsed.player) {
      if (!parsed.player.subType) parsed.player.subType = hero.subType;
      if (!parsed.player.abilities) parsed.player.abilities = hero.abilities;
    }
    if (parsed.intent) {
      parsed.intent.scoreLabel = scoreLabel;
      parsed.intent.subType = hero.subType;
    }

    return validateAndNormalizeBlueprint(parsed, { colors: resolveColors(extractLocation(text), theme, genre), lang });
  } catch (err) {
    console.error(`[AI] Failed to generate dream using provider '${provider}':`, err.message);
    console.log('[AI] Falling back to local dynamic dream analyzer.');
    return analyzeDreamLocally(title, description, lang);
  }
}

// ============================================================
// DREAM FUSION
// ============================================================

async function fuseDreams(dream1, dream2, aiConfig = {}, lang = 'en') {
  // Backwards compat
  if (typeof aiConfig === 'string') {
    aiConfig = { provider: 'openai', apiKey: aiConfig || process.env.OPENAI_API_KEY };
  }
  const { provider = 'openai', apiKey = process.env.OPENAI_API_KEY, model, endpoint } = aiConfig;

  const combinedText = `${dream1.title} ${dream1.description} fused with ${dream2.title} ${dream2.description}`;
  const needsKey = provider === 'openai' || provider === 'anthropic' || provider === 'gemini';

  if (needsKey && !apiKey) {
    const result = analyzeDreamLocally(
      `Fused: ${dream1.title.slice(0, 15)} + ${dream2.title.slice(0, 15)}`,
      combinedText,
      lang
    );
    result.player.name = `${dream1.blueprint.hero} / ${dream2.blueprint.hero} Chimera`;
    result.hero = result.player.name;
    result.theme = `Fused: ${dream1.title} x ${dream2.title}`;
    result.world = result.theme;
    return result;
  }

  try {
    let systemPrompt = CODEX_GAME_SYSTEM_PROMPT;
    if (lang === 'hi') {
      systemPrompt += '\nIMPORTANT: Generate all user-facing strings in Hindi (using Devanagari script). JSON keys and structural fields must remain in English.';
    } else if (lang === 'te') {
      systemPrompt += '\nIMPORTANT: Generate all user-facing strings in Telugu (using Telugu script). JSON keys and structural fields must remain in English.';
    }

    const prompt = `
      Combine the following two dream game blueprints into one single, coherent complete staged game blueprint.
      
      Dream 1 Blueprint: ${JSON.stringify(dream1.blueprint)}
      Dream 2 Blueprint: ${JSON.stringify(dream2.blueprint)}

      ${BLUEPRINT_SCHEMA_PROMPT}
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    console.log(`[AI] Fusing dreams via provider: ${provider}, model: ${model || 'default'}`);
    let rawContent = await callAI({ provider, apiKey, model, endpoint }, messages);

    if (rawContent.startsWith('```json')) rawContent = rawContent.substring(7);
    if (rawContent.startsWith('```')) rawContent = rawContent.substring(3);
    if (rawContent.endsWith('```')) rawContent = rawContent.substring(0, rawContent.length - 3);

    const parsed = JSON.parse(rawContent.trim());
    checkThematicValidation(parsed, combinedText);

    const text = combinedText.toLowerCase();
    const genre = classifyGenre(text);
    const theme = resolveTheme(text);

    return validateAndNormalizeBlueprint(parsed, { colors: resolveColors(extractLocation(text), theme, genre), lang });
  } catch (err) {
    console.error(`[AI] Failed to fuse dreams using provider '${provider}':`, err.message);
    const result = analyzeDreamLocally('Fused Dream', combinedText, lang);
    result.player.name = `${dream1.blueprint.hero} / ${dream2.blueprint.hero} Chimera`;
    result.hero = result.player.name;
    result.theme = `Fused: ${dream1.title} x ${dream2.title}`;
    result.world = result.theme;
    return result;
  }
}

// ============================================================
// TRANSLATION DICTIONARY AND HELPER FOR LOCAL FALLBACK
// ============================================================

const LOCAL_TRANSLATIONS = {
  hi: {
    // hero names
    "Survivor": "सरवाइवर",
    "Cosmic Drifter": "कॉस्मिक ड्रिफ्टर",
    "Shadow Ninja": "शैडो निंजा",
    "Combat Soldier": "कॉम्बैट सोल्जर",
    "Brave Knight": "बहादुर नाइट",
    "Sea Corsair": "समुद्री डाकू",
    "Apex Hero": "एपेक्स हीरो",
    "Street Racer": "स्ट्रीट रेसर",
    "Moto Racer": "मोटो रेसर",
    "Dream Explorer": "स्वप्न खोजी",
    // boss names
    "Street King": "स्ट्रीट किंग",
    "Mutant Titan": "म्यूटेंट टाइटन",
    "Cosmic Overlord": "कॉस्मिक ओवरलॉर्ड",
    "Shadow Master": "शैडो मास्टर",
    "General Iron": "जनरल आयरन",
    "Lich King": "लिच किंग",
    "Davy's Wrath": "डेवी का क्रोध",
    "Apex Predator": "एपेक्स प्रीडेटर",
    "Warlord X": "वारलॉर्ड एक्स",
    "Crimson Tyrant": "क्रिमसन अत्याचारी",
    "The Undertaker": "द अंडरटेकर",
    "Puzzle Guardian": "पहेली संरक्षक",
    "Stage Overlord": "चरण अधिपति",
    // enemy names
    "Gang Member": "गिरोह सदस्य",
    "Police Officer": "पुलिस अधिकारी",
    "Security Guard": "सुरक्षा गार्ड",
    "Crime Boss Bodyguard": "क्राइम बॉस बॉडीगार्ड",
    "Walker": "वॉकर",
    "Runner": "रनर",
    "Mutant": "म्यूटेंट",
    "Infected Beast": "संक्रमित जानवर",
    "Alien Soldier": "एलियन सैनिक",
    "Attack Drone": "हमलावर ड्रोन",
    "Mech Robot": "मेक रोबोट",
    "Space Hunter": "अंतरिक्ष शिकारी",
    "Shadow Assassin": "शैडो हत्यारा",
    "Ronin Guard": "रोनिन गार्ड",
    "Shuriken Scout": "शूरिकेन स्काउट",
    "Oni Warrior": "ओनी योद्धा",
    "Foot Soldier": "पैदल सैनिक",
    "Sniper": "स्नाइपर",
    "Tank Trooper": "टैंक ट्रूपर",
    "Assault Mech": "असॉल्ट मेक",
    "Dark Elf": "डार्क एल्फ",
    "Wraith": "रेथ",
    "Stone Golem": "स्टोन गोलेम",
    "Shadow Knight": "शैडो नाइट",
    "Traffic Sedan": "ट्रैफिक सेडान",
    "Police Patrol Car": "पुलिस गश्ती कार",
    "Road Blocker Truck": "रोड ब्लॉकर ट्रक",
    "Speed Rival": "स्पीड प्रतिद्वंद्वी",
    "Rival Sniper": "प्रतिद्वंद्वी स्नाइपर",
    "Assault Trooper": "असॉल्ट ट्रूपर",
    "Apex Hunter": "एपेक्स शिकारी",
    "Recon Agent": "रेकन एजेंट",
    "Corsair Sailor": "कौसैर नाविक",
    "Sea Serpent": "समुद्री नाग",
    "Cannoneer": "तोपची",
    "Ghost Sailor": "भूतिया नाविक",
    "Henchman": "गुर्गा",
    "Armored Villain": "बख्तरबंद खलनायक",
    "Mercenary": "किराए का सैनिक",
    "Cyborg Agent": "साइबोर्ग एजेंट",
    "Outlaw Gunman": "डाकू बंदूकधारी",
    "Bandit Rider": "डाकू घुड़सवार",
    "Wanted Renegade": "वांछित बागी",
    "Gang Enforcer": "गिरोह लागूकर्ता",
    // environment elements
    "Opening Grounds": "प्रारंभिक मैदान",
    "Midfield Assault": "मिडफील्ड हमला",
    "Final Stronghold": "अंतिम किला",
    "Stage": "चरण",
    // simple texts
    "Complete the stage objective.": "चरण का उद्देश्य पूरा करें।",
    "Defeat the boss and exit.": "बॉस को हराएं और बाहर निकलें।",
    "Player health reduces to 0.": "खिलाड़ी का स्वास्थ्य 0 हो जाता है।",
    // locations
    "Mumbai": "मुंबई",
    "Tokyo": "टोक्यो",
    "Dubai": "दुबई",
    "Hyderabad": "हैदराबाद",
    "New York": "न्यूयॉर्क",
    "London": "लंदन",
    "Paris": "पेरिस",
    "Bangkok": "बैंकॉक",
    "Seoul": "सियोल",
    "Delhi": "दिल्ली",
    "Deep Space": "गहरा अंतरिक्ष",
    "Ocean Realm": "महासागर क्षेत्र",
    "Jungle Depths": "जंगल की गहराई",
    "Desert Wasteland": "रेगिस्तानी बंजर भूमि",
    "Metro City": "मेट्रो शहर",
    "Surreal Void": "अवास्तविक शून्य",
  },
  te: {
    // hero names
    "Survivor": "సర్వైవర్",
    "Cosmic Drifter": "కాస్మిక్ డ్రిఫ్టర్",
    "Shadow Ninja": "షాడో నింజా",
    "Combat Soldier": "కాంబ్యాట్ సోల్జర్",
    "Brave Knight": "ధైర్యవంతుడైన నైట్",
    "Sea Corsair": "సముద్రపు దొంగ",
    "Apex Hero": "అపెక్స్ హీరో",
    "Street Racer": "స్ట్రీట్ రేసర్",
    "Moto Racer": "మోటో రేసర్",
    "Dream Explorer": "కలల అన్వేషకుడు",
    // boss names
    "Street King": "స్ట్రీట్ కింగ్",
    "Mutant Titan": "మ్యుటెంట్ టైటాన్",
    "Cosmic Overlord": "కాస్మిక్ ఓవర్‌లార్డ్",
    "Shadow Master": "షాడో మాస్టర్",
    "General Iron": "జనరల్ ఐరన్",
    "Lich King": "లిచ్ కింగ్",
    "Davy's Wrath": "డేవిస్ రాత్",
    "Apex Predator": "అపెక్స్ ప్రిడేటర్",
    "Warlord X": "వార్లార్డ్ ఎక్స్",
    "Crimson Tyrant": "క్రిమ్సన్ టైరెంట్",
    "The Undertaker": "ది అండర్‌టేకర్",
    "Puzzle Guardian": "పజిల్ గార్డియన్",
    "Stage Overlord": "స్టేజ్ ఓవర్‌లార్డ్",
    // enemy names
    "Gang Member": "గ్యాంగ్ సభ్యుడు",
    "Police Officer": "పోలీస్ అధికారి",
    "Security Guard": "సెక్యూరిటీ గార్డ్",
    "Crime Boss Bodyguard": "క్రైమ్ బాస్ బాడీగార్డ్",
    "Walker": "వాకర్",
    "Runner": "రన్నర్",
    "Mutant": "మ్యుటెంట్",
    "Infected Beast": "ఇన్ఫెక్టెడ్ బీస్ట్",
    "Alien Soldier": "ఏలియన్ సైనికుడు",
    "Attack Drone": "అటాక్ డ్రోన్",
    "Mech Robot": "మెక్ రోబోట్",
    "Space Hunter": "స్పేస్ హంటర్",
    "Shadow Assassin": "షాడో హంతకుడు",
    "Ronin Guard": "రోనిన్ గార్డ్",
    "Shuriken Scout": "షురికెన్ స్కౌట్",
    "Oni Warrior": "ఓని యోధుడు",
    "Foot Soldier": "కాల్బల సైనికుడు",
    "Sniper": "స్నిపర్",
    "Tank Trooper": "ట్యాంక్ ట్రూపర్",
    "Assault Mech": "అసాల్ట్ మెక్",
    "Dark Elf": "డార్క్ ఎల్ఫ్",
    "Wraith": "రైత్",
    "Stone Golem": "స్టోన్ గోలెం",
    "Shadow Knight": "షాడో నైట్",
    "Traffic Sedan": "ట్రాఫిక్ సెడాన్",
    "Police Patrol Car": "పోలీస్ పెట్రోలింగ్ కార్",
    "Road Blocker Truck": "రోడ్ బ్లాకర్ ట్రక్",
    "Speed Rival": "స్పీడ్ రైవల్",
    "Rival Sniper": "రైవల్ స్నిపర్",
    "Assault Trooper": "అసాల్ట్ ట్రూపర్",
    "Apex Hunter": "అపెక్స్ హంటర్",
    "Recon Agent": "రెకాన్ ఏజెంట్",
    "Corsair Sailor": "కోర్సెయిర్ నావికుడు",
    "Sea Serpent": "సీ సెర్పెంట్",
    "Cannoneer": "కానోనియర్",
    "Ghost Sailor": "ఘోస్ట్ నావికుడు",
    "Henchman": "హెంచ్మన్",
    "Armored Villain": "ఆర్మర్డ్ విలన్",
    "Mercenary": "మెర్సెనరీ",
    "Cyborg Agent": "సైబోర్గ్ ఏజెంట్",
    "Outlaw Gunman": "అవుట్‌లా గన్‌మ్యాన్",
    "Bandit Rider": "బాండిట్ రైడర్",
    "Wanted Renegade": "వాంటెడ్ రెనెగేడ్",
    "Gang Enforcer": "గ్యాంగ్ ఎన్‌ఫోర్సర్",
    // environment elements
    "Opening Grounds": "ప్రారంభ మైదానం",
    "Midfield Assault": "మిడ్‌ఫీల్డ్ దాడి",
    "Final Stronghold": "చివరి కోట",
    "Stage": "స్టేజ్",
    // simple texts
    "Complete the stage objective.": "స్టేజ్ లక్ష్యాన్ని పూర్తి చేయండి.",
    "Defeat the boss and exit.": "బాస్‌ను ఓడించి నిష్క్రమించండి.",
    "Player health reduces to 0.": "ఆటగాడి ఆరోగ్యం 0 కి పడిపోతుంది.",
    // locations
    "Mumbai": "ముంబై",
    "Tokyo": "టోక్యో",
    "Dubai": "దుబాయ్",
    "Hyderabad": "హైదరాబాద్",
    "New York": "న్యూయార్క్",
    "London": "లండన్",
    "Paris": "పారిస్",
    "Bangkok": "బ్యాంకాక్",
    "Seoul": "సియోల్",
    "Delhi": "ఢిల్లీ",
    "Deep Space": "అంతరిక్షం",
    "Ocean Realm": "సముద్ర సామ్రాజ్యం",
    "Jungle Depths": "అడవి లోతులు",
    "Desert Wasteland": "ఎడారి భూమి",
    "Metro City": "మెట్రో నగరం",
    "Surreal Void": "శూన్యం",
  }
};

function localTranslate(text, lang) {
  if (!text) return text;
  if (!lang || lang === 'en') return text;
  const dict = LOCAL_TRANSLATIONS[lang];
  if (!dict) return text;
  
  if (dict[text]) return dict[text];

  // Try parsing template-based strings like stage environments: "Mumbai — Opening Grounds"
  if (text.includes(' — ')) {
    const parts = text.split(' — ');
    const translatedParts = parts.map(p => localTranslate(p.trim(), lang));
    return translatedParts.join(' — ');
  }
  if (text.includes(' Stage ')) {
    const parts = text.split(' Stage ');
    const tLoc = localTranslate(parts[0].trim(), lang);
    const tStage = dict["Stage"] || "Stage";
    return `${tLoc} ${tStage} ${parts[1]}`;
  }

  // Try parsing objectives:
  // "Outrun X rivals and reach the checkpoint!"
  let match = text.match(/Outrun (\d+) rivals and reach the checkpoint!/i);
  if (match) {
    const count = match[1];
    return lang === 'hi' 
      ? `${count} प्रतिद्वंद्वियों से आगे निकलें और चेकपॉइंट पर पहुंचें!` 
      : `${count} మంది ప్రత్యర్థులను దాటి చెక్‌పాయింట్‌ను చేరుకోండి!`;
  }
  // "Dodge traffic and complete X lap circuits."
  match = text.match(/Dodge traffic and complete (\d+) lap circuits\./i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `ट्रैफिक से बचें और ${count} लैप सर्किट पूरे करें।`
      : `ట్రాఫిక్ నుండి తప్పించుకుని ${count} ల్యాప్ సర్క్యూట్‌లను పూర్తి చేయండి.`;
  }
  // "Win against X opponents on the circuit."
  match = text.match(/Win against (\d+) opponents on the circuit\./i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `सर्किट पर ${count} विरोधियों के खिलाफ जीतें।`
      : `సర్క్యూట్‌లో ${count} మంది ప్రత్యర్థులపై విజయం సాధించండి.`;
  }
  // "Collect X coins while dodging hurdles!"
  match = text.match(/Collect (\d+) coins while dodging hurdles!/i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `बाधाओं से बचते हुए ${count} सिक्के एकत्र करें!`
      : `అడ్డంకులను తప్పించుకుంటూ ${count} నాణేలను సేకరించండి!`;
  }
  // "Eliminate all X rivals and stay inside the zone."
  match = text.match(/Eliminate all (\d+) rivals and stay inside the zone\./i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `सभी ${count} प्रतिद्वंद्वियों को खत्म करें और ज़ोन के अंदर रहें।`
      : `${count} మంది ప్రత్యర్థులందరినీ నిర్మూలించి జోన్ లోపల ఉండండి.`;
  }
  // "Survive the zombie horde and clear X walkers."
  match = text.match(/Survive the zombie horde and clear (\d+) walkers\./i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `ज़ोंबी झुंड से बचें और ${count} वॉकर साफ़ करें।`
      : `జోంబీ గుంపు నుండి బ్రతికి బయటపడి ${count} వాకర్లను నిర్మూలించండి.`;
  }
  // "Collect all X puzzle pieces scattered across platforms!"
  match = text.match(/Collect all (\d+) puzzle pieces scattered across platforms!/i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `प्लेटफॉर्म पर बिखरे सभी ${count} पहेली टुकड़ों को इकट्ठा करें!`
      : `ప్లాట్‌ఫారమ్‌లపై చెల్లాచెదురుగా ఉన్న అన్ని {{count}} పజిల్ ముక్కలను సేకరించండి!`;
  }
  
  // "Survive and defeat X."
  match = text.match(/Survive and defeat (.+)\./i);
  if (match) {
    const bossName = localTranslate(match[1].trim(), lang);
    return lang === 'hi'
      ? `बचें और ${bossName} को हराएं।`
      : `అలాగే ${bossName} ని ఓడించండి.`;
  }

  // "Clear all X puzzle stages."
  match = text.match(/Clear all (\d+) puzzle stages\./i);
  if (match) {
    const count = match[1];
    return lang === 'hi'
      ? `सभी ${count} पहेली चरणों को पूरा करें।`
      : `అన్ని ${count} పజిల్ స్టేజ్‌లను పూర్తి చేయండి.`;
  }

  // "Defeat X and clear all Y stages."
  match = text.match(/Defeat (.+) and clear all (\d+) stages\./i);
  if (match) {
    const bossName = localTranslate(match[1].trim(), lang);
    const count = match[2];
    return lang === 'hi'
      ? `${bossName} को हराएं और सभी ${count} चरणों को पूरा करें।`
      : `${bossName}ని ఓడించి అన్ని ${count} స్టేజ్‌లను పూర్తి చేయండి.`;
  }

  return text;
}

module.exports = { analyzeDream, fuseDreams };
