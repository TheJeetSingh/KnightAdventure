import * as Phaser from 'phaser';

type BlockCategory = 'terrain' | 'decorative' | 'special' | 'tree';

export class LevelEditorScene extends Phaser.Scene {
  private blocks!: Phaser.Physics.Arcade.StaticGroup;
  private monsters!: Phaser.Physics.Arcade.Group;
  private currentBlockType: string = 'grass-on-dirt';
  private grid: { [key: string]: string } = {};
  private monsterLocations: { x: number, y: number }[] = [];
  private blockScale: number = 4;
  private blockSize!: number;
  private uiText!: Phaser.GameObjects.Text;
  private exportButton!: Phaser.GameObjects.Text;
  private uiLayer!: Phaser.GameObjects.Container;
  private commandModal!: Phaser.GameObjects.Container;
  private commandModalVisible: boolean = false;
  private isPlacingMonster: boolean = false;
  private blockCategories: Record<BlockCategory, string[]> = {
    terrain: [
      'grass-on-dirt',
      'dirt',
      'ice-block',
      'ice-on-stone',
      'snow-on-deepslate',
      'snow-on-ice',
      'broken-stone',
      'broken-sandy-block',
      'normal-sandy-block',
      'sandy-block',
      'broken-snow',
      'broken-blue-stone',
      'broken-purple-stone',
      'broken-yellow-stone',
      'broken-copper',
      'solid-copper',
      'deepslate-broken'
    ],
    decorative: [
      'wooden-crate',
      'question-mark-crate',
      'exclamation-mark-crate',
      'green-mushroom',
      'red-mushroom',
      'pink-mushroom',
      'yellow-mushroom',
      'three-green-mushroom',
      'three-red-mushroom',
      'three-pink-mushroom',
      'three-yellow-mushroom',
      'daisy-bush',
      'pumpkin',
      'blue-glass-bottle',
      'green-glass-bottle',
      'purple-glass-bottle',
      'yellow-glass-bottle',
      'exclamation-mark-sign',
      'people-sign'
    ],
    special: [
      'water',
      'water-head',
      'lava',
      'lava-head'
    ],
    tree: [
      'tree-base',
      'tree-middle',
      'tree-middle-alternate',
      'tree-almost-top',
      'tree-top-left',
      'tree-top-middle',
      'tree-top-right'
    ]
  };
  private currentCategory: BlockCategory = 'terrain';
  private blockIndex: number = 0;

  constructor() {
    super({ key: 'LevelEditorScene' });
  }

  preload() {
    // Load terrain blocks
    this.blockCategories.terrain.forEach(block => {
      const fileName = block.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      this.load.image(block, `/assets/brackeys_platformer_assets/sprites/WorldBlocks/world_tileset/${fileName}.png`);
    });

    // Load decorative blocks
    this.blockCategories.decorative.forEach(block => {
      const fileName = block.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      this.load.image(block, `/assets/brackeys_platformer_assets/sprites/WorldBlocks/world_tileset/${fileName}.png`);
    });

    // Load special blocks
    this.blockCategories.special.forEach(block => {
      const fileName = block.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      this.load.image(block, `/assets/brackeys_platformer_assets/sprites/WorldBlocks/world_tileset/${fileName}.png`);
    });

    // Load tree blocks
    this.blockCategories.tree.forEach(block => {
      const fileName = block.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      this.load.image(block, `/assets/brackeys_platformer_assets/sprites/WorldBlocks/world_tileset/${fileName}.png`);
    });
    
    // Load monster sprite
    this.load.image('monster', '/assets/brackeys_platformer_assets/sprites/Monsters/slime_green/AttackOne.png');
  }

  create() {
    this.blocks = this.physics.add.staticGroup();
    this.monsters = this.physics.add.group();
    
    this.blockSize = this.textures.get('dirt').getSourceImage().width * this.blockScale;

    // Add collision between monsters and platforms
    this.physics.add.collider(this.monsters, this.blocks);

    // Create command modal (hidden by default)
    this.commandModal = this.add.container(0, 0);
    this.commandModal.setDepth(1000);

    const modalBg = this.add.rectangle(0, 0, this.game.canvas.width, this.game.canvas.height, 0x000000, 0.8)
      .setOrigin(0);
    this.commandModal.add(modalBg);

    const modalText = this.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2 - 200,
      'Command Menu', { fontSize: '40px', color: '#fff' }).setOrigin(0.5);
    this.commandModal.add(modalText);

