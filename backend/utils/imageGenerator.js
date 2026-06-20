const fs = require("node:fs");
const path = require("node:path");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Utility to download and save an image from a URL or fetch it directly.
 */
async function downloadAndSaveImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image from ${url}: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(destPath, buffer);
}

/**
 * General purpose image generator with OpenAI DALL-E 3 and Pollinations fallback.
 */
function buildFallbackSvg({ assetType, blueprint, dreamContext = {} }) {
  const heroName = blueprint.hero || "Hero";
  const enemyName = blueprint.enemies?.[0] || "Enemy";
  const bossName = blueprint.boss || "Boss";
  const worldName = blueprint.world || "Dream World";
  const collectibleName = blueprint.powerups?.[0] || "Collectible";
  const colors = blueprint.colors || {};
  const bg = colors.bg || "#0f172a";
  const accent = colors.accent || "#22d3ee";
  const secondary = colors.secondary || "#f59e0b";
  const hazard = colors.hazard || "#f43f5e";
  const player = colors.player || "#ffffff";

  const dreamText = [dreamContext.title, dreamContext.description]
    .filter(Boolean)
    .join(" ");
  const detail = dreamText
    ? `<text x="50%" y="88%" text-anchor="middle" font-size="24" fill="white" opacity="0.85">${dreamText.slice(
        0,
        70,
      )}</text>`
    : "";

  switch (assetType) {
    case "hero":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="48" fill="${bg}"/><circle cx="820" cy="220" r="180" fill="${accent}" opacity="0.24"/><rect x="110" y="620" width="810" height="220" rx="36" fill="${secondary}" opacity="0.2"/><circle cx="520" cy="430" r="170" fill="${player}"/><rect x="360" y="220" width="320" height="220" rx="48" fill="${player}"/><rect x="430" y="120" width="180" height="140" rx="36" fill="${accent}"/><rect x="410" y="500" width="220" height="220" rx="44" fill="${accent}" opacity="0.95"/><circle cx="440" cy="430" r="32" fill="${bg}"/><circle cx="600" cy="430" r="32" fill="${bg}"/><path d="M360 650 L660 650" stroke="${secondary}" stroke-width="18" stroke-linecap="round"/><text x="50%" y="900" text-anchor="middle" font-size="42" fill="white" font-family="Segoe UI, Arial, sans-serif">${heroName}</text>${detail}</svg>`;
    case "enemy":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="48" fill="${bg}"/><circle cx="210" cy="250" r="180" fill="${hazard}" opacity="0.22"/><path d="M260 700 C320 470 720 470 780 700 L760 760 L280 760 Z" fill="${accent}"/><path d="M340 360 C380 250 660 250 700 360 L680 510 L360 510 Z" fill="${secondary}"/><circle cx="430" cy="430" r="36" fill="${player}"/><circle cx="590" cy="430" r="36" fill="${player}"/><path d="M410 620 C490 690 550 690 640 620" stroke="${hazard}" stroke-width="26" stroke-linecap="round"/><text x="50%" y="900" text-anchor="middle" font-size="40" fill="white" font-family="Segoe UI, Arial, sans-serif">${enemyName}</text>${detail}</svg>`;
    case "boss":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1536" viewBox="0 0 1536 1536"><rect width="1536" height="1536" rx="64" fill="${bg}"/><circle cx="1180" cy="280" r="240" fill="${accent}" opacity="0.25"/><rect x="360" y="280" width="800" height="860" rx="90" fill="${hazard}"/><rect x="470" y="190" width="590" height="200" rx="80" fill="${secondary}"/><circle cx="760" cy="560" r="230" fill="${player}"/><circle cx="660" cy="560" r="46" fill="${bg}"/><circle cx="860" cy="560" r="46" fill="${bg}"/><path d="M620 860 C700 940 820 940 900 860" stroke="${bg}" stroke-width="34" stroke-linecap="round"/><text x="50%" y="1320" text-anchor="middle" font-size="56" fill="white" font-family="Segoe UI, Arial, sans-serif">${bossName}</text>${detail}</svg>`;
    case "background":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1152" viewBox="0 0 2048 1152"><rect width="2048" height="1152" fill="${bg}"/><rect x="0" y="700" width="2048" height="452" fill="${secondary}" opacity="0.18"/><circle cx="1660" cy="260" r="180" fill="${accent}" opacity="0.24"/><path d="M0 740 L520 620 L980 720 L1440 580 L2048 690 L2048 1152 L0 1152 Z" fill="${accent}" opacity="0.18"/><rect x="120" y="820" width="280" height="220" rx="24" fill="${player}" opacity="0.14"/><rect x="520" y="780" width="220" height="260" rx="24" fill="${secondary}" opacity="0.22"/><rect x="1500" y="760" width="320" height="260" rx="24" fill="${accent}" opacity="0.18"/><text x="50%" y="1040" text-anchor="middle" font-size="52" fill="white" font-family="Segoe UI, Arial, sans-serif">${worldName}</text>${detail}</svg>`;
    case "collectible":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="48" fill="${bg}"/><circle cx="512" cy="512" r="270" fill="${accent}" opacity="0.2"/><path d="M512 220 L650 410 L512 790 L374 410 Z" fill="${secondary}"/><path d="M512 300 L620 410 L512 688 L404 410 Z" fill="${player}" opacity="0.95"/><text x="50%" y="900" text-anchor="middle" font-size="40" fill="white" font-family="Segoe UI, Arial, sans-serif">${collectibleName}</text>${detail}</svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="48" fill="${bg}"/><circle cx="512" cy="512" r="300" fill="${accent}" opacity="0.2"/><text x="50%" y="530" text-anchor="middle" font-size="48" fill="white" font-family="Segoe UI, Arial, sans-serif">${worldName}</text>${detail}</svg>`;
  }
}

async function writeFallbackSvg(
  destPath,
  { assetType, blueprint, dreamContext },
) {
  const svg = buildFallbackSvg({ assetType, blueprint, dreamContext });
  await fs.promises.writeFile(destPath, svg, "utf8");
}

async function generateAsset({
  prompt,
  apiKey,
  width,
  height,
  destPath,
  assetType,
  blueprint,
  dreamContext,
}) {
  let imageUrl = null;

  if (apiKey) {
    try {
      console.log(`Generating with OpenAI DALL-E 3: "${prompt}"`);
      const response = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data?.[0]?.url) {
          imageUrl = data.data[0].url;
        }
      } else {
        const errText = await response.text();
        console.warn(
          `OpenAI image generation failed (HTTP ${response.status}): ${errText}. Falling back to Pollinations AI.`,
        );
      }
    } catch (err) {
      console.warn(
        `Error in OpenAI generation: ${err.message}. Falling back to Pollinations AI.`,
      );
    }
  }

  // Pollinations AI Fallback (Runs if no API key is set, or if DALL-E 3 request fails)
  if (!imageUrl) {
    console.log(`Generating with Pollinations AI: "${prompt}"`);
    imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt,
    )}?width=${width}&height=${height}&nologo=true`;
  }

  try {
    await downloadAndSaveImage(imageUrl, destPath);
    return destPath;
  } catch (err) {
    console.warn(
      `Remote image generation failed: ${err.message}. Writing a local high-quality SVG fallback.`,
    );
    const fallbackPath = destPath.replace(/\.png$/i, ".svg");
    await writeFallbackSvg(fallbackPath, {
      assetType,
      blueprint,
      dreamContext,
    });
    return fallbackPath;
  }
}

