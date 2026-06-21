/**
 * orchestrator.js — Dream2Play AI Agent Pipeline
 *
 * Chains the four ADK agents sequentially:
 *   1. Dream Analysis Agent  → extracts hero/world/enemy/boss/objective/mood/difficulty
 *   2. Blueprint Generator   → builds game blueprint with validated physics
 *   3. Asset Generation      → generates all visual asset prompts
 *   4. Game Generation       → assembles Phaser 3 config
 *
 * Exports: runAgentPipeline(title, description, apiKey)
 */

const dotenv = require("dotenv");
dotenv.config();

const { Runner, InMemorySessionService } = require("@google/adk");

const { dreamAnalysisAgent }    = require("./dreamAnalysisAgent");
const { blueprintGeneratorAgent } = require("./blueprintGeneratorAgent");
const { assetGenerationAgent }  = require("./assetGenerationAgent");
const { gameGenerationAgent }   = require("./gameGenerationAgent");

// Shared in-memory session store for the pipeline run
const sessionService = new InMemorySessionService();

/**
 * Runs a single agent using the ADK Runner and returns the final text response.
 *
 * @param {import("@google/adk").LlmAgent} agent
 * @param {string} userMessage
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} [apiKey]
 * @returns {Promise<string>} The agent's text response
 */
async function runAgent(agent, userMessage, sessionId, userId, apiKey) {
  const appName = "dream2play_app";

  // Configure the runner for this agent
  const runnerConfig = {
    appName,
    agent,
    sessionService,
  };

  // If a Gemini API key is provided, pass it via environment for the SDK to pick up
  if (apiKey) {
    process.env.GOOGLE_API_KEY = apiKey;
    process.env.GOOGLE_GENAI_API_KEY = apiKey;
    process.env.GEMINI_API_KEY = apiKey;
  }

  // Ensure session is created before runAsync
  await sessionService.createSession({
    appName,
    userId,
    sessionId,
  });

  const runner = new Runner(runnerConfig);

  // Collect all events from the async iterator
  const events = [];
  for await (const event of runner.runAsync({
    userId,
    sessionId,
    newMessage: {
      role: "user",
      parts: [{ text: userMessage }],
    },
  })) {
    events.push(event);
  }

  // Extract the final model response text
  const finalEvent = events.reverse().find(
    (e) => e.content?.parts?.length && e.content.parts[0].text
  );
  return finalEvent?.content?.parts?.[0]?.text ?? "";
}

/**
 * Parse a JSON response, stripping markdown fences if present.
 */
function parseJSON(raw) {
  let text = raw.trim();
  if (text.startsWith("```json")) text = text.slice(7);
  if (text.startsWith("```"))     text = text.slice(3);
  if (text.endsWith("```"))       text = text.slice(0, -3);
  return JSON.parse(text.trim());
}

/**
 * Run the full Dream2Play AI agent pipeline.
 *
 * @param {string} title         - Dream title from the user
 * @param {string} description   - Dream description from the user
 * @param {string} [apiKey]      - Google/Gemini API key (falls back to GOOGLE_API_KEY env var)
 * @returns {Promise<Object>}    - Final assembled game configuration
 */
async function runAgentPipeline(title, description, apiKey) {
  const userId    = "dream2play_user";
  const sessionId = `session_${Date.now()}`;
  const key       = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

  console.log("[ADK Pipeline] Starting multi-agent pipeline...");
  console.log(`  Dream: "${title}" — "${description.slice(0, 60)}..."`);

  // ─── Step 1: Dream Analysis ──────────────────────────────────────────────────
  console.log("[ADK Pipeline] Step 1: Dream Analysis Agent");
  const analysisPrompt = `
Dream Title: "${title}"
Dream Description: "${description}"
Analyze this dream and extract the structured game elements.
`.trim();

  const analysisRaw = await runAgent(
    dreamAnalysisAgent,
    analysisPrompt,
    `${sessionId}_analysis`,
    userId,
    key
  );
  const dreamData = parseJSON(analysisRaw);
  console.log("[ADK Pipeline] Step 1 ✓ — Extracted:", JSON.stringify(dreamData, null, 2));

  // ─── Step 2: Blueprint Generation ────────────────────────────────────────────
  console.log("[ADK Pipeline] Step 2: Blueprint Generator Agent");
  const blueprintPrompt = `
Dream Elements:
${JSON.stringify(dreamData, null, 2)}

Original Dream Title: "${title}"
Original Dream Description: "${description}"

Generate a complete, staged game blueprint from the above dream elements. Validate physics with the validate_genre_rules tool before finalizing.
`.trim();

  const blueprintRaw = await runAgent(
    blueprintGeneratorAgent,
    blueprintPrompt,
    `${sessionId}_blueprint`,
    userId,
    key
  );
  const blueprint = parseJSON(blueprintRaw);
  console.log("[ADK Pipeline] Step 2 ✓ — Blueprint genre:", blueprint.genre, "| stages:", blueprint.stages?.length);

  // ─── Step 3: Asset Generation ─────────────────────────────────────────────────
  console.log("[ADK Pipeline] Step 3: Asset Generation Agent");
  const assetPrompt = `
Game Blueprint:
${JSON.stringify({
    title:    blueprint.title,
    hero:     blueprint.player?.name,
    enemy:    blueprint.stages?.[0]?.enemies?.[0]?.name ?? "Unknown Enemy",
    boss:     blueprint.stages?.[blueprint.stages.length - 1]?.boss?.name ?? "Unknown Boss",
    world:    blueprint.theme,
    mood:     dreamData.mood,
    colors:   blueprint.player?.colors,
  }, null, 2)}

Dream Context: "${title} — ${description.slice(0, 80)}"

Generate photorealistic image prompts and fallback SVG specs for all asset types.
`.trim();

  const assetRaw = await runAgent(
    assetGenerationAgent,
    assetPrompt,
    `${sessionId}_assets`,
    userId,
    key
  );
  const assetData = parseJSON(assetRaw);
  console.log("[ADK Pipeline] Step 3 ✓ — Asset keys:", Object.keys(assetData.assets ?? {}));

  // ─── Step 4: Game Configuration Assembly ─────────────────────────────────────
  console.log("[ADK Pipeline] Step 4: Game Generation Agent");
  const gamePrompt = `
Blueprint:
${JSON.stringify(blueprint, null, 2)}

Asset Prompts:
${JSON.stringify(assetData, null, 2)}

Difficulty: ${dreamData.difficulty}

Scale difficulty and build the Phaser config, then assemble the final gameConfig JSON.
`.trim();

  const gameRaw = await runAgent(
    gameGenerationAgent,
    gamePrompt,
    `${sessionId}_game`,
    userId,
    key
  );
  const gameConfig = parseJSON(gameRaw);
  console.log("[ADK Pipeline] Step 4 ✓ — Game config assembled:", gameConfig.gameConfig?.title);

  // ─── Final Output ─────────────────────────────────────────────────────────────
  return {
    dreamData,
    blueprint,
    assetData,
    gameConfig,
  };
}

module.exports = { runAgentPipeline };
