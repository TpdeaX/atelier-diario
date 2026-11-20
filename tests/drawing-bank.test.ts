import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DRAWING_BLOCKS,
  DRAWING_LESSONS,
  DRAWING_SWATCHES,
  DRAWING_TOPIC_CHIPS,
  evaluateDrawingCoverage,
  mirrorStrokePoints,
  parseNormalizedPathCommands,
} from '../src/data/DrawingBank.ts';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

describe('DrawingBank: catalogo de 56 laminas y 12 chips de estudio', () => {
  it('contiene exactamente 56 lecciones distribuidas [12, 11, 11, 12, 10] y conserva las 4 originales al inicio de cada bloque', () => {
    assert.equal(DRAWING_LESSONS.length, 56);
    const expectedCounts = {
      trazos: 12,
      perspectiva: 11,
      luz: 11,
      proporcion: 12,
      composicion: 10,
    } as const;
    const originalPrefixIds = {
      trazos: ['stroke-lines', 'stroke-parallels', 'stroke-ellipses', 'stroke-scurves'],
      perspectiva: ['persp-cube-1pt', 'persp-building-2pt', 'persp-cylinder', 'persp-cone-pyramid'],
      luz: ['light-gradient', 'light-crosshatch', 'light-sphere', 'light-cube-shadow'],
      proporcion: ['prop-head-front', 'prop-head-profile', 'prop-mannequin', 'prop-hand-stilllife'],
      composicion: ['comp-thirds', 'comp-mirror-vase', 'comp-mandala', 'comp-quick-sketch'],
    } as const;

    const expectedBlocks = ['trazos', 'perspectiva', 'luz', 'proporcion', 'composicion'] as const;
    assert.deepEqual(
      DRAWING_BLOCKS.map((b) => b.id),
      expectedBlocks
    );

    const ids = new Set<string>();
    const titles = new Set<string>();

    for (const block of expectedBlocks) {
      const items = DRAWING_LESSONS.filter((l) => l.block === block);
      assert.equal(items.length, expectedCounts[block], `bloque ${block} debe tener ${expectedCounts[block]} lecciones`);
      assert.deepEqual(
        items.slice(0, 4).map((l) => l.id),
        originalPrefixIds[block],
        `bloque ${block} debe conservar las 4 laminas originales al inicio`
      );

      for (const l of items) {
        assert.ok(!ids.has(l.id), `id duplicado ${l.id}`);
        assert.ok(!titles.has(l.title), `titulo duplicado ${l.title}`);
        ids.add(l.id);
        titles.add(l.title);

        assert.ok(l.title.length >= 4);
        assert.ok(l.tip.length >= 12);
        assert.ok(!EMOJI_RE.test(l.title) && !EMOJI_RE.test(l.tip), `sin emojis en ${l.id}`);
        assert.ok(l.guideSvgPaths.length >= 1, `${l.id} necesita guideSvgPaths`);
        for (const p of l.guideSvgPaths) {
          const cmds = parseNormalizedPathCommands(p);
          assert.ok(cmds.length >= 2, `path invalido en ${l.id}: ${p}`);
          for (const c of cmds) {
            for (const n of c.nums) {
              assert.ok(n >= 0 && n <= 1, `coordenada fuera de [0..1] en ${l.id}: ${n}`);
            }
          }
        }
        assert.ok(
          Array.isArray(l.targetCheckpoints) && l.targetCheckpoints.length >= 4,
          `${l.id} necesita >= 4 targetCheckpoints`
        );
        for (const [cx, cy] of l.targetCheckpoints) {
          assert.ok(cx >= 0 && cx <= 1 && cy >= 0 && cy <= 1, `checkpoint fuera de rango en ${l.id}`);
        }
      }
    }

    assert.equal(DRAWING_LESSONS[0].id, 'stroke-lines');
    assert.equal(DRAWING_SWATCHES.length, 8);
  });

  it('exporta 12 chips de referencia tematica bilingues sin emojis ni duplicados', () => {
    assert.equal(DRAWING_TOPIC_CHIPS.length, 12);
    const chipIds = new Set<string>();
    for (const chip of DRAWING_TOPIC_CHIPS) {
      assert.ok(chip.id.length >= 2);
      assert.ok(!chipIds.has(chip.id), `chip duplicado ${chip.id}`);
      chipIds.add(chip.id);
      assert.ok(chip.label.length >= 4);
      assert.ok(chip.query.length >= 4);
      assert.ok(!EMOJI_RE.test(chip.label) && !EMOJI_RE.test(chip.query));
    }
  });
});

describe('DrawingBank: mirrorStrokePoints', () => {
  it('devuelve 1 trazo sin simetria, 2 en espejo vertical y 4 en radial4', () => {
    const base = [{ x: 100, y: 120, pressure: 0.7 }];
    const none = mirrorStrokePoints(base, 'none', 800, 500);
    assert.equal(none.length, 1);
    assert.equal(none[0][0].x, 100);
    assert.equal(none[0][0].y, 120);

    const vertical = mirrorStrokePoints(base, 'vertical', 800, 500);
    assert.equal(vertical.length, 2);
    assert.equal(vertical[0][0].x, 100);
    assert.equal(vertical[0][0].y, 120);
    assert.equal(vertical[1][0].x, 700);
    assert.equal(vertical[1][0].y, 120);
    assert.equal(vertical[1][0].pressure, 0.7);

    const radial = mirrorStrokePoints(base, 'radial4', 800, 500);
    assert.equal(radial.length, 4);
    assert.deepEqual(
      radial.map((s) => [s[0].x, s[0].y]),
      [
        [100, 120],
        [700, 120],
        [100, 380],
        [700, 380],
      ]
    );
  });
});

describe('DrawingBank: evaluateDrawingCoverage', () => {
  it('devuelve 0% en lienzo vacio y >= 80% cuando los trazos cubren los checkpoints', () => {
    const checkpoints: [number, number][] = [
      [0.2, 0.25],
      [0.5, 0.25],
      [0.8, 0.25],
      [0.2, 0.75],
      [0.8, 0.75],
    ];
    const empty = evaluateDrawingCoverage([], checkpoints, 800, 500);
    assert.deepEqual(empty, { coveragePct: 0, strokeCount: 0 });

    const strokes = [
      [
        { x: 160, y: 125 },
        { x: 640, y: 125 },
      ],
      [
        { x: 160, y: 375 },
        { x: 640, y: 375 },
      ],
    ];
    const hit = evaluateDrawingCoverage(strokes, checkpoints, 800, 500);
    assert.equal(hit.strokeCount, 2);
    assert.ok(hit.coveragePct >= 80, `esperaba >= 80%, obtenido ${hit.coveragePct}%`);

    const miss = evaluateDrawingCoverage(
      [[{ x: 10, y: 10 }, { x: 20, y: 15 }]],
      checkpoints,
      800,
      500
    );
    assert.equal(miss.coveragePct, 0);
    assert.equal(miss.strokeCount, 1);
  });
});
