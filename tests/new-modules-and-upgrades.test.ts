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

let types: typeof import('../src/types.ts');
let store: typeof import('../src/state/LifeStore.ts');
let compassBank: typeof import('../src/data/CompassBank.ts');
let careerBank: typeof import('../src/data/CareerBank.ts');
let guidesBank: typeof import('../src/data/YoutubeGuidesBank.ts');
let postureBank: typeof import('../src/data/PostureProBank.ts');
let homeRecs: typeof import('../src/services/HomeRecommendations.ts');

before(async () => {
  types = await import('../src/types.ts');
  store = await import('../src/state/LifeStore.ts');
  compassBank = await import('../src/data/CompassBank.ts');
  careerBank = await import('../src/data/CareerBank.ts');
  guidesBank = await import('../src/data/YoutubeGuidesBank.ts');
  postureBank = await import('../src/data/PostureProBank.ts');
  homeRecs = await import('../src/services/HomeRecommendations.ts');
});

describe('SM-2 Spaced Repetition Engine', () => {
  it('calcula intervalos crecientes, easeFactor acotado y lapses reales', () => {
    const t0 = 1_700_000_000_000;
    const r1 = store.computeSm2Review(undefined, 'good', t0);
    assert.equal(r1.reps, 1);
    assert.equal(r1.intervalDays, 1);
    assert.equal(r1.lapses, 0);
    assert.ok(r1.easeFactor >= 2.4 && r1.easeFactor <= 2.6);

    const r2 = store.computeSm2Review(r1, 'good', t0);
    assert.equal(r2.reps, 2);
    assert.equal(r2.intervalDays, 6);

    const r3 = store.computeSm2Review(r2, 'easy', t0);
    assert.equal(r3.reps, 3);
    assert.ok(r3.intervalDays > 12);
    assert.ok(r3.easeFactor > r2.easeFactor);

    const rHard = store.computeSm2Review(r3, 'hard', t0);
    assert.equal(rHard.reps, 4);
    assert.ok(rHard.easeFactor < r3.easeFactor);

    const rAgain = store.computeSm2Review(rHard, 'again', t0);
    assert.equal(rAgain.reps, 0);
    assert.equal(rAgain.intervalDays, 0);
    assert.equal(rAgain.lapses, 1);
    assert.equal(rAgain.nextReviewAt, t0 + 10 * 60 * 1000);

    // Ease factor never drops below 1.3
    let cur = rAgain;
    for (let i = 0; i < 12; i++) cur = store.computeSm2Review(cur, 'again', t0);
    assert.ok(cur.easeFactor >= 1.3);

    assert.equal(store.formatSm2IntervalEs(0), '10 min');
    assert.equal(store.formatSm2IntervalEs(1), '1 día');
    assert.equal(store.formatSm2IntervalEs(6), '6 días');
  });
});

