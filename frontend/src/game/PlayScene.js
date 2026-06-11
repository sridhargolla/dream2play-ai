import Phaser from 'phaser';
import AudioSynth from './AudioSynth';

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  init(data) {
    const source = data && data.blueprint ? data : window.__dream2play_data || {};

    const rawBlueprint = source.blueprint || {
      hero: 'Explorer',
      world: 'Surreal Void',
      genre: 'platformer',
      enemies: ['Dream Shadow'],
      boss: 'Nightmare Core',
      objective: 'Collect energy shards',
      powerups: ['Speed surge'],
      mood: 'Adventure',
      difficulty: 'Medium',
      colors: {
        bg: '#0a0b10',
        accent: '#8b5cf6',
        secondary: '#06b6d4',
        hazard: '#f43f5e',
        player: '#22c55e',
        text: '#ffffff',
      },
      physics: { gravity: 300, speed: 200, jump: -350, bounce: 0.1 },
      stories: { intro: 'Welcome to the dream.', mission: 'Collect shards.', ending: 'You won!' },
    };

    // Deep clone blueprint to prevent state leakage on deaths / restarts
    this.blueprint = JSON.parse(JSON.stringify(rawBlueprint));

    this.stages = Array.isArray(this.blueprint.stages) && this.blueprint.stages.length ? this.blueprint.stages : [];

    this.currentStageIndex = 0;
    this.genre = (this.blueprint.genre || 'platformer').toLowerCase();

    // Game states
    this.score = 0;
    this.health = 100;
    this.bossHealth = 200;
    this.bossMaxHealth = 200;
    this.bossSpawned = false;
    this.bossActive = false;
    this.bossLastHurt = 0; // invincibility frame timer
    this._bossDefeating = false; // prevent double-trigger of defeatBoss
    this.gameOverTriggered = false;
    this.stageCompleteTriggered = false;
    this._fallingKillScheduled = false; // debounce gap-fall damage

    // Endless runner track index (0, 1, 2)
    this.currentTrack = 1;

    // Battle royale storm tracker
    this.stormX = 0;

    // Timer
    this.startTime = Date.now();
    this.completionTime = 0;

    // React callbacks
    this.onWin = source.onWin || (() => {});
    this.onLose = source.onLose || (() => {});
    this.onBossDefeated = source.onBossDefeated || (() => {});
    this.onStageComplete = source.onStageComplete || (() => {});
    this.labels = {
      victory: 'Victory',
      levelCompleted: 'Level Completed',
      bossDefeated: 'Boss Defeated',
      finalScore: 'Final Score',
      playAgain: 'Play Again',
      bossAppeared: 'Boss Appeared',
      boss: 'Boss',
      enemies: 'Enemies',
      health: 'Health',
      score: 'Score',
      goal: 'Goal',
      loading: 'Loading',
      ...source.labels,
    };

    this.ensureStagesFromBlueprint();
    this.puzzlePiecesTotal = 0;
    this.puzzlePiecesCollected = 0;
    this.bossDamageLockUntil = 0;
  }

  ensureStagesFromBlueprint() {
    if (Array.isArray(this.blueprint.stages) && this.blueprint.stages.length > 0) {
      this.stages = this.blueprint.stages;
      return;
    }

    this.stages = [
      {
        stageNumber: 1,
        environment: this.blueprint.world || 'Dream Realm',
        objective: this.blueprint.objective || 'Complete the dream mission.',
        blocks: [
          { id: 'b_fallback_1', x: 400, y: 420, width: 256, height: 30, type: 'ground' },
          { id: 'b_fallback_2', x: 900, y: 380, width: 180, height: 30, type: 'solid' },
          { id: 'b_fallback_3', x: 1400, y: 340, width: 180, height: 30, type: 'solid' },
          { id: 'c_fallback_1', x: 700, y: 350, width: 24, height: 24, type: 'collectible' },
          { id: 'c_fallback_2', x: 1200, y: 310, width: 24, height: 24, type: 'collectible' },
        ],
        enemies: (this.blueprint.enemies || ['Shadow']).slice(0, 3).map((name, idx) => ({
          id: `e_fallback_${idx + 1}`,
          name: typeof name === 'string' ? name : 'Shadow',
          x: 800 + idx * 450,
          y: 390,
          hp: 100,
          maxHp: 100,
          damage: 10,
          type: 'patrol',
          alive: true,
          defeated: false,
        })),
        boss: {
          id: 'boss_fallback',
          name: this.blueprint.boss || 'Nightmare Core',
          x: 2600,
          y: 200,
          hp: 200,
          maxHp: 200,
          phases: ['Phase 1', 'Phase 2', 'Phase 3'],
          alive: true,
          defeated: false,
        },
        completionCondition: 'Defeat the boss.',
      },
    ];
    this.blueprint.stages = this.stages;
  }

  getCurrentStage() {
    return this.stages[this.currentStageIndex] || this.stages[0];
  }

  getCurrentBossName() {
    return this.getCurrentStage()?.boss?.name || this.blueprint.boss || 'Overlord';
  }

  getCurrentObjective() {
    return this.getCurrentStage()?.objective || this.blueprint.objective || 'Complete the level.';
  }

  getStageRequiredScore() {
    return 30 + this.currentStageIndex * 20;
  }

  preload() {
    const assets = this.blueprint.assets;
    if (assets) {
      if (assets.hero) this.load.image('player_tex', assets.hero);
      if (assets.enemy) this.load.image('enemy_tex', assets.enemy);
      if (assets.boss) this.load.image('boss_tex', assets.boss);
      if (assets.collectible) this.load.image('collect_tex', assets.collectible);
      if (assets.background) this.load.image('background_tex', assets.background);
    }

    this.generateTextures();
  }

  create() {
    AudioSynth.playBGM(this.blueprint.mood || 'Adventure');

    const width = this.scale.width;
    const height = this.scale.height;

    // Extend world bounds horizontally for progression, disabling bottom boundary collision
    this.physics.world.setBounds(0, 0, 99999, height, true, true, true, false);
    this.cameras.main.setBounds(0, 0, 99999, height);

    if (this.textures.exists('background_tex')) {
      const bg = this.add.tileSprite(0, 0, 99999, height, 'background_tex');
      bg.setOrigin(0, 0);
      bg.setScrollFactor(0.2);
      bg.setScale(height / bg.height);
    } else {
      this.cameras.main.setBackgroundColor(this.blueprint.colors?.bg || '#0a0b10');
      this.createBackgroundElements(height);
    }

    // Groups
    this.platforms = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.bossProjectiles = this.physics.add.group();

    // Determine gravity by genre
    const isNoGravityGenre =
      this.genre.includes('driving') || this.genre.includes('racing') || this.genre.includes('runner');
    const pGrav = isNoGravityGenre
      ? 0
      : this.blueprint.player?.gravity !== undefined
        ? this.blueprint.player.gravity
        : 300;
    const pBounce = this.blueprint.physics?.bounce !== undefined ? this.blueprint.physics.bounce : 0.1;

    // Spawn Player
    const playerStartY = this.genre.includes('runner')
      ? 250
      : this.genre.includes('driving') || this.genre.includes('racing')
        ? 360
        : height - 150;
    this.player = this.physics.add.sprite(100, playerStartY, 'player_tex');
    this.player.setDisplaySize(32, 32);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(pBounce);
    this.player.setGravityY(pGrav);

    this.canDoubleJump = this.blueprint.mood === 'Fantasy' || this.blueprint.mood === 'Adventure';
    this.jumpCount = 0;

    // Create road background if racing/driving
    if (this.genre.includes('driving') || this.genre.includes('racing')) {
      this.createRoadTexture();
    }

    // Load platforms/hazards/collectibles/enemies from blueprint coordinates
    this.generateLevel(width, height);

    // Colliders
    this.physics.add.collider(this.player, this.platforms, () => {
      this.jumpCount = 0;
    });
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitHazard, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.bossProjectiles, this.hitPlayerProjectile, null, this);

    this.physics.add.overlap(this.projectiles, this.enemies, this.shootEnemy, null, this);
    this.physics.add.overlap(this.projectiles, this.platforms, this.destroyProjectile, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.lastFired = 0;
    this.lastDash = 0;
    this.lastShield = 0;
    this.lastTriple = 0;
    this.shieldActive = false;
    this._shieldGraphic = null;

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -150, 50);

    // Battle Royale Storm Overlay
    if (this.genre === 'battle_royale') {
      this.stormX = 0;
      this.stormWall = this.add
        .rectangle(0, height / 2, 10, height, 0xef4444, 0.35)
        .setScrollFactor(1)
        .setDepth(15);
      this.physics.add.existing(this.stormWall, true);
    }

    this.createUI(width);

    if (this.genre === 'puzzle') {
      this.objectiveText.setText(`PUZZLE: Collect all ${this.puzzlePiecesTotal || '?'} pieces`);
      this.showFloatingBanner('PUZZLE MODE — Collect every glowing piece!', '#a78bfa', 1800);
    }
  }

  update(time) {
    if (this.gameOverTriggered || this.stageCompleteTriggered) return;

    // Track shield graphic to follow player
    if (this.shieldActive && this._shieldGraphic) {
      this._shieldGraphic.setPosition(this.player.x, this.player.y);
      if (this._shieldGraphicBorder) this._shieldGraphicBorder.setPosition(this.player.x, this.player.y);
    }

    // Update power bar cooldowns
    this.updatePowerBar(time);

    const currentX = this.player.x;

    // --- GENRE MECHANICS CONTROLLER ---
    if (this.genre.includes('driving') || this.genre.includes('racing')) {
      this.player.setGravityY(0);
      this.player.body.setAllowGravity(false);

      const speed = this.blueprint.player?.speed || 250;

      if (this.cursors.up.isDown) {
        this.player.setVelocityX(speed);
      } else if (this.cursors.down.isDown) {
        this.player.setVelocityX(-speed * 0.5);
      } else {
        this.player.setVelocityX(this.player.body.velocity.x * 0.96);
      }

      if (this.cursors.left.isDown) {
        this.player.y = Math.max(320, this.player.y - 5);
      } else if (this.cursors.right.isDown) {
        this.player.y = Math.min(400, this.player.y + 5);
      }
    } else if (this.genre === 'endless_runner') {
      this.player.setGravityY(0);
      this.player.body.setAllowGravity(false);

      this.player.setVelocityX(200);

      const isUpJustPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.left);
      const isDownJustPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.right);

      if (isUpJustPressed) {
        this.currentTrack = Math.max(0, this.currentTrack - 1);
        AudioSynth.playSFX('jump');
      } else if (isDownJustPressed) {
        this.currentTrack = Math.min(2, this.currentTrack + 1);
        AudioSynth.playSFX('jump');
      }

      const tracksY = [150, 250, 350];
      const targetY = tracksY[this.currentTrack];

      this.player.y += (targetY - this.player.y) * 0.25;
    } else {
      const speed = this.blueprint.player?.speed || 220;
      const jumpForce = this.blueprint.player?.jumpForce || -350;

      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
      } else {
        this.player.setVelocityX(0);
      }

      const isUpJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
      if (isUpJustPressed) {
        if (this.player.body.touching.down) {
          this.player.setVelocityY(jumpForce);
          AudioSynth.playSFX('jump');
          this.jumpCount = 1;
        } else if (this.canDoubleJump && this.jumpCount < 2) {
          this.player.setVelocityY(jumpForce * 0.9);
          AudioSynth.playSFX('jump');
          this.jumpCount = 2;
          this.createSpark(this.player.x, this.player.y, '#ffffff');
        }
      }
    }

    // Shrinking zone (Battle Royale)
    if (this.genre === 'battle_royale') {
      this.stormX += 0.8;
      if (this.stormWall) {
        this.stormWall.x = this.stormX;
        this.stormWall.width = 10;
      }
      if (this.player.x < this.stormX) {
        this.damagePlayer(0.35);
      }
    }

    // Shoot weapon — SPACE
    if (this.keySpace.isDown && time > this.lastFired) {
      this.fireWeapon(time);
    }
    // Dash — Q
    if (Phaser.Input.Keyboard.JustDown(this.keyQ) && time > this.lastDash) {
      this.doDash(time);
    }
    // Shield — E
    if (Phaser.Input.Keyboard.JustDown(this.keyE) && time > this.lastShield) {
      this.doShield(time);
    }
    // Triple Shot — R
    if (Phaser.Input.Keyboard.JustDown(this.keyR) && time > this.lastTriple) {
      this.doTripleShot(time);
    }

    // Spawn Boss based on blueprint coordinates trigger
    const stage = this.getCurrentStage();
    if (stage.boss && !stage.boss.defeated && !this.bossSpawned && this.genre !== 'puzzle') {
      const triggerX = (stage.boss.x || 2500) - 500;
      if (this.player.x >= triggerX) {
        this.spawnBoss();
      }
    }

    // Boss loop
    if (this.bossActive && this.boss) {
      const phase = this.bossHealth <= 69 ? 3 : this.bossHealth <= 139 ? 2 : 1;
      const waveSpeed = phase === 3 ? 220 : phase === 2 ? 300 : 400;
      const waveHeight = phase === 3 ? 140 : phase === 2 ? 120 : 90;
      const chaseDistance = phase === 3 ? 320 : phase === 2 ? 390 : 450;
      const fireChance = phase === 3 ? 0.045 : phase === 2 ? 0.032 : 0.018;

      this.boss.y = 200 + Math.sin(time / waveSpeed) * waveHeight;
      const cam = this.cameras.main;
      const minBossX = cam.scrollX + 120;
      const maxBossX = cam.scrollX + cam.width - 120;
      const desiredBossX = this.player.x + chaseDistance;
      this.boss.x = Phaser.Math.Clamp(desiredBossX, minBossX, maxBossX);

      if (Math.random() < fireChance) {
        this.fireBossLaser();
      }
    }

    // Patrol/Chase enemies — move + fall-into-gap elimination
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;

      // ── Gap Fall Kill ──────────────────────────────────────────────────
      if (enemy.y > this.scale.height + 80) {
        const enemyState = enemy.getData('stateObject');
        if (enemyState) {
          enemyState.hp = 0;
          enemyState.alive = false;
          enemyState.defeated = true;
        }
        this.score += 20;
        this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);
        this.createSpark(enemy.x, this.scale.height - 20, '#ef4444');
        enemy.destroy();
        this.updateObjectivesHUD();
        this.checkStageCompletion();
        return;
      }

      const type = enemy.getData('type');

      if (type === 'zombie' || type === 'chase') {
        // Chase: follow player horizontally
        const dir = this.player.x - enemy.x;
        enemy.setVelocityX(Math.sign(dir) * 75);
      } else if (type === 'traffic') {
        enemy.setVelocityX(-120);
      } else {
        // Patrol: reverse on wall collision
        if (enemy.body.blocked.left || enemy.body.blocked.right) {
          enemy.setVelocityX(enemy.body.velocity.x * -1);
        }

        // ── Platform Edge Detection (stop before falling into gaps) ─────
        // Cast a small downward look-ahead 20px ahead in the direction of movement
        if (enemy.body.touching.down || enemy.body.blocked.down) {
          const lookAheadX = enemy.x + Math.sign(enemy.body.velocity.x) * 20;
          const lookAheadY = enemy.y + 20;
          let groundAhead = false;
          this.platforms.getChildren().forEach((platform) => {
            const pb = platform.getBounds();
            if (
              lookAheadX >= pb.left &&
              lookAheadX <= pb.right &&
              lookAheadY >= pb.top - 5 &&
              lookAheadY <= pb.bottom + 5
            ) {
              groundAhead = true;
            }
          });
          if (!groundAhead) {
            enemy.setVelocityX(enemy.body.velocity.x * -1);
          }
        }
      }
    });

    // ── Player gap-fall kill ───────────────────────────────────────────────
    if (this.player.y > this.scale.height + 20 && !this._fallingKillScheduled) {
      this._fallingKillScheduled = true;
      this.damagePlayer(100);
    }
    if (this.player.y <= this.scale.height) {
      this._fallingKillScheduled = false;
    }
  }

  // --- SPRITE GENERATORS (10-type Dynamic Atlas) ---
  generateTextures() {
    const gc = this.add.graphics();
    const colors = this.blueprint.colors || {
      bg: '#0a0b10',
      accent: '#8b5cf6',
      secondary: '#06b6d4',
      hazard: '#f43f5e',
      player: '#22c55e',
      text: '#ffffff',
    };
    const pColor = Phaser.Display.Color.HexStringToColor(colors.player).color;
    const aColor = Phaser.Display.Color.HexStringToColor(colors.accent).color;
    const hColor = Phaser.Display.Color.HexStringToColor(colors.hazard).color;
    const sColor = Phaser.Display.Color.HexStringToColor(colors.secondary).color;

    const subType = (this.blueprint.player?.subType || this.blueprint.intent?.subType || '').toLowerCase();

    if (!this.textures.exists('player_tex')) {
      gc.clear();

      if (subType === 'car' || this.genre.includes('driving') || this.genre.includes('racing')) {
        // ── TOP-DOWN CAR ──
        gc.fillStyle(pColor);
        gc.fillRect(4, 8, 44, 18); // body
        gc.fillStyle(0x222222);
        gc.fillRect(6, 4, 9, 5); // FL wheel
        gc.fillRect(37, 4, 9, 5); // FR wheel
        gc.fillRect(6, 23, 9, 5); // RL wheel
        gc.fillRect(37, 23, 9, 5); // RR wheel
        gc.fillStyle(aColor);
        gc.fillRect(22, 10, 12, 10); // windshield
        gc.fillStyle(0xfff9c4, 0.9);
        gc.fillCircle(6, 17, 3); // headlight L
        gc.fillCircle(46, 17, 3); // headlight R
        gc.generateTexture('player_tex', 52, 34);
      } else if (subType === 'motorcycle') {
        // ── SIDE-VIEW MOTORCYCLE ──
        gc.fillStyle(pColor);
        gc.fillRect(10, 10, 30, 8); // frame
        gc.fillStyle(0x111111);
        gc.fillCircle(8, 22, 7); // rear wheel
        gc.fillCircle(42, 22, 7); // front wheel
        gc.fillStyle(aColor);
        gc.fillRect(16, 4, 14, 8); // fairing
        gc.fillStyle(0xffffff, 0.7);
        gc.fillCircle(42, 22, 3); // front hub
        gc.fillCircle(8, 22, 3); // rear hub
        gc.generateTexture('player_tex', 52, 34);
      } else if (subType === 'aircraft') {
        // ── FIGHTER JET ──
        gc.fillStyle(pColor);
        gc.fillTriangle(26, 0, 52, 20, 0, 20); // nose
        gc.fillRect(10, 12, 32, 10); // fuselage
        gc.fillStyle(aColor);
        gc.fillTriangle(8, 14, 0, 28, 20, 22); // left wing
        gc.fillTriangle(44, 14, 52, 28, 32, 22); // right wing
        gc.fillStyle(hColor, 0.9);
        gc.fillRect(20, 18, 12, 4); // cockpit
        gc.generateTexture('player_tex', 52, 34);
      } else if (subType === 'spacecraft') {
        // ── SPACECRAFT ──
        gc.fillStyle(pColor);
        gc.fillCircle(26, 17, 14); // hull
        gc.fillStyle(aColor);
        gc.fillRect(14, 26, 24, 6); // engine
        gc.fillStyle(sColor, 0.9);
        gc.fillCircle(26, 15, 6); // cockpit dome
        gc.fillStyle(hColor, 0.7);
        gc.fillRect(2, 19, 8, 4); // left fin
        gc.fillRect(42, 19, 8, 4); // right fin
        gc.generateTexture('player_tex', 52, 34);
      } else if (subType === 'ninja') {
        // ── HOODED NINJA ──
        gc.fillStyle(0x1a1a2e);
        gc.fillRect(6, 4, 20, 28); // dark body
        gc.fillStyle(0x111111);
        gc.fillRect(8, 4, 16, 10); // hood
        gc.fillStyle(pColor);
        gc.fillRect(10, 12, 12, 4); // mask slit
        gc.fillStyle(aColor);
        gc.fillRect(2, 16, 4, 18); // katana blade
        gc.fillStyle(0x8b4513);
        gc.fillRect(4, 14, 2, 4); // katana handle
        gc.generateTexture('player_tex', 32, 34);
      } else if (subType === 'soldier') {
        // ── MILITARY SOLDIER ──
        gc.fillStyle(0x4b5563);
        gc.fillRect(6, 4, 20, 28); // uniform
        gc.fillStyle(0x374151);
        gc.fillRect(8, 2, 16, 10); // helmet
        gc.fillStyle(0xfbbf24, 0.5);
        gc.fillRect(10, 6, 12, 4); // visor
        gc.fillStyle(0x6b7280);
        gc.fillRect(24, 14, 14, 4); // rifle barrel
        gc.fillRect(22, 14, 4, 10); // rifle body
        gc.fillStyle(pColor);
        gc.fillRect(10, 12, 4, 4); // left eye
        gc.generateTexture('player_tex', 40, 34);
      } else if (subType === 'superhero') {
        // ── CAPED SUPERHERO ──
        gc.fillStyle(pColor);
        gc.fillRect(5, 6, 22, 26); // body
        gc.fillStyle(aColor);
        gc.fillRect(7, 6, 18, 8); // chest emblem
        gc.fillStyle(pColor);
        gc.fillCircle(16, 6, 7); // head
        gc.fillStyle(hColor, 0.85);
        gc.fillTriangle(0, 10, 6, 6, 6, 24); // cape L
        gc.fillTriangle(26, 6, 32, 10, 26, 24); // cape R
        gc.fillStyle(0xfde68a);
        gc.fillRect(11, 4, 4, 6); // mask
        gc.generateTexture('player_tex', 36, 34);
      } else if (subType === 'human_female') {
        // ── HUMAN FEMALE ──
        gc.fillStyle(pColor);
        gc.fillRect(7, 6, 18, 26); // body
        gc.fillStyle(0xfbbf24);
        gc.fillCircle(16, 6, 7); // head
        gc.fillStyle(aColor);
        gc.fillRect(7, 12, 18, 8); // outfit accent
        gc.fillStyle(0xfde68a);
        gc.fillRect(10, 2, 12, 8); // hair
        gc.fillStyle(0x000000);
        gc.fillRect(12, 6, 3, 3); // eye L
        gc.fillRect(17, 6, 3, 3); // eye R
        gc.generateTexture('player_tex', 32, 34);
      } else {
        // ── DEFAULT: HUMAN MALE ──
        gc.fillStyle(pColor);
        gc.fillRect(6, 6, 20, 26); // body
        gc.fillStyle(0xfbbf24);
        gc.fillCircle(16, 6, 7); // head
        gc.fillStyle(aColor);
        gc.fillRect(8, 14, 16, 8); // shirt accent
        gc.fillStyle(0x000000);
        gc.fillRect(11, 4, 3, 4); // eye L
        gc.fillRect(18, 4, 3, 4); // eye R
        gc.fillStyle(0x374151);
        gc.fillRect(6, 30, 9, 4); // leg L
        gc.fillRect(17, 30, 9, 4); // leg R
        gc.generateTexture('player_tex', 32, 36);
      }
    }

    // ── ENEMY SPRITES (adapt to genre theme) ──
    if (!this.textures.exists('enemy_tex')) {
      gc.clear();
      if (this.genre.includes('driving') || this.genre.includes('racing') || this.genre.includes('bike')) {
        // Traffic / Police Car
        gc.fillStyle(hColor);
        gc.fillRect(2, 8, 44, 18); // enemy car body
        gc.fillStyle(0x111111);
        gc.fillRect(5, 4, 8, 5); // wheel FL
        gc.fillRect(36, 4, 8, 5); // wheel FR
        gc.fillRect(5, 23, 8, 5); // wheel RL
        gc.fillRect(36, 23, 8, 5); // wheel RR
        gc.fillStyle(0xfff9c4, 0.8);
        gc.fillCircle(46, 17, 3); // headlight
        gc.fillStyle(0xff0000, 0.9);
        gc.fillRect(2, 12, 5, 6); // tail light
        gc.generateTexture('enemy_tex', 52, 34);
      } else if (this.genre === 'survival') {
        // Zombie
        gc.fillStyle(0x4d7c0f);
        gc.fillRect(5, 6, 22, 26); // body (greenish)
        gc.fillStyle(0x65a30d, 0.8);
        gc.fillCircle(16, 6, 7); // head
        gc.fillStyle(0xff0000);
        gc.fillRect(10, 4, 4, 3); // zombie eye L
        gc.fillRect(18, 4, 4, 3); // zombie eye R
        gc.fillStyle(hColor, 0.7);
        gc.fillRect(4, 20, 6, 14); // arm reaching out
        gc.fillStyle(0x4d7c0f, 0.8);
        gc.fillRect(8, 30, 8, 4); // leg L
        gc.fillRect(17, 30, 8, 4); // leg R
        gc.generateTexture('enemy_tex', 32, 36);
      } else if (this.genre === 'battle_royale' || this.genre === 'shooter') {
        // Armed Rival
        gc.fillStyle(0x78350f);
        gc.fillRect(6, 6, 20, 26); // camo uniform
        gc.fillStyle(0x57534e);
        gc.fillRect(8, 2, 16, 10); // helmet
        gc.fillStyle(hColor);
        gc.fillRect(24, 14, 14, 3); // gun barrel
        gc.fillStyle(0x57534e);
        gc.fillRect(22, 13, 4, 8); // gun body
        gc.fillStyle(0xfef3c7);
        gc.fillRect(11, 4, 3, 4); // eye slit
        gc.generateTexture('enemy_tex', 40, 34);
      } else {
        // Generic patrol enemy — humanoid
        gc.fillStyle(hColor);
        gc.fillRect(5, 6, 22, 26); // body
        gc.fillStyle(0xdc2626, 0.9);
        gc.fillCircle(16, 6, 7); // red head
        gc.fillStyle(0xffffff);
        gc.fillRect(10, 4, 4, 4); // eye L
        gc.fillRect(18, 4, 4, 4); // eye R
        gc.fillStyle(0x000000);
        gc.fillRect(11, 5, 2, 2); // pupil L
        gc.fillRect(19, 5, 2, 2); // pupil R
        gc.fillStyle(hColor, 0.7);
        gc.fillRect(4, 12, 4, 14); // arm L
        gc.fillRect(24, 12, 4, 14); // arm R
        gc.generateTexture('enemy_tex', 32, 34);
      }
    }

    // ── BOSS SPRITE ──
    if (!this.textures.exists('boss_tex')) {
      gc.clear();
      // Menacing Diamond Shield / Crown Shape with Horns and Glowing Core
      gc.fillStyle(hColor);
      gc.beginPath();
      gc.moveTo(42, 2); // top peak
      gc.lineTo(76, 24); // top right horn
      gc.lineTo(62, 38); // mid right indent
      gc.lineTo(80, 68); // bottom right wing
      gc.lineTo(42, 82); // bottom peak
      gc.lineTo(4, 68); // bottom left wing
      gc.lineTo(22, 38); // mid left indent
      gc.lineTo(8, 24); // top left horn
      gc.closePath();
      gc.fill();

      // Outer glow border
      gc.lineStyle(4, aColor);
      gc.beginPath();
      gc.moveTo(42, 2);
      gc.lineTo(76, 24);
      gc.lineTo(62, 38);
      gc.lineTo(80, 68);
      gc.lineTo(42, 82);
      gc.lineTo(4, 68);
      gc.lineTo(22, 38);
      gc.lineTo(8, 24);
      gc.closePath();
      gc.strokePath();

      // Inner glowing core shield
      gc.fillStyle(0x000000, 0.65);
      gc.fillCircle(42, 45, 20);

      // Core energy eye
      gc.fillStyle(sColor);
      gc.fillCircle(42, 45, 10);
      gc.fillStyle(0xffffff, 0.95);
      gc.fillCircle(39, 42, 4); // shine

      // Energy lines / vents
      gc.lineStyle(3, aColor, 0.7);
      gc.lineBetween(42, 45, 76, 24);
      gc.lineBetween(42, 45, 8, 24);
      gc.lineBetween(42, 45, 42, 82);

      gc.generateTexture('boss_tex', 84, 84);
    }

    // ── COLLECTIBLE SPRITE ──
    if (!this.textures.exists('collect_tex')) {
      gc.clear();
      gc.fillStyle(sColor);
      if (this.genre.includes('driving') || this.genre.includes('racing')) {
        // Fuel canister
        gc.fillRect(4, 4, 16, 20);
        gc.fillRect(8, 0, 8, 4);
        gc.fillStyle(aColor, 0.7);
        gc.fillRect(6, 8, 12, 4);
      } else if (this.genre === 'survival') {
        // Medkit cross
        gc.fillRect(8, 2, 8, 20);
        gc.fillRect(2, 8, 20, 8);
        gc.fillStyle(0xffffff, 0.5);
        gc.fillRect(10, 4, 4, 16);
        gc.fillRect(4, 10, 16, 4);
      } else {
        // Star collectible
        gc.fillTriangle(12, 0, 14, 8, 24, 8);
        gc.fillTriangle(12, 0, 10, 8, 0, 8);
        gc.fillTriangle(12, 24, 20, 16, 4, 16);
        gc.fillRect(9, 8, 6, 8);
      }
      gc.generateTexture('collect_tex', 24, 24);
    }

    // ── HAZARD SPIKE SPRITE ──
    if (!this.textures.exists('spike_tex')) {
      gc.clear();
      gc.fillStyle(hColor);
      gc.fillTriangle(16, 0, 32, 32, 0, 32);
      gc.fillStyle(hColor, 0.5);
      gc.fillTriangle(10, 6, 22, 6, 16, 0);
      gc.generateTexture('spike_tex', 32, 32);
    }

    // ── PLATFORM SPRITE ──
    if (!this.textures.exists('platform_tex')) {
      gc.clear();
      gc.fillStyle(sColor, 0.35);
      gc.fillRect(0, 0, 64, 20);
      gc.lineStyle(2, aColor, 0.8);
      gc.strokeRect(0, 0, 64, 20);
      gc.fillStyle(aColor, 0.12);
      gc.fillRect(4, 4, 56, 12);
      gc.generateTexture('platform_tex', 64, 20);
    }

    gc.destroy();
  }

  createRoadTexture() {
    if (this.textures.exists('road_tex')) return;

    const roadGraphics = this.make.graphics();
    roadGraphics.fillStyle(0x111827);
    roadGraphics.fillRect(0, 0, 512, 72);
    roadGraphics.fillStyle(0x374151);
    roadGraphics.fillRect(0, 16, 512, 40);
    roadGraphics.fillStyle(0xfacc15);
    roadGraphics.fillRect(0, 30, 512, 4);
    roadGraphics.lineStyle(4, 0xffffff, 0.9);

    for (let i = 0; i < 8; i++) {
      roadGraphics.beginPath();
      roadGraphics.moveTo(24 + i * 64, 36);
      roadGraphics.lineTo(56 + i * 64, 36);
      roadGraphics.strokePath();
    }

    roadGraphics.generateTexture('road_tex', 512, 72);
    roadGraphics.destroy();
  }

  createBackgroundElements(height) {
    const numElements = 40;
    const colors = this.blueprint.colors || {
      bg: '#0a0b10',
      accent: '#8b5cf6',
      secondary: '#06b6d4',
      hazard: '#f43f5e',
      player: '#22c55e',
      text: '#ffffff',
    };
    const aColor = Phaser.Display.Color.HexStringToColor(colors.accent).color;

    for (let i = 0; i < numElements; i++) {
      const x = Math.random() * 6000;
      const y = Math.random() * (height - 100);
      const size = Math.random() * 4 + 2;
      const alpha = Math.random() * 0.4 + 0.1;

      const dot = this.add.circle(x, y, size, aColor, alpha);
      dot.setDepth(1);

      this.tweens.add({
        targets: dot,
        y: y - (Math.random() * 30 + 10),
        alpha: Math.min(0.95, alpha + 0.3),
        duration: Math.random() * 3000 + 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // --- RENDER DYNAMIC LEVEL ---
  generateLevel(width, height) {
    const stage = this.getCurrentStage();
    const isRoad = this.genre.includes('driving') || this.genre.includes('racing');
    this.puzzlePiecesTotal = 0;

    if (Array.isArray(stage.blocks)) {
      stage.blocks.forEach((block) => {
        if (block.type === 'ground' || block.type === 'solid') {
          const tex = block.type === 'ground' && isRoad ? 'road_tex' : 'platform_tex';
          const p = this.platforms.create(block.x, block.y, tex);
          if (block.width && block.height) {
            p.setDisplaySize(block.width, block.height);
          }
          p.refreshBody();
        } else if (block.type === 'hazard') {
          const spike = this.hazards.create(block.x, block.y, 'spike_tex');
          if (block.width && block.height) {
            spike.setDisplaySize(block.width, block.height);
          }
          spike.refreshBody();
        } else if (block.type === 'collectible' || block.type === 'puzzle_piece') {
          const shard = this.collectibles.create(block.x, block.y, 'collect_tex');
          shard.setDisplaySize(block.width || 24, block.height || 24);
          shard.setData('collectType', block.type === 'puzzle_piece' ? 'puzzle_piece' : 'standard');

          if (this.genre.includes('driving') || this.genre.includes('racing') || this.genre.includes('runner')) {
            shard.body.setAllowGravity(false);
          } else {
            shard.setGravityY(100);
            shard.setBounceY(0.3);
            this.physics.add.collider(shard, this.platforms);
          }

          if (block.type === 'puzzle_piece') {
            this.puzzlePiecesTotal += 1;
          }
        }
      });
    }

    // Ensure the floor continues all the way until the boss is defeated (up to x = 6500)
    const isNoGravityGenre =
      this.genre.includes('driving') || this.genre.includes('racing') || this.genre.includes('runner');
    if (!isNoGravityGenre) {
      let maxX = 0;
      let groundY = height - 30; // default ground Y (420 for height 450)
      if (Array.isArray(stage.blocks)) {
        stage.blocks.forEach((block) => {
          if (block.type === 'ground' || block.type === 'solid') {
            const rightEdge = block.x + (block.width || 64) / 2;
            if (rightEdge > maxX) {
              maxX = rightEdge;
              // If it's near the bottom half of the screen, align our extended floor with it
              if (block.y > height - 100) {
                groundY = block.y;
              }
            }
          }
        });
      }

      const startX = maxX > 0 ? maxX : 0;
      const endX = 6500;
      const blockW = 256;
      for (let bx = startX + blockW / 2; bx < endX; bx += blockW) {
        const p = this.platforms.create(bx, groundY, 'platform_tex');
        p.setDisplaySize(blockW, 30);
        p.refreshBody();
      }
    }

    if (Array.isArray(stage.enemies)) {
      const isNoGravity =
        this.genre.includes('driving') || this.genre.includes('racing') || this.genre.includes('runner');
      const pGrav = isNoGravity
        ? 0
        : this.blueprint.player?.gravity !== undefined
          ? this.blueprint.player.gravity
          : 300;

      stage.enemies.forEach((enemyData) => {
        if (enemyData.defeated) return;

        const enemySprite = this.enemies.create(enemyData.x, enemyData.y, 'enemy_tex');

        if (this.genre.includes('driving') || this.genre.includes('racing')) {
          enemySprite.setDisplaySize(48, 32);
        } else {
          enemySprite.setDisplaySize(32, 32);
        }

        // Do NOT setCollideWorldBounds — lets enemies fall into gaps and get eliminated
        enemySprite.setCollideWorldBounds(false);
        enemySprite.setBounce(0, 0);

        if (isNoGravity) {
          enemySprite.body.setAllowGravity(false);
        } else {
          enemySprite.setGravityY(pGrav);
        }

        if (enemyData.type === 'traffic') {
          enemySprite.setVelocityX(-120);
        } else {
          // Give patrol enemies a slight initial velocity
          enemySprite.setVelocityX(Math.random() < 0.5 ? -60 : 60);
        }

        enemySprite.setData('stateObject', enemyData);
        enemySprite.setData('type', enemyData.type || 'patrol');
      });
    }
  }

  // --- UI HUD ---
  createUI(width) {
    const textColors = this.blueprint.colors || { text: '#ffffff' };
    const style = { font: 'bold 16px Outfit, sans-serif', fill: textColors.text };
    const labelStyle = { font: '12px Outfit, sans-serif', fill: '#888888' };

    // Resolve score label from blueprint (set by dynamic analyzer)
    this._scoreLabel =
      this.blueprint.intent?.scoreLabel ||
      (this.genre.includes('driving') || this.genre.includes('racing')
        ? 'SPEED'
        : this.genre.includes('runner')
          ? 'COINS'
          : 'SHARDS');

    this.uiContainer = this.add.container(20, 20).setScrollFactor(0).setDepth(20);

    this.scoreText = this.add.text(0, 0, `${this._scoreLabel}: 0`, style);
    this.uiContainer.add(this.scoreText);

    this.stageText = this.add.text(
      0,
      25,
      `${this.labels.levelCompleted} ${this.currentStageIndex + 1}/${this.stages.length}: ${this.getCurrentStage().environment}`,
      labelStyle
    );
    this.uiContainer.add(this.stageText);

    this.objectiveText = this.add.text(0, 42, `${this.labels.goal}: ${this.getCurrentObjective()}`, labelStyle);
    this.uiContainer.add(this.objectiveText);

    // Dynamic stage checklist panel
    this.objectiveTitleText = this.add.text(0, 65, `${this.labels.levelCompleted}:`, {
      font: 'bold 11px Outfit, sans-serif',
      fill: '#fbbf24',
    });
    this.uiContainer.add(this.objectiveTitleText);

    this.shardsStatusText = this.add.text(10, 80, ``, { font: '11px Outfit, sans-serif', fill: '#94a3b8' });
    this.uiContainer.add(this.shardsStatusText);

    this.enemiesStatusText = this.add.text(10, 95, ``, { font: '11px Outfit, sans-serif', fill: '#94a3b8' });
    this.uiContainer.add(this.enemiesStatusText);

    this.bossStatusText = this.add.text(10, 110, ``, { font: '11px Outfit, sans-serif', fill: '#94a3b8' });
    this.uiContainer.add(this.bossStatusText);

    const hbBg = this.add.graphics();
    hbBg.fillStyle(0x222222, 0.8);
    hbBg.fillRect(width - 220, 0, 200, 16);
    this.uiContainer.add(hbBg);

    this.healthBar = this.add.graphics();
    this.uiContainer.add(this.healthBar);
    this.updateHealthBar();

    this.healthText = this.add.text(width - 220, 20, `${this.labels.health}: 100%`, {
      font: 'bold 12px Outfit, sans-serif',
      fill: '#ffffff',
    });
    this.uiContainer.add(this.healthText);

    this.bossUI = this.add.container(0, 0).setScrollFactor(0).setDepth(20).setVisible(false);

    this.bossLabel = this.add.text(width / 2 - 100, 10, `${this.labels.boss || 'Boss'}: ${this.getCurrentBossName().toUpperCase()}`, {
      font: 'bold 14px Outfit, sans-serif',
      fill: '#ff3333',
    });
    this.bossUI.add(this.bossLabel);

    const bBarBg = this.add.graphics();
    bBarBg.fillStyle(0x222222, 0.8);
    bBarBg.fillRect(width / 2 - 150, 30, 300, 12);
    this.bossUI.add(bBarBg);

    this.bossHealthBar = this.add.graphics();
    this.bossUI.add(this.bossHealthBar);

    this.bossHpText = this.add.text(width / 2, 46, '', {
      font: 'bold 11px Outfit, sans-serif',
      fill: '#fca5a5',
    });
    this.bossUI.add(this.bossHpText);

    this.updateObjectivesHUD();

    // ── POWER BAR HUD (bottom-right) ─────────────────────────────────────
    const pw = width;
    const powers = [
      { key: 'Q', label: 'DASH', color: '#00e5ff' },
      { key: 'E', label: 'SHIELD', color: '#a78bfa' },
      { key: 'R', label: 'TRIPLE', color: '#06b6d4' },
    ];

    this.powerBarContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(25);
    this._powerSlots = [];

    powers.forEach((p, i) => {
      const bx = pw - 210 + i * 68;
      const by = this.scale.height - 50;

      // Background pill
      const bg = this.add.graphics();
      bg.fillStyle(0x0f172a, 0.85);
      bg.fillRoundedRect(bx, by, 58, 36, 8);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(p.color).color, 0.6);
      bg.strokeRoundedRect(bx, by, 58, 36, 8);
      this.powerBarContainer.add(bg);

      // Cooldown fill
      const fillGfx = this.add.graphics();
      this.powerBarContainer.add(fillGfx);

      // Key label
      const keyTxt = this.add.text(bx + 6, by + 4, `[${p.key}]`, {
        font: 'bold 10px Outfit, sans-serif',
        fill: p.color,
      });
      this.powerBarContainer.add(keyTxt);

      // Power name
      const nameTxt = this.add.text(bx + 6, by + 18, p.label, {
        font: '9px Outfit, sans-serif',
        fill: '#cbd5e1',
      });
      this.powerBarContainer.add(nameTxt);

      this._powerSlots.push({ bg, fillGfx, color: p.color, bx, by });
    });
  }

  updateHealthBar() {
    this.healthBar.clear();
    const hpColor = this.health > 40 ? 0x22c55e : 0xef4444;
    this.healthBar.fillStyle(hpColor, 1);
    this.healthBar.fillRect(this.scale.width - 220, 0, (this.health / 100) * 200, 16);
  }

  // Redraw power slot cooldown overlays
  updatePowerBar(time) {
    if (!this._powerSlots) return;
    const cooldowns = [this.lastDash - 1800, this.lastShield - 5000, this.lastTriple - 1200];
    const durations = [1800, 5000, 1200];

    this._powerSlots.forEach((slot, i) => {
      slot.fillGfx.clear();
      const elapsed = time - cooldowns[i];
      const pct = Math.min(1, elapsed / durations[i]);
      if (pct < 1) {
        // Dark cooldown overlay
        const c = Phaser.Display.Color.HexStringToColor(slot.color).color;
        slot.fillGfx.fillStyle(0x000000, 0.55);
        slot.fillGfx.fillRoundedRect(slot.bx, slot.by, 58 * (1 - pct), 36, 8);
      }
    });
  }

  updateBossHealthBar() {
    this.bossHealthBar.clear();
    this.bossHealthBar.fillStyle(0xdc2626, 1);
    const pct = this.bossMaxHealth > 0 ? this.bossHealth / this.bossMaxHealth : 0;
    this.bossHealthBar.fillRect(this.scale.width / 2 - 150, 30, Math.max(4, pct * 300), 12);
    if (this.bossHpText) {
      this.bossHpText.setText(`${Math.ceil(this.bossHealth)} / ${this.bossMaxHealth} HP`);
    }
  }

  updateObjectivesHUD() {
    const stage = this.getCurrentStage();
    const reqScore = this.getStageRequiredScore();
    const scoreLabel =
      this.genre.includes('driving') || this.genre.includes('racing')
        ? 'Speed/Score'
        : this.genre.includes('runner')
          ? 'Coins'
          : 'Shards';

    const scoreOk = this.score >= reqScore;
    this.shardsStatusText.setText(`• ${scoreLabel}: ${this.score} / ${reqScore} ${scoreOk ? '✔' : '⏳'}`);
    this.shardsStatusText.setFill(scoreOk ? '#86efac' : '#94a3b8');

    const totalEnemies = Array.isArray(stage.enemies) ? stage.enemies.length : 0;
    const remainingEnemies = Array.isArray(stage.enemies) ? stage.enemies.filter((e) => !e.defeated).length : 0;
    const enemiesOk = remainingEnemies === 0;

    if (totalEnemies > 0) {
      this.enemiesStatusText.setText(
        `• Hostiles: ${remainingEnemies} / ${totalEnemies} remaining ${enemiesOk ? '✔' : '⏳'}`
      );
      this.enemiesStatusText.setFill(enemiesOk ? '#86efac' : '#94a3b8');
      this.enemiesStatusText.setVisible(true);
    } else {
      this.enemiesStatusText.setVisible(false);
    }

    if (this.genre === 'puzzle' && this.puzzlePiecesTotal > 0) {
      const puzzleOk = this.puzzlePiecesCollected >= this.puzzlePiecesTotal;
      this.bossStatusText.setText(
        `• Puzzle Pieces: ${this.puzzlePiecesCollected} / ${this.puzzlePiecesTotal} ${puzzleOk ? '✔' : '⏳'}`
      );
      this.bossStatusText.setFill(puzzleOk ? '#86efac' : '#94a3b8');
      this.bossStatusText.setVisible(true);
    } else if (stage.boss) {
      const bossDefeated = stage.boss.defeated;
      const hpLabel =
        this.bossActive && this.bossMaxHealth > 0
          ? ` (${Math.ceil(this.bossHealth)}/${this.bossMaxHealth} HP)`
          : '';
      this.bossStatusText.setText(
        `• Boss [${stage.boss.name}]: ${bossDefeated ? 'Defeated ✔' : `Hostile ⏳${hpLabel}`}`
      );
      this.bossStatusText.setFill(bossDefeated ? '#86efac' : '#fca5a5');
      this.bossStatusText.setVisible(true);
    } else {
      this.bossStatusText.setVisible(false);
    }
  }

  // --- INTERACTIONS & STATE UPDATE ---
  collectItem(player, item) {
    const collectType = item.getData('collectType') || 'standard';
    item.destroy();
    this.score += collectType === 'puzzle_piece' ? 25 : 10;

    if (collectType === 'puzzle_piece') {
      this.puzzlePiecesCollected += 1;
      this.showFloatingBanner('PUZZLE PIECE FOUND!', '#a78bfa', 900);
    }

    this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);

    AudioSynth.playSFX('collect');
    const color = this.blueprint.colors?.secondary || '#06b6d4';
    this.createSpark(item.x, item.y, color);

    this.updateObjectivesHUD();
    this.checkStageCompletion();
  }

  hitHazard(player, spike) {
    if (this.genre.includes('driving') || this.genre.includes('racing') || this.genre.includes('runner')) {
      this.damagePlayer(25);
      this.player.x -= 80;
    } else {
      player.setVelocityY(-200);
      player.setVelocityX(player.body.velocity.x > 0 ? -120 : 120);
      this.damagePlayer(25);
    }
  }

  hitEnemy(player, enemySprite) {
    const enemyState = enemySprite.getData('stateObject');
    if (!enemyState) return;

    if (this.genre.includes('driving') || this.genre.includes('racing')) {
      enemyState.hp = 0;
      enemyState.alive = false;
      enemyState.defeated = true;
      enemySprite.destroy();

      AudioSynth.playSFX('explosion');
      this.cameras.main.shake(200, 0.02);
      this.damagePlayer(30);
      this.createSpark(enemySprite.x, enemySprite.y, '#dc2626');

      this.updateObjectivesHUD();
      this.checkStageCompletion();
    } else if (player.y < enemySprite.y - 15) {
      enemyState.hp = 0;
      enemyState.alive = false;
      enemyState.defeated = true;
      enemySprite.destroy();

      player.setVelocityY(-220);
      AudioSynth.playSFX('explosion');
      this.score += 20;

      this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);

      this.createSpark(enemySprite.x, enemySprite.y, '#ff4444');

      this.updateObjectivesHUD();
      this.checkStageCompletion();
    } else {
      player.setVelocityX(player.x < enemySprite.x ? -150 : 150);
      this.damagePlayer(20);
    }
  }

  hitPlayerProjectile(player, laser) {
    laser.destroy();
    this.damagePlayer(6);
  }

  fireWeapon(time) {
    this.lastFired = time + 220;
    AudioSynth.playSFX('laser');

    // If boss is active, auto-aim toward the boss
    let velX,
      velY = 0;
    if (this.bossActive && this.boss && this.boss.active) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
      const speed = 520;
      velX = Math.cos(angle) * speed;
      velY = Math.sin(angle) * speed;
    } else {
      const isFacingLeft = this.player.flipX;
      velX = isFacingLeft ? -480 : 480;
      velY = 0;
    }

    const laser = this.projectiles.create(this.player.x, this.player.y, 'collect_tex');
    laser.setScale(0.6);
    laser.body.setAllowGravity(false);
    laser.setVelocity(velX, velY);

    // Glow tint based on accent color
    const aHex = this.blueprint.colors?.accent || '#8b5cf6';
    const aColor = Phaser.Display.Color.HexStringToColor(aHex).color;
    laser.setTint(aColor);

    this.time.delayedCall(3000, () => {
      if (laser.active) laser.destroy();
    });
  }

  // ── POWER: DASH ─────────────────────────────────────────────────────
  doDash(time) {
    this.lastDash = time + 1800;
    const dir = this.player.flipX ? -1 : 1;
    this.player.setVelocityX(dir * 700);
    this.player.setTint(0x00e5ff);
    this.time.delayedCall(300, () => {
      if (this.player.active) this.player.clearTint();
    });
    // Afterimage sparks
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 40, () => {
        this.createSpark(this.player.x - dir * i * 12, this.player.y, '#00e5ff');
      });
    }
    AudioSynth.playSFX('jump');
  }

  // ── POWER: SHIELD ────────────────────────────────────────────────────
  doShield(time) {
    if (this.shieldActive) return;
    this.lastShield = time + 5000;
    this.shieldActive = true;

    const sColor = Phaser.Display.Color.HexStringToColor(this.blueprint.colors?.accent || '#8b5cf6').color;
    this._shieldGraphic = this.add.circle(this.player.x, this.player.y, 28, sColor, 0.35);
    this._shieldGraphic.setDepth(18);
    this._shieldGraphicBorder = this.add.circle(this.player.x, this.player.y, 28, 0xffffff, 0);
    this._shieldGraphicBorder.setStrokeStyle(3, sColor, 0.9);
    this._shieldGraphicBorder.setDepth(19);

    // Pulse animation
    this.tweens.add({
      targets: [this._shieldGraphic, this._shieldGraphicBorder],
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 400,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        if (this._shieldGraphic) this._shieldGraphic.destroy();
        if (this._shieldGraphicBorder) this._shieldGraphicBorder.destroy();
        this.shieldActive = false;
      },
    });
    AudioSynth.playSFX('collect');
  }

  // ── POWER: TRIPLE SHOT ───────────────────────────────────────────────
  doTripleShot(time) {
    this.lastTriple = time + 1200;
    AudioSynth.playSFX('laser');

    const angles =
      this.bossActive && this.boss && this.boss.active
        ? [
            Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y) - 0.15,
            Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y),
            Phaser.Math.Angle.Between(this.player.x, this.player.y, this.boss.x, this.boss.y) + 0.15,
          ]
        : [
            this.player.flipX ? Math.PI + 0.15 : -0.15,
            this.player.flipX ? Math.PI : 0,
            this.player.flipX ? Math.PI - 0.15 : 0.15,
          ];

    const speed = 500;
    const aHex = this.blueprint.colors?.secondary || '#06b6d4';
    const aColor = Phaser.Display.Color.HexStringToColor(aHex).color;

    angles.forEach((angle) => {
      const shot = this.projectiles.create(this.player.x, this.player.y, 'collect_tex');
      shot.setScale(0.6);
      shot.body.setAllowGravity(false);
      shot.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      shot.setTint(aColor);
      this.time.delayedCall(3000, () => {
        if (shot.active) shot.destroy();
      });
    });
  }

  shootEnemy(projectile, enemySprite) {
    if (projectile.body) projectile.body.enable = false;
    projectile.destroy();

    const enemyState = enemySprite.getData('stateObject');
    if (!enemyState) {
      enemySprite.destroy();
      return;
    }

    const damageAmount = 25;
    enemyState.hp = Math.max(0, enemyState.hp - damageAmount);

    enemySprite.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemySprite.active) enemySprite.clearTint();
    });

    AudioSynth.playSFX('hurt');

    if (enemyState.hp <= 0) {
      enemyState.alive = false;
      enemyState.defeated = true;

      enemySprite.destroy();
      AudioSynth.playSFX('explosion');
      this.score += 20;

      this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);

      const color = this.blueprint.colors?.hazard || '#ef4444';
      this.createSpark(enemySprite.x, enemySprite.y, color);

      this.updateObjectivesHUD();
      this.checkStageCompletion();
    }
  }

  destroyProjectile(projectile, platform) {
    projectile.destroy();
  }

  damagePlayer(amount) {
    if (this.gameOverTriggered || this.stageCompleteTriggered) return;

    // Shield blocks all incoming damage
    if (this.shieldActive) {
      AudioSynth.playSFX('collect');
      if (this._shieldGraphic) {
        this._shieldGraphic.setAlpha(0.9);
        this.time.delayedCall(80, () => {
          if (this._shieldGraphic) this._shieldGraphic.setAlpha(0.35);
        });
      }
      return;
    }

    this.health = Math.max(0, this.health - amount);
    this.healthText.setText(`${this.labels.health}: ${Math.floor(this.health)}%`);
    this.updateHealthBar();

    AudioSynth.playSFX('hurt');
    this.cameras.main.shake(150, 0.015);

    this.player.setTint(0xff0000);
    this.time.delayedCall(150, () => {
      if (this.player.active) this.player.clearTint();
    });

    if (this.health <= 0) {
      this.loseGame();
    }
  }

  // --- BOSS FIGHT ---
  spawnBoss() {
    const stage = this.getCurrentStage();
    const stageBoss = stage.boss;
    if (!stageBoss || stageBoss.defeated) return;

    this.bossSpawned = true;
    this.bossActive = true;
    this.bossLastHurt = 0;
    this.bossDamageLockUntil = 0;
    this._bossDefeating = false;

    this.bossMaxHealth = 200;
    stageBoss.hp = this.bossMaxHealth;
    stageBoss.maxHp = this.bossMaxHealth;
    stageBoss.phases = ['Phase 1: HP 200-140', 'Phase 2: HP 139-70', 'Phase 3: HP 69-0'];
    this.bossHealth = this.bossMaxHealth;

    const cam = this.cameras.main;
    const fallbackBossX = this.player.x + 220;
    const bx = Number.isFinite(stageBoss.x) ? stageBoss.x : fallbackBossX;
    const by = Number.isFinite(stageBoss.y) ? stageBoss.y : 200;
    const clampedBossX = Phaser.Math.Clamp(bx, cam.scrollX + 120, cam.scrollX + cam.width - 120);

    this.boss = this.physics.add.sprite(clampedBossX, by, 'boss_tex');
    this.boss.setDisplaySize(80, 80);
    this.boss.body.setAllowGravity(false);
    this.boss.setImmovable(true);
    
    // Explicitly initialize health on the boss sprite
    this.boss.maxHealth = 200;
    this.boss.health = 200;

    this.boss.setData('stateObject', stageBoss);

    this.bossLabel.setText(`${this.labels.boss || 'Boss'}: ${stageBoss.name.toUpperCase()}`);
    this.bossUI.setVisible(true);
    this.updateBossHealthBar();

    this.physics.add.overlap(this.projectiles, this.boss, this.hitBoss, null, this);

    this.objectiveText.setText(`${this.labels.goal}: ${this.labels.bossDefeated} - ${stageBoss.name.toUpperCase()}`);
    this.showFloatingBanner(`${this.labels.bossAppeared}: ${stageBoss.name.toUpperCase()}`, '#f87171', 1400);
    this.cameras.main.shake(300, 0.01);
  }

  fireBossLaser() {
    if (!this.boss || !this.boss.active) return;
    AudioSynth.playSFX('laser');

    const laser = this.bossProjectiles.create(this.boss.x - 45, this.boss.y, 'enemy_tex');
    laser.setScale(0.6);
    laser.body.setAllowGravity(false);

    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    
    // Combat Phases and Aggressiveness Scaling
    const phase = this.bossHealth <= 69 ? 3 : this.bossHealth <= 139 ? 2 : 1;
    const speed = phase === 3 ? 320 : phase === 2 ? 240 : 180;

    laser.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.time.delayedCall(3000, () => {
      if (laser.active) laser.destroy();
    });
  }

  hitBoss(param1, param2) {
    if (!param1 || !param2) return;

    let boss = null;
    let bullet = null;

    // Safely extract boss and bullet objects to prevent any argument order swapping issues
    if (param1.texture && param1.texture.key === 'boss_tex') {
      boss = param1;
      bullet = param2;
    } else if (param2.texture && param2.texture.key === 'boss_tex') {
      boss = param2;
      bullet = param1;
    } else {
      // Fallback identification based on spent status
      if (param1.getData && param1.getData('spent') !== undefined) {
        bullet = param1;
        boss = param2;
      } else {
        bullet = param2;
        boss = param1;
      }
    }

    if (!boss || !bullet || !boss.active || !bullet.active) return;
    if (this._bossDefeating || !this.bossActive) return;
    if (bullet.getData('spent')) return;

    const now = this.time.now;
    if (this.bossDamageLockUntil && now < this.bossDamageLockUntil) {
      return;
    }

    // Set bullet spent and destroy it immediately to prevent multiple damage events
    bullet.setData('spent', true);
    if (bullet.body) bullet.body.enable = false;
    bullet.destroy();

    // Verify boss health variables are properly initialized and never become undefined, NaN, or null
    if (boss.health === undefined || Number.isNaN(boss.health) || boss.health === null) {
      boss.health = 200;
    }
    if (boss.maxHealth === undefined || Number.isNaN(boss.maxHealth) || boss.maxHealth === null) {
      boss.maxHealth = 200;
    }

    // Every bullet hit reduces HP by exactly 10
    boss.health -= 10;
    this.bossHealth = boss.health;

    const bossState = boss.getData('stateObject');
    if (bossState) {
      bossState.hp = boss.health;
    }

    this.bossLastHurt = now;
    this.bossDamageLockUntil = now + 280;
    this.updateBossHealthBar();
    this.updateObjectivesHUD();

    // Debugging logs on every hit
    console.log("Boss HP:", boss.health, "/", boss.maxHealth);

    AudioSynth.playSFX('hurt');
    this.createSpark(boss.x, boss.y, '#ffffff');

    boss.setTint(0xff0000);
    this.time.delayedCall(120, () => {
      if (boss.active) boss.clearTint();
    });

    // Boss should only be defeated when health is <= 0
    if (boss.health <= 0) {
      this.defeatBoss(boss);
    }
  }

  showFloatingBanner(message, color = '#fde68a', duration = 1600) {
    const width = this.scale.width;
    const height = this.scale.height;
    const banner = this.add
      .text(width / 2, height * 0.28, message, {
        font: 'bold 22px Outfit, sans-serif',
        fill: color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: height * 0.24,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(duration, () => {
          this.tweens.add({
            targets: banner,
            alpha: 0,
            duration: 350,
            onComplete: () => {
              if (banner.active) banner.destroy();
            },
          });
        });
      },
    });
  }

  defeatBoss(bossSprite) {
    if (this._bossDefeating) return;
    this._bossDefeating = true;

    // Step 1: Stop boss movement
    this.bossActive = false;
    if (bossSprite && bossSprite.body) {
      bossSprite.body.setVelocity(0, 0);
      bossSprite.setImmovable(true);
    }

    // Step 2: Disable attacks
    // (Attacks are disabled because this.bossActive is set to false)

    const bx = bossSprite?.active ? bossSprite.x : this.scale.width / 2;
    const by = bossSprite?.active ? bossSprite.y : this.scale.height / 2;
    const bossState = bossSprite?.getData('stateObject') || null;
    const bossName = bossState?.name || this.getCurrentBossName();

    if (bossState) {
      bossState.hp = 0;
      bossState.alive = false;
      bossState.defeated = true;
    }
    this.bossHealth = 0;
    if (bossSprite) {
      bossSprite.health = 0;
    }
    this.updateBossHealthBar();
    this.updateObjectivesHUD();

    if (this.onBossDefeated) {
      this.onBossDefeated({
        bossName,
        stageIndex: this.currentStageIndex,
        stageNumber: this.currentStageIndex + 1,
        totalStages: this.stages.length,
      });
    }

    // Step 3: Play explosion animation
    const explosionDuration = 1200; // ms
    this.cameras.main.shake(explosionDuration, 0.02);

    // Expanding visual circle
    const explCircle = this.add.circle(bx, by, 10, 0xffaa00, 0.9);
    explCircle.setDepth(100);
    this.tweens.add({
      targets: explCircle,
      radius: 120,
      alpha: 0,
      duration: explosionDuration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        explCircle.destroy();
      }
    });

    // Spawn multiple explosion spark particles over the duration
    const sparkCount = 20;
    for (let i = 0; i < sparkCount; i++) {
      this.time.delayedCall(i * 50, () => {
        if (!this.sys.isActive()) return;
        const color = i % 3 === 0 ? '#ff0000' : (i % 3 === 1 ? '#ffaa00' : '#ffffff');
        this.createSpark(bx + (Math.random() - 0.5) * 60, by + (Math.random() - 0.5) * 60, color);
        AudioSynth.playSFX('explosion');
      });
    }

    // Step 4: Wait until explosion animation finishes
    this.time.delayedCall(explosionDuration, () => {
      // Step 5: Destroy boss
      if (bossSprite && bossSprite.active) {
        bossSprite.destroy();
      }
      this.bossSpawned = false;
      this.boss = null;
      if (this.bossUI) this.bossUI.setVisible(false);

      const stage = this.getCurrentStage();
      if (stage && stage.boss) {
        stage.boss.defeated = true;
      }

      // Step 6, 7 & 8: Show Victory Screen, Show "Level Completed", and Pause game
      this.winGame();
    });
  }

  showBossDefeatedBanner(bossName) {
    const width = this.scale.width;
    const height = this.scale.height;

    const bannerBg = this.add
      .rectangle(width / 2, height / 2, 460, 96, 0x1e1b4b, 0.95)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(210)
      .setStrokeStyle(3, 0xff4444);

    const bannerText = this.add
      .text(width / 2, height / 2 - 16, this.labels.bossDefeated, {
        font: 'bold 34px Outfit, sans-serif',
        fill: '#ff6666',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(211);

    const subText = this.add
      .text(width / 2, height / 2 + 20, `${bossName} eliminated — Stage ${this.currentStageIndex + 1} clearing...`, {
        font: '15px Outfit, sans-serif',
        fill: '#fde68a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(211);

    bannerBg.setScale(0.1);
    bannerText.setScale(0.1);
    subText.setAlpha(0);

    this.tweens.add({
      targets: [bannerBg, bannerText],
      scaleX: 1,
      scaleY: 1,
      duration: 350,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: subText,
      alpha: 1,
      delay: 250,
      duration: 300,
    });

    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: [bannerBg, bannerText, subText],
        alpha: 0,
        duration: 400,
        onComplete: () => {
          if (bannerBg.active) bannerBg.destroy();
          if (bannerText.active) bannerText.destroy();
          if (subText.active) subText.destroy();
          this._bossDefeating = false;
          this.updateObjectivesHUD();
          this.checkStageCompletion();
        },
      });
    });
  }

  // --- STAGE GATE COMPLETE ---
  checkStageCompletion() {
    if (this.gameOverTriggered || this.stageCompleteTriggered || this._bossDefeating) return;

    const stage = this.getCurrentStage();
    if (!stage) return;

    const hasBoss = !!stage.boss;
    const bossDefeated = !hasBoss || stage.boss.defeated;
    const objectiveFinished = this.score >= this.getStageRequiredScore();
    const enemiesDefeated = Array.isArray(stage.enemies) ? stage.enemies.every((e) => e.defeated) : true;
    const puzzleFinished =
      this.genre !== 'puzzle' || this.puzzlePiecesTotal === 0 || this.puzzlePiecesCollected >= this.puzzlePiecesTotal;

    let stageCompleted = false;
    if (this.genre === 'puzzle') {
      stageCompleted = puzzleFinished;
    } else if (hasBoss) {
      stageCompleted = bossDefeated && puzzleFinished;
    } else {
      stageCompleted = objectiveFinished && enemiesDefeated && puzzleFinished;
    }

    if (stageCompleted) {
      this.showStageComplete();
    }
  }

  showStageComplete() {
    if (this.stageCompleteTriggered) return;
    this.stageCompleteTriggered = true;

    AudioSynth.playSFX('win');

    const stageNumber = this.currentStageIndex + 1;
    const isFinalStage = this.currentStageIndex >= this.stages.length - 1;

    if (this.onStageComplete) {
      this.onStageComplete({
        stageIndex: this.currentStageIndex,
        stageNumber,
        totalStages: this.stages.length,
        environment: this.getCurrentStage()?.environment,
        isFinalStage,
      });
    }

    const width = this.scale.width;
    const height = this.scale.height;

    this.completeOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setScrollFactor(0)
      .setDepth(230);

    this.completePanel = this.add
      .rectangle(width / 2, height / 2, 440, 200, 0x0f172a, 0.96)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(231)
      .setStrokeStyle(3, 0xfde68a);

    this.completeText = this.add
      .text(width / 2, height / 2 - 42, `${this.labels.levelCompleted} ${stageNumber}`, {
        font: 'bold 38px Outfit, sans-serif',
        fill: '#fde68a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(232);

    const subTextMsg = isFinalStage
      ? 'All dream stages cleared — preparing victory...'
      : `Stage ${stageNumber} cleared! Loading Stage ${stageNumber + 1}...`;

    this.completeSubText = this.add
      .text(width / 2, height / 2 + 8, subTextMsg, {
        font: 'bold 16px Outfit, sans-serif',
        fill: '#cbd5e1',
        align: 'center',
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(232);

    this.completeDetailText = this.add
      .text(width / 2, height / 2 + 52, this.getCurrentStage()?.environment || '', {
        font: '13px Outfit, sans-serif',
        fill: '#94a3b8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(232);

    // Entrance animation
    this.completePanel.setScale(0, 0);
    this.completeText.setScale(0, 0);
    this.completeSubText.setScale(0, 0);
    this.completeDetailText.setScale(0, 0);

    this.tweens.add({
      targets: [this.completePanel, this.completeText, this.completeSubText, this.completeDetailText],
      scaleX: 1,
      scaleY: 1,
      duration: 450,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(2200, () => {
      this.unlockNextStage();
    });
  }

  unlockNextStage() {
    if (this.completeOverlay) this.completeOverlay.destroy();
    if (this.completePanel) this.completePanel.destroy();
    if (this.completeText) this.completeText.destroy();
    if (this.completeSubText) this.completeSubText.destroy();
    if (this.completeDetailText) this.completeDetailText.destroy();
    this.stageCompleteTriggered = false;
    this._fallingKillScheduled = false;
    this._bossDefeating = false;
    this.puzzlePiecesCollected = 0;
    this.puzzlePiecesTotal = 0;

    if (this.currentStageIndex >= this.stages.length - 1) {
      this.winGame();
      return;
    }

    this.currentStageIndex += 1;
    this.score = 0;
    this.health = Math.min(100, this.health + 25);

    this.scoreText.setText(`${this._scoreLabel}: 0`);
    this.healthText.setText(`${this.labels.health}: ${this.health}%`);
    this.updateHealthBar();

    if (this.bossUI) this.bossUI.setVisible(false);

    // Clear previous entities
    this.platforms.clear(true, true);
    this.collectibles.clear(true, true);
    this.hazards.clear(true, true);
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.bossProjectiles.clear(true, true);

    const playerStartY = this.genre.includes('runner')
      ? 250
      : this.genre.includes('driving') || this.genre.includes('racing')
        ? 360
        : this.scale.height - 150;
    this.player.setPosition(100, playerStartY);
    this.player.setVelocity(0, 0);
    this.bossSpawned = false;
    this.bossActive = false;
    this.currentTrack = 1;
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }

    this.generateLevel(this.scale.width, this.scale.height);

    this.stageText.setText(
      `${this.labels.levelCompleted} ${this.currentStageIndex + 1}/${this.stages.length}: ${this.getCurrentStage().environment}`
    );
    this.objectiveText.setText(`${this.labels.goal}: ${this.getCurrentObjective()}`);

    this.updateObjectivesHUD();

    this.cameras.main.flash(350, 34, 211, 238);
  }

  // --- PARTICLES ENGINE ---
  createSpark(x, y, colorStr) {
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;
    for (let i = 0; i < 8; i++) {
      const circ = this.add.circle(x, y, 3, color);
      this.physics.add.existing(circ);
      circ.body.setAllowGravity(false);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100 + 50;
      circ.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      this.tweens.add({
        targets: circ,
        alpha: 0,
        scale: 0.1,
        duration: 400,
        onComplete: () => circ.destroy(),
      });
    }
  }

  // --- WIN / LOSE ---
  winGame() {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.bossActive = false;

    if (this.boss) {
      this.createSpark(this.boss.x, this.boss.y, '#ffff00');
      this.boss.destroy();
    }

    this.player.setVelocity(0);
    this.player.body.setAllowGravity(false);

    AudioSynth.stopBGM();
    AudioSynth.playSFX('win');

    this.completionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

    const width = this.scale.width;
    const height = this.scale.height;

    // Victory screen background overlay
    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.82)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(240);

    // Premium Victory panel with cyan border
    const panel = this.add
      .rectangle(width / 2, height / 2, 450, 320, 0x0f172a, 0.98)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0x22d3ee)
      .setScrollFactor(0)
      .setDepth(241);

    // Title: Victory!
    const title = this.add
      .text(width / 2, height / 2 - 110, "VICTORY!", {
        font: 'black 36px Outfit, sans-serif',
        fill: '#ffd700',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(242);

    // Level Completed
    const levelCompletedText = this.add
      .text(width / 2, height / 2 - 65, "Level Completed", {
        font: 'bold 22px Outfit, sans-serif',
        fill: '#86efac',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(242);

    // Boss Defeated
    const stage = this.getCurrentStage();
    const bossName = stage?.boss?.name || this.blueprint.boss || 'Overlord';
    const bossDefeatedText = this.add
      .text(width / 2, height / 2 - 30, `Boss Defeated - ${bossName}`, {
        font: 'bold 16px Outfit, sans-serif',
        fill: '#fca5a5',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(242);

    // Final Score
    const scoreText = this.add
      .text(width / 2, height / 2 + 10, `${this.labels.finalScore}: ${this.score}`, {
        font: 'bold 20px Outfit, sans-serif',
        fill: '#fde68a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(242);

    // Time
    const timeText = this.add
      .text(width / 2, height / 2 + 42, `Time: ${this.completionTime}s`, {
        font: 'bold 16px Outfit, sans-serif',
        fill: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(242);

    // Interactive "Play Again" Button
    const playAgainBtnBg = this.add
      .rectangle(width / 2, height / 2 + 95, 180, 38, 0x1e293b, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x22c55e)
      .setScrollFactor(0)
      .setDepth(242)
      .setInteractive({ useHandCursor: true });

    const playAgainBtnText = this.add
      .text(width / 2, height / 2 + 95, this.labels.playAgain, {
        font: 'bold 15px Outfit, sans-serif',
        fill: '#86efac',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(243);

    playAgainBtnBg.on('pointerover', () => {
      playAgainBtnBg.setFillStyle(0x334155, 1);
      playAgainBtnBg.setStrokeStyle(2.5, 0x4ade80);
    });

    playAgainBtnBg.on('pointerout', () => {
      playAgainBtnBg.setFillStyle(0x1e293b, 0.9);
      playAgainBtnBg.setStrokeStyle(2, 0x22c55e);
    });

    playAgainBtnBg.on('pointerdown', () => {
      if (window.__dream2play_restart) {
        window.__dream2play_restart();
      } else {
        this.scene.restart();
      }
    });

    this.tweens.add({
      targets: panel,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: title, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    for (let i = 0; i < 30; i++) {
      this.time.delayedCall(i * 80, () => {
        if (!this.sys.isActive()) return;
        this.createSpark(
          width / 2 + (Math.random() - 0.5) * 350,
          height / 2 - 120 + Math.random() * 200,
          '#fde68a'
        );
      });
    }

    this.time.delayedCall(1200, () => {
      this.onWin({
        score: this.score,
        completionTime: this.completionTime,
      });
      this.scene.pause();
    });
  }

  loseGame() {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.bossActive = false;

    this.player.setTint(0xff0000);
    this.player.setVelocity(0);
    this.player.body.setAllowGravity(false);

    AudioSynth.stopBGM();
    AudioSynth.playSFX('gameover');

    this.completionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.onLose({
      score: this.score,
      completionTime: this.completionTime,
    });
  }
}
