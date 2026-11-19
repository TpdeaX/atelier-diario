import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DRAWING_BLOCKS,
  DRAWING_LESSONS,
  DRAWING_SWATCHES,
  evaluateDrawingCoverage,
  mirrorStrokePoints,
  parseNormalizedPathCommands,
} from '../src/data/DrawingBank.ts';

describe('DrawingBank: catalogo de 20 laminas', () => {
  it('contiene exactamente 20 lecciones distribuidas 4 por cada uno de los 5 bloques', () => {
    assert.equal(DRAWING_LESSONS.length, 20);
    const expectedBlocks = ['trazos', 'perspectiva', 'luz', 'proporcion', 'composicion'] as const;
    assert.deepEqual(
      DRAWING_BLOCKS.map((b) => b.id),
      expectedBlocks
    );
    const ids = new Set<string>();
    for (const block of expectedBlocks) {
      const items = DRAWING_LESSONS.filter((l) => l.block === block);
      assert.equal(items.length, 4, `bloque ${block} debe tener 4 lecciones`);
      for (const l of items) {
        assert.ok(!ids.has(l.id), `id duplicado ${l.id}`);
        ids.add(l.id);
        assert.ok(l.title.length >= 4);
        assert.ok(l.tip.length >= 10);
        assert.ok(l.guideSvgPaths.length >= 1, `${l.id} necesita guideSvgPaths`);
        for (const p of l.guideSvgPaths) {
          const cmds = parseNormalizedPathCommands(p);
          assert.ok(cmds.length >= 2, `path invalido en ${l.id}: ${p}`);
        }
        assert.ok(
          Array.isArray(l.targetCheckpoints) && l.targetCheckpoints.length >= 4,
          `${l.id} necesita targetCheckpoints`
        );
      }
    }
    assert.equal(DRAWING_LESSONS[0].id, 'stroke-lines');
    assert.equal(DRAWING_SWATCHES.length, 8);
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
