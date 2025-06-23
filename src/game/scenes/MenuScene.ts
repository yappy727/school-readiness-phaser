import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Container[] = [];
  
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    console.log('MenuScene create() called');
    this.createBackground();
    this.createTitle();
    this.createMenuButtons();
    this.createCharacter();
  }

  private createBackground(): void {
    // グラデーション背景
    this.background = this.add.graphics();
    this.background.fillGradientStyle(0xd299c2, 0xd299c2, 0xfef9d7, 0xfef9d7);
    this.background.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  private createTitle(): void {
    this.titleText = this.add.text(
      this.cameras.main.centerX,
      120,
      'まなびのじかん',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#8b5cf6',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true
        }
      }
    );
    this.titleText.setOrigin(0.5);

    // タイトルアニメーション
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private createMenuButtons(): void {
    const buttonData = [
      { text: 'ひらがな', scene: 'HiraganaScene', color: 0xff69b4 },
      { text: 'カタカナ', scene: 'KatakanaScene', color: 0x87ceeb },
      { text: 'すうじ', scene: 'NumberScene', color: 0x98fb98 },
      { text: 'とけい', scene: 'ClockScene', color: 0xffa500 }
    ];

    buttonData.forEach((data, index) => {
      const y = 250 + (index * 80);
      const button = this.createButton(data.text, y, data.color, data.scene, index);
      this.buttons.push(button);
    });
  }

  private createButton(text: string, y: number, color: number, sceneKey: string, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(this.cameras.main.centerX, y);
    
    // ボタン背景
    const background = this.add.graphics();
    background.fillStyle(color);
    background.fillRoundedRect(-120, -30, 240, 60, 20);
    background.lineStyle(4, 0xffffff);
    background.strokeRoundedRect(-120, -30, 240, 60, 20);
    
    // ボタンテキスト
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    buttonText.setOrigin(0.5);
    
    container.add([background, buttonText]);
    
    // インタラクション
    background.setInteractive(
      new Phaser.Geom.Rectangle(-120, -30, 240, 60),
      Phaser.Geom.Rectangle.Contains
    );
    
    background.on('pointerdown', () => {
      this.playButtonSound();
      this.switchToScene(sceneKey);
    });

    background.on('pointerover', () => {
      container.setScale(1.1);
    });

    background.on('pointerout', () => {
      container.setScale(1.0);
    });

    // 入場アニメーション
    container.setAlpha(0);
    container.setScale(0.5);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      delay: index * 100,
      ease: 'Back.easeOut'
    });

    return container;
  }

  private createCharacter(): void {
    // まなちゃんキャラクター（簡易版）
    const character = this.add.graphics();
    character.fillStyle(0xffb6c1);
    character.fillCircle(650, 200, 40); // 顔
    character.fillStyle(0x000000);
    character.fillCircle(635, 190, 5); // 左目
    character.fillCircle(665, 190, 5); // 右目
    character.fillStyle(0xff69b4);
    character.fillEllipse(650, 205, 15, 8); // 口

    // キャラクターアニメーション
    this.tweens.add({
      targets: character,
      y: character.y - 10,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // メッセージ
    const message = this.add.text(650, 280, 'きょうもがんばろう！', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#333333',
      backgroundColor: '#ffffff',
      padding: { x: 10, y: 5 },
      borderRadius: 10
    });
    message.setOrigin(0.5);
  }

  private playButtonSound(): void {
    // Web Audio API を使用してビープ音を生成
    if (this.sound && this.sound.context) {
      try {
        const audioContext = this.sound.context as AudioContext;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.log('Audio not available:', error);
      }
    }
  }

  private switchToScene(sceneKey: string): void {
    this.scene.start(sceneKey);
  }

  update(): void {
    // ゲームループ処理（必要に応じて）
  }
}