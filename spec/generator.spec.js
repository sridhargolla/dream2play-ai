import { describe, it, expect } from 'vitest';
import { analyzeDream } from '../backend/utils/analyzer.js';

describe('Dream Game Generator Spec', () => {
  it('should generate a platformer blueprint for a Naruto platformer prompt', async () => {
    const blueprint = await analyzeDream('Naruto platformer', 'A platformer game where Naruto jumps and fights');
    expect(blueprint).toBeDefined();
    expect(blueprint.genre).toBe('platformer');
    expect(blueprint.player).toBeDefined();
    expect(blueprint.stages.length).toBeGreaterThan(0);
  });

  it('should generate a driving blueprint for a car driving prompt', async () => {
    const blueprint = await analyzeDream('car driving in Mumbai', 'Drive a car avoiding police and traffic');
    expect(blueprint).toBeDefined();
    expect(blueprint.genre).toBe('driving');
    expect(blueprint.player.gravity).toBe(0);
  });

  it('should generate an endless runner blueprint for subway runner prompt', async () => {
    const blueprint = await analyzeDream(
      'subway runner in Hyderabad',
      'Subway surfers style running avoiding barriers'
    );
    expect(blueprint).toBeDefined();
    expect(blueprint.genre).toBe('endless_runner');
    expect(blueprint.player.gravity).toBe(0);
  });

  it('should generate a shooter survival blueprint for zombie survival prompt', async () => {
    const blueprint = await analyzeDream('zombie apocalypse survival', 'Survive zombie waves with shotgun');
    expect(blueprint).toBeDefined();
    expect(blueprint.genre).toBe('survival');
  });
});
