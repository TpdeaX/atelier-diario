import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BREATH_PATTERNS,
  breathStateAt,
  computeDecayingPulseBpm,
  GROUNDING_GROUPS,
  PANIC_TRUTH_CARDS,
  PMR_STEPS,
  SOS_REASSURANCE,
} from '../src/data/CalmBank.ts';

describe('CalmBank: patrones de respiracion', () => {
  it('incluye los 5 patrones con sus ritmos publicados', () => {
    for (const id of ['478', 'box', 'sigh', 'exhale36', 'coherence'] as const) {
      assert.ok(BREATH_PATTERNS[id], `falta ${id}`);
      assert.ok(BREATH_PATTERNS[id].phases.length >= 2);
    }
    assert.equal(BREATH_PATTERNS.exhale36.rhythm, 'Inhala 3s / Exhala 6s');
    assert.equal(BREATH_PATTERNS.coherence.rhythm, 'Inhala 5.5s / Exhala 5.5s');
    const ex = BREATH_PATTERNS.exhale36.phases.map((p) => p.sec);
    assert.deepEqual(ex, [3, 6]);
    const co = BREATH_PATTERNS.coherence.phases.map((p) => p.sec);
    assert.deepEqual(co, [5.5, 5.5]);
  });

  it('la exhalacion larga dura al menos el doble que la inhalacion en 3-6', () => {
    const [inh, exh] = BREATH_PATTERNS.exhale36.phases;
    assert.ok(exh.sec >= inh.sec * 2);
  });

  it('breathStateAt avanza fase, cuenta ciclos y es periodico', () => {
    const p = BREATH_PATTERNS.exhale36;
    const s0 = breathStateAt(p, 0);
    assert.equal(s0.phaseIdx, 0);
    assert.equal(s0.cycles, 0);
    assert.equal(s0.phaseRemainingSec, 3);
    const s4 = breathStateAt(p, 4);
    assert.equal(s4.phaseIdx, 1);
    assert.equal(Math.round(s4.phaseRemainingSec * 10) / 10, 5);
    const s9 = breathStateAt(p, 9.05);
    assert.equal(s9.phaseIdx, 0);
    assert.equal(s9.cycles, 1);
    assert.equal(breathStateAt(p, -5).phaseIdx, 0);
  });
});

describe('CalmBank: aterrizaje 5-4-3-2-1', () => {
  it('tiene conteos 5,4,3,2,1 con 15 casillas tocables', () => {
    assert.deepEqual(
      GROUNDING_GROUPS.map((g) => g.count),
      [5, 4, 3, 2, 1]
    );
    assert.equal(
      GROUNDING_GROUPS.reduce((a, g) => a + g.count, 0),
      15
    );
    for (const g of GROUNDING_GROUPS) assert.ok(g.prompt.length > 3);
  });
});

describe('CalmBank: relajacion muscular progresiva', () => {
  it('tiene al menos 6 grupos y la suelta dura mas que la tension', () => {
    assert.ok(PMR_STEPS.length >= 6);
    for (const s of PMR_STEPS) {
      assert.ok(s.tenseSec > 0);
      assert.ok(s.releaseSec > s.tenseSec, s.group);
      assert.ok(s.tip.length > 3);
    }
    assert.deepEqual(
      PMR_STEPS.slice(0, 6).map((s) => s.group),
      ['Manos', 'Hombros', 'Mandíbula', 'Frente', 'Abdomen', 'Piernas']
    );
  });
});

describe('CalmBank: pulso descendente y tarjetas', () => {
  it('computeDecayingPulseBpm baja de 84 a 60 en 180 s y se acota', () => {
    assert.equal(computeDecayingPulseBpm(0, 84, 60, 180), 84);
    assert.equal(computeDecayingPulseBpm(180, 84, 60, 180), 60);
    assert.equal(computeDecayingPulseBpm(999, 84, 60, 180), 60);
    assert.equal(computeDecayingPulseBpm(-10, 84, 60, 180), 84);
    let prev = 84;
    for (let t = 0; t <= 180; t += 5) {
      const v = computeDecayingPulseBpm(t, 84, 60, 180);
      assert.ok(v <= prev + 1e-9);
      prev = v;
    }
    const mid = computeDecayingPulseBpm(90, 84, 60, 180);
    assert.ok(mid > 60 && mid < 84);
    assert.equal(computeDecayingPulseBpm(10, 84, 60, 0), 60);
  });

  it('hay tarjetas de anclaje breves y mensaje de seguridad', () => {
    assert.ok(PANIC_TRUTH_CARDS.length >= 8);
    for (const c of PANIC_TRUTH_CARDS) assert.ok(c.length > 10 && c.length <= 110, c);
    assert.match(SOS_REASSURANCE, /Estás a salvo/);
  });
});
