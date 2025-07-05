import * as Phaser from 'phaser';

export class TutorialScene extends Phaser.Scene {
  private tutorialKnight!: Phaser.GameObjects.Sprite;
  private tutorialText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;
  private tutorialStep: number = 0;
  private tutorialSteps = [
    {
      text: "Welcome brave knight! Let me teach you the ways of our realm.",
      animation: 'idle'
    },
    {
      text: "Use the LEFT and RIGHT ARROW keys to move.",
      animation: 'run'
    },
    {
      text: "Press the UP ARROW key to jump over obstacles.",
      animation: 'idle'
    },
    {
      text: "Press SPACE to perform a roll and avoid enemies.",
      animation: 'roll'
    },
    {
      text: "If you get hit by a monster from the side, it's game over!\nBut jump on their heads to defeat them!",
      animation: 'hit'
    }
  ];

  constructor() {
    super({ key: 'TutorialScene' });
  }

  preload() {
    // Load knight animations if not already loaded
    if (!this.anims.exists('tutorial-idle')) {
      for (let i = 0; i < 4; i++) {
        this.load.image(
          `tutorial-knight-idle-${i}`,
          `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Idle/${i.toString().padStart(2, '0')}_knight.png`
        );
      }
      for (let i = 0; i < 16; i++) {
        const fileIndex = i + 16;
        this.load.image(
          `tutorial-knight-run-${i}`,
          `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Run/${fileIndex.toString().padStart(2, '0')}_knight.png`
        );
      }
      for (let i = 0; i < 8; i++) {
        const rollIndex = i + 40;
        this.load.image(
          `tutorial-knight-roll-${i}`,
          `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Roll/${rollIndex.toString().padStart(2, '0')}_knight.png`
        );
      }
      for (let i = 0; i < 4; i++) {
        const hitIndex = i + 48;
        this.load.image(
          `tutorial-knight-hit-${i}`,
          `/assets/brackeys_platformer_assets/sprites/KnightMovementStuff/knight/Hit/${hitIndex.toString().padStart(2, '0')}_knight.png`
        );
      }
    }
  }

  create() {
    // Create animations
    if (!this.anims.exists('tutorial-idle')) {
      this.anims.create({
        key: 'tutorial-idle',
        frames: Array.from({ length: 4 }, (_, i) => ({ key: `tutorial-knight-idle-${i}` })),
        frameRate: 8,
        repeat: -1
      });

      this.anims.create({
        key: 'tutorial-run',
        frames: Array.from({ length: 16 }, (_, i) => ({ key: `tutorial-knight-run-${i}` })),
        frameRate: 24,
        repeat: -1
      });

      this.anims.create({
        key: 'tutorial-roll',
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `tutorial-knight-roll-${i}` })),
        frameRate: 16,
        repeat: 0
      });

      this.anims.create({
        key: 'tutorial-hit',
        frames: Array.from({ length: 4 }, (_, i) => ({ key: `tutorial-knight-hit-${i}` })),
        frameRate: 12,
        repeat: 0
      });
    }

    // Create giant tutorial knight
    this.tutorialKnight = this.add.sprite(
      this.scale.width * 0.3,
      this.scale.height * 0.5,
      'tutorial-knight-idle-0'
    );
    this.tutorialKnight.setScale(8); // Make the knight huge!

    // Add tutorial text
    this.tutorialText = this.add.text(
      this.scale.width * 0.6,
      this.scale.height * 0.4,
      '',
      {
        fontSize: '32px',
        color: '#fff',
        backgroundColor: '#000',
        padding: { x: 20, y: 10 },
        align: 'center',
        wordWrap: { width: this.scale.width * 0.4 }
      }
    ).setOrigin(0.5);

    // Add continue text
    this.continueText = this.add.text(
      this.scale.width * 0.6,
      this.scale.height * 0.6,
      'Click or press SPACE to continue',
      {
        fontSize: '24px',
        color: '#fff',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);

    // Make continue text blink
    this.tweens.add({
      targets: this.continueText,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      yoyo: true,
      repeat: -1
    });

    // Add click/space handler to advance tutorial
    this.input.on('pointerdown', () => this.nextStep());
    this.input.keyboard?.on('keydown-SPACE', () => this.nextStep());

    // Start with first tutorial step
    this.showCurrentStep();
  }

  private showCurrentStep() {
    const step = this.tutorialSteps[this.tutorialStep];
    this.tutorialText.setText(step.text);
    this.tutorialKnight.play('tutorial-' + step.animation);

    // If it's the roll animation, replay it periodically
    if (step.animation === 'roll') {
      this.time.addEvent({
        delay: 2000,
        callback: () => {
          if (this.tutorialStep === 3) { // Roll step
            this.tutorialKnight.play('tutorial-roll');
          }
        },
        loop: true
      });
    }
  }

  private nextStep() {
    this.tutorialStep++;
    if (this.tutorialStep >= this.tutorialSteps.length) {
      // Tutorial complete - mark as completed and start game
      localStorage.setItem('tutorialCompleted', 'true');
      this.scene.start('MainScene');
    } else {
      this.showCurrentStep();
    }
  }
} 