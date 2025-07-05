import * as Phaser from 'phaser';

export class HealthBar {
  private scene: Phaser.Scene;
  private healthSprite!: Phaser.GameObjects.Sprite;
  private spriteFrame!: Phaser.GameObjects.Sprite;
  private maxHealth: number = 5;
  private currentHealth: number = 5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Load health bar assets if not already loaded
    if (!this.scene.textures.exists('health-frame')) {
      this.scene.load.image('health-frame', '/assets/brackeys_platformer_assets/sprites/HealthBar/spriteAroundSprite.png');
      this.scene.load.image('health-full', '/assets/brackeys_platformer_assets/sprites/HealthBar/fullHealth.png');
      this.scene.load.image('health-damage-1', '/assets/brackeys_platformer_assets/sprites/HealthBar/damageone.png');
      this.scene.load.image('health-damage-2', '/assets/brackeys_platformer_assets/sprites/HealthBar/damagetwo.png');
      this.scene.load.image('health-damage-3', '/assets/brackeys_platformer_assets/sprites/HealthBar/damagethree.png');
      this.scene.load.image('health-damage-4', '/assets/brackeys_platformer_assets/sprites/HealthBar/damagefour.png');
      this.scene.load.image('health-almost-dead', '/assets/brackeys_platformer_assets/sprites/HealthBar/almostdead.png');
      
      // Wait for the images to load
      this.scene.load.once('complete', this.create, this);
      this.scene.load.start();
    } else {
      this.create();
    }
  }

  private create() {
    const xPosition = 130; // Moved 20px to the right (from 70 to 90)
    const yPosition = 60; // Keep same vertical position

    // Create the frame first (background)
    this.spriteFrame = this.scene.add.sprite(xPosition, yPosition, 'health-frame');
    this.spriteFrame.setScrollFactor(0); // Fix to camera
    this.spriteFrame.setDepth(10); // Ensure it's above other elements

    // Create the health bar sprite
    this.healthSprite = this.scene.add.sprite(xPosition, yPosition, 'health-full');
    this.healthSprite.setScrollFactor(0); // Fix to camera
    this.healthSprite.setDepth(11); // Ensure it's above the frame

    // Scale both sprites
    const scale = 4;
    this.spriteFrame.setScale(scale);
    this.healthSprite.setScale(scale);
  }

  public updateHealth(health: number) {
    this.currentHealth = Phaser.Math.Clamp(health, 0, this.maxHealth);
    
    if (this.currentHealth === 0) {
      // When dead, hide the health indicator but keep frame
      this.healthSprite.setVisible(false);
      return;
    }
    
    this.healthSprite.setVisible(true);
    // Update the health bar sprite based on current health
    let texture = 'health-full';
    if (this.currentHealth === 4) {
      texture = 'health-damage-1';
    } else if (this.currentHealth === 3) {
      texture = 'health-damage-2';
    } else if (this.currentHealth === 2) {
      texture = 'health-damage-3';
    } else if (this.currentHealth === 1) {
      texture = 'health-damage-4';
    }
    
    this.healthSprite.setTexture(texture);
  }

  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public reset() {
    this.currentHealth = this.maxHealth;
    this.healthSprite.setVisible(true);
    this.updateHealth(this.currentHealth);
  }
} 