describe('Bancos nuevos: Compass, Career, YoutubeGuides y PosturePro (0 emojis e integridad)', () => {
  it('valida CompassBank', () => {
    assert.equal(compassBank.WHEEL_OF_LIFE_AREAS.length, 8);
    assert.ok(compassBank.WEEKLY_REVIEW_CHECKLIST.length >= 5);
    assert.ok(compassBank.OKR_QUICK_TEMPLATES.length >= 3);
    assert.equal(compassBank.URGE_SURFING_PHASES.length, 3);
    for (const a of compassBank.WHEEL_OF_LIFE_AREAS) {
      assert.ok(!EMOJI_RE.test(`${a.label} ${a.hint}`));
    }
    const low = compassBank.findLowestWheelArea({ salud: 8, finanzas: 3, carrera: 7 });
    assert.equal(low.area.id, 'finanzas');
    assert.equal(low.score, 3);
  });

  it('valida CareerBank (18+ casos sociales y 20+ preguntas entrevistas, 0 emojis)', () => {
    assert.ok(careerBank.SOCIAL_SCENARIOS.length >= 18);
    assert.ok(careerBank.INTERVIEW_QUESTIONS.length >= 20);
    assert.equal(careerBank.INTERVIEW_RUBRIC_ITEMS.length, 5);
    const ids = new Set<string>();
    for (const s of careerBank.SOCIAL_SCENARIOS) {
      assert.ok(!ids.has(s.id));
      ids.add(s.id);
      assert.ok(s.correctIndex >= 0 && s.correctIndex < s.options.length);
      assert.ok(!EMOJI_RE.test(`${s.title} ${s.situation} ${s.critique} ${s.readyScript}`));
    }
    for (const q of careerBank.INTERVIEW_QUESTIONS) {
      assert.ok(!EMOJI_RE.test(`${q.question} ${q.whatTheyLookFor} ${q.structureHint}`));
    }
  });

  it('valida YoutubeGuidesBank (12 rutas incluyendo Origami, Dibujo, Canto, Postura, Cocina, Rubik)', () => {
    assert.ok(guidesBank.YOUTUBE_GUIDES_BANK.length >= 12);
    const ids = new Set(guidesBank.YOUTUBE_GUIDES_BANK.map((t) => t.id));
    for (const reqId of ['origami', 'dibujo', 'caligrafia', 'canto', 'postura', 'cocina', 'ajedrez', 'rubik']) {
      assert.ok(ids.has(reqId), `falta ruta ${reqId}`);
    }
    for (const t of guidesBank.YOUTUBE_GUIDES_BANK) {
      assert.equal(t.stages.length, 3);
      for (const st of t.stages) {
        assert.ok(st.youtubeLinks.length >= 2);
        assert.ok(!EMOJI_RE.test(`${t.title} ${t.summary} ${st.goal} ${st.watchOut}`));
        for (const l of st.youtubeLinks) {
          assert.ok(guidesBank.buildYoutubeSearchUrl(l.query).startsWith('https://www.youtube.com/results?search_query='));
        }
      }
    }
    assert.ok(guidesBank.getGuidesForModule('drawing').length >= 1);
    assert.ok(guidesBank.getGuidesForModule('vitality').length >= 1);
  });

  it('valida PostureProBank (7 zonas, Plan 21 dias, evaluacion 0-100, 12+ comidas y SVGs)', () => {
    assert.equal(postureBank.BODY_ZONES.length, 7);
    assert.equal(postureBank.PLAN_21_DAYS.length, 21);
    assert.ok(postureBank.QUICK_PROTEIN_MEALS.length >= 12);
    assert.equal(postureBank.NUTRITION_DAILY_CHECKLIST.length, 4);
    for (const r of postureBank.POSTURE_PRO_ROUTINES) {
      for (const s of r.steps) {
        assert.ok(!EMOJI_RE.test(`${r.title} ${s.title} ${s.instruction} ${s.breathCue}`));
        assert.ok(postureBank.renderPosturePoseSvg(s.anim).includes('<svg'));
      }
    }
    for (const m of postureBank.QUICK_PROTEIN_MEALS) {
      assert.ok(!EMOJI_RE.test(`${m.title} ${m.ingredients} ${m.steps}`));
    }
    const ev = postureBank.evaluatePostureScore(
      { 'pa-wall': 10, 'pa-thoracic': 10, 'pa-screen': 10, 'pa-seat': 10, 'pa-breaks': 10 },
      { eyes: true, feet: true, shoulders: true, neck: true, water: true },
      5
    );
    assert.equal(ev.score, 100);
    assert.equal(ev.level, 'Postura Sólida');
  });
});

