import * as Phaser from 'phaser';
import { MainScene } from './MainScene';
import { StartScene } from './StartScene';
import { LevelEditorScene } from './LevelEditorScene';
import { TutorialScene } from './TutorialScene';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300, x: 0 },
      debug: false
    }
  },
  scene: [StartScene, TutorialScene, MainScene, LevelEditorScene],
  backgroundColor: '#87CEEB'
};