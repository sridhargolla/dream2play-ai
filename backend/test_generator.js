const { analyzeDream } = require("./utils/analyzer");
const assert = require("node:assert");

const testPrompts = [
  // Platformer/Adventure
  {
    title: "Naruto Ninja platformer",
    description:
      "A fast-paced shinobi game where you control Naruto jumping across Leaf village roofs and fighting rogue ninjas.",
    expectedGenre: "platformer",
    expectedLocation: "Surreal Void",
  },
  // Shooter/Survival
  {
    title: "Space shooter against alien empires",
    description:
      "Blast alien spaceships using laser cannons and weapon upgrades inside Hangar 9.",
    expectedGenre: "shooter",
    expectedLocation: "Deep Space",
  },
  // Adventure
  {
    title: "Pirate treasure adventure",
    description:
      "Explore caverns, find treasure maps, swing on vines, and reclaim gold chests in Dead Man's Cove.",
    expectedGenre: "platformer",
    expectedLocation: "Surreal Void",
  },
  // Survival
  {
    title: "Zombie survival horror",
    description:
      "Survive the apocalypse in an infected hospital, shooting ghouls with shotguns and collecting vaccines.",
    expectedGenre: "survival",
    expectedLocation: "Surreal Void",
  },
  // Driving
  {
    title: "Ferrari Mumbai Traffic",
    description:
      "A man driving a red Ferrari through Mumbai traffic escaping police.",
    expectedGenre: "driving",
    expectedLocation: "Mumbai",
  },
  // Bike Racing
  {
    title: "Tokyo Bike Race",
    description:
      "A bike race through Tokyo at night dodging corporate speed vehicles.",
    expectedGenre: "bike_racing",
    expectedLocation: "Tokyo",
  },
  // Battle Royale
  {
    title: "Dubai Battle Royale",
    description:
      "Free Fire style battle royale in Dubai, looting weapons and surviving the shrinking wall.",
    expectedGenre: "battle_royale",
    expectedLocation: "Dubai",
  },
  // Endless Runner
  {
    title: "Subway Surfers in Hyderabad",
    description:
      "Endless runner in Hyderabad, switching lanes and jumping hurdles while collecting gold coins.",
    expectedGenre: "endless_runner",
    expectedLocation: "Hyderabad",
  },
  // Open World
  {
    title: "Spider-Man in New York",
    description:
      "Spider-Man swinging through New York doing missions and helping NPCs.",
    expectedGenre: "platformer",
    expectedLocation: "New York",
  },
];

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING UNIVERSAL GENRE BLUEPRINT VERIFICATION");
  console.log("==========================================\n");

  const blueprints = [];

  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(
      `[TEST ${i + 1}/${testPrompts.length}] Generating: "${prompt.title}"...`,
    );

    const blueprint = await analyzeDream(
      prompt.title,
      prompt.description,
      null,
    );

    console.log(` -> Title: "${blueprint.title}"`);
    console.log(
      ` -> Genre Classified: "${blueprint.genre}" (Expected: "${prompt.expectedGenre}")`,
    );
    console.log(
      ` -> Location: "${blueprint.intent.location}" (Expected: "${prompt.expectedLocation}")`,
    );
    console.log(` -> Player Name: "${blueprint.player.name}"`);
    console.log(` -> Gravity: ${blueprint.player.gravity}`);
    console.log(` -> BG Color: "${blueprint.player.colors.bg}"`);
    console.log(
      ` -> Stage 1 Environment: "${blueprint.stages[0].environment}"`,
    );
    console.log(
      ` -> Stage 1 Blocks Count: ${blueprint.stages[0].blocks.length}`,
    );
    console.log(
      ` -> Stage 1 Enemies Count: ${blueprint.stages[0].enemies.length}`,
    );
    if (blueprint.stages[0].enemies.length > 0) {
      console.log(
        `    - First Enemy Type: "${blueprint.stages[0].enemies[0].type}"`,
      );
    }
    console.log("------------------------------------------");

    // Core Assertions
    assert.strictEqual(
      blueprint.genre,
      prompt.expectedGenre,
      `Genre mismatch: expected ${prompt.expectedGenre}, got ${blueprint.genre}`,
    );
    assert.strictEqual(
      blueprint.intent.location,
      prompt.expectedLocation,
      `Location mismatch: expected ${prompt.expectedLocation}, got ${blueprint.intent.location}`,
    );

    // Check physics scaling by genre
    if (
      blueprint.genre.includes("driving") ||
      blueprint.genre.includes("racing") ||
      blueprint.genre.includes("runner")
    ) {
      assert.strictEqual(
        blueprint.player.gravity,
        0,
        "Gravity must be 0 for runner/racing genres",
      );
    } else {
      assert(
        blueprint.player.gravity > 0,
        "Gravity must be positive for standard platformer/survival genres",
      );
    }

    // Verify stage blocks have correct structures based on genre
    blueprint.stages.forEach((stage) => {
      if (
        blueprint.genre.includes("driving") ||
        blueprint.genre.includes("racing")
      ) {
        const roadBlocks = stage.blocks.filter((b) => b.type === "ground");
        assert(
          roadBlocks.length > 0,
          "Driving game must have ground road blocks",
        );
        const trafficEnemies = stage.enemies.filter(
          (e) => e.type === "traffic",
        );
        assert(
          trafficEnemies.length > 0,
          "Driving game must have traffic obstacles",
        );
      }
      if (blueprint.genre === "endless_runner") {
        const tracks = stage.blocks.filter((b) => b.type === "solid");
        assert(tracks.length > 0, "Endless runner must have track blocks");
      }
    });

    blueprints.push(blueprint);
  }

  console.log("\n==========================================");
  console.log("VERIFYING BLUEPRINT DIFFERENTIATION");
  console.log("==========================================");

  // Assert that two different prompts generate different colors and characters
  const bMumbai = blueprints.find((b) => b.intent.location === "Mumbai");
  const bTokyo = blueprints.find((b) => b.intent.location === "Tokyo");
  const bDubai = blueprints.find((b) => b.intent.location === "Dubai");

  assert(
    bMumbai.player.colors.bg !== bTokyo.player.colors.bg,
    "Mumbai and Tokyo should have different backgrounds",
  );
  assert(
    bTokyo.player.colors.bg !== bDubai.player.colors.bg,
    "Tokyo and Dubai should have different backgrounds",
  );

  console.log(" - Colors variation: PASS");
  console.log(" - Structural layout verification: PASS");

  console.log("\n==========================================");
  console.log("ALL UNIVERSAL GENERATOR TESTS PASSED!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("\nTEST RUN ENCOUNTERED AN ERROR:");
  console.error(err);
  process.exit(1);
});