function buildAssetPrompt(assetType, blueprint, dreamContext = {}) {
  const heroName = blueprint.hero || "Hero";
  const enemyName = blueprint.enemies?.[0] || "Monster";
  const bossName = blueprint.boss || "Boss Overlord";
  const worldName = blueprint.world || "Surreal Void";
  const collectibleName = blueprint.powerups?.[0] || "energy crystal";
  const mood = blueprint.mood || "Adventure";
  const dreamText = [dreamContext.title, dreamContext.description]
    .filter(Boolean)
    .join(" ");
  const sceneContext = dreamText ? `Inspired by: ${dreamText}` : "";
  const style =
    "photorealistic, highly detailed, cinematic lighting, realistic textures, natural proportions, high fidelity game art";

  switch (assetType) {
    case "hero":
      return `A realistic game character depicting ${heroName}, ${style}, detailed clothing and anatomy, believable materials, dramatic but grounded lighting, transparent background, 1024x1024, ${sceneContext}`.trim();
    case "enemy":
      return `A realistic enemy or creature called ${enemyName}, ${style}, detailed surfaces, natural motion, cinematic atmosphere, transparent background, 1024x1024, ${sceneContext}`.trim();
    case "boss":
      return `A realistic boss character named ${bossName}, ${style}, large-scale imposing design, high-detail armor or body textures, dramatic environment lighting, transparent background, 1536x1536, ${sceneContext}`.trim();
    case "background":
      return `A realistic wide game background for ${worldName}, ${mood} atmosphere, believable terrain, cinematic lighting, high-detail environment, 2048x1152, ${sceneContext}`.trim();
    case "collectible":
      return `A realistic collectible item called ${collectibleName}, ${style}, polished prop with believable materials, subtle glow, transparent background, 1024x1024, ${sceneContext}`.trim();
    default:
      return `Realistic game asset, ${style}, ${sceneContext}`.trim();
  }
}

/**
 * Generate all 5 realistic assets in parallel for a given blueprint and save them locally.
 */
async function generateAndSaveAssets(
  blueprint,
  dreamId,
  apiKey,
  dreamContext = {},
) {
  const assetSpecs = {
    hero: {
      prompt: buildAssetPrompt("hero", blueprint, dreamContext),
      width: 256,
      height: 256,
      filename: `${dreamId}_hero.png`,
    },
    enemy: {
      prompt: buildAssetPrompt("enemy", blueprint, dreamContext),
      width: 256,
      height: 256,
      filename: `${dreamId}_enemy.png`,
    },
    boss: {
      prompt: buildAssetPrompt("boss", blueprint, dreamContext),
      width: 512,
      height: 512,
      filename: `${dreamId}_boss.png`,
    },
    background: {
      prompt: buildAssetPrompt("background", blueprint, dreamContext),
      width: 1024,
      height: 576,
      filename: `${dreamId}_background.png`,
    },
    collectible: {
      prompt: buildAssetPrompt("collectible", blueprint, dreamContext),
      width: 128,
      height: 128,
      filename: `${dreamId}_collectible.png`,
    },
  };

  // Perform parallel generation of all assets
  const tasks = Object.entries(assetSpecs).map(async ([key, spec]) => {
    const destPath = path.join(UPLOADS_DIR, spec.filename);
    try {
      const generatedPath = await generateAsset({
        prompt: spec.prompt,
        apiKey,
        width: spec.width,
        height: spec.height,
        destPath,
        assetType: key,
        blueprint,
        dreamContext,
      });
      return [key, `/uploads/${path.basename(generatedPath)}`];
    } catch (err) {
      console.error(`Failed to generate asset for ${key}:`, err.message);
      return [key, null]; // fallback to null on failure
    }
  });

  const results = await Promise.all(tasks);
  const assets = {};
  for (const [key, url] of results) {
    if (url) {
      assets[key] = url;
    }
  }

  return assets;
}

module.exports = {
  generateAndSaveAssets,
};
