import Phaser from "phaser";
import AudioSynth from "./AudioSynth";

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  init(data) {
    const source = data?.blueprint ? data : window.__dream2play_data || {};

    const rawBlueprint = source.blueprint || {
      hero: "Explorer",
      world: "Surreal Void",
      genre: "platformer",
      enemies: ["Dream Shadow"],
      boss: "Nightmare Core",
      objective: "Collect energy shards",
      powerups: ["Speed surge"],
      mood: "Adventure",
      difficulty: "Medium",
      colors: {
        bg: "#0a0b10",
        accent: "#8b5cf6",
        secondary: "#06b6d4",
        hazard: "#f43f5e",
        player: "#22c55e",
        text: "#ffffff",
      },
      physics: { gravity: 300, speed: 200, jump: -350, bounce: 0.1 },
      stories: {
        intro: "Welcome to the dream.",
        mission: "Collect shards.",
        ending: "You won!",
      },
    };

    // Deep clone blueprint to prevent state leakage on deaths / restarts
    this.blueprint = JSON.parse(JSON.stringify(rawBlueprint));

    this.stages =
      Array.isArray(this.blueprint.stages) && this.blueprint.stages.length
        ? this.blueprint.stages
        : [];
    if (!this.stages.length) {
      console.warn(
        "[DEBUG] Blueprint stages array is empty or invalid. Creating a fallback stage.",
      );
      this.stages = [
        {
          stageNumber: 1,
          environment: "Dream World",
          objective: "Explore and collect shards",
          blocks: [
            {
              id: "fallback_ground_1",
              x: 200,
              y: 420,
              width: 400,
              height: 30,
              type: "ground",
            },
            {
              id: "fallback_ground_2",
              x: 600,
              y: 420,
              width: 400,
              height: 30,
              type: "ground",
            },
          ],
          enemies: [],
          boss: null,
          completionCondition: "Collect shards",
        },
      ];
    }

    this.currentStageIndex = 0;
    this.genre = (this.blueprint.genre || "platformer").toLowerCase();

    // Game states
    this.score = 0;
    this.health = 100;
    this.bossHealth = 100;
    this.bossMaxHealth = 100;
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
  }

  getCurrentStage() {
    return this.stages[this.currentStageIndex] || this.stages[0];
  }

  getCurrentBossName() {
    return (
      this.getCurrentStage()?.boss?.name || this.blueprint.boss || "Overlord"
    );
  }

  getCurrentObjective() {
    return (
      this.getCurrentStage()?.objective ||
      this.blueprint.objective ||
      "Complete the level."
    );
  }

  getStageRequiredScore() {
    return 30 + this.currentStageIndex * 20;
  }

  preload() {
    const assets = this.blueprint.assets;
    if (assets) {
      if (assets.hero) this.load.image("player_tex", assets.hero);
      if (assets.enemy) this.load.image("enemy_tex", assets.enemy);
      if (assets.boss) this.load.image("boss_tex", assets.boss);
      if (assets.collectible)
        this.load.image("collect_tex", assets.collectible);
      if (assets.background)
        this.load.image("background_tex", assets.background);
    }

    this.generateTextures();
  }

  create() {
    AudioSynth.playBGM(this.blueprint.mood || "Adventure");

    const width = this.scale.width;
    const height = this.scale.height;

    // Extend world bounds horizontally for progression, disabling bottom boundary collision
    this.physics.world.setBounds(0, 0, 99999, height, true, true, true, false);
    this.cameras.main.setBounds(0, 0, 99999, height);

    if (this.textures.exists("background_tex")) {
      const bg = this.add.tileSprite(0, 0, 99999, height, "background_tex");
      bg.setOrigin(0, 0);
      bg.setScrollFactor(0.2);
      bg.setScale(height / bg.height);
    } else {
      this.cameras.main.setBackgroundColor(
        this.blueprint.colors?.bg || "#0a0b10",
      );
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
      this.genre.includes("driving") ||
      this.genre.includes("racing") ||
      this.genre.includes("runner");
    const pGrav = isNoGravityGenre
      ? 0
      : this.blueprint.player?.gravity !== undefined
        ? this.blueprint.player.gravity
        : 300;
    const pBounce =
      this.blueprint.physics?.bounce !== undefined
        ? this.blueprint.physics.bounce
        : 0.1;

    // Spawn Player
    const playerStartY = this.genre.includes("runner")
      ? 250
      : this.genre.includes("driving") || this.genre.includes("racing")
        ? 360
        : height - 150;
    this.player = this.physics.add.sprite(100, playerStartY, "player_tex");
    this.player.setDisplaySize(32, 32);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(pBounce);
    this.player.setGravityY(pGrav);

    this.canDoubleJump =
      this.blueprint.mood === "Fantasy" || this.blueprint.mood === "Adventure";
    this.jumpCount = 0;

    // Create road background if racing/driving
    if (this.genre.includes("driving") || this.genre.includes("racing")) {
      this.createRoadTexture();
    }

    // Load platforms/hazards/collectibles/enemies from blueprint coordinates
    this.generateLevel(width, height);

    // Colliders
    this.physics.add.collider(this.player, this.platforms, () => {
      this.jumpCount = 0;
    });
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      this.collectItem,
      null,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.hazards,
      this.hitHazard,
      null,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.hitEnemy,
      null,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.bossProjectiles,
      this.hitPlayerProjectile,
      null,
      this,
    );

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.shootEnemy,
      null,
      this,
    );
    this.physics.add.overlap(
      this.projectiles,
      this.platforms,
      this.destroyProjectile,
      null,
      this,
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyBackspace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
    );
    this.lastFired = 0;
    this.lastDash = 0;
    this.lastShield = 0;
    this.lastTriple = 0;
    this.shieldActive = false;
    this._shieldGraphic = null;

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -150, 50);

    // Battle Royale Storm Overlay
    if (this.genre === "battle_royale") {
      this.stormX = 0;
      this.stormWall = this.add
        .rectangle(0, height / 2, 10, height, 0xef4444, 0.35)
        .setScrollFactor(1)
        .setDepth(15);
      this.physics.add.existing(this.stormWall, true);
    }

    this.events.once("shutdown", this.shutdown, this);
    this.events.once("destroy", this.shutdown, this);

    this.createUI(width);

    // Reposition player precisely on top of the initial platform
    this.snapPlayerToPlatform();

    // Enable debug rendering for hitboxes (Task 1)
    this.physics.world.drawDebug = true;
    this.physics.world.createDebugGraphic();
  }

  update(time) {
    if (this.gameOverTriggered || this.stageCompleteTriggered) return;

    // Track shield graphic to follow player
    if (this.shieldActive && this._shieldGraphic) {
      this._shieldGraphic.setPosition(this.player.x, this.player.y);
      if (this._shieldGraphicBorder)
        this._shieldGraphicBorder.setPosition(this.player.x, this.player.y);
    }

    // Update power bar cooldowns
    this.updatePowerBar(time);

    const currentX = this.player.x;

    // --- GENRE MECHANICS CONTROLLER ---
    if (this.genre.includes("driving") || this.genre.includes("racing")) {
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
    } else if (this.genre === "endless_runner") {
      this.player.setGravityY(0);
      this.player.body.setAllowGravity(false);

      this.player.setVelocityX(200);

      const isUpJustPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.left);
      const isDownJustPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.right);

      if (isUpJustPressed) {
        this.currentTrack = Math.max(0, this.currentTrack - 1);
        AudioSynth.playSFX("jump");
      } else if (isDownJustPressed) {
        this.currentTrack = Math.min(2, this.currentTrack + 1);
        AudioSynth.playSFX("jump");
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
          AudioSynth.playSFX("jump");
          this.jumpCount = 1;
        } else if (this.canDoubleJump && this.jumpCount < 2) {
          this.player.setVelocityY(jumpForce * 0.9);
          AudioSynth.playSFX("jump");
          this.jumpCount = 2;
          this.createSpark(this.player.x, this.player.y, "#ffffff");
        }
      }
    }

    // Shrinking zone (Battle Royale)
    if (this.genre === "battle_royale") {
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

    // Debug/Cheat: Press Backspace to instantly defeat the boss
    if (
      Phaser.Input.Keyboard.JustDown(this.keyBackspace) &&
      this.boss &&
      this.boss.active
    ) {
      this.defeatBoss(this.boss);
    }

    // Spawn Boss based on blueprint coordinates trigger
    const stage = this.getCurrentStage();
    if (stage.boss && !stage.boss.defeated && !this.bossSpawned) {
      const triggerX = (stage.boss.x || 2500) - 500;
      if (this.player.x >= triggerX) {
        this.spawnBoss();
      }
    }

    // Boss loop
    if (this.bossActive && this.boss && this.boss.active) {
      let fireChance = 0.02;
      let oscSpeed = 400;
      let oscAmp = 100;

      const currentHP =
        typeof this.boss.health === "number"
          ? this.boss.health
          : this.bossHealth;

      if (currentHP <= 69) {
        fireChance = 0.07;
        oscSpeed = 200;
        oscAmp = 150;
      } else if (currentHP <= 139) {
        fireChance = 0.04;
        oscSpeed = 300;
        oscAmp = 120;
      } else {
        fireChance = 0.02;
        oscSpeed = 400;
        oscAmp = 100;
      }

      this.boss.y = 200 + Math.sin(time / oscSpeed) * oscAmp;
      this.boss.x = this.player.x + 450;

      if (Math.random() < fireChance) {
        this.fireBossLaser();
      }
    }

    // Patrol/Chase enemies — move + fall-into-gap elimination
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;

      // ── Gap Fall Kill ──────────────────────────────────────────────────
      if (enemy.y > this.scale.height + 80) {
        const enemyState = enemy.getData("stateObject");
        if (enemyState) {
          enemyState.hp = 0;
          enemyState.alive = false;
          enemyState.defeated = true;
        }
        this.score += 20;
        this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);
        this.createSpark(enemy.x, this.scale.height - 20, "#ef4444");
        enemy.destroy();
        this.updateObjectivesHUD();
        this.checkStageCompletion();
        return;
      }

      const type = enemy.getData("type");

      if (type === "zombie" || type === "chase") {
        // Chase: follow player horizontally
        const dir = this.player.x - enemy.x;
        enemy.setVelocityX(Math.sign(dir) * 75);
      } else if (type === "traffic") {
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

    // ── Player gap / void fall → immediate Game Over ─────────────────────
    if (this.player?.active && this.player.y > this.scale.height + 50) {
      if (this._bossDefeating) return;
      console.log(
        "[DEBUG] Player fell into void at y=",
        Math.round(this.player.y),
        "— triggering Game Over",
      );
      this.loseGame();
      return;
    }

    // Call unstuck protection (Task 5)
    this.checkUnstuckProtection(time);
  }

  snapPlayerToPlatform() {
    if (!this.player || !this.player.active) return;

    const isNoGravityGenre =
      this.genre.includes("driving") ||
      this.genre.includes("racing") ||
      this.genre.includes("runner");

    if (!isNoGravityGenre) {
      let platformUnder = null;
      let highestYUnder = 99999;
      this.platforms.getChildren().forEach((p) => {
        const pb = p.getBounds();
        if (100 >= pb.left && 100 <= pb.right) {
          if (pb.top < highestYUnder) {
            highestYUnder = pb.top;
            platformUnder = p;
          }
        }
      });

      if (platformUnder) {
        this.player.y = highestYUnder - 16;
        if (this.player.body) {
          this.player.body.y = highestYUnder - 32;
        }
        console.log("[DEBUG] Snapped player to platform at Y:", this.player.y);
      }
    }
  }

  checkUnstuckProtection(time) {
    if (!this.player || !this.player.active || !this.player.body) return;

    const isNoGravity =
      this.genre.includes("driving") ||
      this.genre.includes("racing") ||
      this.genre.includes("runner");

    // Check if any movement keys are pressed
    const keysPressed =
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.cursors.up.isDown ||
      this.cursors.down.isDown;

    // Check if velocity is virtually 0
    const isStuckSpeed =
      Math.abs(this.player.body.velocity.x) < 5 &&
      (isNoGravity ? true : Math.abs(this.player.body.velocity.y) < 5);

    if (keysPressed && isStuckSpeed) {
      if (!this.unstuckTimer) {
        this.unstuckTimer = time;
      } else if (time - this.unstuckTimer >= 2000) {
        console.warn(
          "[DEBUG] Unstuck protection triggered: Repositioning player safely.",
        );
        this.createSpark(this.player.x, this.player.y, "#f43f5e"); // show red spark at old position

        // Safe repositioning: move up by 64px and forward by 64px
        this.player.y -= 64;
        this.player.x += 64;
        this.player.setVelocity(0, 0);

        if (this.player.body) {
          this.player.body.y -= 64;
          this.player.body.x += 64;
          this.player.body.setVelocity(0, 0);
        }

        this.createSpark(this.player.x, this.player.y, "#22c55e"); // show green spark at new position
        this.unstuckTimer = 0;
      }
    } else {
      this.unstuckTimer = 0;
    }
  }

  // --- SPRITE GENERATORS (10-type Dynamic Atlas) ---
  generateTextures() {
    const gc = this.add.graphics();
    const colors = this.blueprint.colors || {
      bg: "#0a0b10",
      accent: "#8b5cf6",
      secondary: "#06b6d4",
      hazard: "#f43f5e",
      player: "#22c55e",
      text: "#ffffff",
    };
    const pColor = Phaser.Display.Color.HexStringToColor(colors.player).color;
    const aColor = Phaser.Display.Color.HexStringToColor(colors.accent).color;
    const hColor = Phaser.Display.Color.HexStringToColor(colors.hazard).color;
    const sColor = Phaser.Display.Color.HexStringToColor(
      colors.secondary,
    ).color;

    const subType = (
      this.blueprint.player?.subType ||
      this.blueprint.intent?.subType ||
      ""
    ).toLowerCase();

    if (!this.textures.exists("player_tex")) {
      gc.clear();

      if (
        subType === "car" ||
        this.genre.includes("driving") ||
        this.genre.includes("racing")
      ) {
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
        gc.generateTexture("player_tex", 52, 34);
      } else if (subType === "motorcycle") {
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
        gc.generateTexture("player_tex", 52, 34);
      } else if (subType === "aircraft") {
        // ── FIGHTER JET ──
        gc.fillStyle(pColor);
        gc.fillTriangle(26, 0, 52, 20, 0, 20); // nose
        gc.fillRect(10, 12, 32, 10); // fuselage
        gc.fillStyle(aColor);
        gc.fillTriangle(8, 14, 0, 28, 20, 22); // left wing
        gc.fillTriangle(44, 14, 52, 28, 32, 22); // right wing
        gc.fillStyle(hColor, 0.9);
        gc.fillRect(20, 18, 12, 4); // cockpit
        gc.generateTexture("player_tex", 52, 34);
      } else if (subType === "spacecraft") {
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
        gc.generateTexture("player_tex", 52, 34);
      } else if (subType === "ninja") {
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
        gc.generateTexture("player_tex", 32, 34);
      } else if (subType === "soldier") {
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
        gc.generateTexture("player_tex", 40, 34);
      } else if (subType === "superhero") {
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
        gc.generateTexture("player_tex", 36, 34);
      } else if (subType === "human_female") {
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
        gc.generateTexture("player_tex", 32, 34);
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
        gc.generateTexture("player_tex", 32, 36);
      }
    }

    // ── ENEMY SPRITES (adapt to genre theme) ──
    if (!this.textures.exists("enemy_tex")) {
      gc.clear();
      if (
        this.genre.includes("driving") ||
        this.genre.includes("racing") ||
        this.genre.includes("bike")
      ) {
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
        gc.generateTexture("enemy_tex", 52, 34);
      } else if (this.genre === "survival") {
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
        gc.generateTexture("enemy_tex", 32, 36);
      } else if (this.genre === "battle_royale" || this.genre === "shooter") {
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
        gc.generateTexture("enemy_tex", 40, 34);
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
        gc.generateTexture("enemy_tex", 32, 34);
      }
    }

    // ── BOSS SPRITE ──
    if (!this.textures.exists("boss_tex")) {
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

      gc.generateTexture("boss_tex", 84, 84);
    }

    // ── COLLECTIBLE SPRITE ──
    if (!this.textures.exists("collect_tex")) {
      gc.clear();
      gc.fillStyle(sColor);
      if (this.genre.includes("driving") || this.genre.includes("racing")) {
        // Fuel canister
        gc.fillRect(4, 4, 16, 20);
        gc.fillRect(8, 0, 8, 4);
        gc.fillStyle(aColor, 0.7);
        gc.fillRect(6, 8, 12, 4);
      } else if (this.genre === "survival") {
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
      gc.generateTexture("collect_tex", 24, 24);
    }

    // ── HAZARD SPIKE SPRITE ──
    if (!this.textures.exists("spike_tex")) {
      gc.clear();
      gc.fillStyle(hColor);
      gc.fillTriangle(16, 0, 32, 32, 0, 32);
      gc.fillStyle(hColor, 0.5);
      gc.fillTriangle(10, 6, 22, 6, 16, 0);
      gc.generateTexture("spike_tex", 32, 32);
    }

    // ── PLATFORM SPRITE ──
    if (!this.textures.exists("platform_tex")) {
      gc.clear();
      gc.fillStyle(sColor, 0.35);
      gc.fillRect(0, 0, 64, 20);
      gc.lineStyle(2, aColor, 0.8);
      gc.strokeRect(0, 0, 64, 20);
      gc.fillStyle(aColor, 0.12);
      gc.fillRect(4, 4, 56, 12);
      gc.generateTexture("platform_tex", 64, 20);
    }

    gc.destroy();
  }

  createRoadTexture() {
    if (this.textures.exists("road_tex")) return;

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

    roadGraphics.generateTexture("road_tex", 512, 72);
    roadGraphics.destroy();
  }

  createBackgroundElements(height) {
    const numElements = 40;
    const colors = this.blueprint.colors || {
      bg: "#0a0b10",
      accent: "#8b5cf6",
      secondary: "#06b6d4",
      hazard: "#f43f5e",
      player: "#22c55e",
      text: "#ffffff",
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
        ease: "Sine.easeInOut",
      });
    }
  }

  // --- RENDER DYNAMIC LEVEL ---
  // ── VALIDATION LAYER: called before any sprites are created ─────────────
  validateAndRepairStage(stage, width, height) {
    if (!stage) {
      console.warn("[DEBUG] validateAndRepairStage: stage is null, skipping.");
      return;
    }

    const isNoGravityGenre =
      this.genre.includes("driving") ||
      this.genre.includes("racing") ||
      this.genre.includes("runner");
    const groundY = height - 30;
    // Max horizontal distance the player can cover in a full jump arc
    // At speed=220 and jumpForce=-350, gravity=300: apex time ≈ 350/300 = 1.17s, total arc ≈ 2.33s
    const maxJumpWidth = Math.round(
      (this.blueprint.player?.speed || 220) *
        ((-2 * (this.blueprint.player?.jumpForce || -350)) /
          (this.blueprint.player?.gravity || 300)),
    );

    const playerStartY = this.genre.includes("runner")
      ? 250
      : this.genre.includes("driving") || this.genre.includes("racing")
        ? 360
        : height - 150;

    // --- Validate blocks ---
    if (Array.isArray(stage.blocks)) {
      const before = stage.blocks.length;
      stage.blocks = stage.blocks.filter((block) => {
        if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) {
          console.warn(
            "[DEBUG] Dropped block with invalid coords:",
            block.id || "unknown",
          );
          return false;
        }
        if (!Number.isFinite(block.width) || block.width <= 0)
          block.width = 128;
        if (!Number.isFinite(block.height) || block.height <= 0)
          block.height = 20;

        // Prevent block from spawning inside player spawn column (x: 50-150)
        const halfW = block.width / 2;
        const halfH = block.height / 2;
        const left = block.x - halfW;
        const right = block.x + halfW;

        const overlapX = left < 150 && right > 50;
        if (overlapX) {
          if (
            (block.type === "ground" || block.type === "solid") &&
            block.y >= playerStartY + 16
          ) {
            return true; // allow floor block safely below player spawn point
          }
          console.warn(
            "[DEBUG] Removed block in player spawn column:",
            block.id,
          );
          return false;
        }
        return true;
      });
      const dropped = before - stage.blocks.length;
      if (dropped > 0)
        console.warn(
          "[DEBUG] Dropped",
          dropped,
          "blocks with bad coordinates or spawn overlap in stage",
          stage.stageNumber,
        );

      // Auto-repair impossible gaps in gravity-based genres
      if (!isNoGravityGenre) {
        const groundBlocks = stage.blocks
          .filter(
            (b) =>
              (b.type === "ground" || b.type === "solid") && b.y > height * 0.5,
          )
          .sort((a, b) => a.x - b.x);

        const repairs = [];
        const targetDist = maxJumpWidth * 0.8; // safe jumping distance (80% of max jump width)
        for (let i = 0; i < groundBlocks.length - 1; i++) {
          const curr = groundBlocks[i];
          const next = groundBlocks[i + 1];
          const currRight = curr.x + (curr.width || 128) / 2;
          const nextLeft = next.x - (next.width || 128) / 2;
          const gap = nextLeft - currRight;
          if (gap > maxJumpWidth) {
            let tempRight = currRight;
            let bridgeCounter = 0;
            while (nextLeft - tempRight > maxJumpWidth) {
              const bridgeX = tempRight + targetDist;
              if (bridgeX + 64 >= nextLeft) {
                // The remaining gap is jumpable to nextLeft without another bridge
                break;
              }
              repairs.push({
                id: `bridge_repair_${stage.stageNumber}_${i}_${bridgeCounter++}`,
                x: bridgeX,
                y: groundY,
                width: 128,
                height: 20,
                type: "ground",
              });
              tempRight = bridgeX + 64; // right edge of the newly inserted bridge
            }
            if (bridgeCounter > 0) {
              console.log(
                "[DEBUG] Stage",
                stage.stageNumber,
                ": inserted",
                bridgeCounter,
                "bridge(s) to close",
                Math.round(gap),
                "px gap (max=",
                maxJumpWidth,
                "px)",
              );
            }
          }
        }
        stage.blocks.push(...repairs);
      }
    }

    // --- Validate enemies ---
    if (Array.isArray(stage.enemies)) {
      const seenIds = new Set();
      const before = stage.enemies.length;
      stage.enemies = stage.enemies.filter((e) => {
        // Remove enemies with invalid coordinates
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) {
          console.warn(
            "[DEBUG] Dropped enemy with bad coords:",
            e.name || e.id,
          );
          return false;
        }
        // Remove duplicate IDs
        if (seenIds.has(e.id)) {
          console.warn("[DEBUG] Dropped duplicate enemy ID:", e.id);
          return false;
        }
        seenIds.add(e.id);

        // Prevent enemy from spawning inside player spawn column (x: 50-150)
        const overlapPlayerX = e.x - 16 < 150 && e.x + 16 > 50;
        if (overlapPlayerX) {
          console.warn(
            "[DEBUG] Removed enemy overlapping player spawn column:",
            e.id || e.name,
          );
          return false;
        }

        // Ensure entity does not spawn inside solid blocks/walls
        let insideSolid = false;
        stage.blocks.forEach((block) => {
          if (block.type === "solid") {
            const halfW = block.width / 2;
            const halfH = block.height / 2;
            const left = block.x - halfW;
            const right = block.x + halfW;
            const top = block.y - halfH;
            const bottom = block.y + halfH;
            if (e.x > left && e.x < right && e.y > top && e.y < bottom) {
              insideSolid = true;
            }
          }
        });
        if (insideSolid) {
          console.warn(
            "[DEBUG] Removed enemy inside solid terrain:",
            e.id || e.name,
          );
          return false;
        }

        // Align enemies to the platform underneath them to avoid floating/jitter
        if (!isNoGravityGenre) {
          let platformUnder = null;
          let highestYUnder = 99999;
          stage.blocks.forEach((block) => {
            if (block.type === "ground" || block.type === "solid") {
              const halfW = block.width / 2;
              if (e.x >= block.x - halfW && e.x <= block.x + halfW) {
                const platformTop = block.y - block.height / 2;
                if (e.y <= platformTop + 5 && platformTop < highestYUnder) {
                  highestYUnder = platformTop;
                  platformUnder = block;
                }
              }
            }
          });

          if (platformUnder) {
            const platformTop = platformUnder.y - platformUnder.height / 2;
            e.y = platformTop - 16; // Align enemy bottom exactly on platform top
          } else {
            if (e.y >= groundY - 5) {
              e.y = groundY - 31; // Align to ground platform top
            }
          }
        }
        return true;
      });
      const dropped = before - stage.enemies.length;
      if (dropped > 0)
        console.warn(
          "[DEBUG] Dropped",
          dropped,
          "invalid enemies in stage",
          stage.stageNumber,
        );
    }

    // --- Validate boss ---
    if (stage.boss) {
      if (!Number.isFinite(stage.boss.x)) stage.boss.x = 2600;
      if (!Number.isFinite(stage.boss.y)) stage.boss.y = 200;
      if (typeof stage.boss.hp !== "number" || stage.boss.hp <= 0)
        stage.boss.hp = 200;
      if (typeof stage.boss.maxHp !== "number" || stage.boss.maxHp <= 0)
        stage.boss.maxHp = 200;
      console.log(
        "[DEBUG] Boss validated:",
        stage.boss.name,
        "@ (",
        Math.round(stage.boss.x),
        ",",
        Math.round(stage.boss.y),
        ") HP:",
        stage.boss.hp,
      );
    }

    console.log(
      "[DEBUG] Stage",
      stage.stageNumber,
      "validation complete —",
      stage.blocks?.length || 0,
      "blocks,",
      stage.enemies?.length || 0,
      "enemies,",
      stage.boss ? `boss: ${stage.boss.name}` : "no boss",
    );
  }

  generateLevel(width, height) {
    const stage = this.getCurrentStage();
    if (!stage) {
      console.warn("[DEBUG] generateLevel: stage is null/undefined, skipping.");
      return;
    }

    // Run validation and auto-repair BEFORE creating any physics objects
    this.validateAndRepairStage(stage, width, height);

    const isRoad =
      this.genre.includes("driving") || this.genre.includes("racing");

    if (Array.isArray(stage.blocks)) {
      stage.blocks.forEach((block) => {
        if (block.type === "ground" || block.type === "solid") {
          const tex =
            block.type === "ground" && isRoad ? "road_tex" : "platform_tex";
          const p = this.platforms.create(block.x, block.y, tex);
          if (block.width && block.height) {
            p.setDisplaySize(block.width, block.height);
          }
          p.refreshBody();
        } else if (block.type === "hazard") {
          const spike = this.hazards.create(block.x, block.y, "spike_tex");
          if (block.width && block.height) {
            spike.setDisplaySize(block.width, block.height);
          }
          spike.refreshBody();
        } else if (
          block.type === "collectible" ||
          block.type === "puzzle_piece"
        ) {
          const shard = this.collectibles.create(
            block.x,
            block.y,
            "collect_tex",
          );
          shard.setDisplaySize(block.width || 24, block.height || 24);

          if (
            this.genre.includes("driving") ||
            this.genre.includes("racing") ||
            this.genre.includes("runner")
          ) {
            shard.body.setAllowGravity(false);
          } else {
            shard.setGravityY(100);
            shard.setBounceY(0.3);
            this.physics.add.collider(shard, this.platforms);
          }
        }
      });
    }

    // Ensure the floor continues all the way until the boss is defeated (up to x = 6500)
    const isNoGravityGenre =
      this.genre.includes("driving") ||
      this.genre.includes("racing") ||
      this.genre.includes("runner");
    if (!isNoGravityGenre) {
      let maxX = 0;
      let groundY = height - 30; // default ground Y (420 for height 450)
      if (Array.isArray(stage.blocks)) {
        stage.blocks.forEach((block) => {
          if (block.type === "ground" || block.type === "solid") {
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
        const p = this.platforms.create(bx, groundY, "platform_tex");
        p.setDisplaySize(blockW, 30);
        p.refreshBody();
      }
    }

    if (Array.isArray(stage.enemies)) {
      const isNoGravity =
        this.genre.includes("driving") ||
        this.genre.includes("racing") ||
        this.genre.includes("runner");
      const pGrav = isNoGravity
        ? 0
        : this.blueprint.player?.gravity !== undefined
          ? this.blueprint.player.gravity
          : 300;

      stage.enemies.forEach((enemyData) => {
        if (enemyData.defeated) return;

        const enemySprite = this.enemies.create(
          enemyData.x,
          enemyData.y,
          "enemy_tex",
        );

        if (this.genre.includes("driving") || this.genre.includes("racing")) {
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

        if (enemyData.type === "traffic") {
          enemySprite.setVelocityX(-120);
        } else {
          // Give patrol enemies a slight initial velocity
          enemySprite.setVelocityX(Math.random() < 0.5 ? -60 : 60);
        }

        enemySprite.setData("stateObject", enemyData);
        enemySprite.setData("type", enemyData.type || "patrol");
      });
    }
  }

  // --- UI HUD ---
  createUI(width) {
    const textColors = this.blueprint.colors || { text: "#ffffff" };
    const style = {
      font: "bold 16px Outfit, sans-serif",
      fill: textColors.text,
    };
    const labelStyle = { font: "12px Outfit, sans-serif", fill: "#888888" };

    // Resolve score label from blueprint (set by dynamic analyzer)
    this._scoreLabel =
      this.blueprint.intent?.scoreLabel ||
      (this.genre.includes("driving") || this.genre.includes("racing")
        ? "SPEED"
        : this.genre.includes("runner")
          ? "COINS"
          : "SHARDS");

    this.uiContainer = this.add
      .container(20, 20)
      .setScrollFactor(0)
      .setDepth(20);

    this.scoreText = this.add.text(0, 0, `${this._scoreLabel}: 0`, style);
    this.uiContainer.add(this.scoreText);

    const curStage = this.getCurrentStage();
    const stageEnvName = curStage
      ? curStage.environment || `Stage ${this.currentStageIndex + 1}`
      : "Stage 1";
    this.stageText = this.add.text(
      0,
      25,
      `STAGE ${this.currentStageIndex + 1}/${this.stages.length}: ${stageEnvName}`,
      labelStyle,
    );
    this.uiContainer.add(this.stageText);

    this.objectiveText = this.add.text(
      0,
      42,
      `MISSION: ${this.getCurrentObjective()}`,
      labelStyle,
    );
    this.uiContainer.add(this.objectiveText);

    // Dynamic stage checklist panel
    this.objectiveTitleText = this.add.text(0, 65, "STAGE OBJECTIVES:", {
      font: "bold 11px Outfit, sans-serif",
      fill: "#fbbf24",
    });
    this.uiContainer.add(this.objectiveTitleText);

    this.shardsStatusText = this.add.text(10, 80, "", {
      font: "11px Outfit, sans-serif",
      fill: "#94a3b8",
    });
    this.uiContainer.add(this.shardsStatusText);

    this.enemiesStatusText = this.add.text(10, 95, "", {
      font: "11px Outfit, sans-serif",
      fill: "#94a3b8",
    });
    this.uiContainer.add(this.enemiesStatusText);

    this.bossStatusText = this.add.text(10, 110, "", {
      font: "11px Outfit, sans-serif",
      fill: "#94a3b8",
    });
    this.uiContainer.add(this.bossStatusText);

    const hbBg = this.add.graphics();
    hbBg.fillStyle(0x222222, 0.8);
    hbBg.fillRect(width - 220, 0, 200, 16);
    this.uiContainer.add(hbBg);

    this.healthBar = this.add.graphics();
    this.uiContainer.add(this.healthBar);
    this.updateHealthBar();

    this.healthText = this.add.text(width - 220, 20, "HEALTH: 100%", {
      font: "bold 12px Outfit, sans-serif",
      fill: "#ffffff",
    });
    this.uiContainer.add(this.healthText);

    this.bossUI = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);

    this.bossLabel = this.add.text(
      width / 2 - 100,
      10,
      `BOSS: ${this.getCurrentBossName().toUpperCase()}`,
      {
        font: "bold 14px Outfit, sans-serif",
        fill: "#ff3333",
      },
    );
    this.bossUI.add(this.bossLabel);

    const bBarBg = this.add.graphics();
    bBarBg.fillStyle(0x222222, 0.8);
    bBarBg.fillRect(width / 2 - 150, 30, 300, 12);
    this.bossUI.add(bBarBg);

    this.bossHealthBar = this.add.graphics();
    this.bossUI.add(this.bossHealthBar);

    this.updateObjectivesHUD();

    // ── POWER BAR HUD (bottom-right) ─────────────────────────────────────
    const pw = width;
    const powers = [
      { key: "Q", label: "DASH", color: "#00e5ff" },
      { key: "E", label: "SHIELD", color: "#a78bfa" },
      { key: "R", label: "TRIPLE", color: "#06b6d4" },
    ];

    this.powerBarContainer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(25);
    this._powerSlots = [];

    powers.forEach((p, i) => {
      const bx = pw - 210 + i * 68;
      const by = this.scale.height - 50;

      // Background pill
      const bg = this.add.graphics();
      bg.fillStyle(0x0f172a, 0.85);
      bg.fillRoundedRect(bx, by, 58, 36, 8);
      bg.lineStyle(
        2,
        Phaser.Display.Color.HexStringToColor(p.color).color,
        0.6,
      );
      bg.strokeRoundedRect(bx, by, 58, 36, 8);
      this.powerBarContainer.add(bg);

      // Cooldown fill
      const fillGfx = this.add.graphics();
      this.powerBarContainer.add(fillGfx);

      // Key label
      const keyTxt = this.add.text(bx + 6, by + 4, `[${p.key}]`, {
        font: "bold 10px Outfit, sans-serif",
        fill: p.color,
      });
      this.powerBarContainer.add(keyTxt);

      // Power name
      const nameTxt = this.add.text(bx + 6, by + 18, p.label, {
        font: "9px Outfit, sans-serif",
        fill: "#cbd5e1",
      });
      this.powerBarContainer.add(nameTxt);

      this._powerSlots.push({ bg, fillGfx, color: p.color, bx, by });
    });
  }

  updateHealthBar() {
    this.healthBar.clear();
    const hpColor = this.health > 40 ? 0x22c55e : 0xef4444;
    this.healthBar.fillStyle(hpColor, 1);
    this.healthBar.fillRect(
      this.scale.width - 220,
      0,
      (this.health / 100) * 200,
      16,
    );
  }

  // Redraw power slot cooldown overlays
  updatePowerBar(time) {
    if (!this._powerSlots) return;
    const cooldowns = [
      this.lastDash - 1800,
      this.lastShield - 5000,
      this.lastTriple - 1200,
    ];
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
    const maxHP =
      this.boss && typeof this.boss.maxHealth === "number"
        ? this.boss.maxHealth
        : 200;
    const currentHP =
      this.boss && typeof this.boss.health === "number"
        ? this.boss.health
        : this.bossHealth;
    this.bossHealthBar.fillRect(
      this.scale.width / 2 - 150,
      30,
      Math.max(0, currentHP / maxHP) * 300,
      12,
    );

    if (this.boss?.active) {
      let phaseText = "Phase 1";
      if (currentHP <= 69) {
        phaseText = "Phase 3 (Enraged)";
      } else if (currentHP <= 139) {
        phaseText = "Phase 2 (Aggressive)";
      }
      const stageBossName = this.getCurrentBossName();
      this.bossLabel.setText(
        `BOSS: ${stageBossName.toUpperCase()} [${phaseText}]`,
      );
    }
  }

  updateObjectivesHUD() {
    const stage = this.getCurrentStage();
    if (!stage) {
      if (this.shardsStatusText)
        this.shardsStatusText.setText("• Objective: Complete the level");
      if (this.enemiesStatusText) this.enemiesStatusText.setVisible(false);
      if (this.bossStatusText) this.bossStatusText.setVisible(false);
      return;
    }
    const reqScore = this.getStageRequiredScore();
    const scoreLabel =
      this.genre.includes("driving") || this.genre.includes("racing")
        ? "Speed/Score"
        : this.genre.includes("runner")
          ? "Coins"
          : "Shards";

    const scoreOk = this.score >= reqScore;
    if (this.shardsStatusText) {
      this.shardsStatusText.setText(
        `• ${scoreLabel}: ${this.score} / ${reqScore} ${scoreOk ? "✔" : "⏳"}`,
      );
      this.shardsStatusText.setFill(scoreOk ? "#86efac" : "#94a3b8");
    }

    const totalEnemies = Array.isArray(stage.enemies)
      ? stage.enemies.length
      : 0;
    const remainingEnemies = Array.isArray(stage.enemies)
      ? stage.enemies.filter((e) => !e.defeated).length
      : 0;
    const enemiesOk = remainingEnemies === 0;

    if (totalEnemies > 0) {
      if (this.enemiesStatusText) {
        this.enemiesStatusText.setText(
          `• Hostiles: ${remainingEnemies} / ${totalEnemies} remaining ${enemiesOk ? "✔" : "⏳"}`,
        );
        this.enemiesStatusText.setFill(enemiesOk ? "#86efac" : "#94a3b8");
        this.enemiesStatusText.setVisible(true);
      }
    } else {
      if (this.enemiesStatusText) this.enemiesStatusText.setVisible(false);
    }

    if (stage.boss) {
      const bossDefeated = stage.boss.defeated;
      if (this.bossStatusText) {
        this.bossStatusText.setText(
          `• Boss [${stage.boss.name}]: ${bossDefeated ? "Defeated ✔" : "Hostile ⏳"}`,
        );
        this.bossStatusText.setFill(bossDefeated ? "#86efac" : "#fca5a5");
        this.bossStatusText.setVisible(true);
      }
    } else {
      if (this.bossStatusText) this.bossStatusText.setVisible(false);
    }
  }

  // --- INTERACTIONS & STATE UPDATE ---
  collectItem(player, item) {
    item.destroy();
    this.score += 10;

    this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);

    AudioSynth.playSFX("collect");
    const color = this.blueprint.colors?.secondary || "#06b6d4";
    this.createSpark(item.x, item.y, color);

    this.updateObjectivesHUD();
    this.checkStageCompletion();
  }

  hitHazard(player, spike) {
    if (
      this.genre.includes("driving") ||
      this.genre.includes("racing") ||
      this.genre.includes("runner")
    ) {
      this.damagePlayer(25);
      this.player.x -= 80;
    } else {
      player.setVelocityY(-200);
      player.setVelocityX(player.body.velocity.x > 0 ? -120 : 120);
      this.damagePlayer(25);
    }
  }

  hitEnemy(player, enemySprite) {
    // Guard: skip if either sprite is already gone
    if (!enemySprite || !enemySprite.active) return;
    const enemyState = enemySprite.getData("stateObject");
    if (!enemyState || enemyState.defeated) return;

    // Capture position BEFORE destroying the sprite to prevent use-after-destroy
    const ex = enemySprite.x;
    const ey = enemySprite.y;

    if (this.genre.includes("driving") || this.genre.includes("racing")) {
      enemyState.hp = 0;
      enemyState.alive = false;
      enemyState.defeated = true;
      enemySprite.destroy();

      AudioSynth.playSFX("explosion");
      this.cameras.main.shake(200, 0.02);
      this.damagePlayer(30);
      this.createSpark(ex, ey, "#dc2626");

      this.updateObjectivesHUD();
      this.checkStageCompletion();
    } else if (player.y < ey - 15) {
      // Stomp kill
      enemyState.hp = 0;
      enemyState.alive = false;
      enemyState.defeated = true;
      enemySprite.destroy();

      player.setVelocityY(-220);
      AudioSynth.playSFX("explosion");
      this.score += 20;

      if (this.scoreText)
        this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);
      this.createSpark(ex, ey, "#ff4444");
      console.log(
        "[DEBUG] Enemy stomped at (",
        Math.round(ex),
        ",",
        Math.round(ey),
        ")",
      );

      this.updateObjectivesHUD();
      this.checkStageCompletion();
    } else {
      // Side-collision: player takes damage and gets knocked back
      player.setVelocityX(player.x < ex ? -150 : 150);
      this.damagePlayer(20);
    }
  }

  hitPlayerProjectile(player, laser) {
    laser.destroy();
    this.damagePlayer(6);
  }

  fireWeapon(time) {
    this.lastFired = time + 220;
    AudioSynth.playSFX("laser");

    // If boss is active, auto-aim toward the boss
    let velX;
    let velY = 0;
    if (this.bossActive && this.boss && this.boss.active) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        this.boss.x,
        this.boss.y,
      );
      const speed = 520;
      velX = Math.cos(angle) * speed;
      velY = Math.sin(angle) * speed;
    } else {
      const isFacingLeft = this.player.flipX;
      velX = isFacingLeft ? -480 : 480;
      velY = 0;
    }

    const laser = this.projectiles.create(
      this.player.x,
      this.player.y,
      "collect_tex",
    );
    laser.setScale(0.6);
    laser.body.setAllowGravity(false);
    laser.setVelocity(velX, velY);

    // Glow tint based on accent color
    const aHex = this.blueprint.colors?.accent || "#8b5cf6";
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
        this.createSpark(
          this.player.x - dir * i * 12,
          this.player.y,
          "#00e5ff",
        );
      });
    }
    AudioSynth.playSFX("jump");
  }

  // ── POWER: SHIELD ────────────────────────────────────────────────────
  doShield(time) {
    if (this.shieldActive) return;
    this.lastShield = time + 5000;
    this.shieldActive = true;

    const sColor = Phaser.Display.Color.HexStringToColor(
      this.blueprint.colors?.accent || "#8b5cf6",
    ).color;
    this._shieldGraphic = this.add.circle(
      this.player.x,
      this.player.y,
      28,
      sColor,
      0.35,
    );
    this._shieldGraphic.setDepth(18);
    this._shieldGraphicBorder = this.add.circle(
      this.player.x,
      this.player.y,
      28,
      0xffffff,
      0,
    );
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
    AudioSynth.playSFX("collect");
  }

  // ── POWER: TRIPLE SHOT ───────────────────────────────────────────────
  doTripleShot(time) {
    this.lastTriple = time + 1200;
    AudioSynth.playSFX("laser");

    const angles =
      this.bossActive && this.boss && this.boss.active
        ? [
            Phaser.Math.Angle.Between(
              this.player.x,
              this.player.y,
              this.boss.x,
              this.boss.y,
            ) - 0.15,
            Phaser.Math.Angle.Between(
              this.player.x,
              this.player.y,
              this.boss.x,
              this.boss.y,
            ),
            Phaser.Math.Angle.Between(
              this.player.x,
              this.player.y,
              this.boss.x,
              this.boss.y,
            ) + 0.15,
          ]
        : [
            this.player.flipX ? Math.PI + 0.15 : -0.15,
            this.player.flipX ? Math.PI : 0,
            this.player.flipX ? Math.PI - 0.15 : 0.15,
          ];

    const speed = 500;
    const aHex = this.blueprint.colors?.secondary || "#06b6d4";
    const aColor = Phaser.Display.Color.HexStringToColor(aHex).color;

    angles.forEach((angle) => {
      const shot = this.projectiles.create(
        this.player.x,
        this.player.y,
        "collect_tex",
      );
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
    if (!projectile || !projectile.active) return;
    if (!enemySprite || !enemySprite.active) return;

    if (projectile.body) projectile.body.enable = false;
    projectile.destroy();

    const enemyState = enemySprite.getData("stateObject");
    if (!enemyState) {
      enemySprite.destroy();
      return;
    }

    const damageAmount = 25;
    enemyState.hp = Math.max(0, enemyState.hp - damageAmount);

    enemySprite.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemySprite?.active) enemySprite.clearTint();
    });

    AudioSynth.playSFX("hurt");

    if (enemyState.hp <= 0) {
      enemyState.alive = false;
      enemyState.defeated = true;

      // Capture position BEFORE destroying to prevent use-after-destroy
      const ex = enemySprite.x;
      const ey = enemySprite.y;
      enemySprite.destroy();

      AudioSynth.playSFX("explosion");
      this.score += 20;

      if (this.scoreText)
        this.scoreText.setText(`${this._scoreLabel}: ${this.score}`);

      const color = this.blueprint.colors?.hazard || "#ef4444";
      this.createSpark(ex, ey, color);

      const stage = this.getCurrentStage();
      const remaining = Array.isArray(stage?.enemies)
        ? stage.enemies.filter((e) => !e.defeated).length
        : "?";
      console.log(
        "[DEBUG] Enemy shot-killed. Remaining enemies in stage:",
        remaining,
      );

      this.updateObjectivesHUD();
      this.checkStageCompletion();
    }
  }

  destroyProjectile(projectile, platform) {
    if (projectile?.active) {
      projectile.destroy();
    }
  }

  damagePlayer(amount) {
    if (
      this.gameOverTriggered ||
      this.stageCompleteTriggered ||
      this._bossDefeating
    )
      return;

    // Shield blocks all incoming damage
    if (this.shieldActive) {
      AudioSynth.playSFX("collect");
      if (this._shieldGraphic) {
        this._shieldGraphic.setAlpha(0.9);
        this.time.delayedCall(80, () => {
          if (this._shieldGraphic) this._shieldGraphic.setAlpha(0.35);
        });
      }
      return;
    }

    this.health = Math.max(0, this.health - amount);
    if (this.healthText)
      this.healthText.setText(`HEALTH: ${Math.floor(this.health)}%`);
    this.updateHealthBar();

    AudioSynth.playSFX("hurt");
    this.cameras.main.shake(150, 0.015);

    if (this.player?.active) {
      this.player.setTint(0xff0000);
      this.time.delayedCall(150, () => {
        if (this.player?.active) this.player.clearTint();
      });
    }

    if (this.health <= 0) {
      console.log("[DEBUG] Player health reached 0 - losing game");
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

    // Enforce exactly 200 HP for the boss
    this.bossMaxHealth = 200;
    this.bossHealth = 200;
    stageBoss.hp = 200;
    stageBoss.maxHp = 200;

    const bx = Number.isFinite(stageBoss.x) ? stageBoss.x : this.player.x + 450;
    const by = Number.isFinite(stageBoss.y) ? stageBoss.y : 200;

    this.boss = this.physics.add.sprite(bx, by, "boss_tex");
    this.boss.setDisplaySize(80, 80);
    this.boss.body.setAllowGravity(false);
    this.boss.setImmovable(true);

    // Set HP directly on the sprite
    this.boss.maxHealth = 200;
    this.boss.health = 200;

    this.boss.setData("stateObject", stageBoss);

    this.bossLabel.setText(`BOSS: ${stageBoss.name.toUpperCase()} [Phase 1]`);
    this.bossUI.setVisible(true);
    this.updateBossHealthBar();

    // Prevent duplicate overlap colliders
    if (this.bossOverlapCollider) {
      this.physics.world.removeCollider(this.bossOverlapCollider);
      this.bossOverlapCollider = null;
    }
    this.bossOverlapCollider = this.physics.add.overlap(
      this.projectiles,
      this.boss,
      this.hitBoss,
      null,
      this,
    );

    this.objectiveText.setText(
      `DEFEAT THE BOSS: ${stageBoss.name.toUpperCase()}`,
    );
    this.cameras.main.shake(300, 0.01);
  }

  fireBossLaser() {
    if (!this.boss || !this.boss.active) return;
    AudioSynth.playSFX("laser");

    const laser = this.bossProjectiles.create(
      this.boss.x - 45,
      this.boss.y,
      "enemy_tex",
    );
    laser.setScale(0.6);
    laser.body.setAllowGravity(false);

    const angle = Phaser.Math.Angle.Between(
      this.boss.x,
      this.boss.y,
      this.player.x,
      this.player.y,
    );
    const speed = 180;

    laser.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.time.delayedCall(3000, () => {
      if (laser.active) laser.destroy();
    });
  }

  hitBoss(param1, param2) {
    let projectile = null;
    let bossSprite = null;

    // Resolve parameter order issues
    if (param1 === this.boss) {
      bossSprite = param1;
      projectile = param2;
    } else if (param2 === this.boss) {
      bossSprite = param2;
      projectile = param1;
    } else if (param1?.texture && param1.texture.key === "boss_tex") {
      bossSprite = param1;
      projectile = param2;
    } else {
      projectile = param1;
      bossSprite = param2;
    }

    if (!bossSprite || !bossSprite.active) return;
    if (!projectile || !projectile.active) return;

    // Invincibility frames: ignore rapid overlaps within 150ms
    const now = this.time.now;
    if (this.bossLastHurt && now - this.bossLastHurt < 150) {
      if (projectile.body) projectile.body.enable = false;
      if (typeof projectile.destroy === "function") projectile.destroy();
      return;
    }
    this.bossLastHurt = now;

    if (projectile.body) projectile.body.enable = false;
    if (typeof projectile.destroy === "function") projectile.destroy();

    const bossState = bossSprite.getData("stateObject");

    // Ensure health is properly initialized and never becomes undefined/NaN/null
    if (
      typeof bossSprite.health !== "number" ||
      Number.isNaN(bossSprite.health)
    ) {
      bossSprite.health = 200;
    }
    if (
      typeof bossSprite.maxHealth !== "number" ||
      Number.isNaN(bossSprite.maxHealth)
    ) {
      bossSprite.maxHealth = 200;
    }

    // Decrement exactly 10 health on bullet overlap
    bossSprite.health -= 10;

    // Sync state
    this.bossHealth = bossSprite.health;
    if (bossState) {
      bossState.hp = bossSprite.health;
    }

    this.updateBossHealthBar();

    // Debugging log: "Boss HP:", boss.health, "/", boss.maxHealth
    console.log("Boss HP:", bossSprite.health, "/", bossSprite.maxHealth);

    AudioSynth.playSFX("hurt");
    this.createSpark(bossSprite.x, bossSprite.y, "#ffffff");

    bossSprite.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (bossSprite?.active) bossSprite.clearTint();
    });

    // Boss should only be defeated when health <= 0
    if (bossSprite.health <= 0) {
      this.defeatBoss(bossSprite);
    }
  }

  defeatBoss(bossSprite) {
    if (this._bossDefeating) return; // prevent double-trigger
    this._bossDefeating = true;

    // Step 1: Stop boss movement
    this.bossActive = false;
    if (bossSprite?.active) {
      if (bossSprite.body) {
        bossSprite.body.setVelocity(0, 0);
      }
    }

    // Step 2: Disable attacks (checked in the update loop by checking this.bossActive)

    // Capture position BEFORE destroying sprite
    const bx = bossSprite?.active ? bossSprite.x : this.scale.width / 2;
    const by = bossSprite?.active ? bossSprite.y : this.scale.height / 2;

    // Mark boss state as defeated in stateObject
    const bossState = bossSprite ? bossSprite.getData("stateObject") : null;
    if (bossState) {
      bossState.hp = 0;
      bossState.alive = false;
      bossState.defeated = true;
    }

    // Step 3: Play explosion animation
    AudioSynth.playSFX("explosion");

    // Scale and spin boss while shaking camera
    if (bossSprite?.active) {
      this.tweens.add({
        targets: bossSprite,
        angle: 720,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0.1,
        duration: 2000,
        ease: "Cubic.easeOut",
      });
    }

    // Spawn multiple waves of explosion sparks over 2 seconds
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 200, () => {
        this.createSpark(
          bx + (Math.random() - 0.5) * 80,
          by + (Math.random() - 0.5) * 80,
          "#ffff00",
        );
        this.createSpark(
          bx + (Math.random() - 0.5) * 80,
          by + (Math.random() - 0.5) * 80,
          "#ff6600",
        );
        this.cameras.main.shake(100, 0.008);
      });
    }

    // Step 4: Wait until explosion animation finishes (2000 ms)
    this.time.delayedCall(2000, () => {
      if (!this.sys || !this.sys.isActive()) return;
      // Step 5: Destroy boss
      if (bossSprite?.active) {
        bossSprite.destroy();
      }
      this.boss = null;
      if (this.bossUI) this.bossUI.setVisible(false);

      // Step 6: Mark stage boss as defeated and advance stage via normal completion path
      console.log(
        "[DEBUG] Boss defeated! Calling checkStageCompletion() to advance stage.",
      );
      this.stageCompleteTriggered = false; // allow checkStageCompletion to run
      this.checkStageCompletion();
    });
  }

  // --- STAGE GATE COMPLETE ---
  checkStageCompletion() {
    if (this.gameOverTriggered || this.stageCompleteTriggered) return;

    const stage = this.getCurrentStage();
    if (!stage) return;
    const hasBoss = !!stage.boss;
    const bossDefeated = !hasBoss || stage.boss.defeated;
    const objectiveFinished = this.score >= this.getStageRequiredScore();
    const enemiesDefeated = Array.isArray(stage.enemies)
      ? stage.enemies.every((e) => e.defeated)
      : true;

    let stageCompleted = false;
    if (hasBoss) {
      // If there is a boss, defeating the boss is sufficient to complete the stage
      stageCompleted = bossDefeated;
    } else {
      // For hostiles-heavy genres, let stage complete if either all enemies are defeated or score objective is reached
      if (
        this.genre === "battle_royale" ||
        this.genre === "survival" ||
        this.genre === "shooter"
      ) {
        stageCompleted = enemiesDefeated || objectiveFinished;
      } else {
        stageCompleted = objectiveFinished;
      }
    }

    if (stageCompleted) {
      this.showStageComplete();
    }
  }

  showStageComplete() {
    if (this.stageCompleteTriggered) return;
    this.stageCompleteTriggered = true;

    AudioSynth.playSFX("win");

    const width = this.scale.width;
    const height = this.scale.height;

    // Create a gorgeous visual overlay panel
    this.completeOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(100);

    // Panel background
    this.completePanel = this.add
      .rectangle(width / 2, height / 2, 400, 180, 0x0f172a, 0.9)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setStrokeStyle(3, 0xfde68a);

    this.completeText = this.add
      .text(width / 2, height / 2 - 30, "STAGE COMPLETE!", {
        font: "bold 36px Outfit, sans-serif",
        fill: "#fde68a",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    const nextStageNum = this.currentStageIndex + 2;
    const subTextMsg =
      this.currentStageIndex >= this.stages.length - 1
        ? "Entering final dream victory..."
        : `Preparing Stage ${nextStageNum}...`;

    this.completeSubText = this.add
      .text(width / 2, height / 2 + 25, subTextMsg, {
        font: "bold 16px Outfit, sans-serif",
        fill: "#cbd5e1",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    // Entrance animation
    this.completePanel.setScale(0, 0);
    this.completeText.setScale(0, 0);
    this.completeSubText.setScale(0, 0);

    this.tweens.add({
      targets: [this.completePanel, this.completeText, this.completeSubText],
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(2200, () => {
      if (this.sys?.isActive()) {
        this.unlockNextStage();
      }
    });
  }

  unlockNextStage() {
    if (this.completeOverlay) this.completeOverlay.destroy();
    if (this.completePanel) this.completePanel.destroy();
    if (this.completeText) this.completeText.destroy();
    if (this.completeSubText) this.completeSubText.destroy();
    this.stageCompleteTriggered = false;
    this._fallingKillScheduled = false;
    this._bossDefeating = false;

    if (this.currentStageIndex >= this.stages.length - 1) {
      this.winGame();
      return;
    }

    this.currentStageIndex += 1;
    this.score = 0;
    this.health = Math.min(100, this.health + 25);

    if (this.scoreText) this.scoreText.setText(`${this._scoreLabel}: 0`);
    if (this.healthText) this.healthText.setText(`HEALTH: ${this.health}%`);
    this.updateHealthBar();

    if (this.bossUI) this.bossUI.setVisible(false);

    // Clear previous entities
    this.platforms.clear(true, true);
    this.collectibles.clear(true, true);
    this.hazards.clear(true, true);
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.bossProjectiles.clear(true, true);

    const playerStartY = this.genre.includes("runner")
      ? 250
      : this.genre.includes("driving") || this.genre.includes("racing")
        ? 360
        : this.scale.height - 150;
    if (this.player?.active) {
      this.player.setPosition(100, playerStartY);
      this.player.setVelocity(0, 0);
    }
    this.bossSpawned = false;
    this.bossActive = false;
    this.currentTrack = 1;
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }

    this.generateLevel(this.scale.width, this.scale.height);
    this.snapPlayerToPlatform();

    const currentStage = this.getCurrentStage();
    if (this.stageText && currentStage) {
      this.stageText.setText(
        `STAGE ${this.currentStageIndex + 1}/${this.stages.length}: ${currentStage.environment}`,
      );
    }
    if (this.objectiveText) {
      this.objectiveText.setText(`GOAL: ${this.getCurrentObjective()}`);
    }

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
        onComplete: () => {
          if (circ?.active) circ.destroy();
        },
      });
    }
  }

  // --- WIN / LOSE ---
  winGame() {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.bossActive = false;

    if (this.boss) {
      this.createSpark(this.boss.x, this.boss.y, "#ffff00");
      this.boss.destroy();
    }

    if (this.player?.active) {
      this.player.setVelocity(0);
      if (this.player.body) {
        this.player.body.setAllowGravity(false);
      }
    }

    AudioSynth.stopBGM();
    AudioSynth.playSFX("win");

    this.completionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

    const overlay = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.6,
      )
      .setOrigin(0.5)
      .setDepth(80);
    const panel = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        420,
        260,
        0x0f172a,
        0.95,
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x22d3ee)
      .setDepth(81);
    const title = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 50,
        "DREAM COMPLETE",
        {
          font: "bold 32px Outfit, sans-serif",
          fill: "#f8fafc",
        },
      )
      .setOrigin(0.5)
      .setDepth(82);
    const sub = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 4,
        this.blueprint.winCondition ||
          "All stages cleared and the final boss is defeated.",
        {
          font: "16px Outfit, sans-serif",
          fill: "#cbd5e1",
          wordWrap: { width: 340 },
        },
      )
      .setOrigin(0.5)
      .setDepth(82);
    const scoreText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 40,
        `Score: ${this.score}`,
        {
          font: "bold 20px Outfit, sans-serif",
          fill: "#fde68a",
        },
      )
      .setOrigin(0.5)
      .setDepth(82);
    const timeText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 72,
        `Time: ${this.completionTime}s`,
        {
          font: "bold 18px Outfit, sans-serif",
          fill: "#86efac",
        },
      )
      .setOrigin(0.5)
      .setDepth(82);

    this.tweens.add({
      targets: panel,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: title,
      scale: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    for (let i = 0; i < 24; i++) {
      this.createSpark(
        this.scale.width / 2 + (Math.random() - 0.5) * 240,
        this.scale.height / 2 - 90 + Math.random() * 120,
        "#fde68a",
      );
    }

    this.time.delayedCall(900, () => {
      if (this.sys?.isActive()) {
        this.onWin({
          score: this.score,
          completionTime: this.completionTime,
        });
      }
    });
  }

  loseGame() {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.stageCompleteTriggered = true; // prevent update loop from re-entering
    this.bossActive = false;

    this.completionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(
      "[DEBUG] ===== GAME OVER ===== Score:",
      this.score,
      "| Time:",
      this.completionTime,
      "s",
    );

    // Stop the boss
    if (this.boss?.active && this.boss.body) {
      this.boss.body.setVelocity(0, 0);
    }

    // Stop all enemies — disable physics bodies so they freeze in place
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy?.active && enemy.body) {
        enemy.body.setVelocity(0, 0);
        enemy.body.enable = false;
      }
    });

    // Destroy all in-flight projectiles immediately
    if (this.projectiles) this.projectiles.clear(true, true);
    if (this.bossProjectiles) this.bossProjectiles.clear(true, true);

    // Freeze and tint player
    if (this.player?.active && this.player.body) {
      this.player.setTint(0xff0000);
      this.player.setVelocity(0, 0);
      this.player.body.setAllowGravity(false);
    }

    // Pause the entire physics world — everything freezes in place
    this.physics.pause();

    AudioSynth.stopBGM();
    AudioSynth.playSFX("gameover");

    // Show in-Phaser Game Over banner first
    this.showGameOverScreen();

    // Notify React overlay after a brief delay (lets Phaser banner appear)
    this.time.delayedCall(700, () => {
      if (this.sys?.isActive()) {
        this.onLose({
          score: this.score,
          completionTime: this.completionTime,
        });
      }
    });
  }

  showGameOverScreen() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Dim overlay
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setScrollFactor(0)
      .setDepth(200);

    // "GAME OVER" title
    const titleText = this.add
      .text(width / 2, height / 2 - 50, "GAME OVER", {
        font: "bold 54px Outfit, sans-serif",
        fill: "#ef4444",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    // Score + time
    this.add
      .text(
        width / 2,
        height / 2 + 20,
        `Score: ${this.score}  •  Time: ${this.completionTime}s`,
        {
          font: "bold 18px Outfit, sans-serif",
          fill: "#94a3b8",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    // Restart hint
    this.add
      .text(width / 2, height / 2 + 62, "Use the REPLAY button to try again.", {
        font: "14px Outfit, sans-serif",
        fill: "#64748b",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    // Pulse animation on title
    this.tweens.add({
      targets: titleText,
      alpha: 0.6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  showBossVictoryScreen() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Dark semi-transparent overlay
    this.victoryOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(150);

    // Main panel card with green/emerald border
    this.victoryPanel = this.add
      .rectangle(width / 2, height / 2, 450, 320, 0x0f172a, 0.95)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(151)
      .setStrokeStyle(3, 0x10b981);

    // "Victory!" Title
    this.victoryTitle = this.add
      .text(width / 2, height / 2 - 100, "VICTORY!", {
        font: "bold 42px Outfit, sans-serif",
        fill: "#10b981",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(152);

    // "Level Completed" Text
    this.victoryLevelText = this.add
      .text(width / 2, height / 2 - 50, "Level Completed", {
        font: "bold 24px Outfit, sans-serif",
        fill: "#e2e8f0",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(152);

    // "Boss Defeated" Text
    const stageBossName = this.getCurrentBossName();
    this.victoryBossDefeatedText = this.add
      .text(width / 2, height / 2 - 15, `Boss Defeated: ${stageBossName}`, {
        font: "italic 18px Outfit, sans-serif",
        fill: "#f87171",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(152);

    // "Final Score" Display
    this.victoryScoreText = this.add
      .text(width / 2, height / 2 + 30, `Final Score: ${this.score}`, {
        font: "bold 22px Outfit, sans-serif",
        fill: "#fbbf24",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(152);

    // Play Again Button
    this.playAgainBtn = this.add
      .text(width / 2, height / 2 + 95, "PLAY AGAIN", {
        font: "bold 20px Outfit, sans-serif",
        fill: "#ffffff",
        backgroundColor: "#10b981",
        padding: { x: 25, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(152)
      .setInteractive({ useHandCursor: true });

    this.playAgainBtn.on("pointerover", () => {
      this.playAgainBtn.setStyle({ backgroundColor: "#059669" });
    });
    this.playAgainBtn.on("pointerout", () => {
      this.playAgainBtn.setStyle({ backgroundColor: "#10b981" });
    });

    this.playAgainBtn.on("pointerdown", () => {
      this.cleanupVictoryScreen();
      this.scene.restart();
    });

    // Pop-in animation
    this.victoryPanel.setScale(0, 0);
    this.victoryTitle.setScale(0, 0);
    this.victoryLevelText.setScale(0, 0);
    this.victoryBossDefeatedText.setScale(0, 0);
    this.victoryScoreText.setScale(0, 0);
    this.playAgainBtn.setScale(0, 0);

    this.tweens.add({
      targets: [
        this.victoryPanel,
        this.victoryTitle,
        this.victoryLevelText,
        this.victoryBossDefeatedText,
        this.victoryScoreText,
        this.playAgainBtn,
      ],
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Back.easeOut",
    });
  }

  cleanupVictoryScreen() {
    if (this.victoryOverlay) this.victoryOverlay.destroy();
    if (this.victoryPanel) this.victoryPanel.destroy();
    if (this.victoryTitle) this.victoryTitle.destroy();
    if (this.victoryLevelText) this.victoryLevelText.destroy();
    if (this.victoryBossDefeatedText) this.victoryBossDefeatedText.destroy();
    if (this.victoryScoreText) this.victoryScoreText.destroy();
    if (this.playAgainBtn) this.playAgainBtn.destroy();
  }

  // --- SCENE LIFECYCLE: CLEANUP ---
  shutdown() {
    console.log("[DEBUG] PlayScene shutdown — cleaning up resources");
    this.tweens.killAll();
    this.time.removeAllEvents();
    AudioSynth.stopBGM();

    // Remove explicit physics colliders
    if (this.bossOverlapCollider) {
      this.physics.world.removeCollider(this.bossOverlapCollider);
      this.bossOverlapCollider = null;
    }
  }
}
