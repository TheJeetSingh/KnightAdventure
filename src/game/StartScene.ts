import * as Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'Knight Adventure', { 
      fontSize: '64px', 
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const playButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Play Game', { 
      fontSize: '32px', 
      color: '#fff',
      backgroundColor: '#4a4',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
      // Check if tutorial has been completed
      const tutorialCompleted = localStorage.getItem('tutorialCompleted') === 'true';
      this.scene.start(tutorialCompleted ? 'MainScene' : 'TutorialScene');
    });

    const editorButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 150, 'Level Editor', { 
      fontSize: '32px', 
      color: '#fff',
      backgroundColor: '#44a',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => this.scene.start('LevelEditorScene'));

    [playButton, editorButton].forEach(button => {
      button.on('pointerover', () => {
        button.setStyle({ color: '#ff0' });
      });
      button.on('pointerout', () => {
        button.setStyle({ color: '#fff' });
      });
    });
  }
} 