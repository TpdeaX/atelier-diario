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

let bank: typeof import('../src/data/PersonalDevBank.ts');
let store: typeof import('../src/state/LifeStore.ts');
let types: typeof import('../src/types.ts');

before(async () => {
  bank = await import('../src/data/PersonalDevBank.ts');
  store = await import('../src/state/LifeStore.ts');
  types = await import('../src/types.ts');
});

describe('PersonalDevBank: bancos de 4 modulos nuevos y utilidades puras', () => {
  it('valida casos criticos, retos de escritura, quiz financiero y rutinas con 0 emojis', () => {
    assert.ok(bank.CRITICAL_CASES.length >= 18);
    assert.ok(bank.WRITING_CHALLENGES.length >= 9);
    assert.ok(bank.FINANCE_QUIZ_CASES.length >= 10);
    assert.ok(bank.VITALITY_ROUTINES.length >= 6);
    assert.equal(bank.POSTURE_CHECKLIST.length, 5);

    const critIds = new Set<string>();
    for (const c of bank.CRITICAL_CASES) {
      assert.ok(!critIds.has(c.id));
      critIds.add(c.id);
      assert.ok(c.correctIndex >= 0 && c.correctIndex < c.options.length);
      assert.ok(!EMOJI_RE.test(`${c.title} ${c.scenario} ${c.explanation} ${c.antidote}`));
    }
    for (const w of bank.WRITING_CHALLENGES) {
      assert.ok(w.maxWords >= 12);
      assert.ok(!EMOJI_RE.test(`${w.title} ${w.flawedText} ${w.goal} ${w.modelAnswer}`));
    }
    for (const q of bank.FINANCE_QUIZ_CASES) {
      assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length);
      assert.ok(!EMOJI_RE.test(`${q.question} ${q.explanation}`));
    }
    for (const r of bank.VITALITY_ROUTINES) {
      assert.ok(r.steps.length >= 3);
      assert.ok(!EMOJI_RE.test(`${r.title} ${r.summary} ${r.steps.map((s) => s.instruction).join(' ')}`));
    }
  });

  it('analyzeWritingClarity detecta relleno y puntua mas alto textos concisos', () => {
    const bloated = bank.analyzeWritingClarity(
      'El motivo del presente correo es basicamente en el dia de hoy mencionar que procedimos a revisar literalmente rapidamente cuidadosamente todo.',
      'avanzado'
    );
    const crisp = bank.analyzeWritingClarity(
      'Hola, confirmemos la hora de la reunión del jueves. Ya envié el resumen.',
      'avanzado'
    );
    assert.ok(bloated.fillerMatches.length >= 2);
    assert.ok(crisp.clarityScore > bloated.clarityScore);
  });

  it('computeCompoundInterest calcula crecimiento compuesto con aportes mensuales', () => {
    const res = bank.computeCompoundInterest(1000, 100, 10, 10);
    assert.equal(res.timeline.length, 10);
    assert.equal(res.totalContributed, 13000);
    assert.ok(res.totalBalance > res.totalContributed);
    assert.ok(res.totalInterest > 5000);
  });
});

describe('LifeStore y rutas para critical, writing, finance y vitality', () => {
  it('parseHashRoute reconoce los 4 nuevos modulos', () => {
    assert.deepEqual(types.parseHashRoute('#critical'), { moduleId: 'critical', sos: false });
    assert.deepEqual(types.parseHashRoute('#writing'), { moduleId: 'writing', sos: false });
    assert.deepEqual(types.parseHashRoute('#finance'), { moduleId: 'finance', sos: false });
    assert.deepEqual(types.parseHashRoute('#vitality'), { moduleId: 'vitality', sos: false });
  });

  it('persiste decisiones, borradores, transacciones, metas y registro diario fisico', () => {
    const ls = store.lifeStore;
    ls.recordCriticalResult('cc-1', false);
    assert.ok(ls.get().progress.critical.missedIds.includes('cc-1'));
    ls.recordCriticalResult('cc-1', true);
    assert.ok(ls.get().progress.critical.masteredIds.includes('cc-1'));

    ls.saveDecisionMatrix({
      title: 'Laptop',
      optionA: 'Equilibrada',
      optionB: 'Pro',
      criteria: [{ name: 'Precio', weight: 5, scoreA: 9, scoreB: 5 }],
      winner: 'Equilibrada',
    });
    assert.equal(ls.get().progress.critical.decisions.length, 1);

    ls.saveWritingResult('wc-1', 'Hola, ¿confirmamos la reunión del jueves?', 92);
    assert.ok(ls.get().progress.writing.completedIds.includes('wc-1'));

    ls.addFinanceTransaction({ kind: 'income', label: 'Sueldo', amount: 2000 });
    ls.addFinanceTransaction({ kind: 'saving', label: 'Fondo', amount: 400 });
    ls.upsertFinanceGoal({ title: 'Viaje', target: 1500, saved: 300 });
    ls.recordFinanceQuiz('fq-1', true);
    assert.equal(ls.get().progress.finance.transactions.length, 2);
    assert.ok(ls.get().progress.finance.quizMasteredIds.includes('fq-1'));

    ls.recordVitalityRoutine('vr-202020');
    ls.saveVitalityDayLog({ waterCups: 6, sleepHours: 8, energyLevel: 9 });
    assert.equal(ls.get().progress.vitality.completedRoutines, 1);
    assert.equal(ls.get().progress.vitality.dayLogs[0].waterCups, 6);

    const summary = ls.getOverallMasterySummary();
    assert.ok(summary.byModule.critical > 0);
    assert.ok(summary.byModule.writing > 0);
    assert.ok(summary.byModule.finance > 0);
    assert.ok(summary.byModule.vitality > 0);
  });
});
