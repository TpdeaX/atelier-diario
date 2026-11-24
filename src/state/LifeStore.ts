import { cloudSync } from '../services/CloudSync.ts';
import type {
  BookBookmark,
  CalmCheckinEntry,
  CalmPatternId,
  DeviceProfile,
  DifficultyLevel,
  DrawingGridMode,
  DrawingSymmetry,
  FlashcardItem,
  HabitKey,
  LearningProgress,
  LifeProfile,
  ModuleActivityEntry,
  ModulePreferences,
  OratorySessionEntry,
  PhraseItem,
  PracticeModuleId,
  ReframeEntry,
  SavedCalligraphyStroke,
  SavedCanvasStroke,
  SavedWord,
  ThemeMode,
  TypingHistoryEntry,
  VaultItem,
  VaultStatus,
} from '../types.ts';

const STORAGE_KEY = 'atelier_diario_profile_v1';
const ECO_THEME_KEY = 'umbral-theme';

export function normalizeEcoTheme(raw: string | null | undefined): 'light' | 'dark' | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'dark' || v === 'night') return 'dark';
  if (v === 'light' || v === 'day') return 'light';
  return null;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyHabits(): Record<HabitKey, boolean> {
  return {
    read: false,
    calligraphy: false,
    studio: false,
    typing: false,
    language: false,
    mindset: false,
    focuslab: false,
    singing: false,
    drawing: false,
    calm: false,
  };
}

export function defaultModulePrefs(): ModulePreferences {
  return {
    reader: {
      sourceTab: 'wikisource',
      lastArticleTitle: '',
    },
    studio: {
      activeId: '',
      currentPage: 1,
      tool: 'pen',
      color: '#10211B',
      strokeWidth: 4,
    },
    calligraphy: {
      mode: 'trazos',
      sampleIdx: 0,
      showGuidelines: true,
      showSlant: true,
      inkColor: '#147D58',
      nibSize: 4,
    },
    typing: {
      pcDrill: 'accents',
      mobileDrill: 'agile',
      sampleIdx: 0,
      showFingerGuide: true,
    },
    language: {
      tab: 'ortho',
      orthoIdx: 0,
      vocabIdx: 0,
    },
    mindset: {
      category: 'all',
      searchQuery: '',
    },
    vault: {
      category: 'useful',
      statusFilter: 'active',
      searchQuery: '',
    },
    focuslab: {
      tab: 'oratory',
      schulteSize: 5,
      recallDeck: 'all',
    },
    singing: {
      lastDrillId: 'major5',
      level: 1,
      timbre: 'piano',
    },
    calm: {
      patternId: '478',
      soundCue: true,
      groundingIdx: 0,
    },
    drawing: {
      mode: 'lessons',
      lessonId: 'stroke-lines',
      brushColor: '#1E293B',
      brushSize: 4,
      brushOpacity: 1,
      symmetry: 'none',
      grid: 'none',
      showGuide: true,
    },
  };
}

export function defaultLearningProgress(): LearningProgress {
  return {
    tutorialsDone: [],
    tutorialsOpen: {},
    difficulty: {
      reader: 'intermedio',
      studio: 'intermedio',
      calligraphy: 'basico',
      drawing: 'basico',
      typing: 'intermedio',
      language: 'intermedio',
      mindset: 'intermedio',
      focuslab: 'intermedio',
      singing: 'basico',
      calm: 'intermedio',
    },
    activity: {
      lastModule: null,
      lastVisitedAt: 0,
      recent: [],
    },
    studio: {
      mode: 'libre',
      templateId: 'cornell',
      templatesApplied: 0,
      studyChecklist: {},
    },
    reader: {
      mode: 'lectura',
      readArticles: [],
      scrollByTitle: {},
      quizScores: {},
      readingNotes: {},
      wordsRead: 0,
    },
    calligraphy: {
      modeExtra: 'trazos',
      mastery: {},
      completedTemplates: [],
      savedStrokes: {},
    },
    drawing: {
      modeExtra: 'lessons',
      mastery: {},
      completedLessons: [],
      completedChallenges: [],
      activeTool: 'pencil',
      guideStep: 0,
      refOpacity: 0.35,
      refHighContrast: false,
      refMirror: false,
      refViewMode: 'side',
      horizonY: 0.42,
      vp1X: 0.18,
      vp2X: 0.82,
      savedDrafts: {},
    },
    typing: {
      pcExtraMode: 'accents',
      mobileExtraMode: 'agile',
      keyErrors: {},
      completedIds: [],
      history: [],
    },
    language: {
      topic: 'todos',
      orthoMode: 'practica',
      vocabMode: 'tarjetas',
      masteredOrthoIds: [],
      missedOrthoIds: [],
      vocabMastered: [],
      bestExamScore: 0,
      wordNotes: {},
    },
    mindset: {
      mode: 'tarjetas',
      completedActionIds: [],
      reflections: {},
      dailyCheckins: 0,
    },
    vault: {
      mode: 'explorar',
      promotedIds: [],
      actionPlans: {},
      dailyGoal: 5,
      reviewedToday: 0,
      lastReviewDay: '',
      showOptionalTabs: false,
    },
    focuslab: {
      promptIdx: 0,
      drillIdx: 0,
      schulteMode: 'normal',
      schulteBestByKey: {},
      oratoryHistory: [],
      recallMode: 'repaso',
      recallDrafts: {},
      recallMasteredDecks: [],
    },
    singing: {
      activeTab: 'karaoke',
      selectedSongId: 'ode',
      transpose: 0,
      karaokeTempo: 1,
      playGuideNotes: true,
      playChordBacking: true,
      vowelsCompleted: [],
      jumpsVerified: [],
      drillsMastered: {},
      earMode: 'chord',
      earIntervalMode: 'basic',
      earCorrect: 0,
      earTotal: 0,
      earStreak: 0,
      warmupCount: 0,
    },
    calm: {
      activeTab: 'reframe',
      ambientSound: 'off',
      vibrateOn: true,
      groundDone: Array.from({ length: 15 }, () => false),
      pmrStep: 0,
      cardIdx: 0,
      checkins: [],
    },
  };
}

const VALID_DIFFICULTIES: readonly DifficultyLevel[] = ['basico', 'intermedio', 'avanzado'];

function normDiff(v: unknown, fb: DifficultyLevel): DifficultyLevel {
  return VALID_DIFFICULTIES.includes(v as DifficultyLevel) ? (v as DifficultyLevel) : fb;
}

function normStrArr(v: unknown, max = 500): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0))).slice(0, max);
}

function normNumRecord(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'number' && Number.isFinite(val)) out[k] = val;
  }
  return out;
}

function normStrRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

function normBoolRecord(v: unknown): Record<string, boolean> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'boolean') out[k] = val;
  }
  return out;
}

