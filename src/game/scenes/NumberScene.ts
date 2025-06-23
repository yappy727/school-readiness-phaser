import Phaser from 'phaser';

export default class NumberScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics;
  private currentNumber: number = 1;
  private objectCount: number = 0;
  private objects: Phaser.GameObjects.Graphics[] = [];
  private countText!: Phaser.GameObjects.Text;
  private currentLevel: number = 1;
  private showingLevelSelect: boolean = true;
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private correctCount: number = 0; // 正解回数
  private readonly maxCorrectCount: number = 5; // クリア条件
  private remainingText!: Phaser.GameObjects.Text; // 残り問題数表示
  private usedNumbers: number[] = []; // 出題済みの数字を記録
  
  constructor() {
    super({ key: 'NumberScene' });
  }

  create(): void {
    this.createBackground();
    this.createHeader();
    this.createBackButton();
    this.showLevelSelection();
  }

  private createBackground(): void {
    // 夕日のグラデーション背景
    this.background = this.add.graphics();
    this.background.fillGradientStyle(0xfa709a, 0xfa709a, 0xfee140, 0xfee140);
    this.background.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  private createHeader(): void {
    const headerText = this.showingLevelSelect ? 'レベルをえらんでね' : 'すうじをかぞえよう';
    const header = this.add.text(
      this.cameras.main.centerX,
      50,
      headerText,
      {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#dc2626',
        strokeThickness: 3
      }
    );
    header.setOrigin(0.5);

    if (!this.showingLevelSelect) {
      // 問題文
      const question = this.add.text(
        this.cameras.main.centerX,
        100,
        'りんごはいくつありますか？',
        {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: '#dc2626',
          padding: { x: 15, y: 8 }
        }
      );
      question.setOrigin(0.5);
      
      // 残り問題数表示
      this.remainingText = this.add.text(
        this.cameras.main.width - 20,
        60,
        `残り: ${this.maxCorrectCount - this.correctCount}問`,
        {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: '#dc2626',
          padding: { x: 10, y: 5 }
        }
      );
      this.remainingText.setOrigin(1, 0);
    }
  }

  private generateNewProblem(): void {
    // 前の問題のオブジェクトを削除
    this.objects.forEach(obj => obj.destroy());
    this.objects = [];

    // レベルに応じた範囲でランダムな数を生成
    const maxNumber = this.getMaxNumberForLevel(this.currentLevel);
    
    // レベル1（1-3）は完全にランダム
    if (this.currentLevel === 1) {
      this.currentNumber = Math.floor(Math.random() * maxNumber) + 1;
    } else {
      // レベル2以上は重複回避
      const availableNumbers = [];
      for (let i = 1; i <= maxNumber; i++) {
        if (!this.usedNumbers.includes(i)) {
          availableNumbers.push(i);
        }
      }
      
      // 全ての数字を使い切った場合はリセット
      if (availableNumbers.length === 0) {
        this.usedNumbers = [];
        for (let i = 1; i <= maxNumber; i++) {
          availableNumbers.push(i);
        }
      }
      
      // 利用可能な数字からランダムに選択
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      this.currentNumber = availableNumbers[randomIndex];
      this.usedNumbers.push(this.currentNumber);
    }
    
    this.objectCount = 0;

    // オブジェクト（りんご）を配置
    this.createApples();
  }

  private createApples(): void {
    for (let i = 0; i < this.currentNumber; i++) {
      const position = this.getApplePosition(i);
      
      const apple = this.createApple(position.x, position.y, i);
      this.objects.push(apple);
    }
  }

  private getApplePosition(index: number): { x: number, y: number } {
    // レベル1,2（5個以下）は中央に配置
    if (this.currentNumber <= 5) {
      const localX = (index - (this.currentNumber - 1) / 2) * 60;
      return {
        x: this.cameras.main.centerX + localX,
        y: 200
      };
    }
    
    // レベル3,4（6個以上）は5個単位でグループ化
    const groupIndex = Math.floor(index / 5); // どのグループか (0, 1, 2, 3...)
    const positionInGroup = index % 5; // グループ内での位置 (0-4)
    
    // グループごとの配置計算
    const groupsPerRow = 2; // 1行に2グループまで
    const groupRow = Math.floor(groupIndex / groupsPerRow); // グループの行
    const groupCol = groupIndex % groupsPerRow; // グループの列
    
    // 各グループ内での配置（5個を1行に配置）
    const localX = (positionInGroup - 2) * 50; // -100, -50, 0, 50, 100
    const localY = 0;
    
    // グループの基準位置を計算
    const groupSpacing = 300; // グループ間の間隔を広げる
    const baseX = this.cameras.main.centerX + (groupCol - 0.5) * groupSpacing;
    const baseY = 180 + groupRow * 100; // 行間の間隔
    
    return {
      x: baseX + localX,
      y: baseY + localY
    };
  }

  private createApple(x: number, y: number, index: number): Phaser.GameObjects.Graphics {
    const apple = this.add.graphics();
    
    // りんごの形を描画
    apple.fillStyle(0xff4444);
    apple.fillCircle(x, y, 25);
    apple.fillStyle(0x22c55e);
    apple.fillEllipse(x + 10, y - 20, 8, 15); // 葉っぱ
    apple.fillStyle(0x8b4513);
    apple.fillRect(x - 2, y - 30, 4, 15); // 茎

    // インタラクティブ設定
    apple.setInteractive(
      new Phaser.Geom.Circle(x, y, 25),
      Phaser.Geom.Circle.Contains
    );

    apple.on('pointerdown', () => {
      this.countObject(apple);
    });

    // 入場アニメーション
    apple.setAlpha(0);
    apple.setScale(0);
    this.tweens.add({
      targets: apple,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      delay: index * 200,
      ease: 'Back.easeOut'
    });

    return apple;
  }

  private countObject(apple: Phaser.GameObjects.Graphics): void {
    this.objectCount++;
    
    // カウントしたオブジェクトの見た目を変更
    apple.removeInteractive();
    apple.setTint(0x888888);
    
    // カウント表示を更新
    this.updateCountDisplay();
    
    // カウントエフェクト
    const countEffect = this.add.text(
      apple.x, 
      apple.y - 50, 
      this.objectCount.toString(),
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    countEffect.setOrigin(0.5);
    
    this.tweens.add({
      targets: countEffect,
      y: countEffect.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => countEffect.destroy()
    });

    // 全てカウントした場合は自動で次へ
    if (this.objectCount === this.currentNumber) {
      this.time.delayedCall(1000, () => {
        this.checkAnswer();
      });
    }
  }

  private updateCountDisplay(): void {
    if (this.countText) {
      this.countText.destroy();
    }
    
    this.countText = this.add.text(
      this.cameras.main.centerX,
      300,
      `カウント: ${this.objectCount}`,
      {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#7c2d12',
        padding: { x: 15, y: 8 }
      }
    );
    this.countText.setOrigin(0.5);
  }

  private createNumberButtons(): void {
    const maxNumber = this.getMaxNumberForLevel(this.currentLevel);
    const numbers = Array.from({length: maxNumber}, (_, i) => i + 1);
    
    // ボタンの配置を計算（最大5つまでは1行、それ以上は2行）
    if (numbers.length <= 5) {
      numbers.forEach((number, index) => {
        const x = (this.cameras.main.width / (numbers.length + 1)) * (index + 1);
        const y = 450;
        
        const button = this.createNumberButton(number, x, y);
      });
    } else {
      // 2行に分けて配置
      const firstRowCount = Math.ceil(numbers.length / 2);
      numbers.forEach((number, index) => {
        if (index < firstRowCount) {
          const x = (this.cameras.main.width / (firstRowCount + 1)) * ((index % firstRowCount) + 1);
          const y = 400;
          const button = this.createNumberButton(number, x, y);
        } else {
          const x = (this.cameras.main.width / (numbers.length - firstRowCount + 1)) * ((index - firstRowCount) + 1);
          const y = 500;
          const button = this.createNumberButton(number, x, y);
        }
      });
    }
  }

  private createNumberButton(number: number, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // ボタン背景
    const background = this.add.graphics();
    background.fillStyle(0xffffff);
    background.fillCircle(0, 0, 30);
    background.lineStyle(3, 0xdc2626);
    background.strokeCircle(0, 0, 30);
    
    // ボタンテキスト
    const buttonText = this.add.text(0, 0, number.toString(), {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#dc2626'
    });
    buttonText.setOrigin(0.5);
    
    container.add([background, buttonText]);
    
    // インタラクション
    background.setInteractive(
      new Phaser.Geom.Circle(0, 0, 30),
      Phaser.Geom.Circle.Contains
    );
    
    background.on('pointerdown', () => {
      this.submitAnswer(number);
    });

    background.on('pointerover', () => {
      container.setScale(1.2);
    });

    background.on('pointerout', () => {
      container.setScale(1.0);
    });

    return container;
  }

  private submitAnswer(answer: number): void {
    if (answer === this.currentNumber) {
      this.handleCorrectAnswer();
    } else {
      this.handleIncorrectAnswer();
    }
  }

  private checkAnswer(): void {
    if (this.objectCount === this.currentNumber) {
      this.handleCorrectAnswer();
    } else {
      this.handleIncorrectAnswer();
    }
  }

  private handleCorrectAnswer(): void {
    // 正解音を再生
    this.playSuccessSound();

    // 正解回数を増加
    this.correctCount++;
    
    // 残り問題数を更新
    if (this.remainingText) {
      this.remainingText.setText(`残り: ${this.maxCorrectCount - this.correctCount}問`);
    }

    // 正解エフェクト
    this.createSuccessEffect();

    // 称賛メッセージ
    const successMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
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
      if (this.countText) this.countText.destroy();
      
      if (this.correctCount >= this.maxCorrectCount) {
        this.showLevelCompleteMessage();
      } else {
        this.generateNewProblem();
      }
    });
  }

  private handleIncorrectAnswer(): void {
    // 不正解音を再生
    this.playErrorSound();

    // 画面全体の振動エフェクト
    this.cameras.main.shake(300, 0.01);

    // 励ましメッセージ
    const encourageMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'もういちど かぞえてみよう！',
      {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#ef4444',
        stroke: '#ffffff',
        strokeThickness: 3
      }
    );
    encourageMessage.setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      encourageMessage.destroy();
    });
  }

  private createSuccessEffect(): void {
    // 花火エフェクト（円形）
    for (let i = 0; i < 12; i++) {
      const firework = this.add.graphics();
      firework.fillStyle(0xffd700);
      
      // シンプルな円形パーティクル
      firework.fillCircle(0, 0, 10);
      firework.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);
      
      const angle = (i / 12) * Math.PI * 2;
      const distance = 150;
      
      this.tweens.add({
        targets: firework,
        x: this.cameras.main.centerX + Math.cos(angle) * distance,
        y: this.cameras.main.centerY + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 1500,
        ease: 'Quad.easeOut',
        onComplete: () => firework.destroy()
      });
    }
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, points: number, innerRadius: number, outerRadius: number): void {
    const angle = Math.PI / points;
    
    graphics.beginPath();
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const currentAngle = i * angle - Math.PI / 2;
      const px = x + Math.cos(currentAngle) * radius;
      const py = y + Math.sin(currentAngle) * radius;
      
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    
    graphics.closePath();
    graphics.fillPath();
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
        backgroundColor: '#dc2626',
        padding: { x: 15, y: 8 }
      }
    );
    instruction.setOrigin(0.5);

    // レベルボタンを作成
    this.createLevelButtons();
  }

  private createLevelButtons(): void {
    const levelData = [
      { level: 1, text: 'レベル1\n(1-3)', color: 0x22c55e },
      { level: 2, text: 'レベル2\n(1-5)', color: 0x3b82f6 },
      { level: 3, text: 'レベル3\n(1-10)', color: 0xf59e0b },
      { level: 4, text: 'レベル4\n(1-20)', color: 0xef4444 }
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
      fontSize: '18px',
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
    this.usedNumbers = []; // 出題済み数字をリセット
    
    // レベルボタンを明示的に破棄
    this.levelButtons.forEach(button => button.destroy());
    this.levelButtons = [];
    
    // レベル選択画面を削除
    this.children.removeAll();
    
    // ゲーム画面を再構築
    this.createBackground();
    this.createHeader();
    this.generateNewProblem();
    this.createNumberButtons();
    this.createBackButton();
  }

  private getMaxNumberForLevel(level: number): number {
    switch (level) {
      case 1: return 3;
      case 2: return 5;
      case 3: return 10;
      case 4: return 20;
      default: return 5;
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
    this.createSuccessEffect();
  }
}