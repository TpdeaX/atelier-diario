export type ModuleId =
  | 'home'
  | 'reader'
  | 'calligraphy'
  | 'language'
  | 'mindset'
  | 'singing'
  | 'calm';

export type HabitKey = 'read' | 'calligraphy' | 'language' | 'mindset' | 'singing' | 'calm';

export type ThemeMode = 'day' | 'night';

export interface SavedWord {
  word: string;
  definition: string;
  addedAt: number;
}

export interface ReframeEntry {
  id: string;
  worry: string;
  control: string;
  nextStep: string;
  createdAt: number;
}

export interface BookBookmark {
  source: 'wikisource' | 'wikipedia';
  title: string;
  excerpt: string;
  updatedAt: number;
}

export interface LifeProfile {
  theme: ThemeMode;
  readerFontSize: number;
  dailyStreak: number;
  lastActiveDay: string;
  todayHabits: Record<HabitKey, boolean>;
  favoritePhraseIds: string[];
  savedWords: SavedWord[];
  reframeLog: ReframeEntry[];
  bookmarks: BookBookmark[];
  stats: {
    orthographyCorrect: number;
    orthographyTotal: number;
    calligraphySheets: number;
    calmSessions: number;
    singingBestCents: number | null;
  };
}

export interface PhraseItem {
  id: string;
  category: 'mente' | 'hablar' | 'decisiones' | 'calma';
  quote: string;
  author: string;
  meaning: string;
  whenToUse: string;
  dailyAction: string;
}

export interface OrthographyQuestion {
  id: string;
  sentence: string;
  options: string[];
  correctIndex: number;
  rule: string;
}

export interface VocabPair {
  word: string;
  meaning: string;
  example: string;
  replaces?: string;
}