export function normalizeLearningProgress(raw: Partial<LearningProgress> | null | undefined): LearningProgress {
  const base = defaultLearningProgress();
  if (!raw || typeof raw !== 'object') return base;
  const rd = (raw.difficulty ?? {}) as Partial<Record<PracticeModuleId, DifficultyLevel>>;
  const difficulty: Record<PracticeModuleId, DifficultyLevel> = {
    reader: normDiff(rd.reader, base.difficulty.reader),
    studio: normDiff(rd.studio, base.difficulty.studio),
    calligraphy: normDiff(rd.calligraphy, base.difficulty.calligraphy),
    drawing: normDiff(rd.drawing, base.difficulty.drawing),
    typing: normDiff(rd.typing, base.difficulty.typing),
    language: normDiff(rd.language, base.difficulty.language),
    mindset: normDiff(rd.mindset, base.difficulty.mindset),
    focuslab: normDiff(rd.focuslab, base.difficulty.focuslab),
    singing: normDiff(rd.singing, base.difficulty.singing),
    calm: normDiff(rd.calm, base.difficulty.calm),
  };

  const rStudio = (raw.studio ?? {}) as Partial<LearningProgress['studio']>;
  const rReader = (raw.reader ?? {}) as Partial<LearningProgress['reader']>;
  const rCal = (raw.calligraphy ?? {}) as Partial<LearningProgress['calligraphy']>;
  const rDraw = (raw.drawing ?? {}) as Partial<LearningProgress['drawing']>;
  const rTyp = (raw.typing ?? {}) as Partial<LearningProgress['typing']>;
  const rLang = (raw.language ?? {}) as Partial<LearningProgress['language']>;
  const rMind = (raw.mindset ?? {}) as Partial<LearningProgress['mindset']>;
  const rVault = (raw.vault ?? {}) as Partial<LearningProgress['vault']>;
  const rFocus = (raw.focuslab ?? {}) as Partial<LearningProgress['focuslab']>;
  const rSing = (raw.singing ?? {}) as Partial<LearningProgress['singing']>;
  const rCalm = (raw.calm ?? {}) as Partial<LearningProgress['calm']>;
  const rAct = (raw.activity ?? {}) as Partial<LearningProgress['activity']>;

  const VALID_PRACTICE_MODS: readonly PracticeModuleId[] = [
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
  ];
  const normMod = (v: unknown): PracticeModuleId | null =>
    VALID_PRACTICE_MODS.includes(v as PracticeModuleId) ? (v as PracticeModuleId) : null;
  const normRecent: ModuleActivityEntry[] = Array.isArray(rAct.recent)
    ? rAct.recent
        .filter(
          (e): e is ModuleActivityEntry =>
            Boolean(e && typeof e === 'object' && normMod((e as ModuleActivityEntry).moduleId))
        )
        .map((e) => ({
          moduleId: e.moduleId,
          at: typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : 0,
          label: typeof e.label === 'string' ? e.label.slice(0, 120) : '',
          detail: typeof e.detail === 'string' ? e.detail.slice(0, 140) : '',
        }))
        .slice(0, 8)
    : [];

  const clampNum = (v: unknown, min: number, max: number, fb: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;

  return {
    tutorialsDone: normStrArr(raw.tutorialsDone, 200),
    tutorialsOpen: normBoolRecord(raw.tutorialsOpen),
    difficulty,
    activity: {
      lastModule: normMod(rAct.lastModule),
      lastVisitedAt: typeof rAct.lastVisitedAt === 'number' && Number.isFinite(rAct.lastVisitedAt) ? rAct.lastVisitedAt : 0,
      recent: normRecent,
    },
    studio: {
      mode:
        rStudio.mode === 'plantilla' || rStudio.mode === 'repaso' ? rStudio.mode : 'libre',
      templateId: typeof rStudio.templateId === 'string' && rStudio.templateId ? rStudio.templateId : base.studio.templateId,
      templatesApplied: clampNum(rStudio.templatesApplied, 0, 100000, 0),
      studyChecklist: normBoolRecord(rStudio.studyChecklist),
    },
    reader: {
      mode:
        rReader.mode === 'guiada' || rReader.mode === 'comprension' ? rReader.mode : 'lectura',
      readArticles: normStrArr(rReader.readArticles, 300),
      scrollByTitle: normNumRecord(rReader.scrollByTitle),
      quizScores: normNumRecord(rReader.quizScores),
      readingNotes: normStrRecord(rReader.readingNotes),
      wordsRead: clampNum(rReader.wordsRead, 0, 10000000, 0),
    },
    calligraphy: {
      modeExtra: ['trazos', 'imprenta', 'cursiva', 'frase', 'numeros', 'ritmo'].includes(
        String(rCal.modeExtra)
      )
        ? (rCal.modeExtra as LearningProgress['calligraphy']['modeExtra'])
        : base.calligraphy.modeExtra,
      mastery: normNumRecord(rCal.mastery),
      completedTemplates: normStrArr(rCal.completedTemplates, 300),
      savedStrokes:
        rCal.savedStrokes && typeof rCal.savedStrokes === 'object'
          ? { ...(rCal.savedStrokes as Record<string, SavedCalligraphyStroke[]>) }
          : {},
    },
    drawing: {
      modeExtra:
        rDraw.modeExtra === 'challenge' || rDraw.modeExtra === 'free' ? rDraw.modeExtra : 'lessons',
      mastery: normNumRecord(rDraw.mastery),
      completedLessons: normStrArr(rDraw.completedLessons, 200),
      completedChallenges: normStrArr(rDraw.completedChallenges, 200),
      activeTool:
        rDraw.activeTool === 'ruler' || rDraw.activeTool === 'eraser' ? rDraw.activeTool : 'pencil',
      guideStep: clampNum(rDraw.guideStep, 0, 20, 0),
      refOpacity: clampNum(rDraw.refOpacity, 0.1, 0.9, base.drawing.refOpacity),
      refHighContrast: typeof rDraw.refHighContrast === 'boolean' ? rDraw.refHighContrast : false,
      refMirror: typeof rDraw.refMirror === 'boolean' ? rDraw.refMirror : false,
      refViewMode:
        rDraw.refViewMode === 'trace' || rDraw.refViewMode === 'off' ? rDraw.refViewMode : 'side',
      horizonY: clampNum(rDraw.horizonY, 0.12, 0.88, base.drawing.horizonY),
      vp1X: clampNum(rDraw.vp1X, 0.04, 0.96, base.drawing.vp1X),
      vp2X: clampNum(rDraw.vp2X, 0.04, 0.96, base.drawing.vp2X),
      savedDrafts:
        rDraw.savedDrafts && typeof rDraw.savedDrafts === 'object'
          ? { ...(rDraw.savedDrafts as Record<string, SavedCanvasStroke[]>) }
          : {},
    },
    typing: {
      pcExtraMode: ['accents', 'speed', 'classic', 'filas', 'codigo', 'adaptativo'].includes(
        String(rTyp.pcExtraMode)
      )
        ? (rTyp.pcExtraMode as LearningProgress['typing']['pcExtraMode'])
        : base.typing.pcExtraMode,
      mobileExtraMode: ['agile', 'orthowords', 'sprint30', 'precision', 'frases'].includes(
        String(rTyp.mobileExtraMode)
      )
        ? (rTyp.mobileExtraMode as LearningProgress['typing']['mobileExtraMode'])
        : base.typing.mobileExtraMode,
      keyErrors: normNumRecord(rTyp.keyErrors),
      completedIds: normStrArr(rTyp.completedIds, 300),
      history: Array.isArray(rTyp.history) ? rTyp.history.slice(0, 40) : [],
    },
    language: {
      topic: ['todos', 'tildes', 'homofonos', 'b_v_g_j', 'puntuacion', 'sintaxis'].includes(
        String(rLang.topic)
      )
        ? (rLang.topic as LearningProgress['language']['topic'])
        : 'todos',
      orthoMode:
        rLang.orthoMode === 'repaso_fallos' || rLang.orthoMode === 'examen'
          ? rLang.orthoMode
          : 'practica',
      vocabMode:
        rLang.vocabMode === 'quiz' || rLang.vocabMode === 'cloze' ? rLang.vocabMode : 'tarjetas',
      masteredOrthoIds: normStrArr(rLang.masteredOrthoIds, 400),
      missedOrthoIds: normStrArr(rLang.missedOrthoIds, 400),
      vocabMastered: normStrArr(rLang.vocabMastered, 300),
      bestExamScore: clampNum(rLang.bestExamScore, 0, 100, 0),
      wordNotes: normStrRecord(rLang.wordNotes),
    },
    mindset: {
      mode:
        rMind.mode === 'reto_hoy' || rMind.mode === 'reflexion' ? rMind.mode : 'tarjetas',
      completedActionIds: normStrArr(rMind.completedActionIds, 300),
      reflections: normStrRecord(rMind.reflections),
      dailyCheckins: clampNum(rMind.dailyCheckins, 0, 100000, 0),
    },
    vault: {
      mode:
        rVault.mode === 'estudiar_hoy' || rVault.mode === 'quiz_accion'
          ? rVault.mode
          : 'explorar',
      promotedIds: normStrArr(rVault.promotedIds, 1000),
      actionPlans: normStrRecord(rVault.actionPlans),
      dailyGoal: clampNum(rVault.dailyGoal, 1, 50, 5),
      reviewedToday: clampNum(rVault.reviewedToday, 0, 500, 0),
      lastReviewDay: typeof rVault.lastReviewDay === 'string' ? rVault.lastReviewDay : '',
      showOptionalTabs: typeof rVault.showOptionalTabs === 'boolean' ? rVault.showOptionalTabs : false,
    },
    focuslab: {
      promptIdx: clampNum(rFocus.promptIdx, 0, 500, 0),
      drillIdx: clampNum(rFocus.drillIdx, 0, 500, 0),
      schulteMode:
        rFocus.schulteMode === 'inverso' || rFocus.schulteMode === 'doble'
          ? rFocus.schulteMode
          : 'normal',
      schulteBestByKey: normNumRecord(rFocus.schulteBestByKey),
      oratoryHistory: Array.isArray(rFocus.oratoryHistory) ? rFocus.oratoryHistory.slice(0, 40) : [],
      recallMode: rFocus.recallMode === 'quiz' ? 'quiz' : 'repaso',
      recallDrafts: normStrRecord(rFocus.recallDrafts),
      recallMasteredDecks: normStrArr(rFocus.recallMasteredDecks, 100),
    },
    singing: {
      activeTab:
        rSing.activeTab === 'routines' || rSing.activeTab === 'ear' ? rSing.activeTab : 'karaoke',
      selectedSongId:
        typeof rSing.selectedSongId === 'string' && rSing.selectedSongId
          ? rSing.selectedSongId
          : 'ode',
      transpose: clampNum(rSing.transpose, -12, 12, 0),
      karaokeTempo: clampNum(rSing.karaokeTempo, 0.6, 1.4, 1),
      playGuideNotes: typeof rSing.playGuideNotes === 'boolean' ? rSing.playGuideNotes : true,
      playChordBacking: typeof rSing.playChordBacking === 'boolean' ? rSing.playChordBacking : true,
      vowelsCompleted: normStrArr(rSing.vowelsCompleted, 10),
      jumpsVerified: normStrArr(rSing.jumpsVerified, 30),
      drillsMastered: normNumRecord(rSing.drillsMastered),
      earMode: ['chord', 'interval', 'scale', 'melody'].includes(String(rSing.earMode))
        ? (rSing.earMode as LearningProgress['singing']['earMode'])
        : 'chord',
      earIntervalMode: rSing.earIntervalMode === 'full' ? 'full' : 'basic',
      earCorrect: clampNum(rSing.earCorrect, 0, 100000, 0),
      earTotal: clampNum(rSing.earTotal, 0, 100000, 0),
      earStreak: clampNum(rSing.earStreak, 0, 100000, 0),
      warmupCount: clampNum(rSing.warmupCount, 0, 100000, 0),
    },
    calm: {
      activeTab:
        rCalm.activeTab === 'sos' || rCalm.activeTab === 'checkin' ? rCalm.activeTab : 'reframe',
      ambientSound: ['off', 'rain', 'pulse', 'drone'].includes(String(rCalm.ambientSound))
        ? (rCalm.ambientSound as LearningProgress['calm']['ambientSound'])
        : 'off',
      vibrateOn: typeof rCalm.vibrateOn === 'boolean' ? rCalm.vibrateOn : true,
      groundDone:
        Array.isArray(rCalm.groundDone) && rCalm.groundDone.length === 15
          ? rCalm.groundDone.map(Boolean)
          : Array.from({ length: 15 }, () => false),
      pmrStep: clampNum(rCalm.pmrStep, 0, 12, 0),
      cardIdx: clampNum(rCalm.cardIdx, 0, 200, 0),
      checkins: Array.isArray(rCalm.checkins) ? rCalm.checkins.slice(0, 60) : [],
    },
  };
}

function defaultProfile(): LifeProfile {
  return {
    theme: 'day',
    deviceMode: 'auto',
    readerFontSize: 18,
    dailyStreak: 0,
    lastActiveDay: '',
    todayHabits: emptyHabits(),
    favoritePhraseIds: [],
    customPhrases: [],
    vaultStatuses: {},
    vaultFavorites: [],
    vaultNotes: {},
    customVaultItems: [],
    customFlashcards: [],
    flashcardProgress: {},
    savedWords: [],
    reframeLog: [],
    bookmarks: [],
    stats: {
      orthographyCorrect: 0,
      orthographyTotal: 0,
      calligraphySheets: 0,
      calmSessions: 0,
      drawingSheets: 0,
      singingBestCents: null,
      vocalRangeLow: null,
      vocalRangeHigh: null,
      singingSongBest: {},
      bestWpmPc: 0,
      bestWpmMobile: 0,
      schulteBestMs: null,
      oratorySessions: 0,
      recallReviewed: 0,
    },
    modulePrefs: defaultModulePrefs(),
    progress: defaultLearningProgress(),
    updatedAt: 0,
  };
}

const CALM_PATTERNS: CalmPatternId[] = ['478', 'box', 'sigh', 'exhale36', 'coherence'];
const DRAWING_SYMMETRIES: DrawingSymmetry[] = ['none', 'vertical', 'radial4'];
const DRAWING_GRIDS: DrawingGridMode[] = ['none', 'grid', 'perspective1', 'perspective2'];

function normalizeCalmPrefs(
  raw: Partial<ModulePreferences['calm']> | undefined,
  base: ModulePreferences['calm']
): ModulePreferences['calm'] {
  const r = raw ?? {};
  return {
    patternId: CALM_PATTERNS.includes(r.patternId as CalmPatternId)
      ? (r.patternId as CalmPatternId)
      : base.patternId,
    soundCue: typeof r.soundCue === 'boolean' ? r.soundCue : base.soundCue,
    groundingIdx:
      typeof r.groundingIdx === 'number' && r.groundingIdx >= 0
        ? Math.floor(r.groundingIdx)
        : base.groundingIdx,
  };
}

function normalizeDrawingPrefs(
  raw: Partial<ModulePreferences['drawing']> | undefined,
  base: ModulePreferences['drawing']
): ModulePreferences['drawing'] {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v: unknown, min: number, max: number, fb: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
  return {
    mode: r.mode === 'free' ? 'free' : 'lessons',
    lessonId: typeof r.lessonId === 'string' && r.lessonId ? r.lessonId : base.lessonId,
    brushColor:
      typeof r.brushColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.brushColor)
        ? r.brushColor
        : base.brushColor,
    brushSize: num(r.brushSize, 1, 24, base.brushSize),
    brushOpacity: num(r.brushOpacity, 0.1, 1, base.brushOpacity),
    symmetry: DRAWING_SYMMETRIES.includes(r.symmetry as DrawingSymmetry)
      ? (r.symmetry as DrawingSymmetry)
      : base.symmetry,
    grid: DRAWING_GRIDS.includes(r.grid as DrawingGridMode) ? (r.grid as DrawingGridMode) : base.grid,
    showGuide: typeof r.showGuide === 'boolean' ? r.showGuide : base.showGuide,
  };
}

