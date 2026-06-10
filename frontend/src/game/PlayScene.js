import Phaser from 'phaser';
import AudioSynth from './AudioSynth';

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  init(data) {
    // Load blueprint/callbacks either from direct scene data or from the global store
    const source = (data && data.blueprint) ? data : (window.__dream2play_data || {});

    this.blueprint = source.blueprint || {
      hero: 'Explorer',
      world: 'Surreal Void',
      enemies: ['Dream Shadow'],
      boss: 'Nightmare Core',
      objective: 'Collect energy shards',
      powerups: ['Speed surge'],
      mood: 'Adventure',
      genre: 'Platformer',
      difficulty: 'Medium',
      colors: { bg: '#0a0b10', accent: '#8b5cf6', secondary: '#06b6d4', hazard: '#f43f5e', player: '#22c55e', text: '#ffffff' },
      physics: { gravity: 300, speed: 200, jump: -350, bounce: 0.1 },
      stories: { intro: 'Welcome to the dream.', mission: 'Collect shards.', ending: 'You won!' }
    };

    // Game stats
    this.score = 0;
    this.health = 100;
    this.bossHealth = 100;
    this.bossSpawned = false;
    this.bossActive = false;
    this.gameOverTriggered = false;
    
    // Timer
    this.startTime = Date.now();
    this.completionTime = 0;

    // React callbacks (read from the resolved source)
    this.onWin = source.onWin || (() => {});
    this.onLose = source.onLose || (() => {});
  }

  preload() {
    // Generate dynamic vector textures based on mood & colors
    this.generateTextures();
  }

  create() {
    AudioSynth.playBGM(this.blueprint.mood);

    const width = this.scale.width;
    const height = this.scale.height;

    // Set world physics bounds (extended horizontally for running)
    this.physics.world.setBounds(0, 0, 99999, height);
    this.cameras.main.setBounds(0, 0, 99999, height);

    // Apply mood colors to camera background
    this.cameras.main.setBackgroundColor(this.blueprint.colors.bg);

    // Create background visual decorations (stars or clouds)
    this.createBackgroundElements(height);

    // Physics Groups
    this.platforms = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.bossProjectiles = this.physics.add.group();

    // Create the Player
    this.player = this.physics.add.sprite(100, height - 150, 'player_tex');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(this.blueprint.physics.bounce);
    this.player.setGravityY(this.blueprint.physics.gravity);
    
    // Set double jump availability based on fantasy/adventure
    this.canDoubleJump = this.blueprint.mood === 'Fantasy' || this.blueprint.mood === 'Adventure';
    this.jumpCount = 0;

    // Spooky flashlight vignette mask for Horror
    if (this.blueprint.mood === 'Horror') {
      this.flashlightMask = this.make.graphics();
      this.flashlightMask.fillStyle(0xffffff);
      this.flashlightMask.fillCircle(0, 0, 180);
      
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.95);
      overlay.fillRect(0, 0, 99999, height);
      overlay.setMask(new Phaser.Display.Masks.GeometryMask(this, this.flashlightMask));
      overlay.setDepth(10);
      
      // Inverse the mask to cover everything EXCEPT the circle
      this.cameras.main.setMask(new Phaser.Display.Masks.GeometryMask(this, this.flashlightMask));
      this.cameras.main.mask.invertAlpha = true;
    }

    // Procedurally generate platforms and collectibles
    this.generateLevel(width, height);

    // Physics Colliders
    this.physics.add.collider(this.player, this.platforms, () => {
      this.jumpCount = 0; // Reset jumps
    });
    this.physics.add.collider(this.enemies, this.platforms);
    
    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitHazard, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.bossProjectiles, this.hitPlayerProjectile, null, this);
    
    this.physics.add.overlap(this.projectiles, this.enemies, this.shootEnemy, null, this);
    this.physics.add.overlap(this.projectiles, this.platforms, this.destroyProjectile, null, this);

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.lastFired = 0;

    // Follow player with camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -150, 50);

    // UI Panel (Static overlay relative to viewport)
    this.createUI(width);
  }

  update(time) {
    if (this.gameOverTriggered) return;

    const currentX = this.player.x;

    // Track flashlight location
    if (this.flashlightMask) {
      this.flashlightMask.x = this.player.x;
      this.flashlightMask.y = this.player.y;
    }

    // Move player
    const speed = this.blueprint.physics.speed;
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // Jump / Fly mechanics
    const isUpJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    
    if (this.blueprint.mood === 'Sci-Fi') {
      // Sci-Fi Jetpack mode: hold UP to fly
      if (this.cursors.up.isDown) {
        this.player.setVelocityY(this.blueprint.physics.jump * 0.7); // Float thrust
        if (time % 10 < 2) {
          this.createSpark(this.player.x, this.player.y + 16, this.blueprint.colors.accent);
        }
      }
    } else {
      // Standard platformer jump
      if (isUpJustPressed) {
        if (this.player.body.touching.down) {
          this.player.setVelocityY(this.blueprint.physics.jump);
          AudioSynth.playSFX('jump');
          this.jumpCount = 1;
        } else if (this.canDoubleJump && this.jumpCount < 2) {
          this.player.setVelocityY(this.blueprint.physics.jump * 0.9);
          AudioSynth.playSFX('jump');
          this.jumpCount = 2;
          this.createSpark(this.player.x, this.player.y, '#ffffff');
        }
      }
    }

    // Shoot weapon
    if (this.keySpace.isDown && time > this.lastFired) {
      this.fireWeapon(time);
    }

    // Spawn Boss when threshold reached (100 score or distance > 2500)
    if ((this.score >= 80 || currentX > 2500) && !this.bossSpawned) {
      this.spawnBoss(currentX);
    }

    // Boss loop
    if (this.bossActive && this.boss) {
      // Hover boss up and down
      this.boss.y = 200 + Math.sin(time / 400) * 100;
      
      // Keep boss on the right edge of the screen relative to player
      this.boss.x = this.player.x + 400;

      // Boss shoots at random
      if (Math.random() < 0.02) {
        this.fireBossLaser();
      }
    }

    // Recycle enemies to move towards player
    this.enemies.getChildren().forEach(enemy => {
      // Standard movement patrol or chasing
      if (enemy.active) {
        if (this.blueprint.mood === 'Horror') {
          // Slow pursue
          const dir = this.player.x - enemy.x;
          enemy.setVelocityX(Math.sign(dir) * 60);
        } else {
          // Patrol bounce
          if (enemy.body.blocked.left || enemy.body.blocked.right) {
            enemy.setVelocityX(enemy.body.velocity.x * -1);
          }
        }
      }
    });

    // Check player falling off map
    if (this.player.y > this.scale.height + 100) {
      this.damagePlayer(100);
    }
  }

  // --- SPRITE TEXTURE GENERATION ---
  generateTextures() {
    const gc = this.add.graphics();
    const colors = this.blueprint.colors;

    // 1. Player Sprite Texture
    gc.clear();
    if (this.blueprint.mood === 'Sci-Fi') {
      // Holographic Spaceship
      gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.player).color);
      gc.fillTriangle(0, 32, 32, 16, 0, 0);
      gc.lineStyle(2, Phaser.Display.Color.HexStringToColor(colors.accent).color);
      gc.strokeTriangle(0, 32, 32, 16, 0, 0);
    } else if (this.blueprint.mood === 'Fantasy') {
      // Wizard Circle with hat
      gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.player).color);
      gc.fillCircle(16, 16, 12);
      gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.accent).color);
      gc.fillTriangle(4, 12, 16, 0, 28, 12);
    } else {
      // Cute Box Character
      gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.player).color);
      gc.fillRect(4, 4, 24, 24);
      gc.fillStyle(0xffffff); // Eyes
      gc.fillRect(8, 10, 4, 4);
      gc.fillRect(20, 10, 4, 4);
      gc.fillStyle(0x000000);
      gc.fillRect(10, 12, 2, 2);
      gc.fillRect(22, 12, 2, 2);
    }
    gc.generateTexture('player_tex', 32, 32);

    // 2. Enemy Sprite Texture
    gc.clear();
    if (this.blueprint.mood === 'Horror') {
      // Glowing Skull/Eye
      gc.fillStyle(0xffffff);
      gc.fillCircle(16, 16, 12);
      gc.fillStyle(0xff0000); // Red pupils
      gc.fillCircle(11, 14, 3);
      gc.fillCircle(21, 14, 3);
    } else {
      // Spiky octagon
      gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.hazard).color);
      gc.fillTriangle(16, 0, 32, 24, 0, 24);
      gc.fillTriangle(16, 32, 32, 8, 0, 8);
    }
    gc.generateTexture('enemy_tex', 32, 32);

    // 3. Boss Sprite Texture
    gc.clear();
    gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.hazard).color);
    gc.fillCircle(40, 40, 36);
    gc.lineStyle(4, Phaser.Display.Color.HexStringToColor(colors.accent).color);
    gc.strokeCircle(40, 40, 38);
    // Core center
    gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.secondary).color);
    gc.fillCircle(40, 40, 16);
    gc.generateTexture('boss_tex', 80, 80);

    // 4. Collectible Sprite Texture
    gc.clear();
    gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.secondary).color);
    gc.fillTriangle(12, 0, 24, 18, 0, 18);
    gc.fillTriangle(12, 24, 24, 6, 0, 6); // Diamond
    gc.generateTexture('collect_tex', 24, 24);

    // 5. Hazard / Spike Sprite Texture
    gc.clear();
    gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.hazard).color);
    gc.fillTriangle(16, 0, 32, 32, 0, 32);
    gc.generateTexture('spike_tex', 32, 32);

    // 6. Platform Sprite Texture
    gc.clear();
    gc.fillStyle(Phaser.Display.Color.HexStringToColor(colors.secondary).color, 0.4);
    gc.fillRect(0, 0, 64, 20);
    gc.lineStyle(2, Phaser.Display.Color.HexStringToColor(colors.accent).color);
    gc.strokeRect(0, 0, 64, 20);
    gc.generateTexture('platform_tex', 64, 20);

    gc.destroy();
  }

  // --- BACKGROUND DECORATION ---
  createBackgroundElements(height) {
    const numElements = 40;
    const colors = this.blueprint.colors;
    
    for (let i = 0; i < numElements; i++) {
      const x = Math.random() * 6000;
      const y = Math.random() * (height - 100);
      const size = Math.random() * 4 + 2;
      
      const dot = this.add.circle(
        x, 
        y, 
        size, 
        Phaser.Display.Color.HexStringToColor(colors.accent).color, 
        Math.random() * 0.4 + 0.1
      );
      
      // Floating ambient movement
      this.tweens.add({
        targets: dot,
        y: y - (Math.random() * 30 + 10),
        duration: Math.random() * 3000 + 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // --- LEVEL COMPILATION ---
  generateLevel(width, height) {
    const colors = this.blueprint.colors;
    
    // Spawn Ground Floor
    for (let x = 0; x < 5000; x += 64) {
      // Leave occasional gaps to jump over, except near start and boss area
      if (x > 300 && x < 2400 && Math.random() < 0.15) {
        // Gap! Add hazard spikes at the bottom if gap
        if (Math.random() < 0.5) {
          const spike = this.hazards.create(x + 32, height - 16, 'spike_tex');
          spike.refreshBody();
        }
        x += 64; // expand gap
        continue;
      }
      const platform = this.platforms.create(x + 32, height - 10, 'platform_tex');
      platform.refreshBody();
    }

    // Spawn floating platforms, items, and patrols
    let nextPlatformX = 250;
    while (nextPlatformX < 2600) {
      const platY = height - 120 - Math.random() * 140;
      const platWidthMultiplier = Math.floor(Math.random() * 3) + 1; // 1 to 3 blocks wide
      
      for (let w = 0; w < platWidthMultiplier; w++) {
        const platX = nextPlatformX + (w * 64);
        const p = this.platforms.create(platX, platY, 'platform_tex');
        p.refreshBody();

        // Spawn collectible above platform
        if (Math.random() < 0.7) {
          const shard = this.collectibles.create(platX, platY - 30, 'collect_tex');
          shard.setGravityY(100);
          shard.setBounceY(0.3);
          this.physics.add.collider(shard, this.platforms);
        }

        // Spawn enemy patrol
        if (w === 0 && Math.random() < 0.35) {
          const enemy = this.enemies.create(platX, platY - 40, 'enemy_tex');
          enemy.setCollideWorldBounds(true);
          enemy.setBounce(1, 0);
          enemy.setVelocityX(Math.random() < 0.5 ? -80 : 80);
          // Set gravity based on theme
          enemy.setGravityY(this.blueprint.physics.gravity);
        }
      }
      nextPlatformX += (platWidthMultiplier * 64) + 120 + Math.random() * 80;
    }
  }

  // --- UI HUD CREATION ---
  createUI(width) {
    const uiFont = 'bold 16px Outfit, sans-serif';
    const style = { font: uiFont, fill: this.blueprint.colors.text };
    const labelStyle = { font: '12px Outfit, sans-serif', fill: '#888888' };
    
    // Create UI Panel Container
    this.uiContainer = this.add.container(20, 20).setScrollFactor(0).setDepth(20);
    
    // Shard Count Label
    this.scoreText = this.add.text(0, 0, `SHARDS: 0`, style);
    this.uiContainer.add(this.scoreText);

    // Objective Reminder
    this.objectiveText = this.add.text(0, 25, `GOAL: Collect 80 energy shards`, labelStyle);
    this.uiContainer.add(this.objectiveText);

    // Health Bar Background
    const hbBg = this.add.graphics();
    hbBg.fillStyle(0x222222, 0.8);
    hbBg.fillRect(width - 220, 0, 200, 16);
    this.uiContainer.add(hbBg);

    // Health Fill
    this.healthBar = this.add.graphics();
    this.uiContainer.add(this.healthBar);
    this.updateHealthBar();

    // Health Label
    this.healthText = this.add.text(width - 220, 20, `HEALTH: 100%`, { font: 'bold 12px Outfit, sans-serif', fill: '#ffffff' });
    this.uiContainer.add(this.healthText);

    // Boss UI Elements (hidden until boss spawns)
    this.bossUI = this.add.container(0, 0).setScrollFactor(0).setDepth(20).setVisible(false);
    
    const bossLabel = this.add.text(width / 2 - 100, 10, `BOSS: ${this.blueprint.boss.toUpperCase()}`, { font: 'bold 14px Outfit, sans-serif', fill: '#ff3333' });
    this.bossUI.add(bossLabel);

    const bBarBg = this.add.graphics();
    bBarBg.fillStyle(0x222222, 0.8);
    bBarBg.fillRect(width / 2 - 150, 30, 300, 12);
    this.bossUI.add(bBarBg);

    this.bossHealthBar = this.add.graphics();
    this.bossUI.add(this.bossHealthBar);
  }

  updateHealthBar() {
    this.healthBar.clear();
    const hpColor = this.health > 40 ? 0x22c55e : 0xef4444; // Green vs Red
    this.healthBar.fillStyle(hpColor, 1);
    this.healthBar.fillRect(this.scale.width - 220, 0, (this.health / 100) * 200, 16);
  }

  updateBossHealthBar() {
    this.bossHealthBar.clear();
    this.bossHealthBar.fillStyle(0xdc2626, 1); // Red
    this.bossHealthBar.fillRect(this.scale.width / 2 - 150, 30, (this.bossHealth / 100) * 300, 12);
  }

  // --- DYNAMIC INTERACTIONS ---
  collectItem(player, item) {
    item.destroy();
    this.score += 10;
    this.scoreText.setText(`SHARDS: ${this.score}`);
    AudioSynth.playSFX('collect');

    // Mini particles effect
    this.createSpark(item.x, item.y, this.blueprint.colors.secondary);
  }

  hitHazard(player, spike) {
    // Rebound player
    player.setVelocityY(-200);
    player.setVelocityX(player.body.velocity.x > 0 ? -120 : 120);
    this.damagePlayer(25);
  }

  hitEnemy(player, enemy) {
    // Bounce player off top of enemy to destroy them, otherwise take damage
    if (player.y < enemy.y - 15) {
      enemy.destroy();
      player.setVelocityY(-220);
      AudioSynth.playSFX('explosion');
      this.score += 20;
      this.scoreText.setText(`SHARDS: ${this.score}`);
      this.createSpark(enemy.x, enemy.y, '#ff4444');
    } else {
      player.setVelocityX(player.x < enemy.x ? -150 : 150);
      this.damagePlayer(20);
    }
  }

  hitPlayerProjectile(player, laser) {
    laser.destroy();
    this.damagePlayer(15);
  }

  fireWeapon(time) {
    this.lastFired = time + 250; // Fire-rate buffer (250ms)
    AudioSynth.playSFX('laser');
    
    // Shoot in direction of movement
    const isFacingLeft = this.player.flipX;
    const laserX = isFacingLeft ? this.player.x - 24 : this.player.x + 24;
    const speed = isFacingLeft ? -400 : 400;

    const laser = this.projectiles.create(laserX, this.player.y, 'collect_tex');
    laser.setScale(0.5);
    laser.body.setAllowGravity(false);
    laser.setVelocityX(speed);

    // Make laser decay
    this.time.delayedCall(1500, () => {
      if (laser.active) laser.destroy();
    });
  }

  shootEnemy(projectile, enemy) {
    projectile.destroy();
    enemy.destroy();
    AudioSynth.playSFX('explosion');
    this.score += 20;
    this.scoreText.setText(`SHARDS: ${this.score}`);
    this.createSpark(enemy.x, enemy.y, this.blueprint.colors.hazard);
  }

  destroyProjectile(projectile, platform) {
    projectile.destroy();
  }

  damagePlayer(amount) {
    if (this.gameOverTriggered) return;
    this.health = Math.max(0, this.health - amount);
    this.healthText.setText(`HEALTH: ${this.health}%`);
    this.updateHealthBar();
    
    AudioSynth.playSFX('hurt');
    this.cameras.main.shake(150, 0.015);
    
    // Visual flash
    this.player.setTint(0xff0000);
    this.time.delayedCall(150, () => {
      if (this.player.active) this.player.clearTint();
    });

    if (this.health <= 0) {
      this.loseGame();
    }
  }

  // --- BOSS FIGHT SEQUENCE ---
  spawnBoss(playerX) {
    this.bossSpawned = true;
    this.bossActive = true;
    
    // Spawn Boss on the right side of the screen
    this.boss = this.physics.add.sprite(playerX + 450, 200, 'boss_tex');
    this.boss.body.setAllowGravity(false);
    this.boss.setImmovable(true);

    // Activate Boss HUD
    this.bossUI.setVisible(true);
    this.updateBossHealthBar();

    // Trigger Boss Fight overlap with player shots
    this.physics.add.overlap(this.projectiles, this.boss, this.hitBoss, null, this);
    
    this.objectiveText.setText(`DEFEAT THE BOSS: ${this.blueprint.boss.toUpperCase()}`);
    
    // camera sweep effect
    this.cameras.main.shake(300, 0.01);
  }

  fireBossLaser() {
    if (!this.boss || !this.boss.active) return;
    AudioSynth.playSFX('laser');
    
    // Aim laser towards player
    const laser = this.bossProjectiles.create(this.boss.x - 45, this.boss.y, 'enemy_tex');
    laser.setScale(0.6);
    laser.body.setAllowGravity(false);
    
    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    const speed = 250;
    
    laser.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.time.delayedCall(3000, () => {
      if (laser.active) laser.destroy();
    });
  }

  hitBoss(projectile, boss) {
    // Note: argument order matches overlap registration (projectiles, boss)
    if (!projectile.active || !boss.active) return;
    projectile.destroy();
    this.bossHealth = Math.max(0, this.bossHealth - 8);
    this.updateBossHealthBar();
    AudioSynth.playSFX('hurt');
    
    this.createSpark(boss.x, boss.y, '#ffffff');

    // Boss flash
    boss.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (boss.active) boss.clearTint();
    });

    if (this.bossHealth <= 0) {
      this.winGame();
    }
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
        onComplete: () => circ.destroy()
      });
    }
  }

  // --- VICTORY & DEFEAT HANDLERS ---
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

    // Call back to React page
    this.onWin({
      score: this.score,
      completionTime: this.completionTime
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

    // Call back to React page
    this.onLose({
      score: this.score,
      completionTime: this.completionTime
    });
  }
}
