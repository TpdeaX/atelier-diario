export type ModuleId =
  | 'home'
  | 'reader'
  | 'calligraphy'
  | 'studio'
  | 'typing'
  | 'language'
  | 'mindset'
  | 'vault'
  | 'focuslab'
  | 'singing'
  | 'calm';

export type HabitKey =
  | 'read'
  | 'calligraphy'
  | 'studio'
  | 'typing'
  | 'language'
  | 'mindset'
  | 'focuslab'
  | 'singing'
  | 'calm';

export type ThemeMode = 'day' | 'night';

export type EcoAppId = 'directorio' | 'atelier' | 'unumbral' | 'arena';

export type SingingTimbre = 'piano' | 'organ' | 'soft';

export type DeviceProfile = 'auto' | 'pc' | 'mobile';

export type BoardTool = 'pen' | 'highlighter' | 'rect' | 'circle' | 'arrow' | 'text' | 'eraser';

export type PaperStyle = 'dotted' | 'grid' | 'lined' | 'blank' | 'pdf';

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

export interface PhraseItem {
  id: string;
  category: 'mente' | 'hablar' | 'decisiones' | 'calma';
  quote: string;
  author: string;
  meaning: string;
  whenToUse: string;
  dailyAction: string;
  sourceUrl?: string;
  isCustom?: boolean;
}

export type VaultCategory =
  | 'mentalidad'
  | 'oratoria'
  | 'tech'
  | 'estudio'
  | 'carrera'
  | 'bienestar'
  | 'otros'
  | 'ocio'
  | 'visual';

export type VaultStatus = 'pending' | 'seen' | 'applied' | 'archived';

export type VaultFilterCategory =
  | 'useful'
  | 'all'
  | 'favs'
  | 'applied'
  | 'custom'
  | VaultCategory;

export interface VaultItem {
  id: string;
  index?: number;
  url: string;
  title: string;
  summary: string;
  category: VaultCategory;
  tags: string[];
  isCustom?: boolean;
  createdAt?: number;
}

export interface FlashcardItem {
  id: string;
  deck: string;
  front: string;
  back: string;
  source?: string;
  isCustom?: boolean;
}

export interface FlashcardProgress {
  nextReviewAt: number;
  intervalDays: number;
  reps: number;
}

export interface ModulePreferences {
  reader: {
    sourceTab: 'wikisource' | 'wikipedia' | 'openlibrary';
    lastArticleTitle: string;
  };
  studio: {
    activeId: string;
    currentPage: number;
    tool: BoardTool;
    color: string;
    strokeWidth: number;
  };
  calligraphy: {
    mode: 'trazos' | 'imprenta' | 'cursiva' | 'frase';
    sampleIdx: number;
    showGuidelines: boolean;
    showSlant: boolean;
    inkColor: string;
    nibSize: number;
  };
  typing: {
    pcDrill: 'accents' | 'speed' | 'classic';
    mobileDrill: 'agile' | 'orthowords' | 'sprint30';
    sampleIdx: number;
    showFingerGuide: boolean;
  };
  language: {
    tab: 'ortho' | 'vocab' | 'dict';
    orthoIdx: number;
    vocabIdx: number;
  };
  mindset: {
    category: 'all' | 'favs' | PhraseItem['category'];
    searchQuery: string;
  };
  vault: {
    category: VaultFilterCategory;
    statusFilter: 'active' | VaultStatus;
    searchQuery: string;
  };
  focuslab: {
    tab: 'oratory' | 'schulte' | 'recall';
    schulteSize: 4 | 5 | 6;
    recallDeck: string;
  };
  singing: {
    lastDrillId: string;
    level: 1 | 2 | 3;
    timbre: SingingTimbre;
  };
  calm: {
    patternId: '478' | 'box' | 'sigh';
    soundCue: boolean;
    groundingIdx: number;
  };
}

export interface LifeProfile {
  theme: ThemeMode;
  deviceMode: DeviceProfile;
  readerFontSize: number;
  dailyStreak: number;
  lastActiveDay: string;
  todayHabits: Record<HabitKey, boolean>;
  favoritePhraseIds: string[];
  customPhrases: PhraseItem[];
  vaultStatuses: Record<string, VaultStatus>;
  vaultFavorites: string[];
  vaultNotes: Record<string, string>;
  customVaultItems: VaultItem[];
  customFlashcards: FlashcardItem[];
  flashcardProgress: Record<string, FlashcardProgress>;
  savedWords: SavedWord[];
  reframeLog: ReframeEntry[];
  bookmarks: BookBookmark[];
  stats: {
    orthographyCorrect: number;
    orthographyTotal: number;
    calligraphySheets: number;
    calmSessions: number;
    singingBestCents: number | null;
    vocalRangeLow: number | null;
    vocalRangeHigh: number | null;
    singingSongBest: Record<string, number>;
    bestWpmPc: number;
    bestWpmMobile: number;
    schulteBestMs: number | null;
    oratorySessions: number;
    recallReviewed: number;
  };
  modulePrefs: ModulePreferences;
  updatedAt: number;
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

export type EcosystemScope =
  | 'directory_config'
  | 'atelier_profile'
  | 'unumbral_backup'
  | 'arena_profile';

export type DirectoryCategory = 'atelier' | 'universidad' | 'entrenamiento' | 'personal';

export interface CustomDirectoryLink {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  category: DirectoryCategory;
  color: string;
  iconKey: string;
}

export interface DirectoryConfig {
  userName: string;
  userSubtitle: string;
  userInitials: string;
  ecosystemTitle: string;
  ecosystemSubtitle: string;
  activeCategory: 'all' | DirectoryCategory;
  pinnedIds: string[];
  hiddenIds: string[];
  order: string[];
  customLinks: CustomDirectoryLink[];
  companionUrls: {
    atelier?: string;
    unumbral: string;
    arena: string;
  };
  updatedAt: number;
}
