/**
 * runAgents.js — Local test script for the Dream2Play AI agent pipeline
 *
 * Usage:
 *   GOOGLE_API_KEY=<your_key> node backend/agents/runAgents.js
 *
 * Or set GOOGLE_API_KEY in backend/.env and run:
 *   node backend/agents/runAgents.js
 */

const dotenv = require("dotenv");
const path   = require("node:path");

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { runAgentPipeline } = require("./orchestrator");

// ── Sample dream for testing ──────────────────────────────────────────────────
const TEST_TITLE       = "Ninja in a Neon Tokyo";
const TEST_DESCRIPTION =
  "I was a shadow ninja leaping across neon-lit Tokyo rooftops at night. " +
  "Cyber-soldiers chased me, and at the end a giant mech-samurai waited. " +
  "My mission was to steal the ancient scroll before dawn.";

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    console.warn(
      "[runAgents] WARNING: No GOOGLE_API_KEY found in environment. " +
      "The agents require a valid Gemini API key to function. " +
      "Set GOOGLE_API_KEY in backend/.env or as an environment variable."
    );
  }

  try {
    console.log("=".repeat(60));
    console.log("  Dream2Play AI — ADK Agent Pipeline Test");
    console.log("=".repeat(60));
    console.log();

    const result = await runAgentPipeline(TEST_TITLE, TEST_DESCRIPTION, apiKey);

    console.log();
    console.log("=".repeat(60));
    console.log("  PIPELINE COMPLETE — Final Output Summary");
    console.log("=".repeat(60));
    console.log();

    // ── 1. Dream Analysis ──────────────────────────────────────────────────────
    console.log("── 1. Dream Analysis ──");
    console.log(JSON.stringify(result.dreamData, null, 2));
    console.log();

    // ── 2. Blueprint ───────────────────────────────────────────────────────────
    console.log("── 2. Blueprint ──");
    console.log(`   Title  : ${result.blueprint.title}`);
    console.log(`   Genre  : ${result.blueprint.genre}`);
    console.log(`   Stages : ${result.blueprint.stages?.length ?? 0}`);
    console.log(`   Hero   : ${result.blueprint.player?.name}`);
    console.log();

    // ── 3. Asset Prompts ───────────────────────────────────────────────────────
    console.log("── 3. Asset Prompts ──");
    const assets = result.assetData?.assets ?? {};
    for (const [type, data] of Object.entries(assets)) {
      console.log(`   ${type.padEnd(12)}: ${data.prompt?.slice(0, 80)}...`);
    }
    console.log();

    // ── 4. Game Config ─────────────────────────────────────────────────────────
    console.log("── 4. Game Config ──");
    const gc = result.gameConfig?.gameConfig;
    if (gc) {
      console.log(`   Title    : ${gc.title}`);
      console.log(`   Genre    : ${gc.genre}`);
      console.log(`   Difficulty (scaled):`);
      console.log(`     EnemyHP    : ${gc.scaledDifficulty?.scaledEnemyHp}`);
      console.log(`     EnemyCount : ${gc.scaledDifficulty?.scaledEnemyCount}`);
      console.log(`     Speed      : ${gc.scaledDifficulty?.scaledSpeed}`);
      console.log(`   Phaser gravity : ${gc.phaserConfig?.physics?.arcade?.gravity?.y}`);
    } else {
      console.log("   (raw):", JSON.stringify(result.gameConfig, null, 2).slice(0, 400));
    }
    console.log();
    console.log("=".repeat(60));
    console.log("  ADK Agent Pipeline test completed successfully.");
    console.log("=".repeat(60));

  } catch (err) {
    console.error("[runAgents] PIPELINE ERROR:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
