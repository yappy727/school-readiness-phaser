// Phaser.js用の型定義
export interface GameConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface LearningContent {
  id: string;
  title: string;
  level: number;
  step: number;
  characters?: CharacterData[];
  numbers?: NumberData[];
  exercises: ExerciseData[];
}

export interface CharacterData {
  character: string;
  reading: string;
  imagePath?: string;
  audioPath?: string;
  strokeOrder?: StrokePoint[][];
  examples?: ExampleData[];
}

export interface NumberData {
  number: number;
  kanji: string;
  reading: string;
  objects: ObjectData[];
  audioPath?: string;
}

export interface ObjectData {
  type: string;
  count: number;
  imagePath?: string;
}

export interface ExampleData {
  word: string;
  imagePath?: string;
}

export interface ExerciseData {
  type: 'recognition' | 'tracing' | 'counting' | 'matching';
  question: string;
  options?: string[];
  correct: number | string;
  objects?: ObjectData[];
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface UserProgress {
  userId: string;
  lastUpdated: Date;
  overall: {
    totalLessons: number;
    completedLessons: number;
    currentLevel: number;
    streakDays: number;
  };
  subjects: {
    hiragana: SubjectProgress;
    katakana: SubjectProgress;
    numbers: SubjectProgress;
    clock: SubjectProgress;
  };
  settings: UserSettings;
}

export interface SubjectProgress {
  currentStep: number;
  completedSteps: string[];
  scores: Record<string, number>;
  timeSpent: number;
  lastAccessed: Date;
}

export interface UserSettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  contrast: 'normal' | 'high';
  soundVolume: number; // 0-100
  autoPlay: boolean;
  colorBlindSupport: boolean;
  motionReduced: boolean;
}

export interface CharacterMood {
  type: 'happy' | 'excited' | 'encouraging' | 'celebrating';
  message: string;
  animation?: string;
}

export type GameScene = 'menu' | 'hiragana' | 'katakana' | 'numbers' | 'clock' | 'progress' | 'settings';