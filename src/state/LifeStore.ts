import { cloudSync } from '../services/CloudSync.ts';
import type {
  AntiHabitEntry,
  BodyZoneId,
  BookBookmark,
  BragLogEntry,
  CalmCheckinEntry,
  CalmPatternId,
  CompassDailyLog,
  CompassOkrGoal,
  CompassWheelSnapshot,
  CreativeIdeaEntry,
  DeviceProfile,
  DifficultyLevel,
  DrawingGridMode,
  DrawingSymmetry,
  FinanceGoal,
  FinanceTransaction,
  FlashcardItem,
  FlashcardProgress,
  HabitKey,
  InterviewSessionEntry,
  LearningProgress,
  LifeProfile,
  ModuleActivityEntry,
  ModulePreferences,
  OratorySessionEntry,
  PhraseItem,
  PracticeModuleId,
  ReaderClosureEntry,
  ReframeEntry,
  SavedCalligraphyStroke,
  SavedCanvasStroke,
  SavedDecisionMatrix,
  SavedWord,
  Sm2Rating,
  ThemeMode,
  TypingHistoryEntry,
  VaultItem,
  VaultStatus,
  VitalityDayLog,
} from '../types.ts';

export function computeSm2Review(
  cur: FlashcardProgress | undefined,
  rating: Sm2Rating,
  now = Date.now()
): Required<FlashcardProgress> {
  const prevEf = typeof cur?.easeFactor === 'number' && Number.isFinite(cur.easeFactor) ? cur.easeFactor : 2.5;
  const prevInterval = typeof cur?.intervalDays === 'number' && Number.isFinite(cur.intervalDays) ? Math.max(0, cur.intervalDays) : 0;
  const prevReps = typeof cur?.reps === 'number' && Number.isFinite(cur.reps) ? Math.max(0, Math.floor(cur.reps)) : 0;
  const prevLapses = typeof cur?.lapses === 'number' && Number.isFinite(cur.lapses) ? Math.max(0, Math.floor(cur.lapses)) : 0;

  // Map 4 buttons to SM-2 quality q: again=1, hard=3, good=4, easy=5
  const q = rating === 'again' ? 1 : rating === 'hard' ? 3 : rating === 'good' ? 4 : 5;
  let ef = prevEf + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ef = Math.round(Math.max(1.3, Math.min(3.0, ef)) * 100) / 100;

  if (rating === 'again') {
    return {
      reps: 0,
      intervalDays: 0,
      easeFactor: ef,
      lapses: prevLapses + 1,
      nextReviewAt: now + 10 * 60 * 1000,
    };
  }

  let intervalDays: number;
  const nextReps = prevReps + 1;
  if (rating === 'hard') {
    if (prevReps === 0) intervalDays = 1;
    else if (prevReps === 1) intervalDays = Math.max(2, Math.round(prevInterval * 1.2));
    else intervalDays = Math.max(prevInterval + 1, Math.round(prevInterval * 1.2));
  } else if (rating === 'good') {
    if (prevReps === 0) intervalDays = 1;
    else if (prevReps === 1) intervalDays = 6;
    else intervalDays = Math.max(prevInterval + 1, Math.round(prevInterval * ef));
  } else {
    // easy
    if (prevReps === 0) intervalDays = 4;
    else if (prevReps === 1) intervalDays = 8;
    else intervalDays = Math.max(prevInterval + 2, Math.round(prevInterval * ef * 1.3));
  }

  intervalDays = Math.min(365, intervalDays);
  return {
    reps: nextReps,
    intervalDays,
    easeFactor: ef,
    lapses: prevLapses,
    nextReviewAt: now + intervalDays * 24 * 3600 * 1000,
  };
}

