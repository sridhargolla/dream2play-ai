import Phaser from 'phaser';
import PlayScene from './PlayScene';

/**
 * Generates the Phaser Game config object dynamically.
 * Callbacks are stored on window so PlayScene.init() can pick them up.
 */
export const createGameConfig = (parentDiv, blueprint, callbacks = {}) => {
  const { labels = {}, onWin, onLose, onBossDefeated, onStageComplete } = callbacks;

  window.__dream2play_data = {
    blueprint,
    labels,
    onWin: onWin || (() => {}),
    onLose: onLose || (() => {}),
    onBossDefeated: onBossDefeated || (() => {}),
    onStageComplete: onStageComplete || (() => {}),
  };

  return {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: parentDiv,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [PlayScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
};