describe('Rutas, normalizacion y persistencia de Compass, Career, Guides, Postura Pro y Upgrades', () => {
  it('parseHashRoute reconoce compass, career y guides', () => {
    assert.deepEqual(types.parseHashRoute('#compass'), { moduleId: 'compass', sos: false });
    assert.deepEqual(types.parseHashRoute('#career'), { moduleId: 'career', sos: false });
    assert.deepEqual(types.parseHashRoute('#guides'), { moduleId: 'guides', sos: false });
  });

  it('normaliza perfiles antiguos y datos corruptos (incluyendo vitality.activeTab postura -> plan21)', () => {
    const norm = store.normalizeLearningProgress({
      vitality: { activeTab: 'postura' as never, reminderIntervalMin: 999 as never, plan21DoneDays: [1, 2, 99, -1] },
      reader: { rsvpWpm: 9999, rsvpChunk: 5 as never },
      compass: { wheelScores: { salud: 99, finanzas: -5 } },
    } as never);
    assert.equal(norm.vitality.activeTab, 'plan21');
    assert.equal(norm.vitality.reminderIntervalMin, 0);
    assert.deepEqual(norm.vitality.plan21DoneDays, [1, 2]);
    assert.equal(norm.reader.rsvpWpm, 550);
    assert.equal(norm.reader.rsvpChunk, 1);
    assert.equal(norm.compass.wheelScores.salud, 10);
    assert.equal(norm.compass.wheelScores.finanzas, 1);
    assert.ok(norm.compass.antiHabits.length >= 3);
  });

  it('persiste todas las operaciones nuevas en LifeStore y calcula mastery + cockpit', () => {
    const ls = store.lifeStore;

    // Compass
    ls.saveCompassDailyLog({ win: 'Terminé módulo', friction: 'Distracción', adjustment: 'Bloque 45m', gratitude: 'Salud' }, '2026-11-24');
    ls.setCompassWheelScore('finanzas', 4);
    ls.saveCompassWheelSnapshot();
    const okr = ls.addCompassOkr({ title: 'Meta Q1', area: 'Carrera', targetDate: '2027-02-24', milestones: ['Hito 1', 'Hito 2'] });
    assert.ok(okr);
    ls.toggleCompassOkrMilestone(okr!.id, okr!.milestones[0].id);
    assert.equal(ls.get().progress.compass.okrs[0].milestones[0].done, true);
    const ah = ls.addAntiHabit('Revisar correo de noche', 'Leer 10 min');
    ls.markAntiHabitCleanDay(ah.id);
    ls.recordUrgeSurfComplete();
    assert.equal(ls.get().progress.compass.urgeSurfsCompleted, 1);

    // Career
    ls.recordCareerScenario('soc-1', true);
    ls.recordInterviewSession({
      questionId: 'iq-1',
      question: 'Proyecto complejo',
      category: 'star',
      durationSec: 85,
      rubricScore: 4,
      note: 'Buen cierre',
    });
    ls.addBragLog({ date: '2026-11-24', context: 'API', action: 'Optimicé índices', impact: '-80% latencia', category: 'tecnico' });
    assert.ok(ls.get().progress.career.masteredScenarioIds.includes('soc-1'));
    assert.equal(ls.get().progress.career.bragLogs.length, 1);

    // Guides
    assert.equal(ls.toggleGuideStep('origami:1'), true);
    ls.saveGuideTopicNote('origami', 'Canal favorito: Jo Nakashima');
    assert.ok(ls.get().progress.guides.completedSteps.includes('origami:1'));

    // Postura Pro
    assert.equal(ls.toggleVitalityPlan21Day(1), true);
    ls.setVitalityAssessmentAnswer('pa-wall', 10);
    ls.addVitalityUprightMinutes(12);
    ls.toggleVitalityNutritionCheck('nut-protein');
    ls.saveVitalityDayLog({ workoutType: 'fuerza', workoutIntensity: 'alta', sorenessNote: 'Piernas cargadas' });
    assert.equal(ls.get().progress.vitality.dayLogs[0].workoutType, 'fuerza');

    // Upgrades: Reader closure, Feynman, Creativity, SM-2
    ls.saveReaderActiveClosure('Platero y yo', 'Sensibilidad en lo cotidiano.', 'Observar con más calma.');
    ls.saveFeynmanNote('fc-db-1', 'Es asegurar que una operación en BD se cumple entera o se deshace limpia.');
    ls.addCreativeIdea({ technique: 'scamper', prompt: 'Combinar', idea: 'Flashcards con audio breve.' });
    const sm2 = ls.reviewFlashcard('fc-db-1', 'hard');
    assert.equal(sm2.reps, 1);

    const summary = ls.getOverallMasterySummary();
    assert.ok(summary.byModule.compass > 0);
    assert.ok(summary.byModule.career > 0);
    assert.ok(summary.byModule.guides > 0);
    assert.ok(summary.byModule.vitality > 0);

    const cockpit = homeRecs.buildHomeCockpit(ls.get(), summary.byModule, null, Date.now());
    assert.ok(cockpit.recommended.length >= 1);
  });
});