    const instructions = [
      'Block Categories:',
      '1: Terrain Blocks',
      '2: Decorative Blocks',
      '3: Special Blocks',
      '4: Tree Blocks',
      '5: Monster',
      '',
      'Controls:',
      'Left/Right Arrow: Cycle through blocks in category',
      'Left Click: Place Block/Monster',
      'Right Click: Remove Block/Monster',
      'S: Save Level',
      'Q / Esc: Close Menu',
      'M: Back to Menu',
      '',
      `Current Block: ${this.currentBlockType}`
    ];

    instructions.forEach((line, idx) => {
      const txt = this.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2 - 140 + idx * 30, line,
        { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
      this.commandModal.add(txt);
    });

    // Start hidden
    this.commandModal.setVisible(false);

    // Handle input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore clicks when modal is open and inside bounds
      const clickedUI = this.commandModalVisible && this.commandModal.getBounds().contains(pointer.x, pointer.y);
      if (clickedUI) return;

      const x = Math.floor(pointer.x / this.blockSize) * this.blockSize;
      const y = Math.floor(pointer.y / this.blockSize) * this.blockSize;
      const key = `${x},${y}`;

      if (pointer.rightButtonDown()) {
        // Remove block or monster
        if (this.grid[key]) {
          const blocks = this.blocks.getChildren();
          const block = blocks.find(
            (b) => {
              const sprite = b as Phaser.GameObjects.Sprite;
              return sprite.x === x && sprite.y === y;
            }
          );
          if (block) {
            block.destroy();
            delete this.grid[key];
          }
        }
        
        // Check for monster at this location
        const monsters = this.monsters.getChildren();
        const monsterToDelete = monsters.find(
          (m) => {
            const sprite = m as Phaser.Physics.Arcade.Sprite;
            if (!sprite.body) return false;
            const body = sprite.body as Phaser.Physics.Arcade.Body;
            const bounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
            return Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y);
          }
        );

        if (monsterToDelete) {
          const spawnPoint = monsterToDelete.getData('spawnPoint') as { x: number, y: number };
          monsterToDelete.destroy();
          if (spawnPoint) {
              this.monsterLocations = this.monsterLocations.filter(loc => 
                  loc.x !== spawnPoint.x || loc.y !== spawnPoint.y
              );
          }
        }
      } else {
        // Place block or monster
        if (this.isPlacingMonster) {
          // Check if there's already a monster here
          const existingMonster = this.monsterLocations.find(m => m.x === x && m.y === y);
          if (!existingMonster) {
            const monster = this.monsters.create(x, y, 'monster');
            monster.setData('spawnPoint', { x, y });
            monster.setScale(this.blockScale)
              .setOrigin(0, 0)
              .setBounce(0.2)
              .setCollideWorldBounds(true);
            
            // Enable physics and set gravity for this specific monster
            const monsterBody = monster.body as Phaser.Physics.Arcade.Body;
            if (monsterBody) {
              monsterBody.setGravityY(300);
              // Make the monster's hitbox slightly smaller than the sprite
              monsterBody.setSize(monster.width * 0.8, monster.height * 0.8);
              monsterBody.setOffset(monster.width * 0.1, monster.height * 0.1);
            }
            
            this.monsterLocations.push({ x, y });
          }
        } else if (!this.grid[key]) {
          const block = this.blocks.create(x, y, this.currentBlockType);
          block.setScale(this.blockScale)
            .setOrigin(0, 0)
            .refreshBody();
          
          // Set collision boxes based on block type
          const body = block.body as Phaser.Physics.Arcade.StaticBody;
          if (body) {
            if (this.currentBlockType === 'grass-on-dirt') {
              body.setSize(this.blockSize - 2, 8).setOffset(1, 12);
            } else if (this.blockCategories.decorative.includes(this.currentBlockType)) {
              // Make decorative blocks non-collidable
              body.enable = false;
            } else if (this.blockCategories.special.includes(this.currentBlockType)) {
              // Special blocks like water and lava should be non-collidable
              body.enable = false;
            } else {
              // Default collision box for terrain blocks
              body.setSize(this.blockSize, this.blockSize).setOffset(0, 0);
            }
          }
          
          this.grid[key] = this.currentBlockType;
        }
      }
    });

    // Handle keyboard input
    const keyboard = this.input.keyboard;
    if (keyboard) {
      // Category selection
      keyboard.on('keydown-ONE', () => {
        this.currentCategory = 'terrain';
        this.blockIndex = 0;
        this.currentBlockType = this.blockCategories[this.currentCategory][this.blockIndex];
        this.isPlacingMonster = false;
        this.updateInstructions();
      });

      keyboard.on('keydown-TWO', () => {
        this.currentCategory = 'decorative';
        this.blockIndex = 0;
        this.currentBlockType = this.blockCategories[this.currentCategory][this.blockIndex];
        this.isPlacingMonster = false;
        this.updateInstructions();
      });

      keyboard.on('keydown-THREE', () => {
        this.currentCategory = 'special';
        this.blockIndex = 0;
        this.currentBlockType = this.blockCategories[this.currentCategory][this.blockIndex];
        this.isPlacingMonster = false;
        this.updateInstructions();
      });

      keyboard.on('keydown-FOUR', () => {
        this.currentCategory = 'tree';
        this.blockIndex = 0;
        this.currentBlockType = this.blockCategories[this.currentCategory][this.blockIndex];
        this.isPlacingMonster = false;
        this.updateInstructions();
      });

      keyboard.on('keydown-FIVE', () => {
        this.isPlacingMonster = true;
        this.updateInstructions();
      });

      // Block cycling
      keyboard.on('keydown-LEFT', () => {
        if (!this.isPlacingMonster && !this.commandModalVisible) {
          this.blockIndex = (this.blockIndex - 1 + this.blockCategories[this.currentCategory].length) % this.blockCategories[this.currentCategory].length;
          this.currentBlockType = this.blockCategories[this.currentCategory][this.blockIndex];
          this.updateInstructions();
        }
      });

      keyboard.on('keydown-RIGHT', () => {
        if (!this.isPlacingMonster && !this.commandModalVisible) {
          this.blockIndex = (this.blockIndex + 1) % this.blockCategories[this.currentCategory].length;
          this.currentBlockType = this.blockCategories[this.currentCategory][this.blockIndex];
          this.updateInstructions();
        }
      });

      keyboard.on('keydown-S', () => {
        this.exportLevel();
      });

      // Toggle command modal with Q
      keyboard.on('keydown-Q', () => {
        this.toggleCommandModal();
      });

      // Close modal with ESC
      keyboard.on('keydown-ESC', () => {
        if (this.commandModalVisible) this.toggleCommandModal();
      });

      // Back to menu with M when modal open
      keyboard.on('keydown-M', () => {
        if (this.commandModalVisible) this.scene.start('StartScene');
      });
    }

    // Add current block/category display
    this.uiText = this.add.text(10, 10, '', { fontSize: '20px', color: '#fff', backgroundColor: '#000' });
    this.updateInstructions();
  }

  private toggleCommandModal() {
    this.commandModalVisible = !this.commandModalVisible;
    this.commandModal.setVisible(this.commandModalVisible);
  }

  private updateInstructions() {
    const text = this.isPlacingMonster
      ? 'Current: Monster'
      : `Category: ${this.currentCategory}, Block: ${this.currentBlockType}`;
    this.uiText.setText(text);

    // Update modal instructions if visible
    if (this.commandModalVisible) {
      const instructions = this.commandModal.list[this.commandModal.list.length - 1] as Phaser.GameObjects.Text;
      instructions.setText(`Current Block: ${this.isPlacingMonster ? 'Monster' : this.currentBlockType}`);
    }
  }

  private exportLevel() {
    // Create the level data
    const levelData = {
      blocks: Object.entries(this.grid).map(([pos, type]) => {
        const [x, y] = pos.split(',').map(Number);
        return {
          x: x / this.blockSize,
          y: y / this.blockSize,
          type
        };
      }),
      monsters: this.monsterLocations.map(monster => ({
        x: monster.x / this.blockSize,
        y: monster.y / this.blockSize
      }))
    };

    // Create JSON file for download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonBlob = new Blob([JSON.stringify(levelData, null, 2)], { type: 'application/json' });
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(jsonBlob);
    link.download = `level-${timestamp}.json`;
    document.body.appendChild(link);
    
    // Trigger the download and clean up
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    // Show a message about the export
    const message = this.add.text(this.game.canvas.width / 2, 100, 'Level Saved!', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#000',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setDepth(2000);

    // Fade out and destroy the message after 2 seconds
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: message,
        alpha: 0,
        duration: 500,
        onComplete: () => message.destroy()
      });
    });
  }
} 