# Feature Specification: Boss Combat Mechanics

## 1. Overview

This specification covers the implementation of Boss combat logic, including health initialization, collision detection, scaling phases of aggressiveness, and defeat sequences.

## 2. Requirements & User Stories

- **Health System**: Boss must spawn with exactly 200 HP.
- **Damage Mechanics**: standard bullet hits must deduct exactly 10 HP. The boss should not be destroyed or hidden when taking damage.
- **Phase Scaling**:
  - Phase 1 (200 - 140 HP): Base rate of movement and firing.
  - Phase 2 (139 - 70 HP): Sinuosoidal fast movement, increased rate of fire.
  - Phase 3 (69 - 0 HP): Maximum speed, hyper rate of fire.
- **Defeat Sequence**: When boss HP drops to 0, play an explosion particle system, disable attacks, destroy the boss sprite, and show a victory overlay.
- **Play Again**: Players must be able to restart the combat via a victory overlay button.

## 3. Architecture & Data Flow

```
[Player Bullet] ---> Overlap Event (PlayScene.js) ---> hitBoss Handler
                                                            |
                                                   Reduce Boss HP by 10
                                                            |
                                                   Check Health Phase
                                                            |
                                                  If HP <= 0 -> Defeat Sequence
```

## 4. Implementation Details

- `frontend/src/game/PlayScene.js`: Implements Phaser overlap triggers, hit handler, boss motion phases, and defeat sequence animations.
- `frontend/src/components/GameCanvas.jsx`: Integrates Phaser game with React parent state and maps scores or completions.
