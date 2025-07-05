import * as Phaser from 'phaser';
import { HealthBar } from './HealthBar';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private player?: Phaser.Physics.Arcade.Sprite;
  private monsters!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private loadingText?: Phaser.GameObjects.Text;
  private gameWidth!: number;
  private gameHeight!: number;
  private isGameCreated: boolean = false;
  private isRolling: boolean = false;
  private canRoll: boolean = true;
  private rollCooldown: number = 1000; // 1 second cooldown
  private currentAnimation: string = 'idle';
  private decorations!: Phaser.GameObjects.Group;
  private healthBar!: HealthBar;
  private isInvincible: boolean = false;
  private hurtSound!: Phaser.Sound.BaseSound;
  private levelEndPoint!: Phaser.GameObjects.Rectangle;
  private isLevelComplete: boolean = false;
  private levelEndX: number = 0;
  
  // Tutorial related properties
  private tutorialText!: Phaser.GameObjects.Text;
  private tutorialStage: number = 0;
  private hasMovedLeft: boolean = false;
  private hasMovedRight: boolean = false;
  private hasJumped: boolean = false;
  private hasRolled: boolean = false;
  private tutorialTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Store game dimensions
    this.gameWidth = this.scale.width;
    this.gameHeight = this.scale.height;

    // Add loading text
    this.loadingText = this.add.text(
      this.gameWidth / 2,
      this.gameHeight / 2,
      'Loading...',
      { fontSize: '32px', color: '#fff' }
    );
    this.loadingText.setOrigin(0.5);

    // Loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    const barWidth = this.gameWidth * 0.4;
    const barHeight = 50;
    const barX = (this.gameWidth - barWidth) / 2;
    const barY = this.gameHeight / 2 + 50;

    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barWidth, barHeight);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(barX + 10, barY + 10, (barWidth - 20) * value, barHeight - 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      if (this.loadingText) {
        this.loadingText.destroy();
      }
    });

    // Load fonts
    this.load.binary('pixelFont', '/assets/brackeys_platformer_assets/fonts/PixelOperator8.ttf');
    this.load.binary('pixelFontBold', '/assets/brackeys_platformer_assets/fonts/PixelOperator8-Bold.ttf');

    // Load platform assets
    this.load.image('grass-on-dirt', '/assets/brackeys_platformer_assets/sprites/WorldBlocks/world_tileset/GrassOnDirt.png');
    this.load.image('dirt', '/assets/brackeys_platformer_assets/sprites/WorldBlocks/world_tileset/Dirt.png');

    // Load knight animations
    for (let i = 0; i < 4; i++) {
      this.load.image(`knight-idle-${i}`, `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Idle/${i.toString().padStart(2, '0')}_knight.png`);
    }
    for (let i = 0; i < 16; i++) {
      const fileIndex = i + 16;
      this.load.image(`knight-run-${i}`, `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Run/${fileIndex.toString().padStart(2, '0')}_knight.png`);
    }
    for (let i = 0; i < 8; i++) {
      const rollIndex = i + 40;
      this.load.image(`knight-roll-${i}`, `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Roll/${rollIndex.toString().padStart(2, '0')}_knight.png`);
    }
    for (let i = 0; i < 4; i++) {
      const hitIndex = i + 48;
      this.load.image(`knight-hit-${i}`, `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Hit/${hitIndex.toString().padStart(2, '0')}_knight.png`);
    }
    for (let i = 0; i < 4; i++) {
      const deathIndex = i + 56;
      this.load.image(`knight-death-${i}`, `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Death/${deathIndex.toString().padStart(2, '0')}_knight.png`);
    }

    // Load sounds
    this.load.audio('jump', '/assets/brackeys_platformer_assets/sounds/jump.wav');
    this.load.audio('background-music', '/assets/brackeys_platformer_assets/music/time_for_adventure.mp3');

    // Load monster sprite
    this.load.image('monster', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/AttackOne.png');
    for (let i = 1; i <= 5; i++) {
      this.load.image(`slime-attack-${i}`, `/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/Attack${['One', 'Two', 'Three', 'Four', 'Five'][i-1]}.png`);
    }
    this.load.image('slime-hit', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/SlimeHit.png');
    this.load.image('slime-reset', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/ResetAttack.png');
    this.load.image('slime-spawn-1', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/SpawnOne.png');
    this.load.image('slime-spawn-2', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/SpawnTwo.png');
    this.load.image('slime-spawn-3', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/SpawnThreeHeadOut.png');
    this.load.image('slime-spawn-4', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/SpawnFourBodyOut.png');
    this.load.image('slime-spawn-finish', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/FinishSpawn.png');

    // Load sound effects
    this.load.audio('hurt', '/assets/brackeys_platformer_assets/sounds/hurt.wav');

    // Handle resize
    this.scale.on('resize', this.resize, this);
  }

  create() {
    // Reset level completion state at the start
    this.isLevelComplete = false;
    
    // On scene start or restart, destroy the old player if it exists and clear reference
    if (this.player) {
      console.log('[PlayerDestroy]', this.player.active, this.player);
      this.player.destroy();
      this.player = undefined;
    }
    
    // Add Tutorial Level text
    const levelText = this.add.text(
      this.cameras.main.centerX,
      40, // Position at the top of the screen
      'Tutorial Level',
      {
        fontFamily: 'PixelOperator8',
        fontSize: '48px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Add fade out effect after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: levelText,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => levelText.destroy()
      });
    });

    // Seed the random number generator for consistent level generation
    Phaser.Math.RND.sow(['a-consistent-seed']);

    // Create animations first
    this.createAnimations();

    try {
      // Add background music
      const music = this.sound.add('background-music', { loop: true });
      music.play();

      // Initialize hurt sound
      this.hurtSound = this.sound.add('hurt', { loop: false });
    } catch (error) {
      console.warn('Could not play background music:', error);
    }

    // Create monsters group
    this.monsters = this.physics.add.group();

    // Create platforms
    this.platforms = this.physics.add.staticGroup();
    
    this.createLevel();

    // Make camera follow the player
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    }

    // Controls
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();

      // Add space key for rolling
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.canRoll && !this.isRolling && this.player?.body?.touching.down) {
          this.roll();
        }
      });
    }

    // Handle resize
    this.scale.on('resize', this.resize, this);

    this.isGameCreated = true;

    // Initialize health bar
    this.healthBar = new HealthBar(this);
  }

  private createAnimations() {
    // Idle animation
    this.anims.create({
      key: 'idle',
      frames: Array.from({ length: 4 }, (_, i) => ({ key: `knight-idle-${i}` })),
      frameRate: 8,
      repeat: -1
    });

    // Run animation
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 16 }, (_, i) => ({ key: `knight-run-${i}` })),
      frameRate: 24,
      repeat: -1
    });

    // Roll animation
    this.anims.create({
      key: 'roll',
      frames: Array.from({ length: 8 }, (_, i) => ({ key: `knight-roll-${i}` })),
      frameRate: 16,
      repeat: 0
    });

    // Hit animation
    this.anims.create({
      key: 'hit',
      frames: Array.from({ length: 4 }, (_, i) => ({ key: `knight-hit-${i}` })),
      frameRate: 12,
      repeat: 0
    });

    // Death animation
    this.anims.create({
      key: 'death',
      frames: Array.from({ length: 4 }, (_, i) => ({ key: `knight-death-${i}` })),
      frameRate: 12,
      repeat: 0
    });

    // Slime attack animation
    this.anims.create({
      key: 'slime-attack',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `slime-attack-${i + 1}` })),
      frameRate: 8,
      repeat: -1
    });

    // Slime spawn animation
    this.anims.create({
      key: 'slime-spawn',
      frames: [
        { key: 'slime-spawn-1' },
        { key: 'slime-spawn-2' },
        { key: 'slime-spawn-3' },
        { key: 'slime-spawn-4' },
        { key: 'slime-spawn-finish' }
      ],
      frameRate: 8,
      repeat: 0
    });

    // Slime hit animation - update to use SlimeHit.png
    this.anims.create({
      key: 'slime-hit',
      frames: [{ key: 'slime-hit' }],
      frameRate: 1,
      repeat: 0
    });
  }

  private playAnimation(key: string) {
    if (this.currentAnimation !== key) {
      this.currentAnimation = key;
      this.player?.play(key, true);
    }
  }

  private roll() {
    if (!this.player) return;

    this.isRolling = true;
    this.canRoll = false;
    
    // Play roll animation at slower speed
    this.player.anims.msPerFrame = 100;
    this.playAnimation('roll');
    
    // Reduce roll speed and distance significantly
    const direction = this.player.flipX ? -1 : 1;
    const rollVelocity = direction * this.gameWidth * 0.15;
    this.player.setVelocityX(rollVelocity);
    
    // Create a physics event to handle roll completion
    this.time.addEvent({
      delay: this.player.anims.currentAnim!.duration,
      callback: () => {
        if (!this.player) return;
        // Ensure we're still in roll state when animation would complete
        if (this.isRolling && this.currentAnimation === 'roll') {
          // Complete reset of physics and state
          if (this.player.body) {
            this.player.body.reset(this.player.x, this.player.y);
            this.player.setVelocityX(0);
            this.player.setVelocityY(0);
          }
          this.isRolling = false;
          this.player.anims.msPerFrame = 62.5;
          
          if (this.player.body?.touching.down) {
            this.playAnimation('idle');
          }
        }
      },
      callbackScope: this
    });
    
    // Reset roll cooldown
    this.time.delayedCall(this.rollCooldown, () => {
      this.canRoll = true;
    });
  }

  private createLevel() {
    console.log('[CreateLevel] player exists?', !!this.player);
    // Clear existing platforms and monsters
    this.platforms.clear(true, true);
    this.monsters.clear(true, true);
    
    // Calculate the tile size based on screen height
    const scale = 4;
    const baseSize = 16;
    const scaledSize = baseSize * scale;

    // Define level data
    const levelPart1Blocks = [
        // Base layer
        ...Array.from({ length: 32 }, (_, i) => ({ x: i, y: 17, type: "dirt" })),
        ...Array.from({ length: 32 }, (_, i) => ({ x: i, y: 16, type: "dirt" })),
        ...Array.from({ length: 32 }, (_, i) => ({ x: i, y: 15, type: "dirt" })),
        ...Array.from({ length: 32 }, (_, i) => ({ x: i, y: 14, type: "dirt" })),
        
        // Left platform
        { x: 0, y: 13, type: "grass-on-dirt" },
        { x: 1, y: 13, type: "grass-on-dirt" },
        { x: 2, y: 13, type: "grass-on-dirt" },
        { x: 3, y: 13, type: "grass-on-dirt" },
        { x: 4, y: 13, type: "grass-on-dirt" },
        { x: 5, y: 13, type: "grass-on-dirt" },
        
        // First ascending section
        { x: 6, y: 12, type: "grass-on-dirt" },
        { x: 7, y: 11, type: "grass-on-dirt" },
        { x: 8, y: 10, type: "grass-on-dirt" },
        { x: 9, y: 10, type: "grass-on-dirt" },
        { x: 10, y: 10, type: "grass-on-dirt" },
        
        // Middle platform
        { x: 11, y: 11, type: "grass-on-dirt" },
        { x: 11, y: 12, type: "grass-on-dirt" },
        { x: 11, y: 13, type: "grass-on-dirt" },
        { x: 12, y: 12, type: "grass-on-dirt" },
        { x: 12, y: 13, type: "grass-on-dirt" },
        { x: 13, y: 13, type: "grass-on-dirt" },
        { x: 14, y: 13, type: "grass-on-dirt" },
        { x: 15, y: 13, type: "grass-on-dirt" },
        { x: 16, y: 13, type: "grass-on-dirt" },
        { x: 17, y: 13, type: "grass-on-dirt" },
        { x: 18, y: 13, type: "grass-on-dirt" },
        { x: 19, y: 13, type: "grass-on-dirt" },
        { x: 20, y: 13, type: "grass-on-dirt" },
        { x: 21, y: 13, type: "grass-on-dirt" },
        
        // Final ascending section
        { x: 22, y: 12, type: "grass-on-dirt" },
        { x: 23, y: 11, type: "grass-on-dirt" },
        { x: 24, y: 10, type: "grass-on-dirt" },
        { x: 25, y: 9, type: "grass-on-dirt" },
        { x: 26, y: 8, type: "grass-on-dirt" },
        { x: 27, y: 7, type: "grass-on-dirt" },
        { x: 28, y: 6, type: "grass-on-dirt" },
        { x: 29, y: 5, type: "grass-on-dirt" },
        { x: 30, y: 4, type: "grass-on-dirt" },
        { x: 31, y: 3, type: "grass-on-dirt" },
        
        // Fill blocks
        { x: 6, y: 13, type: "dirt" },
        { x: 7, y: 12, type: "dirt" },
        { x: 7, y: 13, type: "dirt" },
        { x: 8, y: 11, type: "dirt" },
        { x: 8, y: 12, type: "dirt" },
        { x: 8, y: 13, type: "dirt" },
        { x: 9, y: 11, type: "dirt" },
        { x: 9, y: 12, type: "dirt" },
        { x: 9, y: 13, type: "dirt" },
        { x: 10, y: 11, type: "dirt" },
        { x: 10, y: 12, type: "dirt" },
        { x: 10, y: 13, type: "dirt" },
        
        // Fill blocks for final section
        { x: 22, y: 13, type: "dirt" },
        { x: 23, y: 12, type: "dirt" },
        { x: 23, y: 13, type: "dirt" },
        { x: 24, y: 11, type: "dirt" },
        { x: 24, y: 12, type: "dirt" },
        { x: 24, y: 13, type: "dirt" },
        { x: 25, y: 10, type: "dirt" },
        { x: 25, y: 11, type: "dirt" },
        { x: 25, y: 12, type: "dirt" },
        { x: 25, y: 13, type: "dirt" },
        { x: 26, y: 9, type: "dirt" },
        { x: 26, y: 10, type: "dirt" },
        { x: 26, y: 11, type: "dirt" },
        { x: 26, y: 12, type: "dirt" },
        { x: 26, y: 13, type: "dirt" },
        { x: 27, y: 8, type: "dirt" },
        { x: 27, y: 9, type: "dirt" },
        { x: 27, y: 10, type: "dirt" },
        { x: 27, y: 11, type: "dirt" },
        { x: 27, y: 12, type: "dirt" },
        { x: 27, y: 13, type: "dirt" },
        { x: 28, y: 7, type: "dirt" },
        { x: 28, y: 8, type: "dirt" },
        { x: 28, y: 9, type: "dirt" },
        { x: 28, y: 10, type: "dirt" },
        { x: 28, y: 11, type: "dirt" },
        { x: 28, y: 12, type: "dirt" },
        { x: 28, y: 13, type: "dirt" },
        { x: 29, y: 6, type: "dirt" },
        { x: 29, y: 7, type: "dirt" },
        { x: 29, y: 8, type: "dirt" },
        { x: 29, y: 9, type: "dirt" },
        { x: 29, y: 10, type: "dirt" },
        { x: 29, y: 11, type: "dirt" },
        { x: 29, y: 12, type: "dirt" },
        { x: 29, y: 13, type: "dirt" },
        { x: 30, y: 5, type: "dirt" },
        { x: 30, y: 6, type: "dirt" },
        { x: 30, y: 7, type: "dirt" },
        { x: 30, y: 8, type: "dirt" },
        { x: 30, y: 9, type: "dirt" },
        { x: 30, y: 10, type: "dirt" },
        { x: 30, y: 11, type: "dirt" },
        { x: 30, y: 12, type: "dirt" },
        { x: 30, y: 13, type: "dirt" },
        { x: 31, y: 4, type: "dirt" },
        { x: 31, y: 5, type: "dirt" },
        { x: 31, y: 6, type: "dirt" },
        { x: 31, y: 7, type: "dirt" },
        { x: 31, y: 8, type: "dirt" },
        { x: 31, y: 9, type: "dirt" },
        { x: 31, y: 10, type: "dirt" },
        { x: 31, y: 11, type: "dirt" },
        { x: 31, y: 12, type: "dirt" },
        { x: 31, y: 13, type: "dirt" }
    ];

    const levelPart2Blocks = [
      { x: 3, y: 3, type: "grass-on-dirt" }, { x: 4, y: 4, type: "grass-on-dirt" },
      { x: 5, y: 5, type: "grass-on-dirt" }, { x: 6, y: 6, type: "grass-on-dirt" },
      { x: 0, y: 4, type: "dirt" }, { x: 1, y: 4, type: "dirt" }, { x: 2, y: 4, type: "dirt" },
      { x: 3, y: 4, type: "dirt" }, { x: 0, y: 5, type: "dirt" }, { x: 1, y: 5, type: "dirt" },
      { x: 2, y: 5, type: "dirt" }, { x: 3, y: 5, type: "dirt" }, { x: 4, y: 5, type: "dirt" },
      { x: 0, y: 6, type: "dirt" }, { x: 1, y: 6, type: "dirt" }, { x: 2, y: 6, type: "dirt" },
      { x: 3, y: 6, type: "dirt" }, { x: 4, y: 6, type: "dirt" }, { x: 5, y: 6, type: "dirt" },
      { x: 0, y: 7, type: "dirt" }, { x: 1, y: 7, type: "dirt" }, { x: 2, y: 7, type: "dirt" },
      { x: 3, y: 7, type: "dirt" }, { x: 4, y: 7, type: "dirt" }, { x: 5, y: 7, type: "dirt" },
      { x: 6, y: 7, type: "dirt" }, { x: 7, y: 8, type: "dirt" }, { x: 7, y: 9, type: "dirt" },
      { x: 7, y: 10, type: "dirt" }, { x: 8, y: 10, type: "dirt" }, { x: 8, y: 9, type: "dirt" },
      { x: 9, y: 10, type: "dirt" }, { x: 6, y: 10, type: "dirt" }, { x: 6, y: 9, type: "dirt" },
      { x: 6, y: 8, type: "dirt" }, { x: 5, y: 8, type: "dirt" }, { x: 5, y: 9, type: "dirt" },
      { x: 7, y: 7, type: "grass-on-dirt" }, { x: 8, y: 8, type: "grass-on-dirt" },
      { x: 9, y: 9, type: "grass-on-dirt" }, { x: 10, y: 10, type: "grass-on-dirt" },
      { x: 11, y: 10, type: "grass-on-dirt" }, { x: 12, y: 10, type: "grass-on-dirt" },
      { x: 13, y: 10, type: "grass-on-dirt" }, { x: 14, y: 10, type: "grass-on-dirt" },
      { x: 15, y: 10, type: "grass-on-dirt" }, { x: 1, y: 8, type: "dirt" },
      { x: 0, y: 8, type: "dirt" }, { x: 2, y: 8, type: "dirt" }, { x: 3, y: 8, type: "dirt" },
      { x: 4, y: 8, type: "dirt" }, { x: 0, y: 9, type: "dirt" }, { x: 1, y: 9, type: "dirt" },
      { x: 2, y: 9, type: "dirt" }, { x: 3, y: 9, type: "dirt" }, { x: 4, y: 9, type: "dirt" },
      { x: 0, y: 10, type: "dirt" }, { x: 1, y: 10, type: "dirt" }, { x: 2, y: 10, type: "dirt" },
      { x: 3, y: 10, type: "dirt" }, { x: 4, y: 10, type: "dirt" }, { x: 5, y: 10, type: "dirt" },
      { x: 0, y: 11, type: "dirt" }, { x: 1, y: 11, type: "dirt" }, { x: 2, y: 11, type: "dirt" },
      { x: 3, y: 11, type: "dirt" }, { x: 4, y: 11, type: "dirt" }, { x: 5, y: 11, type: "dirt" },
      { x: 6, y: 11, type: "dirt" }, { x: 7, y: 11, type: "dirt" }, { x: 8, y: 11, type: "dirt" },
      { x: 9, y: 11, type: "dirt" }, { x: 9, y: 12, type: "dirt" }, { x: 8, y: 12, type: "dirt" },
      { x: 7, y: 12, type: "dirt" }, { x: 6, y: 12, type: "dirt" }, { x: 5, y: 12, type: "dirt" },
      { x: 4, y: 12, type: "dirt" }, { x: 3, y: 12, type: "dirt" }, { x: 2, y: 12, type: "dirt" },
      { x: 0, y: 12, type: "dirt" }, { x: 1, y: 12, type: "dirt" }, { x: 1, y: 13, type: "dirt" },
      { x: 0, y: 13, type: "dirt" }, { x: 2, y: 13, type: "dirt" }, { x: 3, y: 13, type: "dirt" },
      { x: 4, y: 13, type: "dirt" }, { x: 5, y: 13, type: "dirt" }, { x: 6, y: 13, type: "dirt" },
      { x: 7, y: 13, type: "dirt" }, { x: 8, y: 13, type: "dirt" }, { x: 9, y: 13, type: "dirt" },
      { x: 0, y: 14, type: "dirt" }, { x: 1, y: 14, type: "dirt" }, { x: 2, y: 14, type: "dirt" },
      { x: 3, y: 14, type: "dirt" }, { x: 4, y: 14, type: "dirt" }, { x: 5, y: 14, type: "dirt" },
      { x: 6, y: 14, type: "dirt" }, { x: 7, y: 14, type: "dirt" }, { x: 8, y: 14, type: "dirt" },
      { x: 9, y: 14, type: "dirt" }, { x: 9, y: 15, type: "dirt" }, { x: 8, y: 15, type: "dirt" },
      { x: 7, y: 15, type: "dirt" }, { x: 6, y: 15, type: "dirt" }, { x: 5, y: 15, type: "dirt" },
      { x: 4, y: 15, type: "dirt" }, { x: 3, y: 15, type: "dirt" }, { x: 2, y: 15, type: "dirt" },
      { x: 1, y: 15, type: "dirt" }, { x: 0, y: 15, type: "dirt" }, { x: 0, y: 16, type: "dirt" },
      { x: 1, y: 16, type: "dirt" }, { x: 2, y: 16, type: "dirt" }, { x: 3, y: 16, type: "dirt" },
      { x: 4, y: 16, type: "dirt" }, { x: 5, y: 16, type: "dirt" }, { x: 6, y: 16, type: "dirt" },
      { x: 7, y: 16, type: "dirt" }, { x: 8, y: 16, type: "dirt" }, { x: 9, y: 16, type: "dirt" },
      { x: 8, y: 17, type: "dirt" }, { x: 9, y: 17, type: "dirt" }, { x: 7, y: 17, type: "dirt" },
      { x: 6, y: 17, type: "dirt" }, { x: 5, y: 17, type: "dirt" }, { x: 4, y: 17, type: "dirt" },
      { x: 3, y: 17, type: "dirt" }, { x: 2, y: 17, type: "dirt" }, { x: 1, y: 17, type: "dirt" },
      { x: 0, y: 17, type: "dirt" }, { x: 10, y: 11, type: "dirt" }, { x: 10, y: 12, type: "dirt" },
      { x: 10, y: 13, type: "dirt" }, { x: 10, y: 14, type: "dirt" }, { x: 10, y: 15, type: "dirt" },
      { x: 10, y: 16, type: "dirt" }, { x: 10, y: 17, type: "dirt" }, { x: 11, y: 11, type: "dirt" },
      { x: 11, y: 12, type: "dirt" }, { x: 11, y: 13, type: "dirt" }, { x: 11, y: 14, type: "dirt" },
      { x: 11, y: 15, type: "dirt" }, { x: 11, y: 16, type: "dirt" }, { x: 11, y: 17, type: "dirt" },
      { x: 12, y: 11, type: "dirt" }, { x: 12, y: 12, type: "dirt" }, { x: 12, y: 13, type: "dirt" },
      { x: 12, y: 14, type: "dirt" }, { x: 12, y: 15, type: "dirt" }, { x: 12, y: 16, type: "dirt" },
      { x: 12, y: 17, type: "dirt" }, { x: 13, y: 11, type: "dirt" }, { x: 13, y: 12, type: "dirt" },
      { x: 13, y: 13, type: "dirt" }, { x: 13, y: 14, type: "dirt" }, { x: 13, y: 15, type: "dirt" },
      { x: 13, y: 16, type: "dirt" }, { x: 13, y: 17, type: "dirt" }, { x: 14, y: 11, type: "dirt" },
      { x: 14, y: 12, type: "dirt" }, { x: 14, y: 13, type: "dirt" }, { x: 14, y: 14, type: "dirt" },
      { x: 14, y: 15, type: "dirt" }, { x: 14, y: 16, type: "dirt" }, { x: 14, y: 17, type: "dirt" },
      { x: 15, y: 11, type: "dirt" }, { x: 15, y: 13, type: "dirt" }, { x: 15, y: 12, type: "dirt" },
      { x: 15, y: 14, type: "dirt" }, { x: 15, y: 15, type: "dirt" }, { x: 15, y: 16, type: "dirt" },
      { x: 15, y: 17, type: "dirt" }, { x: 16, y: 11, type: "dirt" }, { x: 17, y: 11, type: "dirt" },
      { x: 18, y: 11, type: "dirt" }, { x: 19, y: 11, type: "dirt" }, { x: 20, y: 11, type: "dirt" },
      { x: 21, y: 11, type: "dirt" }, { x: 22, y: 11, type: "dirt" }, { x: 23, y: 11, type: "dirt" },
      { x: 24, y: 11, type: "dirt" }, { x: 25, y: 11, type: "dirt" }, { x: 26, y: 11, type: "dirt" },
      { x: 27, y: 11, type: "dirt" }, { x: 28, y: 11, type: "dirt" }, { x: 30, y: 11, type: "dirt" },
      { x: 31, y: 11, type: "dirt" }, { x: 29, y: 11, type: "dirt" }, { x: 31, y: 12, type: "dirt" },
      { x: 30, y: 12, type: "dirt" }, { x: 29, y: 12, type: "dirt" }, { x: 28, y: 12, type: "dirt" },
      { x: 26, y: 12, type: "dirt" }, { x: 27, y: 12, type: "dirt" }, { x: 25, y: 12, type: "dirt" },
      { x: 24, y: 12, type: "dirt" }, { x: 23, y: 12, type: "dirt" }, { x: 21, y: 12, type: "dirt" },
      { x: 22, y: 12, type: "dirt" }, { x: 20, y: 12, type: "dirt" }, { x: 19, y: 12, type: "dirt" },
      { x: 18, y: 12, type: "dirt" }, { x: 17, y: 12, type: "dirt" }, { x: 16, y: 12, type: "dirt" },
      { x: 16, y: 13, type: "dirt" }, { x: 17, y: 13, type: "dirt" }, { x: 18, y: 13, type: "dirt" },
      { x: 19, y: 13, type: "dirt" }, { x: 20, y: 13, type: "dirt" }, { x: 21, y: 13, type: "dirt" },
      { x: 22, y: 13, type: "dirt" }, { x: 23, y: 13, type: "dirt" }, { x: 24, y: 13, type: "dirt" },
      { x: 25, y: 13, type: "dirt" }, { x: 26, y: 13, type: "dirt" }, { x: 28, y: 13, type: "dirt" },
      { x: 30, y: 13, type: "dirt" }, { x: 31, y: 13, type: "dirt" }, { x: 29, y: 13, type: "dirt" },
      { x: 27, y: 13, type: "dirt" }, { x: 16, y: 14, type: "dirt" }, { x: 17, y: 14, type: "dirt" },
      { x: 19, y: 14, type: "dirt" }, { x: 18, y: 14, type: "dirt" }, { x: 20, y: 14, type: "dirt" },
      { x: 22, y: 14, type: "dirt" }, { x: 21, y: 14, type: "dirt" }, { x: 23, y: 14, type: "dirt" },
      { x: 25, y: 14, type: "dirt" }, { x: 24, y: 14, type: "dirt" }, { x: 26, y: 14, type: "dirt" },
      { x: 27, y: 14, type: "dirt" }, { x: 28, y: 14, type: "dirt" }, { x: 29, y: 14, type: "dirt" },
      { x: 30, y: 14, type: "dirt" }, { x: 31, y: 14, type: "dirt" }, { x: 31, y: 15, type: "dirt" },
      { x: 30, y: 15, type: "dirt" }, { x: 29, y: 15, type: "dirt" }, { x: 28, y: 15, type: "dirt" },
      { x: 27, y: 15, type: "dirt" }, { x: 26, y: 15, type: "dirt" }, { x: 25, y: 15, type: "dirt" },
      { x: 24, y: 15, type: "dirt" }, { x: 23, y: 15, type: "dirt" }, { x: 22, y: 15, type: "dirt" },
      { x: 21, y: 15, type: "dirt" }, { x: 20, y: 15, type: "dirt" }, { x: 19, y: 15, type: "dirt" },
      { x: 18, y: 15, type: "dirt" }, { x: 17, y: 15, type: "dirt" }, { x: 16, y: 15, type: "dirt" },
      { x: 16, y: 16, type: "dirt" }, { x: 16, y: 17, type: "dirt" }, { x: 17, y: 17, type: "dirt" },
      { x: 17, y: 16, type: "dirt" }, { x: 18, y: 16, type: "dirt" }, { x: 20, y: 16, type: "dirt" },
      { x: 19, y: 16, type: "dirt" }, { x: 18, y: 17, type: "dirt" }, { x: 19, y: 17, type: "dirt" },
      { x: 20, y: 17, type: "dirt" }, { x: 21, y: 16, type: "dirt" }, { x: 21, y: 17, type: "dirt" },
      { x: 22, y: 16, type: "dirt" }, { x: 22, y: 17, type: "dirt" }, { x: 23, y: 16, type: "dirt" },
      { x: 23, y: 17, type: "dirt" }, { x: 24, y: 16, type: "dirt" }, { x: 24, y: 17, type: "dirt" },
      { x: 25, y: 16, type: "dirt" }, { x: 25, y: 17, type: "dirt" }, { x: 26, y: 16, type: "dirt" },
      { x: 26, y: 17, type: "dirt" }, { x: 27, y: 17, type: "dirt" }, { x: 27, y: 16, type: "dirt" },
      { x: 28, y: 16, type: "dirt" }, { x: 28, y: 17, type: "dirt" }, { x: 29, y: 17, type: "dirt" },
      { x: 29, y: 16, type: "dirt" }, { x: 30, y: 16, type: "dirt" }, { x: 30, y: 17, type: "dirt" },
      { x: 31, y: 17, type: "dirt" }, { x: 31, y: 16, type: "dirt" }, { x: 16, y: 10, type: "grass-on-dirt" },
      { x: 17, y: 10, type: "grass-on-dirt" }, { x: 18, y: 10, type: "grass-on-dirt" },
      { x: 19, y: 10, type: "grass-on-dirt" }, { x: 20, y: 10, type: "grass-on-dirt" },
      { x: 21, y: 10, type: "grass-on-dirt" }, { x: 22, y: 10, type: "grass-on-dirt" },
      { x: 23, y: 10, type: "grass-on-dirt" }, { x: 24, y: 10, type: "grass-on-dirt" },
      { x: 25, y: 10, type: "grass-on-dirt" }, { x: 26, y: 10, type: "grass-on-dirt" },
      { x: 27, y: 10, type: "grass-on-dirt" }, { x: 28, y: 10, type: "grass-on-dirt" },
      { x: 29, y: 10, type: "grass-on-dirt" }, { x: 30, y: 10, type: "grass-on-dirt" },
      { x: 31, y: 10, type: "grass-on-dirt" }, { x: 0, y: 3, type: "grass-on-dirt" },
      { x: 1, y: 3, type: "grass-on-dirt" }, { x: 2, y: 3, type: "grass-on-dirt" }
    ];

    const offsetPart2 = levelPart2Blocks.map(b => ({...b, x: b.x + 32}));

    // Add level part 3 with offset
    const levelPart3Blocks = [
        { "x": 0, "y": 17, "type": "dirt" }, { "x": 0, "y": 16, "type": "dirt" },
        { "x": 0, "y": 15, "type": "dirt" }, { "x": 0, "y": 13, "type": "dirt" },
        { "x": 0, "y": 14, "type": "dirt" }, { "x": 0, "y": 12, "type": "dirt" },
        { "x": 0, "y": 11, "type": "dirt" }, { "x": 0, "y": 10, "type": "grass-on-dirt" },
        { "x": 1, "y": 10, "type": "grass-on-dirt" }, { "x": 2, "y": 10, "type": "grass-on-dirt" },
        { "x": 3, "y": 10, "type": "grass-on-dirt" }, { "x": 4, "y": 10, "type": "grass-on-dirt" },
        { "x": 5, "y": 10, "type": "grass-on-dirt" }, { "x": 6, "y": 10, "type": "grass-on-dirt" },
        { "x": 1, "y": 11, "type": "dirt" }, { "x": 1, "y": 12, "type": "dirt" },
        { "x": 2, "y": 11, "type": "dirt" }, { "x": 2, "y": 12, "type": "dirt" },
        { "x": 1, "y": 13, "type": "dirt" }, { "x": 2, "y": 13, "type": "dirt" },
        { "x": 1, "y": 14, "type": "dirt" }, { "x": 2, "y": 14, "type": "dirt" },
        { "x": 1, "y": 15, "type": "dirt" }, { "x": 2, "y": 15, "type": "dirt" },
        { "x": 1, "y": 16, "type": "dirt" }, { "x": 2, "y": 16, "type": "dirt" },
        { "x": 1, "y": 17, "type": "dirt" }, { "x": 2, "y": 17, "type": "dirt" },
        { "x": 4, "y": 17, "type": "dirt" }, { "x": 3, "y": 16, "type": "dirt" },
        { "x": 4, "y": 16, "type": "dirt" }, { "x": 3, "y": 15, "type": "dirt" },
        { "x": 4, "y": 14, "type": "dirt" }, { "x": 3, "y": 13, "type": "dirt" },
        { "x": 4, "y": 12, "type": "dirt" }, { "x": 3, "y": 11, "type": "dirt" },
        { "x": 3, "y": 12, "type": "dirt" }, { "x": 4, "y": 11, "type": "dirt" },
        { "x": 4, "y": 13, "type": "dirt" }, { "x": 3, "y": 14, "type": "dirt" },
        { "x": 4, "y": 15, "type": "dirt" }, { "x": 3, "y": 17, "type": "dirt" },
        { "x": 5, "y": 17, "type": "dirt" }, { "x": 5, "y": 16, "type": "dirt" },
        { "x": 5, "y": 15, "type": "dirt" }, { "x": 5, "y": 14, "type": "dirt" },
        { "x": 5, "y": 13, "type": "dirt" }, { "x": 5, "y": 12, "type": "dirt" },
        { "x": 5, "y": 11, "type": "dirt" }, { "x": 6, "y": 11, "type": "dirt" },
        { "x": 6, "y": 12, "type": "dirt" }, { "x": 6, "y": 13, "type": "dirt" },
        { "x": 6, "y": 14, "type": "dirt" }, { "x": 6, "y": 15, "type": "dirt" },
        { "x": 6, "y": 16, "type": "dirt" }, { "x": 6, "y": 17, "type": "dirt" },
        { "x": 7, "y": 11, "type": "dirt" }, { "x": 8, "y": 11, "type": "dirt" },
        { "x": 9, "y": 11, "type": "dirt" }, { "x": 7, "y": 12, "type": "dirt" },
        { "x": 8, "y": 12, "type": "dirt" }, { "x": 9, "y": 12, "type": "dirt" },
        { "x": 7, "y": 13, "type": "dirt" }, { "x": 8, "y": 13, "type": "dirt" },
        { "x": 9, "y": 13, "type": "dirt" }, { "x": 7, "y": 14, "type": "dirt" },
        { "x": 8, "y": 14, "type": "dirt" }, { "x": 9, "y": 14, "type": "dirt" },
        { "x": 7, "y": 15, "type": "dirt" }, { "x": 8, "y": 15, "type": "dirt" },
        { "x": 9, "y": 15, "type": "dirt" }, { "x": 7, "y": 16, "type": "dirt" },
        { "x": 8, "y": 16, "type": "dirt" }, { "x": 9, "y": 16, "type": "dirt" },
        { "x": 7, "y": 17, "type": "dirt" }, { "x": 8, "y": 17, "type": "dirt" },
        { "x": 9, "y": 17, "type": "dirt" }, { "x": 7, "y": 10, "type": "grass-on-dirt" },
        { "x": 8, "y": 10, "type": "grass-on-dirt" }, { "x": 9, "y": 10, "type": "grass-on-dirt" },
        { "x": 13, "y": 10, "type": "grass-on-dirt" }, { "x": 14, "y": 10, "type": "grass-on-dirt" },
        { "x": 15, "y": 10, "type": "grass-on-dirt" }, { "x": 16, "y": 10, "type": "grass-on-dirt" },
        { "x": 18, "y": 10, "type": "grass-on-dirt" }, { "x": 17, "y": 10, "type": "grass-on-dirt" },
        { "x": 30, "y": 10, "type": "grass-on-dirt" }, { "x": 31, "y": 10, "type": "grass-on-dirt" },
        { "x": 10, "y": 17, "type": "dirt" }, { "x": 11, "y": 17, "type": "dirt" },
        { "x": 12, "y": 17, "type": "dirt" }, { "x": 13, "y": 17, "type": "dirt" },
        { "x": 15, "y": 17, "type": "dirt" }, { "x": 16, "y": 17, "type": "dirt" },
        { "x": 17, "y": 17, "type": "dirt" }, { "x": 18, "y": 17, "type": "dirt" },
        { "x": 19, "y": 17, "type": "dirt" }, { "x": 20, "y": 17, "type": "dirt" },
        { "x": 21, "y": 17, "type": "dirt" }, { "x": 22, "y": 17, "type": "dirt" },
        { "x": 23, "y": 17, "type": "dirt" }, { "x": 24, "y": 17, "type": "dirt" },
        { "x": 25, "y": 17, "type": "dirt" }, { "x": 26, "y": 17, "type": "dirt" },
        { "x": 27, "y": 17, "type": "dirt" }, { "x": 28, "y": 17, "type": "dirt" },
        { "x": 29, "y": 17, "type": "dirt" }, { "x": 30, "y": 17, "type": "dirt" },
        { "x": 31, "y": 17, "type": "dirt" }, { "x": 31, "y": 16, "type": "dirt" },
        { "x": 31, "y": 15, "type": "dirt" }, { "x": 31, "y": 14, "type": "dirt" },
        { "x": 31, "y": 12, "type": "dirt" }, { "x": 31, "y": 11, "type": "dirt" },
        { "x": 30, "y": 11, "type": "dirt" }, { "x": 30, "y": 12, "type": "dirt" },
        { "x": 31, "y": 13, "type": "dirt" }, { "x": 30, "y": 13, "type": "dirt" },
        { "x": 30, "y": 14, "type": "dirt" }, { "x": 30, "y": 15, "type": "dirt" },
        { "x": 30, "y": 16, "type": "dirt" }, { "x": 29, "y": 11, "type": "dirt" },
        { "x": 29, "y": 12, "type": "dirt" }, { "x": 29, "y": 14, "type": "dirt" },
        { "x": 29, "y": 13, "type": "dirt" }, { "x": 29, "y": 15, "type": "dirt" },
        { "x": 29, "y": 16, "type": "dirt" }, { "x": 28, "y": 16, "type": "dirt" },
        { "x": 28, "y": 15, "type": "dirt" }, { "x": 28, "y": 14, "type": "dirt" },
        { "x": 28, "y": 13, "type": "dirt" }, { "x": 28, "y": 12, "type": "dirt" },
        { "x": 28, "y": 11, "type": "dirt" }, { "x": 21, "y": 9, "type": "grass-on-dirt" },
        { "x": 22, "y": 9, "type": "grass-on-dirt" }, { "x": 23, "y": 9, "type": "grass-on-dirt" },
        { "x": 24, "y": 9, "type": "grass-on-dirt" }, { "x": 25, "y": 9, "type": "grass-on-dirt" },
        { "x": 29, "y": 10, "type": "grass-on-dirt" }, { "x": 28, "y": 10, "type": "grass-on-dirt" },
        { "x": 14, "y": 17, "type": "dirt" }, { "x": 27, "y": 11, "type": "dirt" },
        { "x": 27, "y": 12, "type": "dirt" }, { "x": 27, "y": 13, "type": "dirt" },
        { "x": 27, "y": 14, "type": "dirt" }, { "x": 27, "y": 15, "type": "dirt" },
        { "x": 27, "y": 16, "type": "dirt" }, { "x": 26, "y": 12, "type": "dirt" },
        { "x": 26, "y": 13, "type": "dirt" }, { "x": 26, "y": 14, "type": "dirt" },
        { "x": 26, "y": 16, "type": "dirt" }, { "x": 26, "y": 15, "type": "dirt" },
        { "x": 25, "y": 13, "type": "dirt" }, { "x": 25, "y": 14, "type": "dirt" },
        { "x": 25, "y": 15, "type": "dirt" }, { "x": 25, "y": 16, "type": "dirt" },
        { "x": 24, "y": 16, "type": "dirt" }, { "x": 24, "y": 15, "type": "dirt" },
        { "x": 24, "y": 14, "type": "dirt" }, { "x": 23, "y": 15, "type": "dirt" },
        { "x": 23, "y": 16, "type": "dirt" }, { "x": 22, "y": 16, "type": "dirt" }
    ];

    const offsetPart3 = levelPart3Blocks.map(b => ({...b, x: b.x + 64}));

    const levelData = {
      blocks: [
        ...levelPart1Blocks,
        ...offsetPart2,
        ...offsetPart3
      ],
      monsters: [
        { "x": 16 + 64, "y": 14 }
      ]
    };

    // Create all blocks
    levelData.blocks.forEach(block => {
      const x = block.x * scaledSize;
      const y = block.y * scaledSize;
      const blockSprite = this.platforms.create(x, y, block.type);
      blockSprite.setScale(scale).setOrigin(0, 0).refreshBody();
      
      if (block.type === 'grass-on-dirt') {
        const body = blockSprite.body as Phaser.Physics.Arcade.Body;
        body.setSize(scaledSize - 2, 8).setOffset(1, 12);
      }
    });

    // Create monsters if they exist in level data
    if (levelData.monsters) {
      levelData.monsters.forEach(monster => {
        const x = monster.x * scaledSize;
        const y = monster.y * scaledSize;
        const monsterSprite = this.monsters.create(x, y, 'slime-attack-1');
        monsterSprite.setScale(scale)
          .setOrigin(0, 0)
          .setBounce(0.2)
          .setCollideWorldBounds(true);
        
        // Adjust monster hitbox to match the slime's actual shape
        const body = monsterSprite.body as Phaser.Physics.Arcade.Body;
        body.setSize(12, 15);
        body.setOffset(6, 9);
    
        // Play the spawn animation first, then loop the attack animation
        monsterSprite.play('slime-spawn').on('animationcomplete', () => {
          monsterSprite.play('slime-attack');
        });
        
        // Add basic patrol behavior
        this.addMonsterPatrol(monsterSprite as Phaser.Physics.Arcade.Sprite);
      });
    }

    // Calculate world bounds based on level size
    const worldWidth = 96 * scaledSize; // Updated to 96 tiles
    const worldHeight = 18 * scaledSize; // 18 tiles high (based on the level data)

    // Set world bounds
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    
    // Create a background that fills the world
    const background = this.add.rectangle(0, 0, worldWidth, worldHeight, 0x87CEEB);
    background.setOrigin(0, 0);
    background.setDepth(-1);

    // Configure camera
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor(0x87CEEB);

    // Position player at the start
    const playerStartX = scaledSize;
    const playerStartY = 12 * scaledSize;
    if (!this.player) {
      this.player = this.physics.add.sprite(playerStartX, playerStartY, 'knight-idle-0');
      this.player.setScale(scale);
      this.player.setBounce(0.2);
      this.player.setCollideWorldBounds(true);

      // Adjust the player's hitbox to be smaller and correctly positioned
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setSize(12, 20);
      body.setOffset(10, 10);

      this.playAnimation('idle');
      this.player.setDepth(2);
    } else if ((this.player as any).setVelocity) {
      // This block should rarely run now, but keep as fallback with logging
      console.log('[CreateLevel-Else] about to reset player', {
        destroyed: !this.player?.scene,
        hasSetVelocity: typeof (this.player as any).setVelocity === 'function'
      });
      this.player.setPosition(playerStartX, playerStartY);
      if (this.player.body) {
        this.player.body.enable = true;
      }
      this.player.setVelocity(0, 0);
      this.playAnimation('idle');
    }

    // Add collisions with monsters
    this.physics.add.collider(this.monsters, this.platforms);
    this.physics.add.collider(
      this.player,
      this.monsters,
      (obj1, obj2) => {
        this.handleMonsterCollision(
          obj1 as Phaser.Physics.Arcade.Sprite,
          obj2 as Phaser.Physics.Arcade.Sprite
        );
      },
      undefined,
      this
    );

    // Add collision between player and platforms
    this.physics.add.collider(this.player, this.platforms);

    // Calculate the end point position (at the rightmost wall)
    this.levelEndX = 95 * scaledSize; // One block from the right edge
    
    // Create a visual indicator for the level end point
    this.levelEndPoint = this.add.rectangle(
      this.levelEndX,
      13 * scaledSize, // Place it at a good height
      8,
      scaledSize * 2,
      0xFFD700 // Gold color
    );
    
    // Add a glow effect
    this.tweens.add({
      targets: this.levelEndPoint,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  private addMonsterPatrol(monster: Phaser.Physics.Arcade.Sprite) {
    const speed = 50;
    monster.setVelocityX(speed);

    // Set up patrol movement
    this.time.addEvent({
      delay: 2000,
      callback: () => {
        if (monster.body && !(monster as any).isDying && !(monster as any).isHit) {
          monster.setVelocityX(-monster.body.velocity.x);
          monster.flipX = monster.body.velocity.x < 0;
        }
      },
      loop: true
    });
  }

  private handleMonsterHit(monster: Phaser.Physics.Arcade.Sprite, player: Phaser.Physics.Arcade.Sprite) {
    if ((monster as any).isHit) return;
  
    (monster as any).isHit = true;
    monster.play('slime-hit', true);
    
    const knockbackDirection = player.x < monster.x ? 1 : -1;
    monster.setVelocity(knockbackDirection * 150, -150);
  
    this.time.delayedCall(500, () => {
        if (monster.active) {
            (monster as any).isHit = false;
            monster.setVelocityX(monster.flipX ? -50 : 50);
            monster.play('slime-attack');
        }
    });
  }

  private handleMonsterCollision(
    playerSprite: Phaser.Physics.Arcade.Sprite,
    monsterSprite: Phaser.Physics.Arcade.Sprite
  ) {
    if (!playerSprite.body || !monsterSprite.body || this.isInvincible) return;

    const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
    const monsterBody = monsterSprite.body as Phaser.Physics.Arcade.Body;

    // If player is rolling, they're invincible
    if (this.isRolling) {
      this.defeatMonster(monsterSprite);
      return;
    }

    // If player is above monster (jumping on their head)
    if (playerBody.touching.down && monsterBody.touching.up) {
      // Bounce player up with less force (more like Mario)
      playerBody.velocity.y = -200;
      // Defeat the monster immediately
      this.defeatMonster(monsterSprite);
    } else {
      // Player gets hit by monster
      this.isInvincible = true;
      
      // Play hurt sound
      this.hurtSound.play();

      // Play hit animation
      this.player?.play('hit');

      // Knockback effect
      const knockbackDirection = playerSprite.x < monsterSprite.x ? -1 : 1;
      playerBody.velocity.x = knockbackDirection * 250;
      playerBody.velocity.y = -180;

      // Update health and check for death
      this.healthBar.updateHealth(this.healthBar.getCurrentHealth() - 1);

      // Flash effect for invincibility
      let flashCount = 0;
      const flash = this.time.addEvent({
        delay: 100,
        callback: () => {
          if (this.player) {
            this.player.alpha = this.player.alpha === 0.4 ? 1 : 0.4;
            flashCount++;
            if (flashCount >= 4) { // Reduced from 8 to 4 flashes
              flash.destroy();
              if (this.player) this.player.alpha = 1;
              this.isInvincible = false;
            }
          }
        },
        repeat: -1
      });

      // Return to idle animation after hit
      this.time.delayedCall(400, () => {
        if (this.player && this.player.body) {
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          if (body.touching.down) {
            this.currentAnimation = 'idle';
            this.player.play('idle');
          }
        }
      });

      // Check if player died
      if (this.healthBar.getCurrentHealth() <= 0) {
        this.handlePlayerDeath();
      }
    }
  }

  private handlePlayerDeath() {
    if (!this.player) return;
    
    // Disable player controls and physics
    this.player.setVelocity(0, -150); // Even smaller upward bounce on death
    if (this.player.body) {
      this.player.body.enable = false;
    }
    this.isRolling = false;
    this.canRoll = false;
    
    // Update health bar to show empty state
    this.healthBar.updateHealth(0);
    
    // Play death animation
    this.player.play('death').once('animationcomplete', () => {
      // Stop on last frame
      this.player?.stop();
      
      // Wait 2 seconds before restarting
      this.time.delayedCall(2000, () => {
        this.scene.restart();
      });
    });
  }

  private defeatMonster(monster: Phaser.Physics.Arcade.Sprite) {
    if ((monster as any).isDying) return;
    
    (monster as any).isDying = true;
    monster.play('slime-hit', true);
    
    // Disable monster physics
    if (monster.body) {
      monster.body.enable = false;
    }
    
    // Add a small upward bounce when defeated
    monster.setVelocity(0, -100);
    
    // Fade out and destroy
    this.tweens.add({
      targets: monster,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        monster.destroy();
      }
    });
  }

  resize(gameSize: Phaser.Structs.Size) {
    if (!this.isGameCreated) return;

    this.gameWidth = gameSize.width;
    this.gameHeight = gameSize.height;
    
    // Update score text size if it exists
    if (this.scoreText) {
      const fontSize = Math.max(32, Math.min(48, this.gameWidth / 20));
      this.scoreText.setFontSize(fontSize);
    }

    // Calculate new scale based on screen height
    const scale = 4;
    const baseSize = 16;
    const scaledSize = baseSize * scale;
    
    // Calculate world dimensions
    const worldWidth = 96 * scaledSize; // Updated to 96 tiles
    const worldHeight = 18 * scaledSize;

    // Store player position and state before resize if player exists
    let playerState = null;
    if (this.player) {
      playerState = {
        x: this.player.x,
        y: this.player.y,
        velocityX: this.player.body?.velocity.x || 0,
        velocityY: this.player.body?.velocity.y || 0,
        isRolling: this.isRolling,
        canRoll: this.canRoll,
        animation: this.currentAnimation,
        flipX: this.player.flipX
      };
    }

    // Update camera and world bounds
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // Set the camera viewport to match the game size exactly
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);

    // Adjust the camera zoom to ensure the game fills the viewport vertically
    const zoom = gameSize.height / worldHeight;
    this.cameras.main.setZoom(zoom);

    // Center the camera horizontally
    const excessWidth = (gameSize.width / zoom) - worldWidth;
    if (excessWidth > 0) {
      this.cameras.main.scrollX = -excessWidth / 2;
    }

    // Only recreate the level if it doesn't exist
    if (!this.platforms || this.platforms.countActive() === 0) {
    this.createLevel();
    }

    // Restore player state if it was saved
    if (playerState && this.player && (this.player as any).setVelocity) {
      this.player.setPosition(playerState.x, playerState.y);
      // Ensure body exists before applying velocity
      if (this.player.body) {
        this.player.setVelocity(playerState.velocityX, playerState.velocityY);
      }
      this.isRolling = playerState.isRolling;
      this.canRoll = playerState.canRoll;
      this.player.setFlipX(playerState.flipX);
      if (playerState.animation) {
        this.playAnimation(playerState.animation);
      }
    }
  }

  update() {
    if (!this.cursors || !this.player || !this.player.body || this.isLevelComplete) return;

    // Check for level completion
    if (this.player.x >= this.levelEndX) {
      this.completeLevelOne();
      return;
    }

    const speed = this.gameWidth * 0.2;

    if (!this.isRolling && !this.isInvincible) {
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
        if (this.player.body?.touching.down) {
          this.playAnimation('run');
        }
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
        if (this.player.body?.touching.down) {
          this.playAnimation('run');
        }
      } else {
        this.player.setVelocityX(0);
        if (this.player.body.touching.down) {
          this.playAnimation('idle');
        }
      }

      if (this.cursors.up.isDown && this.player.body.touching.down) {
        const blockScale = 4;
        const twoBlocksHeight = 2 * 16 * blockScale;
        this.player.setVelocityY(-Math.sqrt(2 * this.physics.world.gravity.y * twoBlocksHeight));
        try {
          this.sound.play('jump');
        } catch (error) {
          console.warn('Could not play jump sound:', error);
        }
      }
    } else {
      // Ensure no other movement can affect the player during roll
      if (this.player.body) {
        const currentVelX = this.player.body.velocity.x;
        if (currentVelX !== 0) {
          this.player.setVelocityX(currentVelX);
        }
      }
    }
  }

  private completeLevelOne() {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;

    // Disable player controls
    if (this.player) {
      this.player.setVelocity(0, 0);
      if (this.player.body) {
        this.player.body.enable = false;
      }
      this.playAnimation('idle');
    }

    // Create completion text
    const completionText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'Tutorial Complete!',
      {
        fontFamily: 'PixelOperator8-Bold',
        fontSize: '64px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 8,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Add "Press Space to Continue" text
    const continueText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'Press Space to Continue',
      {
        fontFamily: 'PixelOperator8',
        fontSize: '32px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 4
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Add blinking effect to continue text
    this.tweens.add({
      targets: continueText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Listen for space key to restart or go to next level
    this.input.keyboard?.once('keydown-SPACE', () => {
      // Clean up completion UI
      completionText.destroy();
      continueText.destroy();
      
      // Reset the scene
      this.scene.restart();
    });
  }
} 