const { LlmAgent, FunctionTool } = require("@google/adk");

/**
 * scaleDifficulty - Scales enemy HP, count per wave, and movement speed based on
 * the game difficulty level.
 *
 * @param {object} params
 * @param {"Easy"|"Medium"|"Hard"} params.difficulty - The game difficulty level.
 * @param {number} params.baseEnemyHp - Base HP for a standard enemy.
 * @param {number} params.baseEnemyCount - Starting number of enemies per wave.
 * @param {number} params.baseSpeed - Base movement speed of enemies.
 */
async function scaleDifficulty({ difficulty, baseEnemyHp, baseEnemyCount, baseSpeed }) {
  const multipliers = {
    Easy:   { hp: 0.75, count: 0.75, speed: 0.8  },
    Medium: { hp: 1.0,  count: 1.0,  speed: 1.0  },
    Hard:   { hp: 1.5,  count: 1.5,  speed: 1.3  },
  };
  const m = multipliers[difficulty] ?? multipliers.Medium;
  return {
    difficulty,
    scaledEnemyHp:    Math.round(baseEnemyHp    * m.hp),
    scaledEnemyCount: Math.round(baseEnemyCount * m.count),
    scaledSpeed:      Math.round(baseSpeed       * m.speed),
  };
}

/**
 * buildPhaserSceneConfig - Produces a Phaser 3 compatible scene configuration object
 * (physics, camera, world bounds) from the blueprint physics parameters.
 *
 * @param {object} params
 * @param {string} params.genre - Game genre string.
 * @param {number} params.gravity - Vertical gravity value.
 * @param {number} params.playerSpeed - Player movement speed.
 * @param {number} params.playerJumpForce - Player jump force (negative = upward).
 * @param {number} [params.worldWidth] - Total world width in pixels (default 3200).
 * @param {number} [params.worldHeight] - Total world height in pixels (default 600).
 * @param {string} params.bgColor - Background hex color.
 */
async function buildPhaserSceneConfig({
  genre,
  gravity,
  playerSpeed,
  playerJumpForce,
  worldWidth = 3200,
  worldHeight = 600,
  bgColor,
}) {
  return {
    type: "Phaser.AUTO",
    backgroundColor: bgColor,
    physics: {
      default: "arcade",
      arcade: { gravity: { y: gravity }, debug: false },
    },
    camera: {
      setBounds: { x: 0, y: 0, width: worldWidth, height: worldHeight },
      startFollow: "player",
    },
    worldBounds: { x: 0, y: 0, width: worldWidth, height: worldHeight },
    scale: {
      mode: "Phaser.Scale.RESIZE",
      autoCenter: "Phaser.Scale.CENTER_BOTH",
    },
    genre,
    playerDefaults: {
      speed: playerSpeed,
      jumpForce: playerJumpForce,
    },
  };
}

const gameGenerationAgent = new LlmAgent({
  name: "game_generation_agent",
  model: "gemini-1.5-flash",
  description:
    "Assembles the final Phaser 3 game configuration from the blueprint, asset prompts, physics parameters, and difficulty scaling.",
  tools: [new FunctionTool(scaleDifficulty), new FunctionTool(buildPhaserSceneConfig)],
  instruction: `
You are the Game Generation Agent for Dream2Play AI. Assemble all outputs from previous agents into a final Phaser 3-compatible game configuration object.

Steps:
1. Call "scaleDifficulty" with the blueprint's difficulty (Easy/Medium/Hard), baseEnemyHp=100, baseEnemyCount=5, baseSpeed=120.
2. Call "buildPhaserSceneConfig" using:
   - genre: blueprint.genre
   - gravity: blueprint.player.gravity
   - playerSpeed: blueprint.player.speed
   - playerJumpForce: blueprint.player.jumpForce
   - bgColor: blueprint.player.colors.bg

Then output a single valid JSON object (no markdown fences) with this shape:
{
  "gameConfig": {
    "title": "<blueprint.title>",
    "genre": "<blueprint.genre>",
    "theme": "<blueprint.theme>",
    "player": { "<full player object from blueprint>" },
    "stages": [ "<all stages from blueprint>" ],
    "winCondition": "<blueprint.winCondition>",
    "loseCondition": "<blueprint.loseCondition>",
    "scaledDifficulty": {
      "difficulty": "...",
      "scaledEnemyHp": 0,
      "scaledEnemyCount": 0,
      "scaledSpeed": 0
    },
    "phaserConfig": { "<result from buildPhaserSceneConfig>" },
    "assetPrompts": { "<full assets object from asset generation agent>" }
  }
}
`.trim(),
});

module.exports = { gameGenerationAgent };
