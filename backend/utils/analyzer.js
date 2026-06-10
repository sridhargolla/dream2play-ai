const dotenv = require('dotenv');
dotenv.config();

// Standard fallback game configurations based on mood
const MOOD_THEMES = {
  scifi: {
    mood: 'Sci-Fi',
    genre: 'Platformer-Jetpack',
    difficulty: 'Medium',
    colors: { bg: '#030712', accent: '#06b6d4', secondary: '#3b82f6', hazard: '#f43f5e', player: '#22c55e', text: '#ffffff' },
    hero: 'Cyborg Explorer',
    enemies: ['Sentry Drone', 'Laser Bot'],
    boss: 'AI Overlord Prime',
    objective: 'Disable the central core and download the data files.',
    powerups: ['Shield Shield', 'Laser Overcharge'],
    physics: { gravity: 150, speed: 220, jump: -200, bounce: 0.1 }
  },
  horror: {
    mood: 'Horror',
    genre: 'Survive-in-Dark',
    difficulty: 'Hard',
    colors: { bg: '#090505', accent: '#dc2626', secondary: '#450a0a', hazard: '#ef4444', player: '#ffffff', text: '#ef4444' },
    hero: 'Night Survivor',
    enemies: ['Screaming Ghost', 'Skeletal Stalker'],
    boss: 'The Night Terror',
    objective: 'Find the glowing amulets and survive the dark corridors.',
    powerups: ['Flashlight Battery', 'Holy Elixir'],
    physics: { gravity: 450, speed: 140, jump: -280, bounce: 0 }
  },
  fantasy: {
    mood: 'Fantasy',
    genre: 'Spellcaster-Platformer',
    difficulty: 'Medium',
    colors: { bg: '#0f051d', accent: '#a855f7', secondary: '#f59e0b', hazard: '#ec4899', player: '#e9d5ff', text: '#fcd34d' },
    hero: 'Arcane Wizard',
    enemies: ['Corrupted Slime', 'Mischievous Goblin'],
    boss: 'Ancient Dragon Lord',
    objective: 'Reclaim the golden runes and defeat the ancient ruler.',
    powerups: ['Mana Core', 'Triple Spark Spell'],
    physics: { gravity: 250, speed: 180, jump: -380, bounce: 0.1 }
  },
  adventure: {
    mood: 'Adventure',
    genre: 'Retro-Explorer',
    difficulty: 'Easy',
    colors: { bg: '#022c22', accent: '#10b981', secondary: '#f59e0b', hazard: '#ef4444', player: '#10b981', text: '#f3f4f6' },
    hero: 'Jungle Explorer',
    enemies: ['Bouncing Slime', 'Wild Bat'],
    boss: 'Giga Gorilla King',
    objective: 'Collect all gold coins and reach the sacred temple gate.',
    powerups: ['Speed Boots', 'Extra Heart'],
    physics: { gravity: 350, speed: 240, jump: -360, bounce: 0.2 }
  },
  mystery: {
    mood: 'Mystery',
    genre: 'Clue-Finder',
    difficulty: 'Medium',
    colors: { bg: '#0f172a', accent: '#6366f1', secondary: '#64748b', hazard: '#fbbf24', player: '#ffffff', text: '#e2e8f0' },
    hero: 'Private Investigator',
    enemies: ['Shadow Syndicate Henchman', 'Street Trap'],
    boss: 'The Shadow Boss',
    objective: 'Gather clues, avoid security lasers, and expose the syndicate.',
    powerups: ['Scanner Key', 'Smoke Bomb'],
    physics: { gravity: 300, speed: 190, jump: -320, bounce: 0 }
  }
};

/**
 * Perform a keyword-based NLP fallback analysis of the dream.
 */
