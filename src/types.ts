export type ModuleId =
  | 'home'
  | 'reader'
  | 'calligraphy'
  | 'studio'
  | 'typing'
  | 'language'
  | 'mindset'
  | 'focuslab'
  | 'singing'
  | 'drawing'
  | 'calm'
  | 'critical'
  | 'writing'
  | 'finance'
  | 'vitality';

export type HabitKey =
  | 'read'
  | 'calligraphy'
  | 'studio'
  | 'typing'
  | 'language'
  | 'mindset'
  | 'focuslab'
  | 'singing'
  | 'drawing'
  | 'calm'
  | 'critical'
  | 'writing'
  | 'finance'
  | 'vitality';

export type CalmPatternId = '478' | 'box' | 'sigh' | 'exhale36' | 'coherence';

export type DrawingSymmetry = 'none' | 'vertical' | 'radial4';

export type DrawingGridMode = 'none' | 'grid' | 'perspective1' | 'perspective2';

export type ThemeMode = 'day' | 'night';

export type DifficultyLevel = 'basico' | 'intermedio' | 'avanzado';

export type PracticeModuleId = Exclude<ModuleId, 'home'>;

export interface TypingHistoryEntry {
  at: number;
  mode: string;
  difficulty: DifficultyLevel;
  wpm: number;
  acc: number;
}

export interface OratorySessionEntry {
  at: number;
  promptId: string;
  title: string;
  durationSec: number;
  fillers: number;
  rubricScore: number;
}

export interface CalmCheckinEntry {
  at: number;
  before: number;
  after: number;
  technique: string;
  note: string;
}

export interface SavedCanvasStroke {
  color: string;
  size: number;
  opacity: number;
  eraser: boolean;
  points: [number, number, number][];
}

export interface SavedCalligraphyStroke {
  points: [number, number, number][];
}

export interface ModuleActivityEntry {
  moduleId: PracticeModuleId;
  at: number;
  label: string;
  detail: string;
}

export interface DecisionCriterion {
  name: string;
  weight: number;
  scoreA: number;
  scoreB: number;
}

export interface SavedDecisionMatrix {
  id: string;
  title: string;
  optionA: string;
  optionB: string;
  criteria: DecisionCriterion[];
  winner: string;
  updatedAt: number;
}

export interface FinanceTransaction {
  id: string;
  kind: 'income' | 'need' | 'want' | 'saving';
  label: string;
  amount: number;
  at: number;
}

export interface FinanceGoal {
  id: string;
  title: string;
  target: number;
  saved: number;
}

export interface VitalityDayLog {
  day: string;
  waterCups: number;
  sleepHours: number;
  energyLevel: number;
  breaksDone: number;
}

