import Phaser from 'phaser';
import PlayScene from './PlayScene';

/**
 * Generates the Phaser Game config object dynamically.
 * We store blueprint/callbacks on the global window so PlayScene.init() can pick them up.
 */
export const createGameConfig = (parentDiv, blueprint, onWin, onLose) => {
  // Store data globally so PlayScene can access it via init data from autoStart
  window.__dream2play_data = { blueprint, onWin, onLose };

  return {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: parentDiv,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [PlayScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };
};
