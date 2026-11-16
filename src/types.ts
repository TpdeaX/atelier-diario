export type ModuleId =
  | 'home'
  | 'reader'
  | 'calligraphy'
  | 'studio'
  | 'typing'
  | 'language'
  | 'mindset'
  | 'singing'
  | 'calm';

export type HabitKey =
  | 'read'
  | 'calligraphy'
  | 'studio'
  | 'typing'
  | 'language'
  | 'mindset'
  | 'singing'
  | 'calm';

export type ThemeMode = 'day' | 'night';

export type DeviceProfile = 'auto' | 'pc' | 'mobile';

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
  deviceMode: DeviceProfile;
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
    bestWpmPc: number;
    bestWpmMobile: number;
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

export type BoardTool = 'pen' | 'highlighter' | 'rect' | 'circle' | 'arrow' | 'text' | 'eraser';

export type PaperStyle = 'dotted' | 'grid' | 'lined' | 'blank' | 'pdf';

export interface BoardStrokeElement {
  id: string;
  type: 'stroke';
  tool: 'pen' | 'highlighter';
  points: [number, number][]; // normalized 0..1000 x 0..1350
  color: string;
  width: number;
  alpha: number;
}

export interface BoardShapeElement {
  id: string;
  type: 'rect' | 'circle' | 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export interface BoardTextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export type BoardElement = BoardStrokeElement | BoardShapeElement | BoardTextElement;

export interface NotebookDoc {
  id: string;
  title: string;
  kind: 'notebook' | 'pdf';
  paper: PaperStyle;
  pageCount: number;
  pages: Record<number, BoardElement[]>;
  pdfStoragePath?: string;
  updatedAt: number;
}

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  spaceCode: string;
  autoSync: boolean;
}

