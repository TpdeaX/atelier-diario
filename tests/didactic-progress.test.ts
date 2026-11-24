import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map<string, string>();
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
g.window = globalThis;

const EMOJI_RE = /\p{Extended_Pictographic}/u;

let store: typeof import('../src/state/LifeStore.ts');
let knowledge: typeof import('../src/data/KnowledgeBank.ts');
let drawing: typeof import('../src/data/DrawingBank.ts');
let focus: typeof import('../src/data/FocusLabBank.ts');
let singing: typeof import('../src/data/SingingBank.ts');
let calm: typeof import('../src/data/CalmBank.ts');

before(async () => {
  store = await import('../src/state/LifeStore.ts');
  knowledge = await import('../src/data/KnowledgeBank.ts');
  drawing = await import('../src/data/DrawingBank.ts');
  focus = await import('../src/data/FocusLabBank.ts');
  singing = await import('../src/data/SingingBank.ts');
  calm = await import('../src/data/CalmBank.ts');
});

describe('LearningProgress: normalizacion, dificultad y guardado completo', () => {
  it('hidrata progress limpio desde perfil antiguo o datos corruptos', () => {
    const clean = store.normalizeLearningProgress(null);
    assert.equal(clean.difficulty.typing, 'intermedio');
    assert.equal(clean.difficulty.drawing, 'basico');
    assert.equal(clean.calm.groundDone.length, 15);

    const bad = store.normalizeLearningProgress({
      difficulty: { typing: 'imposible' as never, singing: 'avanzado' },
      drawing: { refOpacity: 99, guideStep: -5, modeExtra: 'invalid' as never },
      vault: { dailyGoal: 999 },
    } as never);
    assert.equal(bad.difficulty.typing, 'intermedio');
    assert.equal(bad.difficulty.singing, 'avanzado');
    assert.equal(bad.drawing.refOpacity, 0.9);
    assert.equal(bad.drawing.guideStep, 0);
    assert.equal(bad.drawing.modeExtra, 'lessons');
    assert.equal(bad.vault.dailyGoal, 50);
  });

  it('persiste dificultad, tutoriales y progreso de todos los modulos en localStorage', () => {
    const ls = store.lifeStore;

    // Dificultad (incluye sincronizacion singing level)
    ls.setDifficulty('singing', 'avanzado');
    assert.equal(ls.getDifficulty('singing'), 'avanzado');
    assert.equal(ls.get().modulePrefs.singing.level, 3);

    // Tutoriales
    ls.setTutorialOpen('reader:wikisource', true);
    assert.equal(ls.isTutorialOpen('reader:wikisource'), true);
    assert.equal(ls.toggleTutorialDone('reader:wikisource'), true);
    assert.equal(ls.isTutorialDone('reader:wikisource'), true);

    // Reader
    ls.saveReaderScroll('Platero y yo', 64);
    ls.saveReaderNote('Platero y yo', 'Prosa musical con ritmo pausado.');
    ls.recordReaderArticle('Platero y yo', 450, 95);
    assert.equal(ls.get().progress.reader.scrollByTitle['Platero y yo'], 64);
    assert.equal(ls.get().progress.reader.quizScores['Platero y yo'], 95);

    // Calligraphy
    ls.recordCalligraphyMastery('numeros:0', 84, [{ points: [[10, 100, 1], [80, 100, 20]] }]);
    assert.equal(ls.get().progress.calligraphy.mastery['numeros:0'], 84);
    assert.ok(ls.get().progress.calligraphy.completedTemplates.includes('numeros:0'));

    // Drawing
    ls.recordDrawingMastery('stroke-lines', 88);
    ls.recordDrawingChallenge('ch-taza');
    ls.saveDrawingDraft('lesson:stroke-lines', [
      { color: '#1E293B', size: 4, opacity: 1, eraser: false, points: [[0.1, 0.2, 0.5], [0.8, 0.2, 0.5]] },
    ]);
    assert.equal(ls.get().progress.drawing.mastery['stroke-lines'], 88);
    assert.ok(ls.get().progress.drawing.completedChallenges.includes('ch-taza'));
    assert.equal(ls.get().progress.drawing.savedDrafts['lesson:stroke-lines'].length, 1);

    // Typing
    ls.recordTypingSession('pc', 'codigo', 'avanzado', 68, 96, { ';': 2, 'ñ': 1 }, 'code-1');
    assert.ok(ls.get().stats.bestWpmPc >= 68);
    assert.equal(ls.get().progress.typing.keyErrors[';'], 2);
    assert.equal(ls.get().progress.typing.history[0].mode, 'codigo');

    // Language
    ls.recordOrthoResult('o81', false);
    assert.ok(ls.get().progress.language.missedOrthoIds.includes('o81'));
    ls.recordOrthoResult('o81', true);
    assert.ok(!ls.get().progress.language.missedOrthoIds.includes('o81'));
    assert.ok(ls.get().progress.language.masteredOrthoIds.includes('o81'));
    ls.recordOrthoExam(90);
    ls.recordVocabMastered('Lúcido');
    ls.setWordNote('Lúcido', 'Usar en informes técnicos.');
    assert.equal(ls.get().progress.language.bestExamScore, 90);
    assert.equal(ls.get().progress.language.wordNotes['lúcido'], 'Usar en informes técnicos.');

    // Mindset & Vault
    assert.equal(ls.toggleMindsetAction('p37'), true);
    ls.saveMindsetReflection('p37', 'Medir 10 minutos diarios de lectura.');
    ls.recordVaultReview('v1');
    ls.saveVaultActionPlan('v1', 'Aplicar plantilla Cornell mañana.');
    ls.markVaultPromoted('v1');
    assert.ok(ls.get().progress.vault.promotedIds.includes('v1'));

    // FocusLab
    ls.recordSchulteRun('inverso', 6, 38500);
    ls.recordOratoryHistory({ promptId: 'op-17', title: 'Pitch', durationSec: 30, fillers: 1, rubricScore: 5 });
    ls.saveRecallDraft('fc-db-1', 'Atomicidad, Consistencia, Aislamiento, Durabilidad');
    assert.equal(ls.get().progress.focuslab.schulteBestByKey['inverso_6x6'], 38500);
    assert.equal(ls.get().progress.focuslab.oratoryHistory[0].rubricScore, 5);

    // Singing
    ls.recordSingingVowel('A');
    ls.recordSingingJump('P5');
    ls.recordSingingDrillMastery('major5', 92);
    ls.recordSingingEar(true);
    ls.recordSingingWarmup();
    assert.equal(ls.get().progress.singing.drillsMastered['major5'], 92);
    assert.equal(ls.get().progress.singing.earCorrect, 1);

    // Calm
    ls.addCalmCheckin({ before: 8, after: 3, technique: 'Respiración 3-6', note: 'Bajó rápido' });
    assert.equal(ls.get().progress.calm.checkins[0].after, 3);

    // Resumen global XP y nivel
    const summary = ls.getOverallMasterySummary();
    assert.ok(summary.totalXp > 0);
    assert.ok(summary.level >= 1);
    assert.ok(summary.byModule.drawing > 0);
    assert.ok(summary.byModule.language > 0);

    // Confirmar que localStorage serializo y recarga sin perder nada
    const savedRaw = mem.get('atelier_diario_profile_v1');
    assert.ok(savedRaw && savedRaw.includes('Platero y yo'));
    const reloaded = store.normalizeProfile(JSON.parse(savedRaw!));
    assert.equal(reloaded.progress.focuslab.schulteBestByKey['inverso_6x6'], 38500);
    assert.equal(reloaded.progress.singing.drillsMastered['major5'], 92);
  });
});