export function formatSm2IntervalEs(intervalDays: number): string {
  if (intervalDays <= 0) return '10 min';
  if (intervalDays === 1) return '1 día';
  if (intervalDays < 30) return `${intervalDays} días`;
  const months = Math.round((intervalDays / 30) * 10) / 10;
  return months === 1 ? '1 mes' : `${months} meses`;
}

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
    critical: false,
    writing: false,
    finance: false,
    vitality: false,
    compass: false,
    career: false,
    guides: false,
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
      critical: 'intermedio',
      writing: 'intermedio',
      finance: 'basico',
      vitality: 'basico',
      compass: 'basico',
      career: 'intermedio',
      guides: 'basico',
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
      rsvpWpm: 280,
      rsvpChunk: 1,
      activeClosures: {},
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
      ideaBank: [],
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
      feynmanNotes: {},
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
    critical: {
      activeTab: 'casos',
      caseIdx: 0,
      masteredIds: [],
      missedIds: [],
      decisions: [],
    },
    writing: {
      activeTab: 'retos',
      challengeIdx: 0,
      completedIds: [],
      bestScores: {},
      drafts: {},
      freeDraft: '',
    },
    finance: {
      activeTab: 'presupuesto',
      currency: 'S/',
      transactions: [],
      goals: [
        { id: 'goal-emerg', title: 'Fondo de emergencia', target: 3000, saved: 0 },
      ],
      calcInitial: 500,
      calcMonthly: 200,
      calcRate: 7,
      calcYears: 10,
      quizMasteredIds: [],
      quizIdx: 0,
    },
    vitality: {
      activeTab: 'pausas',
      selectedRoutineId: 'vr-202020',
      selectedZone: 'all',
      completedRoutines: 0,
      routineHistory: {},
      postureChecks: {},
      dayLogs: [],
      reminderIntervalMin: 0,
      reminderNotify: false,
      reminderSound: true,
      uprightMinutes: 0,
      assessmentAnswers: {},
      plan21DoneDays: [],
      nutritionChecksByDay: {},
    },
    compass: {
      activeTab: 'diario',
      dailyLogs: {},
      weeklyChecks: {},
      wheelScores: {
        salud: 7,
        carrera: 7,
        finanzas: 6,
        relaciones: 7,
        mente: 7,
        creatividad: 6,
        descanso: 6,
        proposito: 7,
      },
      wheelHistory: [],
      okrs: [],
      antiHabits: [
        {
          id: 'ah-scroll',
          title: 'Scrolling nocturno sin propósito',
          cleanDays: 0,
          lastCleanDay: '',
          replacementDefault: 'Dejar el celular cargando lejos de la cama y leer 5 minutos.',
          logs: [],
        },
        {
          id: 'ah-late',
          title: 'Trasnochar innecesariamente',
          cleanDays: 0,
          lastCleanDay: '',
          replacementDefault: 'Cerrar pantallas 30 min antes y activar respiración 3-6.',
          logs: [],
        },
        {
          id: 'ah-procrast',
          title: 'Procrastinar la tarea clave del día',
          cleanDays: 0,
          lastCleanDay: '',
          replacementDefault: 'Aplicar regla de 5 minutos: abrir el archivo y hacer solo el primer paso.',
          logs: [],
        },
      ],
      urgeSurfsCompleted: 0,
    },
    career: {
      activeTab: 'social',
      scenarioIdx: 0,
      masteredScenarioIds: [],
      interviewCategory: 'all',
      interviewIdx: 0,
      interviewDurationSec: 90,
      interviewHistory: [],
      bragLogs: [],
    },
    guides: {
      selectedTopicId: 'origami',
      searchQuery: '',
      completedSteps: [],
      topicNotes: {},
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
    critical: normDiff(rd.critical, base.difficulty.critical),
    writing: normDiff(rd.writing, base.difficulty.writing),
    finance: normDiff(rd.finance, base.difficulty.finance),
    vitality: normDiff(rd.vitality, base.difficulty.vitality),
    compass: normDiff(rd.compass, base.difficulty.compass),
    career: normDiff(rd.career, base.difficulty.career),
    guides: normDiff(rd.guides, base.difficulty.guides),
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
  const rCrit = (raw.critical ?? {}) as Partial<LearningProgress['critical']>;
  const rWrit = (raw.writing ?? {}) as Partial<LearningProgress['writing']>;
  const rFin = (raw.finance ?? {}) as Partial<LearningProgress['finance']>;
  const rVit = (raw.vitality ?? {}) as Partial<LearningProgress['vitality']>;
  const rComp = (raw.compass ?? {}) as Partial<LearningProgress['compass']>;
  const rCar = (raw.career ?? {}) as Partial<LearningProgress['career']>;
  const rGui = (raw.guides ?? {}) as Partial<LearningProgress['guides']>;

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
    'critical',
    'writing',
    'finance',
    'vitality',
    'compass',
    'career',
    'guides',
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
        rReader.mode === 'guiada' || rReader.mode === 'comprension' || rReader.mode === 'rsvp'
          ? rReader.mode
          : 'lectura',
      readArticles: normStrArr(rReader.readArticles, 300),
      scrollByTitle: normNumRecord(rReader.scrollByTitle),
      quizScores: normNumRecord(rReader.quizScores),
      readingNotes: normStrRecord(rReader.readingNotes),
      wordsRead: clampNum(rReader.wordsRead, 0, 10000000, 0),
      rsvpWpm: clampNum(rReader.rsvpWpm, 180, 550, 280),
      rsvpChunk: rReader.rsvpChunk === 2 ? 2 : 1,
      activeClosures:
        rReader.activeClosures && typeof rReader.activeClosures === 'object'
          ? { ...(rReader.activeClosures as Record<string, ReaderClosureEntry>) }
          : {},
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
        rMind.mode === 'reto_hoy' || rMind.mode === 'reflexion' || rMind.mode === 'creatividad'
          ? rMind.mode
          : 'tarjetas',
      completedActionIds: normStrArr(rMind.completedActionIds, 300),
      reflections: normStrRecord(rMind.reflections),
      dailyCheckins: clampNum(rMind.dailyCheckins, 0, 100000, 0),
      ideaBank: Array.isArray(rMind.ideaBank) ? (rMind.ideaBank as CreativeIdeaEntry[]).slice(0, 120) : [],
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
      recallMode:
        rFocus.recallMode === 'quiz' || rFocus.recallMode === 'feynman'
          ? rFocus.recallMode
          : 'repaso',
      recallDrafts: normStrRecord(rFocus.recallDrafts),
      recallMasteredDecks: normStrArr(rFocus.recallMasteredDecks, 100),
      feynmanNotes: normStrRecord(rFocus.feynmanNotes),
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
    critical: {
      activeTab:
        rCrit.activeTab === 'matriz' || rCrit.activeTab === 'repaso' ? rCrit.activeTab : 'casos',
      caseIdx: clampNum(rCrit.caseIdx, 0, 200, 0),
      masteredIds: normStrArr(rCrit.masteredIds, 200),
      missedIds: normStrArr(rCrit.missedIds, 200),
      decisions: Array.isArray(rCrit.decisions) ? rCrit.decisions.slice(0, 30) : [],
    },
    writing: {
      activeTab:
        rWrit.activeTab === 'analizador' || rWrit.activeTab === 'plantillas'
          ? rWrit.activeTab
          : 'retos',
      challengeIdx: clampNum(rWrit.challengeIdx, 0, 200, 0),
      completedIds: normStrArr(rWrit.completedIds, 200),
      bestScores: normNumRecord(rWrit.bestScores),
      drafts: normStrRecord(rWrit.drafts),
      freeDraft: typeof rWrit.freeDraft === 'string' ? rWrit.freeDraft.slice(0, 5000) : '',
    },
    finance: {
      activeTab:
        rFin.activeTab === 'metas' || rFin.activeTab === 'compuesto' || rFin.activeTab === 'criterio'
          ? rFin.activeTab
          : 'presupuesto',
      currency: rFin.currency === '$' || rFin.currency === '€' ? rFin.currency : 'S/',
      transactions: Array.isArray(rFin.transactions) ? rFin.transactions.slice(0, 120) : [],
      goals:
        Array.isArray(rFin.goals) && rFin.goals.length > 0
          ? rFin.goals.slice(0, 20)
          : base.finance.goals,
      calcInitial: clampNum(rFin.calcInitial, 0, 10000000, base.finance.calcInitial),
      calcMonthly: clampNum(rFin.calcMonthly, 0, 1000000, base.finance.calcMonthly),
      calcRate: clampNum(rFin.calcRate, 0, 40, base.finance.calcRate),
      calcYears: clampNum(rFin.calcYears, 1, 40, base.finance.calcYears),
      quizMasteredIds: normStrArr(rFin.quizMasteredIds, 100),
      quizIdx: clampNum(rFin.quizIdx, 0, 100, 0),
    },
    vitality: {
      activeTab:
        rVit.activeTab === 'monitor' || rVit.activeTab === 'plan21' || rVit.activeTab === 'registro'
          ? rVit.activeTab
          : (rVit.activeTab as string) === 'postura'
            ? 'plan21'
            : 'pausas',
      selectedRoutineId:
        typeof rVit.selectedRoutineId === 'string' && rVit.selectedRoutineId
          ? rVit.selectedRoutineId
          : base.vitality.selectedRoutineId,
      selectedZone: (
        ['all', 'ojos', 'cuello', 'hombros', 'espalda_alta', 'lumbar', 'munecas', 'caderas'] as const
      ).includes(rVit.selectedZone as BodyZoneId | 'all')
        ? (rVit.selectedZone as BodyZoneId | 'all')
        : 'all',
      completedRoutines: clampNum(rVit.completedRoutines, 0, 100000, 0),
      routineHistory: normNumRecord(rVit.routineHistory),
      postureChecks: normBoolRecord(rVit.postureChecks),
      dayLogs: Array.isArray(rVit.dayLogs) ? rVit.dayLogs.slice(0, 60) : [],
      reminderIntervalMin: ([0, 20, 30, 45, 60] as const).includes(
        rVit.reminderIntervalMin as 0 | 20 | 30 | 45 | 60
      )
        ? (rVit.reminderIntervalMin as 0 | 20 | 30 | 45 | 60)
        : 0,
      reminderNotify: typeof rVit.reminderNotify === 'boolean' ? rVit.reminderNotify : false,
      reminderSound: typeof rVit.reminderSound === 'boolean' ? rVit.reminderSound : true,
      uprightMinutes: clampNum(rVit.uprightMinutes, 0, 1000000, 0),
      assessmentAnswers: normNumRecord(rVit.assessmentAnswers),
      plan21DoneDays: Array.isArray(rVit.plan21DoneDays)
        ? Array.from(
            new Set(
              rVit.plan21DoneDays
                .filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 21)
            )
          ).sort((a, b) => a - b)
        : [],
      nutritionChecksByDay:
        rVit.nutritionChecksByDay && typeof rVit.nutritionChecksByDay === 'object'
          ? Object.fromEntries(
              Object.entries(rVit.nutritionChecksByDay as Record<string, unknown>)
                .slice(0, 60)
                .map(([day, rec]) => [day, normBoolRecord(rec)])
            )
          : {},
    },
    compass: {
      activeTab:
        rComp.activeTab === 'metas' || rComp.activeTab === 'antihabitos' ? rComp.activeTab : 'diario',
      dailyLogs:
        rComp.dailyLogs && typeof rComp.dailyLogs === 'object'
          ? { ...(rComp.dailyLogs as Record<string, CompassDailyLog>) }
          : {},
      weeklyChecks: normBoolRecord(rComp.weeklyChecks),
      wheelScores: {
        ...base.compass.wheelScores,
        ...Object.fromEntries(
          Object.entries(normNumRecord(rComp.wheelScores)).map(([k, v]) => [k, Math.max(1, Math.min(10, Math.round(v)))])
        ),
      },
      wheelHistory: Array.isArray(rComp.wheelHistory) ? (rComp.wheelHistory as CompassWheelSnapshot[]).slice(0, 24) : [],
      okrs: Array.isArray(rComp.okrs) ? (rComp.okrs as CompassOkrGoal[]).slice(0, 3) : [],
      antiHabits:
        Array.isArray(rComp.antiHabits) && rComp.antiHabits.length > 0
          ? (rComp.antiHabits as AntiHabitEntry[]).slice(0, 12)
          : base.compass.antiHabits,
      urgeSurfsCompleted: clampNum(rComp.urgeSurfsCompleted, 0, 100000, 0),
    },
    career: {
      activeTab:
        rCar.activeTab === 'entrevistas' || rCar.activeTab === 'logros' ? rCar.activeTab : 'social',
      scenarioIdx: clampNum(rCar.scenarioIdx, 0, 200, 0),
      masteredScenarioIds: normStrArr(rCar.masteredScenarioIds, 200),
      interviewCategory:
        rCar.interviewCategory === 'star' || rCar.interviewCategory === 'tecnica'
          ? rCar.interviewCategory
          : 'all',
      interviewIdx: clampNum(rCar.interviewIdx, 0, 200, 0),
      interviewDurationSec:
        rCar.interviewDurationSec === 60 || rCar.interviewDurationSec === 120
          ? rCar.interviewDurationSec
          : 90,
      interviewHistory: Array.isArray(rCar.interviewHistory)
        ? (rCar.interviewHistory as InterviewSessionEntry[]).slice(0, 60)
        : [],
      bragLogs: Array.isArray(rCar.bragLogs) ? (rCar.bragLogs as BragLogEntry[]).slice(0, 120) : [],
    },
    guides: {
      selectedTopicId:
        typeof rGui.selectedTopicId === 'string' && rGui.selectedTopicId
          ? rGui.selectedTopicId
          : base.guides.selectedTopicId,
      searchQuery: typeof rGui.searchQuery === 'string' ? rGui.searchQuery.slice(0, 120) : '',
      completedSteps: normStrArr(rGui.completedSteps, 400),
      topicNotes: normStrRecord(rGui.topicNotes),
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

  public reviewFlashcard(id: string, rating: Sm2Rating): Required<FlashcardProgress> {
    const next = computeSm2Review(this.profile.flashcardProgress[id], rating);
    this.profile.flashcardProgress[id] = next;
    this.profile.stats.recallReviewed += 1;
    this.markHabit('focuslab');
    this.save();
    return next;
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
      case 'critical':
        return {
          label: `Pensamiento Crítico · ${pr.critical.activeTab === 'matriz' ? 'Matriz ponderada' : pr.critical.activeTab === 'repaso' ? 'Repaso de fallos' : 'Sesgos y falacias'}`,
          detail: `${pr.critical.masteredIds.length} casos dominados · ${pr.critical.decisions.length} decisiones`,
        };
      case 'writing':
        return {
          label: `Escritura Clara · ${pr.writing.activeTab === 'analizador' ? 'Analizador libre' : pr.writing.activeTab === 'plantillas' ? 'Plantillas' : 'Retos de síntesis'}`,
          detail: `${pr.writing.completedIds.length} retos completados · Dificultad ${diffName}`,
        };
      case 'finance':
        return {
          label: `Finanzas Personales · ${pr.finance.activeTab === 'metas' ? 'Metas' : pr.finance.activeTab === 'compuesto' ? 'Interés compuesto' : pr.finance.activeTab === 'criterio' ? 'Criterio financiero' : 'Presupuesto 50/30/20'}`,
          detail: `${pr.finance.transactions.length} movimientos · ${pr.finance.goals.length} metas`,
        };
      case 'vitality':
        return {
          label: `Postura Pro y Energía · ${pr.vitality.activeTab === 'monitor' ? 'Monitor Live' : pr.vitality.activeTab === 'plan21' ? 'Plan 21 Días' : pr.vitality.activeTab === 'registro' ? 'Recuperación y Nutrición' : 'Mapa Corporal'}`,
          detail: `${pr.vitality.completedRoutines} pausas · ${pr.vitality.plan21DoneDays.length}/21 días correctivos`,
        };
      case 'compass':
        return {
          label: `Brújula Personal · ${pr.compass.activeTab === 'metas' ? 'OKRs 90 días' : pr.compass.activeTab === 'antihabitos' ? 'Anti-Hábitos' : 'Diario y Rueda'}`,
          detail: `${Object.keys(pr.compass.dailyLogs).length} diarios · ${pr.compass.okrs.length}/3 metas activas`,
        };
      case 'career':
        return {
          label: `Social y Carrera · ${pr.career.activeTab === 'entrevistas' ? 'Entrevistas STAR' : pr.career.activeTab === 'logros' ? 'Brag Document' : 'Habilidades Sociales'}`,
          detail: `${pr.career.masteredScenarioIds.length} casos · ${pr.career.bragLogs.length} logros registrados`,
        };
      case 'guides':
        return {
          label: `Rutas y YouTube · ${pr.guides.selectedTopicId}`,
          detail: `${pr.guides.completedSteps.length} etapas completadas`,
        };
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

  /* ==================== NEW PERSONAL DEVELOPMENT MODULES ==================== */

  public recordCriticalResult(caseId: string, correct: boolean): void {
    const c = this.profile.progress.critical;
    if (correct) {
      if (!c.masteredIds.includes(caseId)) c.masteredIds.push(caseId);
      c.missedIds = c.missedIds.filter((id) => id !== caseId);
    } else {
      if (!c.missedIds.includes(caseId)) c.missedIds.push(caseId);
    }
    this.markHabit('critical');
    this.save();
  }

  public saveDecisionMatrix(input: Omit<SavedDecisionMatrix, 'id' | 'updatedAt'>): SavedDecisionMatrix {
    const entry: SavedDecisionMatrix = {
      ...input,
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      updatedAt: Date.now(),
    };
    this.profile.progress.critical.decisions.unshift(entry);
    this.profile.progress.critical.decisions = this.profile.progress.critical.decisions.slice(0, 30);
    this.markHabit('critical');
    this.save();
    return entry;
  }

  public deleteDecisionMatrix(id: string): void {
    this.profile.progress.critical.decisions = this.profile.progress.critical.decisions.filter(
      (d) => d.id !== id
    );
    this.save();
  }

  public saveWritingResult(challengeId: string, draft: string, clarityScore: number): void {
    const w = this.profile.progress.writing;
    w.drafts[challengeId] = draft;
    const clean = Math.max(0, Math.min(100, Math.round(clarityScore)));
    w.bestScores[challengeId] = Math.max(w.bestScores[challengeId] ?? 0, clean);
    if (clean >= 75 && !w.completedIds.includes(challengeId)) {
      w.completedIds.push(challengeId);
    }
    this.markHabit('writing');
    this.save();
  }

  public addFinanceTransaction(input: Omit<FinanceTransaction, 'id' | 'at'>): FinanceTransaction {
    const tx: FinanceTransaction = {
      ...input,
      amount: Math.max(0, Math.round(input.amount * 100) / 100),
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      at: Date.now(),
    };
    this.profile.progress.finance.transactions.unshift(tx);
    this.profile.progress.finance.transactions = this.profile.progress.finance.transactions.slice(0, 120);
    this.markHabit('finance');
    this.save();
    return tx;
  }

  public deleteFinanceTransaction(id: string): void {
    this.profile.progress.finance.transactions = this.profile.progress.finance.transactions.filter(
      (t) => t.id !== id
    );
    this.save();
  }

  public upsertFinanceGoal(goal: Omit<FinanceGoal, 'id'> & { id?: string }): void {
    const list = this.profile.progress.finance.goals;
    const cleanTarget = Math.max(1, Math.round(goal.target));
    const cleanSaved = Math.max(0, Math.round(goal.saved));
    if (goal.id) {
      const idx = list.findIndex((g) => g.id === goal.id);
      if (idx >= 0) {
        list[idx] = { id: goal.id, title: goal.title.trim() || list[idx].title, target: cleanTarget, saved: cleanSaved };
        this.markHabit('finance');
        this.save();
        return;
      }
    }
    list.unshift({
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: goal.title.trim() || 'Nueva meta',
      target: cleanTarget,
      saved: cleanSaved,
    });
    this.profile.progress.finance.goals = list.slice(0, 20);
    this.markHabit('finance');
    this.save();
  }

  public deleteFinanceGoal(id: string): void {
    this.profile.progress.finance.goals = this.profile.progress.finance.goals.filter((g) => g.id !== id);
    this.save();
  }

  public recordFinanceQuiz(quizId: string, correct: boolean): void {
    if (correct && !this.profile.progress.finance.quizMasteredIds.includes(quizId)) {
      this.profile.progress.finance.quizMasteredIds.push(quizId);
    }
    this.markHabit('finance');
    this.save();
  }

  public recordVitalityRoutine(routineId: string): void {
    const v = this.profile.progress.vitality;
    v.completedRoutines += 1;
    v.routineHistory[routineId] = (v.routineHistory[routineId] ?? 0) + 1;
    const today = todayStamp();
    const existing = v.dayLogs.find((d) => d.day === today);
    if (existing) {
      existing.breaksDone += 1;
    } else {
      v.dayLogs.unshift({ day: today, waterCups: 0, sleepHours: 7, energyLevel: 7, breaksDone: 1 });
      v.dayLogs = v.dayLogs.slice(0, 60);
    }
    this.markHabit('vitality');
    this.save();
  }

  public saveVitalityDayLog(patch: Partial<Omit<VitalityDayLog, 'day'>>): VitalityDayLog {
    const v = this.profile.progress.vitality;
    const today = todayStamp();
    let entry = v.dayLogs.find((d) => d.day === today);
    if (!entry) {
      entry = { day: today, waterCups: 0, sleepHours: 7, energyLevel: 7, breaksDone: 0 };
      v.dayLogs.unshift(entry);
      v.dayLogs = v.dayLogs.slice(0, 60);
    }
    if (typeof patch.waterCups === 'number') entry.waterCups = Math.max(0, Math.min(20, Math.round(patch.waterCups)));
    if (typeof patch.sleepHours === 'number') entry.sleepHours = Math.max(0, Math.min(16, Math.round(patch.sleepHours * 2) / 2));
    if (typeof patch.energyLevel === 'number') entry.energyLevel = Math.max(1, Math.min(10, Math.round(patch.energyLevel)));
    if (typeof patch.breaksDone === 'number') entry.breaksDone = Math.max(0, Math.round(patch.breaksDone));
    if (patch.workoutType !== undefined) entry.workoutType = patch.workoutType;
    if (patch.workoutIntensity !== undefined) entry.workoutIntensity = patch.workoutIntensity;
    if (typeof patch.sorenessNote === 'string') entry.sorenessNote = patch.sorenessNote.trim().slice(0, 220);
    this.markHabit('vitality');
    this.save();
    return entry;
  }

  public toggleVitalityPlan21Day(dayNum: number): boolean {
    if (dayNum < 1 || dayNum > 21) return false;
    const arr = this.profile.progress.vitality.plan21DoneDays;
    const idx = arr.indexOf(dayNum);
    if (idx >= 0) {
      arr.splice(idx, 1);
      this.save();
      return false;
    }
    arr.push(dayNum);
    arr.sort((a, b) => a - b);
    this.markHabit('vitality');
    this.save();
    return true;
  }

  public setVitalityAssessmentAnswer(testId: string, score: number): void {
    this.profile.progress.vitality.assessmentAnswers[testId] = Math.max(0, Math.min(10, Math.round(score)));
    this.markHabit('vitality');
    this.save();
  }

  public addVitalityUprightMinutes(minutes: number): void {
    if (minutes <= 0) return;
    this.profile.progress.vitality.uprightMinutes = Math.round(
      (this.profile.progress.vitality.uprightMinutes + minutes) * 10
    ) / 10;
    this.markHabit('vitality');
    this.save();
  }

  public toggleVitalityNutritionCheck(itemId: string): boolean {
    const today = todayStamp();
    const map = this.profile.progress.vitality.nutritionChecksByDay;
    if (!map[today]) map[today] = {};
    const next = !map[today][itemId];
    map[today][itemId] = next;
    // Prune older than 30 days
    const keys = Object.keys(map).sort().reverse();
    for (const k of keys.slice(30)) delete map[k];
    this.markHabit('vitality');
    this.save();
    return next;
  }

  /* ==================== READER CLOSURE, FEYNMAN & CREATIVITY ==================== */

  public saveReaderActiveClosure(title: string, mainIdea: string, howToApply: string): void {
    const key = title.trim();
    if (!key) return;
    this.profile.progress.reader.activeClosures[key] = {
      mainIdea: mainIdea.trim().slice(0, 600),
      howToApply: howToApply.trim().slice(0, 600),
      updatedAt: Date.now(),
    };
    const combined = [
      mainIdea.trim() ? `Idea principal: ${mainIdea.trim()}` : '',
      howToApply.trim() ? `Cómo lo aplico: ${howToApply.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    if (combined) {
      this.profile.progress.reader.readingNotes[key] = combined;
    }
    this.markHabit('read');
    this.save();
  }

  public saveFeynmanNote(cardId: string, text: string): void {
    const clean = text.trim();
    if (!clean) delete this.profile.progress.focuslab.feynmanNotes[cardId];
    else {
      this.profile.progress.focuslab.feynmanNotes[cardId] = clean.slice(0, 1200);
      this.markHabit('focuslab');
    }
    this.save();
  }

  public addCreativeIdea(input: Omit<CreativeIdeaEntry, 'id' | 'createdAt'>): CreativeIdeaEntry {
    const item: CreativeIdeaEntry = {
      ...input,
      prompt: input.prompt.trim().slice(0, 220),
      idea: input.idea.trim().slice(0, 600),
      id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: Date.now(),
    };
    this.profile.progress.mindset.ideaBank.unshift(item);
    this.profile.progress.mindset.ideaBank = this.profile.progress.mindset.ideaBank.slice(0, 120);
    this.markHabit('mindset');
    this.save();
    return item;
  }

  public deleteCreativeIdea(id: string): void {
    this.profile.progress.mindset.ideaBank = this.profile.progress.mindset.ideaBank.filter((x) => x.id !== id);
    this.save();
  }

  /* ==================== COMPASS (BRÚJULA PERSONAL) ==================== */

  public saveCompassDailyLog(patch: Partial<Omit<CompassDailyLog, 'day' | 'updatedAt'>>, day = todayStamp()): CompassDailyLog {
    const map = this.profile.progress.compass.dailyLogs;
    const prev = map[day] ?? { day, win: '', friction: '', adjustment: '', gratitude: '', updatedAt: 0 };
    const next: CompassDailyLog = {
      day,
      win: patch.win !== undefined ? patch.win.trim().slice(0, 400) : prev.win,
      friction: patch.friction !== undefined ? patch.friction.trim().slice(0, 400) : prev.friction,
      adjustment: patch.adjustment !== undefined ? patch.adjustment.trim().slice(0, 400) : prev.adjustment,
      gratitude: patch.gratitude !== undefined ? patch.gratitude.trim().slice(0, 400) : prev.gratitude,
      updatedAt: Date.now(),
    };
    map[day] = next;
    // Keep up to 90 recent days
    const keys = Object.keys(map).sort().reverse();
    for (const k of keys.slice(90)) delete map[k];
    this.markHabit('compass');
    this.save();
    return next;
  }

  public setCompassWheelScore(areaId: string, score: number): void {
    this.profile.progress.compass.wheelScores[areaId] = Math.max(1, Math.min(10, Math.round(score)));
    this.markHabit('compass');
    this.save();
  }

  public saveCompassWheelSnapshot(): CompassWheelSnapshot {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const snap: CompassWheelSnapshot = {
      month,
      scores: { ...this.profile.progress.compass.wheelScores },
      savedAt: Date.now(),
    };
    const hist = this.profile.progress.compass.wheelHistory.filter((h) => h.month !== month);
    hist.unshift(snap);
    this.profile.progress.compass.wheelHistory = hist.slice(0, 24);
    this.markHabit('compass');
    this.save();
    return snap;
  }

  public addCompassOkr(input: { title: string; area: string; targetDate: string; milestones: string[] }): CompassOkrGoal | null {
    const list = this.profile.progress.compass.okrs;
    if (list.length >= 3) return null;
    const goal: CompassOkrGoal = {
      id: `okr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: input.title.trim().slice(0, 140),
      area: input.area.trim().slice(0, 60) || 'Propósito',
      targetDate: input.targetDate || todayStamp(),
      milestones: input.milestones
        .map((m) => m.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map((m, i) => ({ id: `ms-${Date.now()}-${i}`, title: m.slice(0, 140), done: false })),
      createdAt: Date.now(),
    };
    list.push(goal);
    this.markHabit('compass');
    this.save();
    return goal;
  }

  public toggleCompassOkrMilestone(okrId: string, milestoneId: string): void {
    const goal = this.profile.progress.compass.okrs.find((o) => o.id === okrId);
    if (!goal) return;
    const ms = goal.milestones.find((m) => m.id === milestoneId);
    if (!ms) return;
    ms.done = !ms.done;
    this.markHabit('compass');
    this.save();
  }

  public addCompassOkrMilestone(okrId: string, title: string): void {
    const goal = this.profile.progress.compass.okrs.find((o) => o.id === okrId);
    if (!goal || !title.trim() || goal.milestones.length >= 10) return;
    goal.milestones.push({
      id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: title.trim().slice(0, 140),
      done: false,
    });
    this.markHabit('compass');
    this.save();
  }

  public deleteCompassOkr(okrId: string): void {
    this.profile.progress.compass.okrs = this.profile.progress.compass.okrs.filter((o) => o.id !== okrId);
    this.save();
  }

  public addAntiHabit(title: string, replacementDefault: string): AntiHabitEntry {
    const item: AntiHabitEntry = {
      id: `ah-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: title.trim().slice(0, 120),
      cleanDays: 0,
      lastCleanDay: '',
      replacementDefault: replacementDefault.trim().slice(0, 200) || 'Respirar 90s y cambiar de actividad.',
      logs: [],
    };
    this.profile.progress.compass.antiHabits.unshift(item);
    this.profile.progress.compass.antiHabits = this.profile.progress.compass.antiHabits.slice(0, 12);
    this.markHabit('compass');
    this.save();
    return item;
  }

  public deleteAntiHabit(id: string): void {
    this.profile.progress.compass.antiHabits = this.profile.progress.compass.antiHabits.filter((a) => a.id !== id);
    this.save();
  }

  public markAntiHabitCleanDay(id: string): void {
    const item = this.profile.progress.compass.antiHabits.find((a) => a.id === id);
    if (!item) return;
    const today = todayStamp();
    if (item.lastCleanDay !== today) {
      item.cleanDays += 1;
      item.lastCleanDay = today;
      this.markHabit('compass');
      this.save();
    }
  }

  public logAntiHabitTrigger(id: string, trigger: string, replacement: string, resisted: boolean): void {
    const item = this.profile.progress.compass.antiHabits.find((a) => a.id === id);
    if (!item) return;
    item.logs.unshift({
      at: Date.now(),
      trigger: trigger.trim().slice(0, 180),
      replacement: replacement.trim().slice(0, 180),
      resisted,
    });
    item.logs = item.logs.slice(0, 25);
    if (!resisted) {
      item.cleanDays = 0;
      item.lastCleanDay = '';
    }
    this.markHabit('compass');
    this.save();
  }

  public recordUrgeSurfComplete(): void {
    this.profile.progress.compass.urgeSurfsCompleted += 1;
    this.markHabit('compass');
    this.save();
  }

  /* ==================== CAREER (SOCIAL Y CARRERA) ==================== */

  public recordCareerScenario(scenarioId: string, correct: boolean): void {
    const c = this.profile.progress.career;
    if (correct && !c.masteredScenarioIds.includes(scenarioId)) {
      c.masteredScenarioIds.push(scenarioId);
    }
    this.markHabit('career');
    this.save();
  }

  public recordInterviewSession(entry: Omit<InterviewSessionEntry, 'at'>): InterviewSessionEntry {
    const item: InterviewSessionEntry = { ...entry, at: Date.now() };
    this.profile.progress.career.interviewHistory.unshift(item);
    this.profile.progress.career.interviewHistory = this.profile.progress.career.interviewHistory.slice(0, 60);
    this.markHabit('career');
    this.save();
    return item;
  }

  public addBragLog(input: Omit<BragLogEntry, 'id' | 'createdAt'>): BragLogEntry {
    const item: BragLogEntry = {
      ...input,
      date: input.date || todayStamp(),
      context: input.context.trim().slice(0, 140),
      action: input.action.trim().slice(0, 400),
      impact: input.impact.trim().slice(0, 260),
      id: `brag-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: Date.now(),
    };
    this.profile.progress.career.bragLogs.unshift(item);
    this.profile.progress.career.bragLogs = this.profile.progress.career.bragLogs.slice(0, 120);
    this.markHabit('career');
    this.save();
    return item;
  }

  public deleteBragLog(id: string): void {
    this.profile.progress.career.bragLogs = this.profile.progress.career.bragLogs.filter((b) => b.id !== id);
    this.save();
  }

  /* ==================== GUIDES (RUTAS Y YOUTUBE) ==================== */

  public toggleGuideStep(stepKey: string): boolean {
    const arr = this.profile.progress.guides.completedSteps;
    const idx = arr.indexOf(stepKey);
    if (idx >= 0) {
      arr.splice(idx, 1);
      this.save();
      return false;
    }
    arr.push(stepKey);
    this.markHabit('guides');
    this.save();
    return true;
  }

  public saveGuideTopicNote(topicId: string, note: string): void {
    const clean = note.trim();
    if (!clean) delete this.profile.progress.guides.topicNotes[topicId];
    else {
      this.profile.progress.guides.topicNotes[topicId] = clean.slice(0, 1200);
      this.markHabit('guides');
    }
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
          pr.mindset.ideaBank.length * 4 +
          p.favoritePhraseIds.length * 2)
      ),
      focuslab: clamp(
        p.stats.oratorySessions * 6 +
          Object.keys(pr.focuslab.schulteBestByKey).length * 8 +
          Object.keys(pr.focuslab.feynmanNotes).length * 5 +
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
      critical: clamp(
        (pr.critical.masteredIds.length / 18) * 70 + pr.critical.decisions.length * 10
      ),
      writing: clamp(
        (pr.writing.completedIds.length / 9) * 75 + (pr.writing.freeDraft.trim().length > 40 ? 25 : 0)
      ),
      finance: clamp(
        (pr.finance.quizMasteredIds.length / 10) * 50 +
          Math.min(25, pr.finance.transactions.length * 5) +
          Math.min(25, pr.finance.goals.filter((g) => g.saved > 0).length * 12)
      ),
      vitality: clamp(
        pr.vitality.completedRoutines * 6 +
          Object.values(pr.vitality.postureChecks).filter(Boolean).length * 4 +
          pr.vitality.plan21DoneDays.length * 2.5 +
          pr.vitality.dayLogs.length * 5
      ),
      compass: clamp(
        Object.keys(pr.compass.dailyLogs).length * 8 +
          pr.compass.okrs.length * 12 +
          pr.compass.wheelHistory.length * 10 +
          pr.compass.urgeSurfsCompleted * 6
      ),
      career: clamp(
        (pr.career.masteredScenarioIds.length / 18) * 55 +
          pr.career.interviewHistory.length * 7 +
          pr.career.bragLogs.length * 6
      ),
      guides: clamp(
        (pr.guides.completedSteps.length / 36) * 80 +
          Object.keys(pr.guides.topicNotes).length * 5
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
