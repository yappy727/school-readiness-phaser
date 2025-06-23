export class AudioManager {
  private audioContext: AudioContext | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGainNode: GainNode | null = null;
  private isPlaying = false;
  private volume = 0.7; // 固定音量（PC/スマホの本体音量で調整）

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('Web Audio API not supported:', error);
    }
  }

  // 音量調整機能を削除（固定音量システム）

  public startBGM(): void {
    if (!this.audioContext || this.isPlaying) {
      console.log('BGM already playing or audio context not available');
      return;
    }

    console.log('Starting BGM...');
    this.isPlaying = true;
    this.playEducationalBGM();
  }

  public stopBGM(): void {
    if (!this.audioContext) return;

    console.log('Stopping BGM...');
    this.isPlaying = false;

    // 全てのオシレーターを停止
    this.bgmOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    this.bgmOscillators = [];

    // BGMゲインノードをリセット
    if (this.bgmGainNode) {
      try {
        this.bgmGainNode.disconnect();
      } catch (e) {
        // Node might already be disconnected
      }
      this.bgmGainNode = null;
    }
  }

  private playEducationalBGM(): void {
    if (!this.audioContext) return;

    // 既存のBGMゲインノードがある場合は再利用せずにクリア
    if (this.bgmGainNode) {
      try {
        this.bgmGainNode.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }

    // メインゲインノード作成
    this.bgmGainNode = this.audioContext.createGain();
    this.bgmGainNode.connect(this.audioContext.destination);
    
    // 固定音量設定（BGMをさらに小さく）
    this.bgmGainNode.gain.setValueAtTime(this.volume * 0.05, this.audioContext.currentTime);

    // ポップでゲームらしい明るいメロディー（テトリス風）
    const melody = [
      { note: 659, duration: 0.4 }, // E
      { note: 587, duration: 0.2 }, // D
      { note: 523, duration: 0.4 }, // C
      { note: 587, duration: 0.4 }, // D
      { note: 659, duration: 0.4 }, // E
      { note: 698, duration: 0.4 }, // F
      { note: 784, duration: 0.8 }, // G
      
      { note: 523, duration: 0.4 }, // C
      { note: 659, duration: 0.4 }, // E
      { note: 784, duration: 0.4 }, // G
      { note: 880, duration: 0.4 }, // A
      { note: 784, duration: 0.4 }, // G
      { note: 698, duration: 0.4 }, // F
      { note: 659, duration: 0.8 }, // E
      
      { note: 784, duration: 0.4 }, // G
      { note: 698, duration: 0.2 }, // F
      { note: 659, duration: 0.4 }, // E
      { note: 587, duration: 0.4 }, // D
      { note: 523, duration: 0.4 }, // C
      { note: 587, duration: 0.4 }, // D
      { note: 659, duration: 0.8 }, // E
      
      { note: 659, duration: 0.4 }, // E
      { note: 784, duration: 0.4 }, // G
      { note: 880, duration: 0.4 }, // A
      { note: 1047, duration: 0.4 }, // C5
      { note: 880, duration: 0.4 }, // A
      { note: 784, duration: 0.4 }, // G
      { note: 659, duration: 0.8 }, // E
    ];

    this.playMelodyLoop(melody);
  }

  private playMelodyLoop(melody: Array<{note: number, duration: number}>): void {
    if (!this.audioContext || !this.isPlaying) return;

    let currentTime = this.audioContext.currentTime;
    const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);

    // ベースライン（4つ打ち）
    const bassNotes = [262, 196, 220, 196]; // C, G, A, G (低音)
    for (let i = 0; i < Math.ceil(totalDuration * 2); i++) {
      const bassOsc = this.audioContext.createOscillator();
      const bassGain = this.audioContext.createGain();
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGainNode!);
      
      bassOsc.frequency.setValueAtTime(bassNotes[i % bassNotes.length], currentTime + i * 0.5);
      bassOsc.type = 'sawtooth';
      
      bassGain.gain.setValueAtTime(0, currentTime + i * 0.5);
      bassGain.gain.linearRampToValueAtTime(0.08, currentTime + i * 0.5 + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.01, currentTime + i * 0.5 + 0.4);
      
      bassOsc.start(currentTime + i * 0.5);
      bassOsc.stop(currentTime + i * 0.5 + 0.4);
      
      this.bgmOscillators.push(bassOsc);
    }

    // ドラムビート（キック＆ハイハット風）
    for (let i = 0; i < Math.ceil(totalDuration * 4); i++) {
      // キック（低音ノイズ）
      if (i % 4 === 0 || i % 4 === 2) {
        const kickOsc = this.audioContext.createOscillator();
        const kickGain = this.audioContext.createGain();
        
        kickOsc.connect(kickGain);
        kickGain.connect(this.bgmGainNode!);
        
        kickOsc.frequency.setValueAtTime(60, currentTime + i * 0.25);
        kickOsc.type = 'sine';
        
        kickGain.gain.setValueAtTime(0, currentTime + i * 0.25);
        kickGain.gain.linearRampToValueAtTime(0.06, currentTime + i * 0.25 + 0.01);
        kickGain.gain.exponentialRampToValueAtTime(0.01, currentTime + i * 0.25 + 0.2);
        
        kickOsc.start(currentTime + i * 0.25);
        kickOsc.stop(currentTime + i * 0.25 + 0.2);
        
        this.bgmOscillators.push(kickOsc);
      }
      
      // ハイハット（高音ノイズ）
      if (i % 2 === 1) {
        const hihatOsc = this.audioContext.createOscillator();
        const hihatGain = this.audioContext.createGain();
        
        hihatOsc.connect(hihatGain);
        hihatGain.connect(this.bgmGainNode!);
        
        hihatOsc.frequency.setValueAtTime(8000, currentTime + i * 0.25);
        hihatOsc.type = 'square';
        
        hihatGain.gain.setValueAtTime(0, currentTime + i * 0.25);
        hihatGain.gain.linearRampToValueAtTime(0.02, currentTime + i * 0.25 + 0.01);
        hihatGain.gain.exponentialRampToValueAtTime(0.01, currentTime + i * 0.25 + 0.1);
        
        hihatOsc.start(currentTime + i * 0.25);
        hihatOsc.stop(currentTime + i * 0.25 + 0.1);
        
        this.bgmOscillators.push(hihatOsc);
      }
    }

    melody.forEach((note, index) => {
      // メロディー音（より明るいサウンド）
      const melodyOsc = this.audioContext!.createOscillator();
      const melodyGain = this.audioContext!.createGain();
      
      melodyOsc.connect(melodyGain);
      melodyGain.connect(this.bgmGainNode!);
      
      melodyOsc.frequency.setValueAtTime(note.note, currentTime);
      melodyOsc.type = 'square'; // よりポップなサウンド
      
      melodyGain.gain.setValueAtTime(0, currentTime);
      melodyGain.gain.linearRampToValueAtTime(0.12, currentTime + 0.05);
      melodyGain.gain.linearRampToValueAtTime(0, currentTime + note.duration - 0.05);
      
      melodyOsc.start(currentTime);
      melodyOsc.stop(currentTime + note.duration);
      
      this.bgmOscillators.push(melodyOsc);
      
      // アルペジオハーモニー
      if (index % 3 === 0) {
        const arpOsc = this.audioContext!.createOscillator();
        const arpGain = this.audioContext!.createGain();
        
        arpOsc.connect(arpGain);
        arpGain.connect(this.bgmGainNode!);
        
        arpOsc.frequency.setValueAtTime(note.note * 1.5, currentTime);
        arpOsc.type = 'triangle';
        
        arpGain.gain.setValueAtTime(0, currentTime);
        arpGain.gain.linearRampToValueAtTime(0.04, currentTime + 0.05);
        arpGain.gain.linearRampToValueAtTime(0, currentTime + note.duration - 0.05);
        
        arpOsc.start(currentTime);
        arpOsc.stop(currentTime + note.duration);
        
        this.bgmOscillators.push(arpOsc);
      }
      
      currentTime += note.duration;
    });

    // ループのために次の再生をスケジュール
    if (this.isPlaying) {
      setTimeout(() => {
        this.bgmOscillators = [];
        this.playMelodyLoop(melody);
      }, totalDuration * 1000 + 500);
    }
  }

  public playButtonSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(this.volume * 0.8, this.audioContext.currentTime); // ボタン音を大きく
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  public playSuccessSound(): void {
    if (!this.audioContext) return;

    const times = [0, 0.15, 0.3];
    const frequencies = [523, 659, 784]; // C, E, G
    
    times.forEach((time, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.setValueAtTime(frequencies[index], this.audioContext!.currentTime + time);
      gainNode.gain.setValueAtTime(this.volume * 1.0, this.audioContext!.currentTime + time); // 正解音を最大に
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + time + 0.2);
      
      oscillator.start(this.audioContext!.currentTime + time);
      oscillator.stop(this.audioContext!.currentTime + time + 0.2);
    });
  }

  public playErrorSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(this.volume * 1.0, this.audioContext.currentTime); // 不正解音を最大に
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }
}