function analyzeDreamLocally(title = '', description = '') {
  const text = (title + ' ' + description).toLowerCase();
  
  let scoreScifi = (text.match(/space|star|alien|robot|laser|planet|spaceship|galaxy|clone|machine|portal|future|cyber|neon|drone/g) || []).length;
  let scoreHorror = (text.match(/ghost|shadow|scary|dark|blood|killer|monster|zombie|nightmare|scream|dead|graveyard|haunted|death|creepy/g) || []).length;
  let scoreFantasy = (text.match(/magic|wizard|dragon|elf|spell|castle|crystal|fairy|sword|kingdom|goblin|witch|dungeon/g) || []).length;
  let scoreAdventure = (text.match(/forest|jungle|treasure|coin|jump|explore|island|gold|path|animal|run|escape|river|mountain/g) || []).length;
  let scoreMystery = (text.match(/detective|clue|shadow|murder|fog|rain|secret|puzzle|code|key|lock|investigate|syndicate/g) || []).length;

  // Find the highest scoring mood, default to adventure
  let selectedMood = 'adventure';
  let maxScore = Math.max(scoreScifi, scoreHorror, scoreFantasy, scoreAdventure, scoreMystery);
  
  if (maxScore > 0) {
    if (maxScore === scoreScifi) selectedMood = 'scifi';
    else if (maxScore === scoreHorror) selectedMood = 'horror';
    else if (maxScore === scoreFantasy) selectedMood = 'fantasy';
    else if (maxScore === scoreMystery) selectedMood = 'mystery';
    else selectedMood = 'adventure';
  } else {
    // Arbitrary default based on descriptive keywords if overall scores are 0
    if (text.includes('fly') || text.includes('sky')) selectedMood = 'fantasy';
    else if (text.includes('run') || text.includes('chase')) selectedMood = 'adventure';
    else if (text.includes('fight') || text.includes('dark')) selectedMood = 'horror';
  }

  const baseTheme = MOOD_THEMES[selectedMood];
  
  // Customizing parameters using description snippets if possible
  let hero = baseTheme.hero;
  if (text.match(/(?:i was a|i was an|as a|player is a) ([a-z\s]{3,20})(?:dashing|running|flying|in)/)) {
    const match = text.match(/(?:i was a|i was an|as a|player is a) ([a-z\s]{3,20})(?:dashing|running|flying|in)/);
    if (match && match[1]) hero = capitalizeWords(match[1].trim());
  }

  let boss = baseTheme.boss;
  if (text.match(/(?:boss is|boss was|defeated the|fight a) ([a-z\s]{3,20})/)) {
    const match = text.match(/(?:boss is|boss was|defeated the|fight a) ([a-z\s]{3,20})/);
    if (match && match[1]) boss = capitalizeWords(match[1].trim());
  }

  const dreamTitle = title || `Dream of ${baseTheme.mood}`;
  
  // Story Generator
  const stories = generateStories(dreamTitle, hero, baseTheme.enemies[0], boss, baseTheme.objective);

  return {
    hero,
    world: capitalizeWords(selectedMood === 'scifi' ? 'Cyber Station' : selectedMood === 'horror' ? 'Shadow World' : selectedMood === 'fantasy' ? 'Aether Realm' : selectedMood === 'mystery' ? 'Foggy Docks' : 'Green Canopy'),
    enemies: baseTheme.enemies,
    boss,
    objective: baseTheme.objective,
    powerups: baseTheme.powerups,
    mood: baseTheme.mood,
    genre: baseTheme.genre,
    difficulty: baseTheme.difficulty,
    colors: baseTheme.colors,
    physics: baseTheme.physics,
    stories
  };
}

/**
 * Dynamic Story generator based on parsed elements
 */
function generateStories(title, hero, enemy, boss, objective) {
  return {
    intro: `You wake up in a surreal dreamscape. You are the legendary ${hero}, standing at the threshold of a mysterious landscape. The air is thick with tension as echoes of ${enemy} growls reverberate in the distance.`,
    mission: `Your quest is clear: ${objective} Beware, for ${boss} is guarding the core exit and will do everything in its power to stop you.`,
    ending: `With a final surge of power, ${boss} crumbles to dust. The dreamscape begins to shatter into particles of pure light. You open your eyes, returning to the waking world, carrying the high score of a champion.`
  };
}

function capitalizeWords(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
}

/**
 * Main Analyzer function: tries OpenAI first, falls back to local NLP on failure or if key is missing.
 */
