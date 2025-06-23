import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene.ts';
import HiraganaScene from './scenes/HiraganaScene.ts';
import KatakanaScene from './scenes/KatakanaScene.ts';
import NumberScene from './scenes/NumberScene.ts';
import ClockScene from './scenes/ClockScene.ts';
import { AudioManager } from './AudioManager.ts';

export class PhaserGameManager {
  private game: Phaser.Game | null = null;
  private config: Phaser.Types.Core.GameConfig;
  private audioManager: AudioManager;

  constructor(containerId: string) {
    this.audioManager = new AudioManager();
    this.config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerId,
      backgroundColor: '#f0f9ff',
      scene: [MenuScene, HiraganaScene, KatakanaScene, NumberScene, ClockScene],
      loader: {
        baseURL: '',
        crossOrigin: 'anonymous'
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
      },
      input: {
        activePointers: 3, // マルチタッチ対応
      },
      audio: {
        disableWebAudio: false
      },
      render: {
        antialias: true,
        pixelArt: false,
        autoResize: true
      }
    };
  }

  init(): void {
    if (!this.game) {
      this.game = new Phaser.Game(this.config);
      
      // AudioManagerをゲームに登録
      (this.game as any).gameManager = this;
      
      // BGMを開始（ユーザーインタラクション後）
      this.game.events.once('ready', () => {
        // 最初のクリック後にBGMを開始
        const startBGM = () => {
          this.audioManager.startBGM();
          document.removeEventListener('click', startBGM);
        };
        document.addEventListener('click', startBGM);
      });
    }
  }

  destroy(): void {
    if (this.game) {
      this.audioManager.stopBGM();
      this.game.destroy(true);
      this.game = null;
    }
  }

  getGame(): Phaser.Game | null {
    return this.game;
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  // ゲーム設定更新（音量調整機能を削除）
  updateSettings(settings: any): void {
    console.log('PhaserGameManager.updateSettings called with:', settings);
    if (this.game) {
      // その他の設定をゲームに反映（音量設定は除く）
      this.game.scene.scenes.forEach(scene => {
        if (scene.scene.isActive()) {
          (scene as any).updateSettings?.(settings);
        }
      });
    } else {
      console.log('Game not initialized in updateSettings');
    }
  }

  // シーン切り替え
  switchScene(sceneKey: string, data?: any): void {
    console.log('PhaserGameManager.switchScene called with:', sceneKey);
    if (this.game && this.game.scene) {
      console.log('Game exists, switching scene');
      
      // より安全なシーン切り替え
      const sceneManager = this.game.scene;
      const activeScenes = sceneManager.getScenes(true);
      
      if (activeScenes.length > 0) {
        // 現在のアクティブなシーンを取得
        const currentScene = activeScenes[0];
        console.log('Current active scene:', currentScene.scene.key);
        
        // 目標のシーンが既にアクティブなら何もしない
        if (currentScene.scene.key === sceneKey) {
          console.log('Target scene is already active');
          return;
        }
        
        // 全てのアクティブシーンを停止
        activeScenes.forEach(scene => {
          console.log('Stopping scene:', scene.scene.key);
          sceneManager.stop(scene.scene.key);
        });
      }
      
      console.log('Starting new scene:', sceneKey);
      sceneManager.start(sceneKey, data);
    } else {
      console.log('Game or scene manager not initialized');
    }
  }
}