const { LlmAgent, FunctionTool } = require("@google/adk");

/**
 * generateAssetPrompt - Generates a photorealistic image prompt for a specific game asset type.
 *
 * @param {object} params
 * @param {"hero"|"enemy"|"boss"|"background"|"collectible"|"poster"} params.assetType - The type of game asset.
 * @param {string} params.name - The name or description of the asset.
 * @param {string} params.world - The game world / environment context.
 * @param {string} params.mood - The overall mood or atmosphere of the game.
 * @param {string} [params.dreamContext] - Short summary of the original dream for context.
 */
async function generateAssetPrompt({ assetType, name, world, mood, dreamContext }) {
  const style =
    "photorealistic, highly detailed, cinematic lighting, realistic textures, natural proportions, high fidelity game art";
  const ctx = dreamContext ? `Inspired by: ${dreamContext}` : "";

  const prompts = {
    hero:        `A realistic game character depicting ${name} in ${world}, ${style}, detailed clothing and anatomy, believable materials, dramatic but grounded lighting, transparent background, 1024x1024. ${ctx}`.trim(),
    enemy:       `A realistic enemy or creature called ${name} in ${world}, ${style}, detailed surfaces, natural motion, cinematic ${mood} atmosphere, transparent background, 1024x1024. ${ctx}`.trim(),
    boss:        `A realistic boss character named ${name} in ${world}, ${style}, large-scale imposing design, high-detail armor or body textures, dramatic environment lighting, transparent background, 1536x1536. ${ctx}`.trim(),
    background:  `A realistic wide game background for ${world}, ${mood} atmosphere, believable terrain, cinematic lighting, high-detail environment art, 2048x1152. ${ctx}`.trim(),
    collectible: `A realistic collectible item called ${name} in ${world}, ${style}, polished prop with believable materials, subtle glow, transparent background, 1024x1024. ${ctx}`.trim(),
    poster:      `A cinematic promotional game poster featuring ${name} in ${world} with a ${mood} mood, epic composition, movie-quality render, bold typography space at bottom, 2048x1024. ${ctx}`.trim(),
  };

  return {
    assetType,
    prompt: prompts[assetType] ?? `Realistic game asset for ${assetType}, ${style}. ${ctx}`.trim(),
  };
}

/**
 * getFallbackSvgSpec - Returns color and label metadata needed to render a high-quality SVG
 * fallback visual for a game asset when no image generation API is available.
 *
 * @param {object} params
 * @param {"hero"|"enemy"|"boss"|"background"|"collectible"} params.assetType - The type of game asset.
 * @param {string} params.label - Display label for the asset (e.g. hero name, enemy name).
 * @param {string} params.bgColor - Background hex color, e.g. '#0f172a'.
 * @param {string} params.accentColor - Accent hex color for highlight elements.
 * @param {string} params.secondaryColor - Secondary hex color for secondary shapes.
 * @param {string} params.hazardColor - Hazard/warning hex color.
 * @param {string} params.playerColor - Primary character/object hex color.
 */
async function getFallbackSvgSpec({ assetType, label, bgColor, accentColor, secondaryColor, hazardColor, playerColor }) {
  return {
    assetType,
    label,
    bgColor,
    accentColor,
    secondaryColor,
    hazardColor,
    playerColor,
    svgNote: `Render a fallback SVG for ${assetType} labeled '${label}' using these color tokens.`,
  };
}

const assetGenerationAgent = new LlmAgent({
  name: "asset_generation_agent",
  model: "gemini-1.5-flash",
  description:
    "Generates detailed visual asset prompts for all game assets (hero, enemy, boss, background, collectible, poster) using the game blueprint.",
  tools: [new FunctionTool(generateAssetPrompt), new FunctionTool(getFallbackSvgSpec)],
  instruction: `
You are the Asset Generation Agent for Dream2Play AI. Given the game blueprint (hero name, enemy name, boss name, world/environment, mood, and color palette), generate all visual asset prompts and fallback SVG specs.

Steps:
1. Call "generateAssetPrompt" for each of the 6 asset types: hero, enemy, boss, background, collectible, poster.
2. Call "getFallbackSvgSpec" for each of the 5 non-poster asset types: hero, enemy, boss, background, collectible.
   Use the color values from the blueprint's player.colors field for bgColor, accentColor, secondaryColor, hazardColor, playerColor.

After all tool calls, return a single JSON object (no markdown fences):
{
  "assets": {
    "hero":        { "prompt": "...", "fallback": { "assetType": "hero", "label": "...", "bgColor": "...", "accentColor": "...", "secondaryColor": "...", "hazardColor": "...", "playerColor": "...", "svgNote": "..." } },
    "enemy":       { "prompt": "...", "fallback": { ... } },
    "boss":        { "prompt": "...", "fallback": { ... } },
    "background":  { "prompt": "...", "fallback": { ... } },
    "collectible": { "prompt": "...", "fallback": { ... } },
    "poster":      { "prompt": "..." }
  }
}
`.trim(),
});

module.exports = { assetGenerationAgent };