export interface LearningProgress {
  tutorialsDone: string[];
  tutorialsOpen: Record<string, boolean>;
  difficulty: Record<PracticeModuleId, DifficultyLevel>;
  activity: {
    lastModule: PracticeModuleId | null;
    lastVisitedAt: number;
    recent: ModuleActivityEntry[];
  };
  studio: {
    mode: 'libre' | 'plantilla' | 'repaso';
    templateId: string;
    templatesApplied: number;
    studyChecklist: Record<string, boolean>;
  };
  reader: {
    mode: 'lectura' | 'guiada' | 'comprension';
    readArticles: string[];
    scrollByTitle: Record<string, number>;
    quizScores: Record<string, number>;
    readingNotes: Record<string, string>;
    wordsRead: number;
  };
  calligraphy: {
    modeExtra: 'trazos' | 'imprenta' | 'cursiva' | 'frase' | 'numeros' | 'ritmo';
    mastery: Record<string, number>;
    completedTemplates: string[];
    savedStrokes: Record<string, SavedCalligraphyStroke[]>;
  };
  drawing: {
    modeExtra: 'lessons' | 'challenge' | 'free';
    mastery: Record<string, number>;
    completedLessons: string[];
    completedChallenges: string[];
    activeTool: 'pencil' | 'ruler' | 'eraser';
    guideStep: number;
    refOpacity: number;
    refHighContrast: boolean;
    refMirror: boolean;
    refViewMode: 'side' | 'trace' | 'off';
    horizonY: number;
    vp1X: number;
    vp2X: number;
    savedDrafts: Record<string, SavedCanvasStroke[]>;
  };
  typing: {
    pcExtraMode: 'accents' | 'speed' | 'classic' | 'filas' | 'codigo' | 'adaptativo';
    mobileExtraMode: 'agile' | 'orthowords' | 'sprint30' | 'precision' | 'frases';
    keyErrors: Record<string, number>;
    completedIds: string[];
    history: TypingHistoryEntry[];
  };
  language: {
    topic: 'todos' | 'tildes' | 'homofonos' | 'b_v_g_j' | 'puntuacion' | 'sintaxis';
    orthoMode: 'practica' | 'repaso_fallos' | 'examen';
    vocabMode: 'tarjetas' | 'quiz' | 'cloze';
    masteredOrthoIds: string[];
    missedOrthoIds: string[];
    vocabMastered: string[];
    bestExamScore: number;
    wordNotes: Record<string, string>;
  };
  mindset: {
    mode: 'tarjetas' | 'reto_hoy' | 'reflexion';
    completedActionIds: string[];
    reflections: Record<string, string>;
    dailyCheckins: number;
  };
  vault: {
    mode: 'explorar' | 'estudiar_hoy' | 'quiz_accion';
    promotedIds: string[];
    actionPlans: Record<string, string>;
    dailyGoal: number;
    reviewedToday: number;
    lastReviewDay: string;
    showOptionalTabs: boolean;
  };
  focuslab: {
    promptIdx: number;
    drillIdx: number;
    schulteMode: 'normal' | 'inverso' | 'doble';
    schulteBestByKey: Record<string, number>;
    oratoryHistory: OratorySessionEntry[];
    recallMode: 'repaso' | 'quiz';
    recallDrafts: Record<string, string>;
    recallMasteredDecks: string[];
  };
  singing: {
    activeTab: 'karaoke' | 'routines' | 'ear';
    selectedSongId: string;
    transpose: number;
    karaokeTempo: number;
    playGuideNotes: boolean;
    playChordBacking: boolean;
    vowelsCompleted: string[];
    jumpsVerified: string[];
    drillsMastered: Record<string, number>;
    earMode: 'chord' | 'interval' | 'scale' | 'melody';
    earIntervalMode: 'basic' | 'full';
    earCorrect: number;
    earTotal: number;
    earStreak: number;
    warmupCount: number;
  };
  calm: {
    activeTab: 'reframe' | 'sos' | 'checkin';
    ambientSound: 'off' | 'rain' | 'pulse' | 'drone';
    vibrateOn: boolean;
    groundDone: boolean[];
    pmrStep: number;
    cardIdx: number;
    checkins: CalmCheckinEntry[];
  };
  critical: {
    activeTab: 'casos' | 'matriz' | 'repaso';
    caseIdx: number;
    masteredIds: string[];
    missedIds: string[];
    decisions: SavedDecisionMatrix[];
  };
  writing: {
    activeTab: 'retos' | 'analizador' | 'plantillas';
    challengeIdx: number;
    completedIds: string[];
    bestScores: Record<string, number>;
    drafts: Record<string, string>;
    freeDraft: string;
  };
  finance: {
    activeTab: 'presupuesto' | 'metas' | 'compuesto' | 'criterio';
    currency: 'S/' | '$' | '€';
    transactions: FinanceTransaction[];
    goals: FinanceGoal[];
    calcInitial: number;
    calcMonthly: number;
    calcRate: number;
    calcYears: number;
    quizMasteredIds: string[];
    quizIdx: number;
  };
  vitality: {
    activeTab: 'pausas' | 'registro' | 'postura';
    selectedRoutineId: string;
    completedRoutines: number;
    routineHistory: Record<string, number>;
    postureChecks: Record<string, boolean>;
    dayLogs: VitalityDayLog[];
  };
}

const MODULE_IDS: readonly ModuleId[] = [
  'home',
  'reader',
  'calligraphy',
  'studio',
  'typing',
  'language',
  'mindset',
  'focuslab',
  'singing',
  'drawing',
  'calm',
  'critical',
  'writing',
  'finance',
  'vitality',
];

/** Interpreta `#calm?sos=1`, `#sos` y `#<modulo>`; cualquier otra cosa cae a home. */
export function parseHashRoute(rawHash: string): { moduleId: ModuleId; sos: boolean } {
  const clean = (rawHash || '').replace(/^#/, '').trim();
  if (!clean) return { moduleId: 'home', sos: false };
  const [path, query = ''] = clean.split('?');
  const name = path.toLowerCase();
  if (name === 'sos') return { moduleId: 'calm', sos: true };
  if (!(MODULE_IDS as readonly string[]).includes(name)) return { moduleId: 'home', sos: false };
  const sos = name === 'calm' && new URLSearchParams(query).get('sos') === '1';
  return { moduleId: name as ModuleId, sos };
}

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
  difficulty?: DifficultyLevel;
  reflectionPrompt?: string;
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
    patternId: CalmPatternId;
    soundCue: boolean;
    groundingIdx: number;
  };
  drawing: {
    mode: 'lessons' | 'free';
    lessonId: string;
    brushColor: string;
    brushSize: number;
    brushOpacity: number;
    symmetry: DrawingSymmetry;
    grid: DrawingGridMode;
    showGuide: boolean;
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
    drawingSheets: number;
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
  progress: LearningProgress;
  updatedAt: number;
}

export type OrthographyTopic = 'tildes' | 'homofonos' | 'b_v_g_j' | 'puntuacion' | 'sintaxis';

export interface OrthographyQuestion {
  id: string;
  sentence: string;
  options: string[];
  correctIndex: number;
  rule: string;
  difficulty?: DifficultyLevel;
  topic?: OrthographyTopic;
  hint?: string;
}

export interface VocabPair {
  word: string;
  meaning: string;
  example: string;
  replaces?: string;
  difficulty?: DifficultyLevel;
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