export function normalizeProfile(raw: Partial<LifeProfile> | null | undefined): LifeProfile {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const mp = raw.modulePrefs ?? ({} as Partial<ModulePreferences>);
  const singingStats = (raw.stats ?? {}) as Partial<LifeProfile['stats']>;
  const singingPrefs = (mp.singing ?? {}) as Partial<ModulePreferences['singing']>;
  return {
    ...base,
    ...raw,
    todayHabits: { ...base.todayHabits, ...(raw.todayHabits ?? {}) },
    stats: {
      ...base.stats,
      ...singingStats,
      drawingSheets:
        typeof singingStats.drawingSheets === 'number' && singingStats.drawingSheets >= 0
          ? Math.floor(singingStats.drawingSheets)
          : 0,
      vocalRangeLow:
        typeof singingStats.vocalRangeLow === 'number' ? singingStats.vocalRangeLow : null,
      vocalRangeHigh:
        typeof singingStats.vocalRangeHigh === 'number' ? singingStats.vocalRangeHigh : null,
      singingSongBest:
        singingStats.singingSongBest && typeof singingStats.singingSongBest === 'object'
          ? { ...singingStats.singingSongBest }
          : {},
    },
    favoritePhraseIds: Array.isArray(raw.favoritePhraseIds) ? raw.favoritePhraseIds : [],
    customPhrases: Array.isArray(raw.customPhrases) ? raw.customPhrases : [],
    vaultStatuses:
      raw.vaultStatuses && typeof raw.vaultStatuses === 'object' ? { ...raw.vaultStatuses } : {},
    vaultFavorites: Array.isArray(raw.vaultFavorites) ? raw.vaultFavorites : [],
    vaultNotes: raw.vaultNotes && typeof raw.vaultNotes === 'object' ? { ...raw.vaultNotes } : {},
    customVaultItems: Array.isArray(raw.customVaultItems) ? raw.customVaultItems : [],
    customFlashcards: Array.isArray(raw.customFlashcards) ? raw.customFlashcards : [],
    flashcardProgress:
      raw.flashcardProgress && typeof raw.flashcardProgress === 'object' ? { ...raw.flashcardProgress } : {},
    savedWords: Array.isArray(raw.savedWords) ? raw.savedWords : [],
    reframeLog: Array.isArray(raw.reframeLog) ? raw.reframeLog : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    modulePrefs: {
      reader: { ...base.modulePrefs.reader, ...(mp.reader ?? {}) },
      studio: { ...base.modulePrefs.studio, ...(mp.studio ?? {}) },
      calligraphy: { ...base.modulePrefs.calligraphy, ...(mp.calligraphy ?? {}) },
      typing: { ...base.modulePrefs.typing, ...(mp.typing ?? {}) },
      language: { ...base.modulePrefs.language, ...(mp.language ?? {}) },
      mindset: { ...base.modulePrefs.mindset, ...(mp.mindset ?? {}) },
      vault: { ...base.modulePrefs.vault, ...(mp.vault ?? {}) },
      focuslab: { ...base.modulePrefs.focuslab, ...(mp.focuslab ?? {}) },
      singing: {
        lastDrillId: singingPrefs.lastDrillId || base.modulePrefs.singing.lastDrillId,
        level:
          singingPrefs.level === 1 || singingPrefs.level === 2 || singingPrefs.level === 3
            ? singingPrefs.level
            : 1,
        timbre:
          singingPrefs.timbre === 'piano' ||
          singingPrefs.timbre === 'organ' ||
          singingPrefs.timbre === 'soft'
            ? singingPrefs.timbre
            : 'piano',
      },
      calm: normalizeCalmPrefs(mp.calm, base.modulePrefs.calm),
      drawing: normalizeDrawingPrefs(mp.drawing, base.modulePrefs.drawing),
    },
    progress: normalizeLearningProgress(raw.progress),
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

class LifeStore {
  private profile: LifeProfile;
  private listeners = new Set<() => void>();
  private pushTimer = 0;

  constructor() {
    this.profile = this.load();
    this.rolloverDay();
  }

  private load(): LifeProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfile();
      return normalizeProfile(JSON.parse(raw) as Partial<LifeProfile>);
    } catch {
      return defaultProfile();
    }
  }

  private save(syncCloud = true): void {
    this.profile.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      localStorage.setItem('umbral-theme', this.profile.theme === 'night' ? 'dark' : 'light');
    } catch {
      // Ignore storage quota issues
    }
    this.listeners.forEach((fn) => fn());
    if (syncCloud && cloudSync.isConfigured()) {
      window.clearTimeout(this.pushTimer);
      this.pushTimer = window.setTimeout(() => {
        void cloudSync.pushScope('atelier_profile', this.profile, this.profile.updatedAt);
      }, 650);
    }
  }

  public async pushNow(): Promise<boolean> {
    if (!cloudSync.isConfigured()) return false;
    return cloudSync.pushScope('atelier_profile', this.profile, this.profile.updatedAt || Date.now());
  }

  public applyRemote(raw: Partial<LifeProfile>, remoteUpdatedAt: number, force = false): boolean {
    const clean = normalizeProfile({ ...raw, updatedAt: remoteUpdatedAt || raw.updatedAt });
    if (!force && clean.updatedAt <= this.profile.updatedAt) return false;
    // Device theme (`umbral-theme`) takes precedence over cloud profile theme
    let deviceTheme: ThemeMode | null = null;
    try {
      const storedEco = normalizeEcoTheme(localStorage.getItem(ECO_THEME_KEY));
      if (storedEco) deviceTheme = storedEco === 'dark' ? 'night' : 'day';
    } catch {
      // Ignore storage error
    }
    this.profile = clean;
    if (deviceTheme) {
      this.profile.theme = deviceTheme;
    }
    this.rolloverDay(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      localStorage.setItem(ECO_THEME_KEY, this.profile.theme === 'night' ? 'dark' : 'light');
    } catch {
      // Ignore storage quota issues
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.profile.theme);
    }
    this.listeners.forEach((fn) => fn());
    return true;
  }

  public applyIncomingEcoTheme(): ThemeMode {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const param = normalizeEcoTheme(url.searchParams.get('eco_theme'));
        if (param) {
          localStorage.setItem(ECO_THEME_KEY, param);
          this.profile.theme = param === 'dark' ? 'night' : 'day';
          url.searchParams.delete('eco_theme');
          const clean = `${url.pathname}${url.search}${url.hash}`;
          window.history.replaceState(null, '', clean || './');
        } else {
          const stored = normalizeEcoTheme(localStorage.getItem(ECO_THEME_KEY));
          if (stored) {
            this.profile.theme = stored === 'dark' ? 'night' : 'day';
            if (localStorage.getItem(ECO_THEME_KEY) !== stored) {
              localStorage.setItem(ECO_THEME_KEY, stored);
            }
          } else {
            localStorage.setItem(ECO_THEME_KEY, this.profile.theme === 'night' ? 'dark' : 'light');
          }
        }
      } catch {
        // Ignore URL/storage errors
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.profile.theme);
    }
    return this.profile.theme;
  }

  public syncThemeFromStorage(): boolean {
    try {
      const stored = normalizeEcoTheme(localStorage.getItem(ECO_THEME_KEY));
      if (!stored) return false;
      const next: ThemeMode = stored === 'dark' ? 'night' : 'day';
      if (next !== this.profile.theme) {
        this.profile.theme = next;
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next);
        }
        this.listeners.forEach((fn) => fn());
        return true;
      }
    } catch {
      // Ignore storage error
    }
    return false;
  }

  public replaceAll(raw: Partial<LifeProfile>): void {
    this.profile = normalizeProfile(raw);
    this.save(true);
  }

  private rolloverDay(sync = true): void {
    const today = todayStamp();
    if (this.profile.lastActiveDay && this.profile.lastActiveDay !== today) {
      const prev = new Date(this.profile.lastActiveDay);
      const curr = new Date(today);
      const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 1) {
        this.profile.dailyStreak = 0;
      }
      this.profile.todayHabits = emptyHabits();
      this.save(sync);
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public get(): LifeProfile {
    return this.profile;
  }

  public updateModulePrefs<K extends keyof ModulePreferences>(
    moduleKey: K,
    patch: Partial<ModulePreferences[K]>
  ): void {
    this.profile.modulePrefs[moduleKey] = {
      ...this.profile.modulePrefs[moduleKey],
      ...patch,
    };
    this.save();
  }

  public setTheme(theme: ThemeMode): void {
    this.profile.theme = theme;
    this.save();
  }

  public setDeviceMode(deviceMode: DeviceProfile): void {
    this.profile.deviceMode = deviceMode;
    this.save();
  }

  public recordTyping(mode: 'pc' | 'mobile', wpm: number): void {
    const cleanWpm = Math.max(0, Math.round(wpm));
    if (mode === 'pc' && cleanWpm > this.profile.stats.bestWpmPc) {
      this.profile.stats.bestWpmPc = cleanWpm;
    }
    if (mode === 'mobile' && cleanWpm > this.profile.stats.bestWpmMobile) {
      this.profile.stats.bestWpmMobile = cleanWpm;
    }
    this.markHabit('typing');
    this.save();
  }

  public setReaderFontSize(px: number): void {
    this.profile.readerFontSize = Math.max(15, Math.min(26, px));
    this.save();
  }

  public markHabit(key: HabitKey): void {
    const today = todayStamp();
    const hadAnyToday = Object.values(this.profile.todayHabits).some(Boolean);
    this.profile.todayHabits[key] = true;
    if (!hadAnyToday && this.profile.lastActiveDay !== today) {
      this.profile.dailyStreak += 1;
    }
    this.profile.lastActiveDay = today;
    this.save();
  }

  public toggleFavoritePhrase(id: string): boolean {
    const idx = this.profile.favoritePhraseIds.indexOf(id);
    if (idx >= 0) {
      this.profile.favoritePhraseIds.splice(idx, 1);
      this.save();
      return false;
    }
    this.profile.favoritePhraseIds.unshift(id);
    this.markHabit('mindset');
    this.save();
    return true;
  }

  public addCustomPhrase(input: Omit<PhraseItem, 'id' | 'isCustom'>): PhraseItem {
    const item: PhraseItem = {
      ...input,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
    };
    this.profile.customPhrases.unshift(item);
    this.profile.favoritePhraseIds.unshift(item.id);
    this.markHabit('mindset');
    this.save();
    return item;
  }

  public removeCustomPhrase(id: string): void {
    this.profile.customPhrases = this.profile.customPhrases.filter((p) => p.id !== id);
    this.profile.favoritePhraseIds = this.profile.favoritePhraseIds.filter((fid) => fid !== id);
    this.save();
  }

  public setVaultStatus(id: string, status: VaultStatus): void {
    if (status === 'pending') {
      delete this.profile.vaultStatuses[id];
    } else {
      this.profile.vaultStatuses[id] = status;
    }
    this.save();
  }

  public toggleVaultFavorite(id: string): boolean {
    const idx = this.profile.vaultFavorites.indexOf(id);
    if (idx >= 0) {
      this.profile.vaultFavorites.splice(idx, 1);
      this.save();
      return false;
    }
    this.profile.vaultFavorites.unshift(id);
    this.save();
    return true;
  }

  public setVaultNote(id: string, note: string): void {
    const clean = note.trim();
    if (!clean) {
      delete this.profile.vaultNotes[id];
    } else {
      this.profile.vaultNotes[id] = clean;
    }
    this.save();
  }

  public addCustomVaultItem(input: Omit<VaultItem, 'id' | 'isCustom' | 'createdAt'>): VaultItem {
    const item: VaultItem = {
      ...input,
      id: `vcustom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
      createdAt: Date.now(),
    };
    this.profile.customVaultItems.unshift(item);
    this.save();
    return item;
  }

  public importCustomVaultItems(
    inputs: Omit<VaultItem, 'id' | 'isCustom' | 'createdAt'>[],
    existingUrls: Set<string>
  ): number {
    let added = 0;
    const seen = new Set(existingUrls);
    for (const c of this.profile.customVaultItems) {
      if (c.url) seen.add(c.url.trim().split('?')[0]);
    }
    for (const inp of inputs) {
      const cleanUrl = (inp.url || '').trim().split('?')[0];
      if (cleanUrl && seen.has(cleanUrl)) continue;
      if (cleanUrl) seen.add(cleanUrl);
      this.profile.customVaultItems.unshift({
        ...inp,
        url: cleanUrl || inp.url,
        id: `vcustom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        isCustom: true,
        createdAt: Date.now(),
      });
      added++;
    }
    if (added > 0) this.save();
    return added;
  }

  public removeCustomVaultItem(id: string): void {
    this.profile.customVaultItems = this.profile.customVaultItems.filter((v) => v.id !== id);
    this.profile.vaultFavorites = this.profile.vaultFavorites.filter((fid) => fid !== id);
    delete this.profile.vaultStatuses[id];
    delete this.profile.vaultNotes[id];
    this.save();
  }

  public promoteVaultToPhrase(item: VaultItem, category: PhraseItem['category']): PhraseItem {
    const note = this.profile.vaultNotes[item.id] || '';
    const phrase = this.addCustomPhrase({
      category,
      quote: item.title.replace(/…$/, ''),
      author: 'Baúl de Guardados',
      meaning: note || item.summary,
      whenToUse: 'Cuando quieras recordar o aplicar esta idea guardada.',
      dailyAction: 'Aplícalo hoy una vez y marca el recurso como aplicado.',
      sourceUrl: item.url,
    });
    this.profile.vaultStatuses[item.id] = 'applied';
    this.save();
    return phrase;
  }

  public saveWord(word: string, definition: string): void {
    const clean = word.trim().toLowerCase();
    if (!clean) return;
    const exists = this.profile.savedWords.some((w) => w.word.toLowerCase() === clean);
    if (!exists) {
      const item: SavedWord = { word: word.trim(), definition, addedAt: Date.now() };
      this.profile.savedWords.unshift(item);
      this.profile.savedWords = this.profile.savedWords.slice(0, 120);
    }
    this.markHabit('language');
    this.save();
  }

  public removeWord(word: string): void {
    this.profile.savedWords = this.profile.savedWords.filter(
      (w) => w.word.toLowerCase() !== word.toLowerCase()
    );
    this.save();
  }

  public recordOrthography(correct: boolean): void {
    this.profile.stats.orthographyTotal += 1;
    if (correct) this.profile.stats.orthographyCorrect += 1;
    this.markHabit('language');
    this.save();
  }

  public recordCalligraphySheet(): void {
    this.profile.stats.calligraphySheets += 1;
    this.markHabit('calligraphy');
    this.save();
  }

  public recordDrawingSheet(): void {
    this.profile.stats.drawingSheets += 1;
    this.markHabit('drawing');
    this.save();
  }

  public recordCalmSession(): void {
    this.profile.stats.calmSessions += 1;
    this.markHabit('calm');
    this.save();
  }

  public recordSingingAccuracy(centsAbs: number): void {
    const prev = this.profile.stats.singingBestCents;
    if (prev === null || centsAbs < prev) {
      this.profile.stats.singingBestCents = Math.round(centsAbs);
    }
    this.markHabit('singing');
    this.save();
  }

  public recordVocalRange(lowMidi: number | null, highMidi: number | null): void {
    if (lowMidi !== null) this.profile.stats.vocalRangeLow = Math.round(lowMidi);
    if (highMidi !== null) this.profile.stats.vocalRangeHigh = Math.round(highMidi);
    this.markHabit('singing');
    this.save();
  }

  public recordSingingSongScore(songId: string, pct: number): void {
    const clean = Math.max(0, Math.min(100, Math.round(pct)));
    const prev = this.profile.stats.singingSongBest[songId] ?? 0;
    if (clean > prev) {
      this.profile.stats.singingSongBest[songId] = clean;
    }
    this.markHabit('singing');
    this.save();
  }

  public addReframe(worry: string, control: string, nextStep: string): void {
    const entry: ReframeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      worry: worry.trim(),
      control: control.trim(),
      nextStep: nextStep.trim(),
      createdAt: Date.now(),
    };
    this.profile.reframeLog.unshift(entry);
    this.profile.reframeLog = this.profile.reframeLog.slice(0, 60);
    this.recordCalmSession();
  }

  public saveBookmark(bookmark: Omit<BookBookmark, 'updatedAt'>): void {
    this.profile.bookmarks = this.profile.bookmarks.filter((b) => b.title !== bookmark.title);
    this.profile.bookmarks.unshift({ ...bookmark, updatedAt: Date.now() });
    this.profile.bookmarks = this.profile.bookmarks.slice(0, 30);
    this.markHabit('read');
    this.save();
  }

  public recordOratorySession(): void {
    this.profile.stats.oratorySessions += 1;
    this.markHabit('focuslab');
    this.save();
  }

  public recordSchulteTime(ms: number, size: 4 | 5 | 6): void {
    if (size === 5) {
      const prev = this.profile.stats.schulteBestMs;
      if (prev === null || ms < prev) {
        this.profile.stats.schulteBestMs = Math.round(ms);
      }
    }
    this.markHabit('focuslab');
    this.save();
  }

  public reviewFlashcard(id: string, rating: 'again' | 'good' | 'easy'): void {
    const cur = this.profile.flashcardProgress[id] ?? { nextReviewAt: 0, intervalDays: 0, reps: 0 };
    const nextReps = rating === 'again' ? 0 : cur.reps + 1;
    const intervalDays =
      rating === 'again'
        ? 0
        : rating === 'good'
          ? Math.max(2, cur.intervalDays * 2 || 2)
          : Math.max(5, cur.intervalDays * 3 || 5);
    const nextReviewAt =
      intervalDays === 0
        ? Date.now() + 10 * 60 * 1000
        : Date.now() + intervalDays * 24 * 3600 * 1000;
    this.profile.flashcardProgress[id] = { nextReviewAt, intervalDays, reps: nextReps };
    this.profile.stats.recallReviewed += 1;
    this.markHabit('focuslab');
    this.save();
  }

  public addCustomFlashcard(deck: string, front: string, back: string): FlashcardItem {
    const item: FlashcardItem = {
      id: `fcc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deck: deck.trim() || 'Mis Tarjetas',
      front: front.trim(),
      back: back.trim(),
      source: 'Tarjeta propia',
      isCustom: true,
    };
    this.profile.customFlashcards.unshift(item);
    this.save();
    return item;
  }

  public removeCustomFlashcard(id: string): void {
    this.profile.customFlashcards = this.profile.customFlashcards.filter((c) => c.id !== id);
    delete this.profile.flashcardProgress[id];
    this.save();
  }

  /* ==================== UNIFIED DIDACTIC PROGRESS & DIFFICULTY ==================== */

  public getDifficulty(mod: PracticeModuleId): DifficultyLevel {
    return this.profile.progress.difficulty[mod] ?? 'intermedio';
  }

  public setDifficulty(mod: PracticeModuleId, level: DifficultyLevel): void {
    this.profile.progress.difficulty[mod] = level;
    if (mod === 'singing') {
      this.profile.modulePrefs.singing.level = level === 'basico' ? 1 : level === 'intermedio' ? 2 : 3;
    }
    this.save();
  }

  public updateProgress<
    K extends Exclude<keyof LearningProgress, 'tutorialsDone' | 'tutorialsOpen' | 'difficulty' | 'activity'>,
  >(section: K, patch: Partial<LearningProgress[K]>): void {
    this.profile.progress[section] = {
      ...this.profile.progress[section],
      ...patch,
    } as LearningProgress[K];
    this.save();
  }

  public describeModuleState(moduleId: PracticeModuleId): { label: string; detail: string } {
    const p = this.profile;
    const pr = p.progress;
    const diff = pr.difficulty[moduleId] ?? 'intermedio';
    const diffName = diff === 'basico' ? 'Básico' : diff === 'intermedio' ? 'Intermedio' : 'Avanzado';

    switch (moduleId) {
      case 'studio': {
        const mode = pr.studio.mode === 'plantilla' ? 'Plantillas didácticas' : pr.studio.mode === 'repaso' ? 'Checklist de estudio' : 'Hoja libre';
        return {
          label: `Cuaderno y PDF · ${mode}`,
          detail: `Página ${p.modulePrefs.studio.currentPage} · Dificultad ${diffName}`,
        };
      }
      case 'reader': {
        const title = p.modulePrefs.reader.lastArticleTitle;
        const pct = title ? pr.reader.scrollByTitle[title] : undefined;
        return {
          label: title ? `Lectura · ${title.slice(0, 48)}` : 'Biblioteca y Lector',
          detail:
            typeof pct === 'number' && pct > 0
              ? `Avance ${pct}% · ${pr.reader.readArticles.length} textos completados`
              : `Modo ${pr.reader.mode} · Dificultad ${diffName}`,
        };
      }
      case 'calligraphy': {
        const mode = pr.calligraphy.modeExtra;
        const idx = p.modulePrefs.calligraphy.sampleIdx + 1;
        return {
          label: `Caligrafía · ${mode} (muestra ${idx})`,
          detail: `${pr.calligraphy.completedTemplates.length} muestras dominadas · ${diffName}`,
        };
      }
      case 'drawing': {
        const mode = pr.drawing.modeExtra;
        const drafts = Object.keys(pr.drawing.savedDrafts).length;
        return {
          label:
            mode === 'challenge'
              ? 'Taller de Dibujo · Retos creativos'
              : mode === 'free'
                ? 'Taller de Dibujo · Lienzo libre'
                : `Taller de Dibujo · ${p.modulePrefs.drawing.lessonId}`,
          detail: `${pr.drawing.completedLessons.length}/56 láminas · ${drafts} borrador(es) · ${diffName}`,
        };
      }
      case 'typing': {
        const mode = p.deviceMode === 'mobile' ? pr.typing.mobileExtraMode : pr.typing.pcExtraMode;
        return {
          label: `Mecanografía · Modo ${mode}`,
          detail: `Récord PC ${p.stats.bestWpmPc} / Móvil ${p.stats.bestWpmMobile} PPM · ${diffName}`,
        };
      }
      case 'language': {
        const missed = pr.language.missedOrthoIds.length;
        return {
          label: `Ortografía y Léxico · ${p.modulePrefs.language.tab === 'vocab' ? 'Vocabulario' : p.modulePrefs.language.tab === 'dict' ? 'Diccionario' : 'Ortografía'}`,
          detail:
            missed > 0
              ? `${missed} fallo(s) por repasar · ${pr.language.masteredOrthoIds.length} dominadas`
              : `${pr.language.masteredOrthoIds.length} reglas dominadas · ${diffName}`,
        };
      }
      case 'mindset':
        return {
          label: `Frases y Criterio · ${pr.mindset.mode === 'reto_hoy' ? 'Reto de hoy' : pr.mindset.mode === 'reflexion' ? 'Diario de reflexión' : 'Cuaderno'}`,
          detail: `${pr.mindset.completedActionIds.length} acciones cumplidas · ${Object.keys(pr.mindset.reflections).length} reflexiones`,
        };
      case 'focuslab': {
        const tabLabel =
          p.modulePrefs.focuslab.tab === 'schulte'
            ? `Schulte ${p.modulePrefs.focuslab.schulteSize}x${p.modulePrefs.focuslab.schulteSize} (${pr.focuslab.schulteMode})`
            : p.modulePrefs.focuslab.tab === 'recall'
              ? `Evocación Activa (${pr.focuslab.recallMode})`
              : 'Oratoria y Dicción';
        return {
          label: `Oratoria y Enfoque · ${tabLabel}`,
          detail: `${p.stats.oratorySessions} exposiciones · ${p.stats.recallReviewed} evocaciones`,
        };
      }
      case 'singing': {
        const tab = pr.singing.activeTab;
        return {
          label: `Estudio de Canto · ${tab === 'karaoke' ? 'Karaoke guiado' : tab === 'ear' ? `Oído (${pr.singing.earMode})` : 'Rutinas vocales'}`,
          detail: `${Object.keys(p.stats.singingSongBest).length} canciones · Oído ${pr.singing.earCorrect}/${pr.singing.earTotal}`,
        };
      }
      case 'calm': {
        const tab = pr.calm.activeTab;
        return {
          label: `Centro de Calma · ${tab === 'sos' ? 'SOS Pánico' : tab === 'checkin' ? 'Registro emocional' : 'Reencuadre'}`,
          detail: `${p.stats.calmSessions} sesiones · ${pr.calm.checkins.length} registros emocionales`,
        };
      }
    }
  }

  public recordModuleVisit(moduleId: PracticeModuleId, customLabel?: string, customDetail?: string): void {
    const now = Date.now();
    const desc = this.describeModuleState(moduleId);
    const entry: ModuleActivityEntry = {
      moduleId,
      at: now,
      label: customLabel || desc.label,
      detail: customDetail || desc.detail,
    };
    const act = this.profile.progress.activity;
    act.lastModule = moduleId;
    act.lastVisitedAt = now;
    act.recent = [entry, ...act.recent.filter((x) => x.moduleId !== moduleId)].slice(0, 6);
    this.save();
  }

  public isTutorialOpen(id: string): boolean {
    return Boolean(this.profile.progress.tutorialsOpen[id]);
  }

  public setTutorialOpen(id: string, open: boolean): void {
    this.profile.progress.tutorialsOpen[id] = open;
    this.save();
  }

  public isTutorialDone(id: string): boolean {
    return this.profile.progress.tutorialsDone.includes(id);
  }

  public toggleTutorialDone(id: string): boolean {
    const arr = this.profile.progress.tutorialsDone;
    const idx = arr.indexOf(id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      this.save();
      return false;
    }
    arr.push(id);
    this.save();
    return true;
  }

  public recordCalligraphyMastery(
    templateId: string,
    scorePct: number,
    strokes?: SavedCalligraphyStroke[]
  ): void {
    const clean = Math.max(0, Math.min(100, Math.round(scorePct)));
    const prev = this.profile.progress.calligraphy.mastery[templateId] ?? 0;
    if (clean > prev) this.profile.progress.calligraphy.mastery[templateId] = clean;
    if (clean >= 70 && !this.profile.progress.calligraphy.completedTemplates.includes(templateId)) {
      this.profile.progress.calligraphy.completedTemplates.push(templateId);
    }
    if (strokes) {
      this.saveCalligraphyStrokes(templateId, strokes);
      return;
    }
    this.recordCalligraphySheet();
  }

  public saveCalligraphyStrokes(templateId: string, strokes: SavedCalligraphyStroke[]): void {
    const map = this.profile.progress.calligraphy.savedStrokes;
    if (strokes.length === 0) {
      delete map[templateId];
    } else {
      map[templateId] = strokes.slice(-60);
      const keys = Object.keys(map);
      while (keys.length > 6) {
        const oldest = keys.shift();
        if (oldest && oldest !== templateId) delete map[oldest];
      }
    }
    this.save();
  }

  public recordDrawingMastery(lessonId: string, scorePct: number): void {
    const clean = Math.max(0, Math.min(100, Math.round(scorePct)));
    const prev = this.profile.progress.drawing.mastery[lessonId] ?? 0;
    if (clean > prev) this.profile.progress.drawing.mastery[lessonId] = clean;
    if (clean >= 65 && !this.profile.progress.drawing.completedLessons.includes(lessonId)) {
      this.profile.progress.drawing.completedLessons.push(lessonId);
    }
    this.recordDrawingSheet();
  }

  public recordDrawingChallenge(challengeId: string): void {
    if (!this.profile.progress.drawing.completedChallenges.includes(challengeId)) {
      this.profile.progress.drawing.completedChallenges.push(challengeId);
    }
    this.recordDrawingSheet();
  }

  public saveDrawingDraft(key: string, strokes: SavedCanvasStroke[]): void {
    const map = this.profile.progress.drawing.savedDrafts;
    if (strokes.length === 0) {
      delete map[key];
    } else {
      map[key] = strokes.slice(-120);
      const keys = Object.keys(map);
      while (keys.length > 4) {
        const oldest = keys.shift();
        if (oldest && oldest !== key) delete map[oldest];
      }
    }
    this.save();
  }

  public recordTypingSession(
    device: 'pc' | 'mobile',
    mode: string,
    difficulty: DifficultyLevel,
    wpm: number,
    acc: number,
    mistakeChars: Record<string, number>,
    sampleId?: string
  ): void {
    const cleanWpm = Math.max(0, Math.round(wpm));
    const cleanAcc = Math.max(0, Math.min(100, Math.round(acc)));
    if (cleanAcc >= 80) {
      if (device === 'pc' && cleanWpm > this.profile.stats.bestWpmPc) {
        this.profile.stats.bestWpmPc = cleanWpm;
      }
      if (device === 'mobile' && cleanWpm > this.profile.stats.bestWpmMobile) {
        this.profile.stats.bestWpmMobile = cleanWpm;
      }
    }
    for (const [ch, cnt] of Object.entries(mistakeChars)) {
      if (!ch || cnt <= 0) continue;
      this.profile.progress.typing.keyErrors[ch] =
        (this.profile.progress.typing.keyErrors[ch] ?? 0) + cnt;
    }
    if (sampleId && cleanAcc >= 80 && !this.profile.progress.typing.completedIds.includes(sampleId)) {
      this.profile.progress.typing.completedIds.push(sampleId);
    }
    const entry: TypingHistoryEntry = {
      at: Date.now(),
      mode,
      difficulty,
      wpm: cleanWpm,
      acc: cleanAcc,
    };
    this.profile.progress.typing.history.unshift(entry);
    this.profile.progress.typing.history = this.profile.progress.typing.history.slice(0, 30);
    this.markHabit('typing');
    this.save();
  }

  public recordOrthoResult(qId: string, correct: boolean): void {
    const lang = this.profile.progress.language;
    if (correct) {
      if (!lang.masteredOrthoIds.includes(qId)) lang.masteredOrthoIds.push(qId);
      lang.missedOrthoIds = lang.missedOrthoIds.filter((x) => x !== qId);
    } else {
      if (!lang.missedOrthoIds.includes(qId)) lang.missedOrthoIds.push(qId);
    }
    this.recordOrthography(correct);
  }

  public recordOrthoExam(scorePct: number): void {
    const clean = Math.max(0, Math.min(100, Math.round(scorePct)));
    if (clean > this.profile.progress.language.bestExamScore) {
      this.profile.progress.language.bestExamScore = clean;
    }
    this.markHabit('language');
    this.save();
  }

  public recordVocabMastered(word: string): void {
    const norm = word.trim().toLowerCase();
    if (!norm) return;
    if (!this.profile.progress.language.vocabMastered.includes(norm)) {
      this.profile.progress.language.vocabMastered.push(norm);
    }
    this.markHabit('language');
    this.save();
  }

  public setWordNote(word: string, note: string): void {
    const key = word.trim().toLowerCase();
    if (!key) return;
    const clean = note.trim();
    if (!clean) delete this.profile.progress.language.wordNotes[key];
    else this.profile.progress.language.wordNotes[key] = clean;
    this.save();
  }

  public recordReaderArticle(title: string, wordsCount = 0, quizScore?: number): void {
    const clean = title.trim();
    if (!clean) return;
    const r = this.profile.progress.reader;
    if (!r.readArticles.includes(clean)) r.readArticles.push(clean);
    if (wordsCount > 0) r.wordsRead += Math.round(wordsCount);
    if (typeof quizScore === 'number') {
      const prev = r.quizScores[clean] ?? 0;
      r.quizScores[clean] = Math.max(prev, Math.round(quizScore));
    }
    this.markHabit('read');
    this.save();
  }

  public saveReaderScroll(title: string, pct: number): void {
    if (!title.trim()) return;
    this.profile.progress.reader.scrollByTitle[title.trim()] = Math.max(
      0,
      Math.min(100, Math.round(pct))
    );
    this.save();
  }

  public saveReaderNote(title: string, note: string): void {
    const key = title.trim();
    if (!key) return;
    const clean = note.trim();
    if (!clean) delete this.profile.progress.reader.readingNotes[key];
    else this.profile.progress.reader.readingNotes[key] = clean;
    this.markHabit('read');
    this.save();
  }

  public toggleMindsetAction(phraseId: string): boolean {
    const arr = this.profile.progress.mindset.completedActionIds;
    const idx = arr.indexOf(phraseId);
    if (idx >= 0) {
      arr.splice(idx, 1);
      this.save();
      return false;
    }
    arr.push(phraseId);
    this.profile.progress.mindset.dailyCheckins += 1;
    this.markHabit('mindset');
    this.save();
    return true;
  }

  public saveMindsetReflection(phraseId: string, text: string): void {
    const clean = text.trim();
    if (!clean) {
      delete this.profile.progress.mindset.reflections[phraseId];
    } else {
      this.profile.progress.mindset.reflections[phraseId] = clean;
      this.markHabit('mindset');
    }
    this.save();
  }

  public recordVaultReview(itemId: string): void {
    const today = todayStamp();
    const v = this.profile.progress.vault;
    if (v.lastReviewDay !== today) {
      v.reviewedToday = 0;
      v.lastReviewDay = today;
    }
    v.reviewedToday += 1;
    if (!this.profile.vaultStatuses[itemId]) {
      this.profile.vaultStatuses[itemId] = 'seen';
    }
    this.save();
  }

  public saveVaultActionPlan(itemId: string, plan: string): void {
    const clean = plan.trim();
    if (!clean) delete this.profile.progress.vault.actionPlans[itemId];
    else {
      this.profile.progress.vault.actionPlans[itemId] = clean;
      this.profile.vaultStatuses[itemId] = 'applied';
    }
    this.save();
  }

  public markVaultPromoted(itemId: string): void {
    if (!this.profile.progress.vault.promotedIds.includes(itemId)) {
      this.profile.progress.vault.promotedIds.push(itemId);
      this.save();
    }
  }

  public recordSchulteRun(mode: 'normal' | 'inverso' | 'doble', size: 4 | 5 | 6, ms: number): void {
    const cleanMs = Math.max(100, Math.round(ms));
    const key = `${mode}_${size}x${size}`;
    const prev = this.profile.progress.focuslab.schulteBestByKey[key];
    if (prev === undefined || cleanMs < prev) {
      this.profile.progress.focuslab.schulteBestByKey[key] = cleanMs;
    }
    if (mode === 'normal' && size === 5) {
      this.recordSchulteTime(cleanMs, 5);
    } else {
      this.markHabit('focuslab');
      this.save();
    }
  }

  public recordOratoryHistory(entry: Omit<OratorySessionEntry, 'at'>): void {
    this.profile.progress.focuslab.oratoryHistory.unshift({ ...entry, at: Date.now() });
    this.profile.progress.focuslab.oratoryHistory =
      this.profile.progress.focuslab.oratoryHistory.slice(0, 30);
    this.recordOratorySession();
  }

  public saveRecallDraft(cardId: string, text: string): void {
    const clean = text.trim();
    if (!clean) delete this.profile.progress.focuslab.recallDrafts[cardId];
    else this.profile.progress.focuslab.recallDrafts[cardId] = clean;
    this.save();
  }

  public recordSingingVowel(vowel: string): void {
    if (!this.profile.progress.singing.vowelsCompleted.includes(vowel)) {
      this.profile.progress.singing.vowelsCompleted.push(vowel);
    }
    this.markHabit('singing');
    this.save();
  }

  public recordSingingJump(jumpId: string): void {
    if (!this.profile.progress.singing.jumpsVerified.includes(jumpId)) {
      this.profile.progress.singing.jumpsVerified.push(jumpId);
    }
    this.markHabit('singing');
    this.save();
  }

  public recordSingingDrillMastery(drillId: string, scorePct: number): void {
    const clean = Math.max(0, Math.min(100, Math.round(scorePct)));
    const prev = this.profile.progress.singing.drillsMastered[drillId] ?? 0;
    if (clean > prev) this.profile.progress.singing.drillsMastered[drillId] = clean;
    this.markHabit('singing');
    this.save();
  }

  public recordSingingEar(correct: boolean): void {
    const s = this.profile.progress.singing;
    s.earTotal += 1;
    if (correct) {
      s.earCorrect += 1;
      s.earStreak += 1;
    } else {
      s.earStreak = 0;
    }
    this.markHabit('singing');
    this.save();
  }

  public recordSingingWarmup(): void {
    this.profile.progress.singing.warmupCount += 1;
    this.markHabit('singing');
    this.save();
  }

  public addCalmCheckin(entry: Omit<CalmCheckinEntry, 'at'>): void {
    this.profile.progress.calm.checkins.unshift({ ...entry, at: Date.now() });
    this.profile.progress.calm.checkins = this.profile.progress.calm.checkins.slice(0, 60);
    this.recordCalmSession();
  }

  public deleteReframe(id: string): void {
    this.profile.reframeLog = this.profile.reframeLog.filter((r) => r.id !== id);
    this.save();
  }

  public getOverallMasterySummary(): {
    totalXp: number;
    level: number;
    nextLevelXp: number;
    levelPct: number;
    byModule: Record<PracticeModuleId, number>;
  } {
    const p = this.profile;
    const pr = p.progress;
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

    const byModule: Record<PracticeModuleId, number> = {
      reader: clamp(
        (pr.reader.readArticles.length * 10 + p.bookmarks.length * 4 + Object.keys(pr.reader.quizScores).length * 8)
      ),
      studio: clamp(
        pr.studio.templatesApplied * 12 +
          Object.values(pr.studio.studyChecklist).filter(Boolean).length * 8 +
          (p.todayHabits.studio ? 15 : 0)
      ),
      calligraphy: clamp((pr.calligraphy.completedTemplates.length / 40) * 100),
      drawing: clamp(((pr.drawing.completedLessons.length + pr.drawing.completedChallenges.length) / 56) * 100),
      typing: clamp(
        Math.min(60, (p.stats.bestWpmPc / 80) * 40 + (p.stats.bestWpmMobile / 50) * 20) +
          Math.min(40, pr.typing.completedIds.length * 2.5)
      ),
      language: clamp(
        (pr.language.masteredOrthoIds.length / 80) * 65 +
          (pr.language.vocabMastered.length / 36) * 35
      ),
      mindset: clamp(
        (pr.mindset.completedActionIds.length * 4 +
          Object.keys(pr.mindset.reflections).length * 6 +
          p.favoritePhraseIds.length * 2)
      ),
      focuslab: clamp(
        p.stats.oratorySessions * 6 +
          Object.keys(pr.focuslab.schulteBestByKey).length * 8 +
          p.stats.recallReviewed * 1.5
      ),
      singing: clamp(
        Object.keys(p.stats.singingSongBest).length * 4 +
          Object.keys(pr.singing.drillsMastered).length * 4 +
          pr.singing.vowelsCompleted.length * 4 +
          Math.min(24, pr.singing.earCorrect * 1.2)
      ),
      calm: clamp(
        p.stats.calmSessions * 5 + p.reframeLog.length * 5 + pr.calm.checkins.length * 6
      ),
    };

    const totalXp = Math.round(
      Object.values(byModule).reduce((a, b) => a + b * 12, 0) +
        p.dailyStreak * 30 +
        pr.tutorialsDone.length * 15
    );
    const level = Math.max(1, Math.floor(totalXp / 250) + 1);
    const curBase = (level - 1) * 250;
    const nextLevelXp = level * 250;
    const levelPct = clamp(((totalXp - curBase) / 250) * 100);

    return { totalXp, level, nextLevelXp, levelPct, byModule };
  }
}

export const lifeStore = new LifeStore();
