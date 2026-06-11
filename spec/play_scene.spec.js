import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';

// Setup browser globals using Object.defineProperty to bypass node getter-only restrictions
class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
  }
}

class MockHTMLCanvasElement {}

const mockContext = {
  fillRect: () => {},
  drawImage: () => {},
  getImageData: () => ({
    data: new Uint8ClampedArray(4),
  }),
  putImageData: () => {},
  createPattern: () => ({}),
  createRadialGradient: () => ({
    addColorStop: () => {},
  }),
  createLinearGradient: () => ({
    addColorStop: () => {},
  }),
};

const mockWindow = {
  navigator: {
    userAgent: 'Mozilla/5.0',
    maxTouchPoints: 0,
  },
  document: {
    documentElement: {},
    createElement: () => ({
      getContext: () => mockContext,
      style: {},
    }),
  },
  location: {
    href: 'http://localhost/',
  },
  Image: MockImage,
  HTMLCanvasElement: MockHTMLCanvasElement,
};

Object.defineProperty(global, 'window', {
  value: mockWindow,
  configurable: true,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockWindow.navigator,
  configurable: true,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: mockWindow.document,
  configurable: true,
  writable: true,
});

Object.defineProperty(global, 'Image', {
  value: MockImage,
  configurable: true,
  writable: true,
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: MockHTMLCanvasElement,
  configurable: true,
  writable: true,
});

// Resolve the exact path of PlayScene.js to get its directory context
const playScenePath = require.resolve('../frontend/src/game/PlayScene.js');
const playSceneDir = path.dirname(playScenePath);

// Resolve phaser relative to PlayScene.js's directory and poison the cache
const phaserPath = require.resolve('phaser', { paths: [playSceneDir] });
const mockPhaser = {
  Scene: class MockScene {
    constructor(config) {
      this.config = config;
    }
  },
};
mockPhaser.default = mockPhaser;

require.cache[phaserPath] = {
  id: phaserPath,
  filename: phaserPath,
  loaded: true,
  exports: mockPhaser,
};

// Poison AudioSynth.js path cache directly
const audioSynthPath = require.resolve('../frontend/src/game/AudioSynth.js');
const mockAudioSynth = {
  default: class MockAudioSynth {
    constructor() {}
  },
};
require.cache[audioSynthPath] = {
  id: audioSynthPath,
  filename: audioSynthPath,
  loaded: true,
  exports: mockAudioSynth,
};

describe('Phaser PlayScene Spec', () => {
  let PlayScene;

  beforeAll(async () => {
    // Dynamically import PlayScene now that cache poisoning is successfully established
    const module = await import('../frontend/src/game/PlayScene.js');
    PlayScene = module.default;
  });

  it('should instantiate PlayScene successfully', () => {
    const scene = new PlayScene();
    expect(scene).toBeDefined();
  });

  it('should initialize stages and states on init()', () => {
    const scene = new PlayScene();
    scene.init({
      blueprint: {
        hero: 'Explorer',
        genre: 'platformer',
        stages: [
          {
            stageNumber: 1,
            enemies: [],
            blocks: [],
          },
        ],
      },
    });

    expect(scene.health).toBe(100);
    expect(scene.bossSpawned).toBe(false);
    expect(scene.genre).toBe('platformer');
    expect(scene.stages.length).toBe(1);
  });

  it('should initialize bossHealth and bossMaxHealth to 200 on init()', () => {
    const scene = new PlayScene();
    scene.init({
      blueprint: {
        hero: 'Explorer',
        genre: 'platformer',
        stages: [
          {
            stageNumber: 1,
            enemies: [],
            blocks: [],
          },
        ],
      },
    });

    expect(scene.bossHealth).toBe(200);
    expect(scene.bossMaxHealth).toBe(200);
  });
});
