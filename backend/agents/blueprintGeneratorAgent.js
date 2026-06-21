const { LlmAgent, FunctionTool } = require("@google/adk");

/**
 * validateGenreRules - Validates physical parameters (gravity, speed, jumpForce)
 * for the chosen game genre to ensure correct physics.
 *
 * @param {object} params
 * @param {"platformer"|"driving"|"bike_racing"|"racing"|"endless_runner"|"shooter"|"battle_royale"|"survival"|"puzzle"} params.genre - The game genre.
 * @param {number} params.gravity - Vertical gravity value.
 * @param {number} params.speed - Player movement speed.
 * @param {number} params.jumpForce - Player jump force (negative = upward).
 */
async function validateGenreRules({ genre, gravity, speed, jumpForce }) {
  const errors = [];
  const warnings = [];

  const isDrivingOrRacing = ["driving", "racing", "bike_racing", "endless_runner"].includes(genre);

  if (isDrivingOrRacing && gravity !== 0) {
    errors.push(
      `For genre '${genre}', gravity MUST be 0 (horizontal scroller). Got: ${gravity}.`
    );
  }
  if (isDrivingOrRacing && jumpForce !== 0) {
    warnings.push(
      `For genre '${genre}', jumpForce should be 0. Got: ${jumpForce}.`
    );
  }
  if (["platformer", "shooter", "battle_royale", "survival"].includes(genre) && gravity === 0) {
    warnings.push(
      `For genre '${genre}', gravity of 0 is unusual. Consider a positive value like 300.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: errors.length === 0
      ? "Physics parameters are valid for the genre."
      : `Found ${errors.length} error(s): ${errors.join(" | ")}`,
  };
}

const blueprintGeneratorAgent = new LlmAgent({
  name: "blueprint_generator_agent",
  model: "gemini-1.5-flash",
  description:
    "Converts analyzed dream data into a full game blueprint containing stages, obstacles, enemies, player settings, and conditions.",
  tools: [new FunctionTool(validateGenreRules)],
  instruction: `
You are the Blueprint Generator Agent for Dream2Play AI. Your job is to convert analyzed dream elements (hero, world, enemy, boss, objective, mood, difficulty) into a detailed, playable staged game blueprint matching our game system rules.

SUPPORTED GENRES:
- platformer, driving, bike_racing, racing, endless_runner, shooter, battle_royale, survival, puzzle

GENRE SPECIFIC BLUEPRINT RULES:
1. Driving / Racing / Bike Racing:
   - gravity = 0. speed = 250.
   - Ground blocks as flat road lanes at y=360, height=80. No gaps or floating platforms.
   - Enemies must have type "traffic" or "chase". Set their x between 500 and 2400, y matching road lanes.
   - Collectibles should be fuel or nitro canisters.
2. Endless Runner:
   - gravity = 0.
   - Render 3 horizontal tracks at y=150, y=250, y=350 with "solid" blocks and "hazard"/"collectible" items.
3. Battle Royale:
   - Include weapon crates as collectibles. Spawns several "patrol" NPCs.
4. Shooter / Zombie Survival:
   - Spawns "zombie" enemies. Weapons and ammo crates as collectibles.

Before finalising the blueprint JSON, call the "validateGenreRules" tool to verify that your physics values are correct.

Output a single valid JSON object matching this schema exactly — no markdown fences:
{
  "title": "string",
  "theme": "string",
  "genre": "string",
  "intent": {
    "character": "string",
    "characterType": "human | vehicle | robot | animal | monster | custom",
    "vehicle": "string | null",
    "location": "string",
    "weapons": ["string"],
    "actions": ["string"]
  },
  "player": {
    "name": "string",
    "type": "string",
    "appearance": "string",
    "hp": 100,
    "maxHp": 100,
    "speed": 220,
    "jumpForce": -350,
    "gravity": 300,
    "colors": {
      "bg": "#hex",
      "accent": "#hex",
      "secondary": "#hex",
      "hazard": "#hex",
      "player": "#hex",
      "text": "#hex"
    }
  },
  "stages": [
    {
      "stageNumber": 1,
      "environment": "string",
      "objective": "string",
      "blocks": [{ "id": "b_1_1", "x": 0, "y": 0, "width": 256, "height": 30, "type": "ground" }],
      "enemies": [{ "id": "e_1_1", "name": "string", "x": 0, "y": 0, "hp": 100, "maxHp": 100, "damage": 10, "type": "patrol", "alive": true, "defeated": false }],
      "boss": { "id": "boss_1", "name": "string", "x": 2600, "y": 200, "hp": 200, "maxHp": 200, "phases": ["string"], "alive": true, "defeated": false },
      "completionCondition": "string"
    }
  ],
  "winCondition": "string",
  "loseCondition": "string"
}
`.trim(),
});

module.exports = { blueprintGeneratorAgent };
