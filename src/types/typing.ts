export type AppTab = 'tutor' | 'speedtest' | 'game' | 'scan' | 'dictionary' | 'progress';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type LessonCategory =
  | 'home-row'
  | 'upper-row'
  | 'lower-row'
  | 'words'
  | 'sentences'
  | 'paragraphs';

export type FingerId =
  | 'L_PINKY'
  | 'L_RING'
  | 'L_MIDDLE'
  | 'L_INDEX'
  | 'L_THUMB'
  | 'R_THUMB'
  | 'R_INDEX'
  | 'R_MIDDLE'
  | 'R_RING'
  | 'R_PINKY';

export interface TypingLesson {
  id: string;
  title: string;
  subtitle: string;
  level: DifficultyLevel;
  category: LessonCategory;
  targetWpm: number;
  text: string;
  focusKeys?: string[];
}

export interface DictionaryWord {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  difficulty: DifficultyLevel;
  definition: string;
  hindiMeaning: string;
  hindiTransliteration: string;
  exampleSentence: string;
}

export type SessionMode = 'tutor' | 'speedtest' | 'game' | 'scan' | 'dictionary';

export interface TypingSessionResult {
  id: string;
  mode: SessionMode;
  title: string;
  level?: DifficultyLevel;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  mistakes: number;
  correctChars: number;
  totalChars: number;
  durationSeconds: number;
  keyErrors: Record<string, number>;
  timestamp: string;
}

export interface FocusSettings {
  zenFocusMode: boolean;
  screenTimeoutMinutes: number; // 0 = off, otherwise minutes until break overlay
  inactivityPauseSeconds: number; // 0 = off, otherwise seconds before auto-pause
  keepScreenAwake: boolean;
  soundEnabled: boolean;
}
