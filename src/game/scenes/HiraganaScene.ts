import Phaser from 'phaser';

export default class HiraganaScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics;
  private currentWord: any = null;
  private wordDisplay!: Phaser.GameObjects.Text;
  private illustrationDisplay!: Phaser.GameObjects.Graphics;
  private options: Phaser.GameObjects.Container[] = [];
  private hiraganaWords: any[] = [];
  private remainingWords: any[] = []; // 未出題の単語リスト
  private completedWords: any[] = []; // 正解済みの単語リスト
  private totalWords: number = 0; // 全単語数
  private selectedLevel: string = 'all'; // 選択されたレベル（行）
  private showingLevelSelect: boolean = true; // レベル選択画面表示中かどうか
  private isProcessingAnswer: boolean = false; // 回答処理中かどうか
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private hintButton!: Phaser.GameObjects.Container; // ヒントボタン
  private hintContainer?: Phaser.GameObjects.Container; // ヒント表示用コンテナ
  private isShowingHint: boolean = false; // ヒント表示中かどうか
  private encourageMessage?: Phaser.GameObjects.Text; // 励ましメッセージ
  
  constructor() {
    super({ key: 'HiraganaScene' });
  }

  create(): void {
    this.createBackground();
    this.createHeader();
    this.initializeWordData();
    this.createBackButton();
    this.showLevelSelection();
  }

  private createBackground(): void {
    // 空のグラデーション背景
    this.background = this.add.graphics();
    this.background.fillGradientStyle(0x4facfe, 0x4facfe, 0x00f2fe, 0x00f2fe);
    this.background.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  private createHeader(): void {
    const headerText = this.showingLevelSelect ? 'どの行をえらびますか？' : 'ひらがなをまなぼう';
    const header = this.add.text(
      this.cameras.main.centerX,
      50,
      headerText,
      {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#1e40af',
        strokeThickness: 3
      }
    );
    header.setOrigin(0.5);

    if (!this.showingLevelSelect) {
      // ゲーム中のみ残り問題数表示
      this.scoreText = this.add.text(
        this.cameras.main.width - 20,
        20,
        `残り: --問`,
        {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: '#1e40af',
          padding: { x: 10, y: 5 }
        }
      );
      this.scoreText.setOrigin(1, 0);
    }
  }

  private createWordDisplay(): void {
    this.selectRandomWord();
    
    // 残り問題数を更新
    this.scoreText.setText(`残り: ${this.remainingWords.length}問`);
    
    // ゲーム完了チェック
    if (this.remainingWords.length === 0) {
      return;
    }
    
    // イラスト表示（高精度プログラム描画）
    this.illustrationDisplay = this.add.graphics();
    this.drawIllustration();
    
    // 単語表示（○り形式）
    this.wordDisplay = this.add.text(
      this.cameras.main.centerX,
      250,
      this.currentWord.pattern,
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#1e40af',
        strokeThickness: 3
      }
    );
    this.wordDisplay.setOrigin(0.5);

    // 問題文
    const question = this.add.text(
      this.cameras.main.centerX,
      300,
      '○に入るひらがなはどれですか？',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#1e40af',
        padding: { x: 15, y: 8 }
      }
    );
    question.setOrigin(0.5);
    
    // 問題文がクリック可能になっていないことを確認（デバッグ用）
    // question.setInteractive(); // これがないことを確認

    // ページ開始時に正解の単語を読み上げ
    this.time.delayedCall(1000, () => {
      this.speakWord(this.currentWord.word);
    });

    // もう一度聞くボタンを追加
    this.createSpeakButton();
    
    // ヒントボタンを追加
    this.createHintButton();
  }

  private createOptionButtons(): void {
    if (!this.currentWord) return;
    
    const correctAnswer = this.currentWord.answer;
    const wrongOptions = this.generateWrongOptions(correctAnswer);
    const allOptions = [correctAnswer, ...wrongOptions];
    
    // オプションをシャッフル
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

    shuffledOptions.forEach((option, index) => {
      const x = (this.cameras.main.width / 5) * (index + 1);
      const y = 400;
      
      const button = this.createOptionButton(option, x, y, option === correctAnswer, index);
      this.options.push(button);
    });
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
    background.fillRoundedRect(-50, -35, 100, 70, 15);
    background.lineStyle(3, 0x1e40af);
    background.strokeRoundedRect(-50, -35, 100, 70, 15);
    
    // ボタンテキスト
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#1e40af'
    });
    buttonText.setOrigin(0.5);
    
    container.add([background, buttonText]);
    
    // インタラクション
    background.setInteractive(
      new Phaser.Geom.Rectangle(-50, -35, 100, 70),
      Phaser.Geom.Rectangle.Contains
    );
    
    background.on('pointerdown', () => {
      // 回答処理中は無視
      if (this.isProcessingAnswer) return;
      
      // ボタンクリック音を再生
      this.playButtonSound();
      
      // 答えの処理
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
    // 回答処理開始
    this.isProcessingAnswer = true;
    
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
    // 現在の単語を正解済みリストに追加し、未出題リストから削除
    this.completedWords.push(this.currentWord);
    this.remainingWords.shift(); // 最初の要素を削除
    
    // 残り問題数を更新
    this.scoreText.setText(`残り: ${this.remainingWords.length}問`);

    // 正解音を再生
    this.playSuccessSound();

    // 正解エフェクト
    const graphics = buttonContainer.list[0] as Phaser.GameObjects.Graphics;
    graphics.clear();
    graphics.fillStyle(0x22c55e);
    graphics.fillRoundedRect(-50, -35, 100, 70, 15);
    graphics.lineStyle(3, 0x16a34a);
    graphics.strokeRoundedRect(-50, -35, 100, 70, 15);

    // パーティクルエフェクト
    this.createSuccessParticles(buttonContainer.x, buttonContainer.y);

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

    // 次の問題へ
    this.time.delayedCall(2000, () => {
      successMessage.destroy();
      this.nextQuestion();
    });
  }

  private handleIncorrectAnswer(buttonContainer: Phaser.GameObjects.Container): void {
    // 不正解音を再生
    this.playErrorSound();

    // 不正解エフェクト
    const graphics = buttonContainer.list[0] as Phaser.GameObjects.Graphics;
    graphics.clear();
    graphics.fillStyle(0xef4444);
    graphics.fillRoundedRect(-50, -35, 100, 70, 15);
    graphics.lineStyle(3, 0xdc2626);
    graphics.strokeRoundedRect(-50, -35, 100, 70, 15);

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
    this.encourageMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'もういちど！',
      {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#ef4444',
        stroke: '#ffffff',
        strokeThickness: 3
      }
    );
    this.encourageMessage.setOrigin(0.5);

    // 不正解時は自動的にヒントを表示
    this.time.delayedCall(500, () => {
      this.showHint();
    });

    // 応援メッセージを後で削除（バックアップとして）
    this.time.delayedCall(11000, () => {  // 500ms（ヒント表示待ち） + 10000ms（ヒント表示時間） + 500ms（余裕）
      if (this.encourageMessage) {
        this.encourageMessage.destroy();
        this.encourageMessage = undefined;
      }
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

  private resetButtons(): void {
    // ヒントコンテナを非表示にする
    this.hideHint();
    
    // ボタンをリセット
    this.options.forEach(option => option.destroy());
    this.options = [];
    this.createOptionButtons();
  }

  private nextQuestion(): void {
    this.selectRandomWord();
    
    // 全てクリアした場合は処理を終了
    if (this.remainingWords.length === 0) {
      return;
    }
    
    // 回答処理終了
    this.isProcessingAnswer = false;
    
    this.wordDisplay.setText(this.currentWord.pattern);
    // 新しいイラストを描画
    this.drawIllustration();
    this.resetButtons();
    
    // 新しい問題の正解単語を読み上げ
    this.time.delayedCall(1000, () => {
      this.speakWord(this.currentWord.word);
    });
  }

  private createSpeakButton(): void {
    // もう一度聞くボタン（高精度スピーカーアイコン）
    const speakButton = this.add.graphics();
    
    // ボタン背景（グラデーション風）
    speakButton.fillStyle(0x1e40af);
    speakButton.fillRoundedRect(0, 0, 60, 60, 10);
    speakButton.fillStyle(0x3b82f6);
    speakButton.fillRoundedRect(2, 2, 56, 56, 8);
    speakButton.lineStyle(2, 0xffffff);
    speakButton.strokeRoundedRect(0, 0, 60, 60, 10);
    
    // 高精度スピーカーアイコンを描画（ボタン内に完全に収まるように調整、左寄せ）
    const centerX = 25; // 左側に5px移動
    const centerY = 30;
    
    // スピーカー本体（より小さく）
    speakButton.fillStyle(0xffffff);
    speakButton.fillRect(centerX - 6, centerY - 5, 6, 10);
    
    // スピーカーコーン（より小さく、完全にボタン内に収まるサイズ）
    speakButton.beginPath();
    speakButton.moveTo(centerX, centerY - 6);
    speakButton.lineTo(centerX + 8, centerY - 9);
    speakButton.lineTo(centerX + 8, centerY + 9);
    speakButton.lineTo(centerX, centerY + 6);
    speakButton.closePath();
    speakButton.fillPath();
    
    // コーンの影（より小さく）
    speakButton.fillStyle(0xe5e7eb);
    speakButton.beginPath();
    speakButton.moveTo(centerX + 1, centerY - 4);
    speakButton.lineTo(centerX + 8, centerY - 7);
    speakButton.lineTo(centerX + 8, centerY + 7);
    speakButton.lineTo(centerX + 1, centerY + 4);
    speakButton.closePath();
    speakButton.fillPath();
    
    // 音波（完全にボタン内に収まるサイズ、より控えめに）
    speakButton.lineStyle(1.5, 0xffffff);
    // 第1音波（小さく）
    speakButton.beginPath();
    speakButton.arc(centerX + 10, centerY, 4, -Math.PI/4, Math.PI/4);
    speakButton.strokePath();
    // 第2音波（中くらい）
    speakButton.beginPath();
    speakButton.arc(centerX + 12, centerY, 7, -Math.PI/5, Math.PI/5);
    speakButton.strokePath();
    // 第3音波（大きく、でもボタン内に収まる）
    speakButton.beginPath();
    speakButton.arc(centerX + 14, centerY, 10, -Math.PI/6, Math.PI/6);
    speakButton.strokePath();
    
    // 選択肢ボタンの下（Y座標430付近）、中央左寄りに配置（ボタン間隔を広げる）
    speakButton.setPosition(this.cameras.main.centerX - 45, 480);
    
    speakButton.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 60, 60),
      Phaser.Geom.Rectangle.Contains
    );
    
    speakButton.on('pointerdown', () => {
      this.playButtonSound();
      this.speakWord(this.currentWord.word);
      
      // クリック時のエフェクト
      this.tweens.add({
        targets: speakButton,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    });

    speakButton.on('pointerover', () => {
      speakButton.setScale(1.1);
      speakButton.setAlpha(0.9);
    });

    speakButton.on('pointerout', () => {
      speakButton.setScale(1.0);
      speakButton.setAlpha(1.0);
    });
  }

  private createHintButton(): void {
    // ヒントボタンコンテナ（スピーカーボタンと間隔を広げて配置）
    this.hintButton = this.add.container(this.cameras.main.centerX + 45, 480);
    
    // ヒントボタン背景
    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x10b981);
    hintBg.fillRoundedRect(0, 0, 60, 60, 10);
    hintBg.fillStyle(0x34d399);
    hintBg.fillRoundedRect(2, 2, 56, 56, 8);
    hintBg.lineStyle(2, 0xffffff);
    hintBg.strokeRoundedRect(0, 0, 60, 60, 10);
    
    // ヒントアイコン（電球）
    const centerX = 30;
    const centerY = 30;
    
    // 電球本体
    hintBg.fillStyle(0xffffff);
    hintBg.fillCircle(centerX, centerY - 5, 12);
    
    // 電球の光線
    hintBg.lineStyle(2, 0xffc107);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const startX = centerX + Math.cos(angle) * 16;
      const startY = centerY - 5 + Math.sin(angle) * 16;
      const endX = centerX + Math.cos(angle) * 20;
      const endY = centerY - 5 + Math.sin(angle) * 20;
      hintBg.lineBetween(startX, startY, endX, endY);
    }
    
    // 電球の口金
    hintBg.fillStyle(0x9e9e9e);
    hintBg.fillRect(centerX - 6, centerY + 7, 12, 8);
    hintBg.lineStyle(1, 0x757575);
    for (let i = 0; i < 3; i++) {
      hintBg.lineBetween(centerX - 6, centerY + 9 + i * 2, centerX + 6, centerY + 9 + i * 2);
    }
    
    // ヒントボタンにコンポーネントを追加
    this.hintButton.add(hintBg);
    
    // インタラクティブ設定
    hintBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 60, 60),
      Phaser.Geom.Rectangle.Contains
    );
    
    hintBg.on('pointerdown', () => {
      // 回答処理中またはヒント表示中は無視
      if (this.isProcessingAnswer || this.isShowingHint) return;
      
      this.playButtonSound();
      this.showHint();
      
      // クリック時のエフェクト
      this.tweens.add({
        targets: this.hintButton,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    });
    
    hintBg.on('pointerover', () => {
      this.hintButton.setScale(1.1);
      this.hintButton.setAlpha(0.9);
    });
    
    hintBg.on('pointerout', () => {
      this.hintButton.setScale(1.0);
      this.hintButton.setAlpha(1.0);
    });
  }

  private showHint(): void {
    if (this.isShowingHint || !this.currentWord) return;
    
    this.isShowingHint = true;
    
    // 既存のヒントコンテナがあれば削除
    if (this.hintContainer) {
      this.hintContainer.destroy();
    }
    
    // ヒントコンテナ作成
    this.hintContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY - 50);
    
    // ヒント背景
    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x000000, 0.8);
    hintBg.fillRoundedRect(-200, -60, 400, 120, 15);
    hintBg.lineStyle(3, 0xffc107);
    hintBg.strokeRoundedRect(-200, -60, 400, 120, 15);
    this.hintContainer.add(hintBg);
    
    // クリックで閉じるためのインタラクティブ設定
    hintBg.setInteractive(
      new Phaser.Geom.Rectangle(-200, -60, 400, 120),
      Phaser.Geom.Rectangle.Contains
    );
    
    hintBg.on('pointerdown', () => {
      this.hideHint();
    });
    
    // ヒントの内容を取得
    const row = this.getHiraganaRow(this.currentWord.answer);
    const rowChars = this.getRowCharacters(row);
    
    // ヒントテキスト
    const hintTexts: string[] = [];
    
    // 行の文字を表示
    const rowText = this.add.text(0, -30, rowChars.join('、'), {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    rowText.setOrigin(0.5);
    this.hintContainer.add(rowText);
    hintTexts.push(rowChars.join('、'));
    
    // 正解文字の強調
    const answerHighlight = this.add.text(0, 0, `「${this.currentWord.answer}」`, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffc107',
      stroke: '#ffffff',
      strokeThickness: 2
    });
    answerHighlight.setOrigin(0.5);
    this.hintContainer.add(answerHighlight);
    hintTexts.push(`の、${this.currentWord.answer}`);
    
    // 単語のヒント
    const wordHint = this.add.text(0, 35, `${this.currentWord.word}の「${this.currentWord.answer}」`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#90ee90'
    });
    wordHint.setOrigin(0.5);
    this.hintContainer.add(wordHint);
    hintTexts.push(`${this.currentWord.word}の、${this.currentWord.answer}`);
    
    // アニメーション
    this.hintContainer.setScale(0.8);
    this.hintContainer.setAlpha(0);
    
    this.tweens.add({
      targets: this.hintContainer,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    // ヒントを読み上げる
    this.speakHint(hintTexts);
    
    // 10秒後に自動的にヒントを非表示
    const hintTimer = this.time.delayedCall(10000, () => {
      this.hideHint();
    });
    
    // ヒントタイマーを保存（クリック時にキャンセルするため）
    this.hintContainer.setData('timer', hintTimer);
  }
  
  private hideHint(): void {
    if (!this.hintContainer) return;
    
    // タイマーがあればキャンセル
    const timer = this.hintContainer.getData('timer');
    if (timer) {
      timer.remove();
    }
    
    this.tweens.add({
      targets: this.hintContainer,
      scale: 0.8,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (this.hintContainer) {
          this.hintContainer.destroy();
          this.hintContainer = undefined;
        }
        this.isShowingHint = false;
        
        // ヒント終了後、即座に回答を可能にする
        this.isProcessingAnswer = false;
        this.resetButtons();
        
        // 励ましメッセージも削除
        if (this.encourageMessage) {
          this.encourageMessage.destroy();
          this.encourageMessage = undefined;
        }
      }
    });
  }
  
  private getHiraganaRow(char: string): string {
    const rows: { [key: string]: string[] } = {
      'あ': ['あ', 'い', 'う', 'え', 'お'],
      'か': ['か', 'き', 'く', 'け', 'こ'],
      'さ': ['さ', 'し', 'す', 'せ', 'そ'],
      'た': ['た', 'ち', 'つ', 'て', 'と'],
      'な': ['な', 'に', 'ぬ', 'ね', 'の'],
      'は': ['は', 'ひ', 'ふ', 'へ', 'ほ'],
      'ま': ['ま', 'み', 'む', 'め', 'も'],
      'や': ['や', 'ゆ', 'よ'],
      'ら': ['ら', 'り', 'る', 'れ', 'ろ'],
      'わ': ['わ', 'を', 'ん']
    };
    
    for (const row in rows) {
      if (rows[row].includes(char)) {
        return row;
      }
    }
    return 'あ';
  }
  
  private getRowCharacters(row: string): string[] {
    const rows: { [key: string]: string[] } = {
      'あ': ['あ', 'い', 'う', 'え', 'お'],
      'か': ['か', 'き', 'く', 'け', 'こ'],
      'さ': ['さ', 'し', 'す', 'せ', 'そ'],
      'た': ['た', 'ち', 'つ', 'て', 'と'],
      'な': ['な', 'に', 'ぬ', 'ね', 'の'],
      'は': ['は', 'ひ', 'ふ', 'へ', 'ほ'],
      'ま': ['ま', 'み', 'む', 'め', 'も'],
      'や': ['や', 'ゆ', 'よ'],
      'ら': ['ら', 'り', 'る', 'れ', 'ろ'],
      'わ': ['わ', 'を', 'ん']
    };
    
    return rows[row] || ['あ', 'い', 'う', 'え', 'お'];
  }
  
  private speakHint(texts: string[]): void {
    if ('speechSynthesis' in window) {
      // 前の音声をキャンセル
      window.speechSynthesis.cancel();
      
      const fullText = texts.join('、');
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      window.speechSynthesis.speak(utterance);
    }
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
      // 回答処理中は無視
      if (this.isProcessingAnswer) return;
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

  private playButtonSound(): void {
    // AudioManagerを使用してボタン音を再生
    const gameManager = (this.game as any).gameManager;
    if (gameManager) {
      gameManager.getAudioManager().playButtonSound();
    }
  }

  private speakWord(word: string): void {
    // Web Speech APIを使用して単語を読み上げ
    if ('speechSynthesis' in window) {
      // 既に話している場合は停止
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(word);
      
      // 日本語の音声設定
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8; // 少しゆっくり話す
      utterance.pitch = 1.2; // 少し高い声で
      utterance.volume = 0.8; // 音量
      
      // 日本語の音声が利用可能か確認
      const voices = speechSynthesis.getVoices();
      const japaneseVoice = voices.find(voice => voice.lang === 'ja-JP' || voice.lang.startsWith('ja'));
      
      if (japaneseVoice) {
        utterance.voice = japaneseVoice;
      }
      
      // 読み上げ実行
      speechSynthesis.speak(utterance);
    } else {
      console.log('Speech synthesis not supported');
    }
  }

  private showGameCompleteMessage(): void {
    // 回答処理終了（クリア画面ではボタンが反応するように）
    this.isProcessingAnswer = false;
    
    // 全てのUI要素を削除
    this.children.removeAll();
    
    // 背景を再作成
    this.createBackground();
    
    // 祝福メッセージの背景
    const celebrationBg = this.add.graphics();
    celebrationBg.fillStyle(0xFFD700, 0.8);
    celebrationBg.fillRoundedRect(
      this.cameras.main.centerX - 200,
      this.cameras.main.centerY - 150,
      400,
      300,
      20
    );
    celebrationBg.lineStyle(5, 0xFF8C00);
    celebrationBg.strokeRoundedRect(
      this.cameras.main.centerX - 200,
      this.cameras.main.centerY - 150,
      400,
      300,
      20
    );
    
    // おめでとうメッセージ
    const congratsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 80,
      'おめでとう！',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#FF4500',
        stroke: '#ffffff',
        strokeThickness: 4
      }
    );
    congratsText.setOrigin(0.5);
    
    // クリア情報（選択された行に応じて変更）
    const getRowDisplayName = (row: string): string => {
      const rowNames: { [key: string]: string } = {
        'a': 'あ行',
        'ka': 'か行',
        'sa': 'さ行',
        'ta': 'た行',
        'na': 'な行',
        'ha': 'は行',
        'ma': 'ま行',
        'ya': 'や行',
        'ra': 'ら行',
        'wa': 'わ行',
        'all': 'ひらがな全部'
      };
      return rowNames[row] || '行';
    };
    
    const clearText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 20,
      `${getRowDisplayName(this.selectedLevel)}クリア！`,
      {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#FF1493',
        stroke: '#ffffff',
        strokeThickness: 3
      }
    );
    clearText.setOrigin(0.5);
    
    // 完了メッセージ
    const completionText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 20,
      `${this.totalWords}もんぜんぶクリア！`,
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#32CD32',
        stroke: '#ffffff',
        strokeThickness: 2
      }
    );
    completionText.setOrigin(0.5);
    
    // 祝福パーティクル
    this.createCelebrationParticles();
    
    // ボタンエリア
    const buttonY = this.cameras.main.centerY + 80;
    
    // 行選択に戻るボタン
    const rowButton = this.add.text(
      this.cameras.main.centerX - 115,
      buttonY,
      '行せんたく',
      {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#32CD32',
        padding: { x: 15, y: 8 }
      }
    );
    rowButton.setOrigin(0.5);
    rowButton.setInteractive();
    
    rowButton.on('pointerdown', () => {
      // 回答処理中は無視
      if (this.isProcessingAnswer) return;
      this.scene.restart();
    });
    
    rowButton.on('pointerover', () => {
      rowButton.setScale(1.1);
    });
    
    rowButton.on('pointerout', () => {
      rowButton.setScale(1.0);
    });
    
    // メニューに戻るボタン（位置を左に移動）
    const backButton = this.add.text(
      this.cameras.main.centerX + 95,
      buttonY,
      'メニューにもどる',
      {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#1e40af',
        padding: { x: 15, y: 8 }
      }
    );
    backButton.setOrigin(0.5);
    backButton.setInteractive();
    
    backButton.on('pointerdown', () => {
      // 回答処理中は無視
      if (this.isProcessingAnswer) return;
      this.scene.start('MenuScene');
    });
    
    backButton.on('pointerover', () => {
      backButton.setScale(1.1);
    });
    
    backButton.on('pointerout', () => {
      backButton.setScale(1.0);
    });
    
    // 祝福音声（選択された行に応じて変更）
    this.time.delayedCall(500, () => {
      const rowName = getRowDisplayName(this.selectedLevel);
      this.speakWord(`おめでとう！${rowName}クリアです！`);
    });
  }

  private createCelebrationParticles(): void {
    // 大きな祝福パーティクル
    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(i * 100, () => {
        const particle = this.add.graphics();
        const colors = [0xFFD700, 0xFF69B4, 0x00FF00, 0xFF4500, 0x1E90FF, 0xFF1493];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particle.fillStyle(color);
        
        // ランダムな形（星、円、四角）
        const shape = Math.floor(Math.random() * 3);
        if (shape === 0) {
          // 星
          this.drawStar(particle, 0, 0, 5, 8, 15);
        } else if (shape === 1) {
          // 円
          particle.fillCircle(0, 0, 12);
        } else {
          // 四角
          particle.fillRoundedRect(-10, -10, 20, 20, 5);
        }
        
        // ランダムな開始位置
        const startX = Math.random() * this.cameras.main.width;
        const startY = -20;
        particle.setPosition(startX, startY);
        
        // 落下アニメーション
        this.tweens.add({
          targets: particle,
          y: this.cameras.main.height + 50,
          x: startX + (Math.random() - 0.5) * 200,
          rotation: Math.random() * Math.PI * 4,
          scaleX: { from: 1, to: 0.2 },
          scaleY: { from: 1, to: 0.2 },
          alpha: { from: 1, to: 0 },
          duration: 3000 + Math.random() * 2000,
          ease: 'Cubic.easeIn',
          onComplete: () => particle.destroy()
        });
      });
    }
  }

  private initializeWordData(): void {
    // あ-んまでの全ひらがな文字の単語データ
    this.hiraganaWords = [
      // あ行
      { answer: 'あ', pattern: '○り', word: 'あり', illustration: 'ant' },
      { answer: 'い', pattern: '○ぬ', word: 'いぬ', illustration: 'dog' },
      { answer: 'う', pattern: '○み', word: 'うみ', illustration: 'sea' },
      { answer: 'え', pattern: '○んぴつ', word: 'えんぴつ', illustration: 'pencil' },
      { answer: 'お', pattern: '○に', word: 'おに', illustration: 'oni' },
      
      // か行
      { answer: 'か', pattern: '○き', word: 'かき', illustration: 'persimmon' },
      { answer: 'き', pattern: '○のこ', word: 'きのこ', illustration: 'mushroom' },
      { answer: 'く', pattern: '○つ', word: 'くつ', illustration: 'shoes' },
      { answer: 'け', pattern: '○ーき', word: 'けーき', illustration: 'cake' },
      { answer: 'こ', pattern: '○ま', word: 'こま', illustration: 'top' },
      
      // さ行
      { answer: 'さ', pattern: '○かな', word: 'さかな', illustration: 'fish' },
      { answer: 'し', pattern: '○んぶん', word: 'しんぶん', illustration: 'newspaper' },
      { answer: 'す', pattern: '○いか', word: 'すいか', illustration: 'watermelon' },
      { answer: 'せ', pattern: '○み', word: 'せみ', illustration: 'cicada' },
      { answer: 'そ', pattern: '○ら', word: 'そら', illustration: 'sky' },
      
      // た行
      { answer: 'た', pattern: '○まご', word: 'たまご', illustration: 'egg' },
      { answer: 'ち', pattern: '○ず', word: 'ちず', illustration: 'map' },
      { answer: 'つ', pattern: '○き', word: 'つき', illustration: 'moon' },
      { answer: 'て', pattern: '○がみ', word: 'てがみ', illustration: 'letter' },
      { answer: 'と', pattern: '○り', word: 'とり', illustration: 'bird' },
      
      // な行
      { answer: 'な', pattern: '○し', word: 'なし', illustration: 'pear' },
      { answer: 'に', pattern: '○んじん', word: 'にんじん', illustration: 'carrot' },
      { answer: 'ぬ', pattern: '○いぐるみ', word: 'ぬいぐるみ', illustration: 'stuffed_animal' },
      { answer: 'ね', pattern: '○こ', word: 'ねこ', illustration: 'cat' },
      { answer: 'の', pattern: '○り', word: 'のり', illustration: 'seaweed' },
      
      // は行
      { answer: 'は', pattern: '○し', word: 'はし', illustration: 'chopsticks' },
      { answer: 'ひ', pattern: '○こうき', word: 'ひこうき', illustration: 'airplane' },
      { answer: 'ふ', pattern: '○ね', word: 'ふね', illustration: 'ship' },
      { answer: 'へ', pattern: '○び', word: 'へび', illustration: 'snake' },
      { answer: 'ほ', pattern: '○し', word: 'ほし', illustration: 'star' },
      
      // ま行
      { answer: 'ま', pattern: '○ど', word: 'まど', illustration: 'window' },
      { answer: 'み', pattern: '○かん', word: 'みかん', illustration: 'orange' },
      { answer: 'む', pattern: '○し', word: 'むし', illustration: 'bug' },
      { answer: 'め', pattern: '○がね', word: 'めがね', illustration: 'glasses' },
      { answer: 'も', pattern: '○も', word: 'もも', illustration: 'peach' },
      
      // や行
      { answer: 'や', pattern: '○ま', word: 'やま', illustration: 'mountain' },
      { answer: 'ゆ', pattern: '○き', word: 'ゆき', illustration: 'snow' },
      { answer: 'よ', pattern: '○る', word: 'よる', illustration: 'night' },
      
      // ら行
      { answer: 'ら', pattern: '○いおん', word: 'らいおん', illustration: 'lion' },
      { answer: 'り', pattern: '○んご', word: 'りんご', illustration: 'apple' },
      { answer: 'る', pattern: '○びー', word: 'るびー', illustration: 'ruby' },
      { answer: 'れ', pattern: '○もん', word: 'れもん', illustration: 'lemon' },
      { answer: 'ろ', pattern: '○ぼっと', word: 'ろぼっと', illustration: 'robot' },
      
      // わ行
      { answer: 'わ', pattern: '○に', word: 'わに', illustration: 'crocodile' },
      { answer: 'ん', pattern: 'ぱ○', word: 'ぱん', illustration: 'bread' }
    ];
  }

  private initializeGameState(): void {
    // 選択されたレベルに応じて単語をフィルタリング
    const filteredWords = this.getWordsForLevel(this.selectedLevel);
    
    // フィルタリングされた単語を未出題リストにコピー
    this.remainingWords = [...filteredWords];
    this.completedWords = [];
    this.totalWords = filteredWords.length;
    
    // シャッフルして完全にランダムにする
    this.shuffleArray(this.remainingWords);
  }

  private getWordsForLevel(row: string): any[] {
    if (row === 'all') {
      return this.hiraganaWords;
    }
    
    // 行毎のひらがなマッピング
    const rowMappings: { [key: string]: string[] } = {
      'a': ['あ', 'い', 'う', 'え', 'お'],
      'ka': ['か', 'き', 'く', 'け', 'こ'],
      'sa': ['さ', 'し', 'す', 'せ', 'そ'],
      'ta': ['た', 'ち', 'つ', 'て', 'と'],
      'na': ['な', 'に', 'ぬ', 'ね', 'の'],
      'ha': ['は', 'ひ', 'ふ', 'へ', 'ほ'],
      'ma': ['ま', 'み', 'む', 'め', 'も'],
      'ya': ['や', 'ゆ', 'よ'],
      'ra': ['ら', 'り', 'る', 'れ', 'ろ'],
      'wa': ['わ', 'ん']
    };
    
    const targetCharacters = rowMappings[row] || [];
    return this.hiraganaWords.filter(word => targetCharacters.includes(word.answer));
  }

  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private selectRandomWord(): void {
    // 未出題の単語がない場合（全てクリア）
    if (this.remainingWords.length === 0) {
      this.showGameCompleteMessage();
      return;
    }
    
    // 未出題リストから最初の単語を取得
    this.currentWord = this.remainingWords[0];
  }

  private generateWrongOptions(correctAnswer: string): string[] {
    const allHiragana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 
                       'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と',
                       'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ',
                       'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り',
                       'る', 'れ', 'ろ', 'わ', 'ん'];
    
    const wrongOptions = [];
    const availableOptions = allHiragana.filter(char => char !== correctAnswer);
    
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * availableOptions.length);
      wrongOptions.push(availableOptions[randomIndex]);
      availableOptions.splice(randomIndex, 1);
    }
    
    return wrongOptions;
  }

  private drawIllustration(): void {
    if (!this.illustrationDisplay || !this.currentWord) return;
    
    this.illustrationDisplay.clear();
    
    const centerX = this.cameras.main.centerX;
    const centerY = 150;
    
    // 背景の白い枠
    this.illustrationDisplay.fillStyle(0xffffff);
    this.illustrationDisplay.fillRoundedRect(centerX - 65, centerY - 55, 130, 110, 10);
    this.illustrationDisplay.lineStyle(3, 0x1e40af);
    this.illustrationDisplay.strokeRoundedRect(centerX - 65, centerY - 55, 130, 110, 10);
    
    // 各単語に対応した高精度イラストを描画
    switch (this.currentWord.illustration) {
      case 'ant': // あり
        this.drawAnt(centerX, centerY);
        break;
      case 'dog': // いぬ
        this.drawDog(centerX, centerY);
        break;
      case 'sea': // うみ
        this.drawSea(centerX, centerY);
        break;
      case 'pencil': // えんぴつ
        this.drawPencilDetailed(centerX, centerY);
        break;
      case 'oni': // おに
        this.drawOni(centerX, centerY);
        break;
      case 'persimmon': // かき
        this.drawPersimmonDetailed(centerX, centerY);
        break;
      case 'mushroom': // きのこ
        this.drawMushroomDetailed(centerX, centerY);
        break;
      case 'shoes': // くつ
        this.drawShoesDetailed(centerX, centerY);
        break;
      case 'cake': // けーき
        this.drawCakeDetailed(centerX, centerY);
        break;
      case 'top': // こま
        this.drawTop(centerX, centerY);
        break;
      case 'fish': // さかな
        this.drawFish(centerX, centerY);
        break;
      case 'newspaper': // しんぶん
        this.drawNewspaper(centerX, centerY);
        break;
      case 'watermelon': // すいか
        this.drawWatermelon(centerX, centerY);
        break;
      case 'cicada': // せみ
        this.drawCicada(centerX, centerY);
        break;
      case 'sky': // そら
        this.drawSky(centerX, centerY);
        break;
      case 'egg': // たまご
        this.drawEgg(centerX, centerY);
        break;
      case 'map': // ちず
        this.drawMap(centerX, centerY);
        break;
      case 'moon': // つき
        this.drawMoon(centerX, centerY);
        break;
      case 'letter': // てがみ
        this.drawLetter(centerX, centerY);
        break;
      case 'bird': // とり
        this.drawBird(centerX, centerY);
        break;
      case 'pear': // なし
        this.drawPear(centerX, centerY);
        break;
      case 'carrot': // にんじん
        this.drawCarrot(centerX, centerY);
        break;
      case 'stuffed_animal': // ぬいぐるみ
        this.drawStuffedAnimal(centerX, centerY);
        break;
      case 'cat': // ねこ
        this.drawCat(centerX, centerY);
        break;
      case 'seaweed': // のり
        this.drawSeaweed(centerX, centerY);
        break;
      case 'chopsticks': // はし
        this.drawChopsticks(centerX, centerY);
        break;
      case 'airplane': // ひこうき
        this.drawAirplane(centerX, centerY);
        break;
      case 'ship': // ふね
        this.drawShip(centerX, centerY);
        break;
      case 'snake': // へび
        this.drawSnake(centerX, centerY);
        break;
      case 'star': // ほし
        this.drawStar(centerX, centerY);
        break;
      case 'window': // まど
        this.drawWindow(centerX, centerY);
        break;
      case 'orange': // みかん
        this.drawOrange(centerX, centerY);
        break;
      case 'bug': // むし
        this.drawBug(centerX, centerY);
        break;
      case 'glasses': // めがね
        this.drawGlasses(centerX, centerY);
        break;
      case 'peach': // もも
        this.drawPeach(centerX, centerY);
        break;
      case 'mountain': // やま
        this.drawMountain(centerX, centerY);
        break;
      case 'snow': // ゆき
        this.drawSnow(centerX, centerY);
        break;
      case 'night': // よる
        this.drawNight(centerX, centerY);
        break;
      case 'lion': // らいおん
        this.drawLion(centerX, centerY);
        break;
      case 'apple': // りんご
        this.drawApple(centerX, centerY);
        break;
      case 'ruby': // るびー
        this.drawRuby(centerX, centerY);
        break;
      case 'lemon': // れもん
        this.drawLemon(centerX, centerY);
        break;
      case 'robot': // ろぼっと
        this.drawRobot(centerX, centerY);
        break;
      case 'crocodile': // わに
        this.drawCrocodile(centerX, centerY);
        break;
      case 'bread': // ぱん
        this.drawBread(centerX, centerY);
        break;
      default:
        this.drawDefault(centerX, centerY);
    }
  }

  // 各イラストの描画メソッド
  private drawAnt(x: number, y: number): void {
    // あり（蟻）をより高精度に描画
    
    // 腹部（一番大きい部分）
    this.illustrationDisplay.fillStyle(0x654321); // 茶色
    this.illustrationDisplay.fillEllipse(x, y + 20, 18, 12);
    
    // 腹部のハイライト（立体感）
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillEllipse(x - 4, y + 18, 8, 6);
    
    // 腹部の節（セグメント）
    this.illustrationDisplay.lineStyle(1, 0x4A2C17);
    this.illustrationDisplay.lineBetween(x - 8, y + 18, x + 8, y + 18);
    this.illustrationDisplay.lineBetween(x - 6, y + 22, x + 6, y + 22);
    
    // 胸部（3つのセクション）- より詳細に
    this.illustrationDisplay.fillStyle(0x654321);
    this.illustrationDisplay.fillEllipse(x, y + 8, 14, 8);     // 後胸
    this.illustrationDisplay.fillEllipse(x, y - 2, 12, 7);    // 中胸  
    this.illustrationDisplay.fillEllipse(x, y - 10, 10, 6);   // 前胸
    
    // 胸部のハイライト
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillEllipse(x - 3, y + 6, 6, 4);
    this.illustrationDisplay.fillEllipse(x - 2, y - 4, 5, 3);
    this.illustrationDisplay.fillEllipse(x - 2, y - 12, 4, 3);
    
    // 頭部（より大きく詳細に）
    this.illustrationDisplay.fillStyle(0x654321);
    this.illustrationDisplay.fillEllipse(x, y - 18, 8, 7);
    
    // 頭部のハイライト
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillEllipse(x - 2, y - 20, 4, 3);
    
    // 大顎（アゴの部分）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x, y - 14, 4, 2);
    
    // 触角（より詳細に）
    this.illustrationDisplay.lineStyle(2, 0x000000);
    // 触角の基部
    this.illustrationDisplay.fillCircle(x - 3, y - 21, 1.5);
    this.illustrationDisplay.fillCircle(x + 3, y - 21, 1.5);
    // 触角の軸
    this.illustrationDisplay.lineBetween(x - 3, y - 21, x - 6, y - 28);
    this.illustrationDisplay.lineBetween(x + 3, y - 21, x + 6, y - 28);
    // 触角の先端（膨らんだ部分）
    this.illustrationDisplay.fillCircle(x - 6, y - 28, 2.5);
    this.illustrationDisplay.fillCircle(x + 6, y - 28, 2.5);
    
    // 脚（6本）- より詳細に関節を表現
    this.illustrationDisplay.lineStyle(2.5, 0x000000);
    
    // 前脚（頭に近い）
    this.illustrationDisplay.lineBetween(x - 4, y - 8, x - 10, y - 5);
    this.illustrationDisplay.lineBetween(x - 10, y - 5, x - 15, y - 2);
    this.illustrationDisplay.lineBetween(x + 4, y - 8, x + 10, y - 5);
    this.illustrationDisplay.lineBetween(x + 10, y - 5, x + 15, y - 2);
    
    // 関節
    this.illustrationDisplay.fillCircle(x - 10, y - 5, 1.5);
    this.illustrationDisplay.fillCircle(x + 10, y - 5, 1.5);
    
    // 中脚
    this.illustrationDisplay.lineBetween(x - 5, y + 2, x - 12, y + 6);
    this.illustrationDisplay.lineBetween(x - 12, y + 6, x - 18, y + 10);
    this.illustrationDisplay.lineBetween(x + 5, y + 2, x + 12, y + 6);
    this.illustrationDisplay.lineBetween(x + 12, y + 6, x + 18, y + 10);
    
    // 関節
    this.illustrationDisplay.fillCircle(x - 12, y + 6, 1.5);
    this.illustrationDisplay.fillCircle(x + 12, y + 6, 1.5);
    
    // 後脚
    this.illustrationDisplay.lineBetween(x - 6, y + 12, x - 12, y + 18);
    this.illustrationDisplay.lineBetween(x - 12, y + 18, x - 16, y + 25);
    this.illustrationDisplay.lineBetween(x + 6, y + 12, x + 12, y + 18);
    this.illustrationDisplay.lineBetween(x + 12, y + 18, x + 16, y + 25);
    
    // 関節
    this.illustrationDisplay.fillCircle(x - 12, y + 18, 1.5);
    this.illustrationDisplay.fillCircle(x + 12, y + 18, 1.5);
    
    // 複眼（より大きく）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x - 3, y - 18, 3, 2);
    this.illustrationDisplay.fillEllipse(x + 3, y - 18, 3, 2);
    
    // 複眼のハイライト
    this.illustrationDisplay.fillStyle(0x333333);
    this.illustrationDisplay.fillCircle(x - 2, y - 18, 1);
    this.illustrationDisplay.fillCircle(x + 4, y - 18, 1);
    
    // 体の輪郭線
    this.illustrationDisplay.lineStyle(1, 0x4A2C17);
    this.illustrationDisplay.strokeEllipse(x, y + 20, 18, 12); // 腹部
    this.illustrationDisplay.strokeEllipse(x, y - 18, 8, 7);   // 頭部
  }

  private drawDog(x: number, y: number): void {
    // いぬ（犬）をより可愛く詳細に描画
    this.illustrationDisplay.fillStyle(0xD2691E); // 茶色
    
    // 顔（楕円形）
    this.illustrationDisplay.fillEllipse(x, y - 5, 50, 40);
    
    // 耳（垂れ耳）
    this.illustrationDisplay.fillEllipse(x - 30, y - 25, 18, 30);
    this.illustrationDisplay.fillEllipse(x + 30, y - 25, 18, 30);
    
    // 耳の内側
    this.illustrationDisplay.fillStyle(0xFFB6C1);
    this.illustrationDisplay.fillEllipse(x - 30, y - 25, 10, 20);
    this.illustrationDisplay.fillEllipse(x + 30, y - 25, 10, 20);
    
    // 鼻部分（マズル）
    this.illustrationDisplay.fillStyle(0xF5DEB3);
    this.illustrationDisplay.fillEllipse(x, y + 5, 25, 15);
    
    // 鼻
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x, y, 8, 6);
    
    // 口
    this.illustrationDisplay.lineStyle(3, 0x000000);
    this.illustrationDisplay.lineBetween(x, y + 3, x - 8, y + 12);
    this.illustrationDisplay.lineBetween(x, y + 3, x + 8, y + 12);
    
    // 目
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x - 15, y - 15, 8, 10);
    this.illustrationDisplay.fillEllipse(x + 15, y - 15, 8, 10);
    
    // 白目のハイライト
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 13, y - 17, 2);
    this.illustrationDisplay.fillCircle(x + 17, y - 17, 2);
    
    // 舌
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillEllipse(x + 3, y + 8, 6, 4);
  }

  private drawSea(x: number, y: number): void {
    // うみ（海）をより高精度に描画
    
    // 深い海の背景（グラデーション効果）
    this.illustrationDisplay.fillStyle(0x191970); // 深い紺色
    this.illustrationDisplay.fillRect(x - 50, y + 15, 100, 25);
    
    // 中間の海の色
    this.illustrationDisplay.fillStyle(0x4682B4); // 中間の青
    this.illustrationDisplay.fillRect(x - 50, y - 5, 100, 25);
    
    // 浅い海の色
    this.illustrationDisplay.fillStyle(0x87CEEB); // 明るい青
    this.illustrationDisplay.fillRect(x - 50, y - 20, 100, 20);
    
    // 大きな波（メインの波）
    this.illustrationDisplay.fillStyle(0x4169E1);
    for (let i = 0; i < 4; i++) {
      const waveX = x - 40 + i * 25;
      this.illustrationDisplay.fillEllipse(waveX, y - 10, 20, 12);
    }
    
    // 中間の波
    this.illustrationDisplay.fillStyle(0x6495ED);
    for (let i = 0; i < 5; i++) {
      const waveX = x - 45 + i * 20;
      this.illustrationDisplay.fillEllipse(waveX, y - 5, 16, 8);
    }
    
    // 小さな波
    this.illustrationDisplay.fillStyle(0x87CEEB);
    for (let i = 0; i < 7; i++) {
      const waveX = x - 42 + i * 14;
      this.illustrationDisplay.fillEllipse(waveX, y, 12, 6);
    }
    
    // 波の白い泡（より自然に）
    this.illustrationDisplay.fillStyle(0xF0F8FF);
    for (let i = 0; i < 10; i++) {
      const foamX = x - 45 + i * 10;
      const foamY = y - 15 + Math.sin(i * 0.8) * 3;
      this.illustrationDisplay.fillEllipse(foamX, foamY, 8, 4);
    }
    
    // より細かい泡
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    for (let i = 0; i < 15; i++) {
      const bubbleX = x - 40 + (i % 8) * 10;
      const bubbleY = y - 18 + Math.floor(i / 8) * 6;
      this.illustrationDisplay.fillCircle(bubbleX + Math.random() * 4 - 2, bubbleY, 2);
    }
    
    // 太陽の光の反射（きらめき）
    this.illustrationDisplay.fillStyle(0xFFFFE0);
    for (let i = 0; i < 3; i++) {
      const sparkleX = x - 15 + i * 15;
      const sparkleY = y - 25 + i * 3;
      this.illustrationDisplay.fillEllipse(sparkleX, sparkleY, 12, 4);
    }
    
    // より明るい反射
    this.illustrationDisplay.fillStyle(0xFFFFF0);
    for (let i = 0; i < 5; i++) {
      const lightX = x - 20 + i * 10;
      const lightY = y - 22 + Math.sin(i * 1.2) * 2;
      this.illustrationDisplay.fillEllipse(lightX, lightY, 6, 2);
    }
    
    // 波しぶき（より動的に）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    for (let i = 0; i < 6; i++) {
      const splashX = x - 35 + i * 15;
      const splashY = y - 18;
      // 大きいしぶき
      this.illustrationDisplay.fillCircle(splashX, splashY, 3);
      // 小さいしぶき
      this.illustrationDisplay.fillCircle(splashX + 3, splashY - 2, 1.5);
      this.illustrationDisplay.fillCircle(splashX - 2, splashY - 3, 1);
    }
    
    // 海鳥（遠くのカモメ）
    this.illustrationDisplay.lineStyle(2, 0xFFFFFF);
    this.illustrationDisplay.lineBetween(x - 35, y - 30, x - 30, y - 33);
    this.illustrationDisplay.lineBetween(x - 30, y - 33, x - 25, y - 30);
    this.illustrationDisplay.lineBetween(x + 20, y - 32, x + 25, y - 35);
    this.illustrationDisplay.lineBetween(x + 25, y - 35, x + 30, y - 32);
    
    // 海底の砂（より詳細に）
    this.illustrationDisplay.fillStyle(0xF4A460);
    this.illustrationDisplay.fillRect(x - 50, y + 35, 100, 10);
    
    // 砂の模様
    this.illustrationDisplay.fillStyle(0xDEB887);
    for (let i = 0; i < 8; i++) {
      const sandX = x - 40 + i * 10;
      this.illustrationDisplay.fillEllipse(sandX, y + 38, 8, 3);
    }
    
    // 貝殻（より詳細に）
    this.illustrationDisplay.fillStyle(0xFFF8DC);
    // 大きな貝殻
    this.illustrationDisplay.fillEllipse(x - 20, y + 37, 8, 6);
    this.illustrationDisplay.lineStyle(1, 0xF0E68C);
    this.illustrationDisplay.strokeEllipse(x - 20, y + 37, 8, 6);
    // 小さな貝殻
    this.illustrationDisplay.fillEllipse(x + 18, y + 36, 6, 4);
    this.illustrationDisplay.strokeEllipse(x + 18, y + 36, 6, 4);
    
    // 海藻
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x + 5, y + 35, 3, 12);
    this.illustrationDisplay.fillEllipse(x + 8, y + 33, 2, 10);
    
    // 小さな魚のシルエット（遠景）
    this.illustrationDisplay.fillStyle(0x4682B4);
    this.illustrationDisplay.fillEllipse(x - 30, y + 10, 6, 3);
    this.illustrationDisplay.fillTriangle(x - 33, y + 10, x - 36, y + 8, x - 36, y + 12);
  }

  private drawPencil(x: number, y: number): void {
    // えんぴつ（鉛筆）をより詳細に描画
    
    // 影
    this.illustrationDisplay.fillStyle(0x000000, 0.2);
    this.illustrationDisplay.fillEllipse(x + 3, y + 35, 15, 5);
    
    // 鉛筆の木製軸（メイン）
    this.illustrationDisplay.fillStyle(0xFFD700);
    this.illustrationDisplay.fillRect(x - 5, y - 25, 10, 50);
    
    // 木目模様
    this.illustrationDisplay.lineStyle(1, 0xDAA520);
    for (let i = 0; i < 5; i++) {
      this.illustrationDisplay.lineBetween(x - 4, y - 20 + i * 10, x + 4, y - 18 + i * 10);
    }
    
    // 鉛筆の側面（立体感）
    this.illustrationDisplay.fillStyle(0xF0E68C);
    this.illustrationDisplay.fillRect(x - 5, y - 25, 3, 50);
    
    // 鉛筆の削られた部分（木材）
    this.illustrationDisplay.fillStyle(0xDEB887);
    this.illustrationDisplay.beginPath();
    this.illustrationDisplay.moveTo(x - 5, y - 25);
    this.illustrationDisplay.lineTo(x, y - 35);
    this.illustrationDisplay.lineTo(x + 5, y - 25);
    this.illustrationDisplay.closePath();
    this.illustrationDisplay.fillPath();
    
    // 芯の先端
    this.illustrationDisplay.fillStyle(0x2F4F4F);
    this.illustrationDisplay.fillTriangle(x, y - 35, x - 2, y - 30, x + 2, y - 30);
    
    // 芯の先端のハイライト
    this.illustrationDisplay.fillStyle(0x696969);
    this.illustrationDisplay.fillCircle(x, y - 32, 1);
    
    // 金属バンド（消しゴムホルダー）
    this.illustrationDisplay.fillStyle(0xC0C0C0);
    this.illustrationDisplay.fillRect(x - 6, y + 20, 12, 5);
    
    // 金属バンドの光沢
    this.illustrationDisplay.fillStyle(0xE5E5E5);
    this.illustrationDisplay.fillRect(x - 5, y + 21, 2, 3);
    this.illustrationDisplay.fillRect(x + 3, y + 21, 2, 3);
    
    // 消しゴム
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillRoundedRect(x - 7, y + 25, 14, 10, 2);
    
    // 消しゴムの使用跡
    this.illustrationDisplay.fillStyle(0xFF1493);
    this.illustrationDisplay.fillEllipse(x - 3, y + 28, 4, 2);
    this.illustrationDisplay.fillEllipse(x + 2, y + 31, 3, 2);
    
    // ブランド名（文字っぽい装飾）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillRect(x - 3, y - 10, 6, 1);
    this.illustrationDisplay.fillRect(x - 2, y - 5, 4, 1);
    this.illustrationDisplay.fillRect(x - 3, y, 6, 1);
    
    // 光沢効果
    this.illustrationDisplay.fillStyle(0xFFFFFF, 0.4);
    this.illustrationDisplay.fillRect(x - 3, y - 20, 1, 35);
  }

  private drawFlower(x: number, y: number): void {
    // はな（花）をより美しく詳細に描画
    
    // 茎
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillRect(x - 3, y + 15, 6, 35);
    
    // 葉っぱ
    this.illustrationDisplay.fillEllipse(x - 15, y + 25, 12, 8);
    this.illustrationDisplay.fillEllipse(x + 15, y + 25, 12, 8);
    
    // 花びら（桜のような5枚花びら）
    this.illustrationDisplay.fillStyle(0xFF69B4);
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const petalX = x + Math.cos(angle) * 22;
      const petalY = y + Math.sin(angle) * 22;
      
      // ハート型の花びら
      this.illustrationDisplay.fillEllipse(petalX - 3, petalY - 3, 12, 8);
      this.illustrationDisplay.fillEllipse(petalX + 3, petalY - 3, 12, 8);
      this.illustrationDisplay.fillTriangle(petalX, petalY + 8, petalX - 8, petalY, petalX + 8, petalY);
    }
    
    // 花の中心
    this.illustrationDisplay.fillStyle(0xFFD700);
    this.illustrationDisplay.fillCircle(x, y, 8);
    
    // おしべ
    this.illustrationDisplay.fillStyle(0xFFA500);
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180;
      const stamenX = x + Math.cos(angle) * 4;
      const stamenY = y + Math.sin(angle) * 4;
      this.illustrationDisplay.fillCircle(stamenX, stamenY, 1.5);
    }
  }

  private drawPersimmonDetailed(x: number, y: number): void {
    // かき（柿）をより詳細に描画
    
    // 柿の本体（オレンジ色）
    this.illustrationDisplay.fillStyle(0xFF8C00);
    this.illustrationDisplay.fillEllipse(x, y, 28, 32);
    
    // 柿のハイライト（立体感）
    this.illustrationDisplay.fillStyle(0xFFB347);
    this.illustrationDisplay.fillEllipse(x - 8, y - 8, 12, 16);
    
    // 柿の影
    this.illustrationDisplay.fillStyle(0xE6720A);
    this.illustrationDisplay.fillEllipse(x + 3, y + 3, 25, 29);
    
    // 柿の縦の溝（特徴的な線）
    this.illustrationDisplay.lineStyle(2, 0xE6720A);
    for (let i = 0; i < 4; i++) {
      const lineX = x - 10 + i * 7;
      this.illustrationDisplay.lineBetween(lineX, y - 15, lineX, y + 15);
    }
    
    // ヘタ（緑色）
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x, y - 25, 20, 10);
    
    // ヘタの葉っぱ（4枚）
    this.illustrationDisplay.fillStyle(0x32CD32);
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90) * Math.PI / 180;
      const leafX = x + Math.cos(angle) * 8;
      const leafY = y - 25 + Math.sin(angle) * 4;
      this.illustrationDisplay.fillEllipse(leafX, leafY, 6, 10);
    }
    
    // ヘタの中心
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillCircle(x, y - 25, 3);
    
    // 柿の底の少しくぼんだ感じ
    this.illustrationDisplay.fillStyle(0xE6720A);
    this.illustrationDisplay.fillEllipse(x, y + 12, 15, 6);
  }

  private drawMushroom(x: number, y: number): void {
    // 傘
    this.illustrationDisplay.fillStyle(0xFF4500);
    this.illustrationDisplay.fillEllipse(x, y - 10, 40, 20);
    // 白い斑点
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 10, y - 10, 4);
    this.illustrationDisplay.fillCircle(x + 8, y - 5, 3);
    // 軸
    this.illustrationDisplay.fillStyle(0xF5F5DC);
    this.illustrationDisplay.fillRect(x - 8, y, 16, 25);
  }

  private drawShoes(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x8B4513);
    // 靴
    this.illustrationDisplay.fillEllipse(x, y, 45, 20);
    this.illustrationDisplay.fillRect(x - 15, y - 15, 30, 15);
    // 靴紐
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.lineBetween(x - 10, y - 10, x + 10, y - 10);
  }

  private drawCake(x: number, y: number): void {
    // ケーキ台
    this.illustrationDisplay.fillStyle(0xDEB887);
    this.illustrationDisplay.fillRect(x - 25, y, 50, 20);
    // クリーム
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x - 20, y - 15, 40, 15);
    // イチゴ
    this.illustrationDisplay.fillStyle(0xFF0000);
    this.illustrationDisplay.fillCircle(x, y - 20, 5);
  }

  private drawTop(x: number, y: number): void {
    // こま（独楽）をより詳細に描画
    
    // コマの上部（円形の頭）
    this.illustrationDisplay.fillStyle(0xFF69B4); // ピンク
    this.illustrationDisplay.fillCircle(x, y - 20, 8);
    
    // コマの上部のハイライト
    this.illustrationDisplay.fillStyle(0xFFB6C1);
    this.illustrationDisplay.fillCircle(x - 3, y - 22, 4);
    
    // コマの本体（円錐形）
    this.illustrationDisplay.fillStyle(0xFF1493); // 濃いピンク
    this.illustrationDisplay.fillTriangle(x, y - 12, x - 18, y + 12, x + 18, y + 12);
    
    // コマの本体のハイライト（立体感）
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillTriangle(x, y - 12, x - 15, y + 8, x - 8, y + 8);
    
    // コマの装飾（縞模様）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    for (let i = 0; i < 3; i++) {
      const stripeY = y - 5 + i * 6;
      const stripeWidth = 12 - i * 2;
      this.illustrationDisplay.fillEllipse(x, stripeY, stripeWidth, 3);
    }
    
    // コマの軸（先端）
    this.illustrationDisplay.fillStyle(0x8B4513); // 茶色
    this.illustrationDisplay.fillEllipse(x, y + 15, 6, 3);
    this.illustrationDisplay.fillCircle(x, y + 18, 2);
    
    // コマの回転を表現する動きの線
    this.illustrationDisplay.lineStyle(2, 0xDDDDDD);
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90) * Math.PI / 180;
      const startX = x + Math.cos(angle) * 25;
      const startY = y + Math.sin(angle) * 8;
      const endX = x + Math.cos(angle) * 30;
      const endY = y + Math.sin(angle) * 10;
      this.illustrationDisplay.lineBetween(startX, startY, endX, endY);
    }
    
    // コマの紐（上部に少し見える）
    this.illustrationDisplay.lineStyle(3, 0x654321);
    this.illustrationDisplay.lineBetween(x + 5, y - 25, x + 8, y - 30);
  }

  private drawFish(x: number, y: number): void {
    // さかな（魚）をよりリアルに描画
    
    // 魚の体
    this.illustrationDisplay.fillStyle(0x4682B4); // 青色
    this.illustrationDisplay.fillEllipse(x, y, 45, 25);
    
    // 魚のウロコ
    this.illustrationDisplay.fillStyle(0x87CEEB);
    for (let i = 0; i < 4; i++) {
      this.illustrationDisplay.fillEllipse(x - 10 + i * 6, y - 3, 8, 4);
    }
    
    // 尾びれ
    this.illustrationDisplay.fillStyle(0x4169E1);
    this.illustrationDisplay.fillTriangle(x + 22, y, x + 40, y - 15, x + 40, y + 15);
    this.illustrationDisplay.fillTriangle(x + 30, y, x + 38, y - 8, x + 38, y + 8);
    
    // 胸びれ
    this.illustrationDisplay.fillTriangle(x + 5, y + 12, x + 15, y + 25, x - 5, y + 25);
    
    // 背びれ
    this.illustrationDisplay.fillTriangle(x + 5, y - 12, x + 15, y - 25, x - 5, y - 25);
    
    // 目
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 8, y - 5, 6);
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 6, y - 5, 3);
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 5, y - 6, 1);
    
    // 口
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x - 18, y, 4, 2);
    
    // エラ
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.lineBetween(x - 15, y - 8, x - 12, y - 12);
    this.illustrationDisplay.lineBetween(x - 15, y + 8, x - 12, y + 12);
  }

  private drawNewspaper(x: number, y: number): void {
    // しんぶん（新聞）をより詳細に描画
    
    // 新聞の背景（白い紙）
    this.illustrationDisplay.fillStyle(0xF5F5F5);
    this.illustrationDisplay.fillRect(x - 28, y - 25, 56, 50);
    
    // 新聞の影
    this.illustrationDisplay.fillStyle(0xE0E0E0);
    this.illustrationDisplay.fillRect(x - 25, y - 22, 53, 47);
    
    // 新聞の輪郭
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.strokeRect(x - 28, y - 25, 56, 50);
    
    // 見出し（太い線）
    this.illustrationDisplay.lineStyle(4, 0x000000);
    this.illustrationDisplay.lineBetween(x - 24, y - 20, x + 24, y - 20);
    
    // 記事の文字（細い線）
    this.illustrationDisplay.lineStyle(1, 0x333333);
    for (let i = 0; i < 6; i++) {
      this.illustrationDisplay.lineBetween(x - 22, y - 12 + i * 4, x + 22, y - 12 + i * 4);
    }
    
    // 短い文章（段落の終わり）
    this.illustrationDisplay.lineBetween(x - 22, y + 8, x + 10, y + 8);
    this.illustrationDisplay.lineBetween(x - 22, y + 12, x + 15, y + 12);
    
    // 写真エリア（グレーの四角）
    this.illustrationDisplay.fillStyle(0xDDDDDD);
    this.illustrationDisplay.fillRect(x - 20, y - 8, 18, 12);
    this.illustrationDisplay.lineStyle(1, 0x999999);
    this.illustrationDisplay.strokeRect(x - 20, y - 8, 18, 12);
    
    // 写真エリア内の簡単なイメージ（山のシルエット）
    this.illustrationDisplay.fillStyle(0xBBBBBB);
    this.illustrationDisplay.fillTriangle(x - 18, y + 2, x - 12, y - 5, x - 6, y + 2);
    
    // コラム分割線
    this.illustrationDisplay.lineStyle(1, 0x666666);
    this.illustrationDisplay.lineBetween(x, y - 15, x, y + 20);
    
    // 日付エリア
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillRect(x + 15, y - 23, 8, 2);
  }

  private drawWatermelon(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillCircle(x, y, 30);
    // 縞模様
    this.illustrationDisplay.lineStyle(4, 0x006400);
    for (let i = 0; i < 3; i++) {
      this.illustrationDisplay.strokeCircle(x, y, 20 + i * 8);
    }
  }

  private drawCicada(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x8B4513);
    // 体
    this.illustrationDisplay.fillEllipse(x, y, 15, 35);
    // 羽
    this.illustrationDisplay.fillStyle(0xF0F8FF);
    this.illustrationDisplay.fillEllipse(x - 15, y - 10, 20, 30);
    this.illustrationDisplay.fillEllipse(x + 15, y - 10, 20, 30);
  }

  private drawSky(x: number, y: number): void {
    // そら（空）をより詳細に描画
    
    // 空の背景（グラデーション風）
    this.illustrationDisplay.fillStyle(0x87CEEB); // 空色
    this.illustrationDisplay.fillRect(x - 50, y - 35, 100, 70);
    
    // より明るい空の部分
    this.illustrationDisplay.fillStyle(0xB0E0E6);
    this.illustrationDisplay.fillRect(x - 50, y - 35, 100, 20);
    
    // 太陽
    this.illustrationDisplay.fillStyle(0xFFD700);
    this.illustrationDisplay.fillCircle(x + 25, y - 25, 10);
    
    // 太陽の光線
    this.illustrationDisplay.lineStyle(2, 0xFFD700);
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const startX = x + 25 + Math.cos(angle) * 12;
      const startY = y - 25 + Math.sin(angle) * 12;
      const endX = x + 25 + Math.cos(angle) * 18;
      const endY = y - 25 + Math.sin(angle) * 18;
      this.illustrationDisplay.lineBetween(startX, startY, endX, endY);
    }
    
    // 大きな雲
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 25, y - 10, 14);
    this.illustrationDisplay.fillCircle(x - 15, y - 18, 16);
    this.illustrationDisplay.fillCircle(x - 5, y - 15, 12);
    this.illustrationDisplay.fillCircle(x + 5, y - 12, 10);
    
    // 雲の影
    this.illustrationDisplay.fillStyle(0xF0F8FF);
    this.illustrationDisplay.fillCircle(x - 23, y - 8, 12);
    this.illustrationDisplay.fillCircle(x - 13, y - 16, 14);
    this.illustrationDisplay.fillCircle(x - 3, y - 13, 10);
    
    // 小さな雲
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x + 15, y + 5, 8);
    this.illustrationDisplay.fillCircle(x + 22, y + 3, 6);
    this.illustrationDisplay.fillCircle(x + 28, y + 6, 5);
    
    // 鳥（遠くの鳥）
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.lineBetween(x - 35, y - 5, x - 30, y - 8);
    this.illustrationDisplay.lineBetween(x - 30, y - 8, x - 25, y - 5);
    this.illustrationDisplay.lineBetween(x + 30, y + 0, x + 35, y - 3);
    this.illustrationDisplay.lineBetween(x + 35, y - 3, x + 40, y + 0);
  }

  private drawEgg(x: number, y: number): void {
    // たまご（卵）をより詳細に描画
    
    // 卵の本体（白い色）
    this.illustrationDisplay.fillStyle(0xFFFFF0);
    this.illustrationDisplay.fillEllipse(x, y, 28, 40);
    
    // 卵の影（立体感）
    this.illustrationDisplay.fillStyle(0xF5F5DC);
    this.illustrationDisplay.fillEllipse(x + 2, y + 2, 25, 37);
    
    // 卵のハイライト
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillEllipse(x - 8, y - 10, 12, 16);
    
    // 卵の輪郭
    this.illustrationDisplay.lineStyle(2, 0xDDDDDD);
    this.illustrationDisplay.strokeEllipse(x, y, 28, 40);
    
    // 卵の表面の質感（小さな点）
    this.illustrationDisplay.fillStyle(0xF8F8FF);
    for (let i = 0; i < 8; i++) {
      const spotX = x + (Math.random() - 0.5) * 20;
      const spotY = y + (Math.random() - 0.5) * 30;
      this.illustrationDisplay.fillCircle(spotX, spotY, 1);
    }
    
    // 卵の底の影
    this.illustrationDisplay.fillStyle(0xE0E0E0);
    this.illustrationDisplay.fillEllipse(x, y + 20, 22, 8);
  }

  private drawMap(x: number, y: number): void {
    // ちず（地図）をより詳細に描画
    
    // 影
    this.illustrationDisplay.fillStyle(0x000000, 0.2);
    this.illustrationDisplay.fillRect(x - 28, y - 18, 60, 40);
    
    // 地図の背景（古い紙の質感）
    this.illustrationDisplay.fillStyle(0xF5F5DC);
    this.illustrationDisplay.fillRect(x - 30, y - 20, 60, 40);
    
    // 地図の端の汚れ（使い込まれた感じ）
    this.illustrationDisplay.fillStyle(0xDEB887);
    this.illustrationDisplay.fillCircle(x - 25, y - 15, 3);
    this.illustrationDisplay.fillCircle(x + 25, y + 15, 4);
    
    // 海（青い部分）
    this.illustrationDisplay.fillStyle(0x87CEEB);
    this.illustrationDisplay.fillEllipse(x - 20, y - 10, 15, 10);
    this.illustrationDisplay.fillEllipse(x + 15, y + 5, 12, 8);
    
    // 陸地（緑の部分）
    this.illustrationDisplay.fillStyle(0x90EE90);
    this.illustrationDisplay.beginPath();
    this.illustrationDisplay.moveTo(x - 10, y - 15);
    this.illustrationDisplay.lineTo(x + 5, y - 12);
    this.illustrationDisplay.lineTo(x + 10, y - 5);
    this.illustrationDisplay.lineTo(x + 8, y + 5);
    this.illustrationDisplay.lineTo(x - 5, y + 10);
    this.illustrationDisplay.lineTo(x - 15, y + 5);
    this.illustrationDisplay.lineTo(x - 10, y - 15);
    this.illustrationDisplay.closePath();
    this.illustrationDisplay.fillPath();
    
    // 山（三角形）
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillTriangle(x - 5, y - 5, x - 10, y + 2, x, y + 2);
    
    // 山の雪
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillTriangle(x - 5, y - 5, x - 7, y - 2, x - 3, y - 2);
    
    // 川（青い曲線）
    this.illustrationDisplay.lineStyle(2, 0x4169E1);
    this.illustrationDisplay.beginPath();
    this.illustrationDisplay.moveTo(x + 5, y - 10);
    this.illustrationDisplay.quadraticCurveTo(x + 2, y, x + 8, y + 8);
    this.illustrationDisplay.strokePath();
    
    // 道路（茶色の線）
    this.illustrationDisplay.lineStyle(3, 0xA0522D);
    this.illustrationDisplay.lineBetween(x - 15, y - 5, x + 15, y + 10);
    
    // 道路の破線
    this.illustrationDisplay.lineStyle(1, 0xFFFFFF);
    for (let i = 0; i < 5; i++) {
      const startX = x - 12 + i * 6;
      const startY = y - 3 + i * 2.5;
      this.illustrationDisplay.lineBetween(startX, startY, startX + 3, startY + 1.5);
    }
    
    // 建物マーク（小さな四角）
    this.illustrationDisplay.fillStyle(0xFF0000);
    this.illustrationDisplay.fillRect(x - 8, y + 2, 4, 4);
    this.illustrationDisplay.fillRect(x + 3, y - 3, 4, 4);
    
    // コンパス
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x + 20, y - 15, 6);
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x + 20, y - 15, 5);
    
    // コンパスの針
    this.illustrationDisplay.fillStyle(0xFF0000);
    this.illustrationDisplay.fillTriangle(x + 20, y - 18, x + 19, y - 15, x + 21, y - 15);
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillTriangle(x + 20, y - 12, x + 19, y - 15, x + 21, y - 15);
    
    // 方位（N）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillRect(x + 19, y - 23, 1, 4);
    this.illustrationDisplay.fillRect(x + 21, y - 23, 1, 4);
    this.illustrationDisplay.lineBetween(x + 19, y - 23, x + 21, y - 19);
    
    // 縮尺
    this.illustrationDisplay.lineStyle(1, 0x000000);
    this.illustrationDisplay.lineBetween(x - 25, y + 15, x - 15, y + 15);
    this.illustrationDisplay.lineBetween(x - 25, y + 13, x - 25, y + 17);
    this.illustrationDisplay.lineBetween(x - 15, y + 13, x - 15, y + 17);
    
    // 凡例の枠
    this.illustrationDisplay.fillStyle(0xFFFFFF, 0.8);
    this.illustrationDisplay.fillRect(x - 28, y - 18, 20, 12);
    this.illustrationDisplay.lineStyle(1, 0x000000);
    this.illustrationDisplay.strokeRect(x - 28, y - 18, 20, 12);
    
    // 凡例の内容
    this.illustrationDisplay.fillStyle(0x90EE90);
    this.illustrationDisplay.fillRect(x - 26, y - 16, 3, 3);
    this.illustrationDisplay.fillStyle(0x87CEEB);
    this.illustrationDisplay.fillRect(x - 26, y - 11, 3, 3);
  }

  private drawMoon(x: number, y: number): void {
    // つき（月）をより詳細に描画
    
    // 夜空の背景
    this.illustrationDisplay.fillStyle(0x191970);
    this.illustrationDisplay.fillRect(x - 35, y - 35, 70, 70);
    
    // 星
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    for (let i = 0; i < 12; i++) {
      const starX = x - 30 + Math.random() * 60;
      const starY = y - 30 + Math.random() * 60;
      if (Math.abs(starX - x) > 20 || Math.abs(starY - y) > 20) {
        this.illustrationDisplay.fillCircle(starX, starY, Math.random() * 1.5 + 0.5);
      }
    }
    
    // 月の光輪（グロー効果）
    this.illustrationDisplay.fillStyle(0xFFFACD, 0.2);
    this.illustrationDisplay.fillCircle(x, y, 35);
    this.illustrationDisplay.fillStyle(0xFFFACD, 0.3);
    this.illustrationDisplay.fillCircle(x, y, 30);
    
    // 月の本体
    this.illustrationDisplay.fillStyle(0xFFFACD);
    this.illustrationDisplay.fillCircle(x, y, 25);
    
    // 月の海（暗い部分）
    this.illustrationDisplay.fillStyle(0xDDC9A3);
    this.illustrationDisplay.beginPath();
    this.illustrationDisplay.arc(x - 5, y - 8, 12, 0, Math.PI * 0.8);
    this.illustrationDisplay.fillPath();
    
    // 大きなクレーター
    this.illustrationDisplay.fillStyle(0xF0E68C);
    this.illustrationDisplay.fillCircle(x - 8, y - 5, 5);
    this.illustrationDisplay.fillCircle(x + 10, y + 8, 4);
    this.illustrationDisplay.fillCircle(x + 5, y - 10, 3);
    
    // クレーターの影
    this.illustrationDisplay.fillStyle(0xDDB892);
    this.illustrationDisplay.fillEllipse(x - 6, y - 3, 3, 2);
    this.illustrationDisplay.fillEllipse(x + 12, y + 10, 2.5, 1.5);
    this.illustrationDisplay.fillEllipse(x + 6, y - 8, 2, 1);
    
    // 小さなクレーター
    this.illustrationDisplay.fillStyle(0xE6D8B5);
    this.illustrationDisplay.fillCircle(x - 15, y + 5, 2);
    this.illustrationDisplay.fillCircle(x + 3, y + 15, 1.5);
    this.illustrationDisplay.fillCircle(x - 10, y + 12, 1);
    this.illustrationDisplay.fillCircle(x + 15, y - 3, 2);
    this.illustrationDisplay.fillCircle(x - 3, y - 18, 1.5);
    
    // 月の表面の細かい模様
    this.illustrationDisplay.fillStyle(0xF5E6D3);
    for (let i = 0; i < 8; i++) {
      const spotX = x + (Math.random() - 0.5) * 40;
      const spotY = y + (Math.random() - 0.5) * 40;
      if (Math.pow(spotX - x, 2) + Math.pow(spotY - y, 2) < 625) { // 円内チェック
        this.illustrationDisplay.fillCircle(spotX, spotY, 0.8);
      }
    }
    
    // 月の端の影（立体感）
    this.illustrationDisplay.lineStyle(2, 0xDDB892, 0.3);
    this.illustrationDisplay.beginPath();
    this.illustrationDisplay.arc(x, y, 24, Math.PI * 0.3, Math.PI * 0.7);
    this.illustrationDisplay.strokePath();
    
    // ハイライト（光が当たっている部分）
    this.illustrationDisplay.fillStyle(0xFFFFFF, 0.4);
    this.illustrationDisplay.fillEllipse(x - 10, y - 12, 8, 10);
    
    // うさぎの模様（日本の月のイメージ）
    this.illustrationDisplay.fillStyle(0xE6D8B5, 0.5);
    this.illustrationDisplay.fillEllipse(x + 2, y + 3, 6, 8);
    this.illustrationDisplay.fillCircle(x + 5, y - 2, 3);
  }

  private drawLetter(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x - 20, y - 15, 40, 30);
    // 線
    this.illustrationDisplay.lineStyle(2, 0x000000);
    for (let i = 0; i < 4; i++) {
      this.illustrationDisplay.lineBetween(x - 15, y - 10 + i * 5, x + 15, y - 10 + i * 5);
    }
  }

  private drawBird(x: number, y: number): void {
    // とり（鳥）をより可愛く詳細に描画
    
    // 体（楕円形）
    this.illustrationDisplay.fillStyle(0xFF8C00); // オレンジ色
    this.illustrationDisplay.fillEllipse(x + 5, y, 35, 22);
    
    // 頭（丸い形）
    this.illustrationDisplay.fillCircle(x - 15, y - 8, 15);
    
    // 翼（羽毛の詳細）
    this.illustrationDisplay.fillStyle(0xD2691E);
    this.illustrationDisplay.fillEllipse(x + 8, y - 8, 25, 15);
    
    // 翼の羽毛ライン
    this.illustrationDisplay.lineStyle(2, 0x8B4513);
    for (let i = 0; i < 4; i++) {
      this.illustrationDisplay.lineBetween(x + 2 + i * 6, y - 15, x + 2 + i * 6, y - 2);
    }
    
    // くちばし（三角形）
    this.illustrationDisplay.fillStyle(0xFFD700);
    this.illustrationDisplay.fillTriangle(x - 28, y - 8, x - 35, y - 5, x - 35, y - 11);
    
    // 目（黒い目と白いハイライト）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 18, y - 10, 4);
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 16, y - 12, 1.5);
    
    // 尻尾（扇形）
    this.illustrationDisplay.fillStyle(0xD2691E);
    this.illustrationDisplay.fillTriangle(x + 22, y, x + 35, y - 8, x + 35, y + 8);
    
    // 脚（細い線）
    this.illustrationDisplay.lineStyle(3, 0xFF8C00);
    this.illustrationDisplay.lineBetween(x, y + 11, x - 3, y + 20);
    this.illustrationDisplay.lineBetween(x + 8, y + 11, x + 5, y + 20);
    
    // 爪
    this.illustrationDisplay.lineStyle(2, 0x8B4513);
    this.illustrationDisplay.lineBetween(x - 3, y + 20, x - 6, y + 22);
    this.illustrationDisplay.lineBetween(x - 3, y + 20, x - 1, y + 23);
    this.illustrationDisplay.lineBetween(x - 3, y + 20, x + 1, y + 22);
  }

  private drawPear(x: number, y: number): void {
    // なし（梨）をより詳細に描画
    
    // 影
    this.illustrationDisplay.fillStyle(0x000000, 0.2);
    this.illustrationDisplay.fillEllipse(x + 2, y + 25, 25, 8);
    
    // 梨の下部（大きい部分）
    this.illustrationDisplay.fillStyle(0x9ACD32);
    this.illustrationDisplay.fillEllipse(x, y + 8, 26, 32);
    
    // 梨の上部（小さい部分）
    this.illustrationDisplay.fillEllipse(x, y - 8, 20, 20);
    
    // 梨の表面の模様（ザラザラ感）
    this.illustrationDisplay.fillStyle(0x8FBC8F);
    for (let i = 0; i < 15; i++) {
      const spotX = x + (Math.random() - 0.5) * 22;
      const spotY = y + (Math.random() - 0.5) * 35;
      this.illustrationDisplay.fillCircle(spotX, spotY, 1);
    }
    
    // 梨の表面の細かい点
    this.illustrationDisplay.fillStyle(0x228B22);
    for (let i = 0; i < 20; i++) {
      const dotX = x + (Math.random() - 0.5) * 20;
      const dotY = y + (Math.random() - 0.5) * 30;
      this.illustrationDisplay.fillCircle(dotX, dotY, 0.5);
    }
    
    // ハイライト
    this.illustrationDisplay.fillStyle(0xF0FFF0);
    this.illustrationDisplay.fillEllipse(x - 8, y - 5, 8, 12);
    
    // 軸（茎）
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillRect(x - 1, y - 20, 2, 10);
    
    // 軸の先端
    this.illustrationDisplay.fillStyle(0x654321);
    this.illustrationDisplay.fillCircle(x, y - 20, 2);
    
    // 葉っぱ
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x - 8, y - 22, 10, 6);
    this.illustrationDisplay.fillEllipse(x + 8, y - 22, 10, 6);
    
    // 葉っぱの葉脈
    this.illustrationDisplay.lineStyle(1, 0x006400);
    this.illustrationDisplay.lineBetween(x - 8, y - 22, x - 5, y - 19);
    this.illustrationDisplay.lineBetween(x + 8, y - 22, x + 5, y - 19);
    
    // 梨の底の窪み
    this.illustrationDisplay.fillStyle(0x7CFC00);
    this.illustrationDisplay.fillEllipse(x, y + 18, 6, 3);
    
    // 梨の品種マーク（小さな茶色の点）
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillCircle(x - 3, y + 2, 1);
    this.illustrationDisplay.fillCircle(x + 4, y + 8, 1);
    this.illustrationDisplay.fillCircle(x - 2, y + 12, 1);
  }

  private drawCarrot(x: number, y: number): void {
    // にんじん（人参）をより詳細に描画
    
    // 影
    this.illustrationDisplay.fillStyle(0x000000, 0.2);
    this.illustrationDisplay.fillTriangle(x + 2, y + 22, x - 8, y - 13, x + 12, y - 13);
    
    // 人参本体
    this.illustrationDisplay.fillStyle(0xFF8C00);
    this.illustrationDisplay.fillTriangle(x, y + 20, x - 10, y - 15, x + 10, y - 15);
    
    // 人参の先端
    this.illustrationDisplay.fillStyle(0xD2691E);
    this.illustrationDisplay.fillCircle(x, y + 20, 3);
    
    // 人参の縦線（成長線）
    this.illustrationDisplay.lineStyle(1, 0xD2691E);
    for (let i = 0; i < 3; i++) {
      const lineX = x - 6 + i * 6;
      this.illustrationDisplay.lineBetween(lineX, y - 12, lineX, y + 15);
    }
    
    // 人参の横線（成長の節）
    for (let i = 0; i < 4; i++) {
      const lineY = y - 10 + i * 8;
      const lineWidth = 15 - i * 2;
      this.illustrationDisplay.lineBetween(x - lineWidth/2, lineY, x + lineWidth/2, lineY);
    }
    
    // 人参のハイライト
    this.illustrationDisplay.fillStyle(0xFFB347);
    this.illustrationDisplay.fillTriangle(x - 2, y + 15, x - 6, y - 10, x - 4, y - 10);
    
    // 葉っぱの茎
    this.illustrationDisplay.fillStyle(0x8FBC8F);
    for (let i = 0; i < 3; i++) {
      const stemX = x - 4 + i * 4;
      this.illustrationDisplay.fillRect(stemX - 0.5, y - 20, 1, 10);
    }
    
    // 葉っぱ（羽状複葉）
    this.illustrationDisplay.fillStyle(0x228B22);
    for (let i = 0; i < 5; i++) {
      const leafX = x - 12 + i * 6;
      // メインの葉
      this.illustrationDisplay.fillEllipse(leafX, y - 25, 8, 4);
      // 小葉
      this.illustrationDisplay.fillEllipse(leafX - 3, y - 28, 4, 2);
      this.illustrationDisplay.fillEllipse(leafX + 3, y - 28, 4, 2);
      this.illustrationDisplay.fillEllipse(leafX - 2, y - 32, 3, 2);
      this.illustrationDisplay.fillEllipse(leafX + 2, y - 32, 3, 2);
    }
    
    // 葉っぱの葉脈
    this.illustrationDisplay.lineStyle(1, 0x006400);
    for (let i = 0; i < 5; i++) {
      const leafX = x - 12 + i * 6;
      this.illustrationDisplay.lineBetween(leafX, y - 23, leafX, y - 27);
      this.illustrationDisplay.lineBetween(leafX - 2, y - 30, leafX, y - 27);
      this.illustrationDisplay.lineBetween(leafX + 2, y - 30, leafX, y - 27);
    }
    
    // 人参の表面の凹凸
    this.illustrationDisplay.fillStyle(0xCD853F);
    for (let i = 0; i < 6; i++) {
      const spotX = x + (Math.random() - 0.5) * 16;
      const spotY = y + (Math.random() - 0.5) * 30;
      if (Math.abs(spotX - x) < 8 && spotY > y - 15 && spotY < y + 18) {
        this.illustrationDisplay.fillCircle(spotX, spotY, 0.8);
      }
    }
  }

  private drawStuffedAnimal(x: number, y: number): void {
    // ぬいぐるみ（テディベア）をより詳細に描画
    
    // 影
    this.illustrationDisplay.fillStyle(0x000000, 0.2);
    this.illustrationDisplay.fillEllipse(x + 3, y + 35, 35, 10);
    
    // 体
    this.illustrationDisplay.fillStyle(0xDEB887);
    this.illustrationDisplay.fillEllipse(x, y + 15, 28, 35);
    
    // 頭
    this.illustrationDisplay.fillCircle(x, y - 5, 22);
    
    // 耳（外側）
    this.illustrationDisplay.fillCircle(x - 16, y - 18, 9);
    this.illustrationDisplay.fillCircle(x + 16, y - 18, 9);
    
    // 耳（内側）
    this.illustrationDisplay.fillStyle(0xF5DEB3);
    this.illustrationDisplay.fillCircle(x - 16, y - 18, 6);
    this.illustrationDisplay.fillCircle(x + 16, y - 18, 6);
    
    // 手足
    this.illustrationDisplay.fillStyle(0xDEB887);
    // 左手
    this.illustrationDisplay.fillCircle(x - 22, y + 5, 8);
    // 右手
    this.illustrationDisplay.fillCircle(x + 22, y + 5, 8);
    // 左足
    this.illustrationDisplay.fillEllipse(x - 12, y + 28, 10, 15);
    // 右足
    this.illustrationDisplay.fillEllipse(x + 12, y + 28, 10, 15);
    
    // 足の裏
    this.illustrationDisplay.fillStyle(0xF5DEB3);
    this.illustrationDisplay.fillEllipse(x - 12, y + 32, 6, 8);
    this.illustrationDisplay.fillEllipse(x + 12, y + 32, 6, 8);
    
    // 鼻（大きく可愛く）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x, y + 2, 3);
    
    // 鼻のハイライト
    this.illustrationDisplay.fillStyle(0x333333);
    this.illustrationDisplay.fillCircle(x - 1, y + 1, 1);
    
    // 目（大きくて可愛い）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 8, y - 6, 4);
    this.illustrationDisplay.fillCircle(x + 8, y - 6, 4);
    
    // 目のハイライト
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 7, y - 7, 1.5);
    this.illustrationDisplay.fillCircle(x + 9, y - 7, 1.5);
    
    // 口（微笑み）
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.beginPath();
    this.illustrationDisplay.arc(x, y + 5, 6, 0, Math.PI);
    this.illustrationDisplay.strokePath();
    
    // リボン（首元）
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillRect(x - 15, y + 18, 30, 4);
    
    // リボンの結び目
    this.illustrationDisplay.fillTriangle(x - 5, y + 18, x - 8, y + 13, x - 2, y + 13);
    this.illustrationDisplay.fillTriangle(x + 5, y + 18, x + 2, y + 13, x + 8, y + 13);
    this.illustrationDisplay.fillRect(x - 3, y + 15, 6, 6);
    
    // 縫い目（ぬいぐるみらしさ）
    this.illustrationDisplay.lineStyle(1, 0x8B7355);
    // 頭の縫い目
    this.illustrationDisplay.lineBetween(x - 18, y - 10, x - 12, y - 15);
    this.illustrationDisplay.lineBetween(x + 12, y - 15, x + 18, y - 10);
    // 体の縫い目
    this.illustrationDisplay.lineBetween(x - 22, y + 15, x - 18, y + 25);
    this.illustrationDisplay.lineBetween(x + 18, y + 25, x + 22, y + 15);
    
    // ボタン（お腹）
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillCircle(x, y + 10, 2);
    this.illustrationDisplay.fillCircle(x, y + 20, 2);
    
    // ボタンの穴
    this.illustrationDisplay.fillStyle(0x654321);
    this.illustrationDisplay.fillCircle(x - 0.5, y + 10, 0.5);
    this.illustrationDisplay.fillCircle(x + 0.5, y + 10, 0.5);
    this.illustrationDisplay.fillCircle(x - 0.5, y + 20, 0.5);
    this.illustrationDisplay.fillCircle(x + 0.5, y + 20, 0.5);
    
    // ふわふわ感（毛の質感）
    this.illustrationDisplay.fillStyle(0xF5E6D3, 0.3);
    for (let i = 0; i < 12; i++) {
      const fuzzX = x + (Math.random() - 0.5) * 35;
      const fuzzY = y + (Math.random() - 0.5) * 40;
      this.illustrationDisplay.fillCircle(fuzzX, fuzzY, Math.random() * 2 + 1);
    }
  }

  private drawCat(x: number, y: number): void {
    // ねこ（猫）をより可愛く詳細に描画
    
    // 顔（丸い形）
    this.illustrationDisplay.fillStyle(0xFFB6C1); // ピンク色
    this.illustrationDisplay.fillCircle(x, y, 32);
    
    // 耳（三角形）
    this.illustrationDisplay.fillTriangle(x - 20, y - 30, x - 8, y - 40, x - 5, y - 22);
    this.illustrationDisplay.fillTriangle(x + 5, y - 22, x + 8, y - 40, x + 20, y - 30);
    
    // 耳の内側
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillTriangle(x - 16, y - 28, x - 10, y - 35, x - 8, y - 25);
    this.illustrationDisplay.fillTriangle(x + 8, y - 25, x + 10, y - 35, x + 16, y - 28);
    
    // 目（猫の特徴的なアーモンド型）
    this.illustrationDisplay.fillStyle(0x228B22); // 緑色の目
    this.illustrationDisplay.fillEllipse(x - 12, y - 8, 10, 15);
    this.illustrationDisplay.fillEllipse(x + 12, y - 8, 10, 15);
    
    // 瞳
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x - 12, y - 8, 3, 12);
    this.illustrationDisplay.fillEllipse(x + 12, y - 8, 3, 12);
    
    // 鼻（三角形）
    this.illustrationDisplay.fillStyle(0xFF1493);
    this.illustrationDisplay.fillTriangle(x, y + 2, x - 4, y - 3, x + 4, y - 3);
    
    // 口（W字型）
    this.illustrationDisplay.lineStyle(3, 0x000000);
    this.illustrationDisplay.lineBetween(x, y + 5, x - 8, y + 12);
    this.illustrationDisplay.lineBetween(x, y + 5, x + 8, y + 12);
    this.illustrationDisplay.lineBetween(x, y + 5, x - 3, y + 10);
    this.illustrationDisplay.lineBetween(x, y + 5, x + 3, y + 10);
    
    // ひげ
    this.illustrationDisplay.lineStyle(2, 0x000000);
    // 左のひげ
    this.illustrationDisplay.lineBetween(x - 25, y - 5, x - 40, y - 8);
    this.illustrationDisplay.lineBetween(x - 25, y, x - 40, y);
    this.illustrationDisplay.lineBetween(x - 25, y + 5, x - 40, y + 8);
    // 右のひげ
    this.illustrationDisplay.lineBetween(x + 25, y - 5, x + 40, y - 8);
    this.illustrationDisplay.lineBetween(x + 25, y, x + 40, y);
    this.illustrationDisplay.lineBetween(x + 25, y + 5, x + 40, y + 8);
  }

  private drawSeaweed(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillRect(x - 15, y - 20, 30, 40);
    // 縞模様
    this.illustrationDisplay.fillStyle(0x006400);
    for (let i = 0; i < 3; i++) {
      this.illustrationDisplay.fillRect(x - 15, y - 15 + i * 10, 30, 3);
    }
  }

  private drawAirplane(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xC0C0C0);
    // 機体
    this.illustrationDisplay.fillEllipse(x, y, 40, 15);
    // 主翼
    this.illustrationDisplay.fillRect(x - 20, y - 5, 40, 10);
    // 尾翼
    this.illustrationDisplay.fillRect(x + 15, y - 8, 10, 16);
  }

  private drawShip(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x8B4513);
    // 船体
    this.illustrationDisplay.fillEllipse(x, y + 10, 50, 20);
    // マスト
    this.illustrationDisplay.fillRect(x - 2, y - 20, 4, 30);
    // 帆
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x + 2, y - 15, 20, 25);
  }

  private drawSnake(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    // 蛇の体（S字）
    for (let i = 0; i < 6; i++) {
      const segmentX = x + Math.sin(i * 0.8) * 15;
      const segmentY = y - 20 + i * 7;
      this.illustrationDisplay.fillCircle(segmentX, segmentY, 8);
    }
  }

  private drawStar(x: number, y: number): void {
    // ほし（星）をより美しく輝くように描画
    
    // メインの星（5つの角）
    this.illustrationDisplay.fillStyle(0xFFD700); // 金色
    
    // 星の形を多角形で描画
    this.illustrationDisplay.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * 36 - 90) * Math.PI / 180;
      const radius = i % 2 === 0 ? 25 : 12;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.illustrationDisplay.moveTo(pointX, pointY);
      } else {
        this.illustrationDisplay.lineTo(pointX, pointY);
      }
    }
    this.illustrationDisplay.closePath();
    this.illustrationDisplay.fillPath();
    
    // 星の輝き効果
    this.illustrationDisplay.fillStyle(0xFFFacd); // より明るい黄色
    this.illustrationDisplay.fillCircle(x, y, 8);
    
    // 光の筋（十字の光）
    this.illustrationDisplay.lineStyle(3, 0xFFFFFF);
    this.illustrationDisplay.lineBetween(x, y - 35, x, y + 35);
    this.illustrationDisplay.lineBetween(x - 35, y, x + 35, y);
    
    // 斜めの光の筋
    this.illustrationDisplay.lineStyle(2, 0xFFFFE0);
    this.illustrationDisplay.lineBetween(x - 25, y - 25, x + 25, y + 25);
    this.illustrationDisplay.lineBetween(x + 25, y - 25, x - 25, y + 25);
    
    // 小さな周囲の星（きらめき効果）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 30, y - 20, 2);
    this.illustrationDisplay.fillCircle(x + 35, y - 15, 1.5);
    this.illustrationDisplay.fillCircle(x - 20, y + 30, 1);
    this.illustrationDisplay.fillCircle(x + 25, y + 25, 2);
  }

  private drawWindow(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x87CEEB);
    this.illustrationDisplay.fillRect(x - 25, y - 20, 50, 40);
    // 窓枠
    this.illustrationDisplay.lineStyle(4, 0x8B4513);
    this.illustrationDisplay.strokeRect(x - 25, y - 20, 50, 40);
    this.illustrationDisplay.lineBetween(x, y - 20, x, y + 20);
    this.illustrationDisplay.lineBetween(x - 25, y, x + 25, y);
  }

  private drawOrange(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFF8C00);
    this.illustrationDisplay.fillCircle(x, y, 20);
    // 模様
    this.illustrationDisplay.lineStyle(2, 0xFF4500);
    for (let i = 0; i < 4; i++) {
      const angle = (i * 45) * Math.PI / 180;
      this.illustrationDisplay.lineBetween(
        x + Math.cos(angle) * 10,
        y + Math.sin(angle) * 10,
        x + Math.cos(angle) * 20,
        y + Math.sin(angle) * 20
      );
    }
  }

  private drawBug(x: number, y: number): void {
    // むし（虫）をより詳細に描画
    
    // 頭部
    this.illustrationDisplay.fillStyle(0x228B22); // 緑色
    this.illustrationDisplay.fillCircle(x, y - 15, 8);
    
    // 胸部
    this.illustrationDisplay.fillEllipse(x, y - 3, 12, 10);
    
    // 腹部
    this.illustrationDisplay.fillEllipse(x, y + 10, 16, 18);
    
    // 羽（透明感のある羽）
    this.illustrationDisplay.fillStyle(0xF0F8FF); // アリスブルー
    this.illustrationDisplay.fillEllipse(x - 15, y - 8, 18, 25);
    this.illustrationDisplay.fillEllipse(x + 15, y - 8, 18, 25);
    
    // 翼の紋様
    this.illustrationDisplay.lineStyle(1, 0x696969);
    // 左翼
    this.illustrationDisplay.lineBetween(x - 15, y - 15, x - 15, y + 5);
    this.illustrationDisplay.lineBetween(x - 20, y - 10, x - 10, y - 10);
    this.illustrationDisplay.lineBetween(x - 20, y, x - 10, y);
    // 右翼
    this.illustrationDisplay.lineBetween(x + 15, y - 15, x + 15, y + 5);
    this.illustrationDisplay.lineBetween(x + 20, y - 10, x + 10, y - 10);
    this.illustrationDisplay.lineBetween(x + 20, y, x + 10, y);
    
    // 触角（曲がった触角）
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.lineBetween(x - 3, y - 20, x - 8, y - 28);
    this.illustrationDisplay.lineBetween(x + 3, y - 20, x + 8, y - 28);
    this.illustrationDisplay.fillCircle(x - 8, y - 28, 2);
    this.illustrationDisplay.fillCircle(x + 8, y - 28, 2);
    
    // 脚（6本）
    this.illustrationDisplay.lineStyle(2, 0x000000);
    // 前脚
    this.illustrationDisplay.lineBetween(x - 6, y - 8, x - 12, y - 2);
    this.illustrationDisplay.lineBetween(x + 6, y - 8, x + 12, y - 2);
    // 中脚
    this.illustrationDisplay.lineBetween(x - 6, y, x - 15, y + 8);
    this.illustrationDisplay.lineBetween(x + 6, y, x + 15, y + 8);
    // 後脚
    this.illustrationDisplay.lineBetween(x - 8, y + 8, x - 14, y + 18);
    this.illustrationDisplay.lineBetween(x + 8, y + 8, x + 14, y + 18);
    
    // 目
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 3, y - 17, 2);
    this.illustrationDisplay.fillCircle(x + 3, y - 17, 2);
    
    // 体の模様（横縞）
    this.illustrationDisplay.fillStyle(0x006400); // 深緑
    this.illustrationDisplay.fillEllipse(x, y + 5, 12, 3);
    this.illustrationDisplay.fillEllipse(x, y + 12, 14, 3);
  }

  private drawGlasses(x: number, y: number): void {
    this.illustrationDisplay.lineStyle(3, 0x000000);
    // レンズ
    this.illustrationDisplay.strokeCircle(x - 15, y, 12);
    this.illustrationDisplay.strokeCircle(x + 15, y, 12);
    // ブリッジ
    this.illustrationDisplay.lineBetween(x - 3, y, x + 3, y);
    // つる
    this.illustrationDisplay.lineBetween(x - 27, y, x - 35, y - 5);
    this.illustrationDisplay.lineBetween(x + 27, y, x + 35, y - 5);
  }

  private drawPeach(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFB6C1);
    this.illustrationDisplay.fillCircle(x, y, 22);
    // 桃の割れ目
    this.illustrationDisplay.lineStyle(2, 0xFF69B4);
    this.illustrationDisplay.lineBetween(x, y - 22, x, y + 22);
    // 葉
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x - 5, y - 20, 8, 12);
  }

  private drawMountain(x: number, y: number): void {
    // やま（山）をより雄大に詳細に描画
    
    // 山の影（奥行き）
    this.illustrationDisplay.fillStyle(0x696969); // 暗い灰色
    this.illustrationDisplay.fillTriangle(x + 10, y - 20, x - 25, y + 20, x + 45, y + 20);
    
    // メインの山
    this.illustrationDisplay.fillStyle(0x8B7355); // 茶色
    this.illustrationDisplay.fillTriangle(x, y - 30, x - 40, y + 20, x + 40, y + 20);
    
    // 山の種類の異なる層
    this.illustrationDisplay.fillStyle(0x9ACD32); // 黄緑色
    this.illustrationDisplay.fillTriangle(x, y - 30, x - 35, y + 5, x + 35, y + 5);
    
    // 雪峰（白い雪）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillTriangle(x, y - 30, x - 18, y - 8, x + 18, y - 8);
    
    // 雪の陰影
    this.illustrationDisplay.fillStyle(0xE6E6FA); // ラベンダー
    this.illustrationDisplay.fillTriangle(x, y - 30, x + 5, y - 15, x + 18, y - 8);
    
    // 木々（山の麓部分）
    this.illustrationDisplay.fillStyle(0x228B22); // 緑色
    for (let i = 0; i < 8; i++) {
      const treeX = x - 30 + i * 8;
      const treeY = y + 10 + Math.random() * 5;
      this.illustrationDisplay.fillTriangle(treeX, treeY - 8, treeX - 3, treeY + 2, treeX + 3, treeY + 2);
    }
    
    // 山道（曲がった道）
    this.illustrationDisplay.lineStyle(3, 0x8B4513);
    this.illustrationDisplay.lineBetween(x - 35, y + 18, x - 10, y + 5);
    this.illustrationDisplay.lineBetween(x - 10, y + 5, x + 15, y + 8);
    this.illustrationDisplay.lineBetween(x + 15, y + 8, x + 35, y + 15);
    
    // 雲（山の周り）
    this.illustrationDisplay.fillStyle(0xF5F5F5);
    this.illustrationDisplay.fillEllipse(x - 25, y - 15, 12, 8);
    this.illustrationDisplay.fillEllipse(x + 30, y - 18, 10, 6);
  }

  private drawSnow(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    // 雪の結晶
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180;
      this.illustrationDisplay.lineBetween(
        x, y,
        x + Math.cos(angle) * 20,
        y + Math.sin(angle) * 20
      );
    }
    this.illustrationDisplay.fillCircle(x, y, 3);
  }

  private drawNight(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x191970);
    this.illustrationDisplay.fillRect(x - 50, y - 30, 100, 60);
    // 月
    this.illustrationDisplay.fillStyle(0xFFFACD);
    this.illustrationDisplay.fillCircle(x + 20, y - 15, 12);
    // 星
    this.illustrationDisplay.fillStyle(0xFFD700);
    this.illustrationDisplay.fillCircle(x - 20, y - 10, 2);
    this.illustrationDisplay.fillCircle(x - 10, y - 20, 2);
    this.illustrationDisplay.fillCircle(x + 10, y + 5, 2);
  }

  private drawLion(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xDAA520);
    // 顔
    this.illustrationDisplay.fillCircle(x, y, 20);
    // たてがみ
    this.illustrationDisplay.fillStyle(0xB8860B);
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      this.illustrationDisplay.fillCircle(
        x + Math.cos(angle) * 25,
        y + Math.sin(angle) * 25,
        8
      );
    }
    // 目
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 8, y - 5, 2);
    this.illustrationDisplay.fillCircle(x + 8, y - 5, 2);
    // 鼻
    this.illustrationDisplay.fillTriangle(x, y + 3, x - 3, y + 8, x + 3, y + 8);
  }

  private drawApple(x: number, y: number): void {
    // りんご（リンゴ）をより美味しそうに描画
    
    // リンゴの体（ハート型に近い形）
    this.illustrationDisplay.fillStyle(0xFF0000); // 赤色
    this.illustrationDisplay.fillEllipse(x, y + 5, 45, 40);
    this.illustrationDisplay.fillEllipse(x - 8, y - 5, 25, 20);
    this.illustrationDisplay.fillEllipse(x + 8, y - 5, 25, 20);
    
    // ハイライト（光沢）
    this.illustrationDisplay.fillStyle(0xFF6B6B);
    this.illustrationDisplay.fillEllipse(x - 10, y - 8, 15, 12);
    this.illustrationDisplay.fillStyle(0xFFAAAA);
    this.illustrationDisplay.fillEllipse(x - 12, y - 10, 8, 6);
    
    // 茎（茶色）
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillRect(x - 2, y - 25, 4, 15);
    
    // 葉っぱ（緑色）
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x + 8, y - 20, 12, 8);
    
    // 葉脈
    this.illustrationDisplay.lineStyle(1, 0x006400);
    this.illustrationDisplay.lineBetween(x + 5, y - 20, x + 11, y - 20);
    this.illustrationDisplay.lineBetween(x + 8, y - 23, x + 8, y - 17);
    
    // くぼみ（上部のへこみ）
    this.illustrationDisplay.fillStyle(0x8B0000);
    this.illustrationDisplay.fillEllipse(x - 8, y - 12, 8, 4);
    this.illustrationDisplay.fillEllipse(x + 8, y - 12, 8, 4);
  }

  private drawRuby(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xDC143C);
    // ダイヤモンド型
    this.illustrationDisplay.fillPoints([
      x, y - 20,
      x - 15, y,
      x, y + 20,
      x + 15, y
    ], true);
    // 光の反射
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillTriangle(x - 5, y - 10, x + 5, y - 10, x, y);
  }

  private drawLemon(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFFF00);
    this.illustrationDisplay.fillEllipse(x, y, 18, 28);
    // 模様
    this.illustrationDisplay.lineStyle(2, 0xFFD700);
    for (let i = 0; i < 3; i++) {
      this.illustrationDisplay.strokeEllipse(x, y, 15 - i * 3, 25 - i * 4);
    }
  }

  private drawRobot(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xC0C0C0);
    // 頭
    this.illustrationDisplay.fillRect(x - 15, y - 20, 30, 25);
    // 体
    this.illustrationDisplay.fillRect(x - 12, y + 5, 24, 20);
    // 目
    this.illustrationDisplay.fillStyle(0x00FF00);
    this.illustrationDisplay.fillCircle(x - 8, y - 10, 3);
    this.illustrationDisplay.fillCircle(x + 8, y - 10, 3);
    // アンテナ
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.lineBetween(x - 5, y - 20, x - 5, y - 30);
    this.illustrationDisplay.lineBetween(x + 5, y - 20, x + 5, y - 30);
  }

  private drawCrocodile(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    // 体
    this.illustrationDisplay.fillEllipse(x, y, 40, 15);
    // 頭
    this.illustrationDisplay.fillEllipse(x - 25, y - 5, 20, 12);
    // 尻尾
    this.illustrationDisplay.fillTriangle(x + 25, y, x + 40, y - 5, x + 40, y + 5);
    // 目
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 30, y - 8, 2);
    this.illustrationDisplay.fillCircle(x - 25, y - 8, 2);
  }

  private drawBread(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xDEB887);
    this.illustrationDisplay.fillEllipse(x, y, 35, 20);
    // 焼き色
    this.illustrationDisplay.fillStyle(0xD2691E);
    this.illustrationDisplay.fillEllipse(x, y - 5, 30, 10);
  }

  private drawSea(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x4682B4);
    // 海の波
    this.illustrationDisplay.fillRect(x - 50, y, 100, 30);
    this.illustrationDisplay.fillStyle(0x87CEEB);
    for (let i = 0; i < 5; i++) {
      this.illustrationDisplay.fillEllipse(x - 40 + i * 20, y - 5, 15, 8);
    }
  }

  private drawPencil(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFD700);
    // 鉛筆の軸
    this.illustrationDisplay.fillRect(x - 5, y - 30, 10, 60);
    // 先端
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillTriangle(x, y - 35, x - 5, y - 30, x + 5, y - 30);
    // 消しゴム
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillRect(x - 7, y + 25, 14, 10);
  }

  private drawPersimmon(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFF8C00);
    this.illustrationDisplay.fillCircle(x, y, 25);
    // 柿のヘタ
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x, y - 25, 15, 8);
  }

  private drawMushroom(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFF0000);
    // キノコの傘
    this.illustrationDisplay.fillEllipse(x, y - 10, 40, 25);
    // 白い斑点
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 8, y - 15, 4);
    this.illustrationDisplay.fillCircle(x + 10, y - 8, 3);
    this.illustrationDisplay.fillCircle(x - 2, y - 5, 2);
    // 軸
    this.illustrationDisplay.fillStyle(0xF5F5DC);
    this.illustrationDisplay.fillRect(x - 8, y + 2, 16, 25);
  }

  private drawShoes(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x8B4513);
    // 靴
    this.illustrationDisplay.fillEllipse(x, y, 45, 20);
    this.illustrationDisplay.fillRect(x - 15, y - 15, 30, 15);
    // 靴紐
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.lineBetween(x - 10, y - 10, x + 10, y - 10);
  }

  private drawCake(x: number, y: number): void {
    // ケーキ台
    this.illustrationDisplay.fillStyle(0xDEB887);
    this.illustrationDisplay.fillRect(x - 25, y, 50, 20);
    // クリーム
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x - 20, y - 15, 40, 15);
    // イチゴ
    this.illustrationDisplay.fillStyle(0xFF0000);
    this.illustrationDisplay.fillCircle(x, y - 20, 5);
  }

  private drawTop(x: number, y: number): void {
    // こま（独楽）をより詳細に描画
    
    // コマの上部（円形の頭）
    this.illustrationDisplay.fillStyle(0xFF69B4); // ピンク
    this.illustrationDisplay.fillCircle(x, y - 20, 8);
    
    // コマの上部のハイライト
    this.illustrationDisplay.fillStyle(0xFFB6C1);
    this.illustrationDisplay.fillCircle(x - 3, y - 22, 4);
    
    // コマの本体（円錐形）
    this.illustrationDisplay.fillStyle(0xFF1493); // 濃いピンク
    this.illustrationDisplay.fillTriangle(x, y - 12, x - 18, y + 12, x + 18, y + 12);
    
    // コマの本体のハイライト（立体感）
    this.illustrationDisplay.fillStyle(0xFF69B4);
    this.illustrationDisplay.fillTriangle(x, y - 12, x - 15, y + 8, x - 8, y + 8);
    
    // コマの装飾（縞模様）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    for (let i = 0; i < 3; i++) {
      const stripeY = y - 5 + i * 6;
      const stripeWidth = 12 - i * 2;
      this.illustrationDisplay.fillEllipse(x, stripeY, stripeWidth, 3);
    }
    
    // コマの軸（先端）
    this.illustrationDisplay.fillStyle(0x8B4513); // 茶色
    this.illustrationDisplay.fillEllipse(x, y + 15, 6, 3);
    this.illustrationDisplay.fillCircle(x, y + 18, 2);
    
    // コマの回転を表現する動きの線
    this.illustrationDisplay.lineStyle(2, 0xDDDDDD);
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90) * Math.PI / 180;
      const startX = x + Math.cos(angle) * 25;
      const startY = y + Math.sin(angle) * 8;
      const endX = x + Math.cos(angle) * 30;
      const endY = y + Math.sin(angle) * 10;
      this.illustrationDisplay.lineBetween(startX, startY, endX, endY);
    }
    
    // コマの紐（上部に少し見える）
    this.illustrationDisplay.lineStyle(3, 0x654321);
    this.illustrationDisplay.lineBetween(x + 5, y - 25, x + 8, y - 30);
  }

  private drawNewspaper(x: number, y: number): void {
    // しんぶん（新聞）をより詳細に描画
    
    // 新聞の背景（白い紙）
    this.illustrationDisplay.fillStyle(0xF5F5F5);
    this.illustrationDisplay.fillRect(x - 28, y - 25, 56, 50);
    
    // 新聞の影
    this.illustrationDisplay.fillStyle(0xE0E0E0);
    this.illustrationDisplay.fillRect(x - 25, y - 22, 53, 47);
    
    // 新聞の輪郭
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.strokeRect(x - 28, y - 25, 56, 50);
    
    // 見出し（太い線）
    this.illustrationDisplay.lineStyle(4, 0x000000);
    this.illustrationDisplay.lineBetween(x - 24, y - 20, x + 24, y - 20);
    
    // 記事の文字（細い線）
    this.illustrationDisplay.lineStyle(1, 0x333333);
    for (let i = 0; i < 6; i++) {
      this.illustrationDisplay.lineBetween(x - 22, y - 12 + i * 4, x + 22, y - 12 + i * 4);
    }
    
    // 短い文章（段落の終わり）
    this.illustrationDisplay.lineBetween(x - 22, y + 8, x + 10, y + 8);
    this.illustrationDisplay.lineBetween(x - 22, y + 12, x + 15, y + 12);
    
    // 写真エリア（グレーの四角）
    this.illustrationDisplay.fillStyle(0xDDDDDD);
    this.illustrationDisplay.fillRect(x - 20, y - 8, 18, 12);
    this.illustrationDisplay.lineStyle(1, 0x999999);
    this.illustrationDisplay.strokeRect(x - 20, y - 8, 18, 12);
    
    // 写真エリア内の簡単なイメージ（山のシルエット）
    this.illustrationDisplay.fillStyle(0xBBBBBB);
    this.illustrationDisplay.fillTriangle(x - 18, y + 2, x - 12, y - 5, x - 6, y + 2);
    
    // コラム分割線
    this.illustrationDisplay.lineStyle(1, 0x666666);
    this.illustrationDisplay.lineBetween(x, y - 15, x, y + 20);
    
    // 日付エリア
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillRect(x + 15, y - 23, 8, 2);
  }

  private drawWatermelon(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    // スイカの外側
    this.illustrationDisplay.fillCircle(x, y, 30);
    // 縞模様
    this.illustrationDisplay.fillStyle(0x006400);
    for (let i = 0; i < 4; i++) {
      this.illustrationDisplay.fillEllipse(x + Math.sin(i) * 15, y, 8, 60);
    }
  }

  private drawCicada(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x8B4513);
    // 体
    this.illustrationDisplay.fillEllipse(x, y, 15, 35);
    // 羽
    this.illustrationDisplay.fillStyle(0xF0F8FF);
    this.illustrationDisplay.fillEllipse(x - 15, y - 10, 20, 30);
    this.illustrationDisplay.fillEllipse(x + 15, y - 10, 20, 30);
  }

  private drawSky(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x87CEEB);
    this.illustrationDisplay.fillRect(x - 50, y - 30, 100, 60);
    // 雲
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillCircle(x - 20, y - 15, 12);
    this.illustrationDisplay.fillCircle(x - 5, y - 20, 15);
    this.illustrationDisplay.fillCircle(x + 10, y - 15, 12);
  }

  private drawEgg(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFFACD);
    this.illustrationDisplay.fillEllipse(x, y, 25, 35);
    // ハイライト
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillEllipse(x - 8, y - 8, 8, 12);
  }

  private drawMap(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xF5DEB3);
    this.illustrationDisplay.fillRect(x - 30, y - 25, 60, 50);
    // 地図の線
    this.illustrationDisplay.lineStyle(2, 0x8B4513);
    this.illustrationDisplay.lineBetween(x - 20, y - 15, x + 15, y - 5);
    this.illustrationDisplay.lineBetween(x - 10, y, x + 20, y + 10);
    this.illustrationDisplay.lineBetween(x - 25, y + 5, x - 5, y + 15);
  }

  private drawMoon(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFFACD);
    this.illustrationDisplay.fillCircle(x, y, 25);
    // クレーター
    this.illustrationDisplay.fillStyle(0xE6E6FA);
    this.illustrationDisplay.fillCircle(x - 8, y - 8, 5);
    this.illustrationDisplay.fillCircle(x + 10, y + 5, 4);
    this.illustrationDisplay.fillCircle(x - 5, y + 12, 3);
  }

  private drawLetter(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x - 20, y - 25, 40, 50);
    this.illustrationDisplay.lineStyle(2, 0x000000);
    this.illustrationDisplay.strokeRect(x - 20, y - 25, 40, 50);
    // 文字
    this.illustrationDisplay.lineBetween(x - 15, y - 15, x + 15, y - 15);
    this.illustrationDisplay.lineBetween(x - 15, y - 5, x + 15, y - 5);
    this.illustrationDisplay.lineBetween(x - 15, y + 5, x + 15, y + 5);
  }

  private drawPear(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x9ACD32);
    // 梨の形
    this.illustrationDisplay.fillEllipse(x, y + 5, 25, 30);
    this.illustrationDisplay.fillEllipse(x, y - 10, 20, 20);
    // 軸
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillRect(x - 1, y - 20, 2, 8);
  }

  private drawCarrot(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFF8C00);
    // 人参の根
    this.illustrationDisplay.fillTriangle(x, y + 20, x - 12, y - 15, x + 12, y - 15);
    // 葉っぱ
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillEllipse(x - 8, y - 20, 8, 15);
    this.illustrationDisplay.fillEllipse(x, y - 25, 8, 15);
    this.illustrationDisplay.fillEllipse(x + 8, y - 20, 8, 15);
  }

  private drawStuffedAnimal(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xDEB887);
    // クマのぬいぐるみ
    this.illustrationDisplay.fillCircle(x, y, 25);
    // 耳
    this.illustrationDisplay.fillCircle(x - 15, y - 15, 8);
    this.illustrationDisplay.fillCircle(x + 15, y - 15, 8);
    // 目
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 8, y - 5, 3);
    this.illustrationDisplay.fillCircle(x + 8, y - 5, 3);
    // 鼻
    this.illustrationDisplay.fillTriangle(x, y + 5, x - 3, y + 2, x + 3, y + 2);
  }

  private drawSeaweed(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    this.illustrationDisplay.fillRect(x - 15, y - 20, 30, 40);
    // 縞模様
    this.illustrationDisplay.fillStyle(0x006400);
    for (let i = 0; i < 3; i++) {
      this.illustrationDisplay.fillRect(x - 15, y - 15 + i * 10, 30, 3);
    }
  }

  private drawAirplane(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xC0C0C0);
    // 機体
    this.illustrationDisplay.fillEllipse(x, y, 40, 15);
    // 主翼
    this.illustrationDisplay.fillRect(x - 20, y - 5, 40, 10);
    // 尾翼
    this.illustrationDisplay.fillRect(x + 15, y - 8, 10, 16);
  }

  private drawShip(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x8B4513);
    // 船体
    this.illustrationDisplay.fillEllipse(x, y + 10, 50, 20);
    // マスト
    this.illustrationDisplay.fillRect(x - 2, y - 20, 4, 30);
    // 帆
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x + 2, y - 15, 20, 25);
  }

  private drawSnake(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x228B22);
    // 蛇の体（S字）
    for (let i = 0; i < 6; i++) {
      const segmentX = x + Math.sin(i * 0.8) * 15;
      const segmentY = y - 20 + i * 7;
      this.illustrationDisplay.fillCircle(segmentX, segmentY, 8);
    }
  }

  private drawWindow(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x87CEEB);
    this.illustrationDisplay.fillRect(x - 25, y - 20, 50, 40);
    // 窓枠
    this.illustrationDisplay.lineStyle(4, 0x8B4513);
    this.illustrationDisplay.strokeRect(x - 25, y - 20, 50, 40);
    this.illustrationDisplay.lineBetween(x, y - 20, x, y + 20);
    this.illustrationDisplay.lineBetween(x - 25, y, x + 25, y);
  }

  private drawOrange(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFF8C00);
    this.illustrationDisplay.fillCircle(x, y, 20);
    // 模様
    this.illustrationDisplay.lineStyle(2, 0xFF4500);
    for (let i = 0; i < 4; i++) {
      const angle = (i * 45) * Math.PI / 180;
      this.illustrationDisplay.lineBetween(
        x + Math.cos(angle) * 10,
        y + Math.sin(angle) * 10,
        x + Math.cos(angle) * 20,
        y + Math.sin(angle) * 20
      );
    }
  }

  private drawGlasses(x: number, y: number): void {
    this.illustrationDisplay.lineStyle(3, 0x000000);
    // レンズ
    this.illustrationDisplay.strokeCircle(x - 15, y, 12);
    this.illustrationDisplay.strokeCircle(x + 15, y, 12);
    // ブリッジ
    this.illustrationDisplay.lineBetween(x - 3, y, x + 3, y);
    // フレーム
    this.illustrationDisplay.lineBetween(x - 27, y, x - 35, y + 5);
    this.illustrationDisplay.lineBetween(x + 27, y, x + 35, y + 5);
  }

  private drawPeach(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0xFFB6C1);
    this.illustrationDisplay.fillCircle(x, y, 25);
    // 割れ目
    this.illustrationDisplay.lineStyle(2, 0xFF69B4);
    this.illustrationDisplay.lineBetween(x, y - 25, x, y + 25);
    // 軸
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillRect(x - 1, y - 25, 2, 5);
  }

  private drawDefault(x: number, y: number): void {
    this.illustrationDisplay.fillStyle(0x87CEEB);
    this.illustrationDisplay.fillRect(x - 30, y - 20, 60, 40);
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillRect(x - 25, y - 15, 50, 30);
    // デフォルトアイコン（？マーク）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillText('?', x, y);
  }

  // Enhanced detailed illustration methods
  private drawPencilDetailed(x: number, y: number): void {
    // えんぴつ（鉛筆）をより詳細に描画
    
    // 鉛筆の軸（グラデーション風）
    this.illustrationDisplay.fillStyle(0xFFD700); // 黄色
    this.illustrationDisplay.fillRect(x - 6, y - 35, 12, 65);
    
    // 鉛筆の側面のハイライト
    this.illustrationDisplay.fillStyle(0xFFFF99);
    this.illustrationDisplay.fillRect(x - 5, y - 34, 3, 63);
    
    // 木の部分の木目
    this.illustrationDisplay.lineStyle(1, 0xE6E600);
    for (let i = 0; i < 12; i++) {
      this.illustrationDisplay.lineBetween(x - 5, y - 30 + i * 5, x + 5, y - 30 + i * 5);
    }
    
    // 鉛筆の先端（芯の部分）
    this.illustrationDisplay.fillStyle(0x000000); // 黒い芯
    this.illustrationDisplay.fillTriangle(x, y - 40, x - 2, y - 35, x + 2, y - 35);
    
    // 木の先端部分
    this.illustrationDisplay.fillStyle(0xDEB887); // ベージュ
    this.illustrationDisplay.fillTriangle(x, y - 35, x - 6, y - 30, x + 6, y - 30);
    
    // 金具（メタルの部分）
    this.illustrationDisplay.fillStyle(0xC0C0C0); // 銀色
    this.illustrationDisplay.fillRect(x - 7, y + 20, 14, 8);
    
    // 金具の詳細
    this.illustrationDisplay.lineStyle(1, 0x808080);
    this.illustrationDisplay.lineBetween(x - 6, y + 22, x + 6, y + 22);
    this.illustrationDisplay.lineBetween(x - 6, y + 26, x + 6, y + 26);
    
    // 消しゴム
    this.illustrationDisplay.fillStyle(0xFF69B4); // ピンク
    this.illustrationDisplay.fillRect(x - 6, y + 28, 12, 10);
    
    // 消しゴムのハイライト
    this.illustrationDisplay.fillStyle(0xFFB6C1);
    this.illustrationDisplay.fillRect(x - 5, y + 29, 4, 8);
    
    // ブランドロゴっぽい線
    this.illustrationDisplay.lineStyle(1, 0xE6E600);
    this.illustrationDisplay.lineBetween(x - 4, y, x + 4, y);
    this.illustrationDisplay.lineBetween(x - 3, y + 5, x + 3, y + 5);
  }

  private drawPersimmonDetailed(x: number, y: number): void {
    // かき（柿）をより美味しそうに詳細に描画
    
    // 柿の実の影（立体感）
    this.illustrationDisplay.fillStyle(0xD2691E); // 暗いオレンジ
    this.illustrationDisplay.fillCircle(x + 3, y + 3, 25);
    
    // 柿の実のメイン部分
    this.illustrationDisplay.fillStyle(0xFF8C00); // オレンジ
    this.illustrationDisplay.fillCircle(x, y, 25);
    
    // 柿の表面のハイライト
    this.illustrationDisplay.fillStyle(0xFFA500);
    this.illustrationDisplay.fillEllipse(x - 8, y - 8, 15, 12);
    
    // 最も明るいハイライト
    this.illustrationDisplay.fillStyle(0xFFD700);
    this.illustrationDisplay.fillEllipse(x - 10, y - 10, 8, 6);
    
    // 柿の縦の溝（特徴的な形）
    this.illustrationDisplay.lineStyle(2, 0xD2691E);
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180;
      const startX = x + Math.cos(angle) * 12;
      const startY = y + Math.sin(angle) * 12;
      const endX = x + Math.cos(angle) * 22;
      const endY = y + Math.sin(angle) * 22;
      this.illustrationDisplay.lineBetween(startX, startY, endX, endY);
    }
    
    // ヘタ（上の緑の部分）の影
    this.illustrationDisplay.fillStyle(0x006400); // 深緑
    this.illustrationDisplay.fillEllipse(x + 1, y - 23, 18, 10);
    
    // ヘタのメイン部分
    this.illustrationDisplay.fillStyle(0x228B22); // 緑
    this.illustrationDisplay.fillEllipse(x, y - 25, 18, 10);
    
    // ヘタの葉っぱの詳細
    this.illustrationDisplay.fillStyle(0x32CD32); // より明るい緑
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 + 45) * Math.PI / 180;
      const leafX = x + Math.cos(angle) * 8;
      const leafY = y - 25 + Math.sin(angle) * 4;
      this.illustrationDisplay.fillEllipse(leafX, leafY, 6, 8);
    }
    
    // ヘタの中央
    this.illustrationDisplay.fillStyle(0x654321); // 茶色（茎）
    this.illustrationDisplay.fillCircle(x, y - 25, 3);
    
    // 柿の質感（小さな点）
    this.illustrationDisplay.fillStyle(0xCD853F);
    this.illustrationDisplay.fillCircle(x + 8, y + 5, 1);
    this.illustrationDisplay.fillCircle(x - 5, y + 8, 1);
    this.illustrationDisplay.fillCircle(x + 3, y - 5, 1);
  }

  private drawMushroomDetailed(x: number, y: number): void {
    // きのこ（茸）をより詳細に可愛く描画
    
    // きのこの軸の影（立体感）
    this.illustrationDisplay.fillStyle(0xE6E6FA); // 薄紫
    this.illustrationDisplay.fillRect(x - 7, y + 2, 16, 28);
    
    // きのこの軸
    this.illustrationDisplay.fillStyle(0xF5F5DC); // ベージュ
    this.illustrationDisplay.fillRect(x - 8, y, 16, 30);
    
    // 軸のハイライト
    this.illustrationDisplay.fillStyle(0xFFFFF0);
    this.illustrationDisplay.fillRect(x - 6, y + 2, 4, 26);
    
    // 軸の質感（縦の線）
    this.illustrationDisplay.lineStyle(1, 0xE0E0E0);
    for (let i = 0; i < 3; i++) {
      this.illustrationDisplay.lineBetween(x - 4 + i * 4, y + 2, x - 4 + i * 4, y + 28);
    }
    
    // きのこの傘の影
    this.illustrationDisplay.fillStyle(0xDC143C); // 深い赤
    this.illustrationDisplay.fillEllipse(x + 2, y - 8, 42, 22);
    
    // きのこの傘
    this.illustrationDisplay.fillStyle(0xFF0000); // 赤
    this.illustrationDisplay.fillEllipse(x, y - 10, 42, 22);
    
    // 傘のハイライト（光沢）
    this.illustrationDisplay.fillStyle(0xFF6B6B);
    this.illustrationDisplay.fillEllipse(x - 10, y - 15, 20, 12);
    
    // より明るいハイライト
    this.illustrationDisplay.fillStyle(0xFFA0A0);
    this.illustrationDisplay.fillEllipse(x - 12, y - 17, 12, 8);
    
    // 白い水玉模様（大小様々）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    // 大きな斑点
    this.illustrationDisplay.fillCircle(x - 8, y - 12, 5);
    this.illustrationDisplay.fillCircle(x + 12, y - 8, 4);
    this.illustrationDisplay.fillCircle(x - 2, y - 5, 3);
    // 中くらいの斑点
    this.illustrationDisplay.fillCircle(x + 5, y - 15, 3);
    this.illustrationDisplay.fillCircle(x - 15, y - 5, 2.5);
    // 小さな斑点
    this.illustrationDisplay.fillCircle(x + 15, y - 12, 2);
    this.illustrationDisplay.fillCircle(x - 5, y - 18, 1.5);
    this.illustrationDisplay.fillCircle(x + 8, y - 3, 2);
    
    // 傘の縁の丸み
    this.illustrationDisplay.lineStyle(2, 0xCC0000);
    this.illustrationDisplay.strokeEllipse(x, y - 10, 42, 22);
    
    // 軸と傘の接続部分
    this.illustrationDisplay.fillStyle(0xF0F0F0);
    this.illustrationDisplay.fillEllipse(x, y + 1, 16, 6);
  }

  private drawShoesDetailed(x: number, y: number): void {
    // くつ（靴）をより詳細に可愛く描画
    
    // 靴の影（地面）
    this.illustrationDisplay.fillStyle(0x696969); // 暗いグレー
    this.illustrationDisplay.fillEllipse(x + 2, y + 18, 50, 8);
    
    // 靴底
    this.illustrationDisplay.fillStyle(0x2F4F4F); // 暗いスレートグレー
    this.illustrationDisplay.fillEllipse(x, y + 12, 48, 12);
    
    // 靴のメイン部分（つま先）
    this.illustrationDisplay.fillStyle(0x8B4513); // 茶色
    this.illustrationDisplay.fillEllipse(x, y, 45, 20);
    
    // 靴の上部
    this.illustrationDisplay.fillRect(x - 18, y - 18, 36, 18);
    
    // 靴のハイライト（光沢）
    this.illustrationDisplay.fillStyle(0xA0522D);
    this.illustrationDisplay.fillEllipse(x - 8, y - 5, 20, 10);
    this.illustrationDisplay.fillRect(x - 15, y - 15, 15, 12);
    
    // より明るいハイライト
    this.illustrationDisplay.fillStyle(0xCD853F);
    this.illustrationDisplay.fillEllipse(x - 12, y - 8, 12, 6);
    this.illustrationDisplay.fillRect(x - 12, y - 18, 8, 8);
    
    // 靴紐の穴（ハトメ）
    this.illustrationDisplay.fillStyle(0x000000);
    for (let i = 0; i < 4; i++) {
      const holeX = x - 9 + i * 6;
      this.illustrationDisplay.fillCircle(holeX, y - 10, 2);
      this.illustrationDisplay.fillCircle(holeX, y - 16, 2);
    }
    
    // 靴紐（ジグザグ）
    this.illustrationDisplay.lineStyle(3, 0xFFFFFF); // 白い靴紐
    // 左側の靴紐
    this.illustrationDisplay.lineBetween(x - 9, y - 10, x - 3, y - 16);
    this.illustrationDisplay.lineBetween(x - 3, y - 10, x + 3, y - 16);
    this.illustrationDisplay.lineBetween(x + 3, y - 10, x + 9, y - 16);
    // 右側の靴紐
    this.illustrationDisplay.lineBetween(x - 3, y - 16, x + 3, y - 10);
    this.illustrationDisplay.lineBetween(x + 3, y - 16, x + 9, y - 10);
    
    // 靴紐の結び目（蝶々結び）
    this.illustrationDisplay.fillStyle(0xF0F0F0);
    this.illustrationDisplay.fillEllipse(x, y - 20, 8, 4);
    this.illustrationDisplay.fillEllipse(x - 6, y - 22, 5, 6);
    this.illustrationDisplay.fillEllipse(x + 6, y - 22, 5, 6);
    
    // つま先の縫い目
    this.illustrationDisplay.lineStyle(1, 0x654321);
    this.illustrationDisplay.strokeEllipse(x, y, 42, 17);
    
    // かかとの縫い目
    this.illustrationDisplay.lineBetween(x + 18, y - 15, x + 18, y + 5);
  }

  private drawCakeDetailed(x: number, y: number): void {
    // けーき（ケーキ）をより美味しそうに詳細に描画
    
    // ケーキの皿（影）
    this.illustrationDisplay.fillStyle(0xD3D3D3); // ライトグレー
    this.illustrationDisplay.fillEllipse(x + 2, y + 22, 58, 8);
    
    // ケーキの皿
    this.illustrationDisplay.fillStyle(0xFFFFFF); // 白
    this.illustrationDisplay.fillEllipse(x, y + 20, 58, 8);
    this.illustrationDisplay.lineStyle(2, 0xC0C0C0);
    this.illustrationDisplay.strokeEllipse(x, y + 20, 58, 8);
    
    // ケーキの土台（スポンジ層）
    this.illustrationDisplay.fillStyle(0xDEB887); // 小麦色
    this.illustrationDisplay.fillRect(x - 28, y - 2, 56, 22);
    
    // スポンジの側面のテクスチャ
    this.illustrationDisplay.fillStyle(0xD2B48C);
    for (let i = 0; i < 8; i++) {
      this.illustrationDisplay.fillRect(x - 26 + i * 7, y, 3, 20);
    }
    
    // 中間のクリーム層
    this.illustrationDisplay.fillStyle(0xFFF8DC); // コーンシルク
    this.illustrationDisplay.fillRect(x - 25, y - 5, 50, 3);
    
    // 上のクリーム層
    this.illustrationDisplay.fillStyle(0xFFFFFF); // 白いクリーム
    this.illustrationDisplay.fillRect(x - 25, y - 18, 50, 16);
    
    // クリームのテクスチャ（絞り模様）
    this.illustrationDisplay.fillStyle(0xFFF5EE);
    for (let i = 0; i < 6; i++) {
      const waveX = x - 20 + i * 8;
      this.illustrationDisplay.fillEllipse(waveX, y - 15, 4, 6);
      this.illustrationDisplay.fillEllipse(waveX, y - 8, 4, 5);
    }
    
    // 上部のクリームの盛り上がり
    this.illustrationDisplay.fillStyle(0xFFFFF0);
    this.illustrationDisplay.fillEllipse(x, y - 20, 30, 8);
    
    // イチゴ（大きなもの）
    this.illustrationDisplay.fillStyle(0xFF0000); // 赤
    this.illustrationDisplay.fillEllipse(x, y - 25, 10, 12);
    
    // イチゴのヘタ
    this.illustrationDisplay.fillStyle(0x228B22); // 緑
    this.illustrationDisplay.fillEllipse(x, y - 30, 8, 4);
    
    // イチゴの種（黒い点）
    this.illustrationDisplay.fillStyle(0x000000);
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const dotX = x + Math.cos(angle) * 3;
      const dotY = y - 25 + Math.sin(angle) * 4;
      this.illustrationDisplay.fillCircle(dotX, dotY, 0.5);
    }
    
    // 小さなイチゴの装飾
    this.illustrationDisplay.fillStyle(0xFF6347); // トマト色
    this.illustrationDisplay.fillEllipse(x - 18, y - 15, 6, 7);
    this.illustrationDisplay.fillEllipse(x + 18, y - 12, 6, 7);
    
    // 小さなイチゴのヘタ
    this.illustrationDisplay.fillStyle(0x32CD32);
    this.illustrationDisplay.fillEllipse(x - 18, y - 18, 4, 2);
    this.illustrationDisplay.fillEllipse(x + 18, y - 15, 4, 2);
    
    // ろうそく
    this.illustrationDisplay.fillStyle(0xFFE4B5); // モカシン
    this.illustrationDisplay.fillRect(x - 2, y - 35, 4, 10);
    
    // ろうそくの炎
    this.illustrationDisplay.fillStyle(0xFFD700); // 金色
    this.illustrationDisplay.fillEllipse(x, y - 38, 3, 6);
    this.illustrationDisplay.fillStyle(0xFF4500); // オレンジ
    this.illustrationDisplay.fillEllipse(x, y - 36, 2, 4);
  }

  // Level selection methods
  private showLevelSelection(): void {
    this.showingLevelSelect = true;
    
    // 行選択の説明
    const instruction = this.add.text(
      this.cameras.main.centerX,
      120,
      'どの行でちょうせんしますか？',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#1e40af',
        padding: { x: 15, y: 8 }
      }
    );
    instruction.setOrigin(0.5);

    // 行選択ボタンを作成
    this.createRowButtons();
  }

  private createRowButtons(): void {
    const rowData = [
      { row: 'a', text: 'あ行\n(あいうえお)', color: 0xFF69B4, wordCount: 5 },
      { row: 'ka', text: 'か行\n(かきくけこ)', color: 0x32CD32, wordCount: 5 },
      { row: 'sa', text: 'さ行\n(さしすせそ)', color: 0x1E90FF, wordCount: 5 },
      { row: 'ta', text: 'た行\n(たちつてと)', color: 0xFF8C00, wordCount: 5 },
      { row: 'na', text: 'な行\n(なにぬねの)', color: 0x9370DB, wordCount: 5 },
      { row: 'ha', text: 'は行\n(はひふへほ)', color: 0xFF1493, wordCount: 5 },
      { row: 'ma', text: 'ま行\n(まみむめも)', color: 0x00CED1, wordCount: 5 },
      { row: 'ya', text: 'や行\n(やゆよ)', color: 0xFFD700, wordCount: 3 },
      { row: 'ra', text: 'ら行\n(らりるれろ)', color: 0x98FB98, wordCount: 5 },
      { row: 'wa', text: 'わ行\n(わん)', color: 0xF0E68C, wordCount: 2 },
      { row: 'all', text: 'ぜんぶ\n(あ〜ん)', color: 0xFF4500, wordCount: 46 }
    ];

    // 行ボタンを配置（1〜3行目は4個ずつ、4行目は「ぜんぶ」ボタンのみ中央）
    const buttonsPerRow = 4;
    const buttonWidth = 140;
    const buttonSpacing = 10;
    const startY = 200;
    const rowSpacing = 100;

    rowData.forEach((data, index) => {
      let x: number;
      let y: number;
      
      if (index < 10) {
        // 最初の10個（あ行〜わ行）は3行に配置
        const row = Math.floor(index / buttonsPerRow);
        const col = index % buttonsPerRow;
        
        // 3行目は2個のみなので中央寄せ
        if (row === 2) {
          const twoButtonsWidth = 2 * buttonWidth + buttonSpacing;
          const startX = this.cameras.main.centerX - twoButtonsWidth / 2 + buttonWidth / 2;
          x = startX + col * (buttonWidth + buttonSpacing);
        } else {
          const startX = this.cameras.main.centerX - (buttonsPerRow * buttonWidth + (buttonsPerRow - 1) * buttonSpacing) / 2 + buttonWidth / 2;
          x = startX + col * (buttonWidth + buttonSpacing);
        }
        
        y = startY + row * rowSpacing;
      } else {
        // 「ぜんぶ」ボタンは4行目の中央に配置
        x = this.cameras.main.centerX;
        y = startY + 3 * rowSpacing;
      }
      
      const button = this.createRowButton(data.row, data.text, x, y, data.color, data.wordCount, index);
      this.levelButtons.push(button);
    });
  }

  private createRowButton(
    row: string,
    text: string,
    x: number,
    y: number,
    color: number,
    wordCount: number,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // ボタン背景
    const background = this.add.graphics();
    background.fillStyle(color);
    background.fillRoundedRect(-65, -35, 130, 70, 15);
    background.lineStyle(4, 0xffffff);
    background.strokeRoundedRect(-65, -35, 130, 70, 15);
    
    // ボタンテキスト
    const buttonText = this.add.text(0, -10, text, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    });
    buttonText.setOrigin(0.5);
    
    // 問題数表示
    const countText = this.add.text(0, 15, `${wordCount}問`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1
    });
    countText.setOrigin(0.5);
    
    container.add([background, buttonText, countText]);
    
    // インタラクション
    background.setInteractive(
      new Phaser.Geom.Rectangle(-65, -35, 130, 70),
      Phaser.Geom.Rectangle.Contains
    );
    
    background.on('pointerdown', () => {
      // 回答処理中は無視
      if (this.isProcessingAnswer) return;
      this.selectRow(row);
    });

    background.on('pointerover', () => {
      container.setScale(1.05);
    });

    background.on('pointerout', () => {
      container.setScale(1.0);
    });

    // 入場アニメーション
    container.setAlpha(0);
    container.setScale(0.7);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      delay: index * 80,
      ease: 'Back.easeOut'
    });

    return container;
  }

  private selectRow(row: string): void {
    this.selectedLevel = row;
    this.showingLevelSelect = false;
    
    // 行選択ボタンを明示的に削除
    this.levelButtons.forEach(button => button.destroy());
    this.levelButtons = [];
    
    // 行選択画面を削除
    this.children.removeAll();
    
    // ゲーム画面を構築
    this.createBackground();
    this.createHeader();
    this.initializeGameState();
    this.createWordDisplay();
    this.createOptionButtons();
    this.createBackButton();
  }

  // 鬼のイラスト描画メソッド
  private drawOni(x: number, y: number): void {
    // おに（鬼）をより詳細に描画
    
    // 鬼の顔（赤い色）
    this.illustrationDisplay.fillStyle(0xFF4500); // 赤色
    this.illustrationDisplay.fillEllipse(x, y, 40, 45);
    
    // 顔の影（立体感）
    this.illustrationDisplay.fillStyle(0xDC143C);
    this.illustrationDisplay.fillEllipse(x + 3, y + 3, 37, 42);
    
    // 角（2本）
    this.illustrationDisplay.fillStyle(0xFFD700); // 金色
    this.illustrationDisplay.fillTriangle(x - 12, y - 22, x - 8, y - 35, x - 4, y - 22);
    this.illustrationDisplay.fillTriangle(x + 4, y - 22, x + 8, y - 35, x + 12, y - 22);
    
    // 角の輪郭
    this.illustrationDisplay.lineStyle(2, 0xDAA520);
    this.illustrationDisplay.strokeTriangle(x - 12, y - 22, x - 8, y - 35, x - 4, y - 22);
    this.illustrationDisplay.strokeTriangle(x + 4, y - 22, x + 8, y - 35, x + 12, y - 22);
    
    // 眉毛（怒った表情）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillTriangle(x - 18, y - 12, x - 8, y - 8, x - 15, y - 5);
    this.illustrationDisplay.fillTriangle(x + 15, y - 5, x + 8, y - 8, x + 18, y - 12);
    
    // 目（怒った目）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillEllipse(x - 10, y - 5, 8, 6);
    this.illustrationDisplay.fillEllipse(x + 10, y - 5, 8, 6);
    
    // 瞳
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 8, y - 3, 3);
    this.illustrationDisplay.fillCircle(x + 12, y - 3, 3);
    
    // 鼻（大きな鼻）
    this.illustrationDisplay.fillStyle(0xFF6347);
    this.illustrationDisplay.fillEllipse(x, y + 5, 6, 8);
    
    // 鼻の穴
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillCircle(x - 2, y + 7, 1);
    this.illustrationDisplay.fillCircle(x + 2, y + 7, 1);
    
    // 口（大きく開いた口）
    this.illustrationDisplay.fillStyle(0x000000);
    this.illustrationDisplay.fillEllipse(x, y + 15, 16, 10);
    
    // 口の中（赤い色）
    this.illustrationDisplay.fillStyle(0x8B0000);
    this.illustrationDisplay.fillEllipse(x, y + 16, 12, 7);
    
    // 牙（2本）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillTriangle(x - 6, y + 12, x - 4, y + 20, x - 2, y + 12);
    this.illustrationDisplay.fillTriangle(x + 2, y + 12, x + 4, y + 20, x + 6, y + 12);
    
    // 髪の毛（もじゃもじゃ）
    this.illustrationDisplay.fillStyle(0x2F4F4F);
    for (let i = 0; i < 8; i++) {
      const hairX = x - 15 + i * 4;
      const hairY = y - 20 + Math.random() * 6;
      this.illustrationDisplay.fillCircle(hairX, hairY, 3);
    }
    
    // 顔の輪郭線
    this.illustrationDisplay.lineStyle(2, 0x8B0000);
    this.illustrationDisplay.strokeEllipse(x, y, 40, 45);
  }

  // 箸のイラスト描画メソッド
  private drawChopsticks(x: number, y: number): void {
    // はし（箸）をより詳細に描画
    
    // 箸の背景（お皿）
    this.illustrationDisplay.fillStyle(0xF5F5DC);
    this.illustrationDisplay.fillEllipse(x, y + 15, 50, 20);
    this.illustrationDisplay.lineStyle(2, 0xDDD);
    this.illustrationDisplay.strokeEllipse(x, y + 15, 50, 20);
    
    // 箸1本目（少し斜め）
    this.illustrationDisplay.fillStyle(0xD2691E); // 茶色
    this.illustrationDisplay.fillRect(x - 8, y - 30, 4, 50);
    
    // 箸2本目（少し離して配置）
    this.illustrationDisplay.fillRect(x + 4, y - 30, 4, 50);
    
    // 箸の先端（細く）
    this.illustrationDisplay.fillTriangle(x - 6, y - 30, x - 8, y - 25, x - 4, y - 25);
    this.illustrationDisplay.fillTriangle(x + 6, y - 30, x + 4, y - 25, x + 8, y - 25);
    
    // 箸の木目（質感）
    this.illustrationDisplay.lineStyle(1, 0xA0522D);
    for (let i = 0; i < 8; i++) {
      this.illustrationDisplay.lineBetween(x - 8, y - 25 + i * 6, x - 4, y - 25 + i * 6);
      this.illustrationDisplay.lineBetween(x + 4, y - 25 + i * 6, x + 8, y - 25 + i * 6);
    }
    
    // 箸で掴んでいる食べ物（おにぎり）
    this.illustrationDisplay.fillStyle(0xFFFFFF);
    this.illustrationDisplay.fillTriangle(x, y - 15, x - 8, y - 5, x + 8, y - 5);
    
    // のり（海苔）
    this.illustrationDisplay.fillStyle(0x2F4F4F);
    this.illustrationDisplay.fillRect(x - 6, y - 8, 12, 3);
    
    // 米粒の質感
    this.illustrationDisplay.fillStyle(0xF8F8FF);
    for (let i = 0; i < 6; i++) {
      const riceX = x - 4 + (i % 3) * 3;
      const riceY = y - 12 + Math.floor(i / 3) * 3;
      this.illustrationDisplay.fillCircle(riceX, riceY, 1);
    }
    
    // 箸置き
    this.illustrationDisplay.fillStyle(0x8B4513);
    this.illustrationDisplay.fillRect(x - 15, y + 25, 30, 4);
    this.illustrationDisplay.lineStyle(1, 0x654321);
    this.illustrationDisplay.strokeRect(x - 15, y + 25, 30, 4);
  }
}