describe('Bancos didacticos ampliados (0 emojis e integridad)', () => {
  it('STUDIO_TEMPLATES, DRAWING_CHALLENGES, EAR_SCALES, EAR_MELODIES y REFRAME_EXAMPLES son validos', () => {
    assert.ok(knowledge.STUDIO_TEMPLATES.length >= 5);
    assert.ok(knowledge.ORTHOGRAPHY_BANK.length >= 96);
    assert.ok(knowledge.VOCABULARY_DECK.length >= 48);
    assert.ok(knowledge.PHRASES_BANK.length >= 84);
    assert.ok(knowledge.CLASSIC_WIKISOURCE_SUGGESTIONS.length >= 36);
    assert.ok(drawing.DRAWING_CHALLENGES.length >= 12);
    assert.ok(focus.ORATORY_PROMPTS.length >= 22);
    assert.ok(focus.DICTION_DRILLS.length >= 13);
    assert.ok(focus.FLASHCARDS_BANK.length >= 52);
    assert.ok(focus.ORATORY_RUBRIC_ITEMS.length === 5);
    assert.ok(singing.EAR_SCALES.length >= 8);
    assert.ok(singing.EAR_MELODIES.length >= 10);
    assert.ok(calm.PANIC_TRUTH_CARDS.length >= 26);
    assert.ok(calm.PMR_STEPS.length >= 8);
    assert.ok(calm.REFRAME_EXAMPLES.length >= 4);

    for (const tpl of knowledge.STUDIO_TEMPLATES) {
      assert.ok(!EMOJI_RE.test(`${tpl.title} ${tpl.description} ${tpl.steps.join(' ')}`));
    }
    for (const ch of drawing.DRAWING_CHALLENGES) {
      assert.ok(!EMOJI_RE.test(`${ch.title} ${ch.prompt} ${ch.steps.join(' ')}`));
    }
    for (const sc of singing.EAR_SCALES) {
      assert.ok(!EMOJI_RE.test(`${sc.label} ${sc.character}`));
    }
    for (const m of singing.EAR_MELODIES) {
      assert.ok(!EMOJI_RE.test(`${m.label} ${m.patternLabel} ${m.hint}`));
    }
    for (const ex of calm.REFRAME_EXAMPLES) {
      assert.ok(!EMOJI_RE.test(`${ex.label} ${ex.worry} ${ex.control} ${ex.nextStep}`));
    }
  });
});
