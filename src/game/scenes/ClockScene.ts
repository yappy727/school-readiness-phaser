import Phaser from 'phaser';

export default class ClockScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics;
  private currentTime: { hour: number, minute: number } = { hour: 3, minute: 0 };
  private clockFace!: Phaser.GameObjects.Graphics;
  private hourHand!: Phaser.GameObjects.Graphics;
  private minuteHand!: Phaser.GameObjects.Graphics;
  private options: Phaser.GameObjects.Container[] = [];
  private currentLevel: number = 1;
  private showingLevelSelect: boolean = true;
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private correctCount: number = 0; // 正解回数
  private readonly maxCorrectCount: number = 5; // クリア条件
  private remainingText!: Phaser.GameObjects.Text; // 残り問題数表示
  private usedTimes: string[] = []; // 出題済みの時刻を記録
  
  constructor() {
    super({ key: 'ClockScene' });
  }

  create(): void {
    console.log('ClockScene create() called');
    this.createBackground();
    this.createHeader();
    this.createBackButton();
    this.showLevelSelection();
  }

  private createBackground(): void {
    // 夕日のグラデーション背景
    this.background = this.add.graphics();
    this.background.fillGradientStyle(0xffeaa7, 0xffeaa7, 0xfdcb6e, 0xfdcb6e);
    this.background.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  private createHeader(): void {
    const headerText = this.showingLevelSelect ? 'レベルをえらんでね' : 'とけいをよもう';
    const header = this.add.text(
      this.cameras.main.centerX,
      50,
      headerText,
      {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#e17055',
        strokeThickness: 3
      }
    );
    header.setOrigin(0.5);

    if (!this.showingLevelSelect) {
      // 問題文
      const question = this.add.text(
        this.cameras.main.centerX,
        100,
        'いま なんじですか？',
        {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: '#e17055',
          padding: { x: 15, y: 8 }
        }
      );
      question.setOrigin(0.5);
      
      // 残り問題数表示
      this.remainingText = this.add.text(
        this.cameras.main.width - 20,
        20,
        `残り: ${this.maxCorrectCount - this.correctCount}問`,
        {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: '#e17055',
          padding: { x: 10, y: 5 }
        }
      );
      this.remainingText.setOrigin(1, 0);
    }
  }

  private createClock(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = 220;
    const clockRadius = 80;

    // 時計の文字盤
    this.clockFace = this.add.graphics();
    this.clockFace.fillStyle(0xffffff);
    this.clockFace.fillCircle(centerX, centerY, clockRadius);
    this.clockFace.lineStyle(4, 0x2d3436);
    this.clockFace.strokeCircle(centerX, centerY, clockRadius);

    // 時刻の数字を描画
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const x = centerX + Math.cos(angle) * (clockRadius - 20);
      const y = centerY + Math.sin(angle) * (clockRadius - 20);
      
      this.add.text(x, y, i.toString(), {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#2d3436'
      }).setOrigin(0.5);
    }

    // 中心点
    this.clockFace.fillStyle(0x2d3436);
    this.clockFace.fillCircle(centerX, centerY, 4);

    this.drawClockHands(centerX, centerY);
  }

  private drawClockHands(centerX: number, centerY: number): void {
    // 既存の針を削除
    if (this.hourHand) this.hourHand.destroy();
    if (this.minuteHand) this.minuteHand.destroy();

    // 時針の角度計算（12時が0度、時計回り）
    const hourAngle = ((this.currentTime.hour % 12) * 30 + this.currentTime.minute * 0.5 - 90) * Math.PI / 180;
    // 分針の角度計算
    const minuteAngle = (this.currentTime.minute * 6 - 90) * Math.PI / 180;

    // 時針（短い針）
    this.hourHand = this.add.graphics();
    this.hourHand.lineStyle(6, 0x2d3436);
    this.hourHand.beginPath();
    this.hourHand.moveTo(centerX, centerY);
    this.hourHand.lineTo(
      centerX + Math.cos(hourAngle) * 40,
      centerY + Math.sin(hourAngle) * 40
    );
    this.hourHand.strokePath();

    // 分針（長い針）
    this.minuteHand = this.add.graphics();
    this.minuteHand.lineStyle(4, 0x74b9ff);
    this.minuteHand.beginPath();
    this.minuteHand.moveTo(centerX, centerY);
    this.minuteHand.lineTo(
      centerX + Math.cos(minuteAngle) * 60,
      centerY + Math.sin(minuteAngle) * 60
    );
    this.minuteHand.strokePath();
  }

  private createOptionButtons(): void {
    // 時刻の選択肢を生成
    const correctTime = this.formatTime(this.currentTime.hour, this.currentTime.minute);
    const timeOptions = this.generateTimeOptions(correctTime);

    timeOptions.forEach((option, index) => {
      const x = (this.cameras.main.width / 5) * (index + 1);
      const y = 400;
      
      const button = this.createOptionButton(option, x, y, option === correctTime, index);
      this.options.push(button);
    });
  }

  private generateTimeOptions(correctTime: string): string[] {
    const options = [correctTime];
    
    // レベルに応じた間違いの選択肢を生成
    while (options.length < 4) {
      const wrongTime = this.generateWrongTimeForLevel();
      
      if (!options.includes(wrongTime)) {
        options.push(wrongTime);
      }
    }

    // シャッフル
    return options.sort(() => Math.random() - 0.5);
  }

  private formatTime(hour: number, minute: number): string {
    const h = hour === 0 ? 12 : hour;
    if (minute === 0) {
      return `${h}じ`;
    } else if (minute === 30 && this.currentLevel <= 2) {
      return `${h}じはん`;
    } else {
      return `${h}じ${minute}ふん`;
    }
  }

  private createOptionButton(
    text: string, 
    x: number, 
    y: number, 
    isCorrect: boolean,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // ボタン背景
    const background = this.add.graphics();
    background.fillStyle(0xffffff);
    background.fillRoundedRect(-60, -25, 120, 50, 10);
    background.lineStyle(3, 0xe17055);
    background.strokeRoundedRect(-60, -25, 120, 50, 10);
    
    // ボタンテキスト
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#e17055'
    });
    buttonText.setOrigin(0.5);
    
    container.add([background, buttonText]);
    
    // インタラクション
    background.setInteractive(
      new Phaser.Geom.Rectangle(-60, -25, 120, 50),
      Phaser.Geom.Rectangle.Contains
    );
    
    background.on('pointerdown', () => {
      this.handleAnswer(isCorrect, container);
    });

    background.on('pointerover', () => {
      container.setScale(1.1);
    });

    background.on('pointerout', () => {
      container.setScale(1.0);
    });

    // 入場アニメーション
    container.setAlpha(0);
    container.setY(y + 50);
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: y,
      duration: 400,
      delay: index * 100,
      ease: 'Back.easeOut'
    });

    return container;
  }

  private handleAnswer(isCorrect: boolean, buttonContainer: Phaser.GameObjects.Container): void {
    // 全ボタンを無効化
    this.options.forEach(option => {
      option.list.forEach(child => {
        if (child instanceof Phaser.GameObjects.Graphics) {
          child.removeInteractive();
        }
      });
    });

    if (isCorrect) {
      this.handleCorrectAnswer(buttonContainer);
    } else {
      this.handleIncorrectAnswer(buttonContainer);
    }
  }

  private handleCorrectAnswer(buttonContainer: Phaser.GameObjects.Container): void {
    this.correctCount++; // 正解回数を増加
    
    // 残り問題数を更新
    if (this.remainingText) {
      this.remainingText.setText(`残り: ${this.maxCorrectCount - this.correctCount}問`);
    }

    // 正解音を再生
    this.playSuccessSound();

    // 正解エフェクト
    const graphics = buttonContainer.list[0] as Phaser.GameObjects.Graphics;
    graphics.clear();
    graphics.fillStyle(0x22c55e);
    graphics.fillRoundedRect(-60, -25, 120, 50, 10);
    graphics.lineStyle(3, 0x16a34a);
    graphics.strokeRoundedRect(-60, -25, 120, 50, 10);

    // パーティクルエフェクト
    this.createSuccessParticles(buttonContainer.x, buttonContainer.y);

    // 称賛メッセージ
    const successMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'せいかい！',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#22c55e',
        stroke: '#ffffff',
        strokeThickness: 4
      }
    );
    successMessage.setOrigin(0.5);

    // 10回正解でクリア、そうでなければ次の問題へ
    this.time.delayedCall(2000, () => {
      successMessage.destroy();
      
      if (this.correctCount >= this.maxCorrectCount) {
        this.showLevelCompleteMessage();
      } else {
        this.nextQuestion();
      }
    });
  }

  private handleIncorrectAnswer(buttonContainer: Phaser.GameObjects.Container): void {
    // 不正解音を再生
    this.playErrorSound();

    // 不正解エフェクト
    const graphics = buttonContainer.list[0] as Phaser.GameObjects.Graphics;
    graphics.clear();
    graphics.fillStyle(0xef4444);
    graphics.fillRoundedRect(-60, -25, 120, 50, 10);
    graphics.lineStyle(3, 0xdc2626);
    graphics.strokeRoundedRect(-60, -25, 120, 50, 10);

    // 振動エフェクト
    this.tweens.add({
      targets: buttonContainer,
      x: buttonContainer.x + 10,
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut'
    });

    // 励ましメッセージ
    const encourageMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'もういちど！',
      {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#ef4444',
        stroke: '#ffffff',
        strokeThickness: 3
      }
    );
    encourageMessage.setOrigin(0.5);

    // 再挑戦
    this.time.delayedCall(1500, () => {
      encourageMessage.destroy();
      this.resetButtons();
    });
  }

  private createSuccessParticles(x: number, y: number): void {
    // 簡易パーティクルエフェクト（円形）
    for (let i = 0; i < 8; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xffd700);
      
      // シンプルな円形パーティクル
      particle.fillCircle(0, 0, 8);
      particle.setPosition(x, y);
      
      const angle = (i / 8) * Math.PI * 2;
      const distance = 100;
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 1000,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private resetButtons(): void {
    // ボタンをリセット
    this.options.forEach(option => option.destroy());
    this.options = [];
    this.createOptionButtons();
  }

  private nextQuestion(): void {
    // レベルに応じた時刻を生成
    this.generateTimeForLevel();
    
    // 時計の針を更新
    this.drawClockHands(this.cameras.main.centerX, 220);
    this.resetButtons();
  }

  private createBackButton(): void {
    const backButton = this.add.text(
      30,
      30,
      '← もどる',
      {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#6b7280',
        padding: { x: 10, y: 5 }
      }
    );

    backButton.setInteractive();
    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    backButton.on('pointerover', () => {
      backButton.setScale(1.1);
    });

    backButton.on('pointerout', () => {
      backButton.setScale(1.0);
    });
  }

  private playSuccessSound(): void {
    // AudioManagerを使用して正解音を再生
    const gameManager = (this.game as any).gameManager;
    if (gameManager) {
      gameManager.getAudioManager().playSuccessSound();
    }
  }

  private playErrorSound(): void {
    // AudioManagerを使用して不正解音を再生
    const gameManager = (this.game as any).gameManager;
    if (gameManager) {
      gameManager.getAudioManager().playErrorSound();
    }
  }

  private showLevelSelection(): void {
    this.showingLevelSelect = true;
    
    // 画面をクリア
    this.children.removeAll();
    
    // 背景を再作成
    this.createBackground();
    this.createHeader();
    this.createBackButton();
    
    // レベル選択の説明
    const instruction = this.add.text(
      this.cameras.main.centerX,
      150,
      'どのレベルでちょうせんしますか？',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#e17055',
        padding: { x: 15, y: 8 }
      }
    );
    instruction.setOrigin(0.5);

    // レベルボタンを作成
    this.createLevelButtons();
  }

  private createLevelButtons(): void {
    const levelData = [
      { level: 1, text: 'レベル1\n○じ', color: 0x22c55e },
      { level: 2, text: 'レベル2\n○じはん', color: 0x3b82f6 },
      { level: 3, text: 'レベル3\n5分間隔', color: 0xf59e0b },
      { level: 4, text: 'レベル4\n1分間隔', color: 0xef4444 }
    ];

    levelData.forEach((data, index) => {
      const x = (this.cameras.main.width / 5) * (index + 1);
      const y = 300;
      
      const button = this.createLevelButton(data.level, data.text, x, y, data.color, index);
      this.levelButtons.push(button);
    });
  }

  private createLevelButton(
    level: number,
    text: string,
    x: number,
    y: number,
    color: number,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // ボタン背景
    const background = this.add.graphics();
    background.fillStyle(color);
    background.fillRoundedRect(-60, -40, 120, 80, 15);
    background.lineStyle(4, 0xffffff);
    background.strokeRoundedRect(-60, -40, 120, 80, 15);
    
    // ボタンテキスト
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    });
    buttonText.setOrigin(0.5);
    
    container.add([background, buttonText]);
    
    // インタラクション
    background.setInteractive(
      new Phaser.Geom.Rectangle(-60, -40, 120, 80),
      Phaser.Geom.Rectangle.Contains
    );
    
    background.on('pointerdown', () => {
      this.selectLevel(level);
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

  private selectLevel(level: number): void {
    this.currentLevel = level;
    this.showingLevelSelect = false;
    this.correctCount = 0; // 正解回数をリセット
    this.usedTimes = []; // 出題済み時刻をリセット
    
    // レベルボタンを明示的に破棄
    this.levelButtons.forEach(button => button.destroy());
    this.levelButtons = [];
    
    // レベル選択画面を削除
    this.children.removeAll();
    
    // ゲーム画面を再構築
    this.createBackground();
    this.createHeader();
    this.createClock();
    this.generateTimeForLevel();
    this.drawClockHands(this.cameras.main.centerX, 220);
    this.createOptionButtons();
    this.createBackButton();
  }

  private generateTimeForLevel(): void {
    const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    let availableTimes: string[] = [];
    
    // レベル別に利用可能な時刻を生成
    switch (this.currentLevel) {
      case 1: // ちょうど○時
        hours.forEach(hour => {
          const timeString = this.formatTime(hour, 0);
          if (!this.usedTimes.includes(timeString)) {
            availableTimes.push(timeString);
          }
        });
        break;
        
      case 2: // ○時半
        hours.forEach(hour => {
          const timeString = this.formatTime(hour, 30);
          if (!this.usedTimes.includes(timeString)) {
            availableTimes.push(timeString);
          }
        });
        break;
        
      case 3: // 5分間隔
        const minutes5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        hours.forEach(hour => {
          minutes5.forEach(minute => {
            const timeString = this.formatTime(hour, minute);
            if (!this.usedTimes.includes(timeString)) {
              availableTimes.push(timeString);
            }
          });
        });
        break;
        
      case 4: // 1分間隔
        hours.forEach(hour => {
          for (let minute = 0; minute < 60; minute++) {
            const timeString = this.formatTime(hour, minute);
            if (!this.usedTimes.includes(timeString)) {
              availableTimes.push(timeString);
            }
          }
        });
        break;
        
      default:
        hours.forEach(hour => {
          const timeString = this.formatTime(hour, 0);
          if (!this.usedTimes.includes(timeString)) {
            availableTimes.push(timeString);
          }
        });
    }
    
    // 全ての時刻を使い切った場合はリセット
    if (availableTimes.length === 0) {
      this.usedTimes = [];
      this.generateTimeForLevel(); // 再帰的に呼び出し
      return;
    }
    
    // 利用可能な時刻からランダムに選択
    const selectedTimeString = availableTimes[Math.floor(Math.random() * availableTimes.length)];
    this.usedTimes.push(selectedTimeString);
    
    // 選択した時刻文字列から時間と分を逆算
    this.parseTimeString(selectedTimeString);
  }

  private generateWrongTimeForLevel(): string {
    const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    let wrongHour, wrongMinute;
    
    switch (this.currentLevel) {
      case 1: // ちょうど○時
        wrongHour = hours[Math.floor(Math.random() * hours.length)];
        wrongMinute = 0;
        break;
        
      case 2: // ○時半
        wrongHour = hours[Math.floor(Math.random() * hours.length)];
        wrongMinute = Math.random() < 0.5 ? 0 : 30;
        break;
        
      case 3: // 5分間隔 - 同じ時間で分だけ違う
        wrongHour = this.currentTime.hour; // 現在の時間と同じ
        const minutes5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        const availableMinutes = minutes5.filter(m => m !== this.currentTime.minute);
        wrongMinute = availableMinutes[Math.floor(Math.random() * availableMinutes.length)];
        break;
        
      case 4: // 1分間隔 - 同じ時間で分だけ違う
        wrongHour = this.currentTime.hour; // 現在の時間と同じ
        const availableMinutes4 = [];
        for (let m = 0; m < 60; m++) {
          if (m !== this.currentTime.minute) {
            availableMinutes4.push(m);
          }
        }
        wrongMinute = availableMinutes4[Math.floor(Math.random() * availableMinutes4.length)];
        break;
        
      default:
        wrongHour = hours[Math.floor(Math.random() * hours.length)];
        wrongMinute = 0;
    }
    
    return this.formatTime(wrongHour, wrongMinute);
  }

  private parseTimeString(timeString: string): void {
    // 時刻文字列から時間と分を抽出
    if (timeString.includes('はん')) {
      // ○時半の場合
      const hour = parseInt(timeString.replace('じはん', ''));
      this.currentTime.hour = hour;
      this.currentTime.minute = 30;
    } else if (timeString.includes('ふん')) {
      // ○時○○分の場合
      const parts = timeString.split('じ');
      const hour = parseInt(parts[0]);
      const minute = parseInt(parts[1].replace('ふん', ''));
      this.currentTime.hour = hour;
      this.currentTime.minute = minute;
    } else {
      // ○時の場合
      const hour = parseInt(timeString.replace('じ', ''));
      this.currentTime.hour = hour;
      this.currentTime.minute = 0;
    }
  }

  private showLevelCompleteMessage(): void {
    // 背景をクリア
    this.children.removeAll();
    this.createBackground();

    // クリアメッセージ
    const completeMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      `レベル${this.currentLevel}\nクリア！`,
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#22c55e',
        stroke: '#ffffff',
        strokeThickness: 4,
        align: 'center'
      }
    );
    completeMessage.setOrigin(0.5);

    // 成績表示
    const scoreMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `${this.maxCorrectCount}問正解しました！`,
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#22c55e',
        padding: { x: 15, y: 8 }
      }
    );
    scoreMessage.setOrigin(0.5);

    // ボタン配置
    const buttonY = this.cameras.main.centerY + 100;

    // レベル選択ボタン
    const levelSelectButton = this.add.text(
      this.cameras.main.centerX - 100,
      buttonY,
      'レベルせんたく',
      {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#3b82f6',
        padding: { x: 15, y: 10 }
      }
    );
    levelSelectButton.setOrigin(0.5);
    levelSelectButton.setInteractive();
    levelSelectButton.on('pointerdown', () => {
      this.showLevelSelection();
    });

    // メニューに戻るボタン
    const backButton = this.add.text(
      this.cameras.main.centerX + 100,
      buttonY,
      'メニューにもどる',
      {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#6b7280',
        padding: { x: 15, y: 10 }
      }
    );
    backButton.setOrigin(0.5);
    backButton.setInteractive();
    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // ホバーエフェクト
    [levelSelectButton, backButton].forEach(button => {
      button.on('pointerover', () => {
        button.setScale(1.1);
      });
      button.on('pointerout', () => {
        button.setScale(1.0);
      });
    });

    // 花火エフェクト
    this.createSuccessParticles(this.cameras.main.centerX, this.cameras.main.centerY - 100);
  }
}