async function analyzeDream(title, description, apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    console.log('OpenAI API key missing. Using local rule-based dream analyzer.');
    return analyzeDreamLocally(title, description);
  }

  try {
    const prompt = `
      You are an AI game designer. Analyze the following user dream and convert it into a detailed structured 2D game blueprint.
      
      Dream Title: "${title}"
      Dream Description: "${description}"

      Generate a JSON object matching this schema:
      {
        "hero": "A name for the player's character",
        "world": "A name for the theme/world",
        "enemies": ["Enemy Type 1", "Enemy Type 2"],
        "boss": "Name of the boss character",
        "objective": "A simple instructions of what the player collects/does to trigger the boss fight",
        "powerups": ["Powerup name 1", "Powerup name 2"],
        "mood": "Choose exactly one of: Sci-Fi, Horror, Fantasy, Adventure, Mystery",
        "genre": "Short gameplay description",
        "difficulty": "Easy, Medium, or Hard",
        "colors": {
          "bg": "hex color for background",
          "accent": "hex color for main accent",
          "secondary": "hex color for UI details",
          "hazard": "hex color for spikes/hazards",
          "player": "hex color for the player character",
          "text": "hex color for text labels"
        },
        "physics": {
          "gravity": 300, // Number between 100 (low) and 500 (heavy)
          "speed": 200,   // Player horizontal speed (120 to 250)
          "jump": -350,   // Jump force (-250 to -450)
          "bounce": 0.1   // Bounce level (0 to 0.4)
        },
        "stories": {
          "intro": "Brief 2-sentence background story for the game start",
          "mission": "Brief 1-sentence explanation of what the player must do right now",
          "ending": "Brief 2-sentence victory ending message"
        }
      }

      Ensure you return ONLY a raw JSON string. Do not wrap it in markdown codeblocks.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API responded with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Attempt to parse JSON. Sometimes model returns markdown code block, sanitize it
    let cleanJson = content;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    
    return JSON.parse(cleanJson.trim());
  } catch (err) {
    console.error('Failed to parse dream using OpenAI API:', err.message);
    console.log('Falling back to local rule-based dream analyzer.');
    return analyzeDreamLocally(title, description);
  }
}

/**
 * Fuses two dreams together into one combined gameplay experience.
 */
async function fuseDreams(dream1, dream2, apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    // Local fusion fallback
    const textCombo = `${dream1.title} ${dream1.description} with ${dream2.title} ${dream2.description}`;
    const result = analyzeDreamLocally(`Fused Dream`, textCombo);
    result.hero = `${dream1.blueprint.hero} / ${dream2.blueprint.hero} Hybrid`;
    result.boss = `${dream1.blueprint.boss}-${dream2.blueprint.boss} Chimera`;
    result.world = `${dream1.blueprint.world} x ${dream2.blueprint.world}`;
    result.stories.intro = `An anomaly in the dreaming dimension has collapsed two realities. You stand as the fused ${result.hero}.`;
    result.stories.mission = `Survive the combined forces of ${dream1.blueprint.enemies[0]} and ${dream2.blueprint.enemies[0]} and defeat the fused boss!`;
    return result;
  }

  try {
    const prompt = `
      You are an AI game designer. Combine the following two dream game blueprints into one single, coherent game blueprint.
      
      Dream 1 Blueprint: ${JSON.stringify(dream1.blueprint)}
      Dream 2 Blueprint: ${JSON.stringify(dream2.blueprint)}

      Synthesize them. For example, "Dragon World" + "Zombie Apocalypse" = "Zombie Dragon Survival".
      Provide a hybrid hero, hybrid boss, merged layout, combined enemy types, blended color palettes, average physics numbers, and a hybrid story (intro, mission, ending).
      
      Return a JSON matching the exact same schema structure:
      {
        "hero": "",
        "world": "",
        "enemies": [],
        "boss": "",
        "objective": "",
        "powerups": [],
        "mood": "Choose the dominant mood",
        "genre": "",
        "difficulty": "",
        "colors": { "bg": "", "accent": "", "secondary": "", "hazard": "", "player": "", "text": "" },
        "physics": { "gravity": 300, "speed": 200, "jump": -350, "bounce": 0.1 },
        "stories": { "intro": "", "mission": "", "ending": "" }
      }

      Ensure you return ONLY a raw JSON string. Do not wrap it in markdown codeblocks.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Fusion responded with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    let cleanJson = content;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    
    return JSON.parse(cleanJson.trim());
  } catch (err) {
    console.error('Failed to fuse dreams using OpenAI API:', err.message);
    // Local fusion fallback
    const textCombo = `${dream1.title} ${dream1.description} with ${dream2.title} ${dream2.description}`;
    const result = analyzeDreamLocally(`Fused Dream`, textCombo);
    result.hero = `${dream1.blueprint.hero} / ${dream2.blueprint.hero} Hybrid`;
    result.boss = `${dream1.blueprint.boss}-${dream2.blueprint.boss} Chimera`;
    result.world = `${dream1.blueprint.world} x ${dream2.blueprint.world}`;
    result.stories.intro = `An anomaly in the dreaming dimension has collapsed two realities. You stand as the fused ${result.hero}.`;
    result.stories.mission = `Survive the combined forces of ${dream1.blueprint.enemies[0]} and ${dream2.blueprint.enemies[0]} and defeat the fused boss!`;
    return result;
  }
}

module.exports = {
  analyzeDream,
  fuseDreams
};
